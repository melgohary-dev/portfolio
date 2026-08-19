import { Eye, EyeOff, PanelRight, Sun, Moon, Undo2, Redo2, ArrowLeft, Settings, Award, PanelLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useCourseStore, EMPTY_MODULES } from "../../store/course";
import { useUIStore } from "../../store/ui";
import { useHistoryStore, useCanUndo, useCanRedo } from "../../store/history";
import { useAutoSave } from "../../hooks/useAutoSave";
import { getLocalized } from "../../lib/localization";
import { cn } from "../../lib/cn";
import LanguageTabs from "../LanguageTabs/LanguageTabs";

export default function Toolbar() {
  const title = useCourseStore((s) => s.title);
  const setTitle = useCourseStore((s) => s.setTitle);
  const currentLanguage = useCourseStore((s) => s.currentLanguage);
  const modules = useCourseStore((s) => s.versions[s.currentLanguage]?.modules ?? EMPTY_MODULES);
  const { saved } = useAutoSave();
  const navigate = useNavigate();
  const { courseId } = useParams();

  const previewMode = useUIStore((s) => s.previewMode);
  const togglePreview = useUIStore((s) => s.togglePreview);
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);
  const togglePropertiesPanel = useUIStore((s) => s.togglePropertiesPanel);
  const openConfigModal = useUIStore((s) => s.openConfigModal);
  const toggleMobilePalette = useUIStore((s) => s.toggleMobilePalette);
  const toggleMobileProperties = useUIStore((s) => s.toggleMobileProperties);

  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const totalBlocks = useMemo(
    () => modules.reduce(
      (acc, m) => acc + m.lessons.reduce((a, l) => a + l.blocks.length, 0),
      0,
    ),
    [modules],
  );

  const localizedTitle = getLocalized(title, currentLanguage);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-elevated)] px-4 overflow-x-auto">
      <button
        onClick={() => navigate("/")}
        aria-label="Back to courses"
        className="focus-ring rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={18} />
      </button>

      <button
        onClick={toggleMobilePalette}
        aria-label="Toggle blocks palette"
        className="focus-ring rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)] md:hidden"
      >
        <PanelLeft size={18} />
      </button>

      <button
        onClick={openConfigModal}
        aria-label="Course settings"
        className="focus-ring rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]"
      >
        <Settings size={18} />
      </button>

      <input
        type="text"
        value={localizedTitle}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Course title"
        className="min-w-[200px] max-w-[300px] flex-1 truncate border-none bg-transparent text-lg font-semibold outline-none placeholder:text-[var(--color-muted)]"
        placeholder="Course title..."
      />

      <LanguageTabs />

      <span className="hidden whitespace-nowrap text-xs text-[var(--color-muted)] sm:inline" aria-label={`${modules.length} modules, ${totalBlocks} blocks`}>
        {modules.length} modules · {totalBlocks} blocks
      </span>

      <span
        className={cn(
          "hidden text-xs transition-opacity sm:inline",
          saved ? "text-[var(--color-success)]" : "text-[var(--color-muted)]",
        )}
        role="status"
        aria-live="polite"
      >
        {saved ? "Saved ✓" : "Saving..."}
      </span>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo (Ctrl+Z)"
          className="focus-ring rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-30"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo (Ctrl+Shift+Z)"
          className="focus-ring rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-30"
        >
          <Redo2 size={18} />
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--color-line)]" aria-hidden="true" />

        <button
          onClick={() => {
            if (window.innerWidth < 1024) {
              toggleMobileProperties();
            } else {
              togglePropertiesPanel();
            }
          }}
          aria-label="Toggle properties panel"
          className="focus-ring rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]"
        >
          <PanelRight size={18} />
        </button>

        {courseId && (
          <button
            onClick={() => navigate(`/course/${courseId}/certificate`)}
            aria-label="Certificate builder"
            className="focus-ring rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]"
          >
            <Award size={18} />
          </button>
        )}

        <button
          onClick={toggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="focus-ring rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--color-line)]" aria-hidden="true" />

        <button
          onClick={togglePreview}
          aria-label={previewMode ? "Exit preview mode" : "Enter preview mode"}
          className={cn(
            "focus-ring relative z-[60] flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            previewMode
              ? "bg-[var(--color-brand)] text-white"
              : "bg-[var(--color-sunken)] text-[var(--color-ink)] hover:bg-[var(--color-line)]",
          )}
        >
          {previewMode ? <EyeOff size={16} /> : <Eye size={16} />}
          {previewMode ? "Exit Preview" : "Preview"}
        </button>
      </div>
    </header>
  );
}
