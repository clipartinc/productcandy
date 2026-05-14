"use client";

import { Suspense } from "react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  TextField,
  Modal,
  Spinner,
  Box,
  Select,
} from "@shopify/polaris";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  TEMPLATES,
  TEMPLATE_LIST,
  type ProductImage,
  type TemplateId,
} from "@/lib/templates";

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

type LoadedProduct = {
  id: string;
  title: string;
  descriptionHtml: string;
  images: ProductImage[];
};

const isTemplateId = (v: string | null): v is TemplateId =>
  !!v && Object.prototype.hasOwnProperty.call(TEMPLATES, v);

export default function DescriptionsPage() {
  return (
    <Suspense fallback={null}>
      <DescriptionsEditor />
    </Suspense>
  );
}

function DescriptionsEditor() {
  const params = useSearchParams();
  const productId = params.get("id");
  const initialTemplate = isTemplateId(params.get("t")) ? (params.get("t") as TemplateId) : null;

  const [templateId, setTemplateId] = useState<TemplateId | null>(initialTemplate);
  const mode: "template" | "freeform" = templateId ? "template" : "freeform";

  const [product, setProduct] = useState<LoadedProduct | null>(null);
  const [status, setStatus] = useState<Status>(
    productId ? { kind: "loading" } : { kind: "ready" }
  );
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({
        HTMLAttributes: {
          style: "max-width:100%;height:auto;border-radius:6px;",
        },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener" } }),
    ],
    content: "",
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!productId) return;
    setStatus({ kind: "loading" });
    fetchWithSessionToken(`/api/app/product/${encodeURIComponent(productId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Load failed");
        setProduct(json as LoadedProduct);
        if (editor && mode === "freeform") {
          editor.commands.setContent(json.descriptionHtml ?? "");
        }
        setStatus({ kind: "ready" });
      })
      .catch((e) =>
        setStatus({
          kind: "error",
          message: e instanceof Error ? e.message : "Load failed",
        })
      );
  }, [productId, editor, mode]);

  // Reset form values when switching between templates
  useEffect(() => {
    setValues({});
    setStatus((s) => (s.kind === "saved" ? { kind: "ready" } : s));
  }, [templateId]);

  const template = templateId ? TEMPLATES[templateId] : null;
  const templateHtml = useMemo(
    () => (template ? template.render(values, product?.images ?? []) : ""),
    [template, values, product]
  );

  async function save() {
    if (!productId) return;
    const html = mode === "template" ? templateHtml : editor?.getHTML() ?? "";
    setStatus({ kind: "saving" });
    try {
      const res = await fetchWithSessionToken(
        `/api/app/product/${encodeURIComponent(productId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptionHtml: html }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setStatus({ kind: "saved" });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Save failed",
      });
    }
  }

  function insertImage(img: ProductImage) {
    editor?.chain().focus().setImage({ src: img.url, alt: img.altText ?? "" }).run();
    setImagePickerOpen(false);
  }

  function insertLink() {
    if (!linkUrl) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    setLinkPickerOpen(false);
    setLinkUrl("");
  }

  return (
    <Page
      title={product ? product.title : "Description editor"}
      backAction={{ content: "Home", url: "/app" }}
      primaryAction={{
        content: status.kind === "saving" ? "Saving…" : "Save to product",
        onAction: save,
        disabled: !productId || status.kind === "loading" || status.kind === "saving",
      }}
    >
      <BlockStack gap="400">
        {!productId && (
          <Banner tone="info" title="No product selected">
            <p>
              Open this editor from a product page (Description Layouts block →
              pick a layout). We&apos;ll add a product picker here in a later
              release.
            </p>
          </Banner>
        )}

        {status.kind === "error" && (
          <Banner tone="critical" title="Error">
            <p>{status.message}</p>
          </Banner>
        )}

        {status.kind === "saved" && (
          <Banner tone="success" title="Saved" onDismiss={() => setStatus({ kind: "ready" })}>
            <p>The product description has been updated in Shopify.</p>
          </Banner>
        )}

        {status.kind === "loading" && (
          <Card>
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <Text as="p">Loading product…</Text>
            </InlineStack>
          </Card>
        )}

        {productId && status.kind !== "loading" && (
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="300" align="space-between" blockAlign="center" wrap>
                <Text as="p" tone="subdued">
                  {mode === "template"
                    ? "Template editor — fill in the fields and save."
                    : "Freeform editor — full rich text + image inserts."}
                </Text>
                <Select
                  label="Layout"
                  labelHidden
                  options={[
                    { label: "Freeform editor", value: "__free" },
                    ...TEMPLATE_LIST.map((t) => ({ label: t.label, value: t.id })),
                  ]}
                  value={templateId ?? "__free"}
                  onChange={(v) =>
                    setTemplateId(v === "__free" ? null : (v as TemplateId))
                  }
                />
              </InlineStack>

              {mode === "template" && template && (
                <TemplateEditor
                  template={template}
                  images={product?.images ?? []}
                  values={values}
                  onChange={setValues}
                  previewHtml={templateHtml}
                />
              )}

              {mode === "freeform" && editor && (
                <BlockStack gap="300">
                  <Toolbar
                    editor={editor}
                    onPickImage={() => setImagePickerOpen(true)}
                    onPickLink={() => {
                      setLinkUrl(editor.getAttributes("link").href ?? "");
                      setLinkPickerOpen(true);
                    }}
                    imagesAvailable={(product?.images.length ?? 0) > 0}
                  />
                  <Box
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    borderColor="border"
                    borderWidth="025"
                    minHeight="320px"
                  >
                    <EditorContent editor={editor} />
                  </Box>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        )}
      </BlockStack>

      {product && mode === "freeform" && (
        <Modal
          open={imagePickerOpen}
          onClose={() => setImagePickerOpen(false)}
          title="Insert product image"
        >
          <Modal.Section>
            {product.images.length === 0 ? (
              <Text as="p" tone="subdued">
                No images on this product yet. Add some in Shopify first.
              </Text>
            ) : (
              <InlineStack gap="200" wrap>
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => insertImage(img)}
                    style={{
                      padding: 4,
                      border: "1px solid #d1d5db",
                      background: "transparent",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                    aria-label={img.altText ?? "Insert image"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.altText ?? ""}
                      style={{
                        width: 110,
                        height: 110,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  </button>
                ))}
              </InlineStack>
            )}
          </Modal.Section>
        </Modal>
      )}

      <Modal
        open={linkPickerOpen}
        onClose={() => setLinkPickerOpen(false)}
        title="Insert link"
        primaryAction={{ content: "Apply", onAction: insertLink }}
        secondaryActions={[
          {
            content: "Remove link",
            onAction: () => {
              editor?.chain().focus().unsetLink().run();
              setLinkPickerOpen(false);
              setLinkUrl("");
            },
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="URL"
            autoComplete="off"
            value={linkUrl}
            onChange={setLinkUrl}
            placeholder="https://example.com"
          />
        </Modal.Section>
      </Modal>

      <style jsx global>{`
        .ProseMirror {
          min-height: 280px;
          outline: none;
          font-size: 14px;
          line-height: 1.5;
        }
        .ProseMirror p { margin: 0 0 12px 0; }
        .ProseMirror h2 { font-size: 1.4em; margin: 16px 0 8px; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 22px; margin-bottom: 12px; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; }
        .ProseMirror a { color: #ec4899; text-decoration: underline; }
      `}</style>
    </Page>
  );
}

function TemplateEditor({
  template,
  images,
  values,
  onChange,
  previewHtml,
}: {
  template: (typeof TEMPLATES)[TemplateId];
  images: ProductImage[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  previewHtml: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(true);

  function setValue(key: string, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <BlockStack gap="300">
      <Text as="p" tone="subdued">
        {template.description}
      </Text>

      {template.fields.map((field) => {
        if (field.kind === "image") {
          return (
            <ImagePicker
              key={field.key}
              label={field.label}
              images={images}
              selectedId={values[field.key] ?? null}
              onSelect={(id) => setValue(field.key, id)}
            />
          );
        }
        if (field.kind === "multiline") {
          return (
            <TextField
              key={field.key}
              label={field.label}
              autoComplete="off"
              multiline={4}
              value={values[field.key] ?? ""}
              onChange={(v) => setValue(field.key, v)}
            />
          );
        }
        return (
          <TextField
            key={field.key}
            label={field.label}
            autoComplete="off"
            value={values[field.key] ?? ""}
            onChange={(v) => setValue(field.key, v)}
          />
        );
      })}

      <InlineStack gap="200">
        <Button onClick={() => setPreviewOpen((p) => !p)}>
          {previewOpen ? "Hide preview" : "Show preview"}
        </Button>
      </InlineStack>

      {previewOpen && (
        <Box
          padding="400"
          background="bg-surface-secondary"
          borderRadius="200"
          borderColor="border"
          borderWidth="025"
        >
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </Box>
      )}
    </BlockStack>
  );
}

function ImagePicker({
  label,
  images,
  selectedId,
  onSelect,
}: {
  label: string;
  images: ProductImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (images.length === 0) {
    return (
      <Banner tone="warning" title={`${label}: no images on this product`}>
        <p>Add an image to the product first, then come back here.</p>
      </Banner>
    );
  }
  return (
    <BlockStack gap="200">
      <Text as="p" fontWeight="semibold">
        {label}
      </Text>
      <InlineStack gap="200" wrap>
        {images.map((img) => {
          const selected = selectedId === img.id;
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => onSelect(img.id)}
              style={{
                padding: 4,
                border: selected ? "2px solid #ec4899" : "1px solid #d1d5db",
                background: selected ? "#fef2f8" : "transparent",
                borderRadius: 6,
                cursor: "pointer",
              }}
              aria-pressed={selected}
              aria-label={img.altText ?? label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText ?? ""}
                style={{
                  width: 90,
                  height: 90,
                  objectFit: "cover",
                  borderRadius: 4,
                  display: "block",
                }}
              />
            </button>
          );
        })}
      </InlineStack>
    </BlockStack>
  );
}

function Toolbar({
  editor,
  onPickImage,
  onPickLink,
  imagesAvailable,
}: {
  editor: Editor;
  onPickImage: () => void;
  onPickLink: () => void;
  imagesAvailable: boolean;
}) {
  return (
    <InlineStack gap="100" wrap>
      <Button pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        Bold
      </Button>
      <Button pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        Italic
      </Button>
      <Button
        pressed={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </Button>
      <Button pressed={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • List
      </Button>
      <Button pressed={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. List
      </Button>
      <Button onClick={onPickLink}>Link…</Button>
      <Button onClick={onPickImage} disabled={!imagesAvailable}>
        Image…
      </Button>
      <Button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        Undo
      </Button>
      <Button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        Redo
      </Button>
    </InlineStack>
  );
}

async function fetchWithSessionToken(url: string, init: RequestInit = {}) {
  const w = window as unknown as { shopify?: { idToken: () => Promise<string> } };
  if (!w.shopify) throw new Error("App Bridge not loaded");
  const token = await w.shopify.idToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
