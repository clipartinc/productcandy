import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getShopify, sessionStorage } from "@/lib/shopify";
import { checkEntitlement } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Shopify app proxy hits this with ?shop=foo.myshopify.com&logged_in_customer_id=...&
// path_prefix=...&timestamp=...&signature=<hex>. We rebuild the signature from the
// other params using the app's shared secret and timing-safe compare. Docs:
// https://shopify.dev/docs/apps/online-store/app-proxies#calculate-a-digital-signature
function verifyProxySignature(url: URL): { ok: true; shop: string } | { ok: false } {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return { ok: false };
  const signature = url.searchParams.get("signature");
  const shop = url.searchParams.get("shop");
  if (!signature || !shop) return { ok: false };
  const params: [string, string][] = [];
  url.searchParams.forEach((v, k) => {
    if (k !== "signature") params.push([k, v]);
  });
  params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const message = params.map(([k, v]) => `${k}=${v}`).join("");
  const digest = createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(digest, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return { ok: false };
  if (!timingSafeEqual(a, b)) return { ok: false };
  return { ok: true, shop };
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const url = new URL(req.url);
  const verified = verifyProxySignature(url);
  if (!verified.ok) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { id } = await ctx.params;
  if (!id) return new NextResponse("Not found", { status: 404 });

  const shop = await prisma.shop.findUnique({
    where: { domain: verified.shop },
  });
  if (!shop) return new NextResponse("", { status: 200 });

  // Entitlement gate — free / lapsed merchants get an empty response
  // for any snippet that isn't in their free-quota set (oldest N
  // snippets by createdAt). Dev stores and active subscribers pass
  // through unconditionally. The Shopify Admin session for this shop
  // is cached from the install / token-exchange flow and lets
  // checkEntitlement refresh from Admin GraphQL if stale.
  const shopify = getShopify();
  const offlineId = shopify.session.getOfflineId(verified.shop);
  const session = (await sessionStorage.loadSession(offlineId)) ?? undefined;
  const ent = await checkEntitlement(shop, session);
  const isFreeSnippet = ent.freeSnippetIds.includes(id);
  if (!ent.entitled && !isFreeSnippet) {
    return new NextResponse("", {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const snippet = await prisma.descriptionTemplate.findFirst({
    where: { id, shopId: shop.id },
    select: { html: true },
  });
  if (!snippet) return new NextResponse("", { status: 200 });

  // Returning HTML directly so the App Block can drop it into the DOM via
  // innerHTML. Same-origin via app proxy means no CORS to worry about.
  // Short cache so admins see edits quickly after saving in the app.
  return new NextResponse(snippet.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
