"use client";

import { createElement } from "react";

// Shopify App Bridge registers <ui-nav-menu> as a web component once the
// CDN script in src/app/layout.tsx loads. React 19's JSX types don't let
// us declare arbitrary custom elements cleanly, so we render via
// React.createElement to skip the IntrinsicElements check. The `rel="home"`
// link is required by App Bridge.
export function NavMenu() {
  return createElement(
    "ui-nav-menu",
    null,
    <a key="home" href="/app" rel="home">
      Home
    </a>,
    <a key="snippets" href="/app/snippets">
      Custom Snippets
    </a>,
    <a key="billing" href="/app/billing">
      Billing
    </a>,
    <a key="contact" href="/app/contact">
      Contact
    </a>
  );
}
