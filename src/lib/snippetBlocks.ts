/**
 * Block model for the visual snippet builder.
 *
 * The builder UI manipulates an array of these Block objects; the
 * `blocksToHtml` function serializes them into the HTML string that
 * gets stamped into product descriptions when the snippet is applied.
 */

export type Block =
  | { id: string; kind: "heading"; level: 2 | 3; text: string }
  | { id: string; kind: "paragraph"; text: string }
  | { id: string; kind: "list"; ordered: boolean; items: string[] }
  | {
      id: string;
      kind: "two-column";
      h1: string;
      c1: string;
      h2: string;
      c2: string;
    }
  | {
      id: string;
      kind: "three-column";
      h1: string;
      c1: string;
      h2: string;
      c2: string;
      h3: string;
      c3: string;
    }
  | {
      id: string;
      kind: "hero-cta";
      headline: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
    }
  | { id: string; kind: "image"; url: string; alt: string }
  | { id: string; kind: "spec-row"; key: string; value: string }
  | { id: string; kind: "html"; html: string };

export type BlockKind = Block["kind"];

export const BLOCK_LABELS: Record<BlockKind, string> = {
  heading: "Title",
  paragraph: "Paragraph of text",
  list: "Bulleted list",
  "two-column": "Two columns side by side",
  "three-column": "Three columns side by side",
  "hero-cta": "Banner with a button",
  image: "Image",
  "spec-row": "Label and value",
  html: "Custom code (advanced)",
};

export const BLOCK_DESCRIPTIONS: Record<BlockKind, string> = {
  heading: "A short, bold line that introduces a section.",
  paragraph: "A block of text. Use blank lines to make multiple paragraphs.",
  list: "A list of bullet points or numbered steps.",
  "two-column": "Two side-by-side blocks that stack on mobile.",
  "three-column": "Three side-by-side blocks that stack on mobile.",
  "hero-cta": "A big headline plus a clickable button.",
  image: "An image from a URL with optional alt text.",
  "spec-row": "A label/value pair for specs (e.g. Material — Cotton).",
  html: "Drop in your own HTML if you know what you're doing.",
};

export const BLOCK_ORDER: BlockKind[] = [
  "heading",
  "paragraph",
  "list",
  "image",
  "two-column",
  "three-column",
  "hero-cta",
  "spec-row",
  "html",
];

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function newBlock(kind: BlockKind): Block {
  switch (kind) {
    case "heading":
      return { id: newId(), kind, level: 2, text: "Heading text" };
    case "paragraph":
      return { id: newId(), kind, text: "Add your paragraph text here." };
    case "list":
      return {
        id: newId(),
        kind,
        ordered: false,
        items: ["First item", "Second item", "Third item"],
      };
    case "two-column":
      return {
        id: newId(),
        kind,
        h1: "Column 1 heading",
        c1: "Column 1 text.",
        h2: "Column 2 heading",
        c2: "Column 2 text.",
      };
    case "three-column":
      return {
        id: newId(),
        kind,
        h1: "Column 1",
        c1: "Text.",
        h2: "Column 2",
        c2: "Text.",
        h3: "Column 3",
        c3: "Text.",
      };
    case "hero-cta":
      return {
        id: newId(),
        kind,
        headline: "Bold headline goes here",
        body: "Add a short supporting paragraph.",
        ctaLabel: "Button label",
        ctaUrl: "#",
      };
    case "image":
      return { id: newId(), kind, url: "", alt: "" };
    case "spec-row":
      return { id: newId(), kind, key: "Spec name", value: "Spec value" };
    case "html":
      return { id: newId(), kind, html: "<p>Custom HTML here</p>" };
  }
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

function paragraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function blockToHtml(b: Block): string {
  switch (b.kind) {
    case "heading":
      return `<h${b.level}>${escapeHtml(b.text)}</h${b.level}>`;
    case "paragraph":
      return paragraphs(b.text);
    case "list": {
      const tag = b.ordered ? "ol" : "ul";
      const items = b.items
        .map((i) => i.trim())
        .filter(Boolean)
        .map((i) => `<li>${escapeHtml(i)}</li>`)
        .join("");
      return `<${tag}>${items}</${tag}>`;
    }
    case "two-column":
      return `<div style="display:flex;gap:24px;flex-wrap:wrap;"><div style="flex:1;min-width:240px;"><h3>${escapeHtml(
        b.h1
      )}</h3>${paragraphs(b.c1)}</div><div style="flex:1;min-width:240px;"><h3>${escapeHtml(
        b.h2
      )}</h3>${paragraphs(b.c2)}</div></div>`;
    case "three-column":
      return `<div style="display:flex;gap:20px;flex-wrap:wrap;"><div style="flex:1;min-width:200px;"><h3>${escapeHtml(
        b.h1
      )}</h3>${paragraphs(b.c1)}</div><div style="flex:1;min-width:200px;"><h3>${escapeHtml(
        b.h2
      )}</h3>${paragraphs(b.c2)}</div><div style="flex:1;min-width:200px;"><h3>${escapeHtml(
        b.h3
      )}</h3>${paragraphs(b.c3)}</div></div>`;
    case "hero-cta":
      return `<h2>${escapeHtml(b.headline)}</h2>${paragraphs(
        b.body
      )}<p><a href="${escapeAttr(b.ctaUrl || "#")}" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">${escapeHtml(
        b.ctaLabel
      )}</a></p>`;
    case "image":
      if (!b.url) return "";
      return `<p><img src="${escapeAttr(b.url)}" alt="${escapeAttr(
        b.alt
      )}" style="max-width:100%;height:auto;border-radius:6px;" /></p>`;
    case "spec-row":
      return `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;"><div style="flex:1;min-width:120px;font-weight:600;">${escapeHtml(
        b.key
      )}</div><div style="flex:2;min-width:200px;">${escapeHtml(b.value)}</div></div>`;
    case "html":
      return b.html;
  }
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(blockToHtml).filter(Boolean).join("\n");
}
