import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateExtensionRequest } from "@/lib/sessionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
};

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function ensureOwned(req: NextRequest, id: string) {
  const { shop: domain } = await authenticateExtensionRequest(req);
  const shop = await prisma.shop.upsert({
    where: { domain },
    update: {},
    create: { domain },
  });
  const snippet = await prisma.descriptionTemplate.findUnique({ where: { id } });
  if (!snippet || snippet.shopId !== shop.id) return null;
  return snippet;
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const owned = await ensureOwned(req, id);
    if (!owned) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }
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
    const snippet = await prisma.descriptionTemplate.update({
      where: { id },
      data: {
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
    return NextResponse.json({ snippet }, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const owned = await ensureOwned(req, id);
    if (!owned) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    await prisma.descriptionTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
