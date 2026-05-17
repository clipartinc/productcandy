import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the X-Shopify-Hmac-Sha256 header against the raw request body
 * using the app's shared secret. Required on every Shopify webhook —
 * without it anyone could POST our endpoints and trigger destructive
 * actions like wiping a shop's data.
 *
 * Caller must pass the raw body string (NOT JSON.parse'd) because the
 * HMAC is computed against the exact bytes Shopify sent.
 */
export function verifyShopifyWebhook(
  rawBody: string,
  headerHmac: string | null
): boolean {
  if (!headerHmac) return false;
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;
  const computed = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(headerHmac, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
