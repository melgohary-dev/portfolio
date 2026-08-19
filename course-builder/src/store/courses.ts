import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "../lib/defaults";
import { createLocalized } from "../lib/localization";
import { safeMerge } from "../lib/security";
import type { CourseConfig, CourseVersion, Language, CertificateConfig } from "../types";
import { useCourseStore } from "./course";

interface CoursesState {
  courses: Record<string, CourseConfig>;
  activeCourseId: string | null;

  /** Course CRUD */
  createCourse: (languages: Language[], defaultLanguage: Language) => string;
  updateCourseConfig: (id: string, config: Partial<CourseConfig>) => void;
  syncFromBuilder: (id: string) => void;
  deleteCourse: (id: string) => void;
  setActiveCourse: (id: string | null) => void;

  /** Certificate configs per course */
  certificates: Record<string, CertificateConfig>;
  setCertificate: (courseId: string, cert: CertificateConfig) => void;
  getCertificate: (courseId: string) => CertificateConfig | undefined;
}

function emptyVersion(): CourseVersion {
  return { modules: [] };
}

function createVersionsForLanguages(languages: Language[]): Record<Language, CourseVersion> {
  const versions: Partial<Record<Language, CourseVersion>> = {};
  for (const lang of languages) {
    versions[lang] = emptyVersion();
  }
  return versions as Record<Language, CourseVersion>;
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set, get) => ({
      courses: {},
      activeCourseId: null,
      certificates: {},

      createCourse: (languages, defaultLanguage) => {
        const id = createId();
        const now = new Date().toISOString();
        const config: CourseConfig = {
          id,
          title: createLocalized({ en: "Untitled Course" }),
          description: createLocalized(),
          versions: createVersionsForLanguages(languages),
          languages,
          defaultLanguage,
          certificateId: null,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          courses: { ...s.courses, [id]: config },
          activeCourseId: id,
        }));
        return id;
      },

      updateCourseConfig: (id, partial) =>
        set((s) => {
          const existing = s.courses[id];
          if (!existing) return s;

          const updated = safeMerge(
            existing,
            partial,
          );
          updated.updatedAt = new Date().toISOString();

          // If languages changed, add missing versions, keep existing ones
          if (partial.languages) {
            const newVersions = { ...existing.versions };
            for (const lang of partial.languages) {
              if (!newVersions[lang]) {
                newVersions[lang] = emptyVersion();
              }
            }
            updated.versions = newVersions;
          }

          return {
            courses: { ...s.courses, [id]: updated },
          };
        }),

      syncFromBuilder: (id) => {
        const courseState = useCourseStore.getState();
        if (courseState.activeCourseId !== id) return;

        const lang = courseState.currentLanguage;
        const versionModules = courseState.versions[lang]?.modules ?? [];

        set((s) => {
          if (!s.courses[id]) return s;
          return {
            courses: {
              ...s.courses,
              [id]: {
                ...s.courses[id],
                title: courseState.title,
                description: courseState.description,
                versions: {
                  ...s.courses[id].versions,
                  [lang]: { modules: versionModules },
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      deleteCourse: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.courses;
          const { [id]: __, ...restCerts } = s.certificates;
          return {
            courses: rest,
            certificates: restCerts,
            activeCourseId: s.activeCourseId === id ? null : s.activeCourseId,
          };
        }),

      setActiveCourse: (id) => set({ activeCourseId: id }),

      setCertificate: (courseId, cert) =>
        set((s) => {
          if (!courseId || !s.courses[courseId]) return s;
          return {
            certificates: { ...s.certificates, [courseId]: cert },
            courses: {
              ...s.courses,
              [courseId]: {
                ...s.courses[courseId],
                certificateId: cert.id,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      getCertificate: (courseId) => get().certificates[courseId],
    }),
    {
      name: "course-builder-index",
      version: 1,
    },
  ),
);
