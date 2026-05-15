import { Providers } from "../providers";

// App Bridge script is loaded in the root layout (src/app/layout.tsx) — it
// has to be the FIRST <script> tag in the document with no async/defer for
// Shopify's loader to accept it.
export default function EmbeddedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Providers>{children}</Providers>;
}
