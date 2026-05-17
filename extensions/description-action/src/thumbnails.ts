/**
 * SVG thumbnails are served from public/templates/<id>.svg on the
 * Next.js app (productcandy.app). The admin extension iframe blocks
 * data URIs, so we have to load over the network.
 *
 * If productcandy.app is slow / down, the Image components show
 * broken-image icons. Falling back to URL-based is the only path
 * Shopify's sandbox supports for the Image component.
 */

const TEMPLATE_BASE_URL = "https://productcandy.app/templates";
const SNIPPET_THUMB_BASE_URL = "https://productcandy.app/api/snippets";

export function thumbDataUri(id: string): string {
  return `${TEMPLATE_BASE_URL}/${id}.svg`;
}

// Per-snippet wireframe SVG rendered server-side from the saved Layout
// (see src/lib/snippetThumb.ts). Public endpoint, cuid-keyed.
export function snippetThumbUri(id: string): string {
  return `${SNIPPET_THUMB_BASE_URL}/${encodeURIComponent(id)}/thumb.svg`;
}
