import type { Course, ContentBlock, Language } from "../../types";

export interface CourseState extends Course {
  currentLanguage: Language;
  activeCourseId: string | null;

  /** Module actions */
  addModule: () => void;
  removeModule: (moduleId: string) => void;
  reorderModules: (fromIndex: number, toIndex: number) => void;
  renameModule: (moduleId: string, title: string) => void;
  toggleModuleCollapse: (moduleId: string) => void;

  /** Lesson actions */
  addLesson: (moduleId: string) => void;
  removeLesson: (moduleId: string, lessonId: string) => void;
  reorderLessons: (moduleId: string, fromIndex: number, toIndex: number) => void;
  renameLesson: (moduleId: string, lessonId: string, title: string) => void;
  toggleLessonCollapse: (moduleId: string, lessonId: string) => void;

  /** Block actions */
  addBlock: (moduleId: string, lessonId: string, type: import("../../types").BlockType, index?: number) => void;
  removeBlock: (moduleId: string, lessonId: string, blockId: string) => void;
  reorderBlocks: (moduleId: string, lessonId: string, fromIndex: number, toIndex: number) => void;
  updateBlock: (moduleId: string, lessonId: string, blockId: string, updates: Partial<ContentBlock>) => void;

  /** Selection */
  selectBlock: (moduleId: string, lessonId: string, blockId: string) => void;
  deselectBlock: () => void;

  /** Course metadata */
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;

  /** Language */
  setLanguage: (lang: Language) => void;

  /** Bulk operations for DnD cross-container moves */
  moveBlock: (
    fromModuleId: string,
    fromLessonId: string,
    fromIndex: number,
    toModuleId: string,
    toLessonId: string,
    toIndex: number,
  ) => void;
  moveLesson: (
    fromModuleId: string,
    fromIndex: number,
    toModuleId: string,
    toIndex: number,
  ) => void;

  /** Selection state */
  selectedBlockId: string | null;
  selectedModuleId: string | null;
  selectedLessonId: string | null;

  /** Load / reset / version switching */
  loadCourse: (config: import("../../types").CourseConfig) => void;
  switchLanguage: (lang: Language) => void;
  resetCourse: () => void;
}
