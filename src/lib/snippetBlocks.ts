/**
 * Block model for the visual snippet builder.
 *
 * The builder UI manipulates an array of these Block objects; the
 * `blocksToHtml` function serializes them into the HTML string that
 * gets stamped into product descriptions when the snippet is applied.
 */

type Common = { id: string; filled?: boolean };

/**
 * Sub-blocks live inside a Column. They're the same shape as top-level Blocks
 * but only the kinds that make sense nested: heading, paragraph, list, image,
 * button. (No nested columns, hero-cta, spec-row, or raw html — keeps the
 * UX simple and the structure non-recursive.)
 */
export type SubBlock =
  | { id: string; kind: "heading"; level: 2 | 3; text: string }
  | { id: string; kind: "paragraph"; text: string }
  | { id: string; kind: "list"; ordered: boolean; items: string[] }
  | { id: string; kind: "image"; url: string; alt: string }
  | { id: string; kind: "button"; label: string; url: string };

export type SubBlockKind = SubBlock["kind"];

export const SUB_BLOCK_LABELS: Record<SubBlockKind, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  list: "List",
  image: "Image",
  button: "Button",
};

export const SUB_BLOCK_ORDER: SubBlockKind[] = [
  "heading",
  "paragraph",
  "list",
  "image",
  "button",
];

const newSubId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function newSubBlock(kind: SubBlockKind): SubBlock {
  switch (kind) {
    case "heading":
      return { id: newSubId(), kind, level: 3, text: "Heading" };
    case "paragraph":
      return { id: newSubId(), kind, text: "Paragraph text." };
    case "list":
      return {
        id: newSubId(),
        kind,
        ordered: false,
        items: ["Item 1", "Item 2", "Item 3"],
      };
    case "image":
      return { id: newSubId(), kind, url: "", alt: "" };
    case "button":
      return { id: newSubId(), kind, label: "Button", url: "#" };
  }
}

export type ColumnContent = SubBlock[];

export type Block =
  | (Common & { kind: "heading"; level: 2 | 3; text: string })
  | (Common & { kind: "paragraph"; text: string })
  | (Common & { kind: "list"; ordered: boolean; items: string[] })
  | (Common & { kind: "columns"; count: 2 | 3 | 4; columns: ColumnContent[] })
  | (Common & {
      kind: "hero-cta";
      headline: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
    })
  | (Common & { kind: "image"; url: string; alt: string })
  | (Common & { kind: "spec-row"; key: string; value: string })
  | (Common & { kind: "html"; html: string });

export type BlockKind = Block["kind"];

export const BLOCK_LABELS: Record<BlockKind, string> = {
  heading: "Title",
  paragraph: "Paragraph of text",
  list: "Bulleted list",
  columns: "Columns side by side",
  "hero-cta": "Banner with a button",
  image: "Image",
  "spec-row": "Label and value",
  html: "Custom code (advanced)",
};

export const BLOCK_DESCRIPTIONS: Record<BlockKind, string> = {
  heading: "A short, bold line that introduces a section.",
  paragraph: "A block of text. Use blank lines to make multiple paragraphs.",
  list: "A list of bullet points or numbered steps.",
  columns: "Side-by-side blocks (2, 3, or 4) that stack on mobile.",
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
  "columns",
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
        ordered: false,
        items: ["First item", "Second item", "Third item"],
        filled: false,
      };
    case "columns": {
      const defaultCol = (i: number): ColumnContent => [
        {
          id: newSubId(),
          kind: "heading",
          level: 3,
          text: `Column ${i + 1} heading`,
        },
        {
          id: newSubId(),
          kind: "paragraph",
          text: `Column ${i + 1} text.`,
        },
      ];
      return {
        id: newId(),
        kind,
        count: 2,
        columns: [defaultCol(0), defaultCol(1)],
        filled: false,
      };
    }
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
        key: "Spec name",
        value: "Spec value",
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
    case "columns": {
      const minW = b.count === 2 ? 240 : b.count === 3 ? 200 : 160;
      const cells = Array.from({ length: b.count })
        .map(
          (_, i) =>
            `<div style="flex:1;min-width:${minW}px;"><div ${PH_BLOCK}>Column ${i + 1} placeholder</div></div>`
        )
        .join("");
      return `<div style="display:flex;gap:20px;flex-wrap:wrap;">${cells}</div>`;
    }
    case "hero-cta":
      return `<div ${PH_BLOCK}>Hero headline placeholder</div><div ${PH_BLOCK}>Body text placeholder</div><div ${PH_BLOCK}>Button placeholder</div>`;
    case "image":
      return `<div ${PH_BLOCK}>Image placeholder — replace with a product image.</div>`;
    case "spec-row":
      return `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;"><div style="flex:1;min-width:120px;"><div ${PH_BLOCK}>Spec name</div></div><div style="flex:2;min-width:200px;"><div ${PH_BLOCK}>Spec value</div></div></div>`;
    case "html":
      return `<div ${PH_BLOCK}>Custom HTML placeholder</div>`;
  }
}

function subBlockToHtml(s: SubBlock): string {
  switch (s.kind) {
    case "heading":
      return `<h${s.level}>${escapeHtml(s.text)}</h${s.level}>`;
    case "paragraph":
      return paragraphs(s.text);
    case "list": {
      const tag = s.ordered ? "ol" : "ul";
      const items = s.items
        .map((i) => i.trim())
        .filter(Boolean)
        .map((i) => `<li>${escapeHtml(i)}</li>`)
        .join("");
      return `<${tag}>${items}</${tag}>`;
    }
    case "image":
      if (!s.url) return "";
      return `<p><img src="${escapeAttr(s.url)}" alt="${escapeAttr(
        s.alt
      )}" style="max-width:100%;height:auto;border-radius:6px;" /></p>`;
    case "button":
      return `<p><a href="${escapeAttr(
        s.url || "#"
      )}" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">${escapeHtml(
        s.label
      )}</a></p>`;
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
      const tag = b.ordered ? "ol" : "ul";
      const items = b.items
        .map((i) => i.trim())
        .filter(Boolean)
        .map((i) => `<li>${escapeHtml(i)}</li>`)
        .join("");
      return `<${tag}>${items}</${tag}>`;
    }
    case "columns": {
      const minW = b.count === 2 ? 240 : b.count === 3 ? 200 : 160;
      const cells = b.columns
        .map((col) => {
          const inner = Array.isArray(col)
            ? col.map(subBlockToHtml).filter(Boolean).join("")
            : // Backward-compat with old { heading, text } shape
              `<h3>${escapeHtml(
                (col as unknown as { heading?: string }).heading ?? ""
              )}</h3>${paragraphs(
                (col as unknown as { text?: string }).text ?? ""
              )}`;
          return `<div style="flex:1;min-width:${minW}px;">${inner}</div>`;
        })
        .join("");
      return `<div style="display:flex;gap:20px;flex-wrap:wrap;">${cells}</div>`;
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
  const minW = Math.max(120, Math.floor(720 / nonEmpty.length));
  const cells = nonEmpty
    .map(
      (c) => `<div style="flex:1;min-width:${minW}px;">${columnToHtml(c)}</div>`
    )
    .join("");
  return `<div style="display:flex;gap:24px;flex-wrap:wrap;">${cells}</div>`;
}

export function layoutToHtml(layout: Layout): string {
  return layout
    .map(rowToHtml)
    .filter(Boolean)
    .join("\n");
}
