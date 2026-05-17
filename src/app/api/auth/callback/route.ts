import { NextRequest, NextResponse } from "next/server";
import { getShopify, sessionStorage } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const shopify = getShopify();
  const callback = await shopify.auth.callback({ rawRequest: req });
  const session = callback.session;

  await sessionStorage.storeSession(session);

  // Upsert the shop record so we can attach app data to it. Clearing
  // uninstalledAt on every install handshake un-tombstones a shop that
  // uninstalled and came back within the 48 h shop/redact grace window
  // — their saved snippets become accessible again immediately.
  await prisma.shop.upsert({
    where: { domain: session.shop },
    update: { uninstalledAt: null },
    create: { domain: session.shop },
  });

  // Redirect into the embedded app inside Shopify admin
  const host = req.nextUrl.searchParams.get("host");
  const redirectUrl = `/app?shop=${encodeURIComponent(session.shop)}${
    host ? `&host=${encodeURIComponent(host)}` : ""
  }`;

  const res = NextResponse.redirect(new URL(redirectUrl, req.url));

  // The web-api adapter returns auth-related Set-Cookie headers we need to
  // forward (otherwise the merchant's session cookie won't get set).
  const headers = callback.headers as Headers | Record<string, string> | undefined;
  if (headers) {
    if (typeof (headers as Headers).forEach === "function") {
      (headers as Headers).forEach((value, key) => res.headers.append(key, value));
    } else {
      for (const [k, v] of Object.entries(headers as Record<string, string>)) {
        res.headers.append(k, v);
      }
    }
  }

  return res;
}
