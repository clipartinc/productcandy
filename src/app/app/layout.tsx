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
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={apiKey}
        strategy="beforeInteractive"
      />
      <Providers>{children}</Providers>
    </>
  );
}
