import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/verifyShopifyWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// customers/data_request — Shopify fires this when a storefront
// customer asks the merchant for a copy of their data. Product Candy
// stores zero customer-identifiable data (no orders, no customer
// rows, no PII — just shop-owned product description snippets), so
// the GDPR-compliant response is to verify the HMAC and ack. Shopify
// retries non-2xx for 48 h, so don't let unrelated errors bubble.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
