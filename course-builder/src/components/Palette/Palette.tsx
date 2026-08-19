import { useDraggable } from "@dnd-kit/core";
import type { BlockType } from "../../types";
import { BLOCK_LABELS, BLOCK_ICONS } from "../../lib/constants";
import { cn } from "../../lib/cn";

const BLOCK_TYPES: BlockType[] = ["text", "video", "quiz", "image", "assignment", "divider"];

function PaletteItem({ type }: { type: BlockType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: "palette-block", blockType: type },
  });

  const Icon = BLOCK_ICONS[type];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex cursor-grab items-center gap-2.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2.5 text-sm font-medium transition-all hover:border-[var(--color-brand)] hover:shadow-sm active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      <Icon size={16} className="shrink-0 text-[var(--color-brand)]" />
      <span>{BLOCK_LABELS[type]}</span>
    </div>
  );
}

export default function Palette() {
  return (
    <div className="flex h-full flex-col p-3">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Content Blocks
      </h2>
      <p className="mb-3 text-xs text-[var(--color-muted)]">
        Drag blocks onto the canvas to build your course
      </p>
      <div className="flex flex-col gap-2">
        {BLOCK_TYPES.map((type) => (
          <PaletteItem key={type} type={type} />
        ))}
      </div>
    </div>
  );
}
