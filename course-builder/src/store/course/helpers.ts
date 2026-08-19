import { createLocalized } from "../../lib/localization";
import type { Course, CourseVersion, CourseModule } from "../../types";

export const EMPTY_MODULES: readonly CourseModule[] = Object.freeze<CourseModule[]>([]);
export const EMPTY_COURSE_VERSION: CourseVersion = { modules: [] as CourseModule[] };

export function findModule(modules: CourseModule[], id: string): CourseModule | undefined {
  return modules.find((m) => m.id === id);
}

export function emptyVersion(): CourseVersion {
  return EMPTY_COURSE_VERSION;
}

export function createEmptyVersions(languages: string[]): Record<string, CourseVersion> {
  const versions: Partial<Record<string, CourseVersion>> = {};
  for (const lang of languages) {
    versions[lang] = emptyVersion();
  }
  return versions as Record<string, CourseVersion>;
}

export const INITIAL_STATE: Course = {
  title: createLocalized({ en: "Untitled Course" }),
  description: createLocalized(),
  versions: createEmptyVersions(["en"]) as Course["versions"],
};
