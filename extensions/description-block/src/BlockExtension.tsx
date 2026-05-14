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
  Select,
  useApi,
} from "@shopify/ui-extensions-react/admin";
import { useState } from "react";
import { thumbDataUri } from "./thumbnails";

const TARGET = "admin.product-details.block.render";

type Skeleton = (bg: string, text: string) => string;
type TemplateMeta = { id: string; label: string; skeleton: Skeleton };

const BG_OPTIONS = [
  { label: "None (no background)", value: "none" },
  { label: "Light gray", value: "#f3f4f6" },
  { label: "Soft pink", value: "#fdf2f8" },
  { label: "Soft blue", value: "#eff6ff" },
  { label: "Soft yellow", value: "#fefce8" },
  { label: "Soft green", value: "#f0fdf4" },
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#111827" },
];

const TEXT_OPTIONS = [
  { label: "Default gray", value: "#6b7280" },
  { label: "Black", value: "#111827" },
  { label: "Dark gray", value: "#374151" },
  { label: "Pink", value: "#ec4899" },
  { label: "Blue", value: "#2563eb" },
  { label: "White", value: "#ffffff" },
];

function ph(label: string, bg: string, text: string): string {
  if (bg === "none") {
    return `<div data-pc-placeholder="1" style="color:${text};font-style:italic;margin:8px 0;">${label}</div>`;
  }
  return `<div data-pc-placeholder="1" style="background-color:${bg};color:${text};border:1px dashed #d1d5db;border-radius:8px;padding:12px 16px;margin:8px 0;font-style:italic;">${label}</div>`;
}

function phInline(label: string, bg: string, text: string): string {
  if (bg === "none") {
    return `<span data-pc-placeholder="1" style="color:${text};font-style:italic;">${label}</span>`;
  }
  return `<span data-pc-placeholder="1" style="background-color:${bg};color:${text};border:1px dashed #d1d5db;border-radius:6px;padding:2px 8px;font-style:italic;">${label}</span>`;
}

function cleanupPlaceholders(html: string): string {
  return html
    .replace(/<(\w+)\s+data-pc-placeholder="1"\s+style="[^"]*"([^>]*)>/g, "<$1$2>")
    .replace(/<(\w+)\s+style="[^"]*"\s+data-pc-placeholder="1"([^>]*)>/g, "<$1$2>")
    .replace(/\s*data-pc-placeholder="1"\s*/g, " ")
    .replace(/<(\w+)\s+>/g, "<$1>");
}

const TEMPLATES: TemplateMeta[] = [
  {
    id: "spec-sheet",
    label: "Spec sheet",
    skeleton: (bg, text) => `
<div data-pc-template="spec-sheet">
  ${ph("Click here to write your intro paragraph…", bg, text)}
  <table style="border-collapse:separate;border-spacing:0 6px;width:100%;margin-top:8px;">
    <tr><th style="text-align:left;padding-right:12px;width:30%;">${phInline("Spec name", bg, text)}</th><td>${phInline("Spec value", bg, text)}</td></tr>
    <tr><th style="text-align:left;padding-right:12px;">${phInline("Spec name", bg, text)}</th><td>${phInline("Spec value", bg, text)}</td></tr>
    <tr><th style="text-align:left;padding-right:12px;">${phInline("Spec name", bg, text)}</th><td>${phInline("Spec value", bg, text)}</td></tr>
  </table>
</div>`.trim(),
  },
  {
    id: "story-features",
    label: "Story + features",
    skeleton: (bg, text) => `
<div data-pc-template="story-features">
  ${ph("Click here to write your brand story or product narrative…", bg, text)}
  <h3 style="margin-top:16px;">${phInline("Features headline", bg, text)}</h3>
  <ul>
    <li>${phInline("Feature one", bg, text)}</li>
    <li>${phInline("Feature two", bg, text)}</li>
    <li>${phInline("Feature three", bg, text)}</li>
  </ul>
</div>`.trim(),
  },
  {
    id: "faq",
    label: "FAQ block",
    skeleton: (bg, text) => `
<div data-pc-template="faq">
  <h3>FAQ</h3>
  <div style="margin-bottom:12px;"><p><strong>${phInline("Question one — click to edit", bg, text)}</strong></p>${ph("Click to write the answer…", bg, text)}</div>
  <div style="margin-bottom:12px;"><p><strong>${phInline("Question two — click to edit", bg, text)}</strong></p>${ph("Click to write the answer…", bg, text)}</div>
  <div style="margin-bottom:12px;"><p><strong>${phInline("Question three — click to edit", bg, text)}</strong></p>${ph("Click to write the answer…", bg, text)}</div>
</div>`.trim(),
  },
  {
    id: "two-column",
    label: "Two columns",
    skeleton: (bg, text) => `
<div data-pc-template="two-column" style="display:flex;gap:24px;flex-wrap:wrap;">
  <div style="flex:1;min-width:240px;"><h3>${phInline("Column 1 heading", bg, text)}</h3>${ph("Click here to write column 1 text…", bg, text)}</div>
  <div style="flex:1;min-width:240px;"><h3>${phInline("Column 2 heading", bg, text)}</h3>${ph("Click here to write column 2 text…", bg, text)}</div>
</div>`.trim(),
  },
  {
    id: "three-column",
    label: "Three columns",
    skeleton: (bg, text) => `
<div data-pc-template="three-column" style="display:flex;gap:20px;flex-wrap:wrap;">
  <div style="flex:1;min-width:200px;"><h3>${phInline("Column 1 heading", bg, text)}</h3>${ph("Click to write…", bg, text)}</div>
  <div style="flex:1;min-width:200px;"><h3>${phInline("Column 2 heading", bg, text)}</h3>${ph("Click to write…", bg, text)}</div>
  <div style="flex:1;min-width:200px;"><h3>${phInline("Column 3 heading", bg, text)}</h3>${ph("Click to write…", bg, text)}</div>
</div>`.trim(),
  },
  {
    id: "hero-cta",
    label: "Hero + CTA",
    skeleton: (bg, text) => `
<div data-pc-template="hero-cta" style="text-align:left;padding:8px 0;">
  <h2 style="font-size:1.6em;margin:0 0 12px 0;">${phInline("Bold headline goes here", bg, text)}</h2>
  ${ph("Click here to write a short supporting paragraph…", bg, text)}
  <p style="margin-top:16px;"><a href="#" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">${phInline("Button label", bg, text)}</a></p>
</div>`.trim(),
  },
  {
    id: "image-text",
    label: "Image + text",
    skeleton: (bg, text) => `
<div data-pc-template="image-text" style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
  <div style="flex:1;min-width:240px;">${ph("Image placeholder — replace with a product image using Shopify's image button.", bg, text)}</div>
  <div style="flex:1;min-width:240px;"><h3>${phInline("Headline", bg, text)}</h3>${ph("Click here to write your supporting text…", bg, text)}</div>
</div>`.trim(),
  },
  {
    id: "text-image",
    label: "Text + image",
    skeleton: (bg, text) => `
<div data-pc-template="text-image" style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
  <div style="flex:1;min-width:240px;"><h3>${phInline("Headline", bg, text)}</h3>${ph("Click here to write your supporting text…", bg, text)}</div>
  <div style="flex:1;min-width:240px;">${ph("Image placeholder — replace with a product image using Shopify's image button.", bg, text)}</div>
</div>`.trim(),
  },
  {
    id: "gallery-3",
    label: "Image gallery (3)",
    skeleton: (bg, text) => `
<div data-pc-template="gallery-3" style="display:flex;gap:16px;flex-wrap:wrap;">
  <div style="flex:1;min-width:200px;">${ph("Image 1 placeholder", bg, text)}${ph("Caption 1", bg, text)}</div>
  <div style="flex:1;min-width:200px;">${ph("Image 2 placeholder", bg, text)}${ph("Caption 2", bg, text)}</div>
  <div style="flex:1;min-width:200px;">${ph("Image 3 placeholder", bg, text)}${ph("Caption 3", bg, text)}</div>
</div>`.trim(),
  },
];

