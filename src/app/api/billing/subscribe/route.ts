import { NextRequest, NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/sessionToken";
import { createSubscription } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function isStaleTokenError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  // Several signals from Admin GraphQL that the cached offline token
  // is unusable and we need to re-exchange via the merchant's
  // current session JWT:
  //   - HTTP 401 + "Invalid API key or access token": token rotated
  //     after uninstall/reinstall.
  //   - HTTP 403 + "Non-expiring access tokens are no longer
  //     accepted": Shopify is rejecting a legacy non-expiring offline
  //     token that's still in our cache from before we switched to
  //     `expiring: true` in tokenExchange.
  return (
    e.message.includes("HTTP 401") ||
    e.message.includes("HTTP 403") ||
    e.message.includes("Invalid API key or access token") ||
    e.message.includes("Non-expiring access tokens")
  );
}

// Derive the public origin Shopify should bounce the merchant back to
// after they approve the subscription. Priority:
//   1. The X-Forwarded-* headers Vercel / typical reverse proxies set
//      — these are the merchant-visible URL the request came in on.
//   2. NextRequest's own URL — works on most hosts when the public
//      hostname matches the bind hostname.
//   3. The HOST env var as a last resort.
// Any candidate that resolves to a bind-only placeholder (0.0.0.0,
// 127.0.0.1, localhost) is skipped; Shopify rejects those with
// "Invalid url ... missing scheme" when handed back as the returnUrl.
function publicOrigin(req: NextRequest): string {
  const isUsable = (host: string | null | undefined) =>
    !!host &&
    !/^(0\.0\.0\.0|127\.0\.0\.1|localhost)(:\d+)?$/.test(host);

  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (isUsable(fwdHost)) return `${fwdProto}://${fwdHost}`;

  const reqHost = req.headers.get("host");
  if (isUsable(reqHost)) {
    const proto = req.nextUrl.protocol.replace(/:$/, "") || "https";
    return `${proto}://${reqHost}`;
  }

  const env = process.env.HOST?.trim() ?? "";
  if (env) {
    const withoutScheme = env.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (isUsable(withoutScheme)) return `https://${withoutScheme}`;
  }

  return "";
}

// POST starts a Custom Layouts subscription. Returns the Shopify-
// hosted confirmation URL; the embedded app opens it in the top frame
// so the merchant sees Shopify's own approval page, not ours.
export async function POST(req: NextRequest) {
  try {
    const origin = publicOrigin(req);
    if (!origin) {
      return NextResponse.json(
        {
          error:
            "Server can't determine a public origin for the Shopify return " +
            "URL (no X-Forwarded-Host header, host=0.0.0.0/localhost, and " +
            "no usable HOST env var). Set HOST=https://productcandy.app in " +
            "production env vars.",
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const attempt = async (forceFresh: boolean) => {
      const { shop, session } = await authenticateExtensionRequest(req, {
        forceFresh,
      });
      const returnUrl = `${origin}/api/billing/callback?shop=${encodeURIComponent(shop)}`;
      return createSubscription(session, returnUrl);
    };

    let result: { confirmationUrl: string };
    try {
      result = await attempt(false);
    } catch (e) {
      if (!isStaleTokenError(e)) throw e;
      // Cached offline session token is stale — drop it and retry once
      // with a fresh token exchange against the merchant's session JWT.
      console.warn("[billing/subscribe] stale token, retrying with fresh exchange");
      result = await attempt(true);
    }

    return NextResponse.json(
      { confirmationUrl: result.confirmationUrl },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    // Log the full error to server logs (Vercel/host) so root cause is
    // visible — the client only sees the message, not the stack.
    console.error("[billing/subscribe] failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
