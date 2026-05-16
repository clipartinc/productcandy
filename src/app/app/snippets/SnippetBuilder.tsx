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
  MeasuringStrategy,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Fragment, useState } from "react";
import {
  type Block,
  type BlockKind,
  type Column,
  type Layout,
  type Row,
  type ListStyle,
  BLOCK_LABELS,
  BLOCK_DESCRIPTIONS,
  BLOCK_ORDER,
  newBlock,
  newColumn,
  newRow,
  layoutToHtml,
} from "@/lib/snippetBlocks";
import { BlockIcon, BlockPreview } from "./BlockIcons";

const freshId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function cloneRowDeep(row: Row): Row {
  return {
    id: freshId(),
    columns: row.columns.map((col) => ({
      id: freshId(),
      blocks: col.blocks.map((b) => ({ ...b, id: freshId() })),
    })),
  };
}

const PALETTE_PREFIX = "palette-";
const EXISTING_PREFIX = "existing-"; // existing-{blockId} — for canvas blocks the user is rearranging
const ROW_DROP_PREFIX = "row-drop-";
const NEW_ROW_PREFIX = "new-row-";
// IDs use "|" as a separator since rowId/colId are UUIDs that themselves
// contain "-". This keeps parsing trivial and unambiguous.
const COL_INSERT_PREFIX = "col-insert|"; // col-insert|{rowId}|{index}
const COL_DROP_PREFIX = "col-drop|"; // col-drop|{rowId}|{colId} — column body fallback
const BLOCK_INSERT_PREFIX = "block-insert|"; // block-insert|{rowId}|{colId}|{index}
// block-side|{side}|{blockId} — per-block side-by-side drop target.
// When dropped, the target block's column is split so the dropped block lands
// genuinely beside the target block (not beside the whole stacked column).
const BLOCK_SIDE_PREFIX = "block-side|";

// Custom collision detection: prefer narrow insert slots when the pointer is
// directly inside one (so dropping in the visible "+" gap inserts at that
// exact position). Fall back to pointerWithin → rectIntersection →
// closestCenter so dropping anywhere reasonable still finds a target.
const detectCollisions: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) {
    // Highest-precision targets first: per-block side strip (side-by-side at
    // this block) > between-block (stack) > between-column (side-by-side at
    // row edge) > between-row > column body > row body.
    const blockSide = pointer.find((c) =>
      c.id.toString().startsWith(BLOCK_SIDE_PREFIX)
    );
    if (blockSide) return [blockSide];
    const blockSlot = pointer.find((c) =>
      c.id.toString().startsWith(BLOCK_INSERT_PREFIX)
    );
    if (blockSlot) return [blockSlot];
    const colSlot = pointer.find((c) =>
      c.id.toString().startsWith(COL_INSERT_PREFIX)
    );
    if (colSlot) return [colSlot];

    // Near-miss snap: pointer is in the column body but close to a side
    // strip. Pull the over target to the nearest BlockSideDrop within 28px
    // of the pointer, so the user doesn't have to land exactly on the strip.
    const colBody = pointer.find((c) =>
      c.id.toString().startsWith(COL_DROP_PREFIX)
    );
    if (colBody && args.pointerCoordinates) {
      const px = args.pointerCoordinates.x;
      const py = args.pointerCoordinates.y;
      const snapDist = 28;
      let best: { id: string; dist: number } | null = null;
      for (const container of args.droppableContainers) {
        const id = container.id.toString();
        if (!id.startsWith(BLOCK_SIDE_PREFIX)) continue;
        const rect = container.rect.current;
        if (!rect || rect.width === 0 || rect.height === 0) continue;
        const dx =
          px < rect.left ? rect.left - px : px > rect.right ? px - rect.right : 0;
        const dy =
          py < rect.top ? rect.top - py : py > rect.bottom ? py - rect.bottom : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= snapDist && (!best || dist < best.dist)) {
          best = { id, dist };
        }
      }
      if (best) return [{ id: best.id }];
    }

    const newRowSlot = pointer.find((c) =>
      c.id.toString().startsWith(NEW_ROW_PREFIX)
    );
    if (newRowSlot) return [newRowSlot];
    if (colBody) return [colBody];
    return pointer;
  }
  const rect = rectIntersection(args);
  if (rect.length > 0) return rect;
  return closestCenter(args);
};

