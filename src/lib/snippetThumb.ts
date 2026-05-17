/**
 * SVG wireframe thumbnails for saved snippets — used by the Description
 * Layouts action extension so each snippet card shows a preview image,
 * not just a button.
 *
 * Strategy: prefer the saved Layout (rows of columns of blocks) when
 * present and render block-shaped rectangles; otherwise fall back to
 * parsing the raw HTML for headings / paragraphs / lists and sketching
 * those. Either way the output mimics the per-template SVGs in
 * public/templates so the visual treatment is consistent.
 */

import type { Block, Column, Layout, Row } from "./snippetBlocks";

const W = 240;
const H = 180;
const PAD = 10;
const TITLE_H = 22;
const BODY_TOP = PAD + TITLE_H + 4;
const BODY_H = H - BODY_TOP - PAD;
const BODY_LEFT = PAD;
const BODY_WIDTH = W - PAD * 2;

const PINK = "#ec4899";
const GRAY = "#9ca3af";
const GRAY_LIGHT = "#e5e7eb";
const BG = "#ffffff";
const BORDER = "#d1d5db";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

type Cell = { x: number; y: number; w: number; h: number };

function blockShapes(block: Block, cell: Cell): string {
  const inner = 6;
  let cursorY = cell.y + inner;
  const left = cell.x + inner;
  const innerW = cell.w - inner * 2;
  const maxY = cell.y + cell.h - inner;
  const shapes: string[] = [];
  const line = (y: number, w: number, fill: string) =>
    `<rect x="${left}" y="${y}" width="${Math.min(w, innerW)}" height="5" rx="2" fill="${fill}"/>`;
  switch (block.kind) {
    case "heading":
      shapes.push(
        `<rect x="${left}" y="${cursorY}" width="${Math.min(innerW * 0.55, innerW)}" height="8" rx="3" fill="${PINK}"/>`
      );
      break;
    case "paragraph": {
      const widths = [innerW * 0.9, innerW * 0.95, innerW * 0.7];
      for (const w of widths) {
        if (cursorY + 5 > maxY) break;
        shapes.push(line(cursorY, w, GRAY));
        cursorY += 8;
      }
      break;
    }
    case "list": {
      const items = Math.min(block.items.length || 3, 4);
      for (let i = 0; i < items; i++) {
        if (cursorY + 5 > maxY) break;
        shapes.push(
          `<circle cx="${left + 2}" cy="${cursorY + 3}" r="2" fill="${GRAY}"/>`
        );
        shapes.push(
          `<rect x="${left + 8}" y="${cursorY}" width="${Math.min(innerW * 0.78, innerW - 8)}" height="5" rx="2" fill="${GRAY}"/>`
        );
        cursorY += 9;
      }
      break;
    }
    case "hero-cta":
      shapes.push(
        `<rect x="${left}" y="${cursorY}" width="${innerW * 0.7}" height="8" rx="3" fill="${PINK}"/>`
      );
      cursorY += 12;
      if (cursorY + 5 <= maxY)
        shapes.push(line(cursorY, innerW * 0.9, GRAY));
      cursorY += 12;
      if (cursorY + 12 <= maxY)
        shapes.push(
          `<rect x="${left}" y="${cursorY}" width="${innerW * 0.4}" height="12" rx="6" fill="${PINK}"/>`
        );
      break;
    case "image":
      shapes.push(
        `<rect x="${left}" y="${cursorY}" width="${innerW}" height="${Math.min(cell.h - inner * 2, 36)}" rx="3" fill="${GRAY_LIGHT}" stroke="${BORDER}" stroke-width="1"/>`
      );
      shapes.push(
        `<line x1="${left}" y1="${cursorY}" x2="${left + innerW}" y2="${cursorY + Math.min(cell.h - inner * 2, 36)}" stroke="${BORDER}" stroke-width="1"/>`
      );
      shapes.push(
        `<line x1="${left + innerW}" y1="${cursorY}" x2="${left}" y2="${cursorY + Math.min(cell.h - inner * 2, 36)}" stroke="${BORDER}" stroke-width="1"/>`
      );
      break;
    case "spec-row": {
      const rows = Math.min(block.entries.length || 3, 4);
      for (let i = 0; i < rows; i++) {
        if (cursorY + 5 > maxY) break;
        shapes.push(line(cursorY, innerW * 0.3, GRAY));
        shapes.push(
          `<rect x="${left + innerW * 0.4}" y="${cursorY}" width="${innerW * 0.5}" height="5" rx="2" fill="${GRAY_LIGHT}"/>`
        );
        cursorY += 9;
      }
      break;
    }
    case "html":
      shapes.push(
        `<rect x="${left}" y="${cursorY}" width="${innerW * 0.9}" height="${Math.min(cell.h - inner * 2, 20)}" rx="3" fill="${GRAY_LIGHT}" stroke-dasharray="3,3" stroke="${BORDER}" stroke-width="1"/>`
      );
      break;
  }
  return shapes.join("");
}

