import {
  reactExtension,
  AdminBlock,
  BlockStack,
  InlineStack,
  Text,
  Image,
  Link,
  useApi,
  Banner,
} from "@shopify/ui-extensions-react/admin";

const TARGET = "admin.product-details.block.render";

const THUMB_BASE_URL = "https://productcandy.app/templates";

const TEMPLATES = [
  { id: "spec-sheet", label: "Spec sheet" },
  { id: "story-features", label: "Story + features" },
  { id: "faq", label: "FAQ block" },
  { id: "two-column", label: "Two columns" },
  { id: "three-column", label: "Three columns" },
  { id: "hero-cta", label: "Hero + CTA" },
  { id: "image-text", label: "Image + text" },
  { id: "text-image", label: "Text + image" },
  { id: "gallery-3", label: "Image gallery (3)" },
] as const;

export default reactExtension(TARGET, () => <App />);

function App() {
  const { data } = useApi(TARGET);
  const productId = (data as { selected?: { id: string }[] })?.selected?.[0]?.id;

  if (!productId) {
    return (
      <AdminBlock title="Product Candy — Description Layouts">
        <Banner tone="info" title="Save the product first">
          <Text>
            This block opens an editor for the current product. Save the
            product so it has an id, then come back here.
          </Text>
        </Banner>
      </AdminBlock>
    );
  }

  return (
    <AdminBlock title="Product Candy — Description Layouts">
      <BlockStack gap="base">
        <Text>
          Pick a layout to open the editor. Or use the freeform editor for full
          rich-text control.
        </Text>

        <BlockStack gap="base">
          {chunk(TEMPLATES, 3).map((row, i) => (
            <InlineStack key={i} gap="base">
              {row.map((t) => (
                <Link
                  key={t.id}
                  to={`shopify://admin/apps/product-candy/app/descriptions?id=${encodeURIComponent(productId)}&t=${t.id}`}
                >
                  <BlockStack gap="small" inlineAlignment="center">
                    <Image source={`${THUMB_BASE_URL}/${t.id}.svg`} alt={t.label} />
                    <Text>{t.label}</Text>
                  </BlockStack>
                </Link>
              ))}
            </InlineStack>
          ))}
        </BlockStack>

        <Link
          to={`shopify://admin/apps/product-candy/app/descriptions?id=${encodeURIComponent(productId)}`}
        >
          Or open the freeform editor →
        </Link>
      </BlockStack>
    </AdminBlock>
  );
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
