/**
 * Starter HTML for the visual snippet editor. Each option pre-populates the
 * Tiptap editor with a clean template structure the merchant can edit
 * visually (no HTML knowledge required).
 *
 * Kept intentionally minimal — no inline styles other than column layout —
 * because Tiptap's StarterKit handles bold/italic/headings/lists natively.
 */

export type Starter = {
  id: string;
  label: string;
  html: string;
};

export const STARTERS: Starter[] = [
  { id: "blank", label: "Blank — start from scratch", html: "" },
  {
    id: "spec-sheet",
    label: "Spec sheet (intro + spec rows)",
    html: `<p>Add an intro paragraph about the product here.</p>
<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;width:100%;"><div style="flex:1;min-width:60px;font-weight:600;"><p>Spec name</p></div><div style="flex:2;min-width:80px;"><p>Spec value</p></div></div>
<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;width:100%;"><div style="flex:1;min-width:60px;font-weight:600;"><p>Spec name</p></div><div style="flex:2;min-width:80px;"><p>Spec value</p></div></div>
<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;width:100%;"><div style="flex:1;min-width:60px;font-weight:600;"><p>Spec name</p></div><div style="flex:2;min-width:80px;"><p>Spec value</p></div></div>`,
  },
  {
    id: "story-features",
    label: "Story + features list",
    html: `<p>Tell your brand or product story here.</p>
<h3>What's inside</h3>
<ul>
  <li>Feature one</li>
  <li>Feature two</li>
  <li>Feature three</li>
  <li>Feature four</li>
</ul>`,
  },
  {
    id: "faq",
    label: "FAQ block",
    html: `<h3>FAQ</h3>
<p><strong>Question one — click to edit</strong></p>
<p>Click to write the answer.</p>
<p><strong>Question two — click to edit</strong></p>
<p>Click to write the answer.</p>
<p><strong>Question three — click to edit</strong></p>
<p>Click to write the answer.</p>`,
  },
  {
    id: "two-column",
    label: "Two columns",
    html: `<style>.pc-snippet-wrap{container-type:inline-size;width:100% !important;}.pc-snippet-wrap .pc-snippet-row{display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;gap:16px !important;width:100% !important;align-items:stretch !important;box-sizing:border-box !important;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{flex:1 1 0 !important;min-width:0 !important;box-sizing:border-box !important;}@container (max-width:480px){.pc-snippet-wrap .pc-snippet-row{flex-direction:column !important;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{flex:0 0 100% !important;flex-basis:100% !important;max-width:100% !important;width:100% !important;}}@media (max-width:768px){.pc-snippet-wrap .pc-snippet-row{flex-direction:column !important;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{flex:0 0 100% !important;flex-basis:100% !important;max-width:100% !important;width:100% !important;}}</style>
<div class="pc-snippet-wrap" style="container-type:inline-size;width:100%;">
<div class="pc-snippet-row" style="display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;gap:16px !important;width:100% !important;min-width:100% !important;align-items:stretch !important;box-sizing:border-box;">
  <div class="pc-snippet-col" style="flex:1 1 0 !important;min-width:0 !important;box-sizing:border-box;">
    <h3>Column 1 heading</h3>
    <p>Add column 1 text here.</p>
  </div>
  <div class="pc-snippet-col" style="flex:1 1 0 !important;min-width:0 !important;box-sizing:border-box;">
    <h3>Column 2 heading</h3>
    <p>Add column 2 text here.</p>
  </div>
</div>
</div>`,
  },
  {
    id: "three-column",
    label: "Three columns",
    html: `<style>.pc-snippet-wrap{container-type:inline-size;width:100% !important;}.pc-snippet-wrap .pc-snippet-row{display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;gap:16px !important;width:100% !important;align-items:stretch !important;box-sizing:border-box !important;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{flex:1 1 0 !important;min-width:0 !important;box-sizing:border-box !important;}@container (max-width:480px){.pc-snippet-wrap .pc-snippet-row{flex-direction:column !important;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{flex:0 0 100% !important;flex-basis:100% !important;max-width:100% !important;width:100% !important;}}@media (max-width:768px){.pc-snippet-wrap .pc-snippet-row{flex-direction:column !important;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{flex:0 0 100% !important;flex-basis:100% !important;max-width:100% !important;width:100% !important;}}</style>
<div class="pc-snippet-wrap" style="container-type:inline-size;width:100%;">
<div class="pc-snippet-row" style="display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;gap:16px !important;width:100% !important;min-width:100% !important;align-items:stretch !important;box-sizing:border-box;">
  <div class="pc-snippet-col" style="flex:1 1 0 !important;min-width:0 !important;box-sizing:border-box;">
    <h3>Column 1</h3>
    <p>Add text.</p>
  </div>
  <div class="pc-snippet-col" style="flex:1 1 0 !important;min-width:0 !important;box-sizing:border-box;">
    <h3>Column 2</h3>
    <p>Add text.</p>
  </div>
  <div class="pc-snippet-col" style="flex:1 1 0 !important;min-width:0 !important;box-sizing:border-box;">
    <h3>Column 3</h3>
    <p>Add text.</p>
  </div>
</div>
</div>`,
  },
  {
    id: "hero-cta",
    label: "Hero + CTA button",
    html: `<h2>Bold headline goes here</h2>
<p>Add a short supporting paragraph here.</p>
<p><a href="#" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">Button label</a></p>`,
  },
  {
    id: "returns",
    label: "Returns policy snippet",
    html: `<h3>Returns &amp; exchanges</h3>
<p>We accept returns within 30 days of delivery for unused items in original packaging. To start a return, email <a href="mailto:hello@yourstore.com">hello@yourstore.com</a> with your order number.</p>`,
  },
  {
    id: "shipping",
    label: "Shipping info snippet",
    html: `<h3>Shipping</h3>
<ul>
  <li>Free shipping on orders over $50</li>
  <li>Orders ship within 1–2 business days</li>
  <li>Tracking number sent by email</li>
</ul>`,
  },
];
