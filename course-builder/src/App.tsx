import { useState, useCallback, useRef, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCourseStore, EMPTY_MODULES } from "./store/course";
import { useUIStore } from "./store/ui";
import { useCoursesStore } from "./store/courses";
import { initHistoryTracking, useHistoryStore } from "./store/history";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import Toolbar from "./components/Toolbar/Toolbar";
import Palette from "./components/Palette/Palette";
import Canvas from "./components/Canvas/Canvas";
import PropertiesPanel from "./components/Properties/PropertiesPanel";
import DragOverlayContent from "./components/Canvas/DragOverlayContent";
import PreviewMode from "./components/Preview/PreviewMode";
import CoursesList from "./components/CoursesList/CoursesList";
import CourseConfigModal from "./components/CourseConfig/CourseConfigModal";
import CertificateBuilder from "./components/Certificate/CertificateBuilder";
import { getLanguageDirection } from "./lib/constants";
import ErrorBoundary from "./components/ErrorBoundary";
import type { DragData, BlockType } from "./types";

/** Shared hook for loading a course into the builder store */
function useCourseLoader() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const loadedRef = useRef<string | null>(null);
  const course = useCoursesStore((s) => (courseId ? s.courses[courseId] ?? null : null));

  useEffect(() => {
    const coursesState = useCoursesStore.getState().courses;
    const courseData = courseId ? coursesState[courseId] : undefined;
    if (courseId && courseData) {
      if (loadedRef.current && loadedRef.current !== courseId) {
        useCoursesStore.getState().syncFromBuilder(loadedRef.current);
      }
      useCoursesStore.getState().setActiveCourse(courseId);
      useHistoryStore.getState().clear();
      useCourseStore.getState().loadCourse(courseData);
      loadedRef.current = courseId;
    } else if (courseId && !courseData) {
      navigate("/", { replace: true });
    }

    return () => {
      if (loadedRef.current) {
        useCoursesStore.getState().syncFromBuilder(loadedRef.current);
        loadedRef.current = null;
      }
    };
  }, [courseId, navigate]);

  return { courseId, course };
}

