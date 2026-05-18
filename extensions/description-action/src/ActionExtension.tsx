import {
  reactExtension,
  AdminAction,
  BlockStack,
  InlineStack,
  Text,
  Image,
  Pressable,
  Button,
  Banner,
  Select,
  Link,
  useApi,
} from "@shopify/ui-extensions-react/admin";
import { useEffect, useState } from "react";
import { thumbDataUri, snippetThumbUri } from "./thumbnails";

const TARGET = "admin.product-details.action.render";

const APP_BACKEND_URL =
  (typeof process !== "undefined" && process.env?.APP_BACKEND_URL) ||
  "https://productcandy.app";

type Snippet = { id: string; name: string; html: string };

type Skeleton = (bg: string, text: string) => string;
type TemplateMeta = { id: string; label: string; skeleton: Skeleton };

const BG_OPTIONS = [
  { label: "None (no background)", value: "none" },
  { label: "Light gray", value: "#f3f4f6" },
  { label: "Soft pink", value: "#fdf2f8" },
  { label: "Soft blue", value: "#eff6ff" },
  { label: "Soft yellow", value: "#fefce8" },
  { label: "Soft green", value: "#f0fdf4" },
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#111827" },
];

const TEXT_OPTIONS = [
  { label: "Default gray", value: "#6b7280" },
  { label: "Black", value: "#111827" },
  { label: "Dark gray", value: "#374151" },
  { label: "Pink", value: "#ec4899" },
  { label: "Blue", value: "#2563eb" },
  { label: "White", value: "#ffffff" },
];

// Block placeholder (used for paragraph-sized regions)
function ph(label: string, bg: string, text: string): string {
  if (bg === "none") {
    return `<div data-pc-placeholder="1" style="color:${text};font-style:italic;margin:8px 0;">${label}</div>`;
  }
  return `<div data-pc-placeholder="1" style="background-color:${bg};color:${text};border:1px dashed #d1d5db;border-radius:8px;padding:12px 16px;margin:8px 0;font-style:italic;">${label}</div>`;
}

// Stacks multi-column rows on small screens via a CSS container query
// (primary) + viewport @media (fallback). See snippetBlocks.ts for the
// long-form rationale — short version: themes like Horizon render the
// description inside an `<rte-formatter>` cell whose width on a phone
// doesn't equal the viewport, so viewport-only @media doesn't always
// fire when we'd want it to. The container query asks the actual cell
// width via the .pc-snippet-wrap div's `container-type:inline-size`.
const RESPONSIVE_STYLE = `<style>.pc-snippet-wrap{width:100%;}.pc-snippet-wrap .pc-snippet-row{display:grid;gap:16px;width:100%;align-items:start;box-sizing:border-box;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{min-width:0;box-sizing:border-box;}rte-formatter:has(.pc-snippet-row),.rte:has(.pc-snippet-row),.text-block:has(.pc-snippet-row),.spacing-style:has(.pc-snippet-row),[style*="--max-width"]:has(.pc-snippet-row){--max-width:none !important;--width:100% !important;max-width:none !important;width:100% !important;}</style>`;

const WRAP_OPEN = `<div class="pc-snippet-wrap" style="width:100%;">`;
const WRAP_CLOSE = `</div>`;

// Inline placeholder (used for headings, short labels)
function phInline(label: string, bg: string, text: string): string {
  if (bg === "none") {
    return `<span data-pc-placeholder="1" style="color:${text};font-style:italic;">${label}</span>`;
  }
  return `<span data-pc-placeholder="1" style="background-color:${bg};color:${text};border:1px dashed #d1d5db;border-radius:6px;padding:2px 8px;font-style:italic;">${label}</span>`;
}

