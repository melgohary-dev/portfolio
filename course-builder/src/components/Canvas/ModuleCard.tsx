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
  Plus,
} from "lucide-react";
import { useCourseStore } from "../../store/course";
import LessonItem from "./LessonItem";
import { getLocalized } from "../../lib/localization";
import { cn } from "../../lib/cn";
import type { CourseModule } from "../../types";
import type { DragData } from "../../types";

interface Props {
  module: CourseModule;
}

function ModuleCardInner({ module }: Props) {
  const renameModule = useCourseStore((s) => s.renameModule);
  const removeModule = useCourseStore((s) => s.removeModule);
  const toggleModuleCollapse = useCourseStore((s) => s.toggleModuleCollapse);
  const addLesson = useCourseStore((s) => s.addLesson);
  const selectedModuleId = useCourseStore((s) => s.selectedModuleId);
  const currentLanguage = useCourseStore((s) => s.currentLanguage);

  const handleToggle = useCallback(() => toggleModuleCollapse(module.id), [toggleModuleCollapse, module.id]);

  const handleDelete = useCallback(() => {
    if (window.confirm("Delete this module and all its lessons?")) removeModule(module.id);
  }, [removeModule, module.id]);

  const handleAddLesson = useCallback(() => addLesson(module.id), [addLesson, module.id]);

  const handleRename = useCallback((e: React.ChangeEvent<HTMLInputElement>) => renameModule(module.id, e.target.value), [renameModule, module.id]);

  const dragData: DragData = { type: "module", id: module.id };

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: module.id,
    data: dragData,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `module-${module.id}`,
    data: { type: "module", id: module.id } satisfies DragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedModuleId === module.id;

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDropRef(node);
      }}
      style={style}
      className={cn(
        "mb-4 rounded-xl border bg-[var(--color-elevated)] transition-all animate-slideUp",
        isSelected
          ? "border-[var(--color-brand)] shadow-md"
          : "border-[var(--color-line)] hover:shadow-sm",
        isDragging && "opacity-50 shadow-xl",
        isOver && "drop-active",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag module: ${getLocalized(module.title, currentLanguage)}`}
          className="focus-ring cursor-grab rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] active:cursor-grabbing min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <GripVertical size={16} />
        </button>

        <button
          onClick={handleToggle}
          aria-expanded={!module.collapsed}
          aria-label={`${module.collapsed ? "Expand" : "Collapse"} module: ${getLocalized(module.title, currentLanguage)}`}
          className="focus-ring rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {module.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>

        <input
          type="text"
          value={getLocalized(module.title, currentLanguage)}
          onChange={handleRename}
          aria-label="Module title"
          className="flex-1 border-none bg-transparent text-sm font-semibold outline-none"
          onClick={(e) => e.stopPropagation()}
        />

        <span className="text-xs text-[var(--color-muted)]" aria-label={`${module.lessons.length} lessons`}>
          {module.lessons.length} lessons
        </span>

        <button
          onClick={handleAddLesson}
          aria-label={`Add lesson to ${getLocalized(module.title, currentLanguage)}`}
          className="focus-ring rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-brand)] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Plus size={16} />
        </button>

        <button
          onClick={handleDelete}
          aria-label={`Delete module: ${getLocalized(module.title, currentLanguage)}`}
          className="focus-ring rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-danger)] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {!module.collapsed && (
        <div className="border-t border-[var(--color-line)] px-3 pb-3 pt-2">
          <SortableContext
            items={module.lessons.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {module.lessons.map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                moduleId={module.id}
              />
            ))}
          </SortableContext>

          {module.lessons.length === 0 && (
            <p className="py-4 text-center text-xs text-[var(--color-muted)]">
              No lessons yet. Click + to add one.
            </p>
          )}

          <button
            onClick={handleAddLesson}
            className="focus-ring mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-line)] py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
          >
            <Plus size={14} />
            Add Lesson
          </button>
        </div>
      )}
    </div>
  );
}

const ModuleCard = React.memo(ModuleCardInner);
export default ModuleCard;
