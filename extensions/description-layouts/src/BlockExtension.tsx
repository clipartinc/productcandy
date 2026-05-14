import {
  reactExtension,
  AdminBlock,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextArea,
  TextField,
  Banner,
  useApi,
  Box,
  Image,
  Pressable,
  Divider,
} from "@shopify/ui-extensions-react/admin";
import { useEffect, useMemo, useState } from "react";

const TARGET = "admin.product-details.block.render";

// Where the SVG thumbnails are served from. Same origin as the rest of
// the marketing/admin app — see public/templates/.
const THUMB_BASE_URL = "https://productcandy.app/templates";

type TemplateId =
  | "spec-sheet"
  | "story-features"
  | "faq"
  | "two-column"
  | "three-column"
  | "hero-cta";

type TemplateField = { key: string; label: string; multiline?: boolean };

const TEMPLATES: Record<
  TemplateId,
  {
    label: string;
    description: string;
    thumb: string;
    fields: TemplateField[];
    render: (v: Record<string, string>) => string;
  }
> = {
  "spec-sheet": {
    label: "Spec sheet",
    description: "Intro paragraph + a key/value table.",
    thumb: `${THUMB_BASE_URL}/spec-sheet.svg`,
    fields: [
      { key: "intro", label: "Intro paragraph", multiline: true },
      { key: "specs", label: "Specs (one per line, key: value)", multiline: true },
    ],
    render: (v) => {
      const rows = (v.specs ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, ...rest] = line.split(":");
          return `<tr><th style="text-align:left;padding:6px 12px 6px 0;">${escapeHtml(
            (key ?? "").trim()
          )}</th><td style="padding:6px 0;">${escapeHtml(rest.join(":").trim())}</td></tr>`;
        })
        .join("");
      return `
<div>
  <p>${escapeHtml(v.intro ?? "")}</p>
  <table style="border-collapse:collapse;width:100%;margin-top:12px;">
    <tbody>${rows}</tbody>
  </table>
</div>`.trim();
    },
  },
  "story-features": {
    label: "Story + features",
    description: "Brand story paragraph followed by a bullet list.",
    thumb: `${THUMB_BASE_URL}/story-features.svg`,
    fields: [
      { key: "story", label: "Story", multiline: true },
      { key: "headline", label: "Features headline" },
      { key: "features", label: "Features (one per line)", multiline: true },
    ],
    render: (v) => {
      const items = (v.features ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("");
      return `
<div>
  <p>${escapeHtml(v.story ?? "")}</p>
  <h3>${escapeHtml(v.headline ?? "What's inside")}</h3>
  <ul>${items}</ul>
</div>`.trim();
    },
  },
  faq: {
    label: "FAQ block",
    description: "List of question and answer pairs.",
    thumb: `${THUMB_BASE_URL}/faq.svg`,
    fields: [
      {
        key: "items",
        label: "FAQ pairs (Q: ... \\n A: ... — blank line between)",
        multiline: true,
      },
    ],
    render: (v) => {
      const blocks = (v.items ?? "")
        .split(/\n\s*\n/)
        .map((block) => {
          const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
          const q = lines.find((l) => /^q:/i.test(l))?.replace(/^q:\s*/i, "") ?? "";
          const a = lines.find((l) => /^a:/i.test(l))?.replace(/^a:\s*/i, "") ?? "";
          if (!q && !a) return "";
          return `<div style="margin-bottom:12px;">
  <p><strong>${escapeHtml(q)}</strong></p>
  <p>${escapeHtml(a)}</p>
</div>`;
        })
        .filter(Boolean)
        .join("");
      return `<div><h3>FAQ</h3>${blocks}</div>`;
    },
  },
  "two-column": {
    label: "Two columns",
    description: "Side-by-side text columns with their own headings.",
    thumb: `${THUMB_BASE_URL}/two-column.svg`,
    fields: [
      { key: "h1", label: "Column 1 heading" },
      { key: "c1", label: "Column 1 text", multiline: true },
      { key: "h2", label: "Column 2 heading" },
      { key: "c2", label: "Column 2 text", multiline: true },
    ],
    render: (v) =>
      `
<div style="display:flex;gap:24px;flex-wrap:wrap;">
  <div style="flex:1;min-width:240px;">
    <h3>${escapeHtml(v.h1 ?? "")}</h3>
    ${paragraphs(v.c1)}
  </div>
  <div style="flex:1;min-width:240px;">
    <h3>${escapeHtml(v.h2 ?? "")}</h3>
    ${paragraphs(v.c2)}
  </div>
</div>`.trim(),
  },
  "three-column": {
    label: "Three columns",
    description: "Three side-by-side text columns with headings.",
    thumb: `${THUMB_BASE_URL}/three-column.svg`,
    fields: [
      { key: "h1", label: "Column 1 heading" },
      { key: "c1", label: "Column 1 text", multiline: true },
      { key: "h2", label: "Column 2 heading" },
      { key: "c2", label: "Column 2 text", multiline: true },
      { key: "h3", label: "Column 3 heading" },
      { key: "c3", label: "Column 3 text", multiline: true },
    ],
    render: (v) =>
      `
<div style="display:flex;gap:20px;flex-wrap:wrap;">
  <div style="flex:1;min-width:200px;">
    <h3>${escapeHtml(v.h1 ?? "")}</h3>
    ${paragraphs(v.c1)}
  </div>
  <div style="flex:1;min-width:200px;">
    <h3>${escapeHtml(v.h2 ?? "")}</h3>
    ${paragraphs(v.c2)}
  </div>
  <div style="flex:1;min-width:200px;">
    <h3>${escapeHtml(v.h3 ?? "")}</h3>
    ${paragraphs(v.c3)}
  </div>
</div>`.trim(),
  },
  "hero-cta": {
    label: "Hero + CTA",
    description: "Bold headline + supporting paragraph + a call-to-action button.",
    thumb: `${THUMB_BASE_URL}/hero-cta.svg`,
    fields: [
      { key: "headline", label: "Headline" },
      { key: "body", label: "Supporting paragraph", multiline: true },
      { key: "ctaLabel", label: "Button label" },
      { key: "ctaUrl", label: "Button URL" },
    ],
    render: (v) =>
      `
<div style="text-align:left;padding:8px 0;">
  <h2 style="font-size:1.6em;margin:0 0 12px 0;">${escapeHtml(v.headline ?? "")}</h2>
  ${paragraphs(v.body)}
  <p style="margin-top:16px;">
    <a href="${escapeAttr(v.ctaUrl ?? "#")}" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">${escapeHtml(v.ctaLabel ?? "Learn more")}</a>
  </p>
</div>`.trim(),
  },
};