function BuilderView() {
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const activeDragRef = useRef<DragData | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const addBlock = useCourseStore((s) => s.addBlock);
  const moveBlock = useCourseStore((s) => s.moveBlock);
  const moveLesson = useCourseStore((s) => s.moveLesson);
  const reorderModules = useCourseStore((s) => s.reorderModules);
  const modules = useCourseStore((s) => s.versions[s.currentLanguage]?.modules ?? EMPTY_MODULES);
  const currentLanguage = useCourseStore((s) => s.currentLanguage);
  const deselectBlock = useCourseStore((s) => s.deselectBlock);
  const previewMode = useUIStore((s) => s.previewMode);
  const propertiesPanelOpen = useUIStore((s) => s.propertiesPanelOpen);
  const mobilePaletteOpen = useUIStore((s) => s.mobilePaletteOpen);
  const closeMobilePalette = useUIStore((s) => s.closeMobilePalette);
  const mobilePropertiesOpen = useUIStore((s) => s.mobilePropertiesOpen);
  const closeMobileProperties = useUIStore((s) => s.closeMobileProperties);

  useEffect(() => {
    initHistoryTracking();
  }, []);

  useKeyboardShortcuts();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) {
      setActiveDrag(data);
      activeDragRef.current = data;

      const label =
        data.type === "palette-block"
          ? `Picked up ${data.blockType} block`
          : data.type === "module"
            ? "Picked up module"
            : data.type === "lesson"
              ? "Picked up lesson"
              : "Picked up block";
      setAnnouncement(label);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);
      activeDragRef.current = null;

      if (!over) {
        setAnnouncement("Drag cancelled");
        return;
      }

      const activeData = active.data.current as DragData | undefined;
      const overData = over.data.current as DragData | undefined;

      if (!activeData) return;

      if (activeData.type === "palette-block" && overData) {
        const blockType = activeData.blockType as BlockType;

        if (overData.type === "lesson") {
          addBlock(overData.moduleId!, overData.id, blockType);
        } else if (overData.type === "module") {
          const mod = modules.find((m) => m.id === overData.id);
          if (mod && mod.lessons.length > 0) {
            addBlock(overData.id, mod.lessons[0].id, blockType);
          }
        } else if (overData.type === "block" && overData.moduleId && overData.lessonId) {
          addBlock(overData.moduleId, overData.lessonId, blockType);
        }
        deselectBlock();
        setAnnouncement(`Dropped ${blockType} block`);
        return;
      }

      if (active.id === over.id) {
        setAnnouncement("Dropped in same position");
        return;
      }

      const activeType = activeData.type;
      const overType = overData?.type;

      if (!activeType || !overType) return;

      if (activeType === "module" && overType === "module") {
        const fromIndex = modules.findIndex((m) => m.id === active.id);
        const toIndex = modules.findIndex((m) => m.id === over.id);
        if (fromIndex !== -1 && toIndex !== -1) {
          reorderModules(fromIndex, toIndex);
          setAnnouncement("Module reordered");
        }
        return;
      }

      if (activeType === "lesson" && overType === "lesson") {
        const activeModId = activeData.moduleId;
        const overModId = overData?.moduleId;

        if (activeModId && overModId) {
          const sourceMod = modules.find((m) => m.id === activeModId);
          const fromIndex = sourceMod?.lessons.findIndex((l) => l.id === active.id) ?? -1;
          const destMod = modules.find((m) => m.id === overModId);
          const toIndex = destMod?.lessons.findIndex((l) => l.id === over.id) ?? -1;

          if (fromIndex !== -1 && toIndex !== -1) {
            moveLesson(activeModId, fromIndex, overModId, toIndex);
            setAnnouncement(
              activeModId === overModId ? "Lesson reordered" : "Lesson moved",
            );
          }
        }
        return;
      }

      if (activeType === "block" && (overType === "block" || overType === "lesson")) {
        const activeModId = activeData.moduleId;
        const activeLessonId = activeData.lessonId;
        const overModId = overData?.moduleId ?? activeModId;
        const overLessonId = overData?.type === "lesson" ? overData.id : overData?.lessonId;

        if (activeModId && activeLessonId && overModId && overLessonId) {
          const sourceMod = modules.find((m) => m.id === activeModId);
          const sourceLesson = sourceMod?.lessons.find((l) => l.id === activeLessonId);
          const fromIndex = sourceLesson?.blocks.findIndex((b) => b.id === active.id) ?? -1;

          let toIndex: number;
          if (overType === "lesson") {
            const destMod = modules.find((m) => m.id === overModId);
            const destLesson = destMod?.lessons.find((l) => l.id === overLessonId);
            toIndex = destLesson?.blocks.length ?? 0;
          } else {
            const destMod = modules.find((m) => m.id === overModId);
            const destLesson = destMod?.lessons.find((l) => l.id === overLessonId);
            toIndex = destLesson?.blocks.findIndex((b) => b.id === over.id) ?? 0;
          }

          if (fromIndex !== -1) {
            moveBlock(activeModId, activeLessonId, fromIndex, overModId, overLessonId, toIndex);
            setAnnouncement(
              activeLessonId === overLessonId ? "Block reordered" : "Block moved",
            );
          }
        }
        return;
      }
    },
    [addBlock, moveBlock, moveLesson, reorderModules, modules, deselectBlock],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div dir={getLanguageDirection(currentLanguage)} className="flex h-screen flex-col overflow-hidden bg-[var(--color-paper)] text-[var(--color-ink)]">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-60 shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface)] md:block">
            <Palette />
          </aside>

          <main
            className="flex-1 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) deselectBlock();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") deselectBlock();
            }}
          >
            <Canvas />
          </main>

          {propertiesPanelOpen && (
            <aside className="hidden w-72 shrink-0 border-l border-[var(--color-line)] bg-[var(--color-surface)] lg:block">
              <PropertiesPanel />
            </aside>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? <DragOverlayContent data={activeDrag} /> : null}
      </DragOverlay>

      {mobilePaletteOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMobilePalette}
          />
          <aside className="absolute inset-y-0 left-0 w-60 overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] p-3">
              <h2 className="text-sm font-semibold">Blocks</h2>
              <button
                onClick={closeMobilePalette}
                aria-label="Close palette"
                className="focus-ring rounded-md p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-sunken)]"
              >
                ✕
              </button>
            </div>
            <Palette />
          </aside>
        </div>
      )}

      {mobilePropertiesOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMobileProperties}
          />
          <aside className="absolute inset-y-0 right-0 w-72 overflow-y-auto border-l border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] p-3">
              <h2 className="text-sm font-semibold">Properties</h2>
              <button
                onClick={closeMobileProperties}
                aria-label="Close properties"
                className="focus-ring rounded-md p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-sunken)]"
              >
                ✕
              </button>
            </div>
            <PropertiesPanel />
          </aside>
        </div>
      )}

      {previewMode && <PreviewMode />}

      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </DndContext>
  );
}

function BuilderPage() {
  const { course } = useCourseLoader();
  const configModalOpen = useUIStore((s) => s.configModalOpen);

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-paper)]">
        <div className="text-center">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent mx-auto" />
          <p className="text-sm text-[var(--color-muted)]">Loading course…</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BuilderView />
      {configModalOpen && <CourseConfigModal />}
    </ErrorBoundary>
  );
}

function CertificatePage() {
  const { course } = useCourseLoader();

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-paper)]">
        <div className="text-center">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent mx-auto" />
          <p className="text-sm text-[var(--color-muted)]">Loading certificate…</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CertificateBuilder />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div id="a11y-announcer" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      <Routes>
        <Route path="/" element={<ErrorBoundary><CoursesList /></ErrorBoundary>} />
        <Route path="/course/:courseId" element={<BuilderPage />} />
        <Route path="/course/:courseId/certificate" element={<CertificatePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
