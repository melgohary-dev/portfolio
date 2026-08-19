import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../store/ui";
import { useCoursesStore } from "../../store/courses";
import { useCourseStore } from "../../store/course";
import { LANGUAGES } from "../../lib/constants";
import { createLocalized, setLocalized } from "../../lib/localization";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { X } from "lucide-react";
import type { Language, LocalizedText } from "../../types";

export default function CourseConfigModal() {
  const isOpen = useUIStore((s) => s.configModalOpen);
  const close = useUIStore((s) => s.closeConfigModal);
  const navigate = useNavigate();
  const activeCourseId = useCoursesStore((s) => s.activeCourseId);
  const updateConfig = useCoursesStore((s) => s.updateCourseConfig);
  const courses = useCoursesStore((s) => s.courses);
  const course = activeCourseId ? courses[activeCourseId] : null;
  const trapRef = useFocusTrap<HTMLDivElement>();

  const [title, setTitleState] = useState<LocalizedText>(
    () => course?.title ?? createLocalized(),
  );
  const [description, setDescState] = useState<LocalizedText>(
    () => course?.description ?? createLocalized(),
  );
  const [selectedLangs, setSelectedLangs] = useState<Language[]>(
    () => course?.languages ?? ["en"],
  );
  const [defaultLang, setDefaultLang] = useState<Language>(
    () => course?.defaultLanguage ?? "en",
  );

  useEffect(() => {
    if (course) {
      setTitleState(course.title);
      setDescState(course.description);
      setSelectedLangs(course.languages);
      setDefaultLang(course.defaultLanguage);
    }
  }, [course?.id]);

  useEffect(() => {
    if (isOpen && !course) close();
  }, [isOpen, course, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  if (!isOpen || !course) return null;

  const toggleLang = (lang: Language) => {
    setSelectedLangs((prev) => {
      if (prev.includes(lang)) {
        if (prev.length <= 1) return prev;
        return prev.filter((l) => l !== lang);
      }
      return [...prev, lang];
    });
  };

  const handleSave = () => {
    if (!activeCourseId) return;
    updateConfig(activeCourseId, {
      title,
      description,
      languages: selectedLangs,
      defaultLanguage: defaultLang,
    });
    // Sync versions to course.ts working copy so new languages are available
    const currentVersions = useCourseStore.getState().versions;
    const updatedVersions = { ...currentVersions };
    for (const lang of selectedLangs) {
      if (!updatedVersions[lang]) {
        updatedVersions[lang] = { modules: [] };
      }
    }
    useCourseStore.setState({
      title,
      description,
      currentLanguage: defaultLang,
      versions: updatedVersions,
    });
    close();
    navigate(`/course/${activeCourseId}`);
  };

  const handleClose = () => {
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-modal-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} aria-hidden="true" />

      <div
        ref={trapRef}
        className="relative z-10 mx-4 w-full max-w-lg animate-scaleIn rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] p-6 shadow-lg"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="config-modal-title" className="text-lg font-bold text-[var(--color-ink)]">Course Setup</h2>
          <button
            onClick={handleClose}
            aria-label="Close dialog"
            className="focus-ring rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-sunken)]"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
            Course Title
          </span>
          <input
            value={title.en}
            onChange={(e) => setTitleState(setLocalized(title, "en", e.target.value))}
            placeholder="Enter course title..."
            className="focus-ring w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
            Description
          </span>
          <textarea
            value={description.en}
            onChange={(e) => setDescState(setLocalized(description, "en", e.target.value))}
            placeholder="Brief course description..."
            rows={2}
            className="focus-ring w-full resize-none rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]"
          />
        </label>

        <div className="mb-4">
          <span className="mb-2 block text-xs font-medium text-[var(--color-ink)]">
            Languages
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Language selection">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => toggleLang(l.code)}
                aria-pressed={selectedLangs.includes(l.code)}
                className={`focus-ring rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedLangs.includes(l.code)
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
                    : "border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-muted)] hover:border-[var(--color-ink)]"
                }`}
              >
                {l.nativeLabel}
              </button>
            ))}
          </div>
        </div>

        {selectedLangs.length > 1 && (
          <label className="mb-5 block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
              Default Language
            </span>
            <select
              value={defaultLang}
              onChange={(e) => setDefaultLang(e.target.value as Language)}
              className="focus-ring w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)]"
            >
              {selectedLangs.map((l) => {
                const info = LANGUAGES.find((x) => x.code === l);
                return (
                  <option key={l} value={l}>
                    {info?.nativeLabel}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="focus-ring rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-sunken)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.en.trim()}
            aria-label={!title.en.trim() ? "Enter a course title to continue" : "Start building course"}
            className="focus-ring rounded-lg bg-[var(--color-brand)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            Start Building
          </button>
        </div>
      </div>
    </div>
  );
}
