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

const TWO_COL_INSERT = `<div style="display:flex;gap:24px;flex-wrap:wrap;"><div style="flex:1;min-width:240px;"><h3>Column 1 heading</h3><p>Add column 1 text here.</p></div><div style="flex:1;min-width:240px;"><h3>Column 2 heading</h3><p>Add column 2 text here.</p></div></div><p></p>`;

const THREE_COL_INSERT = `<div style="display:flex;gap:20px;flex-wrap:wrap;"><div style="flex:1;min-width:200px;"><h3>Column 1</h3><p>Add text.</p></div><div style="flex:1;min-width:200px;"><h3>Column 2</h3><p>Add text.</p></div><div style="flex:1;min-width:200px;"><h3>Column 3</h3><p>Add text.</p></div></div><p></p>`;

const HERO_CTA_INSERT = `<h2>Bold headline goes here</h2><p>Add a short supporting paragraph here.</p><p><a href="#" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;">Button label</a></p><p></p>`;

const SPEC_ROW_INSERT = `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #e5e7eb;"><div style="flex:1;min-width:120px;font-weight:600;"><p>Spec name</p></div><div style="flex:2;min-width:200px;"><p>Spec value</p></div></div><p></p>`;

type Snippet = {
  id: string;
  name: string;
  html: string;
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

  function openNew() {
    setDraftName("");
    setLayout([]);
    editor?.commands.setContent("");
    setMode("builder");
    setEditing("new");
  }

  function openEdit(s: Snippet) {
    setDraftName(s.name);
    editor?.commands.setContent(s.html);
    setLayout([]);
    // Existing snippets default to HTML mode since we can't reliably parse
    // arbitrary HTML back into our block model.
    setMode("html");
    setEditing(s);
  }

  function closeEditor() {
    setEditing(null);
    setDraftName("");
    setLayout([]);
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
    if (!draftName.trim() || !html.trim() || html === "<p></p>") return;
    setSaving(true);
    try {
      if (editing === "new") {
        const res = await appBridgeFetch("/api/app/snippets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: draftName, html }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      } else {
        const res = await appBridgeFetch(
          `/api/app/snippets/${encodeURIComponent(editing.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: draftName, html }),
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
      title="My snippets"
      subtitle="Reusable HTML blocks you can stamp into any product description."
      backAction={{ content: "Home", url: "/app" }}
      primaryAction={
        editing
          ? undefined
          : { content: "New snippet", onAction: openNew }
      }
    >
      <BlockStack gap="400">
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
                onChange={setDraftName}
                placeholder="e.g. Returns policy"
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
                  disabled={!draftName.trim()}
                >
                  {editing === "new" ? "Create snippet" : "Save"}
                </Button>
                <InlineStack align="center">
                  <Button variant="tertiary" onClick={closeEditor} disabled={saving}>
                    Cancel
                  </Button>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        )}

        {status.kind === "loading" ? (
          <Card>
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <Text as="p">Loading snippets…</Text>
            </InlineStack>
          </Card>
        ) : snippets.length === 0 && !editing ? (
          <Card>
            <EmptyState
              heading="No snippets yet"
              action={{ content: "Create your first snippet", onAction: openNew }}
              image=""
            >
              <p>
                Save reusable blocks here — warranty info, return policy, size
                charts, brand story — and stamp them into any product
                description from the Description Layouts modal.
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
                    <InlineStack gap="400" align="space-between" blockAlign="start">
                      <BlockStack gap="100">
                        <Text as="h3" variant="headingSm">
                          {s.name}
                        </Text>
                        <Text as="p" tone="subdued" truncate>
                          {previewText(s.html)}
                        </Text>
                      </BlockStack>
                      <InlineStack gap="200">
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

function previewText(html: string): string {
  const stripped = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length > 140 ? stripped.slice(0, 140) + "…" : stripped;
}
