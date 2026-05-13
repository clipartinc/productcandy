"use client";

import { Page, Card, BlockStack, Text } from "@shopify/polaris";

export default function DescriptionsPage() {
  return (
    <Page title="Description Layouts" backAction={{ content: "Home", url: "/" }}>
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Coming soon
          </Text>
          <Text as="p" tone="subdued">
            Pick a product, choose a template, and we&apos;ll save the
            rendered HTML back to its description.
          </Text>
        </BlockStack>
      </Card>
    </Page>
  );
}
