import { create } from "zustand";
import { useCourseStore, type CourseState } from "./course";
import { DEBOUNCE_DELAY_HISTORY_SNAPSHOT } from "../lib/constants";

type Snapshot = Pick<CourseState, "title" | "description"> & {
  modules: CourseState["versions"][CourseState["currentLanguage"]]["modules"];
};

const MAX_HISTORY = 50;

function cloneModules(mods: CourseState["versions"][CourseState["currentLanguage"]]["modules"]): CourseState["versions"][CourseState["currentLanguage"]]["modules"] {
  return structuredClone(mods);
}

function takeSnapshot(): Snapshot {
  const { title, description, currentLanguage, versions } = useCourseStore.getState();
  return {
    title,
    description,
    modules: cloneModules(versions[currentLanguage]?.modules ?? []),
  };
}

function applySnapshot(snap: Snapshot) {
  const { currentLanguage } = useCourseStore.getState();
  useCourseStore.setState({
    title: snap.title,
    description: snap.description,
    versions: {
      ...useCourseStore.getState().versions,
      [currentLanguage]: { modules: cloneModules(snap.modules) },
    },
  });
}

interface HistoryState {
  past: Snapshot[];
  future: Snapshot[];
  undo: () => void;
  redo: () => void;
  clear: () => void;
  record: (snapshot: Snapshot) => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],

  record: (snapshot) => {
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot],
      future: [],
    }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;

    const currentSnap = takeSnapshot();
    const prevSnap = past[past.length - 1];

    applySnapshot(prevSnap);
    set({
      past: past.slice(0, -1),
      future: [...future, currentSnap],
    });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;

    const currentSnap = takeSnapshot();
    const nextSnap = future[future.length - 1];

    applySnapshot(nextSnap);
    set({
      past: [...past, currentSnap],
      future: future.slice(0, -1),
    });
  },

  clear: () => set({ past: [], future: [] }),
}));

export function useCanUndo(): boolean {
  return useHistoryStore((s) => s.past.length > 0);
}

export function useCanRedo(): boolean {
  return useHistoryStore((s) => s.future.length > 0);
}

/** Subscribe to course store changes and auto-record snapshots (debounced) */
let initialized = false;
let _flushFn: (() => void) | null = null;

export function flushPendingSnapshot() {
  if (_flushFn) _flushFn();
}

export function initHistoryTracking() {
  if (initialized) return;
  initialized = true;

  let skipNext = false;
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSnapshot: Snapshot | null = null;

  function flushSnapshot() {
    if (snapshotTimer) {
      clearTimeout(snapshotTimer);
      snapshotTimer = null;
    }
    if (pendingSnapshot) {
      useHistoryStore.getState().record(pendingSnapshot);
      pendingSnapshot = null;
    }
  }
  _flushFn = flushSnapshot;

  useCourseStore.subscribe((state, prevState) => {
    if (skipNext) {
      skipNext = false;
      return;
    }
    const prevModules = prevState.versions[prevState.currentLanguage]?.modules;
    const curModules = state.versions[state.currentLanguage]?.modules;
    if (
      curModules !== prevModules ||
      state.title !== prevState.title ||
      state.description !== prevState.description
    ) {
      pendingSnapshot = {
        title: prevState.title,
        description: prevState.description,
        modules: cloneModules(prevModules ?? []),
      };
      if (snapshotTimer) clearTimeout(snapshotTimer);
      snapshotTimer = setTimeout(flushSnapshot, DEBOUNCE_DELAY_HISTORY_SNAPSHOT);
    }
  });

  // Flush any pending snapshot before unload
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flushSnapshot);
  }

  // Patch undo/redo to skip recording during restore
  const origUndo = useHistoryStore.getState().undo;
  const origRedo = useHistoryStore.getState().redo;

  useHistoryStore.setState({
    undo: () => {
      flushSnapshot();
      skipNext = true;
      origUndo();
    },
    redo: () => {
      flushSnapshot();
      skipNext = true;
      origRedo();
    },
  });
}
