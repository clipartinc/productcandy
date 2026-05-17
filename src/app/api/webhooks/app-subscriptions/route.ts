import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { PLAN_NAME } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verifies the X-Shopify-Hmac-Sha256 header against the raw body using
// the app's shared secret. Required for every Shopify webhook; without
// this anyone could POST to this URL and toggle subscription status.
function verifyWebhook(rawBody: string, headerHmac: string | null): boolean {
  if (!headerHmac) return false;
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(headerHmac, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Shopify fires this for every state change on an app subscription —
// created, accepted, declined, cancelled, expired, frozen. We only
// care about the ones that change *our* plan's entitlement, but we
// update on any matching payload so the cached status stays in sync
// even if a merchant cancels via Shopify admin instead of in our app.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
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
