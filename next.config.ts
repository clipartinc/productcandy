import type { NextConfig } from "next";

// Allow Shopify admin to embed our app in an iframe.
const SHOPIFY_FRAME_ANCESTORS =
  "frame-ancestors https://*.myshopify.com https://admin.shopify.com";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: SHOPIFY_FRAME_ANCESTORS },
        ],
      },
    ];
  },
};

export default nextConfig;
