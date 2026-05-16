import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    await prisma.contactMessage.create({
      data: {
        shopDomain: shop,
        name,
        email,
        subject: subject || "(no subject)",
        message,
      },
    });

    // Surface in server logs so the operator sees fresh submissions even
    // without an email integration wired up.
    console.log(
      `[contact] ${shop} — ${name} <${email}> — ${subject || "(no subject)"}`
    );

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
