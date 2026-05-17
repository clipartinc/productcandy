import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyShopifyWebhook } from "@/lib/verifyShopifyWebhook";
import { getShopify, sessionStorage } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// shop/redact — Shopify fires this ~48 hours after app/uninstalled if
// the merchant hasn't reinstalled. GDPR-mandatory: we must purge every
// row tied to this shop within 30 days. Cascade delete on Shop ->
// DescriptionTemplate handles the snippet wipe; we also drop the
// cached offline session so a brand-new install starts clean.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // The body shape Shopify sends:
  // { shop_id, shop_domain }
  type Payload = { shop_id?: number; shop_domain?: string };
  const body = JSON.parse(raw) as Payload;
  const shopDomain =
    body.shop_domain ?? req.headers.get("x-shopify-shop-domain") ?? "";
  if (!shopDomain) return new NextResponse("Missing shop", { status: 400 });

  // Snippets, thumbnails, subscription metadata — all hang off the
  // Shop row via onDelete: Cascade, so this one delete is the whole
  // purge. Wrap in catch so a missing row (e.g. shop never authed)
  // still returns 200 — Shopify retries non-2xx for 48 h.
  await prisma.shop.delete({ where: { domain: shopDomain } }).catch(() => {});

  // Session is stored separately (Prisma session storage owns the
  // Session model); drop it too so the next install doesn't reuse a
  // stale offline token.
  try {
    const shopify = getShopify();
    const offlineId = shopify.session.getOfflineId(shopDomain);
    await sessionStorage.deleteSession(offlineId);
  } catch {
    // Best-effort — session may not exist
  }

  return NextResponse.json({ ok: true });
}
