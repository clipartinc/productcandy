import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopify, sessionStorage } from "@/lib/shopify";
import { refreshEntitlement } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shopify redirects here after the merchant accepts (or declines) the
// subscription on the Shopify-hosted approval page. The querystring
// contains ?shop=<domain>&charge_id=<id>. We re-query Admin GraphQL for
// the live subscription status (charge_id alone doesn't tell us if
// they accepted) and then bounce them back into the embedded app.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop");
  if (!shop) return new NextResponse("Missing shop", { status: 400 });

  const shopRow = await prisma.shop.upsert({
    where: { domain: shop },
    update: {},
    create: { domain: shop },
  });

  const shopify = getShopify();
  const offlineId = shopify.session.getOfflineId(shop);
  const session = await sessionStorage.loadSession(offlineId);

  // Without a cached offline session there's nothing to query with; we
  // still bounce back to the app so the next embedded-app request can
  // do a token exchange and refresh entitlement lazily.
  if (session) {
    try {
      await refreshEntitlement(shopRow, session);
    } catch {
      // Best-effort. The lazy check on the next /api/app/snippets call
      // will pick up the new status either way.
    }
  }

  // Embedded apps bounce through /apps/<api_key> on the merchant's
  // myshopify domain so App Bridge can re-attach. Sending them to
  // /app/billing means they immediately see "subscribed" / "lapsed"
  // copy reflecting the new status.
  const apiKey = process.env.SHOPIFY_API_KEY ?? "";
  const target = `https://${shop}/admin/apps/${apiKey}/app/billing?subscribed=1`;
  return NextResponse.redirect(target, { status: 302 });
}
