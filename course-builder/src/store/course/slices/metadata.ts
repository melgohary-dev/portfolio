import type { CourseState } from "../types";
import type { Language } from "../../../types";

export function createMetadataActions(
  set: (partial: Partial<CourseState> | ((state: CourseState) => Partial<CourseState>)) => void,
) {
  return {
    setTitle: (title: string) =>
      set((state) => ({
        title: { ...state.title, [state.currentLanguage]: title },
      })),

    setDescription: (description: string) =>
      set((state) => ({
        description: { ...state.description, [state.currentLanguage]: description },
      })),

    setLanguage: (lang: Language) => set({ currentLanguage: lang }),
  };
}
