import { NextRequest, NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/sessionToken";

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

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_COMM_HUB_URL = "https://vectorize.com/comm-hub";
const SOURCE_APP = "product-candy";

// Map the form's category dropdown to a Comm Hub category slug. Anything
// we don't recognise falls through as "feedback".
function categoryFor(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("bug")) return "bug";
  if (s.includes("feature")) return "feature";
  if (s.includes("billing")) return "billing";
  return "feedback";
}

export async function POST(req: NextRequest) {
  try {
    const { shop } = await authenticateExtensionRequest(req);

    const body = (await req.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const subject = (body.subject ?? "").trim();
    const message = (body.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "name, email and message are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "email is not valid" },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (
      name.length > MAX_NAME ||
      email.length > MAX_EMAIL ||
      subject.length > MAX_SUBJECT ||
      message.length > MAX_MESSAGE
    ) {
      return NextResponse.json(
        { error: "one of the fields is too long" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const url = process.env.COMM_HUB_URL ?? DEFAULT_COMM_HUB_URL;
    const secret = process.env.COMM_HUB_INGEST_SECRET;

    const upstreamHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (secret) upstreamHeaders.Authorization = `Bearer ${secret}`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({
        category: categoryFor(subject),
        sourceApp: SOURCE_APP,
        subject: subject || "(no subject)",
        body: message,
        contactEmail: email,
        contactName: name,
        metadata: { shopDomain: shop },
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error(
        `[contact] Comm Hub responded ${upstream.status} — ${text}`,
        { shop, email, url }
      );
      const msg =
        upstream.status === 401
          ? "Contact endpoint rejected our credentials."
          : upstream.status === 503
          ? "Contact endpoint is temporarily unavailable."
          : `Couldn't deliver your message (${upstream.status}). Please try again.`;
      return NextResponse.json(
        { error: msg },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
