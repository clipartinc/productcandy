"use client";

import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  TextField,
  Spinner,
  Box,
  EmptyState,
  Divider,
  Select,
  Modal,
  Badge,
} from "@shopify/polaris";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useState } from "react";
import { appBridgeFetch } from "@/lib/appBridgeFetch";
import { STARTERS } from "@/lib/snippetStarters";
import { Div } from "@/lib/tiptapDiv";
import { SnippetBuilder } from "./SnippetBuilder";
import { type Layout, layoutToHtml } from "@/lib/snippetBlocks";
import { htmlToLayout } from "@/lib/snippetParser";

const RESPONSIVE_STYLE = `<style>.pc-snippet-wrap{width:100%;}.pc-snippet-wrap .pc-snippet-row{display:grid;gap:16px;width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);align-items:start;box-sizing:border-box;}.pc-snippet-wrap .pc-snippet-row > .pc-snippet-col{min-width:0;box-sizing:border-box;}</style>`;

const TWO_COL_INSERT = `${RESPONSIVE_STYLE}<div class="pc-snippet-wrap" style="width:100%;"><div class="pc-snippet-row" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:16px;width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);align-items:start;box-sizing:border-box;"><div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>Column 1 heading</h3><p>Add column 1 text here.</p></div><div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>Column 2 heading</h3><p>Add column 2 text here.</p></div></div></div><p></p>`;

const THREE_COL_INSERT = `${RESPONSIVE_STYLE}<div class="pc-snippet-wrap" style="width:100%;"><div class="pc-snippet-row" style="display:grid !important;grid-template-columns:repeat(auto-fit, minmax(min(100%, 200px), 1fr));gap:16px;width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);align-items:start;box-sizing:border-box;"><div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>Column 1</h3><p>Add text.</p></div><div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>Column 2</h3><p>Add text.</p></div><div class="pc-snippet-col" style="min-width:0;box-sizing:border-box;"><h3>Column 3</h3><p>Add text.</p></div></div></div><p></p>`;

const HERO_CTA_INSERT = `<h2>Bold headline goes here</h2><p>Add a short supporting paragraph here.</p><p><a href="#" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">Button label</a></p><p></p>`;

const SPEC_ROW_INSERT = `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;width:100%;"><div style="flex:1;min-width:60px;font-weight:600;"><p>Spec name</p></div><div style="flex:2;min-width:80px;"><p>Spec value</p></div></div><p></p>`;

