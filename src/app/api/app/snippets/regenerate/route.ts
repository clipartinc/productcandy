import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateExtensionRequest } from "@/lib/sessionToken";
import { freshSnippetHtml } from "@/lib/freshSnippetHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// One-shot regenerator: for every snippet in this shop that has a
// stored Layout JSON, re-run layoutToHtml(layout) and overwrite the
// html column. Useful after a code change to layoutToHtml — the read
// paths (GET /api/app/snippets, app-proxy storefront route) already
// derive fresh HTML on the fly, but the stored html column is what
// gets stamped into product.descriptionHtml by the action extension,
// so refreshing it means future Apply Snippet clicks always carry
// the latest layout output.
//
// Returns counts for the UI to show. Idempotent — running again is a
// no-op if nothing changed.
export async function POST(req: NextRequest) {
  try {
    const { shop: domain } = await authenticateExtensionRequest(req);
    const shop = await prisma.shop.upsert({
      where: { domain },
      update: {},
      create: { domain },
    });

    const snippets = await prisma.descriptionTemplate.findMany({
      where: { shopId: shop.id },
      select: { id: true, html: true, layout: true },
    });

    let regenerated = 0;
    let skipped = 0;
    for (const s of snippets) {
      const fresh = freshSnippetHtml(s);
      // Skip writes when nothing changes — saves Postgres round-trips
      // when the merchant clicks the button after only some snippets
      // were affected by the last code change.
      if (fresh === s.html) {
        skipped++;
        continue;
      }
      await prisma.descriptionTemplate.update({
        where: { id: s.id },
        data: { html: fresh },
      });
      regenerated++;
    }

    return NextResponse.json(
      { ok: true, total: snippets.length, regenerated, skipped },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
