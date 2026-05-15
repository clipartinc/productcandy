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
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { appBridgeFetch } from "@/lib/appBridgeFetch";

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
  const [draftHtml, setDraftHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Snippet | null>(null);

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
    setDraftHtml("");
    setEditing("new");
  }

  function openEdit(s: Snippet) {
    setDraftName(s.name);
    setDraftHtml(s.html);
    setEditing(s);
  }

  function closeEditor() {
    setEditing(null);
    setDraftName("");
    setDraftHtml("");
  }

  async function save() {
    if (!editing) return;
    if (!draftName.trim() || !draftHtml.trim()) return;
    setSaving(true);
    try {
      if (editing === "new") {
        const res = await appBridgeFetch("/api/app/snippets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: draftName, html: draftHtml }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      } else {
        const res = await appBridgeFetch(
          `/api/app/snippets/${encodeURIComponent(editing.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: draftName, html: draftHtml }),
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

        {editing && (
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
              <TextField
                label="HTML"
                autoComplete="off"
                multiline={10}
                value={draftHtml}
                onChange={setDraftHtml}
                helpText="Paste HTML or write your own. Use the templates page or raw markup — it's stamped as-is into the product description."
              />
              <InlineStack gap="200" align="end">
                <Button onClick={closeEditor} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={save}
                  loading={saving}
                  disabled={!draftName.trim() || !draftHtml.trim()}
                >
                  {editing === "new" ? "Create" : "Save"}
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
                Save reusable HTML blocks here — warranty info, return policy,
                size charts, brand story — and stamp them into any product
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
    </Page>
  );
}

function previewText(html: string): string {
  const stripped = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length > 140 ? stripped.slice(0, 140) + "…" : stripped;
}