export function SnippetBuilder({
  layout,
  onChange,
}: {
  layout: Layout;
  onChange: (layout: Layout) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draggingKind, setDraggingKind] = useState<BlockKind | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleAdd(kind: BlockKind) {
    const block = newBlock(kind);
    onChange([...layout, newRow([block])]);
  }

  function handleUpdateBlock(blockId: string, patch: Partial<Block>) {
    onChange(
      layout.map((row) => ({
        ...row,
        columns: row.columns.map((col) => ({
          ...col,
          blocks: col.blocks.map((b) =>
            b.id === blockId ? ({ ...b, ...patch } as Block) : b
          ),
        })),
      }))
    );
  }

  function handleDeleteBlock(blockId: string) {
    const next = layout
      .map((row) => ({
        ...row,
        columns: row.columns
          .map((col) => ({
            ...col,
            blocks: col.blocks.filter((b) => b.id !== blockId),
          }))
          .filter((col) => col.blocks.length > 0),
      }))
      .filter((row) => row.columns.length > 0);
    onChange(next);
    if (expandedId === blockId) setExpandedId(null);
  }

  function handleDuplicateRow(rowId: string) {
    const idx = layout.findIndex((r) => r.id === rowId);
    if (idx < 0) return;
    const next = layout.slice();
    next.splice(idx + 1, 0, cloneRowDeep(layout[idx]));
    onChange(next);
  }

  function handleDeleteRow(rowId: string) {
    onChange(layout.filter((r) => r.id !== rowId));
  }

  // When the user drops next to a specific block in a stacked single-column
  // row, split the column so the new block sits genuinely beside that block
  // (not beside the whole column). Multi-column rows fall back to adding a
  // sibling column at the target column's edge, since splitting one column
  // out of many would leave the others in an undefined position.
  function applyBlockSideDrop(
    sourceLayout: Layout,
    targetBlockId: string,
    side: "left" | "right",
    blockToInsert: Block
  ): Layout | null {
    let rIdx = -1;
    let cIdx = -1;
    let bIdx = -1;
    outer: for (let r = 0; r < sourceLayout.length; r++) {
      for (let c = 0; c < sourceLayout[r].columns.length; c++) {
        const i = sourceLayout[r].columns[c].blocks.findIndex(
          (b) => b.id === targetBlockId
        );
        if (i >= 0) {
          rIdx = r;
          cIdx = c;
          bIdx = i;
          break outer;
        }
      }
    }
    if (rIdx < 0) return null;

    const row = sourceLayout[rIdx];
    const col = row.columns[cIdx];

    if (row.columns.length === 1 && col.blocks.length > 1) {
      const blocksBefore = col.blocks.slice(0, bIdx);
      const target = col.blocks[bIdx];
      const blocksAfter = col.blocks.slice(bIdx + 1);

      const sideCols =
        side === "left"
          ? [newColumn([blockToInsert]), newColumn([target])]
          : [newColumn([target]), newColumn([blockToInsert])];

      const newRows: Row[] = [];
      if (blocksBefore.length > 0) {
        newRows.push({ ...newRow(), columns: [newColumn(blocksBefore)] });
      }
      newRows.push({ ...newRow(), columns: sideCols });
      if (blocksAfter.length > 0) {
        newRows.push({ ...newRow(), columns: [newColumn(blocksAfter)] });
      }

      const next = sourceLayout.slice();
      next.splice(rIdx, 1, ...newRows);
      return next;
    }

    const insertIdx = side === "left" ? cIdx : cIdx + 1;
    return sourceLayout.map((r) => {
      if (r.id !== row.id) return r;
      const cols = r.columns.slice();
      cols.splice(insertIdx, 0, newColumn([blockToInsert]));
      return { ...r, columns: cols };
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id.toString();
    if (id.startsWith(PALETTE_PREFIX)) {
      setDraggingKind(id.slice(PALETTE_PREFIX.length) as BlockKind);
    } else if (id.startsWith(EXISTING_PREFIX)) {
      setDraggingBlockId(id.slice(EXISTING_PREFIX.length));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingKind(null);
    setDraggingBlockId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId.startsWith(EXISTING_PREFIX)) {
      handleExistingBlockDrop(activeId.slice(EXISTING_PREFIX.length), overId);
      return;
    }

    if (activeId.startsWith(PALETTE_PREFIX)) {
      const kind = activeId.slice(PALETTE_PREFIX.length) as BlockKind;
      const block = newBlock(kind);

      if (overId.startsWith(NEW_ROW_PREFIX)) {
        // Drop in "between rows" gap → new row at that index
        const idx = Number(overId.slice(NEW_ROW_PREFIX.length));
        const next = [...layout];
        next.splice(idx, 0, newRow([block]));
        onChange(next);
        return;
      }

      if (overId.startsWith(BLOCK_INSERT_PREFIX)) {
        // Drop above/below a block in a column → insert into that column's
        // stack at the given index.
        const [, rowId, colId, idxStr] = overId.split("|");
        const index = Number(idxStr);
        onChange(
          layout.map((row) => {
            if (row.id !== rowId) return row;
            return {
              ...row,
              columns: row.columns.map((col) => {
                if (col.id !== colId) return col;
                const next = col.blocks.slice();
                next.splice(index, 0, block);
                return { ...col, blocks: next };
              }),
            };
          })
        );
        return;
      }

      if (overId.startsWith(BLOCK_SIDE_PREFIX)) {
        // Drop beside a specific block — split the column if it's a stack so
        // the new block ends up genuinely beside the target block.
        const [, side, targetBlockId] = overId.split("|");
        const next = applyBlockSideDrop(
          layout,
          targetBlockId,
          side as "left" | "right",
          block
        );
        if (next) onChange(next);
        return;
      }

      if (overId.startsWith(COL_INSERT_PREFIX)) {
        // Drop next to a column → insert a new single-block column at that position.
        const [, rowId, idxStr] = overId.split("|");
        const index = Number(idxStr);
        onChange(
          layout.map((row) => {
            if (row.id !== rowId) return row;
            const next = row.columns.slice();
            next.splice(index, 0, newColumn([block]));
            return { ...row, columns: next };
          })
        );
        return;
      }

      if (overId.startsWith(COL_DROP_PREFIX)) {
        // Drop on a column body → append to that column's stack.
        const [, rowId, colId] = overId.split("|");
        onChange(
          layout.map((row) => {
            if (row.id !== rowId) return row;
            return {
              ...row,
              columns: row.columns.map((col) =>
                col.id === colId ? { ...col, blocks: [...col.blocks, block] } : col
              ),
            };
          })
        );
        return;
      }

      // Drop on the row body — could be the row-drop droppable OR the row's
      // sortable droppable (which shares the same id as the row). Both mean
      // "append as a new single-block column at the end of this row".
      const rowId = overId.startsWith(ROW_DROP_PREFIX)
        ? overId.slice(ROW_DROP_PREFIX.length)
        : layout.find((r) => r.id === overId)?.id;
      if (rowId) {
        onChange(
          layout.map((row) =>
            row.id === rowId
              ? { ...row, columns: [...row.columns, newColumn([block])] }
              : row
          )
        );
        return;
      }

      // Default: append as new row at end
      onChange([...layout, newRow([block])]);
      return;
    }

    // Reordering rows (active.id and over.id are row ids)
    const fromIdx = layout.findIndex((r) => r.id === activeId);
    const toIdx = layout.findIndex((r) => r.id === overId);
    if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
      onChange(arrayMove(layout, fromIdx, toIdx));
    }
  }

  // Move an existing canvas block to a new position. We capture the source
  // location in the original layout, build a layout with the source removed
  // (collapsing empty cols/rows), then insert the block at the target. Index
  // adjustments handle the case where the source's removal shifts the target.
  function handleExistingBlockDrop(blockId: string, overId: string) {
    let srcRowIdx = -1;
    let srcColIdx = -1;
    let srcBlockIdx = -1;
    outer: for (let r = 0; r < layout.length; r++) {
      for (let c = 0; c < layout[r].columns.length; c++) {
        const idx = layout[r].columns[c].blocks.findIndex((b) => b.id === blockId);
        if (idx >= 0) {
          srcRowIdx = r;
          srcColIdx = c;
          srcBlockIdx = idx;
          break outer;
        }
      }
    }
    if (srcRowIdx < 0) return;
    const srcRow = layout[srcRowIdx];
    const srcCol = srcRow.columns[srcColIdx];
    const block = srcCol.blocks[srcBlockIdx];

    const withoutSrc: Layout = layout
      .map((row) =>
        row.id !== srcRow.id
          ? row
          : {
              ...row,
              columns: row.columns
                .map((col) =>
                  col.id !== srcCol.id
                    ? col
                    : { ...col, blocks: col.blocks.filter((b) => b.id !== blockId) }
                )
                .filter((col) => col.blocks.length > 0),
            }
      )
      .filter((row) => row.columns.length > 0);

    const srcRowStillThere = withoutSrc.some((r) => r.id === srcRow.id);
    const srcColStillThere = srcRowStillThere
      ? withoutSrc
          .find((r) => r.id === srcRow.id)!
          .columns.some((c) => c.id === srcCol.id)
      : false;

    if (overId.startsWith(NEW_ROW_PREFIX)) {
      let idx = Number(overId.slice(NEW_ROW_PREFIX.length));
      if (!srcRowStillThere && idx > srcRowIdx) idx -= 1;
      const next = [...withoutSrc];
      next.splice(idx, 0, newRow([block]));
      onChange(next);
      return;
    }

    if (overId.startsWith(BLOCK_INSERT_PREFIX)) {
      const [, rowId, colId, idxStr] = overId.split("|");
      const targetRow = withoutSrc.find((r) => r.id === rowId);
      const targetCol = targetRow?.columns.find((c) => c.id === colId);
      if (!targetRow || !targetCol) return; // source was the only thing here — no-op
      let index = Number(idxStr);
      if (srcRow.id === rowId && srcCol.id === colId && index > srcBlockIdx) {
        index -= 1;
      }
      onChange(
        withoutSrc.map((row) => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            columns: row.columns.map((col) => {
              if (col.id !== colId) return col;
              const next = col.blocks.slice();
              next.splice(index, 0, block);
              return { ...col, blocks: next };
            }),
          };
        })
      );
      return;
    }

    if (overId.startsWith(BLOCK_SIDE_PREFIX)) {
      const [, side, targetBlockId] = overId.split("|");
      if (targetBlockId === blockId) return; // dropped onto the source block's own side
      const next = applyBlockSideDrop(
        withoutSrc,
        targetBlockId,
        side as "left" | "right",
        block
      );
      if (next) onChange(next);
      return;
    }

    if (overId.startsWith(COL_INSERT_PREFIX)) {
      const [, rowId, idxStr] = overId.split("|");
      if (!withoutSrc.some((r) => r.id === rowId)) return;
      let index = Number(idxStr);
      if (srcRow.id === rowId && !srcColStillThere && index > srcColIdx) {
        index -= 1;
      }
      onChange(
        withoutSrc.map((row) => {
          if (row.id !== rowId) return row;
          const next = row.columns.slice();
          next.splice(index, 0, newColumn([block]));
          return { ...row, columns: next };
        })
      );
      return;
    }

    if (overId.startsWith(COL_DROP_PREFIX)) {
      const [, rowId, colId] = overId.split("|");
      const targetRow = withoutSrc.find((r) => r.id === rowId);
      const targetCol = targetRow?.columns.find((c) => c.id === colId);
      if (!targetRow || !targetCol) return;
      onChange(
        withoutSrc.map((row) => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            columns: row.columns.map((col) =>
              col.id === colId ? { ...col, blocks: [...col.blocks, block] } : col
            ),
          };
        })
      );
      return;
    }

    const targetRowId = overId.startsWith(ROW_DROP_PREFIX)
      ? overId.slice(ROW_DROP_PREFIX.length)
      : withoutSrc.find((r) => r.id === overId)?.id;
    if (targetRowId && withoutSrc.some((r) => r.id === targetRowId)) {
      onChange(
        withoutSrc.map((row) =>
          row.id === targetRowId
            ? { ...row, columns: [...row.columns, newColumn([block])] }
            : row
        )
      );
      return;
    }

    // Fallback: only append a new row if the source actually moved somewhere
    // (i.e., we didn't lose the target by collapsing the source's location).
    if (withoutSrc.length !== layout.length || srcRowStillThere) {
      onChange([...withoutSrc, newRow([block])]);
    }
  }

  const html = layoutToHtml(layout);
  const allBlocks = layout.flatMap((r) => r.columns.flatMap((c) => c.blocks));
  const draggingExistingBlock =
    draggingBlockId !== null
      ? allBlocks.find((b) => b.id === draggingBlockId) ?? null
      : null;
  const isItemDragging =
    draggingKind !== null || draggingExistingBlock !== null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={detectCollisions}
      // Remeasure droppable rects on every state change so the drop slots that
      // grow from 4px to 32/48px when a drag starts are picked up correctly —
      // dnd-kit's default WhileDragging strategy caches rects at drag start
      // and leaves the bottom-of-column slot stale until another droppable
      // forces a re-check.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
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
              Drag a section into the canvas to add a new row. Drop it next to
              a section to add a new column, or above/below a section to stack
              it in the same column.
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
          layout={layout}
          expandedId={expandedId}
          isItemDragging={isItemDragging}
          draggingBlockId={draggingBlockId}
          onExpand={setExpandedId}
          onUpdateBlock={handleUpdateBlock}
          onDeleteBlock={handleDeleteBlock}
          onDuplicateRow={handleDuplicateRow}
          onDeleteRow={handleDeleteRow}
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
        {(draggingKind || draggingExistingBlock) && (
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
            <BlockIcon kind={draggingKind ?? draggingExistingBlock!.kind} />
            <span style={{ fontSize: 12, color: "#374151" }}>
              {BLOCK_LABELS[draggingKind ?? draggingExistingBlock!.kind]}
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
  layout,
  expandedId,
  isItemDragging,
  draggingBlockId,
  onExpand,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateRow,
  onDeleteRow,
}: {
  layout: Layout;
  expandedId: string | null;
  isItemDragging: boolean;
  draggingBlockId: string | null;
  onExpand: (id: string | null) => void;
  onUpdateBlock: (blockId: string, patch: Partial<Block>) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">
          Your layout
        </Text>

        {layout.length === 0 ? (
          <EmptyDropzone />
        ) : (
          <SortableContext
            items={layout.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <BlockStack gap="0">
              {layout.map((row, i) => (
                <div key={row.id}>
                  <NewRowDropZone index={i} />
                  <RowItem
                    row={row}
                    expandedId={expandedId}
                    isItemDragging={isItemDragging}
                    draggingBlockId={draggingBlockId}
                    onExpand={onExpand}
                    onUpdateBlock={onUpdateBlock}
                    onDeleteBlock={onDeleteBlock}
                    onDuplicateRow={onDuplicateRow}
                    onDeleteRow={onDeleteRow}
                  />
                </div>
              ))}
              <NewRowDropZone index={layout.length} />
            </BlockStack>
          </SortableContext>
        )}
      </BlockStack>
    </Card>
  );
}

function EmptyDropzone() {
  const { setNodeRef, isOver } = useDroppable({ id: `${NEW_ROW_PREFIX}0` });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 180,
        border: `2px dashed ${isOver ? "#65a30d" : "#d1d5db"}`,
        borderRadius: 8,
        padding: 24,
        background: isOver ? "#ecfccb" : "transparent",
        transition: "background 120ms, border-color 120ms",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text as="p" tone="subdued" alignment="center">
        Drag a section from the palette above to start building your layout.
      </Text>
    </div>
  );
}

