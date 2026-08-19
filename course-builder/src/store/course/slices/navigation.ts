import { findModule, emptyVersion, INITIAL_STATE, createEmptyVersions } from "../helpers";
import type { CourseState } from "../types";
import type { CourseConfig, Language } from "../../../types";

export function createNavigationActions(
  set: (partial: Partial<CourseState> | ((state: CourseState) => Partial<CourseState>)) => void,
  get: () => CourseState,
) {
  return {
    loadCourse: (config: CourseConfig) => {
      set({
        title: config.title,
        description: config.description,
        versions: { ...config.versions },
        currentLanguage: config.defaultLanguage,
        activeCourseId: config.id,
        selectedBlockId: null,
        selectedModuleId: null,
        selectedLessonId: null,
      });
    },

    switchLanguage: (lang: Language) => {
      const { currentLanguage, versions } = get();
      if (lang === currentLanguage) return;
      const existingVersion = versions[lang];
      const newVersion = existingVersion ?? { modules: [] };
      set({
        currentLanguage: lang,
        versions: {
          ...versions,
          [lang]: newVersion,
        },
        selectedBlockId: null,
        selectedModuleId: null,
        selectedLessonId: null,
      });
    },

    moveLesson: (fromModuleId: string, fromIndex: number, toModuleId: string, toIndex: number) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        const sourceMod = findModule(version.modules, fromModuleId);
        if (!sourceMod) return state;
        const lesson = sourceMod.lessons[fromIndex];
        if (!lesson) return state;

        if (fromModuleId === toModuleId) {
          return {
            versions: {
              ...state.versions,
              [lang]: {
                modules: version.modules.map((m) => {
                  if (m.id !== fromModuleId) return m;
                  const lessons = [...m.lessons];
                  lessons.splice(fromIndex, 1);
                  lessons.splice(toIndex, 0, lesson);
                  return { ...m, lessons };
                }),
              },
            },
          };
        }

        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) => {
                if (m.id === fromModuleId) {
                  return {
                    ...m,
                    lessons: m.lessons.filter((_, i) => i !== fromIndex),
                  };
                }
                if (m.id === toModuleId) {
                  const lessons = [...m.lessons];
                  lessons.splice(toIndex, 0, lesson);
                  return { ...m, lessons };
                }
                return m;
              }),
            },
          },
        };
      }),

    resetCourse: () =>
      set({
        ...INITIAL_STATE,
        versions: createEmptyVersions(["en"]),
        currentLanguage: "en",
        selectedBlockId: null,
        selectedModuleId: null,
        selectedLessonId: null,
      }),
  };
}
