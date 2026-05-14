import {
  reactExtension,
  AdminBlock,
  BlockStack,
  InlineStack,
  Text,
  Image,
  Pressable,
  Button,
  Banner,
  Link,
  useApi,
  Select,
} from "@shopify/ui-extensions-react/admin";
import { useState } from "react";

const TARGET = "admin.product-details.block.render";

const THUMB_BASE_URL = "https://productcandy.app/templates";

type TemplateMeta = { id: string; label: string; skeleton: string };

const PH_STYLE_BLOCK =
  "background:#f3f4f6;color:#6b7280;border:1px dashed #d1d5db;border-radius:8px;padding:12px 16px;margin:8px 0;font-style:italic;";
const PH_STYLE_INLINE =
  "background:#f3f4f6;color:#6b7280;border:1px dashed #d1d5db;border-radius:6px;padding:2px 8px;font-style:italic;";

// Inline-styled placeholder block — looks like a soft gray rounded box that
// the merchant clicks into and overtypes with their own content.
const ph = (label: string) =>
  `<div data-pc-placeholder="1" style="${PH_STYLE_BLOCK}">${label}</div>`;

const phInline = (label: string) =>
  `<span data-pc-placeholder="1" style="${PH_STYLE_INLINE}">${label}</span>`;

/**
 * Strip the gray box styling we add to placeholders, leaving the user's
 * (or default) text in plain HTML. Layout structure (columns, headings,
 * tables) is untouched.
 */
function cleanupPlaceholders(html: string): string {
  return html
    .split(` style="${PH_STYLE_BLOCK}"`).join("")
    .split(` style="${PH_STYLE_INLINE}"`).join("")
    .split(` data-pc-placeholder="1"`).join("")
    .replace(/<(\w+)\s+>/g, "<$1>");
}

