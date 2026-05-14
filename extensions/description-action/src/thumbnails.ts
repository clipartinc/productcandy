/**
 * SVG thumbnails are served from public/templates/<id>.svg on the
 * Next.js app (productcandy.app). The admin extension iframe blocks
 * data URIs, so we have to load over the network.
 *
 * If productcandy.app is slow / down, the Image components show
 * broken-image icons. Falling back to URL-based is the only path
 * Shopify's sandbox supports for the Image component.
 */

const THUMB_BASE_URL = "https://productcandy.app/templates";

export function thumbDataUri(id: string): string {
  return `${THUMB_BASE_URL}/${id}.svg`;
}
