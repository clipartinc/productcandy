/**
 * Parse the rendered HTML of a snippet back into a visual-builder Layout.
 *
 * We control the HTML generator (blockToHtml in snippetBlocks.ts) so we can
 * recognise its output patterns: headings, paragraphs, lists, images,
 * multi-column rows, spec-row entries. Anything we don't recognise becomes
 * a single `html` block so the merchant can still edit it as raw HTML.
 *
 * Multi-paragraph runs come back as multiple paragraph blocks (since the
 * generator emits one <p> per paragraph and we can't tell which `<p>`s
 * originated from the same source block). Hero-CTA patterns aren't
 * reconstructed — they end up as a heading + paragraph + raw-HTML button.
 * Both are acceptable: the merchant can re-collapse if they want.
 *
 * Only call from the client — relies on DOMParser.
 */

import type { Block, Column, Layout, ListStyle, Row } from "./snippetBlocks";

const id = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const filled = { filled: true } as const;

function wrapAsHtmlRow(html: string): Row {
  return {
    id: id(),
    columns: [
      {
        id: id(),
        blocks: [{ id: id(), kind: "html", html, ...filled }],
      },
    ],
  };
}

function rowWithBlocks(blocks: Block[]): Row {
  return {
    id: id(),
    columns: [{ id: id(), blocks }],
  };
}

function styleNoWs(el: Element): string {
  return (el.getAttribute("style") ?? "").replace(/\s/g, "").toLowerCase();
}

function isMultiColumnRow(el: Element): boolean {
  if (el.tagName !== "DIV") return false;
  const style = styleNoWs(el);
  return (
    style.includes("display:flex") &&
    style.includes("flex-wrap:wrap") &&
    !style.includes("border-bottom") &&
    el.children.length >= 2
  );
}

function isSpecRowEntry(el: Element): boolean {
  if (el.tagName !== "DIV") return false;
  const style = styleNoWs(el);
  return (
    style.includes("display:flex") &&
    style.includes("border-bottom:1pxsolid") &&
    el.children.length >= 2
  );
}

function extractListItems(el: Element): string[] {
  return Array.from(el.querySelectorAll(":scope > li")).map(
    (li) => li.textContent?.trim() ?? ""
  );
}

// Reverse the placeholderHtml output in snippetBlocks.ts. The placeholders
// always emit `data-pc-placeholder="1"` and a known default phrase per kind,
// so we can pick the right block type from the visible text. Custom text
// inside a placeholder div (user-edited, or content we don't recognise) is
// preserved as a paragraph so nothing gets dropped.
function parsePlaceholderDiv(el: Element): Block {
  const text = el.textContent?.trim() ?? "";
  if (text === "Heading placeholder" || text === "Hero headline placeholder") {
    return {
      id: id(),
      kind: "heading",
      level: 2,
      text: "Heading text",
      filled: false,
    };
  }
  if (text.startsWith("Paragraph placeholder") || text === "Body text placeholder") {
    return {
      id: id(),
      kind: "paragraph",
      text: "Add your paragraph text here.",
      filled: false,
    };
  }
  if (text.startsWith("List placeholder")) {
    return {
      id: id(),
      kind: "list",
      style: "bulleted",
      items: ["First item", "Second item", "Third item"],
      filled: false,
    };
  }
  if (text.startsWith("Image placeholder")) {
    return { id: id(), kind: "image", url: "", alt: "", filled: false };
  }
  if (text === "Custom HTML placeholder") {
    return {
      id: id(),
      kind: "html",
      html: "<p>Custom HTML here</p>",
      filled: false,
    };
  }
  // Anything else (e.g. user-typed text that still has placeholder styling)
  // becomes a paragraph with that text.
  return { id: id(), kind: "paragraph", text, filled: true };
}

const STRUCTURAL_TAGS = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "P",
  "UL",
  "OL",
]);