const TEMPLATES: TemplateMeta[] = [
  {
    id: "spec-sheet",
    label: "Spec sheet",
    skeleton: `
<div data-pc-template="spec-sheet">
  ${ph("Click here to write your intro paragraph…")}
  <table style="border-collapse:separate;border-spacing:0 6px;width:100%;margin-top:8px;">
    <tr><th style="text-align:left;padding-right:12px;width:30%;">${phInline("Spec name")}</th><td>${phInline("Spec value")}</td></tr>
    <tr><th style="text-align:left;padding-right:12px;">${phInline("Spec name")}</th><td>${phInline("Spec value")}</td></tr>
    <tr><th style="text-align:left;padding-right:12px;">${phInline("Spec name")}</th><td>${phInline("Spec value")}</td></tr>
    <tr><th style="text-align:left;padding-right:12px;">${phInline("Spec name")}</th><td>${phInline("Spec value")}</td></tr>
  </table>
</div>`.trim(),
  },
  {
    id: "story-features",
    label: "Story + features",
    skeleton: `
<div data-pc-template="story-features">
  ${ph("Click here to write your brand story or product narrative…")}
  <h3 style="margin-top:16px;">${phInline("Features headline")}</h3>
  <ul>
    <li>${phInline("Feature one")}</li>
    <li>${phInline("Feature two")}</li>
    <li>${phInline("Feature three")}</li>
    <li>${phInline("Feature four")}</li>
  </ul>
</div>`.trim(),
  },
  {
    id: "faq",
    label: "FAQ block",
    skeleton: `
<div data-pc-template="faq">
  <h3>FAQ</h3>
  <div style="margin-bottom:12px;">
    <p><strong>${phInline("Question one — click to edit")}</strong></p>
    ${ph("Click to write the answer…")}
  </div>
  <div style="margin-bottom:12px;">
    <p><strong>${phInline("Question two — click to edit")}</strong></p>
    ${ph("Click to write the answer…")}
  </div>
  <div style="margin-bottom:12px;">
    <p><strong>${phInline("Question three — click to edit")}</strong></p>
    ${ph("Click to write the answer…")}
  </div>
</div>`.trim(),
  },
  {
    id: "two-column",
    label: "Two columns",
    skeleton: `
<div data-pc-template="two-column" style="display:flex;gap:24px;flex-wrap:wrap;">
  <div style="flex:1;min-width:240px;">
    <h3>${phInline("Column 1 heading")}</h3>
    ${ph("Click here to write column 1 text…")}
  </div>
  <div style="flex:1;min-width:240px;">
    <h3>${phInline("Column 2 heading")}</h3>
    ${ph("Click here to write column 2 text…")}
  </div>
</div>`.trim(),
  },
  {
    id: "three-column",
    label: "Three columns",
    skeleton: `
<div data-pc-template="three-column" style="display:flex;gap:20px;flex-wrap:wrap;">
  <div style="flex:1;min-width:200px;">
    <h3>${phInline("Column 1 heading")}</h3>
    ${ph("Click to write…")}
  </div>
  <div style="flex:1;min-width:200px;">
    <h3>${phInline("Column 2 heading")}</h3>
    ${ph("Click to write…")}
  </div>
  <div style="flex:1;min-width:200px;">
    <h3>${phInline("Column 3 heading")}</h3>
    ${ph("Click to write…")}
  </div>
</div>`.trim(),
  },
  {
    id: "hero-cta",
    label: "Hero + CTA",
    skeleton: `
<div data-pc-template="hero-cta" style="text-align:left;padding:8px 0;">
  <h2 style="font-size:1.6em;margin:0 0 12px 0;">${phInline("Bold headline goes here")}</h2>
  ${ph("Click here to write a short supporting paragraph…")}
  <p style="margin-top:16px;">
    <a href="#" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">${phInline("Button label")}</a>
  </p>
</div>`.trim(),
  },
  {
    id: "image-text",
    label: "Image + text",
    skeleton: `
<div data-pc-template="image-text" style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
  <div style="flex:1;min-width:240px;">${ph("Image placeholder — replace with a product image using Shopify's image button in the description editor.")}</div>
  <div style="flex:1;min-width:240px;">
    <h3>${phInline("Headline")}</h3>
    ${ph("Click here to write your supporting text…")}
  </div>
</div>`.trim(),
  },
  {
    id: "text-image",
    label: "Text + image",
    skeleton: `
<div data-pc-template="text-image" style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
  <div style="flex:1;min-width:240px;">
    <h3>${phInline("Headline")}</h3>
    ${ph("Click here to write your supporting text…")}
  </div>
  <div style="flex:1;min-width:240px;">${ph("Image placeholder — replace with a product image using Shopify's image button in the description editor.")}</div>
</div>`.trim(),
  },
  {
    id: "gallery-3",
    label: "Image gallery (3)",
    skeleton: `
<div data-pc-template="gallery-3" style="display:flex;gap:16px;flex-wrap:wrap;">
  <div style="flex:1;min-width:200px;">
    ${ph("Image 1 placeholder")}
    ${ph("Caption 1")}
  </div>
  <div style="flex:1;min-width:200px;">
    ${ph("Image 2 placeholder")}
    ${ph("Caption 2")}
  </div>
  <div style="flex:1;min-width:200px;">
    ${ph("Image 3 placeholder")}
    ${ph("Caption 3")}
  </div>
</div>`.trim(),
  },
];

type Mode = "append" | "replace";

export default reactExtension(TARGET, () => <App />);