type Snippet = {
  id: string;
  name: string;
  html: string;
  layout: Layout | null;
  updatedAt: string;
};

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [editing, setEditing] = useState<Snippet | "new" | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Snippet | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [mode, setMode] = useState<"builder" | "html">("builder");
  const [layout, setLayout] = useState<Layout>([]);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [freeSnippetIds, setFreeSnippetIds] = useState<string[]>([]);
  const [regenerating, setRegenerating] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Div,
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

  async function load() {
    setStatus({ kind: "loading" });
    try {
      const res = await appBridgeFetch("/api/app/snippets");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Load failed");
      setSnippets(json.snippets);
      setEntitled(json.entitlement?.entitled ?? null);
      setFreeSnippetIds(json.entitlement?.freeSnippetIds ?? []);
      setStatus({ kind: "ready" });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Load failed",
      });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function regenerateAll() {
    setRegenerating(true);
    try {
      const res = await appBridgeFetch("/api/app/snippets/regenerate", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Regenerate failed");
      // Reload so the list reflects the new updatedAt timestamps + the
      // thumbnail previews re-fetch with the regenerated HTML.
      await load();
      // App Bridge global is set by the CDN script (see appBridgeFetch).
      const toast = (
        window as unknown as {
          shopify?: { toast?: { show: (msg: string) => void } };
        }
      ).shopify?.toast;
      const msg =
        json.regenerated === 0
          ? "Snippets already up to date"
          : `Regenerated ${json.regenerated} of ${json.total} snippet${json.total === 1 ? "" : "s"}`;
      toast?.show(msg);
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Regenerate failed",
      });
    } finally {
      setRegenerating(false);
    }
  }

  function openNew() {
    setDraftName("");
    setLayout([]);
    setNameError(undefined);
    editor?.commands.setContent("");
    setMode("builder");
    setEditing("new");
  }

  function openEdit(s: Snippet) {
    setDraftName(s.name);
    setNameError(undefined);
    editor?.commands.setContent(s.html);
    // Prefer the saved layout so blocks come back as themselves (heading,
    // paragraph, list, …). For snippets saved before we persisted layout,
    // parse the rendered HTML into the closest matching blocks — anything
    // we can't recognise falls through as a raw-HTML block per element.
    if (s.layout && Array.isArray(s.layout) && s.layout.length > 0) {
      setLayout(s.layout);
    } else {
      setLayout(htmlToLayout(s.html));
    }
    setMode("builder");
    setEditing(s);
  }

  function closeEditor() {
    setEditing(null);
    setDraftName("");
    setLayout([]);
    setNameError(undefined);
    editor?.commands.setContent("");
  }

  function applyStarter(starterId: string) {
    const starter = STARTERS.find((s) => s.id === starterId);
    if (!starter || !editor) return;
    editor.commands.setContent(starter.html);
  }

  async function save() {
    if (!editing || !editor) return;
    const html = mode === "builder" ? layoutToHtml(layout) : editor.getHTML();
    if (!draftName.trim()) {
      setNameError("Give your snippet a name before saving.");
      return;
    }
    if (!html.trim() || html === "<p></p>") {
      setStatus({
        kind: "error",
        message:
          mode === "builder"
            ? "Drag at least one section into your layout before saving."
            : "Add some content before saving.",
      });
      return;
    }
    setNameError(undefined);
    setSaving(true);
    // Only persist a layout when the merchant used the visual builder.
    // HTML-mode edits can't be reverse-engineered into blocks, so leave
    // layout null and let edit fall back to the html-block wrapper.
    const layoutPayload = mode === "builder" ? layout : null;
    try {
      if (editing === "new") {
        const res = await appBridgeFetch("/api/app/snippets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draftName,
            html,
            layout: layoutPayload,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      } else {
        const res = await appBridgeFetch(
          `/api/app/snippets/${encodeURIComponent(editing.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: draftName,
              html,
              layout: layoutPayload,
            }),
          }
        );
        if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      }
      closeEditor();
      await load();
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(s: Snippet) {
    setSaving(true);
    try {
      const res = await appBridgeFetch(
        `/api/app/snippets/${encodeURIComponent(s.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setConfirmDelete(null);
      // If the deleted snippet was the one being edited, close the editor.
      if (editing && editing !== "new" && editing.id === s.id) {
        closeEditor();
      }
      await load();
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Delete failed",
      });
    } finally {
      setSaving(false);
    }
  }

  function applyLink() {
    if (!linkUrl) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    setLinkOpen(false);
    setLinkUrl("");
  }

  return (
    <Page
      title="My Custom Snippets"
      subtitle="Reusable HTML blocks you can stamp into any product description."
      backAction={{ content: "Home", url: "/app" }}
      primaryAction={
        editing
          ? undefined
          : { content: "New snippet", onAction: openNew }
      }
      secondaryActions={
        editing
          ? undefined
          : [
              {
                content: regenerating ? "Regenerating…" : "Regenerate HTML",
                onAction: () => void regenerateAll(),
                disabled: regenerating || snippets.length === 0,
                helpText:
                  "Rebuilds every saved snippet's HTML from its visual layout. " +
                  "Use after a Product Candy update if existing snippets look off.",
              },
            ]
      }
    >
      <BlockStack gap="400">
        {entitled === false && snippets.length > freeSnippetIds.length && (
          <Banner
            tone="info"
            title="Free plan includes 1 custom snippet"
            action={{ content: "Upgrade — $4.99/month", url: "/app/billing" }}
          >
            <p>
              Your oldest saved snippet (marked <strong>Free</strong> below)
              works on the free plan — apply it to product descriptions and
              render it on your storefront. Additional snippets need the
              $4.99/month Custom Snippets subscription to apply or render.
              You can keep building and editing as many as you like; only
              applying / rendering is gated.
            </p>
          </Banner>
        )}

        {status.kind === "error" && (
          <Banner
            tone="critical"
            title="Error"
            onDismiss={() => setStatus({ kind: "ready" })}
          >
            <p>{status.message}</p>
          </Banner>
        )}

        {editing && editor && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                {editing === "new" ? "New snippet" : `Edit: ${editing.name}`}
              </Text>

              <TextField
                label="Name"
                autoComplete="off"
                value={draftName}
                onChange={(v) => {
                  setDraftName(v);
                  if (nameError && v.trim()) setNameError(undefined);
                }}
                placeholder="e.g. Returns policy"
                error={nameError}
              />

              <Select
                label="Editor mode"
                options={[
                  { label: "Visual builder (drag & drop sections)", value: "builder" },
                  { label: "HTML editor (rich text)", value: "html" },
                ]}
                value={mode}
                onChange={(v) => setMode(v as "builder" | "html")}
              />

              {mode === "builder" ? (
                <SnippetBuilder layout={layout} onChange={setLayout} />
              ) : (
                <>
                  {editing === "new" && (
                    <Select
                      label="Start from a layout"
                      helpText="Pick a starting template, then edit the content visually below. Or pick Blank to write from scratch."
                      options={STARTERS.map((s) => ({ label: s.label, value: s.id }))}
                      value="blank"
                      onChange={applyStarter}
                    />
                  )}

                  <BlockStack gap="200">
                    <Text as="p" fontWeight="semibold">
                      Content
                    </Text>
                    <Toolbar
                      editor={editor}
                      onPickLink={() => {
                        setLinkUrl(editor.getAttributes("link").href ?? "");
                        setLinkOpen(true);
                      }}
                      onInsert={(html) =>
                        editor.chain().focus().insertContent(html).run()
                      }
                    />
                    <Box
                      padding="400"
                      background="bg-surface-secondary"
                      borderRadius="200"
                      borderColor="border"
                      borderWidth="025"
                      minHeight="240px"
                    >
                      <EditorContent editor={editor} />
                    </Box>
                  </BlockStack>
                </>
              )}

              <BlockStack gap="200">
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={save}
                  loading={saving}
                >
                  {editing === "new" ? "Create snippet" : "Save"}
                </Button>
                <InlineStack align="center" gap="200">
                  <Button variant="tertiary" onClick={closeEditor} disabled={saving}>
                    Cancel
                  </Button>
                  {editing !== "new" && (
                    <Button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => setConfirmDelete(editing)}
                      disabled={saving}
                    >
                      Delete snippet
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        )}

        {editing ? null : status.kind === "loading" ? (
          <Card>
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <Text as="p">Loading snippets…</Text>
            </InlineStack>
          </Card>
        ) : snippets.length === 0 ? (
          <Card>
            <EmptyState
              heading="No snippets yet"
              action={{ content: "Create your first snippet", onAction: openNew }}
              image=""
            >
              <p>
                Save reusable blocks here — warranty info, return policy, size
                charts, brand story — and stamp them into any product
                description from the Pre-Made Description Layout Examples
                modal.
              </p>
            </EmptyState>
          </Card>
        ) : (
          <Card>
            <BlockStack gap="0">
              {snippets.map((s, i) => (
                <Box key={s.id}>
                  {i > 0 && <Divider />}
                  <Box padding="400">
                    <BlockStack gap="300">
                      <InlineStack
                        gap="400"
                        align="space-between"
                        blockAlign="center"
                      >
                        <BlockStack gap="050">
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="h3" variant="headingSm">
                              {s.name}
                            </Text>
                            {entitled === true ? null : freeSnippetIds.includes(
                                s.id
                              ) ? (
                              <Badge tone="success">Free</Badge>
                            ) : (
                              <Badge tone="attention">Requires upgrade</Badge>
                            )}
                          </InlineStack>
                          <Text as="p" tone="subdued" variant="bodyXs">
                            ID:{" "}
                            <code
                              style={{
                                fontFamily: "monospace",
                                userSelect: "all",
                              }}
                              title="Copy this ID into the Snippet App Block in your theme to render this snippet full-width on product pages."
                            >
                              {s.id}
                            </code>
                          </Text>
                        </BlockStack>
                        <InlineStack gap="200">
                          <Button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(s.id);
                              } catch {
                                /* clipboard may be blocked — user can still
                                   triple-click + copy the id above */
                              }
                            }}
                          >
                            Copy ID
                          </Button>
                          <Button onClick={() => openEdit(s)}>Edit</Button>
                          <Button
                            tone="critical"
                            variant="tertiary"
                            onClick={() => setConfirmDelete(s)}
                          >
                            Delete
                          </Button>
                        </InlineStack>
                      </InlineStack>
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        aria-label={`Edit ${s.name}`}
                        className="snippet-preview-button"
                      >
                        <SnippetPreview html={s.html} />
                      </button>
                    </BlockStack>
                  </Box>
                </Box>
              ))}
            </BlockStack>
          </Card>
        )}

        {confirmDelete && (
          <Banner
            tone="warning"
            title={`Delete "${confirmDelete.name}"?`}
            action={{
              content: "Delete",
              onAction: () => doDelete(confirmDelete),
            }}
            secondaryAction={{
              content: "Cancel",
              onAction: () => setConfirmDelete(null),
            }}
          >
            <p>This can&apos;t be undone.</p>
          </Banner>
        )}
      </BlockStack>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Insert link"
        primaryAction={{ content: "Apply", onAction: applyLink }}
        secondaryActions={[
          {
            content: "Remove link",
            onAction: () => {
              editor?.chain().focus().unsetLink().run();
              setLinkOpen(false);
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
          min-height: 200px;
          outline: none;
          font-size: 14px;
          line-height: 1.5;
        }
        .ProseMirror p { margin: 0 0 12px 0; }
        .ProseMirror h2 { font-size: 1.4em; margin: 16px 0 8px; }
        .ProseMirror h3 { font-size: 1.2em; margin: 16px 0 6px; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 22px; margin-bottom: 12px; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; }
        .ProseMirror a { color: #ec4899; text-decoration: underline; }
        /* Make our inserted layout divs visible in the editor with a soft
           outline so the merchant can see the column boundaries while editing. */
        .ProseMirror div[style] {
          outline: 1px dashed rgba(236, 72, 153, 0.25);
          outline-offset: 2px;
        }
      `}</style>
    </Page>
  );
}

function Toolbar({
  editor,
  onPickLink,
  onInsert,
}: {
  editor: Editor;
  onPickLink: () => void;
  onInsert: (html: string) => void;
}) {
  return (
    <BlockStack gap="100">
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
          pressed={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
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

      <InlineStack gap="100" wrap>
        <Text as="span" tone="subdued">
          Insert layout:
        </Text>
        <Button onClick={() => onInsert(TWO_COL_INSERT)}>Two columns</Button>
        <Button onClick={() => onInsert(THREE_COL_INSERT)}>Three columns</Button>
        <Button onClick={() => onInsert(HERO_CTA_INSERT)}>Hero + CTA</Button>
        <Button onClick={() => onInsert(SPEC_ROW_INSERT)}>Spec row</Button>
      </InlineStack>
    </BlockStack>
  );
}

function SnippetPreview({ html }: { html: string }) {
  // Render the saved HTML scaled down behind a max-height + fade so each
  // snippet card stays a consistent size regardless of content length.
  // dangerouslySetInnerHTML is fine here — the HTML came from the same
  // merchant and is only ever rendered back to them in the admin.
  return (
    <Box
      padding="300"
      background="bg-surface-secondary"
      borderRadius="200"
      borderColor="border"
      borderWidth="025"
    >
      <div
        style={{
          position: "relative",
          maxHeight: 140,
          overflow: "hidden",
          fontSize: 13,
          lineHeight: 1.4,
          color: "#374151",
        }}
      >
        <div
          className="snippet-preview-html"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 40,
            background:
              "linear-gradient(to bottom, rgba(241,242,243,0), rgba(241,242,243,1))",
            pointerEvents: "none",
          }}
        />
      </div>
      <style jsx global>{`
        .snippet-preview-html p { margin: 0 0 6px 0; }
        .snippet-preview-html h2 { font-size: 1.1em; margin: 0 0 6px 0; font-weight: 600; }
        .snippet-preview-html h3 { font-size: 1em; margin: 0 0 4px 0; font-weight: 600; }
        .snippet-preview-html ul, .snippet-preview-html ol { padding-left: 18px; margin: 0 0 6px 0; }
        .snippet-preview-html li { margin-bottom: 2px; }
        .snippet-preview-html img { max-width: 100%; height: auto; border-radius: 4px; }
        .snippet-preview-html a { color: #ec4899; text-decoration: underline; }
        /* Neutralise the inline min-widths and flex-wrap the layout HTML
           uses for desktop sizing so multi-column rows still render
           side-by-side in the narrow preview card no matter what the
           outer Polaris card / theme container's max-width is. The saved
           HTML is untouched, so real product pages keep responsive wrap. */
        .snippet-preview-html div[style*="min-width"] { min-width: 0 !important; }
        .snippet-preview-html div[style*="flex-wrap"] { flex-wrap: nowrap !important; }
        /* Disable the snippet's own @container query inside the narrow
           preview card — otherwise a thumbnail-width wrapper would
           always trigger the mobile stack rule and the preview would
           never show a desktop side-by-side layout. */
        .snippet-preview-html .pc-snippet-wrap { container-type: normal !important; }
        .snippet-preview-html .pc-snippet-row { flex-direction: row !important; flex-wrap: nowrap !important; }
        .snippet-preview-html .pc-snippet-row > .pc-snippet-col { flex: 1 1 0 !important; min-width: 0 !important; width: auto !important; max-width: none !important; }
        .snippet-preview-html { max-width: none !important; }
        .snippet-preview-button {
          display: block;
          width: 100%;
          padding: 0;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          border-radius: 8px;
          transition: box-shadow 120ms, transform 120ms;
        }
        .snippet-preview-button:hover {
          box-shadow: 0 0 0 2px #ec4899;
        }
        .snippet-preview-button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px #ec4899;
        }
      `}</style>
    </Box>
  );
}
