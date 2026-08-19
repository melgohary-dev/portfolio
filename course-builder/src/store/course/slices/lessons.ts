import { createId } from "../../../lib/defaults";
import { lessonTitle } from "../../../lib/localization";
import { emptyVersion } from "../helpers";
import type { CourseState } from "../types";

export function createLessonActions(
  set: (fn: (state: CourseState) => Partial<CourseState>) => void,
) {
  return {
    addLesson: (moduleId: string) =>
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
                      lessons: [
                        ...m.lessons,
                        {
                          id: createId(),
                          title: lessonTitle(m.lessons.length + 1),
                          blocks: [],
                          collapsed: false,
                        },
                      ],
                    }
                  : m,
              ),
            },
          },
        };
      }),

    removeLesson: (moduleId: string, lessonId: string) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) =>
                m.id === moduleId
                  ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
                  : m,
              ),
            },
          },
          selectedBlockId:
            state.selectedLessonId === lessonId ? null : state.selectedBlockId,
          selectedLessonId:
            state.selectedLessonId === lessonId ? null : state.selectedLessonId,
        };
      }),

    reorderLessons: (moduleId: string, fromIndex: number, toIndex: number) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) => {
                if (m.id !== moduleId) return m;
                const lessons = [...m.lessons];
                const [moved] = lessons.splice(fromIndex, 1);
                lessons.splice(toIndex, 0, moved);
                return { ...m, lessons };
              }),
            },
          },
        };
      }),

    renameLesson: (moduleId: string, lessonId: string, title: string) =>
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
                          ? { ...l, title: { ...l.title, [lang]: title } }
                          : l,
                      ),
                    }
                  : m,
              ),
            },
          },
        };
      }),

    toggleLessonCollapse: (moduleId: string, lessonId: string) =>
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
                        l.id === lessonId ? { ...l, collapsed: !l.collapsed } : l,
                      ),
                    }
                  : m,
              ),
            },
          },
        };
      }),
  };
}
