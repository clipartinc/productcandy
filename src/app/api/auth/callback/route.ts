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

  // Upsert the shop record so we can attach app data to it
  await prisma.shop.upsert({
    where: { domain: session.shop },
    update: {},
    create: { domain: session.shop },
  });

  // Redirect into the embedded app inside Shopify admin
  const host = req.nextUrl.searchParams.get("host");
  const redirectUrl = `/app?shop=${encodeURIComponent(session.shop)}${
    host ? `&host=${encodeURIComponent(host)}` : ""
  }`;

  return NextResponse.redirect(new URL(redirectUrl, req.url));
}
