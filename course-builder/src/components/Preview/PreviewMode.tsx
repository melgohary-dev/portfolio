import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle,
  Circle,
} from "lucide-react";
import { useCourseStore, EMPTY_MODULES } from "../../store/course";
import { useUIStore } from "../../store/ui";
import { getLocalized } from "../../lib/localization";
import { cn } from "../../lib/cn";
import { getYouTubeId, renderRichText } from "../../lib/utils";
import { isSafeUrl } from "../../lib/security";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { ANIMATION_DELAY_CLOSE } from "../../lib/constants";
import type { CourseModule, Lesson, ContentBlock } from "../../types";

export default function PreviewMode() {
  const title = useCourseStore((s) => s.title);
  const description = useCourseStore((s) => s.description);
  const modules = useCourseStore((s) => s.versions[s.currentLanguage]?.modules ?? EMPTY_MODULES);
  const currentLanguage = useCourseStore((s) => s.currentLanguage);
  const setPreviewMode = useUIStore((s) => s.setPreviewMode);
  const [visible, setVisible] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>();

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    () => new Set(),
  );
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setVisible(false);
        setTimeout(() => setPreviewMode(false), ANIMATION_DELAY_CLOSE);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [setPreviewMode]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => setPreviewMode(false), ANIMATION_DELAY_CLOSE);
  }, [setPreviewMode]);

  const totalLessons = useMemo(
    () => modules.reduce((a, m) => a + m.lessons.length, 0),
    [modules],
  );
  const progress =
    totalLessons > 0
      ? (completedLessons.size / totalLessons) * 100
      : 0;

  const markLessonComplete = useCallback((lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }, []);

  const goToNextModule = useCallback(() => {
    setActiveModuleIndex((i) => {
      if (i < modules.length - 1) {
        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return i + 1;
      }
      return i;
    });
  }, [modules.length]);

  const goToPrevModule = useCallback(() => {
    setActiveModuleIndex((i) => {
      if (i > 0) {
        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return i - 1;
      }
      return i;
    });
  }, []);

  return (
    <div
      ref={trapRef}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-[var(--color-paper)] transition-all duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Course preview"
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-elevated)] px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[var(--color-brand)]/10 px-3 py-0.5 text-xs font-semibold text-[var(--color-brand)]">
            PREVIEW
          </span>
          <div>
            <h1 className="text-sm font-bold leading-tight">
              {getLocalized(title, currentLanguage)}
            </h1>
            {description.en && (
              <p className="text-[11px] text-[var(--color-muted)] line-clamp-1">
                {getLocalized(description, currentLanguage)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-[var(--color-muted)]">
              {completedLessons.size}/{totalLessons} lessons
            </p>
            <div className="mt-0.5 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-sunken)]">
              <div
                className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-500"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Course progress: ${Math.round(progress)}%`}
              />
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close preview"
            className="focus-ring rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-surface)] md:block" aria-label="Course navigation">
          <div className="p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Course Content
            </p>
            {modules.map((mod, mi) => (
              <PreviewSidebarModule
                key={mod.id}
                module={mod}
                moduleIndex={mi}
                isActive={activeModuleIndex === mi}
                completedLessonIds={completedLessons}
                onSelect={() => setActiveModuleIndex(mi)}
              />
            ))}
          </div>
        </aside>

        <main
          ref={contentRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
            {modules[activeModuleIndex] ? (
              <PreviewContent
                module={modules[activeModuleIndex]}
                moduleIndex={activeModuleIndex}
                completedLessonIds={completedLessons}
                onToggleComplete={markLessonComplete}
              />
            ) : (
              <div className="py-24 text-center">
                <p className="text-lg text-[var(--color-muted)]">
                  No modules to preview
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Add modules and lessons in the builder to see them here
                </p>
              </div>
            )}

            <div className="mt-12 flex items-center justify-between border-t border-[var(--color-line)] pt-6">
              <button
                onClick={goToPrevModule}
                disabled={activeModuleIndex === 0}
                aria-label="Go to previous module"
                className="focus-ring flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-sunken)] disabled:opacity-30"
              >
                <ChevronLeft size={16} />
                Previous Module
              </button>
              {activeModuleIndex < modules.length - 1 ? (
                <button
                  onClick={goToNextModule}
                  aria-label="Go to next module"
                  className="focus-ring flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-hover)]"
                >
                  Next Module
                  <ChevronRight size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-success)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--color-success)]">
                  <CheckCircle size={16} />
                  Course Complete
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const PreviewSidebarModule = React.memo(function PreviewSidebarModule({
  module: mod,
  moduleIndex,
  isActive,
  completedLessonIds,
  onSelect,
}: {
  module: CourseModule;
  moduleIndex: number;
  isActive: boolean;
  completedLessonIds: Set<string>;
  onSelect: () => void;
}) {
  const currentLanguage = useCourseStore((s) => s.currentLanguage);
  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  const completed = mod.lessons.filter((l) => completedLessonIds.has(l.id)).length;
  const total = mod.lessons.length;
  const allDone = total > 0 && completed === total;

  return (
    <div className="mb-1.5">
      <button
        onClick={() => {
          setExpanded(!expanded);
          onSelect();
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all",
          isActive
            ? "bg-[var(--color-brand)] text-white shadow-sm"
            : "hover:bg-[var(--color-sunken)]",
        )}
      >
        {allDone ? (
          <CheckCircle
            size={14}
            className={cn("shrink-0", isActive ? "text-white" : "text-[var(--color-success)]")}
          />
        ) : (
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
              isActive
                ? "border-white/40 text-white/80"
                : "border-[var(--color-line)] text-[var(--color-muted)]",
            )}
          >
            {moduleIndex + 1}
          </span>
        )}
        <span className="flex-1 truncate text-xs font-medium">
          {getLocalized(mod.title, currentLanguage)}
        </span>
        {expanded ? (
          <ChevronDown size={12} className="shrink-0 opacity-60" />
        ) : (
          <ChevronRight size={12} className="shrink-0 opacity-60" />
        )}
      </button>
      {expanded && (
        <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-[var(--color-line)] pl-3">
          {mod.lessons.map((les) => {
            const done = completedLessonIds.has(les.id);
            return (
              <div
                key={les.id}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                  done
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-muted)]",
                )}
              >
                {done ? (
                  <CheckCircle size={10} className="shrink-0" />
                ) : (
                  <Circle size={10} className="shrink-0" />
                )}
                <span className={cn("truncate", done && "line-through opacity-70")}>
                  {getLocalized(les.title, currentLanguage)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

const PreviewContent = React.memo(function PreviewContent({
  module: mod,
  moduleIndex,
  completedLessonIds,
  onToggleComplete,
}: {
  module: CourseModule;
  moduleIndex: number;
  completedLessonIds: Set<string>;
  onToggleComplete: (id: string) => void;
}) {
  const currentLanguage = useCourseStore((s) => s.currentLanguage);

  return (
    <div>
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">
          Module {moduleIndex + 1}
        </p>
        <h2 className="text-3xl font-bold tracking-tight">
          {getLocalized(mod.title, currentLanguage)}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
        </p>
      </div>

      {mod.lessons.map((lesson, li) => (
        <PreviewLessonBlock
          key={lesson.id}
          lesson={lesson}
          lessonIndex={li}
          isComplete={completedLessonIds.has(lesson.id)}
          onToggleComplete={() => onToggleComplete(lesson.id)}
        />
      ))}
    </div>
  );
});

const PreviewLessonBlock = React.memo(function PreviewLessonBlock({
  lesson,
  lessonIndex: _lessonIndex,
  isComplete,
  onToggleComplete,
}: {
  lesson: Lesson;
  lessonIndex: number;
  isComplete: boolean;
  onToggleComplete: () => void;
}) {
  const currentLanguage = useCourseStore((s) => s.currentLanguage);

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-3">
          <button
            onClick={onToggleComplete}
            aria-label={isComplete ? "Mark lesson incomplete" : "Mark lesson complete"}
            aria-pressed={isComplete}
            className={cn(
            "focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
            isComplete
              ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
              : "border-[var(--color-line)] hover:border-[var(--color-brand)]",
          )}
          title={isComplete ? "Mark incomplete" : "Mark complete"}
        >
          {isComplete && <CheckCircle size={14} />}
        </button>
        <div>
          <h3 className="text-lg font-semibold">
            {getLocalized(lesson.title, currentLanguage)}
          </h3>
          <p className="text-xs text-[var(--color-muted)]">
            {lesson.blocks.length} block{lesson.blocks.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="space-y-4 pl-10">
        {lesson.blocks.map((block) => (
          <PreviewBlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
});

const PreviewBlockRenderer = React.memo(function PreviewBlockRenderer({ block }: { block: ContentBlock }) {
  const currentLanguage = useCourseStore((s) => s.currentLanguage);
  const title = getLocalized(block.title, currentLanguage);
  const content = getLocalized(block.content, currentLanguage);
  const videoId = block.type === "video" ? getYouTubeId((block.metadata.url as string) ?? "") : null;

  return (
    <div className="animate-slideUp rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] p-5 transition-all hover:shadow-sm">
      {block.type === "text" && (
        <div>
          {title && (
            <h4 className="mb-2 text-base font-semibold">{title}</h4>
          )}
          <div
            className="prose-custom text-sm leading-relaxed text-[var(--color-muted)]"
            dangerouslySetInnerHTML={{ __html: renderRichText(content) }}
          />
        </div>
      )}

      {block.type === "video" && (
        <div>
          {title && (
            <h4 className="mb-3 text-base font-semibold">{title}</h4>
          )}
          {videoId ? (
            <div className="aspect-video overflow-hidden rounded-lg border border-[var(--color-line)]">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={title || "Video"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (block.metadata.url as string) && isSafeUrl(block.metadata.url as string) ? (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-sunken)]">
              <div className="text-center">
                <Play size={32} className="mx-auto mb-2 text-[var(--color-muted)]" />
                <a
                  href={block.metadata.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-brand)] hover:underline"
                >
                  Open video in new tab
                </a>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-sunken)]">
              <p className="text-sm text-[var(--color-muted)]">No video URL set</p>
            </div>
          )}
          {content && (
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              {content}
            </p>
          )}
        </div>
      )}

      {block.type === "quiz" && (
        <div>
          {title && (
            <h4 className="mb-3 text-base font-semibold">{title}</h4>
          )}
          {Array.isArray(block.metadata.questions) &&
          (block.metadata.questions as unknown[]).length > 0 ? (
            <div className="space-y-3">
              {(
                block.metadata.questions as Array<{
                  id: string;
                  text: string;
                  options: string[];
                  correctIndex: number;
                }>
              ).map((q, qi) => (
                <QuizQuestionPreview key={q.id} question={q} index={qi} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              No questions added yet
            </p>
          )}
        </div>
      )}

      {block.type === "image" && (
        <div>
          {title && (
            <h4 className="mb-3 text-base font-semibold">{title}</h4>
          )}
          {(block.metadata.src as string) && isSafeUrl(block.metadata.src as string) ? (
            <div className="overflow-hidden rounded-lg border border-[var(--color-line)]">
              <img
                src={block.metadata.src as string}
                alt={(block.metadata.alt as string) || title}
                className="max-h-80 w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-sunken)]">
              <p className="text-sm text-[var(--color-muted)]">No image set</p>
            </div>
          )}
          {(block.metadata.caption as string) && (
            <p className="mt-2 text-center text-xs text-[var(--color-muted)] italic">
              {block.metadata.caption as string}
            </p>
          )}
        </div>
      )}

      {block.type === "assignment" && (
        <div>
          {title && (
            <h4 className="mb-3 text-base font-semibold">{title}</h4>
          )}
          {content && (
            <div
              className="prose-custom text-sm leading-relaxed text-[var(--color-muted)]"
              dangerouslySetInnerHTML={{ __html: renderRichText(content) }}
            />
          )}
          {block.metadata.maxScore != null && (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-xs font-medium text-[var(--color-brand)]">
              Max score: {block.metadata.maxScore as number}
            </div>
          )}
        </div>
      )}

      {block.type === "divider" && (
        <hr className="border-[var(--color-line)]" />
      )}

      {block.duration != null && block.duration > 0 && (
        <div className="mt-3 flex items-center gap-1 text-[11px] text-[var(--color-muted)]">
          <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-brand)]" />
          {block.duration} min
        </div>
      )}
    </div>
  );
});

const QuizQuestionPreview = React.memo(function QuizQuestionPreview({
  question,
  index,
}: {
  question: { id: string; text: string; options: string[]; correctIndex: number };
  index: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-sunken)] p-4">
      <p className="mb-3 text-sm font-medium">
        <span className="text-[var(--color-brand)]">Q{index + 1}.</span>{" "}
        {question.text}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((opt, oi) => {
          const isCorrect = question.correctIndex === oi;
          const isSelected = selected === oi;
          return (
            <button
              key={oi}
              onClick={() => !revealed && setSelected(oi)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all",
                revealed && isCorrect
                  ? "border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)]"
                  : revealed && isSelected && !isCorrect
                    ? "border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                    : isSelected
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                      : "border-[var(--color-line)] bg-[var(--color-elevated)] hover:border-[var(--color-brand)]",
              )}
              disabled={revealed}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
});
