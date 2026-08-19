import { useEffect, useRef, useState } from "react";
import { useCourseStore, EMPTY_MODULES } from "../store/course";
import { useCoursesStore } from "../store/courses";
import { DEBOUNCE_DELAY_AUTO_SAVE } from "../lib/constants";

export { useSelectedBlock } from "./useSelectedBlock";
export { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function hashContent(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return String(h);
}

/** Tracks whether the course state has unsaved changes (debounced) */
export function useAutoSave(): { saved: boolean } {
  const [saved, setSaved] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modules = useCourseStore((s) => s.versions[s.currentLanguage]?.modules ?? EMPTY_MODULES);
  const title = useCourseStore((s) => s.title);
  const description = useCourseStore((s) => s.description);

  const prevTitleRef = useRef(title);
  const prevDescRef = useRef(description);
  const prevModulesRef = useRef(modules);
  const prevFingerprintRef = useRef("");
  const fingerprintRef = useRef("");

  if (
    title !== prevTitleRef.current ||
    description !== prevDescRef.current ||
    modules !== prevModulesRef.current
  ) {
    prevTitleRef.current = title;
    prevDescRef.current = description;
    prevModulesRef.current = modules;
    fingerprintRef.current = `${hashContent(JSON.stringify(title))}::${hashContent(JSON.stringify(description))}::${hashContent(JSON.stringify(modules))}`;
  }

  const fingerprint = fingerprintRef.current;

  useEffect(() => {
    if (prevFingerprintRef.current !== fingerprint) {
      prevFingerprintRef.current = fingerprint;
      setSaved(false);

      const courseId = useCoursesStore.getState().activeCourseId;
      if (courseId) {
        useCoursesStore.getState().syncFromBuilder(courseId);
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaved(true), DEBOUNCE_DELAY_AUTO_SAVE);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fingerprint]);

  return { saved };
}
