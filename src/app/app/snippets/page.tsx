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
    editor?.commands.setContent("");
    setEditing("new");
  }

  function openEdit(s: Snippet) {
    setDraftName(s.name);
    editor?.commands.setContent(s.html);
    setEditing(s);
  }

  function closeEditor() {
    setEditing(null);
    setDraftName("");
    editor?.commands.setContent("");
  }

  function applyStarter(starterId: string) {
    const starter = STARTERS.find((s) => s.id === starterId);
    if (!starter || !editor) return;
    editor.commands.setContent(starter.html);
  }

  async function save() {
    if (!editing || !editor) return;
    const html = editor.getHTML();
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

              <InlineStack gap="200" align="end">
                <Button onClick={closeEditor} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={save}
                  loading={saving}
                  disabled={!draftName.trim()}
                >
                  {editing === "new" ? "Create snippet" : "Save"}
                </Button>
              </InlineStack>
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
        .ProseMirror table { border-collapse: collapse; margin: 8px 0; }
        .ProseMirror table td, .ProseMirror table th { padding: 6px 12px 6px 0; vertical-align: top; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; }
        .ProseMirror a { color: #ec4899; text-decoration: underline; }
      `}</style>
    </Page>
  );
}

function Toolbar({
  editor,
  onPickLink,
}: {
  editor: Editor;
  onPickLink: () => void;
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
  );
}

function previewText(html: string): string {
  const stripped = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length > 140 ? stripped.slice(0, 140) + "…" : stripped;
}