function NewRowDropZone({ index }: { index: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${NEW_ROW_PREFIX}${index}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        height: isOver ? 36 : 16,
        margin: "2px 0",
        border: isOver ? "2px dashed #65a30d" : "2px dashed transparent",
        borderRadius: 6,
        background: isOver ? "#ecfccb" : "transparent",
        transition: "all 120ms",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        color: "#65a30d",
      }}
    >
      {isOver && "↓ New row here"}
    </div>
  );
}

function ColumnInsertSlot({
  rowId,
  index,
  active,
}: {
  rowId: string;
  index: number;
  active: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${COL_INSERT_PREFIX}${rowId}|${index}`,
  });
  // Idle: invisible 4px gap. Palette dragging: visible 48px target.
  // Hover: pink-filled 64px target with label.
  const width = isOver ? 64 : active ? 48 : 4;
  return (
    <div
      ref={setNodeRef}
      aria-hidden
      style={{
        flex: `0 0 ${width}px`,
        alignSelf: "stretch",
        margin: active ? "0 4px" : 0,
        borderRadius: 6,
        background: isOver ? "#ecfccb" : active ? "#fef7fb" : "transparent",
        border: isOver
          ? "2px dashed #65a30d"
          : active
          ? "2px dashed #f9a8d4"
          : "none",
        // Don't transition width/minHeight — dnd-kit caches rects at drag
        // start and won't re-measure mid-transition, so animating the slot
        // size would leave the hit area stale until another droppable steals
        // focus.
        transition: "background 120ms, border-color 120ms, color 120ms",
        position: "relative",
        minHeight: active ? 80 : 0,
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isOver ? 11 : 18,
            fontWeight: 600,
            color: isOver ? "#65a30d" : "#ec4899",
            writingMode: isOver ? "vertical-rl" : "horizontal-tb",
            transform: isOver ? "rotate(180deg)" : "none",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {isOver ? "New column" : "+"}
        </div>
      )}
    </div>
  );
}

function RowItem({
  row,
  expandedId,
  isItemDragging,
  draggingBlockId,
  onExpand,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateRow,
  onDeleteRow,
}: {
  row: Row;
  expandedId: string | null;
  isItemDragging: boolean;
  draggingBlockId: string | null;
  onExpand: (id: string | null) => void;
  onUpdateBlock: (blockId: string, patch: Partial<Block>) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `${ROW_DROP_PREFIX}${row.id}`,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: "100%",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        ref={setDropRef}
        style={{
          border: isOver ? "2px solid #65a30d" : "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 8,
          background: isOver ? "#ecfccb" : "#fff",
          transition: "all 120ms",
        }}
      >
        <InlineStack gap="200" align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="Drag row to reorder"
              style={{
                cursor: "grab",
                background: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 12,
                lineHeight: 1,
                color: "#6b7280",
              }}
            >
              ⋮⋮ row
            </button>
            <Text as="span" tone="subdued">
              {rowSummary(row)}
            </Text>
          </InlineStack>
          <InlineStack gap="100">
            <Button size="micro" onClick={() => onDuplicateRow(row.id)}>
              + Duplicate row
            </Button>
            <Button
              size="micro"
              tone="critical"
              variant="tertiary"
              onClick={() => onDeleteRow(row.id)}
              accessibilityLabel="Delete row"
            >
              ✕
            </Button>
          </InlineStack>
        </InlineStack>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 0,
            flexWrap: "wrap",
            alignItems: "stretch",
          }}
        >
          <ColumnInsertSlot rowId={row.id} index={0} active={isItemDragging} />
          {row.columns.map((col, i) => (
            <Fragment key={col.id}>
              <div
                style={{
                  flex: 1,
                  minWidth: row.columns.length > 1 ? 220 : 0,
                }}
              >
                <ColumnItem
                  rowId={row.id}
                  column={col}
                  expandedId={expandedId}
                  isItemDragging={isItemDragging}
                  draggingBlockId={draggingBlockId}
                  onExpand={onExpand}
                  onUpdateBlock={onUpdateBlock}
                  onDeleteBlock={onDeleteBlock}
                />
              </div>
              <ColumnInsertSlot
                rowId={row.id}
                index={i + 1}
                active={isItemDragging}
              />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function rowSummary(row: Row): string {
  const totalBlocks = row.columns.reduce((n, c) => n + c.blocks.length, 0);
  const cols = row.columns.length;
  if (cols === 1) {
    return totalBlocks === 1 ? "1 section" : `${totalBlocks} stacked sections`;
  }
  return `${cols} columns · ${totalBlocks} sections`;
}

function ColumnItem({
  rowId,
  column,
  expandedId,
  isItemDragging,
  draggingBlockId,
  onExpand,
  onUpdateBlock,
  onDeleteBlock,
}: {
  rowId: string;
  column: Column;
  expandedId: string | null;
  isItemDragging: boolean;
  draggingBlockId: string | null;
  onExpand: (id: string | null) => void;
  onUpdateBlock: (blockId: string, patch: Partial<Block>) => void;
  onDeleteBlock: (blockId: string) => void;
}) {
  // The whole column body is a fallback drop zone — drops anywhere not on
  // a between-block slot append to this column's stack.
  const { setNodeRef, isOver } = useDroppable({
    id: `${COL_DROP_PREFIX}${rowId}|${column.id}`,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        border: isOver ? "2px dashed #65a30d" : "1px dashed transparent",
        borderRadius: 8,
        padding: 2,
        background: isOver ? "rgba(132, 204, 22, 0.08)" : "transparent",
        transition: "background 120ms, border-color 120ms",
        height: "100%",
      }}
    >
      <BlockInsertSlot
        rowId={rowId}
        colId={column.id}
        index={0}
        active={isItemDragging}
      />
      {column.blocks.map((block, i) => (
        <Fragment key={block.id}>
          <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
            <BlockSideDrop
              side="left"
              blockId={block.id}
              active={isItemDragging}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <CanvasBlock
                block={block}
                expanded={expandedId === block.id}
                isBeingDragged={draggingBlockId === block.id}
                onExpand={() => onExpand(expandedId === block.id ? null : block.id)}
                onUpdate={(patch) => onUpdateBlock(block.id, patch)}
                onDelete={() => onDeleteBlock(block.id)}
              />
            </div>
            <BlockSideDrop
              side="right"
              blockId={block.id}
              active={isItemDragging}
            />
          </div>
          <BlockInsertSlot
            rowId={rowId}
            colId={column.id}
            index={i + 1}
            active={isItemDragging}
          />
        </Fragment>
      ))}
    </div>
  );
}

function BlockInsertSlot({
  rowId,
  colId,
  index,
  active,
}: {
  rowId: string;
  colId: string;
  index: number;
  active: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${BLOCK_INSERT_PREFIX}${rowId}|${colId}|${index}`,
  });
  // Idle: invisible 4px gap. Palette dragging: visible 32px horizontal target.
  // Hover: 48px filled target with label.
  const height = isOver ? 48 : active ? 32 : 4;
  return (
    <div
      ref={setNodeRef}
      aria-hidden
      style={{
        height,
        margin: active ? "4px 0" : "2px 0",
        borderRadius: 6,
        background: isOver ? "#ecfccb" : active ? "#fef7fb" : "transparent",
        border: isOver
          ? "2px dashed #65a30d"
          : active
          ? "2px dashed #f9a8d4"
          : "none",
        // Skip transitioning height — dnd-kit caches the slot's bounding
        // rect, so animating size leaves the hit area stale on first hover.
        transition: "background 120ms, border-color 120ms, color 120ms",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: isOver ? 11 : 14,
        fontWeight: 600,
        color: isOver ? "#65a30d" : "#ec4899",
        pointerEvents: "auto",
      }}
    >
      {active && (isOver ? "↓ Stack here" : "+")}
    </div>
  );
}

