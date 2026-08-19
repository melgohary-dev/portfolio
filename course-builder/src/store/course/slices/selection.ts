import type { CourseState } from "../types";

export function createSelectionActions(
  set: (partial: Partial<CourseState> | ((state: CourseState) => Partial<CourseState>)) => void,
) {
  return {
    selectBlock: (moduleId: string, lessonId: string, blockId: string) =>
      set({
        selectedBlockId: blockId,
        selectedModuleId: moduleId,
        selectedLessonId: lessonId,
      }),

    deselectBlock: () =>
      set({
        selectedBlockId: null,
        selectedModuleId: null,
        selectedLessonId: null,
      }),
  };
}
