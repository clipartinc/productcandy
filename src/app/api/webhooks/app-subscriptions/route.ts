import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_NAME } from "@/lib/billing";
import { verifyShopifyWebhook } from "@/lib/verifyShopifyWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shopify fires this for every state change on an app subscription —
// created, accepted, declined, cancelled, expired, frozen. We only
// care about the ones that change *our* plan's entitlement, but we
// update on any matching payload so the cached status stays in sync
// even if a merchant cancels via Shopify admin instead of in our app.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const shopDomain = req.headers.get("x-shopify-shop-domain");
  if (!shopDomain) return new NextResponse("Missing shop", { status: 400 });

  type Payload = {
    app_subscription?: {
      admin_graphql_api_id?: string;
      name?: string;
      status?: string;
    };
  };
  const body = JSON.parse(raw) as Payload;
  const sub = body.app_subscription;
  if (!sub || sub.name !== PLAN_NAME) {
    // Not our plan (could be a different paid feature on the same shop) —
    // ack so Shopify stops retrying, but don't touch the row.
    return NextResponse.json({ ok: true });
  }

  await prisma.shop.upsert({
    where: { domain: shopDomain },
    update: {
      subscriptionId: sub.admin_graphql_api_id ?? null,
      subscriptionStatus: sub.status ?? null,
      subscriptionCheckedAt: new Date(),
    },
    create: {
      domain: shopDomain,
      subscriptionId: sub.admin_graphql_api_id ?? null,
      subscriptionStatus: sub.status ?? null,
      subscriptionCheckedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