function BlockSideDrop({
  side,
  blockId,
  active,
}: {
  side: "left" | "right";
  blockId: string;
  active: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${BLOCK_SIDE_PREFIX}${side}|${blockId}`,
  });
  // Idle (no drag): collapsed to 0 so the block reads at normal width.
  // Drag-active: a generous 56px strip beside each block, "+" centred.
  // isOver: 80px filled target with explicit "Side-by-side" hint.
  const width = isOver ? 80 : active ? 56 : 0;
  return (
    <div
      ref={setNodeRef}
      data-block-side={`${side}|${blockId}`}
      aria-hidden
      style={{
        flex: `0 0 ${width}px`,
        alignSelf: "stretch",
        margin: active ? "0 6px" : 0,
        minHeight: active ? 60 : 0,
        borderRadius: 6,
        background: isOver ? "#ecfccb" : active ? "#fef7fb" : "transparent",
        border: isOver
          ? "2px dashed #65a30d"
          : active
          ? "2px dashed #f9a8d4"
          : "none",
        transition: "background 120ms, border-color 120ms, color 120ms",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: isOver ? 11 : 22,
        fontWeight: 600,
        color: isOver ? "#65a30d" : "#ec4899",
        whiteSpace: "nowrap",
        pointerEvents: "auto",
      }}
    >
      {active && (isOver ? "Side-by-side" : "+")}
    </div>
  );
}

function CanvasBlock({
  block,
  expanded,
  isBeingDragged,
  onExpand,
  onUpdate,
  onDelete,
}: {
  block: Block;
  expanded: boolean;
  isBeingDragged: boolean;
  onExpand: () => void;
  onUpdate: (patch: Partial<Block>) => void;
  onDelete: () => void;
}) {
  const isPlaceholder = block.filled === false;
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `${EXISTING_PREFIX}${block.id}`,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        background: "#fff",
        border: isPlaceholder ? "1px dashed #d1d5db" : "1px solid #ec4899",
        borderRadius: 8,
        overflow: "hidden",
        opacity: isBeingDragged ? 0.4 : 1,
      }}
    >
      <div
        style={{
          background: isPlaceholder ? "#f9fafb" : "#fdf2f8",
          padding: "6px 10px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <InlineStack gap="100" align="space-between" blockAlign="center">
          <InlineStack gap="100" blockAlign="center">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="Drag section to reorder"
              title="Drag to move this section"
              style={{
                cursor: "grab",
                background: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                padding: "0 6px",
                fontSize: 12,
                lineHeight: 1.4,
                color: "#6b7280",
              }}
            >
              ⋮⋮
            </button>
            <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
              {BLOCK_LABELS[block.kind]}
              {!isPlaceholder && (
                <span style={{ marginLeft: 6, fontSize: 10, color: "#10b981" }}>
                  ✓
                </span>
              )}
            </span>
          </InlineStack>
          <InlineStack gap="100">
            <Button size="micro" onClick={onExpand}>
              {expanded ? "Done" : isPlaceholder ? "Add content" : "Edit"}
            </Button>
            <Button size="micro" tone="critical" variant="tertiary" onClick={onDelete}>
              ✕
            </Button>
          </InlineStack>
        </InlineStack>
      </div>
      {expanded ? (
        <Box padding="300">
          <BlockEditor
            block={block}
            onChange={(patch) =>
              onUpdate({ ...patch, filled: true } as Partial<Block>)
            }
          />
        </Box>
      ) : (
        <div style={{ padding: "8px 10px" }}>
          <BlockPreview block={block} />
        </div>
      )}
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
              { label: "Bulleted", value: "bulleted" },
              { label: "Numbered", value: "numbered" },
              { label: "No bullets", value: "none" },
            ]}
            value={block.style}
            onChange={(v) =>
              onChange({ style: v as ListStyle } as Partial<Block>)
            }
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
          <TextField label="Image URL" autoComplete="off" value={block.url} onChange={(v) => onChange({ url: v } as Partial<Block>)} helpText="Paste a Shopify CDN URL or any public image URL." />
          <TextField label="Alt text" autoComplete="off" value={block.alt} onChange={(v) => onChange({ alt: v } as Partial<Block>)} />
        </BlockStack>
      );
    case "spec-row":
      return (
        <BlockStack gap="200">
          {block.entries.map((entry, i) => (
            <InlineStack key={i} gap="200" blockAlign="end" wrap={false}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextField
                  label={i === 0 ? "Label" : ""}
                  labelHidden={i !== 0}
                  autoComplete="off"
                  value={entry.label}
                  onChange={(v) => {
                    const next = block.entries.map((e, j) =>
                      j === i ? { ...e, label: v } : e
                    );
                    onChange({ entries: next } as Partial<Block>);
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextField
                  label={i === 0 ? "Value" : ""}
                  labelHidden={i !== 0}
                  autoComplete="off"
                  value={entry.value}
                  onChange={(v) => {
                    const next = block.entries.map((e, j) =>
                      j === i ? { ...e, value: v } : e
                    );
                    onChange({ entries: next } as Partial<Block>);
                  }}
                />
              </div>
              <Button
                size="micro"
                tone="critical"
                variant="tertiary"
                disabled={block.entries.length === 1}
                onClick={() => {
                  const next = block.entries.filter((_, j) => j !== i);
                  onChange({ entries: next } as Partial<Block>);
                }}
                accessibilityLabel="Remove row"
              >
                ✕
              </Button>
            </InlineStack>
          ))}
          <InlineStack>
            <Button
              onClick={() => {
                const next = [
                  ...block.entries,
                  { label: "", value: "" },
                ];
                onChange({ entries: next } as Partial<Block>);
              }}
            >
              + Add row
            </Button>
          </InlineStack>
        </BlockStack>
      );
    case "html":
      return (
        <TextField label="Raw HTML" autoComplete="off" multiline={4} value={block.html} onChange={(v) => onChange({ html: v } as Partial<Block>)} />
      );
  }
}


// horizontalListSortingStrategy unused for now (we handle drops via useDroppable
// drop zones rather than sortable per row); kept imported for future iteration
// where dragging blocks BETWEEN rows or reordering within a row is added.
void horizontalListSortingStrategy;
