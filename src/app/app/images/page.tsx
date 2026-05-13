"use client";

import { Page, Card, BlockStack, Text } from "@shopify/polaris";

export default function ImagesPage() {
  return (
    <Page title="Image Resize & Crop" backAction={{ content: "Home", url: "/app" }}>
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Coming soon
          </Text>
          <Text as="p" tone="subdued">
            Pick a product image, crop or resize it, and we&apos;ll re-upload
            it to the product.
          </Text>
        </BlockStack>
      </Card>
    </Page>
  );
}
