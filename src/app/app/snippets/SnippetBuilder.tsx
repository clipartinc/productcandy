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
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
  type SubBlock,
  type SubBlockKind,
  type ColumnContent,
  BLOCK_LABELS,
  BLOCK_DESCRIPTIONS,
  BLOCK_ORDER,
  SUB_BLOCK_LABELS,
  SUB_BLOCK_ORDER,
  newBlock,
  newSubBlock,
  blocksToHtml,
} from "@/lib/snippetBlocks";
import { BlockIcon, BlockPreview } from "./BlockIcons";

const PALETTE_PREFIX = "palette-";

export function SnippetBuilder({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draggingKind, setDraggingKind] = useState<BlockKind | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleAdd(kind: BlockKind) {
    const block = newBlock(kind);
    onChange([...blocks, block]);
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
    if (expandedId === id) setExpandedId(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id.toString();
    if (id.startsWith(PALETTE_PREFIX)) {
      setDraggingKind(id.slice(PALETTE_PREFIX.length) as BlockKind);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingKind(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId.startsWith(PALETTE_PREFIX)) {
      // Palette → canvas
      const kind = activeId.slice(PALETTE_PREFIX.length) as BlockKind;
      const block = newBlock(kind);
      // Drop position: if over a canvas item, insert above it; else append
      const overIndex = blocks.findIndex((b) => b.id === overId);
      if (overIndex >= 0) {
        const next = [...blocks];
        next.splice(overIndex, 0, block);
        onChange(next);
      } else {
        onChange([...blocks, block]);
      }
    } else if (activeId !== overId) {
      // Reorder within canvas
      const oldIndex = blocks.findIndex((b) => b.id === activeId);
      const newIndex = blocks.findIndex((b) => b.id === overId);
      if (oldIndex >= 0 && newIndex >= 0) {
        onChange(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  }

  const html = blocksToHtml(blocks);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <BlockStack gap="400">
        {/* Palette */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm">
                Drag a section onto your layout
              </Text>
              <Button onClick={() => setPreviewOpen((o) => !o)}>
                {previewOpen ? "Hide HTML preview" : "Generate HTML"}
              </Button>
            </InlineStack>
            <Text as="p" tone="subdued">
              Drag any section type below into the canvas. You can rearrange,
              add more, and optionally fill in the content later.
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              {BLOCK_ORDER.map((kind) => (
                <PaletteItem key={kind} kind={kind} onClick={() => handleAdd(kind)} />
              ))}
            </div>
          </BlockStack>
        </Card>

        {/* Canvas */}
        <Canvas
          blocks={blocks}
          expandedId={expandedId}
          onExpand={setExpandedId}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />

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
                Live preview
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

      <DragOverlay>
        {draggingKind && (
          <div
            style={{
              padding: 12,
              border: "1px solid #ec4899",
              borderRadius: 8,
              background: "#fdf2f8",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              width: 150,
            }}
          >
            <BlockIcon kind={draggingKind} />
            <span style={{ fontSize: 12, color: "#374151" }}>
              {BLOCK_LABELS[draggingKind]}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function PaletteItem({
  kind,
  onClick,
}: {
  kind: BlockKind;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${kind}`,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      {...attributes}
      {...listeners}
      aria-label={`Add ${BLOCK_LABELS[kind]}`}
      title={BLOCK_DESCRIPTIONS[kind]}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.4 : 1,
        transition: "border-color 120ms, background 120ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#ec4899";
        e.currentTarget.style.background = "#fdf2f8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.background = "#fff";
      }}
    >
      <BlockIcon kind={kind} />
      <span style={{ fontSize: 12, color: "#374151", textAlign: "center" }}>
        {BLOCK_LABELS[kind]}
      </span>
    </button>
  );
}

function Canvas({
  blocks,
  expandedId,
  onExpand,
  onUpdate,
  onDelete,
}: {
  blocks: Block[];
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Block>) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop" });

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">
          Your layout
        </Text>
        <div
          ref={setNodeRef}
          style={{
            minHeight: blocks.length === 0 ? 180 : 80,
            border: blocks.length === 0
              ? `2px dashed ${isOver ? "#ec4899" : "#d1d5db"}`
              : "none",
            borderRadius: 8,
            padding: blocks.length === 0 ? 24 : 0,
            background: isOver ? "#fdf2f8" : "transparent",
            transition: "background 120ms, border-color 120ms",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {blocks.length === 0 ? (
            <Text as="p" tone="subdued" alignment="center">
              Drag a section from the palette above to start building your
              layout.
            </Text>
          ) : (
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <BlockStack gap="200">
                {blocks.map((b) => (
                  <CanvasItem
                    key={b.id}
                    block={b}
                    expanded={expandedId === b.id}
                    onExpand={() => onExpand(expandedId === b.id ? null : b.id)}
                    onUpdate={(patch) => onUpdate(b.id, patch)}
                    onDelete={() => onDelete(b.id)}
                  />
                ))}
              </BlockStack>
            </SortableContext>
          )}
        </div>
      </BlockStack>
    </Card>
  );
}

function CanvasItem({
  block,
  expanded,
  onExpand,
  onUpdate,
  onDelete,
}: {
  block: Block;
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (patch: Partial<Block>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: "100%",
  };

  const isPlaceholder = block.filled === false;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          background: "#fff",
          border: isPlaceholder
            ? "1px dashed #d1d5db"
            : "1px solid #ec4899",
          borderRadius: 10,
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header with drag handle, label, action buttons */}
        <div
          style={{
            background: isPlaceholder ? "#f9fafb" : "#fdf2f8",
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
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
                  padding: "2px 6px",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ⋮⋮
              </button>
              <span
                style={{
                  fontSize: 13,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                {BLOCK_LABELS[block.kind]}
                {!isPlaceholder && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#10b981" }}>
                    ✓ filled
                  </span>
                )}
              </span>
            </InlineStack>
            <InlineStack gap="100">
              <Button size="micro" onClick={onExpand}>
                {expanded ? "Done" : isPlaceholder ? "Add content" : "Edit"}
              </Button>
              <Button
                size="micro"
                tone="critical"
                variant="tertiary"
                onClick={onDelete}
              >
                Delete
              </Button>
            </InlineStack>
          </InlineStack>
        </div>

        {/* Visual preview (large) */}
        <div style={{ padding: "8px 12px" }}>
          <BlockPreview block={block} />
        </div>

        {expanded && (
          <Box padding="300">
            <BlockStack gap="200">
              <Divider />
              <BlockEditor
                block={block}
                onChange={(patch) =>
                  onUpdate({ ...patch, filled: true } as Partial<Block>)
                }
              />
            </BlockStack>
          </Box>
        )}
      </div>
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
              { label: "Big (H2)", value: "2" },
              { label: "Medium (H3)", value: "3" },
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
              { label: "Bulleted", value: "false" },
              { label: "Numbered", value: "true" },
            ]}
            value={String(block.ordered)}
            onChange={(v) => onChange({ ordered: v === "true" } as Partial<Block>)}
          />
          <TextField
            label="Items (one per line)"
            autoComplete="off"
            multiline={4}
            value={block.items.join("\n")}
            onChange={(v) => onChange({ items: v.split("\n") } as Partial<Block>)}
          />
        </BlockStack>
      );
    case "columns":
      return (
        <BlockStack gap="300">
          <Select
            label="Number of columns"
            options={[
              { label: "2 columns", value: "2" },
              { label: "3 columns", value: "3" },
              { label: "4 columns", value: "4" },
            ]}
            value={String(block.count)}
            onChange={(v) => {
              const count = Number(v) as 2 | 3 | 4;
              const cur = block.columns;
              const next: ColumnContent[] = Array.from({ length: count }).map(
                (_, i) => {
                  if (cur[i]) return cur[i];
                  const h = newSubBlock("heading");
                  const p = newSubBlock("paragraph");
                  return [
                    h.kind === "heading" ? { ...h, text: `Column ${i + 1} heading` } : h,
                    p.kind === "paragraph" ? { ...p, text: `Column ${i + 1} text.` } : p,
                  ] as ColumnContent;
                }
              );
              onChange({ count, columns: next } as Partial<Block>);
            }}
          />
          <Text as="p" tone="subdued">
            Each column can have multiple pieces. Add a heading, paragraph,
            list, image, or button — in any order.
          </Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${block.count}, minmax(0, 1fr))`,
              gap: 12,
            }}
          >
            {block.columns.map((col, i) => (
              <ColumnEditor
                key={i}
                index={i}
                items={col}
                onChange={(items) => {
                  const next = block.columns.map((c, j) => (j === i ? items : c));
                  onChange({ columns: next } as Partial<Block>);
                }}
              />
            ))}
          </div>
        </BlockStack>
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

function ColumnEditor({
  index,
  items,
  onChange,
}: {
  index: number;
  items: ColumnContent;
  onChange: (items: ColumnContent) => void;
}) {
  const [addKind, setAddKind] = useState<SubBlockKind>("paragraph");

  function add() {
    onChange([...items, newSubBlock(addKind)]);
  }

  function update(id: string, patch: Partial<SubBlock>) {
    onChange(items.map((s) => (s.id === id ? ({ ...s, ...patch } as SubBlock) : s)));
  }

  function remove(id: string) {
    onChange(items.filter((s) => s.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const i = items.findIndex((s) => s.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 8,
        background: "#f9fafb",
      }}
    >
      <BlockStack gap="200">
        <Text as="p" fontWeight="semibold">
          Column {index + 1}
        </Text>
        {items.length === 0 && (
          <Text as="p" tone="subdued">
            Empty. Add a piece below.
          </Text>
        )}
        <BlockStack gap="200">
          {items.map((s, i) => (
            <SubBlockEditor
              key={s.id}
              sub={s}
              isFirst={i === 0}
              isLast={i === items.length - 1}
              onChange={(patch) => update(s.id, patch)}
              onMoveUp={() => move(s.id, -1)}
              onMoveDown={() => move(s.id, 1)}
              onDelete={() => remove(s.id)}
            />
          ))}
        </BlockStack>
        <InlineStack gap="100" blockAlign="center">
          <Select
            label="Add"
            labelHidden
            options={SUB_BLOCK_ORDER.map((k) => ({
              label: SUB_BLOCK_LABELS[k],
              value: k,
            }))}
            value={addKind}
            onChange={(v) => setAddKind(v as SubBlockKind)}
          />
          <Button onClick={add}>+ Add to column</Button>
        </InlineStack>
      </BlockStack>
    </div>
  );
}

function SubBlockEditor({
  sub,
  isFirst,
  isLast,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  sub: SubBlock;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<SubBlock>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        padding: 8,
      }}
    >
      <BlockStack gap="100">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" fontWeight="semibold">
            {SUB_BLOCK_LABELS[sub.kind]}
          </Text>
          <InlineStack gap="100">
            <Button size="micro" onClick={onMoveUp} disabled={isFirst}>
              ↑
            </Button>
            <Button size="micro" onClick={onMoveDown} disabled={isLast}>
              ↓
            </Button>
            <Button size="micro" tone="critical" variant="tertiary" onClick={onDelete}>
              ✕
            </Button>
          </InlineStack>
        </InlineStack>
        <SubBlockFields sub={sub} onChange={onChange} />
      </BlockStack>
    </div>
  );
}

function SubBlockFields({
  sub,
  onChange,
}: {
  sub: SubBlock;
  onChange: (patch: Partial<SubBlock>) => void;
}) {
  switch (sub.kind) {
    case "heading":
      return (
        <BlockStack gap="100">
          <Select
            label="Size"
            labelHidden
            options={[
              { label: "Big (H2)", value: "2" },
              { label: "Medium (H3)", value: "3" },
            ]}
            value={String(sub.level)}
            onChange={(v) =>
              onChange({ level: Number(v) as 2 | 3 } as Partial<SubBlock>)
            }
          />
          <TextField
            label="Text"
            labelHidden
            autoComplete="off"
            value={sub.text}
            onChange={(v) => onChange({ text: v } as Partial<SubBlock>)}
          />
        </BlockStack>
      );
    case "paragraph":
      return (
        <TextField
          label="Text"
          labelHidden
          autoComplete="off"
          multiline={2}
          value={sub.text}
          onChange={(v) => onChange({ text: v } as Partial<SubBlock>)}
        />
      );
    case "list":
      return (
        <BlockStack gap="100">
          <Select
            label="Type"
            labelHidden
            options={[
              { label: "Bulleted", value: "false" },
              { label: "Numbered", value: "true" },
            ]}
            value={String(sub.ordered)}
            onChange={(v) =>
              onChange({ ordered: v === "true" } as Partial<SubBlock>)
            }
          />
          <TextField
            label="Items"
            labelHidden
            autoComplete="off"
            multiline={3}
            value={sub.items.join("\n")}
            onChange={(v) =>
              onChange({ items: v.split("\n") } as Partial<SubBlock>)
            }
          />
        </BlockStack>
      );
    case "image":
      return (
        <BlockStack gap="100">
          <TextField
            label="URL"
            labelHidden
            autoComplete="off"
            placeholder="Image URL"
            value={sub.url}
            onChange={(v) => onChange({ url: v } as Partial<SubBlock>)}
          />
          <TextField
            label="Alt"
            labelHidden
            autoComplete="off"
            placeholder="Alt text"
            value={sub.alt}
            onChange={(v) => onChange({ alt: v } as Partial<SubBlock>)}
          />
        </BlockStack>
      );
    case "button":
      return (
        <BlockStack gap="100">
          <TextField
            label="Label"
            labelHidden
            autoComplete="off"
            placeholder="Button label"
            value={sub.label}
            onChange={(v) => onChange({ label: v } as Partial<SubBlock>)}
          />
          <TextField
            label="URL"
            labelHidden
            autoComplete="off"
            placeholder="https://…"
            value={sub.url}
            onChange={(v) => onChange({ url: v } as Partial<SubBlock>)}
          />
        </BlockStack>
      );
  }
}
