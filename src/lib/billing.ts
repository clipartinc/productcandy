/**
 * Custom Snippets billing — $4.99/mo recurring Shopify app subscription.
 *
 * Gates two surfaces:
 *  1. The /api/proxy/snippets/[id] endpoint that the theme app block
 *     hits to render saved snippets on storefronts — returns empty if
 *     the merchant isn't entitled, so storefronts of free/lapsed shops
 *     stop showing custom snippet content.
 *  2. The Apply Snippet button inside the Pre-Made Description Layout
 *     Examples action extension — UI-side gate that hides the apply
 *     control and shows a subscribe banner instead.
 *
 * Editing custom snippets in /app/snippets stays open for everyone;
 * merchants can build and save layouts at any plan, they just can't
 * apply them until they subscribe.
 *
 * Dev stores (Shopify's plan.partnerDevelopment === true) bypass the
 * paywall entirely so partner builds and demos keep working.
 */

import { prisma } from "./prisma";
import type { Session } from "@shopify/shopify-api";

export const PLAN_NAME = "Custom Snippets";
export const PRICE_USD = 4.99;
export const PRICE_INTERVAL = "EVERY_30_DAYS" as const;

// Toggle real charges with SHOPIFY_BILLING_TEST=false in production.
// Default true so accidental clicks during development never charge a
// real merchant — Shopify's test mode shows the same confirmation page
// but never bills.
export function isBillingTest(): boolean {
  return process.env.SHOPIFY_BILLING_TEST !== "false";
}

// Cache window for the Admin GraphQL entitlement check. Each request
// would otherwise round-trip Shopify; 5 min is short enough that a
// merchant who just subscribed sees the unlock quickly, and long enough
// that a busy storefront doesn't hammer the Admin API on every render.
const STATUS_TTL_MS = 5 * 60 * 1000;

type ShopRow = {
  id: string;
  domain: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionCheckedAt: Date | null;
  isDevStore: boolean | null;
};

export type Entitlement = {
  entitled: boolean;
  reason: "dev_store" | "active_subscription" | "no_subscription" | "lapsed";
  isDevStore: boolean;
  subscriptionStatus: string | null;
};

function isStale(row: ShopRow): boolean {
  if (!row.subscriptionCheckedAt) return true;
  return Date.now() - row.subscriptionCheckedAt.getTime() > STATUS_TTL_MS;
}

