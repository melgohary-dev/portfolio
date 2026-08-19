import { createBlock as makeBlock } from "../../../lib/defaults";
import { safeMerge } from "../../../lib/security";
import { emptyVersion } from "../helpers";
import type { CourseState } from "../types";
import type { BlockType, ContentBlock } from "../../../types";

export function createBlockActions(
  set: (fn: (state: CourseState) => Partial<CourseState>) => void,
) {
  return {
    addBlock: (moduleId: string, lessonId: string, type: BlockType, index?: number) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        const block = makeBlock(type);
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) =>
                m.id === moduleId
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => {
                        if (l.id !== lessonId) return l;
                        const blocks = [...l.blocks];
                        if (index !== undefined) {
                          blocks.splice(index, 0, block);
                        } else {
                          blocks.push(block);
                        }
                        return { ...l, blocks, collapsed: false };
                      }),
                    }
                  : m,
              ),
            },
          },
        };
      }),

    removeBlock: (moduleId: string, lessonId: string, blockId: string) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) =>
                m.id === moduleId
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) =>
                        l.id === lessonId
                          ? { ...l, blocks: l.blocks.filter((b) => b.id !== blockId) }
                          : l,
                      ),
                    }
                  : m,
              ),
            },
          },
          selectedBlockId:
            state.selectedBlockId === blockId ? null : state.selectedBlockId,
        };
      }),

    reorderBlocks: (moduleId: string, lessonId: string, fromIndex: number, toIndex: number) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) =>
                m.id === moduleId
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) => {
                        if (l.id !== lessonId) return l;
                        const blocks = [...l.blocks];
                        const [moved] = blocks.splice(fromIndex, 1);
                        blocks.splice(toIndex, 0, moved);
                        return { ...l, blocks };
                      }),
                    }
                  : m,
              ),
            },
          },
        };
      }),

    updateBlock: (moduleId: string, lessonId: string, blockId: string, updates: Partial<ContentBlock>) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) =>
                m.id === moduleId
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) =>
                        l.id === lessonId
                          ? {
                              ...l,
                              blocks: l.blocks.map((b) =>
                                b.id === blockId ? safeMerge(b, updates) : b,
                              ),
                            }
                          : l,
                      ),
                    }
                  : m,
              ),
            },
          },
        };
      }),

    moveBlock: (
      fromModuleId: string,
      fromLessonId: string,
      fromIndex: number,
      toModuleId: string,
      toLessonId: string,
      toIndex: number,
    ) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        const sourceMod = version.modules.find((m) => m.id === fromModuleId);
        const sourceLesson = sourceMod?.lessons.find((l) => l.id === fromLessonId);
        if (!sourceLesson) return state;
        const block = sourceLesson.blocks[fromIndex];
        if (!block) return state;

        const sameLesson = fromModuleId === toModuleId && fromLessonId === toLessonId;
        const adjustedToIndex = sameLesson && fromIndex < toIndex ? toIndex - 1 : toIndex;

        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) => {
                if (m.id === fromModuleId) {
                  m = {
                    ...m,
                    lessons: m.lessons.map((l) =>
                      l.id === fromLessonId
                        ? { ...l, blocks: l.blocks.filter((_, i) => i !== fromIndex) }
                        : l,
                    ),
                  };
                }
                if (m.id === toModuleId) {
                  m = {
                    ...m,
                    lessons: m.lessons.map((l) => {
                      if (l.id !== toLessonId) return l;
                      const blocks = [...l.blocks];
                      blocks.splice(adjustedToIndex, 0, block);
                      return { ...l, blocks, collapsed: false };
                    }),
                  };
                }
                return m;
              }),
            },
          },
        };
      }),
  };
}
