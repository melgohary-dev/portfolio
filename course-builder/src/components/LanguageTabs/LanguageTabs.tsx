import { useCourseStore } from "../../store/course";
import { useCoursesStore } from "../../store/courses";
import { LANGUAGES } from "../../lib/constants";
import type { Language } from "../../types";

export default function LanguageTabs() {
  const currentLanguage = useCourseStore((s) => s.currentLanguage);
  const activeCourseId = useCoursesStore((s) => s.activeCourseId);
  const courses = useCoursesStore((s) => s.courses);
  const activeCourse = activeCourseId ? courses[activeCourseId] : null;
  const syncFromBuilder = useCoursesStore((s) => s.syncFromBuilder);
  const switchLanguage = useCourseStore((s) => s.switchLanguage);

  if (!activeCourse || activeCourse.languages.length <= 1) return null;

  const handleLanguageSwitch = (lang: Language) => {
    if (lang === currentLanguage) return;
    if (!activeCourseId) return;
    syncFromBuilder(activeCourseId);
    switchLanguage(lang);
  };

  return (
    <div className="flex items-center gap-1 rounded-lg bg-[var(--color-sunken)] p-0.5" role="tablist" aria-label="Course language">
      {activeCourse.languages.map((lang) => {
        const info = LANGUAGES.find((l) => l.code === lang);
        if (!info) return null;
        const versionModules = activeCourse.versions?.[lang]?.modules;
        const hasContent = versionModules && versionModules.length > 0;
        const isActive = currentLanguage === lang;
        return (
          <button
            key={lang}
            onClick={() => handleLanguageSwitch(lang)}
            role="tab"
            aria-selected={isActive}
            aria-pressed={isActive}
            className={`focus-ring rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-elevated)] text-[var(--color-ink)] shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {info.nativeLabel}
            {currentLanguage !== lang && !hasContent && (
              <span className="ml-1 text-[var(--color-brand)]" aria-hidden="true">+</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
