/**
 * Block model for the visual snippet builder.
 *
 * The builder UI manipulates an array of these Block objects; the
 * `blocksToHtml` function serializes them into the HTML string that
 * gets stamped into product descriptions when the snippet is applied.
 */

type Common = { id: string; filled?: boolean };

export type ListStyle = "bulleted" | "numbered" | "none";

export type Block =
  | (Common & { kind: "heading"; level: 2 | 3; text: string })
  | (Common & { kind: "paragraph"; text: string })
  | (Common & { kind: "list"; style: ListStyle; items: string[] })
  | (Common & {
      kind: "hero-cta";
      headline: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
    })
  | (Common & { kind: "image"; url: string; alt: string })
  | (Common & {
      kind: "spec-row";
      entries: { label: string; value: string }[];
    })
  | (Common & { kind: "html"; html: string });

export type BlockKind = Block["kind"];

export const BLOCK_LABELS: Record<BlockKind, string> = {
  heading: "Title",
  paragraph: "Paragraph of text",
  list: "Bulleted list",
  "hero-cta": "Banner with a button",
  image: "Image",
  "spec-row": "Label and value",
  html: "Custom code (advanced)",
};

export const BLOCK_DESCRIPTIONS: Record<BlockKind, string> = {
  heading: "A short, bold line that introduces a section.",
  paragraph: "A block of text. Use blank lines to make multiple paragraphs.",
  list: "A list of bullet points or numbered steps.",
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
      return { id: newId(), kind, level: 2, text: "Heading text", filled: false };
    case "paragraph":
      return {
        id: newId(),
        kind,
        text: "Add your paragraph text here.",
        filled: false,
      };
    case "list":
      return {
        id: newId(),
        kind,
        style: "bulleted",
        items: ["First item", "Second item", "Third item"],
        filled: false,
      };
    case "hero-cta":
      return {
        id: newId(),
        kind,
        headline: "Bold headline goes here",
        body: "Add a short supporting paragraph.",
        ctaLabel: "Button label",
        ctaUrl: "#",
        filled: false,
      };
    case "image":
      return { id: newId(), kind, url: "", alt: "", filled: false };
    case "spec-row":
      return {
        id: newId(),
        kind,
        entries: [{ label: "Spec name", value: "Spec value" }],
        filled: false,
      };
    case "html":
      return { id: newId(), kind, html: "<p>Custom HTML here</p>", filled: false };
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

// Same placeholder styling the action extension stamps when the merchant
// applies a layout — keeps editing-time visuals consistent across surfaces.
const PH_BLOCK = `data-pc-placeholder="1" style="background-color:#f3f4f6;color:#6b7280;border:1px dashed #d1d5db;border-radius:8px;padding:12px 16px;margin:8px 0;font-style:italic;"`;

function placeholderHtml(b: Block): string {
  switch (b.kind) {
    case "heading":
      return `<div ${PH_BLOCK}>Heading placeholder</div>`;
    case "paragraph":
      return `<div ${PH_BLOCK}>Paragraph placeholder — click to edit.</div>`;
    case "list":
      return `<div ${PH_BLOCK}>List placeholder — one item per line.</div>`;
    case "hero-cta":
      return `<div ${PH_BLOCK}>Hero headline placeholder</div><div ${PH_BLOCK}>Body text placeholder</div><div ${PH_BLOCK}>Button placeholder</div>`;
    case "image":
      return `<div ${PH_BLOCK}>Image placeholder — replace with a product image.</div>`;
    case "spec-row":
      return `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;width:100%;"><div style="flex:1;min-width:60px;"><div ${PH_BLOCK}>Spec name</div></div><div style="flex:2;min-width:80px;"><div ${PH_BLOCK}>Spec value</div></div></div>`;
    case "html":
      return `<div ${PH_BLOCK}>Custom HTML placeholder</div>`;
  }
}

function blockToHtml(b: Block): string {
  if (b.filled === false) return placeholderHtml(b);
  switch (b.kind) {
    case "heading":
      return `<h${b.level}>${escapeHtml(b.text)}</h${b.level}>`;
    case "paragraph":
      return paragraphs(b.text);
    case "list": {
      const tag = b.style === "numbered" ? "ol" : "ul";
      const listAttr =
        b.style === "none"
          ? ' style="list-style:none;padding-left:0;margin:0;"'
          : "";
      const items = b.items
        .map((i) => i.trim())
        .filter(Boolean)
        .map((i) => `<li>${escapeHtml(i)}</li>`)
        .join("");
      return `<${tag}${listAttr}>${items}</${tag}>`;
    }
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
      return b.entries
        .map(
          (e) =>
            `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;width:100%;"><div style="flex:1;min-width:60px;font-weight:600;">${escapeHtml(
              e.label
            )}</div><div style="flex:2;min-width:80px;">${escapeHtml(
              e.value
            )}</div></div>`
        )
        .join("");
    case "html":
      return b.html;
  }
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(blockToHtml).filter(Boolean).join("\n");
}

// -----------------------------------------------------------------------------
// Rows + Columns: top-level layout container
// A Row is one or more Columns side-by-side. A Column is a vertical stack of
// Blocks. Drag-and-drop wires up to both axes: drop next to a section to add a
// new column, or drop above/below to stack inside the existing column.
// -----------------------------------------------------------------------------

export type Column = { id: string; blocks: Block[] };
export type Row = { id: string; columns: Column[] };
export type Layout = Row[];

export function newColumn(initial?: Block[]): Column {
  return { id: newId(), blocks: initial ?? [] };
}

export function newRow(initial?: Block[]): Row {
  // Each initial block becomes its own single-block column (side-by-side).
  return {
    id: newId(),
    columns: initial && initial.length > 0
      ? initial.map((b) => ({ id: newId(), blocks: [b] }))
      : [],
  };
}

function columnToHtml(col: Column): string {
  return col.blocks.map(blockToHtml).filter(Boolean).join("");
}

function rowToHtml(row: Row): string {
  const nonEmpty = row.columns.filter((c) => c.blocks.length > 0);
  if (nonEmpty.length === 0) return "";
  if (nonEmpty.length === 1) return columnToHtml(nonEmpty[0]);
  // No flex-wrap and no min-width on each column: the cells stay strictly
  // side-by-side and share whatever width the parent provides. Themes that
  // wrap content in a narrow container (e.g. a section with its own
  // --max-width--body-normal, a multi-column resource list) used to make
  // these columns wrap-stack on what looked like a wide page. Now they
  // shrink instead — narrower on small screens but visually still two
  // columns, which is what users expect when they drag two blocks
  // side-by-side in the builder.
  const cells = nonEmpty
    .map((c) => `<div style="flex:1;min-width:0;">${columnToHtml(c)}</div>`)
    .join("");
  // Some themes (Horizon's rte-formatter is one) comment out width:100% in
  // user-pasted inline styles as part of their RTE sanitiser. min-width:100%
  // and align-self:stretch reach the same outcome through different paths
  // that the sanitiser doesn't touch: min-width to claim the parent's width
  // for a block element, align-self:stretch to fill the cross-axis when the
  // parent is itself a flex/grid container.
  return `<div style="display:flex;gap:16px;width:100%;min-width:100%;align-self:stretch;box-sizing:border-box;">${cells}</div>`;
}

export function layoutToHtml(layout: Layout): string {
  return layout
    .map(rowToHtml)
    .filter(Boolean)
    .join("\n");
}
