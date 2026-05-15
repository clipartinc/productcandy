/**
 * Wait for the App Bridge CDN script to finish loading and expose
 * window.shopify, then fetch a session-token-authenticated request to
 * our backend.
 *
 * Call this from any client component running inside the Shopify admin
 * iframe (i.e. /app/* pages).
 */
export async function appBridgeFetch(url: string, init: RequestInit = {}) {
  const token = await getSessionToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

async function getSessionToken(): Promise<string> {
  // App Bridge usually initializes synchronously thanks to
  // strategy="beforeInteractive" on the script tag, but if a route is
  // hit during a soft navigation before the script finishes evaluating,
  // window.shopify may not be ready yet. Poll for ~5 seconds.
  const w = window as unknown as {
    shopify?: { idToken?: () => Promise<string | null> };
  };

  for (let i = 0; i < 50; i++) {
    if (w.shopify?.idToken) {
      const token = await w.shopify.idToken();
      if (!token) throw new Error("Shopify session token came back empty.");
      return token;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error(
    "App Bridge didn't load. Check that NEXT_PUBLIC_SHOPIFY_API_KEY is " +
      "set on the server and the page is being viewed inside Shopify admin."
  );
}
