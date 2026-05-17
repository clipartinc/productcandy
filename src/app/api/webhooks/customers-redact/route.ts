import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/verifyShopifyWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// customers/redact — Shopify fires this when a storefront customer
// asks for their data to be erased. Product Candy stores zero
// customer-identifiable data, so the GDPR-compliant response is to
// verify the HMAC and ack.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
