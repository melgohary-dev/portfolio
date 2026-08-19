import { useEffect } from "react";
import { useCourseStore } from "../store/course";
import { useHistoryStore } from "../store/history";

/** Global keyboard shortcuts */
export function useKeyboardShortcuts() {
  const deselectBlock = useCourseStore((s) => s.deselectBlock);
  const removeBlock = useCourseStore((s) => s.removeBlock);
  const selectedModuleId = useCourseStore((s) => s.selectedModuleId);
  const selectedLessonId = useCourseStore((s) => s.selectedLessonId);
  const selectedBlockId = useCourseStore((s) => s.selectedBlockId);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === "Escape") {
        deselectBlock();
        return;
      }

      const tag = (e.target as HTMLElement).tagName;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedBlockId &&
        selectedModuleId &&
        selectedLessonId &&
        tag !== "INPUT" &&
        tag !== "TEXTAREA" &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        e.preventDefault();
        removeBlock(selectedModuleId, selectedLessonId, selectedBlockId);
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    deselectBlock,
    removeBlock,
    selectedBlockId,
    selectedModuleId,
    selectedLessonId,
    undo,
    redo,
  ]);
}
