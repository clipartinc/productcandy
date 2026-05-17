import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateExtensionRequest } from "@/lib/sessionToken";
import { checkEntitlement, PLAN_NAME, PRICE_USD, isBillingTest } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const { shop, session } = await authenticateExtensionRequest(req);
    const row = await prisma.shop.upsert({
      where: { domain: shop },
      update: {},
      create: { domain: shop },
    });
    const ent = await checkEntitlement(row, session);
    return NextResponse.json(
      {
        entitled: ent.entitled,
        reason: ent.reason,
        isDevStore: ent.isDevStore,
        subscriptionStatus: ent.subscriptionStatus,
        plan: { name: PLAN_NAME, priceUsd: PRICE_USD, test: isBillingTest() },
      },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
