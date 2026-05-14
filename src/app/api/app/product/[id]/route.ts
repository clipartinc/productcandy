import { NextRequest, NextResponse } from "next/server";
import { getShopify } from "@/lib/shopify";
import { authenticateExtensionRequest } from "@/lib/sessionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { session } = await authenticateExtensionRequest(req);
    const { id } = await ctx.params;
    const productId = decodeURIComponent(id);

    const shopify = getShopify();
    const client = new shopify.clients.Graphql({ session });

    const res = await client.request<{
      product: {
        id: string;
        title: string;
        descriptionHtml: string;
        media: {
          nodes: { id: string; image?: { url: string; altText: string | null } }[];
        };
      } | null;
    }>(
      `query Product($id: ID!) {
        product(id: $id) {
          id
          title
          descriptionHtml
          media(first: 30, query: "media_type:IMAGE") {
            nodes {
              ... on MediaImage { id image { url altText } }
            }
          }
        }
      }`,
      { variables: { id: productId } }
    );

    const product = res.data?.product;
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const images = (product.media?.nodes ?? [])
      .filter((n): n is { id: string; image: { url: string; altText: string | null } } =>
        !!n.image
      )
      .map((n) => ({ id: n.id, url: n.image.url, altText: n.image.altText }));

    return NextResponse.json({
      id: product.id,
      title: product.title,
      descriptionHtml: product.descriptionHtml,
      images,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { session } = await authenticateExtensionRequest(req);
    const { id } = await ctx.params;
    const productId = decodeURIComponent(id);
    const { descriptionHtml } = (await req.json()) as { descriptionHtml: string };

    const shopify = getShopify();
    const client = new shopify.clients.Graphql({ session });

    const res = await client.request<{
      productUpdate: { userErrors: { message: string }[] };
    }>(
      `mutation UpdateDescription($input: ProductInput!) {
        productUpdate(input: $input) {
          userErrors { message }
        }
      }`,
      { variables: { input: { id: productId, descriptionHtml } } }
    );

    const errs = res.data?.productUpdate?.userErrors ?? [];
    if (errs.length > 0) {
      return NextResponse.json(
        { error: errs.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
