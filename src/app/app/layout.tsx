import Script from "next/script";
import { Providers } from "../providers";

export default function EmbeddedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ?? "";
  return (
    <>
      {/*
        Next/Script with strategy="beforeInteractive" only works in the ROOT
        app/layout.tsx. In a nested layout it silently downgrades / doesn't
        run reliably. Using "afterInteractive" (the default for non-root
        layouts) here, paired with the appBridgeFetch helper that polls for
        window.shopify before issuing requests.
      */}
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={apiKey}
        strategy="afterInteractive"
      />
      <Providers>{children}</Providers>
    </>
  );
}