function App() {
  const { data, query } = useApi(TARGET);
  const productId = (data as { selected?: { id: string }[] })?.selected?.[0]?.id;

  const [mode, setMode] = useState<Mode>("append");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "success"; label: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  if (!productId) {
    return (
      <AdminBlock title="Product Candy — Description Layouts">
        <Banner tone="info" title="Save the product first">
          <Text>This block stamps a layout into the product description. Save the product so it has an id, then come back here.</Text>
        </Banner>
      </AdminBlock>
    );
  }

  async function applyTemplate(t: TemplateMeta) {
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      let nextHtml = t.skeleton;
      if (mode === "append") {
        const cur = await query<{ product: { descriptionHtml: string } | null }>(
          `query CurDesc($id: ID!) { product(id: $id) { descriptionHtml } }`,
          { variables: { id: productId } }
        );
        const existing = cur.data?.product?.descriptionHtml ?? "";
        nextHtml = existing ? `${existing}\n${t.skeleton}` : t.skeleton;
      }
      const upd = await query<
        { productUpdate: { userErrors: { message: string }[] } },
        { input: { id: string; descriptionHtml: string } }
      >(
        `mutation UpdateDescription($input: ProductInput!) {
          productUpdate(input: $input) {
            userErrors { message }
          }
        }`,
        { variables: { input: { id: productId, descriptionHtml: nextHtml } } }
      );
      const errs = upd.data?.productUpdate?.userErrors ?? [];
      if (errs.length > 0) {
        setStatus({ kind: "error", message: errs.map((e) => e.message).join(", ") });
      } else {
        setStatus({ kind: "success", label: t.label });
      }
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function cleanup() {
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const cur = await query<{ product: { descriptionHtml: string } | null }>(
        `query CurDesc($id: ID!) { product(id: $id) { descriptionHtml } }`,
        { variables: { id: productId } }
      );
      const cleaned = cleanupPlaceholders(cur.data?.product?.descriptionHtml ?? "");
      const upd = await query<
        { productUpdate: { userErrors: { message: string }[] } },
        { input: { id: string; descriptionHtml: string } }
      >(
        `mutation UpdateDescription($input: ProductInput!) {
          productUpdate(input: $input) { userErrors { message } }
        }`,
        { variables: { input: { id: productId, descriptionHtml: cleaned } } }
      );
      const errs = upd.data?.productUpdate?.userErrors ?? [];
      if (errs.length > 0) {
        setStatus({ kind: "error", message: errs.map((e) => e.message).join(", ") });
      } else {
        setStatus({ kind: "success", label: "Placeholder styling removed" });
      }
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminBlock title="Product Candy — Description Layouts">
      <BlockStack gap="base">
        <Text>
          Click a layout to drop placeholder boxes into the product description
          below. Then edit each box inline like normal — type over the gray
          placeholders, swap images using Shopify&apos;s image button.
        </Text>

        <Select
          label="When applying a layout"
          value={mode}
          options={[
            { label: "Append to existing description", value: "append" },
            { label: "Replace existing description", value: "replace" },
          ]}
          onChange={(v) => setMode(v as Mode)}
        />

        {status.kind === "success" && (
          <Banner tone="success" title={`${status.label} added`}>
            <Text>
              Refresh this page to see the placeholders in the description
              editor below.
            </Text>
          </Banner>
        )}
        {status.kind === "error" && (
          <Banner tone="critical" title="Couldn’t apply layout">
            <Text>{status.message}</Text>
          </Banner>
        )}

        <BlockStack gap="base">
          {chunk(TEMPLATES, 3).map((row, i) => (
            <InlineStack key={i} gap="base">
              {row.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => applyTemplate(t)}
                  border="dotted"
                  cornerRadius="base"
                  padding="small"
                >
                  <BlockStack gap="small" inlineAlignment="center">
                    <Image source={`${THUMB_BASE_URL}/${t.id}.svg`} alt={t.label} />
                    <Text>{t.label}</Text>
                  </BlockStack>
                </Pressable>
              ))}
            </InlineStack>
          ))}
        </BlockStack>

        <InlineStack gap="base" inlineAlignment="space-between" blockAlignment="center">
          <Link
            to={`shopify://admin/apps/product-candy/app/descriptions?id=${encodeURIComponent(productId)}`}
          >
            Open advanced editor →
          </Link>
          <Button onPress={cleanup} disabled={busy}>
            Clean up placeholder styling
          </Button>
        </InlineStack>
        {busy && <Text>Working…</Text>}
      </BlockStack>
    </AdminBlock>
  );
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