const TEMPLATES: TemplateMeta[] = [
  {
    id: "spec-sheet",
    label: "Spec sheet",
    skeleton: (bg, text) => `
<div data-pc-template="spec-sheet">
  ${ph("Click here to write your intro paragraph…", bg, text)}
  <table style="border-collapse:separate;border-spacing:0 6px;width:100%;margin-top:8px;">
    <tr><th style="text-align:left;padding-right:12px;width:30%;">${phInline("Spec name", bg, text)}</th><td>${phInline("Spec value", bg, text)}</td></tr>
    <tr><th style="text-align:left;padding-right:12px;">${phInline("Spec name", bg, text)}</th><td>${phInline("Spec value", bg, text)}</td></tr>
    <tr><th style="text-align:left;padding-right:12px;">${phInline("Spec name", bg, text)}</th><td>${phInline("Spec value", bg, text)}</td></tr>
    <tr><th style="text-align:left;padding-right:12px;">${phInline("Spec name", bg, text)}</th><td>${phInline("Spec value", bg, text)}</td></tr>
  </table>
</div>`.trim(),
  },
  {
    id: "story-features",
    label: "Story + features",
    skeleton: (bg, text) => `
<div data-pc-template="story-features">
  ${ph("Click here to write your brand story or product narrative…", bg, text)}
  <h3 style="margin-top:16px;">${phInline("Features headline", bg, text)}</h3>
  <ul>
    <li>${phInline("Feature one", bg, text)}</li>
    <li>${phInline("Feature two", bg, text)}</li>
    <li>${phInline("Feature three", bg, text)}</li>
    <li>${phInline("Feature four", bg, text)}</li>
  </ul>
</div>`.trim(),
  },
  {
    id: "faq",
    label: "FAQ block",
    skeleton: (bg, text) => `
<div data-pc-template="faq">
  <h3>FAQ</h3>
  <div style="margin-bottom:12px;">
    <p><strong>${phInline("Question one — click to edit", bg, text)}</strong></p>
    ${ph("Click to write the answer…", bg, text)}
  </div>
  <div style="margin-bottom:12px;">
    <p><strong>${phInline("Question two — click to edit", bg, text)}</strong></p>
    ${ph("Click to write the answer…", bg, text)}
  </div>
  <div style="margin-bottom:12px;">
    <p><strong>${phInline("Question three — click to edit", bg, text)}</strong></p>
    ${ph("Click to write the answer…", bg, text)}
  </div>
</div>`.trim(),
  },
  {
    id: "two-column",
    label: "Two columns",
    skeleton: (bg, text) => `
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" data-pc-template="two-column" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:16px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    <h3>${phInline("Column 1 heading", bg, text)}</h3>
    ${ph("Click here to write column 1 text…", bg, text)}
  </div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    <h3>${phInline("Column 2 heading", bg, text)}</h3>
    ${ph("Click here to write column 2 text…", bg, text)}
  </div>
</div>
${WRAP_CLOSE}`.trim(),
  },
  {
    id: "three-column",
    label: "Three columns",
    skeleton: (bg, text) => `
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" data-pc-template="three-column" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 200px), 1fr));gap:16px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    <h3>${phInline("Column 1 heading", bg, text)}</h3>
    ${ph("Click to write…", bg, text)}
  </div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    <h3>${phInline("Column 2 heading", bg, text)}</h3>
    ${ph("Click to write…", bg, text)}
  </div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    <h3>${phInline("Column 3 heading", bg, text)}</h3>
    ${ph("Click to write…", bg, text)}
  </div>
</div>
${WRAP_CLOSE}`.trim(),
  },
  {
    id: "hero-cta",
    label: "Hero + CTA",
    skeleton: (bg, text) => `
<div data-pc-template="hero-cta" style="text-align:left;padding:8px 0;">
  <h2 style="font-size:1.6em;margin:0 0 12px 0;">${phInline("Bold headline goes here", bg, text)}</h2>
  ${ph("Click here to write a short supporting paragraph…", bg, text)}
  <p style="margin-top:16px;">
    <a href="#" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">${phInline("Button label", bg, text)}</a>
  </p>
</div>`.trim(),
  },
  {
    id: "image-text",
    label: "Image + text",
    skeleton: (bg, text) => `
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" data-pc-template="image-text" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:16px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">${ph("Image placeholder — replace with a product image using Shopify's image button in the description editor.", bg, text)}</div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    <h3>${phInline("Headline", bg, text)}</h3>
    ${ph("Click here to write your supporting text…", bg, text)}
  </div>
</div>
${WRAP_CLOSE}`.trim(),
  },
  {
    id: "text-image",
    label: "Text + image",
    skeleton: (bg, text) => `
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" data-pc-template="text-image" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:16px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    <h3>${phInline("Headline", bg, text)}</h3>
    ${ph("Click here to write your supporting text…", bg, text)}
  </div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">${ph("Image placeholder — replace with a product image using Shopify's image button in the description editor.", bg, text)}</div>
</div>
${WRAP_CLOSE}`.trim(),
  },
  {
    id: "gallery-3",
    label: "Image gallery (3)",
    skeleton: (bg, text) => `
${RESPONSIVE_STYLE}
${WRAP_OPEN}
<div class="pc-snippet-row" data-pc-template="gallery-3" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 200px), 1fr));gap:16px;width:100%;align-items:start;box-sizing:border-box;">
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    ${ph("Image 1 placeholder", bg, text)}
    ${ph("Caption 1", bg, text)}
  </div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    ${ph("Image 2 placeholder", bg, text)}
    ${ph("Caption 2", bg, text)}
  </div>
  <div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;">
    ${ph("Image 3 placeholder", bg, text)}
    ${ph("Caption 3", bg, text)}
  </div>
</div>
${WRAP_CLOSE}`.trim(),
  },
];

