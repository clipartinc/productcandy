import { getShopify, sessionStorage } from "./shopify";
import { RequestedTokenType, type Session } from "@shopify/shopify-api";
import { prisma } from "./prisma";

/**
 * Extensions and embedded apps call our backend with an Authorization:
 * Bearer <jwt> header — Shopify's session token. This decodes + verifies
 * the JWT (signed with our app's API secret), and either:
 *
 *  - loads the cached offline session for the shop, OR
 *  - does a Shopify token exchange to mint a fresh one (required when
 *    using managed install / use_legacy_install_flow = false, where the
 *    install flow doesn't hit our /api/auth/callback).
 */
export async function authenticateExtensionRequest(req: Request): Promise<{
  shop: string;
  session: Session;
}> {
  const auth = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) throw new Error("Missing Authorization: Bearer <session_token>");
  const sessionToken = match[1];

  const shopify = getShopify();
  const payload = await shopify.session.decodeSessionToken(sessionToken);
  const shop = payload.dest.replace(/^https?:\/\//, "");

  const offlineId = shopify.session.getOfflineId(shop);
  let session = await sessionStorage.loadSession(offlineId);

  if (!session) {
    // No cached session — do an offline token exchange. This is the
    // standard pattern for managed-install apps; first request from
    // a new merchant will hit this path and seed the Session row.
    const result = await shopify.auth.tokenExchange({
      shop,
      sessionToken,
      requestedTokenType: RequestedTokenType.OfflineAccessToken,
    });
    session = result.session;
    await sessionStorage.storeSession(session);

    // A fresh token exchange means we just heard from this shop again
    // — either a brand-new install or a reinstall after they had
    // uninstalled. Either way, clear uninstalledAt so the entitlement
    // gate stops treating them as tombstoned. We upsert because a
    // brand-new shop has no row yet.
    await prisma.shop.upsert({
      where: { domain: shop },
      update: { uninstalledAt: null },
      create: { domain: shop },
    });
  }

  return { shop, session };
}
