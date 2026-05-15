import "@shopify/shopify-api/adapters/web-api";
import { shopifyApi, ApiVersion, LogSeverity } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "./prisma";

const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

type ShopifyClient = ReturnType<typeof shopifyApi>;
let _shopify: ShopifyClient | null = null;

export const getShopify = (): ShopifyClient => {
  if (_shopify) return _shopify;
  _shopify = shopifyApi({
    apiKey: requireEnv("SHOPIFY_API_KEY"),
    apiSecretKey: requireEnv("SHOPIFY_API_SECRET"),
    scopes: requireEnv("SCOPES").split(",").map((s) => s.trim()),
    hostName: requireEnv("HOST").replace(/^https?:\/\//, ""),
    hostScheme: "https",
    apiVersion: ApiVersion.January26,
    isEmbeddedApp: true,
    logger: {
      level:
        process.env.NODE_ENV === "production"
          ? LogSeverity.Warning
          : LogSeverity.Info,
    },
  });
  return _shopify;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sessionStorage = new PrismaSessionStorage(prisma as any);
