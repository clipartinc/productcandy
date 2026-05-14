import {
  reactExtension,
  AdminBlock,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Select,
  TextArea,
  TextField,
  Banner,
  useApi,
  Box,
} from "@shopify/ui-extensions-react/admin";
import { useEffect, useMemo, useState } from "react";

const TARGET = "admin.product-details.block.render";

export default reactExtension(TARGET, () => <App />);

type TemplateId = "spec-sheet" | "story-features" | "faq";

type TemplateField = { key: string; label: string; multiline?: boolean };

const TEMPLATES: Record<
  TemplateId,
  { label: string; fields: TemplateField[]; render: (v: Record<string, string>) => string }
> = {
  "spec-sheet": {
    label: "Spec sheet",
    fields: [
      { key: "intro", label: "Intro paragraph", multiline: true },
      { key: "specs", label: "Specs (one per line, key: value)", multiline: true },
    ],
    render: (v) => {
      const rows = (v.specs ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, ...rest] = line.split(":");
          return `<tr><th style="text-align:left;padding:6px 12px 6px 0;">${escapeHtml(
            (key ?? "").trim()
          )}</th><td style="padding:6px 0;">${escapeHtml(rest.join(":").trim())}</td></tr>`;
        })
        .join("");
      return `
<div>
  <p>${escapeHtml(v.intro ?? "")}</p>
  <table style="border-collapse:collapse;width:100%;margin-top:12px;">
    <tbody>${rows}</tbody>
  </table>
</div>`.trim();
    },
  },
  "story-features": {
    label: "Story + features",
    fields: [
      { key: "story", label: "Story", multiline: true },
      { key: "features", label: "Features (one per line)", multiline: true },
    ],
    render: (v) => {
      const items = (v.features ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("");
      return `
<div>
  <p>${escapeHtml(v.story ?? "")}</p>
  <h3>What's inside</h3>
  <ul>${items}</ul>
</div>`.trim();
    },
  },
  faq: {
    label: "FAQ block",
    fields: [
      {
        key: "items",
        label: "FAQ pairs (Q: ... \\n A: ... — blank line between)",
        multiline: true,
      },
    ],
    render: (v) => {
      const blocks = (v.items ?? "")
        .split(/\n\s*\n/)
        .map((block) => {
          const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
          const q = lines.find((l) => /^q:/i.test(l))?.replace(/^q:\s*/i, "") ?? "";
          const a = lines.find((l) => /^a:/i.test(l))?.replace(/^a:\s*/i, "") ?? "";
          if (!q && !a) return "";
          return `<div style="margin-bottom:12px;">
  <p><strong>${escapeHtml(q)}</strong></p>
  <p>${escapeHtml(a)}</p>
</div>`;
        })
        .filter(Boolean)
        .join("");
      return `<div><h3>FAQ</h3>${blocks}</div>`;
    },
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function App() {
  const { i18n, data, query } = useApi(TARGET);
  const productId = (data as { selected?: { id: string }[] })?.selected?.[0]?.id;

  const [templateId, setTemplateId] = useState<TemplateId>("spec-sheet");
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "success" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const template = TEMPLATES[templateId];

  useEffect(() => {
    setValues({});
    setStatus({ kind: "idle" });
  }, [templateId, productId]);

  const html = useMemo(() => template.render(values), [template, values]);

  async function applyToProduct() {
    if (!productId) return;
    setStatus({ kind: "saving" });
    try {
      const res = await query<
        { productUpdate: { userErrors: { message: string }[] } },
        { input: { id: string; descriptionHtml: string } }
      >(
        `mutation UpdateDescription($input: ProductInput!) {
           productUpdate(input: $input) {
             userErrors { message }
           }
         }`,
        { variables: { input: { id: productId, descriptionHtml: html } } }
      );
      const errs = res.data?.productUpdate?.userErrors ?? [];
      if (errs.length > 0) {
        setStatus({ kind: "error", message: errs.map((e) => e.message).join(", ") });
        return;
      }
      setStatus({ kind: "success" });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return (
    <AdminBlock title="Product Candy — Description Layouts">
      <BlockStack gap="base">
        <Text>
          {i18n.translate("intro") ||
            "Pick a template, fill in the fields, and write the rendered HTML straight into this product's description."}
        </Text>

        <Select
          label="Template"
          value={templateId}
          options={Object.entries(TEMPLATES).map(([id, t]) => ({
            label: t.label,
            value: id,
          }))}
          onChange={(v) => setTemplateId(v as TemplateId)}
        />

        {template.fields.map((field) =>
          field.multiline ? (
            <TextArea
              key={field.key}
              label={field.label}
              value={values[field.key] ?? ""}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
              rows={4}
            />
          ) : (
            <TextField
              key={field.key}
              label={field.label}
              value={values[field.key] ?? ""}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
            />
          )
        )}

        {status.kind === "success" && (
          <Banner tone="success" title="Saved to product">
            <Text>The description has been updated. Refresh the page to see it.</Text>
          </Banner>
        )}
        {status.kind === "error" && (
          <Banner tone="critical" title="Save failed">
            <Text>{status.message}</Text>
          </Banner>
        )}

        <Box>
          <Text fontWeight="bold">Preview HTML</Text>
          <TextArea label="Preview HTML" value={html} rows={6} disabled />
        </Box>

        <InlineStack gap="base" inlineAlignment="end">
          <Button
            variant="primary"
            disabled={!productId || status.kind === "saving"}
            onPress={applyToProduct}
          >
            {status.kind === "saving" ? "Saving..." : "Save to product"}
          </Button>
        </InlineStack>
      </BlockStack>
    </AdminBlock>
  );
}