async function adminFetch<T>(
  session: Session,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const url = `https://${session.shop}/admin/api/2026-04/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": session.accessToken ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Admin GraphQL HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new Error(`Admin GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

type PlanInfo = { plan: { partnerDevelopment: boolean } };
type ActiveSubsInfo = {
  appInstallation: {
    activeSubscriptions: {
      id: string;
      name: string;
      status: string;
    }[];
  };
};

/**
 * Hit Shopify Admin GraphQL for the live status, write it back to the
 * Shop row, return the fresh entitlement. Call this when the cached
 * value is stale or when we know it changed (post-subscribe callback,
 * webhook).
 */
export async function refreshEntitlement(
  shopRow: ShopRow,
  session: Session
): Promise<Entitlement> {
  // Two queries in parallel — dev-store flag rarely changes but we
  // refresh it alongside the subscription so a single shop row carries
  // up-to-date answers for both questions.
  const [planRes, subsRes] = await Promise.all([
    adminFetch<PlanInfo>(
      session,
      `query { shop { plan { partnerDevelopment } } }`
    ),
    adminFetch<ActiveSubsInfo>(
      session,
      `query { currentAppInstallation { activeSubscriptions { id name status } } }`,
    ).catch(() => ({
      appInstallation: { activeSubscriptions: [] },
    })) as unknown as ActiveSubsInfo & {
      currentAppInstallation?: ActiveSubsInfo["appInstallation"];
    },
  ]);

  // The Admin query field is `currentAppInstallation`; alias above
  // doesn't always survive type narrowing, so look it up defensively.
  const subs =
    ((subsRes as unknown) as {
      currentAppInstallation?: ActiveSubsInfo["appInstallation"];
    }).currentAppInstallation?.activeSubscriptions ?? [];

  const ours = subs.find((s) => s.name === PLAN_NAME);
  const isDev = planRes.plan.partnerDevelopment;

  await prisma.shop.update({
    where: { id: shopRow.id },
    data: {
      isDevStore: isDev,
      subscriptionId: ours?.id ?? null,
      subscriptionStatus: ours?.status ?? null,
      subscriptionCheckedAt: new Date(),
    },
  });

  return buildEntitlement({
    ...shopRow,
    isDevStore: isDev,
    subscriptionId: ours?.id ?? null,
    subscriptionStatus: ours?.status ?? null,
  });
}

function buildEntitlement(row: ShopRow): Entitlement {
  if (row.isDevStore) {
    return {
      entitled: true,
      reason: "dev_store",
      isDevStore: true,
      subscriptionStatus: row.subscriptionStatus,
    };
  }
  if (row.subscriptionStatus === "ACTIVE") {
    return {
      entitled: true,
      reason: "active_subscription",
      isDevStore: false,
      subscriptionStatus: row.subscriptionStatus,
    };
  }
  return {
    entitled: false,
    reason: row.subscriptionStatus ? "lapsed" : "no_subscription",
    isDevStore: false,
    subscriptionStatus: row.subscriptionStatus,
  };
}

/**
 * Cached entitlement check. Uses the Shop row's cached values when
 * fresh; refreshes from Admin GraphQL when stale and a session is
 * available. Falls back to cached values without a session (e.g. the
 * unauthenticated app-proxy route).
 */
export async function checkEntitlement(
  shopRow: ShopRow,
  session?: Session
): Promise<Entitlement> {
  if (session && isStale(shopRow)) {
    try {
      return await refreshEntitlement(shopRow, session);
    } catch {
      // Network / auth failure — fall through to cached value rather
      // than failing closed and locking the merchant out.
    }
  }
  return buildEntitlement(shopRow);
}

type SubscriptionCreateResult = {
  appSubscriptionCreate: {
    confirmationUrl: string;
    userErrors: { message: string; field: string[] | null }[];
    appSubscription: { id: string; status: string } | null;
  };
};

/**
 * Kick off a subscription. Returns the Shopify-hosted confirmation
 * URL the merchant gets redirected to; on accept Shopify sends them
 * to `returnUrl` with ?charge_id=<id> and we mark the row ACTIVE in
 * the callback handler.
 */
export async function createSubscription(
  session: Session,
  returnUrl: string
): Promise<{ confirmationUrl: string }> {
  const data = await adminFetch<SubscriptionCreateResult>(
    session,
    `mutation Subscribe(
      $name: String!,
      $returnUrl: URL!,
      $test: Boolean,
      $lineItems: [AppSubscriptionLineItemInput!]!
    ) {
      appSubscriptionCreate(
        name: $name,
        returnUrl: $returnUrl,
        test: $test,
        lineItems: $lineItems
      ) {
        confirmationUrl
        userErrors { message field }
        appSubscription { id status }
      }
    }`,
    {
      name: PLAN_NAME,
      returnUrl,
      test: isBillingTest(),
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: PRICE_USD, currencyCode: "USD" },
              interval: PRICE_INTERVAL,
            },
          },
        },
      ],
    }
  );

  const result = data.appSubscriptionCreate;
  if (result.userErrors.length > 0) {
    throw new Error(
      `appSubscriptionCreate: ${result.userErrors.map((e) => e.message).join(", ")}`
    );
  }
  if (!result.confirmationUrl) {
    throw new Error("appSubscriptionCreate returned no confirmationUrl");
  }
  return { confirmationUrl: result.confirmationUrl };
}