function paragraphs(text: string | undefined): string {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export default reactExtension(TARGET, () => <App />);

function App() {
  const { data, query } = useApi(TARGET);
  const productId = (data as { selected?: { id: string }[] })?.selected?.[0]?.id;

  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "success" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const template = templateId ? TEMPLATES[templateId] : null;

  useEffect(() => {
    setValues({});
    setStatus({ kind: "idle" });
  }, [templateId, productId]);

  const html = useMemo(() => (template ? template.render(values) : ""), [template, values]);

  async function applyToProduct() {
    if (!productId || !template) return;
    setStatus({ kind: "saving" });
    try {
      const res = await query<
        { productUpdate: { userErrors: { message: string }[] } },
        { input: { id: string; descriptionHtml: string } }
      >(
        `mutation UpdateDescription($input: ProductInput!) {
           productUpdate(input: $input) {
             userErrors { message }
           }
         }`,
        { variables: { input: { id: productId, descriptionHtml: html } } }
      );
      const errs = res.data?.productUpdate?.userErrors ?? [];
      if (errs.length > 0) {
        setStatus({ kind: "error", message: errs.map((e) => e.message).join(", ") });
        return;
      }
      setStatus({ kind: "success" });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return (
    <AdminBlock title="Product Candy — Description Layouts">
      <BlockStack gap="base">
        <Text>Pick a layout. Fill in the fields. Save it to the product description.</Text>

        <BlockStack gap="base">
          {chunk(Object.entries(TEMPLATES), 3).map((row, i) => (
            <InlineStack key={i} gap="base">
              {row.map(([id, t]) => {
                const selected = templateId === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setTemplateId(id as TemplateId)}
                    border={selected ? "base" : "dotted"}
                    cornerRadius="base"
                    padding="small"
                    background={selected ? "subdued" : "transparent"}
                  >
                    <BlockStack gap="small" inlineAlignment="center">
                      <Image source={t.thumb} alt={t.label} />
                      <Text fontWeight={selected ? "bold" : "normal"}>{t.label}</Text>
                    </BlockStack>
                  </Pressable>
                );
              })}
            </InlineStack>
          ))}
        </BlockStack>

        {template && (
          <>
            <Divider />
            <Text fontWeight="bold">{template.label}</Text>
            <Text>{template.description}</Text>

            {template.fields.map((field) =>
              field.multiline ? (
                <TextArea
                  key={field.key}
                  label={field.label}
                  value={values[field.key] ?? ""}
                  onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                  rows={4}
                />
              ) : (
                <TextField
                  key={field.key}
                  label={field.label}
                  value={values[field.key] ?? ""}
                  onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                />
              )
            )}

            {status.kind === "success" && (
              <Banner tone="success" title="Saved to product">
                <Text>The description has been updated. Refresh the page to see it.</Text>
              </Banner>
            )}
            {status.kind === "error" && (
              <Banner tone="critical" title="Save failed">
                <Text>{status.message}</Text>
              </Banner>
            )}

            <Box>
              <Text fontWeight="bold">Preview HTML</Text>
              <TextArea label="Preview HTML" value={html} rows={6} disabled />
            </Box>

            <InlineStack gap="base" inlineAlignment="end">
              <Button
                variant="primary"
                disabled={!productId || status.kind === "saving"}
                onPress={applyToProduct}
              >
                {status.kind === "saving" ? "Saving..." : "Save to product"}
              </Button>
            </InlineStack>
          </>
        )}
      </BlockStack>
    </AdminBlock>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
