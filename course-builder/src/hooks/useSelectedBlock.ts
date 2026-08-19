import { useMemo } from "react";
import { useCourseStore, EMPTY_MODULES } from "../store/course";

/** Hook to get the currently selected block from the course state */
export function useSelectedBlock() {
  const selectedBlockId = useCourseStore((s) => s.selectedBlockId);
  const selectedModuleId = useCourseStore((s) => s.selectedModuleId);
  const selectedLessonId = useCourseStore((s) => s.selectedLessonId);
  const modules = useCourseStore((s) => s.versions[s.currentLanguage]?.modules ?? EMPTY_MODULES);

  return useMemo(() => {
    if (!selectedBlockId || !selectedModuleId || !selectedLessonId) {
      return null;
    }

    const mod = modules.find((m) => m.id === selectedModuleId);
    const lesson = mod?.lessons.find((l) => l.id === selectedLessonId);
    const block = lesson?.blocks.find((b) => b.id === selectedBlockId);

    if (!block || !mod || !lesson) return null;

    return { block, module: mod, lesson };
  }, [modules, selectedModuleId, selectedLessonId, selectedBlockId]);
}
