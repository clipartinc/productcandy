import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getShopify } from "@/lib/shopify";
import { authenticateExtensionRequest } from "@/lib/sessionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  productId: string;       // gid://shopify/Product/1234
  imageId: string;         // gid://shopify/MediaImage/5678
  operation:
    | { kind: "crop"; ratio: "1:1" | "4:5" | "16:9" }
    | { kind: "resize"; width: number };
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await authenticateExtensionRequest(req);
    const body = (await req.json()) as Body;

    if (!body.productId || !body.imageId || !body.operation) {
      return NextResponse.json(
        { error: "productId, imageId, and operation are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const shopify = getShopify();
    const client = new shopify.clients.Graphql({ session });

    // 1. Fetch source image URL
    const lookup = await client.request<{
      node: { image?: { url: string; altText: string | null } } | null;
    }>(
      `query SourceImage($id: ID!) {
        node(id: $id) {
          ... on MediaImage {
            image { url altText }
          }
        }
      }`,
      { variables: { id: body.imageId } }
    );

    const sourceUrl = lookup.data?.node?.image?.url;
    const altText = lookup.data?.node?.image?.altText ?? null;
    if (!sourceUrl) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // 2. Download and process
    const sourceBytes = Buffer.from(
      await (await fetch(sourceUrl)).arrayBuffer()
    );
    const processed = await runOperation(sourceBytes, body.operation);
    const outBytes = processed.buffer;
    const outMime = processed.mime;
    const outFilename = `productcandy-${body.operation.kind}-${Date.now()}.${
      outMime === "image/jpeg" ? "jpg" : "png"
    }`;

    // 3. Stage upload to Shopify-managed S3
    const staged = await client.request<{
      stagedUploadsCreate: {
        stagedTargets: {
          url: string;
          resourceUrl: string;
          parameters: { name: string; value: string }[];
        }[];
        userErrors: { message: string }[];
      };
    }>(
      `mutation StageUpload($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { message }
        }
      }`,
      {
        variables: {
          input: [
            {
              filename: outFilename,
              mimeType: outMime,
              httpMethod: "POST",
              resource: "IMAGE",
              fileSize: outBytes.length.toString(),
            },
          ],
        },
      }
    );

    const stageErrs = staged.data?.stagedUploadsCreate?.userErrors ?? [];
    const target = staged.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (stageErrs.length || !target) {
      return NextResponse.json(
        { error: stageErrs.map((e) => e.message).join(", ") || "Stage upload failed" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const form = new FormData();
    for (const p of target.parameters) form.append(p.name, p.value);
    form.append(
      "file",
      new Blob([new Uint8Array(outBytes)], { type: outMime }),
      outFilename
    );
    const uploadRes = await fetch(target.url, { method: "POST", body: form });
    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: `Upload to staged target failed: ${uploadRes.status}` },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    // 4. Attach as a new product image
    const create = await client.request<{
      productCreateMedia: {
        media: { id: string }[];
        mediaUserErrors: { message: string }[];
      };
    }>(
      `mutation AttachMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { ... on MediaImage { id } }
          mediaUserErrors { message }
        }
      }`,
      {
        variables: {
          productId: body.productId,
          media: [
            {
              originalSource: target.resourceUrl,
              mediaContentType: "IMAGE",
              alt: altText,
            },
          ],
        },
      }
    );

    const createErrs = create.data?.productCreateMedia?.mediaUserErrors ?? [];
    if (createErrs.length) {
      return NextResponse.json(
        { error: createErrs.map((e) => e.message).join(", ") },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: true, mediaId: create.data?.productCreateMedia?.media?.[0]?.id ?? null },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

async function runOperation(
  source: Buffer,
  op: Body["operation"]
): Promise<{ buffer: Buffer; mime: string }> {
  const img = sharp(source, { failOn: "none" });
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const mime = meta.format === "png" ? "image/png" : "image/jpeg";

  if (op.kind === "crop") {
    const [rw, rh] = op.ratio.split(":").map(Number);
    const targetRatio = rw / rh;
    const sourceRatio = w / h;
    let cropW: number, cropH: number;
    if (sourceRatio > targetRatio) {
      cropH = h;
      cropW = Math.round(h * targetRatio);
    } else {
      cropW = w;
      cropH = Math.round(w / targetRatio);
    }
    const left = Math.round((w - cropW) / 2);
    const top = Math.round((h - cropH) / 2);
    const buffer = await img
      .extract({ left, top, width: cropW, height: cropH })
      .toBuffer();
    return { buffer, mime };
  }

  // resize
  const buffer = await img
    .resize({ width: op.width, withoutEnlargement: true })
    .toBuffer();
  return { buffer, mime };
}
