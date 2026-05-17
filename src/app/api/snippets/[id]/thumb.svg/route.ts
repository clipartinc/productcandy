import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { snippetThumbSvg } from "@/lib/snippetThumb";
import type { Layout } from "@/lib/snippetBlocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Public thumbnail endpoint — no auth. Snippet IDs are CUIDs so they
// aren't guessable, and the SVG only reveals layout shape + snippet
// name, not content. The action-extension <Image> component loads URLs
// directly without forwarding bearer tokens, so we can't gate this the
// way the JSON snippets endpoints are gated.
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id) return new NextResponse("Not found", { status: 404 });

  const snippet = await prisma.descriptionTemplate.findUnique({
    where: { id },
    select: { name: true, html: true, layout: true },
  });

  // Always 200 so a deleted/unknown id renders a generic empty card
  // instead of a broken-image icon in the extension grid.
  const name = snippet?.name ?? "Snippet";
  const html = snippet?.html ?? "";
  const layout = (snippet?.layout as Layout | null) ?? null;
  const svg = snippetThumbSvg(name, layout, html);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
