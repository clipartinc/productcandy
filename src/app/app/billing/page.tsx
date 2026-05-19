"use client";

import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
  InlineStack,
  List,
  Badge,
} from "@shopify/polaris";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { appBridgeFetch } from "@/lib/appBridgeFetch";

type Status = {
  entitled: boolean;
  reason: string;
  isDevStore: boolean;
  subscriptionStatus: string | null;
  plan: { name: string; priceUsd: number; test: boolean };
};

// Next.js App Router requires components that call useSearchParams() to
// be wrapped in <Suspense> so the prerender pass can bail out of static
// generation for the page without erroring. Outer default export is the
// boundary; the inner client component does the actual work.
export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const params = useSearchParams();
  const justSubscribed = params.get("subscribed") === "1";

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await appBridgeFetch("/api/billing/status");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setStatus(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await appBridgeFetch("/api/billing/subscribe", {
        method: "POST",
      });
      // Surface the server's error body (includes the underlying
      // Shopify Admin GraphQL message) instead of just the HTTP code.
      const body = (await res.json().catch(() => ({}))) as {
        confirmationUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? `Subscribe failed (${res.status})`);
      }
      if (!body.confirmationUrl) {
        throw new Error("No confirmation URL returned");
      }
      // Top-frame redirect to Shopify's hosted approval page.
      // `window.top.location.assign(...)` is blocked by the browser
      // when the top frame (admin.shopify.com) is cross-origin from
      // the embedded app (productcandy.app) — accessing the Location
      // property throws a SecurityError. `window.open(url, '_top')`
      // is the standard escape: it triggers a top-frame navigation
      // without crossing the origin boundary as a property read.
      window.open(body.confirmationUrl, "_top");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSubmitting(false);
    }
  }, []);

  return (
    <Page
      title="Custom Layouts billing"
      subtitle="Unlock applying and rendering custom layouts — $4.99 per month."
    >
      <Layout>
        {justSubscribed && (
          <Layout.Section>
            <Banner tone="success" title="You're subscribed">
              <p>
                Thanks! Custom Layouts are now unlocked for your store.
                Head to a product page and use the Apply Layout button
                from the Pre-Made Description Layout Examples action.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {error && (
          <Layout.Section>
            <Banner tone="critical" title="Couldn't complete request">
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Status
                </Text>
                {loading ? (
                  <Badge tone="info">Checking…</Badge>
                ) : status?.isDevStore ? (
                  <Badge tone="success">Dev store — free</Badge>
                ) : status?.entitled ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge tone="warning">Not subscribed</Badge>
                )}
              </InlineStack>

              {status?.isDevStore && (
                <Text as="p" tone="subdued">
                  Development stores get Custom Layouts free of charge so
                  partner builds and demos work end-to-end without billing
                  setup. Production merchants pay the standard $4.99/month.
                </Text>
              )}

              {!status?.isDevStore && status?.entitled && (
                <Text as="p" tone="subdued">
                  Your $4.99/month Custom Layouts subscription is active.
                  Manage or cancel any time from{" "}
                  <strong>Settings → Apps and sales channels →
                  Product Candy → Billing</strong> in Shopify admin.
                </Text>
              )}

              {!status?.isDevStore && !status?.entitled && (
                <>
                  <List type="bullet">
                    <List.Item>
                      <strong>Free plan:</strong> Pre-Made layouts and 1
                      custom layout.
                    </List.Item>
                    <List.Item>
                      <strong>Paid plan ($4.99/month):</strong> Pre-Made
                      layouts and unlimited custom layouts.
                    </List.Item>
                  </List>
                  <InlineStack>
                    <Button
                      variant="primary"
                      onClick={subscribe}
                      loading={submitting}
                    >
                      Subscribe — $4.99/month
                    </Button>
                  </InlineStack>
                  {status?.plan.test && (
                    <Banner tone="info">
                      <p>
                        Billing is currently in <strong>test mode</strong>{" "}
                        — Shopify will show a confirmation page but
                        won&apos;t actually charge. Set{" "}
                        <code>SHOPIFY_BILLING_TEST=false</code> in
                        production env vars to enable real charges.
                      </p>
                    </Banner>
                  )}
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
