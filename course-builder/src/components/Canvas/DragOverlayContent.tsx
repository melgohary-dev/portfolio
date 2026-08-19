import { Box, FileText, Puzzle } from "lucide-react";
import { BLOCK_ICONS, BLOCK_LABELS } from "../../lib/constants";
import type { DragData } from "../../types";

const DRAG_TYPE_ICONS: Record<DragData["type"], React.ComponentType<{ size?: number; className?: string }>> = {
  module: Box,
  lesson: FileText,
  block: Puzzle,
  "palette-block": Puzzle,
};

const DRAG_TYPE_LABELS: Record<DragData["type"], string> = {
  module: "Module",
  lesson: "Lesson",
  block: "Block",
  "palette-block": "Block",
};

export default function DragOverlayContent({ data }: { data: DragData }) {
  if (data.type === "palette-block" && data.blockType) {
    const Icon = BLOCK_ICONS[data.blockType];
    return (
      <div className="drag-overlay flex items-center gap-2 rounded-lg border border-[var(--color-brand)] bg-[var(--color-elevated)] px-3 py-2.5 text-sm font-medium shadow-xl">
        {Icon && <Icon size={16} className="text-[var(--color-brand)]" />}
        <span>{BLOCK_LABELS[data.blockType]}</span>
      </div>
    );
  }

  const TypeIcon = DRAG_TYPE_ICONS[data.type];
  return (
    <div className="drag-overlay flex items-center gap-2 rounded-lg border border-[var(--color-brand)] bg-[var(--color-elevated)] px-3 py-2 text-sm font-medium shadow-xl">
      {TypeIcon && <TypeIcon size={16} className="text-[var(--color-brand)]" />}
      <span>{DRAG_TYPE_LABELS[data.type]}</span>
    </div>
  );
}
