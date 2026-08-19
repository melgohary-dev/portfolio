import React, { useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  GripVertical,
} from "lucide-react";
import { useCourseStore } from "../../store/course";
import BlockRenderer from "./BlockRenderer";
import { getLocalized } from "../../lib/localization";
import { cn } from "../../lib/cn";
import type { Lesson, DragData } from "../../types";

interface Props {
  lesson: Lesson;
  moduleId: string;
}

function LessonItemInner({ lesson, moduleId }: Props) {
  const renameLesson = useCourseStore((s) => s.renameLesson);
  const removeLesson = useCourseStore((s) => s.removeLesson);
  const toggleLessonCollapse = useCourseStore((s) => s.toggleLessonCollapse);
  const addBlock = useCourseStore((s) => s.addBlock);
  const selectedLessonId = useCourseStore((s) => s.selectedLessonId);
  const selectedBlockId = useCourseStore((s) => s.selectedBlockId);
  const currentLanguage = useCourseStore((s) => s.currentLanguage);

  const handleToggleCollapse = useCallback(() => toggleLessonCollapse(moduleId, lesson.id), [toggleLessonCollapse, moduleId, lesson.id]);

  const handleDelete = useCallback(() => {
    if (window.confirm("Delete this lesson and all its blocks?")) {
      removeLesson(moduleId, lesson.id);
    }
  }, [removeLesson, moduleId, lesson.id]);

  const handleRename = useCallback((e: React.ChangeEvent<HTMLInputElement>) => renameLesson(moduleId, lesson.id, e.target.value), [renameLesson, moduleId, lesson.id]);

  const dragData: DragData = {
    type: "lesson",
    id: lesson.id,
    moduleId,
  };

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lesson.id,
    data: dragData,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `lesson-${lesson.id}`,
    data: { type: "lesson", id: lesson.id, moduleId } satisfies DragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedLessonId === lesson.id;

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDropRef(node);
      }}
      style={style}
      className={cn(
        "mb-2 rounded-lg border transition-all animate-slideUp",
        isSelected
          ? "border-[var(--color-brand)]"
          : "border-[var(--color-line)] hover:border-[var(--color-muted)]",
        isDragging && "opacity-50",
        isOver && "drop-active",
      )}
    >
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag lesson: ${getLocalized(lesson.title, currentLanguage)}`}
          className="focus-ring cursor-grab rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] active:cursor-grabbing min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <GripVertical size={14} />
        </button>

        <button
          onClick={handleToggleCollapse}
          aria-expanded={!lesson.collapsed}
          aria-label={`${lesson.collapsed ? "Expand" : "Collapse"} lesson: ${getLocalized(lesson.title, currentLanguage)}`}
          className="focus-ring rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {lesson.collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>

        <input
          type="text"
          value={getLocalized(lesson.title, currentLanguage)}
          onChange={handleRename}
          aria-label="Lesson title"
          className="flex-1 border-none bg-transparent text-xs font-medium outline-none"
          onClick={(e) => e.stopPropagation()}
        />

        <span className="text-[10px] text-[var(--color-muted)]" aria-label={`${lesson.blocks.length} blocks`}>
          {lesson.blocks.length} blocks
        </span>

        <button
          onClick={handleDelete}
          aria-label={`Delete lesson: ${getLocalized(lesson.title, currentLanguage)}`}
          className="focus-ring rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-danger)] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {!lesson.collapsed && (
        <div className="border-t border-[var(--color-line)] px-2 pb-2 pt-1.5">
          <SortableContext
            items={lesson.blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {lesson.blocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                moduleId={moduleId}
                lessonId={lesson.id}
                isSelected={selectedBlockId === block.id}
              />
            ))}
          </SortableContext>

          {lesson.blocks.length === 0 && (
            <p className="py-2 text-center text-[10px] text-[var(--color-muted)]">
              Drop content blocks here
            </p>
          )}

          <div className="flex flex-wrap gap-1 pt-1" role="group" aria-label="Add block type">
            {(["text", "video", "quiz", "image", "assignment", "divider"] as const).map((type) => (
              <button
                key={type}
                onClick={() => addBlock(moduleId, lesson.id, type)}
                aria-label={`Add ${type} block`}
                className="focus-ring rounded bg-[var(--color-sunken)] px-2 py-1 text-[10px] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-brand)] hover:text-white min-h-[32px]"
              >
                + {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const LessonItem = React.memo(LessonItemInner);
export default LessonItem;
