import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateExtensionRequest } from "@/lib/sessionToken";

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

async function shopFor(req: NextRequest) {
  const { shop: domain } = await authenticateExtensionRequest(req);
  return prisma.shop.upsert({
    where: { domain },
    update: {},
    create: { domain },
  });
}

export async function GET(req: NextRequest) {
  try {
    const shop = await shopFor(req);
    const snippets = await prisma.descriptionTemplate.findMany({
      where: { shopId: shop.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        html: true,
        layout: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ snippets }, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const shop = await shopFor(req);
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
