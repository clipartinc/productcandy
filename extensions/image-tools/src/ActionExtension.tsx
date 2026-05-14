import {
  reactExtension,
  AdminAction,
  BlockStack,
  InlineStack,
  Image,
  Text,
  Button,
  Banner,
  Box,
  Select,
  useApi,
} from "@shopify/ui-extensions-react/admin";
import { useEffect, useState } from "react";

const TARGET = "admin.product-details.action.render";

// In production this is set at extension build time. For local extension dev
// against a tunnel, override via `shopify app dev` env or hardcode here.
const APP_BACKEND_URL =
  (typeof process !== "undefined" && process.env?.APP_BACKEND_URL) ||
  "https://productcandy.app";

type Operation =
  | { kind: "crop"; ratio: "1:1" | "4:5" | "16:9" }
  | { kind: "resize"; width: number };

type ProductImage = { id: string; url: string; altText: string | null };

export default reactExtension(TARGET, () => <App />);

function App() {
  const { close, data, query, sessionToken } = useApi(TARGET);
  const productId = (data as { selected?: { id: string }[] })?.selected?.[0]?.id;

  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageId, setImageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    query<{ product: { media: { nodes: ProductImageNode[] } } | null }>(
      `query ProductImages($id: ID!) {
        product(id: $id) {
          media(first: 30, query: "media_type:IMAGE") {
            nodes {
              ... on MediaImage {
                id
                image { url altText }
              }
            }
          }
        }
      }`,
      { variables: { id: productId } }
    )
      .then((res) => {
        const nodes = res.data?.product?.media?.nodes ?? [];
        const flat: ProductImage[] = nodes
          .filter((n): n is Required<ProductImageNode> => !!n.image)
          .map((n) => ({
            id: n.id,
            url: n.image.url,
            altText: n.image.altText,
          }));
        setImages(flat);
        setImageId(flat[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [productId, query]);

  async function run(op: Operation) {
    if (!imageId || !productId) return;
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const token = await sessionToken.get();
      const res = await fetch(`${APP_BACKEND_URL}/api/extensions/image-process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, imageId, operation: op }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setStatus({ kind: "error", message: json.error ?? `HTTP ${res.status}` });
      } else {
        setStatus({
          kind: "success",
          message:
            op.kind === "crop"
              ? `Cropped to ${op.ratio} and added to product.`
              : `Resized to ${op.width}px wide and added to product.`,
        });
      }
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  const selected = images.find((i) => i.id === imageId);

  return (
    <AdminAction
      title="Image Resize & Crop"
      primaryAction={<Button onPress={close}>Done</Button>}
    >
      <BlockStack gap="base">
        <Text>
          Pick an image and a preset. We&apos;ll process it and add the result
          as a new image on this product. Your original image is never modified.
        </Text>

        {loading && <Text>Loading product images...</Text>}

        {!loading && images.length === 0 && (
          <Banner tone="info" title="No images on this product">
            <Text>Add an image to the product first, then come back here.</Text>
          </Banner>
        )}

        {images.length > 0 && (
          <>
            <Select
              label="Image"
              value={imageId ?? ""}
              options={images.map((img, i) => ({
                label: img.altText || `Image ${i + 1}`,
                value: img.id,
              }))}
              onChange={(v) => setImageId(v)}
            />

            {selected && (
              <Box>
                <Image source={selected.url} alt={selected.altText ?? ""} />
              </Box>
            )}

            <Box>
              <Text fontWeight="bold">Crop (centered)</Text>
              <InlineStack gap="base">
                <Button
                  disabled={busy}
                  onPress={() => run({ kind: "crop", ratio: "1:1" })}
                >
                  1:1 (square)
                </Button>
                <Button
                  disabled={busy}
                  onPress={() => run({ kind: "crop", ratio: "4:5" })}
                >
                  4:5 (portrait)
                </Button>
                <Button
                  disabled={busy}
                  onPress={() => run({ kind: "crop", ratio: "16:9" })}
                >
                  16:9 (landscape)
                </Button>
              </InlineStack>
            </Box>

            <Box>
              <Text fontWeight="bold">Resize (max width)</Text>
              <InlineStack gap="base">
                <Button
                  disabled={busy}
                  onPress={() => run({ kind: "resize", width: 1024 })}
                >
                  1024px
                </Button>
                <Button
                  disabled={busy}
                  onPress={() => run({ kind: "resize", width: 2048 })}
                >
                  2048px
                </Button>
                <Button
                  disabled={busy}
                  onPress={() => run({ kind: "resize", width: 512 })}
                >
                  512px (thumb)
                </Button>
              </InlineStack>
            </Box>

            {busy && <Text>Processing...</Text>}
            {status.kind === "success" && (
              <Banner tone="success" title="Done">
                <Text>{status.message}</Text>
              </Banner>
            )}
            {status.kind === "error" && (
              <Banner tone="critical" title="Failed">
                <Text>{status.message}</Text>
              </Banner>
            )}
          </>
        )}
      </BlockStack>
    </AdminAction>
  );
}

type ProductImageNode = {
  id: string;
  image?: { url: string; altText: string | null };
};
