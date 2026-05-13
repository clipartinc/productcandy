import { NextRequest, NextResponse } from "next/server";
import { getShopify } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) {
    return NextResponse.json({ error: "Missing ?shop=" }, { status: 400 });
  }

  const shopify = getShopify();
  const sanitized = shopify.utils.sanitizeShop(shop, true)!;

  // Begin returns a Response (with redirect + cookies set on it)
  return shopify.auth.begin({
    shop: sanitized,
    callbackPath: "/api/auth/callback",
    isOnline: false,
    rawRequest: req,
  });
}
