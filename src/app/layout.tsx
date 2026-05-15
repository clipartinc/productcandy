import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Candy — Sweeter product pages for Shopify",
  description:
    "Polished description templates and one-click image cropping for Shopify merchants. Built as an embedded admin app.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Shopify App Bridge has strict rules: must be the FIRST <script> in the
  // page, NO async/defer/type=module. Next/Script always adds async with
  // any non-beforeInteractive strategy, so we render a plain <script> here.
  // It only does anything inside Shopify admin's iframe; harmless on the
  // marketing page.
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ?? "";
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          data-api-key={apiKey}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
