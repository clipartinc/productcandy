"use client";

import {
  BlockStack,
  InlineStack,
  Text,
  Button,
  Card,
  TextField,
  Select,
  Box,
  Divider,
} from "@shopify/polaris";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import {
  type Block,
  type BlockKind,
  BLOCK_LABELS,
  newBlock,
  blocksToHtml,
} from "@/lib/snippetBlocks";

export function SnippetBuilder({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const [addKind, setAddKind] = useState<BlockKind>("paragraph");
  const [previewOpen, setPreviewOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleAdd() {
    onChange([...blocks, newBlock(addKind)]);
  }

  function handleUpdate(id: string, patch: Partial<Block>) {
    onChange(
      blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as Block) : b
      )
    );
  }

  function handleDelete(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        onChange(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  }

  const html = blocksToHtml(blocks);

  return (
    <BlockStack gap="400">
      <InlineStack gap="200" align="space-between" blockAlign="center" wrap>
        <InlineStack gap="200" blockAlign="center">
          <Select
            label="Add section"
            labelHidden
            options={(Object.keys(BLOCK_LABELS) as BlockKind[]).map((k) => ({
              label: BLOCK_LABELS[k],
              value: k,
            }))}
            value={addKind}
            onChange={(v) => setAddKind(v as BlockKind)}
          />
          <Button onClick={handleAdd} variant="primary">
            + Add section
          </Button>
        </InlineStack>
        <Button onClick={() => setPreviewOpen((o) => !o)}>
          {previewOpen ? "Hide HTML preview" : "Generate HTML"}
        </Button>
      </InlineStack>

      {blocks.length === 0 ? (
        <Card>
          <Box padding="400">
            <Text as="p" tone="subdued" alignment="center">
              No sections yet. Pick a section type above and click <strong>+ Add section</strong> to start building.
            </Text>
          </Box>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <BlockStack gap="300">
              {blocks.map((b) => (
                <SortableBlock
                  key={b.id}
                  block={b}
                  onChange={(patch) => handleUpdate(b.id, patch)}
                  onDelete={() => handleDelete(b.id)}
                />
              ))}
            </BlockStack>
          </SortableContext>
        </DndContext>
      )}

      {previewOpen && (
        <Card>
          <BlockStack gap="200">
            <Text as="p" fontWeight="semibold">
              Generated HTML (saved when you Save the snippet)
            </Text>
            <Box
              padding="300"
              background="bg-surface-secondary"
              borderRadius="200"
              borderColor="border"
              borderWidth="025"
            >
              <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {html || "<!-- empty -->"}
              </pre>
            </Box>
            <Divider />
            <Text as="p" fontWeight="semibold">
              Preview
            </Text>
            <Box
              padding="300"
              background="bg-surface"
              borderRadius="200"
              borderColor="border"
              borderWidth="025"
            >
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </Box>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}

function SortableBlock({
  block,
  onChange,
  onDelete,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <BlockStack gap="300">
          <InlineStack gap="200" align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
                style={{
                  cursor: "grab",
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ⋮⋮
              </button>
              <Text as="h3" variant="headingSm">
                {BLOCK_LABELS[block.kind]}
              </Text>
            </InlineStack>
            <Button tone="critical" variant="tertiary" onClick={onDelete}>
              Delete
            </Button>
          </InlineStack>
          <BlockEditor block={block} onChange={onChange} />
        </BlockStack>
      </Card>
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
}) {
  switch (block.kind) {
    case "heading":
      return (
        <BlockStack gap="200">
          <Select
            label="Size"
            options={[
              { label: "H2 (large)", value: "2" },
              { label: "H3 (medium)", value: "3" },
            ]}
            value={String(block.level)}
            onChange={(v) => onChange({ level: Number(v) as 2 | 3 } as Partial<Block>)}
          />
          <TextField
            label="Text"
            autoComplete="off"
            value={block.text}
            onChange={(v) => onChange({ text: v } as Partial<Block>)}
          />
        </BlockStack>
      );
    case "paragraph":
      return (
        <TextField
          label="Text"
          autoComplete="off"
          multiline={3}
          value={block.text}
          onChange={(v) => onChange({ text: v } as Partial<Block>)}
          helpText="Blank lines split into separate paragraphs."
        />
      );
    case "list":
      return (
        <BlockStack gap="200">
          <Select
            label="Type"
            options={[
              { label: "Bullet list", value: "false" },
              { label: "Numbered list", value: "true" },
            ]}
            value={String(block.ordered)}
            onChange={(v) => onChange({ ordered: v === "true" } as Partial<Block>)}
          />
          <TextField
            label="Items (one per line)"
            autoComplete="off"
            multiline={4}
            value={block.items.join("\n")}
            onChange={(v) =>
              onChange({ items: v.split("\n") } as Partial<Block>)
            }
          />
        </BlockStack>
      );
    case "two-column":
      return (
        <InlineStack gap="200" wrap>
          <BlockStack gap="200">
            <TextField
              label="Column 1 heading"
              autoComplete="off"
              value={block.h1}
              onChange={(v) => onChange({ h1: v } as Partial<Block>)}
            />
            <TextField
              label="Column 1 text"
              autoComplete="off"
              multiline={3}
              value={block.c1}
              onChange={(v) => onChange({ c1: v } as Partial<Block>)}
            />
          </BlockStack>
          <BlockStack gap="200">
            <TextField
              label="Column 2 heading"
              autoComplete="off"
              value={block.h2}
              onChange={(v) => onChange({ h2: v } as Partial<Block>)}
            />
            <TextField
              label="Column 2 text"
              autoComplete="off"
              multiline={3}
              value={block.c2}
              onChange={(v) => onChange({ c2: v } as Partial<Block>)}
            />
          </BlockStack>
        </InlineStack>
      );
    case "three-column":
      return (
        <InlineStack gap="200" wrap>
          <BlockStack gap="200">
            <TextField label="Col 1 heading" autoComplete="off" value={block.h1} onChange={(v) => onChange({ h1: v } as Partial<Block>)} />
            <TextField label="Col 1 text" autoComplete="off" multiline={3} value={block.c1} onChange={(v) => onChange({ c1: v } as Partial<Block>)} />
          </BlockStack>
          <BlockStack gap="200">
            <TextField label="Col 2 heading" autoComplete="off" value={block.h2} onChange={(v) => onChange({ h2: v } as Partial<Block>)} />
            <TextField label="Col 2 text" autoComplete="off" multiline={3} value={block.c2} onChange={(v) => onChange({ c2: v } as Partial<Block>)} />
          </BlockStack>
          <BlockStack gap="200">
            <TextField label="Col 3 heading" autoComplete="off" value={block.h3} onChange={(v) => onChange({ h3: v } as Partial<Block>)} />
            <TextField label="Col 3 text" autoComplete="off" multiline={3} value={block.c3} onChange={(v) => onChange({ c3: v } as Partial<Block>)} />
          </BlockStack>
        </InlineStack>
      );
    case "hero-cta":
      return (
        <BlockStack gap="200">
          <TextField label="Headline" autoComplete="off" value={block.headline} onChange={(v) => onChange({ headline: v } as Partial<Block>)} />
          <TextField label="Body" autoComplete="off" multiline={3} value={block.body} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
          <InlineStack gap="200" wrap>
            <TextField label="Button label" autoComplete="off" value={block.ctaLabel} onChange={(v) => onChange({ ctaLabel: v } as Partial<Block>)} />
            <TextField label="Button URL" autoComplete="off" value={block.ctaUrl} onChange={(v) => onChange({ ctaUrl: v } as Partial<Block>)} />
          </InlineStack>
        </BlockStack>
      );
    case "image":
      return (
        <BlockStack gap="200">
          <TextField
            label="Image URL"
            autoComplete="off"
            value={block.url}
            onChange={(v) => onChange({ url: v } as Partial<Block>)}
            helpText="Paste a Shopify CDN URL or any public image URL."
          />
          <TextField
            label="Alt text"
            autoComplete="off"
            value={block.alt}
            onChange={(v) => onChange({ alt: v } as Partial<Block>)}
          />
        </BlockStack>
      );
    case "spec-row":
      return (
        <InlineStack gap="200" wrap>
          <TextField label="Spec name" autoComplete="off" value={block.key} onChange={(v) => onChange({ key: v } as Partial<Block>)} />
          <TextField label="Spec value" autoComplete="off" value={block.value} onChange={(v) => onChange({ value: v } as Partial<Block>)} />
        </InlineStack>
      );
    case "html":
      return (
        <TextField
          label="Raw HTML"
          autoComplete="off"
          multiline={4}
          value={block.html}
          onChange={(v) => onChange({ html: v } as Partial<Block>)}
        />
      );
  }
}
