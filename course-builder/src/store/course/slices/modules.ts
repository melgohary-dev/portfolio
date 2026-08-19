import { createId } from "../../../lib/defaults";
import { moduleTitle } from "../../../lib/localization";
import { emptyVersion } from "../helpers";
import type { CourseState } from "../types";

export function createModuleActions(
  set: (fn: (state: CourseState) => Partial<CourseState>) => void,
  _get: () => CourseState,
) {
  return {
    addModule: () =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: [
                ...version.modules,
                {
                  id: createId(),
                  title: moduleTitle(version.modules.length + 1),
                  lessons: [],
                  collapsed: false,
                },
              ],
            },
          },
        };
      }),

    removeModule: (moduleId: string) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        const removedMod = version.modules.find((m) => m.id === moduleId);
        const lessonIds = new Set(removedMod?.lessons.map((l) => l.id) ?? []);
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.filter((m) => m.id !== moduleId),
            },
          },
          selectedBlockId:
            state.selectedModuleId === moduleId ? null : state.selectedBlockId,
          selectedModuleId:
            state.selectedModuleId === moduleId ? null : state.selectedModuleId,
          selectedLessonId:
            state.selectedModuleId === moduleId || lessonIds.has(state.selectedLessonId ?? "")
              ? null
              : state.selectedLessonId,
        };
      }),

    reorderModules: (fromIndex: number, toIndex: number) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        const modules = [...version.modules];
        const [moved] = modules.splice(fromIndex, 1);
        modules.splice(toIndex, 0, moved);
        return {
          versions: {
            ...state.versions,
            [lang]: { modules },
          },
        };
      }),

    renameModule: (moduleId: string, title: string) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) =>
                m.id === moduleId
                  ? { ...m, title: { ...m.title, [lang]: title } }
                  : m,
              ),
            },
          },
        };
      }),

    toggleModuleCollapse: (moduleId: string) =>
      set((state) => {
        const lang = state.currentLanguage;
        const version = state.versions[lang] ?? emptyVersion();
        return {
          versions: {
            ...state.versions,
            [lang]: {
              modules: version.modules.map((m) =>
                m.id === moduleId ? { ...m, collapsed: !m.collapsed } : m,
              ),
            },
          },
        };
      }),
  };
}
