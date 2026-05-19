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
  // Admin GraphQL returns 401 with the body "Invalid API key or access
  // token" when the cached offline session's access token has been
  // rotated (typical after the merchant uninstalls + reinstalls).
  return (
    e.message.includes("HTTP 401") ||
    e.message.includes("Invalid API key or access token")
  );
}

// POST starts a Custom Layouts subscription. Returns the Shopify-
// hosted confirmation URL; the embedded app opens it in the top frame
// so the merchant sees Shopify's own approval page, not ours.
export async function POST(req: NextRequest) {
  try {
    const host = process.env.HOST?.replace(/\/$/, "") ?? "";
    if (!host) {
      return NextResponse.json(
        { error: "Server is missing HOST env var" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const attempt = async (forceFresh: boolean) => {
      const { shop, session } = await authenticateExtensionRequest(req, {
        forceFresh,
      });
      const returnUrl = `${host}/api/billing/callback?shop=${encodeURIComponent(shop)}`;
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
