import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Candy — Sweeter product pages for Shopify",
  description:
    "Polished description templates and one-click image cropping for Shopify merchants. Built as an embedded admin app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
