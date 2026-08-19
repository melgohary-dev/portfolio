import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCourseStore, EMPTY_MODULES } from "../../store/course";
import ModuleCard from "./ModuleCard";
import { cn } from "../../lib/cn";

export default function Canvas() {
  const modules = useCourseStore((s) => s.versions[s.currentLanguage]?.modules ?? EMPTY_MODULES);
  const addModule = useCourseStore((s) => s.addModule);

  const { setNodeRef, isOver } = useDroppable({ id: "canvas-root" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-full flex-col p-6",
        isOver && "drop-active",
      )}
    >
      <SortableContext
        items={modules.map((m) => m.id)}
        strategy={verticalListSortingStrategy}
      >
        {modules.map((mod) => (
          <ModuleCard key={mod.id} module={mod} />
        ))}
      </SortableContext>

      {modules.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-sunken)]">
            <Plus size={32} className="text-[var(--color-muted)]" />
          </div>
          <h3 className="mb-1 text-lg font-medium text-[var(--color-ink)]">
            Build your course
          </h3>
          <p className="mb-4 max-w-sm text-sm text-[var(--color-muted)]">
            Drag content blocks from the palette or click below to add your first
            module
          </p>
          <button
            onClick={addModule}
            className="focus-ring flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-hover)]"
          >
            <Plus size={16} />
            Add Module
          </button>
        </div>
      )}

      {modules.length > 0 && (
        <button
          onClick={addModule}
          className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-line)] py-3 text-sm font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
        >
          <Plus size={16} />
          Add Module
        </button>
      )}
    </div>
  );
}