function parseBlock(el: Element): Block {
  // Placeholder divs emitted by placeholderHtml() take precedence over the
  // tag-based fallbacks below, since they're always wrapped in a styled
  // <div data-pc-placeholder="1">.
  if (el.tagName === "DIV" && el.hasAttribute("data-pc-placeholder")) {
    return parsePlaceholderDiv(el);
  }

  // Unwrap generic divs (no flex layout, no spec-row border, no placeholder
  // marker) that contain exactly one structural child — handles content
  // like `<div><h2>Title</h2></div>` that Tiptap or other editors emit.
  if (
    el.tagName === "DIV" &&
    el.children.length === 1 &&
    !el.hasAttribute("data-pc-placeholder")
  ) {
    const style = styleNoWs(el);
    if (
      !style.includes("display:flex") &&
      !style.includes("border-bottom")
    ) {
      const child = el.children[0];
      if (STRUCTURAL_TAGS.has(child.tagName)) {
        return parseBlock(child);
      }
    }
  }

  switch (el.tagName) {
    case "H1":
    case "H2":
      return {
        id: id(),
        kind: "heading",
        level: 2,
        text: el.textContent?.trim() ?? "",
        ...filled,
      };
    case "H3":
    case "H4":
    case "H5":
    case "H6":
      return {
        id: id(),
        kind: "heading",
        level: 3,
        text: el.textContent?.trim() ?? "",
        ...filled,
      };
    case "P": {
      // <p><img …></p> → image block
      const img = el.querySelector(":scope > img");
      if (img) {
        return {
          id: id(),
          kind: "image",
          url: img.getAttribute("src") ?? "",
          alt: img.getAttribute("alt") ?? "",
          ...filled,
        };
      }
      // Plain paragraph
      return {
        id: id(),
        kind: "paragraph",
        text: el.textContent?.trim() ?? "",
        ...filled,
      };
    }
    case "UL": {
      const style = styleNoWs(el);
      const listStyle: ListStyle = style.includes("list-style:none")
        ? "none"
        : "bulleted";
      return {
        id: id(),
        kind: "list",
        style: listStyle,
        items: extractListItems(el),
        ...filled,
      };
    }
    case "OL":
      return {
        id: id(),
        kind: "list",
        style: "numbered",
        items: extractListItems(el),
        ...filled,
      };
    default:
      return { id: id(), kind: "html", html: el.outerHTML, ...filled };
  }
}

function parseSpecRowEntry(
  el: Element
): { label: string; value: string } | null {
  const cells = Array.from(el.children);
  if (cells.length < 2) return null;
  return {
    label: cells[0].textContent?.trim() ?? "",
    value: cells[1].textContent?.trim() ?? "",
  };
}

function parseMultiColumnRow(el: Element): Row {
  const cols: Column[] = Array.from(el.children).map((colDiv) => {
    const blocks: Block[] = [];
    let i = 0;
    const children = Array.from(colDiv.children);
    while (i < children.length) {
      const child = children[i];
      if (isSpecRowEntry(child)) {
        const entries: { label: string; value: string }[] = [];
        while (i < children.length && isSpecRowEntry(children[i])) {
          const e = parseSpecRowEntry(children[i]);
          if (e) entries.push(e);
          i++;
        }
        if (entries.length > 0) {
          blocks.push({ id: id(), kind: "spec-row", entries, ...filled });
        }
        continue;
      }
      blocks.push(parseBlock(child));
      i++;
    }
    return { id: id(), blocks };
  });
  return { id: id(), columns: cols };
}

function flattenTopLevel(elements: Element[]): Element[] {
  const out: Element[] = [];
  for (const el of elements) {
    // Drop the responsive-stacking <style> tag we inject above each row —
    // it carries no semantic block content and would otherwise round-trip
    // as an "html" block on every save.
    if (el.tagName === "STYLE") continue;
    if (
      el.tagName === "DIV" &&
      !el.hasAttribute("data-pc-placeholder") &&
      el.children.length > 0
    ) {
      const style = styleNoWs(el);
      const isLayoutDiv =
        (style.includes("display:flex") && style.includes("flex-wrap:wrap")) ||
        style.includes("border-bottom");
      if (!isLayoutDiv) {
        out.push(...flattenTopLevel(Array.from(el.children)));
        continue;
      }
    }
    out.push(el);
  }
  return out;
}

export function htmlToLayout(html: string): Layout {
  if (typeof DOMParser === "undefined") {
    // Server-side fallback: keep the whole HTML in one block.
    return [wrapAsHtmlRow(html)];
  }
  const doc = new DOMParser().parseFromString(
    `<div id="__root__">${html}</div>`,
    "text/html"
  );
  const root = doc.getElementById("__root__");
  if (!root) return [wrapAsHtmlRow(html)];

  // Flatten generic wrapper divs at the top level so a snippet wrapped in
  // <div>...</div> (or similar) still parses each structural child into its
  // own block instead of becoming one giant html block.
  const top = flattenTopLevel(Array.from(root.children));
  if (top.length === 0) return [wrapAsHtmlRow(html)];

  const rows: Row[] = [];
  let i = 0;
  while (i < top.length) {
    const el = top[i];
    if (isMultiColumnRow(el)) {
      rows.push(parseMultiColumnRow(el));
      i++;
      continue;
    }
    if (isSpecRowEntry(el)) {
      // Collapse a run of spec-row divs into one spec-row block.
      const entries: { label: string; value: string }[] = [];
      while (i < top.length && isSpecRowEntry(top[i])) {
        const e = parseSpecRowEntry(top[i]);
        if (e) entries.push(e);
        i++;
      }
      if (entries.length > 0) {
        rows.push(
          rowWithBlocks([{ id: id(), kind: "spec-row", entries, ...filled }])
        );
      }
      continue;
    }
    rows.push(rowWithBlocks([parseBlock(el)]));
    i++;
  }

  return rows.length > 0 ? rows : [wrapAsHtmlRow(html)];
}
