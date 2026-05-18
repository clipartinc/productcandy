import { layoutToHtml, type Layout } from "./snippetBlocks";

/**
 * `DescriptionTemplate.layout` is the source of truth — when present,
 * we re-derive `html` from it on every read so storefront renders and
 * admin stamps always pick up the latest `layoutToHtml` output without
 * a manual edit/save round-trip on every snippet after a code change.
 *
 * The stored `html` column is the fallback for legacy snippets that
 * were saved before we started persisting layout JSON (commit
 * a84833e), and the canonical value for snippets the merchant saved
 * in raw-HTML mode (where layout will be null or empty).
 */
export function freshSnippetHtml(snippet: {
  html: string;
  layout: unknown;
}): string {
  if (
    snippet.layout &&
    Array.isArray(snippet.layout) &&
    snippet.layout.length > 0
  ) {
    return layoutToHtml(snippet.layout as Layout);
  }
  return snippet.html;
}