type Mode = "append" | "replace";

export default reactExtension(TARGET, () => <App />);

function App() {
  const { data, query } = useApi(TARGET);
  const productId = (data as { selected?: { id: string }[] })?.selected?.[0]?.id;

  const [mode, setMode] = useState<Mode>("append");
  const [bgColor, setBgColor] = useState<string>("none");
  const [textColor, setTextColor] = useState<string>("#6b7280");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "success"; label: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  if (!productId) {
    return (
      <AdminBlock title="Description Layouts">
        <Banner tone="info" title="Save the product first">
          <Text>Save the product so it has an id, then come back here.</Text>
        </Banner>
      </AdminBlock>
    );
  }

  async function applyTemplate(t: TemplateMeta) {
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const stampHtml = `${t.skeleton(bgColor, textColor)}\n<p><br></p>`;
      let nextHtml = stampHtml;
      if (mode === "append") {
        const cur = await query<{ product: { descriptionHtml: string } | null }>(
          `query CurDesc($id: ID!) { product(id: $id) { descriptionHtml } }`,
          { variables: { id: productId } }
        );
        const existing = cur.data?.product?.descriptionHtml ?? "";
        nextHtml = existing ? `${existing}\n${stampHtml}` : stampHtml;
      }
      const upd = await query<
        { productUpdate: { userErrors: { message: string }[] } },
        { input: { id: string; descriptionHtml: string } }
      >(
        `mutation UpdateDescription($input: ProductInput!) {
          productUpdate(input: $input) { userErrors { message } }
        }`,
        { variables: { input: { id: productId, descriptionHtml: nextHtml } } }
      );
      const errs = upd.data?.productUpdate?.userErrors ?? [];
      if (errs.length > 0) {
        setStatus({ kind: "error", message: errs.map((e) => e.message).join(", ") });
        return;
      }
      setStatus({ kind: "success", label: t.label });
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
        return;
      }
      setStatus({ kind: "success", label: "Cleanup" });
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
    <AdminBlock title="Description Layouts">
      <BlockStack gap="base">
        <Text>Click a layout to drop placeholder boxes into the description below.</Text>

        <InlineStack gap="base">
          <Select
            label="Background"
            value={bgColor}
            options={BG_OPTIONS}
            onChange={setBgColor}
          />
          <Select
            label="Text"
            value={textColor}
            options={TEXT_OPTIONS}
            onChange={setTextColor}
          />
          <Select
            label="Mode"
            value={mode}
            options={[
              { label: "Append", value: "append" },
              { label: "Replace", value: "replace" },
            ]}
            onChange={(v) => setMode(v as Mode)}
          />
        </InlineStack>

        {status.kind === "success" && (
          <Banner tone="success" title={`${status.label} applied`}>
            <Text>Refresh the page to see the result in the description editor.</Text>
          </Banner>
        )}
        {status.kind === "error" && (
          <Banner tone="critical" title="Failed">
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
                  disabled={busy}
                >
                  <BlockStack gap="none" inlineAlignment="center">
                    <Image source={thumbDataUri(t.id)} alt={t.label} />
                    <Text>{t.label}</Text>
                  </BlockStack>
                </Pressable>
              ))}
            </InlineStack>
          ))}
        </BlockStack>

        <InlineStack gap="base" inlineAlignment="end">
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
