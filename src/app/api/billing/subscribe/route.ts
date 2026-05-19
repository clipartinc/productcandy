import { NextRequest, NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/sessionToken";
import { createSubscription } from "@/lib/billing";

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

// POST starts a Custom Layouts subscription. Returns the Shopify-
// hosted confirmation URL; the embedded app opens it in the top frame
// so the merchant sees Shopify's own approval page, not ours.
export async function POST(req: NextRequest) {
  try {
    const { shop, session } = await authenticateExtensionRequest(req);
    const host = process.env.HOST?.replace(/\/$/, "") ?? "";
    if (!host) {
      return NextResponse.json(
        { error: "Server is missing HOST env var" },
        { status: 500, headers: CORS_HEADERS }
      );
    }
    const returnUrl = `${host}/api/billing/callback?shop=${encodeURIComponent(shop)}`;
    const { confirmationUrl } = await createSubscription(session, returnUrl);
    return NextResponse.json({ confirmationUrl }, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
