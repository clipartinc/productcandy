import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyShopifyWebhook } from "@/lib/verifyShopifyWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/uninstalled — merchant removed the app from their store. We mark
// the shop inactive but keep snippets / subscription metadata around so
// a reinstall within ~48 h restores them seamlessly (Shopify fires
// shop/redact after that grace period, which is when we actually
// cascade-delete the row). The subscription is already void by the
// time we get here — Shopify cancels active charges on uninstall — but
// we clear our cached status so the entitlement gate locks straight
// away instead of holding stale ACTIVE for up to 5 minutes.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const shopDomain = req.headers.get("x-shopify-shop-domain");
  if (!shopDomain) return new NextResponse("Missing shop", { status: 400 });

  await prisma.shop.update({
    where: { domain: shopDomain },
    data: {
      uninstalledAt: new Date(),
      subscriptionStatus: null,
      subscriptionId: null,
      subscriptionCheckedAt: new Date(),
    },
  }).catch(() => {
    // Shop row may not exist if the merchant uninstalled before our
    // first authenticated request ever upserted them — that's a no-op,
    // not an error.
  });

  return NextResponse.json({ ok: true });
}
