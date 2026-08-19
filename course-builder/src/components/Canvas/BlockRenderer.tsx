import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Play,
} from "lucide-react";
import { useCourseStore } from "../../store/course";
import { getLocalized } from "../../lib/localization";
import { getYouTubeId } from "../../lib/utils";
import { BLOCK_ICONS } from "../../lib/constants";
import { cn } from "../../lib/cn";
import type { ContentBlock, DragData } from "../../types";

interface Props {
  block: ContentBlock;
  moduleId: string;
  lessonId: string;
  isSelected: boolean;
}

function BlockRendererInner({ block, moduleId, lessonId, isSelected }: Props) {
  const selectBlock = useCourseStore((s) => s.selectBlock);
  const removeBlock = useCourseStore((s) => s.removeBlock);
  const currentLanguage = useCourseStore((s) => s.currentLanguage);

  const dragData: DragData = {
    type: "block",
    id: block.id,
    moduleId,
    lessonId,
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: dragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = BLOCK_ICONS[block.type];
  const videoId =
    block.type === "video" ? getYouTubeId((block.metadata.url as string) ?? "") : null;
  const blockTitle = getLocalized(block.title, currentLanguage);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectBlock(moduleId, lessonId, block.id);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeBlock(moduleId, lessonId, block.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`${block.type} block: ${blockTitle}${isSelected ? " (selected)" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        selectBlock(moduleId, lessonId, block.id);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "group mb-1.5 flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all cursor-pointer animate-slideUp block-hover",
        isSelected
          ? "border-[var(--color-brand)] bg-[var(--color-brand-50)] text-[var(--color-ink)] ring-1 ring-[var(--color-brand)] dark:bg-[var(--color-brand-900)]"
          : "border-transparent bg-[var(--color-sunken)] hover:border-[var(--color-line)]",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag ${block.type} block: ${blockTitle}`}
        className="focus-ring cursor-grab rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] active:cursor-grabbing min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <GripVertical size={12} />
      </button>

      {block.type === "video" && videoId ? (
        <div className="relative h-8 w-14 shrink-0 overflow-hidden rounded bg-black">
          <img
            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover"
          />
          <Play
            size={10}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow"
          />
        </div>
      ) : (
        <Icon size={14} className="shrink-0 text-[var(--color-brand)]" aria-hidden="true" />
      )}

      <span className="flex-1 truncate font-medium">
        {blockTitle}
      </span>

      {block.duration != null && block.duration > 0 && (
        <span className="shrink-0 text-[10px] text-[var(--color-muted)]">
          {block.duration}m
        </span>
      )}

      {block.type === "quiz" && Array.isArray(block.metadata.questions) && (
        <span className="shrink-0 rounded bg-[var(--color-brand-100)] px-1 text-[10px] text-[var(--color-brand)]">
          {(block.metadata.questions as unknown[]).length} Q
        </span>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          removeBlock(moduleId, lessonId, block.id);
        }}
        aria-label={`Delete ${block.type} block: ${blockTitle}`}
        className="focus-ring shrink-0 rounded p-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-danger)] min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

const BlockRenderer = React.memo(BlockRendererInner);
export default BlockRenderer;
