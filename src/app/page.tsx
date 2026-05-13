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
} from "@shopify/polaris";
import Link from "next/link";

export default function Home() {
  return (
    <Page title="Product Candy" subtitle="Sweeter product pages, in two clicks.">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Description Layouts
              </Text>
              <Text as="p" tone="subdued">
                Pick a polished template, fill in the blanks, and write rich
                HTML straight into your product description.
              </Text>
              <InlineStack>
                <Link href="/descriptions">
                  <Button variant="primary">Open description tool</Button>
                </Link>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Image Resize & Crop
              </Text>
              <Text as="p" tone="subdued">
                Crop, resize, and re-upload product images without leaving the
                Shopify admin.
              </Text>
              <InlineStack>
                <Link href="/images">
                  <Button variant="primary">Open image tool</Button>
                </Link>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Box paddingBlockStart="400">
            <Text as="p" tone="subdued" alignment="center">
              Need help? Email support@productcandy.app
            </Text>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
