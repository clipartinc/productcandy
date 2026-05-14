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
  Link,
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
  | "hero-cta"
  | "image-text"
  | "text-image"
  | "gallery-3";

type FieldKind = "text" | "multiline" | "image";

type TemplateField = { key: string; label: string; kind: FieldKind };

type ProductImage = { id: string; url: string; altText: string | null };

type Values = Record<string, string>;

const TEMPLATES: Record<
  TemplateId,
  {
    label: string;
    description: string;
    thumb: string;
    fields: TemplateField[];
    render: (v: Values, images: ProductImage[]) => string;
  }
> = {
  "spec-sheet": {
    label: "Spec sheet",
    description: "Intro paragraph + a key/value table.",
    thumb: `${THUMB_BASE_URL}/spec-sheet.svg`,
    fields: [
      { key: "intro", label: "Intro paragraph", kind: "multiline" },
      { key: "specs", label: "Specs (one per line, key: value)", kind: "multiline" },
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
      { key: "story", label: "Story", kind: "multiline" },
      { key: "headline", label: "Features headline", kind: "text" },
      { key: "features", label: "Features (one per line)", kind: "multiline" },
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
        kind: "multiline",
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
      { key: "h1", label: "Column 1 heading", kind: "text" },
      { key: "c1", label: "Column 1 text", kind: "multiline" },
      { key: "h2", label: "Column 2 heading", kind: "text" },
      { key: "c2", label: "Column 2 text", kind: "multiline" },
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
      { key: "h1", label: "Column 1 heading", kind: "text" },
      { key: "c1", label: "Column 1 text", kind: "multiline" },
      { key: "h2", label: "Column 2 heading", kind: "text" },
      { key: "c2", label: "Column 2 text", kind: "multiline" },
      { key: "h3", label: "Column 3 heading", kind: "text" },
      { key: "c3", label: "Column 3 text", kind: "multiline" },
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
      { key: "headline", label: "Headline", kind: "text" },
      { key: "body", label: "Supporting paragraph", kind: "multiline" },
      { key: "ctaLabel", label: "Button label", kind: "text" },
      { key: "ctaUrl", label: "Button URL", kind: "text" },
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
  "image-text": {
    label: "Image + text",
    description: "Image on the left, text on the right.",
    thumb: `${THUMB_BASE_URL}/image-text.svg`,
    fields: [
      { key: "img", label: "Image", kind: "image" },
      { key: "headline", label: "Headline", kind: "text" },
      { key: "body", label: "Body", kind: "multiline" },
    ],
    render: (v, images) => {
      const img = images.find((i) => i.id === v.img);
      const imgTag = img
        ? `<img src="${escapeAttr(img.url)}" alt="${escapeAttr(img.altText ?? "")}" style="max-width:100%;height:auto;border-radius:6px;" />`
        : "";
      return `
<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
  <div style="flex:1;min-width:240px;">${imgTag}</div>
  <div style="flex:1;min-width:240px;">
    <h3>${escapeHtml(v.headline ?? "")}</h3>
    ${paragraphs(v.body)}
  </div>
</div>`.trim();
    },
  },
  "text-image": {
    label: "Text + image",
    description: "Text on the left, image on the right.",
    thumb: `${THUMB_BASE_URL}/text-image.svg`,
    fields: [
      { key: "headline", label: "Headline", kind: "text" },
      { key: "body", label: "Body", kind: "multiline" },
      { key: "img", label: "Image", kind: "image" },
    ],
    render: (v, images) => {
      const img = images.find((i) => i.id === v.img);
      const imgTag = img
        ? `<img src="${escapeAttr(img.url)}" alt="${escapeAttr(img.altText ?? "")}" style="max-width:100%;height:auto;border-radius:6px;" />`
        : "";
      return `
<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
  <div style="flex:1;min-width:240px;">
    <h3>${escapeHtml(v.headline ?? "")}</h3>
    ${paragraphs(v.body)}
  </div>
  <div style="flex:1;min-width:240px;">${imgTag}</div>
</div>`.trim();
    },
  },
  "gallery-3": {
    label: "Image gallery (3)",
    description: "Three images in a row with optional captions.",
    thumb: `${THUMB_BASE_URL}/gallery-3.svg`,
    fields: [
      { key: "img1", label: "Image 1", kind: "image" },
      { key: "cap1", label: "Caption 1", kind: "text" },
      { key: "img2", label: "Image 2", kind: "image" },
      { key: "cap2", label: "Caption 2", kind: "text" },
      { key: "img3", label: "Image 3", kind: "image" },
      { key: "cap3", label: "Caption 3", kind: "text" },
    ],
    render: (v, images) => {
      const cells = [
        ["img1", "cap1"],
        ["img2", "cap2"],
        ["img3", "cap3"],
      ]
        .map(([imgKey, capKey]) => {
          const img = images.find((i) => i.id === v[imgKey]);
          if (!img) return "";
          return `
<div style="flex:1;min-width:200px;">
  <img src="${escapeAttr(img.url)}" alt="${escapeAttr(img.altText ?? "")}" style="width:100%;height:auto;border-radius:6px;" />
  ${v[capKey] ? `<p style="margin-top:8px;text-align:center;font-size:0.9em;color:#6b7280;">${escapeHtml(v[capKey])}</p>` : ""}
</div>`;
        })
        .filter(Boolean)
        .join("");
      return `<div style="display:flex;gap:16px;flex-wrap:wrap;">${cells}</div>`;
    },
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
  const [pickerOpen, setPickerOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [values, setValues] = useState<Values>({});
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "success" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const template = templateId ? TEMPLATES[templateId] : null;
  const needsImages = !!template?.fields.some((f) => f.kind === "image");

  useEffect(() => {
    setValues({});
    setStatus({ kind: "idle" });
    setPreviewOpen(false);
    if (templateId) setPickerOpen(false);
  }, [templateId, productId]);

  // Fetch product images on demand when an image-using template is selected.
  useEffect(() => {
    if (!productId || !needsImages || images.length > 0 || imagesLoading) return;
    setImagesLoading(true);
    query<{
      product: {
        media: { nodes: { id: string; image?: { url: string; altText: string | null } }[] };
      } | null;
    }>(
      `query ProductImages($id: ID!) {
        product(id: $id) {
          media(first: 30, query: "media_type:IMAGE") {
            nodes {
              ... on MediaImage { id image { url altText } }
            }
          }
        }
      }`,
      { variables: { id: productId } }
    )
      .then((res) => {
        const flat: ProductImage[] = (res.data?.product?.media?.nodes ?? [])
          .filter((n): n is { id: string; image: { url: string; altText: string | null } } =>
            !!n.image
          )
          .map((n) => ({
            id: n.id,
            url: n.image.url,
            altText: n.image.altText,
          }));
        setImages(flat);
      })
      .finally(() => setImagesLoading(false));
  }, [productId, needsImages, images.length, imagesLoading, query]);

  const html = useMemo(
    () => (template ? template.render(values, images) : ""),
    [template, values, images]
  );

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
        {/* Picker: shown until a layout is chosen, or expanded again via "Change layout" */}
        {(pickerOpen || !template) && (
          <BlockStack gap="base">
            <Text>Pick a layout.</Text>
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
        )}

        {template && (
          <>
            {!pickerOpen && (
              <InlineStack gap="base" inlineAlignment="space-between" blockAlignment="center">
                <Text fontWeight="bold">Layout: {template.label}</Text>
                <Button onPress={() => setPickerOpen(true)}>Change layout</Button>
              </InlineStack>
            )}
            <Text>{template.description}</Text>

            {template.fields.map((field) => {
              if (field.kind === "image") {
                return (
                  <ImageField
                    key={field.key}
                    label={field.label}
                    images={images}
                    loading={imagesLoading}
                    selectedId={values[field.key] ?? null}
                    onSelect={(id) =>
                      setValues((prev) => ({ ...prev, [field.key]: id }))
                    }
                  />
                );
              }
              if (field.kind === "multiline") {
                return (
                  <TextArea
                    key={field.key}
                    label={field.label}
                    value={values[field.key] ?? ""}
                    onChange={(v) =>
                      setValues((prev) => ({ ...prev, [field.key]: v }))
                    }
                    rows={4}
                  />
                );
              }
              return (
                <TextField
                  key={field.key}
                  label={field.label}
                  value={values[field.key] ?? ""}
                  onChange={(v) =>
                    setValues((prev) => ({ ...prev, [field.key]: v }))
                  }
                />
              );
            })}

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

            <InlineStack gap="base">
              <Button onPress={() => setPreviewOpen((p) => !p)}>
                {previewOpen ? "Hide preview" : "Show preview"}
              </Button>
            </InlineStack>
            {previewOpen && (
              <Box>
                <TextArea label="Preview HTML" value={html} rows={6} disabled />
              </Box>
            )}

            <InlineStack gap="base" inlineAlignment="space-between">
              <Link
                to={`shopify://admin/apps/product-candy/app/descriptions?id=${encodeURIComponent(
                  productId ?? ""
                )}`}
              >
                Customize freely…
              </Link>
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

function ImageField({
  label,
  images,
  loading,
  selectedId,
  onSelect,
}: {
  label: string;
  images: ProductImage[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <BlockStack gap="small">
        <Text fontWeight="bold">{label}</Text>
        <Text>Loading product images…</Text>
      </BlockStack>
    );
  }
  if (images.length === 0) {
    return (
      <Banner tone="warning" title={`${label}: no images on this product`}>
        <Text>Add an image to the product first, then come back here.</Text>
      </Banner>
    );
  }
  return (
    <BlockStack gap="small">
      <Text fontWeight="bold">{label}</Text>
      <BlockStack gap="small">
        {chunk(images, 4).map((row, i) => (
          <InlineStack key={i} gap="small">
            {row.map((img) => {
              const selected = selectedId === img.id;
              return (
                <Pressable
                  key={img.id}
                  onPress={() => onSelect(img.id)}
                  border={selected ? "base" : "dotted"}
                  cornerRadius="base"
                  padding="small"
                  background={selected ? "subdued" : "transparent"}
                >
                  <Image source={img.url} alt={img.altText ?? ""} />
                </Pressable>
              );
            })}
          </InlineStack>
        ))}
      </BlockStack>
    </BlockStack>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