function columnShapes(col: Column, cell: Cell): string {
  const blocks = col.blocks;
  if (blocks.length === 0) return "";
  const h = cell.h / blocks.length;
  return blocks
    .map((b, i) =>
      blockShapes(b, { x: cell.x, y: cell.y + h * i, w: cell.w, h })
    )
    .join("");
}

function rowShapes(row: Row, cell: Cell, gap = 4): string {
  const cols = row.columns.filter((c) => c.blocks.length > 0);
  if (cols.length === 0) return "";
  const totalGap = gap * (cols.length - 1);
  const colW = (cell.w - totalGap) / cols.length;
  return cols
    .map((col, i) =>
      columnShapes(col, {
        x: cell.x + (colW + gap) * i,
        y: cell.y,
        w: colW,
        h: cell.h,
      })
    )
    .join("");
}

function layoutShapes(layout: Layout): string {
  const rows = layout.filter((r) => r.columns.some((c) => c.blocks.length > 0));
  if (rows.length === 0) return "";
  const gap = 6;
  const totalGap = gap * (rows.length - 1);
  const rowH = (BODY_H - totalGap) / rows.length;
  return rows
    .map((row, i) =>
      rowShapes(row, {
        x: BODY_LEFT,
        y: BODY_TOP + (rowH + gap) * i,
        w: BODY_WIDTH,
        h: rowH,
      })
    )
    .join("");
}

function htmlFallbackShapes(html: string): string {
  // Very rough wireframe based on top-level tags. We don't parse the
  // HTML — just count headings/paragraphs/list items and draw a few
  // bars to give the merchant a sense of "there's content here".
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const lines = text.split(/(?<=[.!?])\s+/).slice(0, 6);
  const shapes: string[] = [];
  let y = BODY_TOP;
  shapes.push(
    `<rect x="${BODY_LEFT}" y="${y}" width="${BODY_WIDTH * 0.55}" height="8" rx="3" fill="${PINK}"/>`
  );
  y += 14;
  for (const line of lines) {
    if (y + 5 > BODY_TOP + BODY_H) break;
    const w = Math.min(BODY_WIDTH, BODY_WIDTH * (0.55 + Math.min(line.length, 60) / 120));
    shapes.push(
      `<rect x="${BODY_LEFT}" y="${y}" width="${w}" height="5" rx="2" fill="${GRAY}"/>`
    );
    y += 9;
  }
  return shapes.join("");
}

/**
 * Render an SVG wireframe of a snippet. `layout` takes priority if
 * present; otherwise we fall back to a rough sketch from `html`.
 */
export function snippetThumbSvg(
  name: string,
  layout: Layout | null,
  html: string
): string {
  const title = escapeXml(truncate(name || "Untitled snippet", 28));
  const body = layout && layout.length > 0
    ? layoutShapes(layout)
    : htmlFallbackShapes(html ?? "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}" stroke="${BORDER}" stroke-width="1" rx="8"/>
  <text x="${PAD}" y="${PAD + 14}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="13" font-weight="700" fill="#111827">${title}</text>
  <line x1="${PAD}" y1="${PAD + TITLE_H}" x2="${W - PAD}" y2="${PAD + TITLE_H}" stroke="${GRAY_LIGHT}" stroke-width="1"/>
  ${body}
</svg>`;
}
