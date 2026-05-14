# Description Layouts (admin block extension)

Renders directly on the Shopify product detail page as a block alongside
Shopify's own description editor. Lets the merchant pick a template, fill
in fields, and write rendered HTML to `product.descriptionHtml` via the
admin Direct API — no round-trip to our backend.

## Files

- `shopify.extension.toml` — extension config + targeting (product detail block)
- `src/BlockExtension.tsx` — the block UI (sandboxed Shopify components only)
- `package.json` — extension-local deps (`@shopify/ui-extensions-react`)

## Adding new templates

Edit `TEMPLATES` in `src/BlockExtension.tsx`. Each template has:

- `label` — name shown in the dropdown
- `fields` — input fields the merchant fills in
- `render(values)` — function returning the HTML to write to the description