type Mode = "append" | "replace";

export default reactExtension(TARGET, () => <App />);

function App() {
  const { data, query, close, auth } = useApi(TARGET);
  const productId = (data as { selected?: { id: string }[] })?.selected?.[0]?.id;

  const [mode, setMode] = useState<Mode>("append");
  const [bgColor, setBgColor] = useState<string>("none");
  const [textColor, setTextColor] = useState<string>("#111827");
  const [busy, setBusy] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[] | null>(null);
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [freeSnippetIds, setFreeSnippetIds] = useState<string[]>([]);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  // Pull the merchant's saved snippets on open. The same endpoint
  // returns the live entitlement (including which snippet IDs are
  // covered by the free quota) so we can per-snippet gate the Apply
  // button without a second round-trip. Built-in templates stay
  // usable even if the snippets backend is down.
  useEffect(() => {
    (async () => {
      try {
        const token = await auth.idToken();
        if (!token) return;
        const res = await fetch(`${APP_BACKEND_URL}/api/app/snippets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          snippets: Snippet[];
          entitlement?: {
            entitled: boolean;
            freeSnippetIds?: string[];
          };
        };
        setSnippets(json.snippets ?? []);
        setEntitled(json.entitlement?.entitled ?? false);
        setFreeSnippetIds(json.entitlement?.freeSnippetIds ?? []);
      } catch {
        // ignore
      }
    })();
  }, [auth]);


  async function applyHtml(skeletonHtml: string) {
    if (!productId) return;
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const stampHtml = `${skeletonHtml}\n<p><br></p>`;
      let nextHtml = stampHtml;
      if (mode === "append") {
        const cur = await query<{ product: { descriptionHtml: string } | null }>(
          `query CurDesc($id: ID!) { product(id: $id) { descriptionHtml } }`,
          { variables: { id: productId } }
        );
        const existing = cur.data?.product?.descriptionHtml ?? "";
        nextHtml = existing ? `${existing}\n${stampHtml}` : stampHtml;
      }
      const upd = await query<
        { productUpdate: { userErrors: { message: string }[] } },
        { input: { id: string; descriptionHtml: string } }
      >(
        `mutation UpdateDescription($input: ProductInput!) {
          productUpdate(input: $input) { userErrors { message } }
        }`,
        { variables: { input: { id: productId, descriptionHtml: nextHtml } } }
      );
      const errs = upd.data?.productUpdate?.userErrors ?? [];
      if (errs.length > 0) {
        setStatus({ kind: "error", message: errs.map((e) => e.message).join(", ") });
        setBusy(false);
        return;
      }
      close();
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
      setBusy(false);
    }
  }

  function applyTemplate(t: TemplateMeta) {
    return applyHtml(t.skeleton(bgColor, textColor));
  }

  function applySnippet(s: Snippet) {
    return applyHtml(s.html);
  }

  return (
    <AdminAction
      title="Pre-Made Description Layout Examples"
      primaryAction={<Button onPress={close} disabled={busy}>Done</Button>}
    >
      <BlockStack gap="base">
        {busy && (
          <Banner tone="info" title="Applying change…">
            <Text>Updating the product description in Shopify.</Text>
          </Banner>
        )}

        {!productId ? (
          <Banner tone="info" title="Save the product first">
            <Text>Save the product so it has an id, then come back here.</Text>
          </Banner>
        ) : (
          <>
            <Text>
              Pick a layout to drop placeholder boxes into the product
              description. Choose colors below — pick &quot;None&quot; for
              background to get a clean (unstyled) skeleton.
            </Text>

            <InlineStack gap="base">
              <Select
                label="Background color"
                value={bgColor}
                options={BG_OPTIONS}
                onChange={setBgColor}
              />
              <Select
                label="Text color"
                value={textColor}
                options={TEXT_OPTIONS}
                onChange={setTextColor}
              />
            </InlineStack>

            <Select
              label="When applying a layout"
              value={mode}
              options={[
                { label: "Append to existing description", value: "append" },
                { label: "Replace existing description", value: "replace" },
              ]}
              onChange={(v) => setMode(v as Mode)}
            />

            {status.kind === "error" && (
              <Banner tone="critical" title="Couldn’t apply layout">
                <Text>{status.message}</Text>
              </Banner>
            )}

            <Text fontWeight="bold">Your custom snippets</Text>
            {entitled === false &&
              snippets &&
              snippets.length > freeSnippetIds.length && (
                <Banner tone="info" title="Free plan: 1 custom snippet">
                  <BlockStack gap="small">
                    <Text>
                      Your first saved snippet works on the free plan.
                      Additional snippets need the $4.99/month Custom
                      Snippets add-on to apply or render on your storefront.
                    </Text>
                    <InlineStack gap="base">
                      <Link to="shopify://admin/apps/product-candy/app/billing">
                        Upgrade — $4.99/month
                      </Link>
                    </InlineStack>
                  </BlockStack>
                </Banner>
              )}
            {snippets && snippets.length > 0 ? (
              <BlockStack gap="base">
                {chunk(snippets, 3).map((row, i) => (
                  <InlineStack key={`s-${i}`} gap="base">
                    {row.map((s) => {
                      const isFree = freeSnippetIds.includes(s.id);
                      const canApply = entitled === true || isFree;
                      return (
                        <BlockStack key={s.id} gap="none" inlineAlignment="center">
                          <Pressable
                            onPress={() => (canApply ? applySnippet(s) : undefined)}
                            disabled={busy || !canApply}
                            padding="none"
                            accessibilityLabel={
                              canApply
                                ? `Apply snippet ${s.name}`
                                : `${s.name} requires Custom Snippets subscription`
                            }
                          >
                            <Image source={snippetThumbUri(s.id)} alt={s.name} />
                          </Pressable>
                          {canApply ? (
                            <Button
                              variant="primary"
                              onPress={() => applySnippet(s)}
                              disabled={busy}
                            >
                              Apply Snippet
                            </Button>
                          ) : (
                            <Link to="shopify://admin/apps/product-candy/app/billing">
                              Upgrade to apply
                            </Link>
                          )}
                          <Text>{s.name}</Text>
                        </BlockStack>
                      );
                    })}
                  </InlineStack>
                ))}
              </BlockStack>
            ) : (
              <Text>
                Save reusable HTML blocks (warranty, brand story, size chart…)
                to stamp them here alongside the built-in layouts.
              </Text>
            )}
            <InlineStack gap="base">
              <Link to="shopify://admin/apps/product-candy/app/snippets">
                + Add new snippet
              </Link>
            </InlineStack>

            <Text fontWeight="bold">Built-in layouts</Text>
            <BlockStack gap="base">
              {chunk(TEMPLATES, 3).map((row, i) => (
                <InlineStack key={i} gap="base">
                  {row.map((t) => (
                    <BlockStack key={t.id} gap="none" inlineAlignment="center">
                      <Pressable
                        onPress={() => applyTemplate(t)}
                        disabled={busy}
                        padding="none"
                        accessibilityLabel={`Apply ${t.label} layout`}
                      >
                        <Image source={thumbDataUri(t.id)} alt={t.label} />
                      </Pressable>
                      <Button
                        variant="primary"
                        onPress={() => applyTemplate(t)}
                        disabled={busy}
                      >
                        Apply Layout
                      </Button>
                      <Text>{t.label}</Text>
                    </BlockStack>
                  ))}
                </InlineStack>
              ))}
            </BlockStack>
          </>
        )}
      </BlockStack>
    </AdminAction>
  );
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
