import { getShopify, sessionStorage } from "./shopify";
import type { Session } from "@shopify/shopify-api";

/**
 * Extensions and embedded apps call our backend with an Authorization:
 * Bearer <jwt> header — Shopify's "session token". This decodes + verifies
 * the JWT (signed with our app's API secret) and returns the offline session
 * we previously stored at OAuth time, which has the Admin API access token.
 */
export async function authenticateExtensionRequest(req: Request): Promise<{
  shop: string;
  session: Session;
}> {
  const auth = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) throw new Error("Missing Authorization: Bearer <session_token>");
  const token = match[1];

  const shopify = getShopify();
  const payload = await shopify.session.decodeSessionToken(token);
  const shop = payload.dest.replace(/^https?:\/\//, "");

  const offlineId = shopify.session.getOfflineId(shop);
  const session = await sessionStorage.loadSession(offlineId);
  if (!session) throw new Error(`No offline session for shop ${shop}`);

  return { shop, session };
}
