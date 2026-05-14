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
} from "@shopify/polaris";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

type ProductImage = { id: string; url: string; altText: string | null };

type LoadedProduct = {
  id: string;
  title: string;
  descriptionHtml: string;
  images: ProductImage[];
};

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

  const [product, setProduct] = useState<LoadedProduct | null>(null);
  const [status, setStatus] = useState<Status>(
    productId ? { kind: "loading" } : { kind: "ready" }
  );
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { style: "max-width:100%;height:auto;border-radius:6px;" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener" } }),
    ],
    content: "",
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!productId || !editor) return;
    setStatus({ kind: "loading" });
    fetchWithSessionToken(`/api/app/product/${encodeURIComponent(productId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Load failed");
        setProduct(json as LoadedProduct);
        editor.commands.setContent(json.descriptionHtml ?? "");
        setStatus({ kind: "ready" });
      })
      .catch((e) =>
        setStatus({
          kind: "error",
          message: e instanceof Error ? e.message : "Load failed",
        })
      );
  }, [productId, editor]);

  async function save() {
    if (!productId || !editor) return;
    setStatus({ kind: "saving" });
    try {
      const res = await fetchWithSessionToken(
        `/api/app/product/${encodeURIComponent(productId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptionHtml: editor.getHTML() }),
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
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: linkUrl })
      .run();
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
        disabled: !productId || !editor || status.kind === "loading" || status.kind === "saving",
      }}
    >
      <BlockStack gap="400">
        {!productId && (
          <Banner tone="info" title="No product selected">
            <p>
              Open this editor from a product page (Apps → Product Candy →
              Customize freely…) to load a product. We&apos;ll add a product
              picker here in a later release.
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

        {productId && editor && (
          <Card>
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
          </Card>
        )}
      </BlockStack>

      {product && (
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
              <BlockStack gap="200">
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
                        style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 4 }}
                      />
                    </button>
                  ))}
                </InlineStack>
              </BlockStack>
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
      <Button
        pressed={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </Button>
      <Button
        pressed={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </Button>
      <Button
        pressed={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </Button>
      <Button
        pressed={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </Button>
      <Button
        pressed={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </Button>
      <Button onClick={onPickLink}>Link…</Button>
      <Button onClick={onPickImage} disabled={!imagesAvailable}>
        Image…
      </Button>
      <Button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        Undo
      </Button>
      <Button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        Redo
      </Button>
    </InlineStack>
  );
}

/**
 * Embedded apps in admin call our backend with a session token (App Bridge JWT)
 * in the Authorization header. The script tag in /app/layout.tsx attaches the
 * shopify-app-bridge script; once it's ready, calling shopify.idToken() returns
 * a fresh JWT we can forward to our /api/* routes.
 */
async function fetchWithSessionToken(url: string, init: RequestInit = {}) {
  const w = window as unknown as { shopify?: { idToken: () => Promise<string> } };
  if (!w.shopify) throw new Error("App Bridge not loaded");
  const token = await w.shopify.idToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
