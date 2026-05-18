import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateExtensionRequest } from "@/lib/sessionToken";
import { checkEntitlement } from "@/lib/billing";
import { freshSnippetHtml } from "@/lib/freshSnippetHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function shopAndSessionFor(req: NextRequest) {
  const { shop: domain, session } = await authenticateExtensionRequest(req);
  const shop = await prisma.shop.upsert({
    where: { domain },
    update: {},
    create: { domain },
  });
  return { shop, session };
}

export async function GET(req: NextRequest) {
  try {
    const { shop, session } = await shopAndSessionFor(req);
    const [rawSnippets, entitlement] = await Promise.all([
      prisma.descriptionTemplate.findMany({
        where: { shopId: shop.id },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          html: true,
          layout: true,
          updatedAt: true,
        },
      }),
      checkEntitlement(shop, session),
    ]);
    // Regenerate HTML from the stored Layout JSON on every read so the
    // action extension's "Apply Snippet" button stamps the latest
    // layoutToHtml output even when the merchant hasn't manually
    // re-saved each snippet after a code change.
    const snippets = rawSnippets.map((s) => ({
      ...s,
      html: freshSnippetHtml(s),
    }));
    // Returning entitlement alongside snippets lets the action
    // extension render the subscribe banner without a second round-trip
    // and the dashboard reflect the live status on every refresh.
    return NextResponse.json(
      { snippets, entitlement },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { shop } = await shopAndSessionFor(req);
    const { name, html, layout } = (await req.json()) as {
      name?: string;
      html?: string;
      layout?: unknown;
    };
    if (!name?.trim() || !html?.trim()) {
      return NextResponse.json(
        { error: "name and html are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const snippet = await prisma.descriptionTemplate.create({
      data: {
        shopId: shop.id,
        name: name.trim(),
        html,
        layout: (layout ?? null) as never,
      },
      select: {
        id: true,
        name: true,
        html: true,
        layout: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ snippet }, { status: 201, headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
