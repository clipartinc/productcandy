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
  Grid,
} from "@shopify/polaris";
import Link from "next/link";
import Image from "next/image";

const LAYOUT_THUMBS = [
  { id: "spec-sheet", label: "Spec sheet" },
  { id: "story-features", label: "Story + features" },
  { id: "faq", label: "FAQ block" },
  { id: "two-column", label: "Two columns" },
  { id: "three-column", label: "Three columns" },
  { id: "hero-cta", label: "Banner with button" },
  { id: "image-text", label: "Image + text" },
  { id: "text-image", label: "Text + image" },
  { id: "gallery-3", label: "Image gallery (3)" },
  { id: "label-value", label: "Label and value" },
  { id: "bullet-list", label: "Bullet list" },
];

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
                  My snippets
                </Text>
                <Badge tone="info">New</Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                Save reusable HTML blocks — warranty info, return policy, size
                charts, brand story — and stamp them into any product
                description from the Pre-Made Description Layout Examples
                modal. <strong>Your first saved snippet is free</strong>;
                additional snippets need the $4.99/month Custom Snippets
                add-on to apply or render on the storefront.
              </Text>
              <InlineStack>
                <Link href="/app/snippets">
                  <Button variant="primary">Manage snippets</Button>
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
                  Pre-Made Description Layout Examples
                </Text>
                <Badge tone="info">Tool</Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                Drop a polished layout into any product description in one
                click. Pick from these built-in layouts or save your own
                snippets.
              </Text>

              <Grid columns={{ xs: 3, sm: 3, md: 3, lg: 3, xl: 3 }} gap={{ xs: "200" }}>
                {LAYOUT_THUMBS.map((t) => (
                  <Grid.Cell key={t.id}>
                    <BlockStack gap="100" inlineAlign="center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/templates/${t.id}.svg`}
                        alt={t.label}
                        style={{
                          width: "100%",
                          height: "auto",
                          maxWidth: 200,
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                        }}
                      />
                      <Text as="p" tone="subdued" alignment="center">
                        {t.label}
                      </Text>
                    </BlockStack>
                  </Grid.Cell>
                ))}
              </Grid>

              <Divider />

              <Text as="h3" variant="headingSm">
                How to use it from a product page
              </Text>
              <List type="number">
                <List.Item>
                  Open any product in <strong>Products</strong>.
                </List.Item>
                <List.Item>
                  At the top right of the product page, click{" "}
                  <strong>More actions</strong>.
                </List.Item>
                <List.Item>
                  Pick <strong>Description Layouts</strong> from the dropdown
                  (see screenshot below).
                </List.Item>
                <List.Item>
                  Choose colors and a layout, then click{" "}
                  <strong>Apply Layout</strong>. The placeholder boxes drop into
                  the description editor — overtype each one with your content.
                </List.Item>
              </List>

              <Box paddingBlockStart="200" paddingBlockEnd="200">
                <Image
                  src="/dropdown.png"
                  alt="More actions menu showing Description Layouts"
                  width={445}
                  height={293}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                />
              </Box>

              <Banner tone="info">
                Want your own reusable HTML blocks (warranty, brand story,
                size chart)? Save them in <strong>My snippets</strong> at the
                top of this page and they&apos;ll appear in the same modal
                alongside the built-in layouts.
              </Banner>
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
                How to use it from a product page
              </Text>
              <List type="number">
                <List.Item>
                  Open any product in <strong>Products</strong>.
                </List.Item>
                <List.Item>
                  At the top right of the product page, click{" "}
                  <strong>More actions</strong>.
                </List.Item>
                <List.Item>
                  Pick <strong>Image Resize &amp; Crop</strong> from the
                  dropdown.
                </List.Item>
                <List.Item>
                  Choose an image, then a preset aspect ratio (1:1, 4:5,
                  16:9) or output width. The cropped image is uploaded back
                  to the product as a new asset — your original is never
                  modified.
                </List.Item>
              </List>

              <Banner tone="warning">
                Crops are saved as new images. To replace the original,
                delete it from the product&apos;s media library after the
                crop is uploaded.
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Want snippets to fill the full page width?
                </Text>
                <Badge tone="attention">Optional</Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                When you stamp a snippet into a product description, your
                theme constrains it to its standard reading width. If you
                want a snippet to render edge-to-edge — useful for spec
                tables, comparison rows, or multi-column layouts — add the
                <strong> Product Candy Snippet </strong> block to your theme
                instead. It renders in its own container, outside the
                theme&apos;s width constraints.
              </Text>
              <List type="number">
                <List.Item>
                  In Shopify admin, open <strong>Online Store → Themes
                  → Customize</strong>.
                </List.Item>
                <List.Item>
                  Navigate to the page (e.g. Products) where you want the
                  snippet to appear.
                </List.Item>
                <List.Item>
                  Click <strong>Add section</strong> or{" "}
                  <strong>Add block</strong> →
                  <strong> Apps → Product Candy snippet</strong>.
                </List.Item>
                <List.Item>
                  In the block settings, paste the <strong>Snippet ID</strong>{" "}
                  (find it next to each snippet&apos;s name on the{" "}
                  <Link href="/app/snippets">My snippets</Link> page).
                </List.Item>
                <List.Item>
                  Save the theme. The snippet now renders on the storefront
                  full-width.
                </List.Item>
              </List>
              <Banner tone="info">
                Editing a snippet in this app updates everywhere it&apos;s
                placed — no theme re-publish needed.
              </Banner>
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
                  You can select to override the current description or append
                  it, which will add it to your current description and not
                  remove anything.
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Can I undo a change?
                </Text>
                <Text as="p" tone="subdued">
                  Yes, you can easily delete the layout from your product
                  description using the backspace on your keyboard.
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
