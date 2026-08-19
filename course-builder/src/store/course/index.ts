import { create } from "zustand";
import type { StateCreator } from "zustand";
import { INITIAL_STATE } from "./helpers";
import { createModuleActions } from "./slices/modules";
import { createLessonActions } from "./slices/lessons";
import { createBlockActions } from "./slices/blocks";
import { createSelectionActions } from "./slices/selection";
import { createMetadataActions } from "./slices/metadata";
import { createNavigationActions } from "./slices/navigation";
import type { CourseState } from "./types";

export { EMPTY_MODULES, EMPTY_COURSE_VERSION } from "./helpers";

const creator: StateCreator<CourseState> = (set, get) => ({
  ...INITIAL_STATE,
  currentLanguage: "en",
  activeCourseId: null,
  selectedBlockId: null,
  selectedModuleId: null,
  selectedLessonId: null,

  ...createModuleActions(set, get),
  ...createLessonActions(set),
  ...createBlockActions(set),
  ...createSelectionActions(set),
  ...createMetadataActions(set),
  ...createNavigationActions(set, get),
});

export const useCourseStore = create<CourseState>()(creator);

export type { CourseState } from "./types";
