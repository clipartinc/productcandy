"use client";

import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Box,
  List,
  Banner,
  Divider,
  Badge,
} from "@shopify/polaris";
import Link from "next/link";

export default function EmbeddedHome() {
  return (
    <Page
      title="Welcome to Product Candy"
      subtitle="Two tools that make your product pages look sharper, without leaving the admin."
    >
      <Layout>
        <Layout.Section>
          <Banner
            title="You're all set up"
            tone="success"
          >
            <p>
              Product Candy is installed on your store. Use the guides below
              to get started — you can come back to this page any time from
              the apps menu.
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Description Layouts
                </Text>
                <Badge tone="info">Tool</Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                Build polished product descriptions from templates and write
                rich HTML straight back to the product. No theme edits, no
                copy-paste from a Google Doc.
              </Text>

              <Text as="h3" variant="headingSm">
                How to use it
              </Text>
              <List type="number">
                <List.Item>
                  Open <strong>Description Layouts</strong> from the button
                  below.
                </List.Item>
                <List.Item>
                  Pick a product to edit, then choose a template
                  (e.g. <em>Spec sheet</em>, <em>Story + features</em>,{" "}
                  <em>FAQ block</em>).
                </List.Item>
                <List.Item>
                  Fill in the fields. Live preview shows exactly what
                  shoppers will see.
                </List.Item>
                <List.Item>
                  Hit <strong>Save to product</strong>. The rendered HTML is
                  written to the product&apos;s description in Shopify.
                </List.Item>
              </List>

              <Box>
                <Banner tone="info">
                  Templates are saved per shop. Build a layout once and reuse
                  it across your whole catalog.
                </Banner>
              </Box>

              <InlineStack>
                <Link href="/app/descriptions">
                  <Button variant="primary">Open Description Layouts</Button>
                </Link>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Image Resize & Crop
                </Text>
                <Badge tone="info">Tool</Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                Crop and resize product images directly from the admin. We
                re-upload the result so your store always looks pixel-perfect
                — no Photoshop trip required.
              </Text>

              <Text as="h3" variant="headingSm">
                How to use it
              </Text>
              <List type="number">
                <List.Item>
                  Open <strong>Image Resize &amp; Crop</strong> from the
                  button below.
                </List.Item>
                <List.Item>
                  Pick a product, then a specific image from its media
                  library.
                </List.Item>
                <List.Item>
                  Drag the crop handles or pick a preset aspect ratio
                  (1:1, 4:5, 16:9). Set output width if you want to resize.
                </List.Item>
                <List.Item>
                  Click <strong>Apply</strong>. The new image is uploaded to
                  the product as an additional asset — your original is
                  untouched.
                </List.Item>
              </List>

              <Box>
                <Banner tone="warning">
                  Crops are saved as new images, never destructive. If you
                  want to replace the original, delete it from the product
                  after the crop is uploaded.
                </Banner>
              </Box>

              <InlineStack>
                <Link href="/app/images">
                  <Button variant="primary">Open Image Resize &amp; Crop</Button>
                </Link>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Tips &amp; FAQ
              </Text>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Will this overwrite my existing product descriptions?
                </Text>
                <Text as="p" tone="subdued">
                  Only when you click <strong>Save to product</strong> in the
                  Description Layouts tool. We never modify products in the
                  background.
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Can I undo a change?
                </Text>
                <Text as="p" tone="subdued">
                  Shopify keeps version history on products. If you need to
                  revert, open the product in the admin and use Shopify&apos;s
                  built-in version history.
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  What permissions does Product Candy use?
                </Text>
                <Text as="p" tone="subdued">
                  Read &amp; write access to products and files. We never
                  read customer or order data.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Box paddingBlockStart="400">
            <Text as="p" tone="subdued" alignment="center">
              Need a hand? Email{" "}
              <a href="mailto:support@productcandy.app">
                support@productcandy.app
              </a>
            </Text>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
