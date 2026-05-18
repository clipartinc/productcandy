/**
 * Single source of truth for description-layout templates used by the
 * /app/descriptions editor.
 *
 * The block extension only needs id + label + thumb (it just navigates to
 * the editor on click). It maintains its own thumbnail list because it
 * lives in a separate sandboxed bundle.
 */

export type FieldKind = "text" | "multiline" | "image";

export type TemplateField = {
  key: string;
  label: string;
  kind: FieldKind;
};

export type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
};

export type Template = {
  id: TemplateId;
  label: string;
  description: string;
  thumb: string;
  fields: TemplateField[];
  render: (values: Record<string, string>, images: ProductImage[]) => string;
};

export type TemplateId =
  | "spec-sheet"
  | "story-features"
  | "faq"
  | "two-column"
  | "three-column"
  | "hero-cta"
  | "image-text"
  | "text-image"
  | "gallery-3";

const THUMB = (id: string) => `/templates/${id}.svg`;

// Stacks multi-column rows on small screens. Container query is primary
// (matches the actual cell width); @media is fallback. See snippetBlocks
// for the long-form rationale.
const RESPONSIVE_STYLE = `<style>.pc-snippet-wrap{width:100%;}.pc-snippet-wrap .pc-snippet-row{display:grid;gap:16px;width:100%;align-items:start;box-sizing:border-box;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{min-width:0;box-sizing:border-box;}</style>`;

const WRAP_OPEN = `<div class="pc-snippet-wrap" style="width:100%;">`;
const WRAP_CLOSE = `</div>`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function paragraphs(text: string | undefined): string {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function imgTag(image: ProductImage | undefined): string {
  if (!image) return "";
  return `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(
    image.altText ?? ""
  )}" style="max-width:100%;height:auto;border-radius:6px;" />`;
}

function findImage(values: Record<string, string>, key: string, images: ProductImage[]) {
  return images.find((i) => i.id === values[key]);
}

export const TEMPLATES: Record<TemplateId, Template> = {
  "spec-sheet": {
    id: "spec-sheet",
    label: "Spec sheet",
    description: "Intro paragraph + a key/value table.",
    thumb: THUMB("spec-sheet"),
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
    id: "story-features",
    label: "Story + features",
    description: "Brand story paragraph followed by a bullet list.",
    thumb: THUMB("story-features"),
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
    id: "faq",
    label: "FAQ block",
    description: "List of question and answer pairs.",
    thumb: THUMB("faq"),
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
          return `<div style="margin-bottom:12px;"><p><strong>${escapeHtml(q)}</strong></p><p>${escapeHtml(a)}</p></div>`;
        })
        .filter(Boolean)
        .join("");
      return `<div><h3>FAQ</h3>${blocks}</div>`;
    },
  },
  "two-column": {
    id: "two-column",
    label: "Two columns",
    description: "Side-by-side text columns with their own headings.",
    thumb: THUMB("two-column"),
    fields: [
      { key: "h1", label: "Column 1 heading", kind: "text" },
      { key: "c1", label: "Column 1 text", kind: "multiline" },
      { key: "h2", label: "Column 2 heading", kind: "text" },
      { key: "c2", label: "Column 2 text", kind: "multiline" },
    ],
    render: (v) =>
      `
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:24px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>${escapeHtml(v.h1 ?? "")}</h3>${paragraphs(v.c1)}</div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>${escapeHtml(v.h2 ?? "")}</h3>${paragraphs(v.c2)}</div>
</div>
${WRAP_CLOSE}`.trim(),
  },
  "three-column": {
    id: "three-column",
    label: "Three columns",
    description: "Three side-by-side text columns with headings.",
    thumb: THUMB("three-column"),
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
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 200px), 1fr));gap:20px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>${escapeHtml(v.h1 ?? "")}</h3>${paragraphs(v.c1)}</div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>${escapeHtml(v.h2 ?? "")}</h3>${paragraphs(v.c2)}</div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>${escapeHtml(v.h3 ?? "")}</h3>${paragraphs(v.c3)}</div>
</div>
${WRAP_CLOSE}`.trim(),
  },
  "hero-cta": {
    id: "hero-cta",
    label: "Hero + CTA",
    description: "Bold headline + supporting paragraph + a call-to-action button.",
    thumb: THUMB("hero-cta"),
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
    <a href="${escapeHtml(v.ctaUrl ?? "#")}" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">${escapeHtml(v.ctaLabel ?? "Learn more")}</a>
  </p>
</div>`.trim(),
  },
  "image-text": {
    id: "image-text",
    label: "Image + text",
    description: "Image on the left, text on the right.",
    thumb: THUMB("image-text"),
    fields: [
      { key: "img", label: "Image", kind: "image" },
      { key: "headline", label: "Headline", kind: "text" },
      { key: "body", label: "Body", kind: "multiline" },
    ],
    render: (v, images) => {
      const img = findImage(v, "img", images);
      return `
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:24px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">${imgTag(img)}</div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>${escapeHtml(v.headline ?? "")}</h3>${paragraphs(v.body)}</div>
</div>
${WRAP_CLOSE}`.trim();
    },
  },
  "text-image": {
    id: "text-image",
    label: "Text + image",
    description: "Text on the left, image on the right.",
    thumb: THUMB("text-image"),
    fields: [
      { key: "headline", label: "Headline", kind: "text" },
      { key: "body", label: "Body", kind: "multiline" },
      { key: "img", label: "Image", kind: "image" },
    ],
    render: (v, images) => {
      const img = findImage(v, "img", images);
      return `
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:24px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>${escapeHtml(v.headline ?? "")}</h3>${paragraphs(v.body)}</div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">${imgTag(img)}</div>
</div>
${WRAP_CLOSE}`.trim();
    },
  },
  "gallery-3": {
    id: "gallery-3",
    label: "Image gallery (3)",
    description: "Three images in a row with optional captions.",
    thumb: THUMB("gallery-3"),
    fields: [
      { key: "img1", label: "Image 1", kind: "image" },
      { key: "cap1", label: "Caption 1", kind: "text" },
      { key: "img2", label: "Image 2", kind: "image" },
      { key: "cap2", label: "Caption 2", kind: "text" },
      { key: "img3", label: "Image 3", kind: "image" },
      { key: "cap3", label: "Caption 3", kind: "text" },
    ],
    render: (v, images) => {
      const items = [
        ["img1", "cap1"],
        ["img2", "cap2"],
        ["img3", "cap3"],
      ]
        .map(([imgKey, capKey]) => {
          const img = findImage(v, imgKey, images);
          if (!img) return "";
          return `<div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">${imgTag(img)}${
            v[capKey]
              ? `<p style="margin-top:8px;text-align:center;font-size:0.9em;color:#6b7280;">${escapeHtml(v[capKey])}</p>`
              : ""
          }</div>`;
        })
        .filter(Boolean);
      // Grid column count tracks the number of non-empty image cells so
      // a gallery with 1 or 2 missing images still distributes evenly.
      const cols = `repeat(auto-fit, minmax(min(100%, 200px), 1fr))`;
      return `${RESPONSIVE_STYLE}${WRAP_OPEN}<div class="pc-snippet-row" style="display:grid !important;grid-template-columns:${cols};gap:16px;width:100%;align-items:start;box-sizing:border-box;">${items.join("")}</div>${WRAP_CLOSE}`;
    },
  },
};

export const TEMPLATE_LIST: Template[] = Object.values(TEMPLATES);
