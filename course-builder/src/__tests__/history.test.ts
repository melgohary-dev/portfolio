import { describe, it, expect, beforeEach } from "vitest";
import { useCourseStore } from "../store/course";
import { useHistoryStore, initHistoryTracking, flushPendingSnapshot } from "../store/history";
import { getLocalized } from "../lib/localization";

const lang = "en" as const;
const get = (obj: { en: string; ar: string; fr: string; de: string }) => getLocalized(obj, lang);

function modules() {
  return useCourseStore.getState().versions.en.modules;
}

beforeEach(() => {
  useCourseStore.setState({
    title: { en: "Test Course", ar: "", fr: "", de: "" },
    description: { en: "", ar: "", fr: "", de: "" },
    versions: { en: { modules: [] }, ar: { modules: [] }, fr: { modules: [] }, de: { modules: [] } },
    currentLanguage: "en",
    activeCourseId: null,
    selectedBlockId: null,
    selectedModuleId: null,
    selectedLessonId: null,
  });
  useHistoryStore.setState({ past: [], future: [] });
  initHistoryTracking();
});

describe("History store — undo/redo", () => {
  it("undo reverts last action", () => {
    useCourseStore.getState().setTitle("Before");
    flushPendingSnapshot();
    useCourseStore.getState().setTitle("After");
    flushPendingSnapshot();
    useHistoryStore.getState().undo();
    expect(get(useCourseStore.getState().title)).toBe("Before");
  });

  it("redo re-applies undone action", () => {
    useCourseStore.getState().setTitle("V1");
    flushPendingSnapshot();
    useCourseStore.getState().setTitle("V2");
    flushPendingSnapshot();
    useHistoryStore.getState().undo();
    useHistoryStore.getState().redo();
    expect(get(useCourseStore.getState().title)).toBe("V2");
  });

  it("canUndo returns true when history exists", () => {
    expect(useHistoryStore.getState().past.length).toBe(0);
    useCourseStore.getState().setTitle("Changed");
    flushPendingSnapshot();
    expect(useHistoryStore.getState().past.length).toBeGreaterThan(0);
  });

  it("canRedo returns true when undone actions exist", () => {
    expect(useHistoryStore.getState().future.length).toBe(0);
    useCourseStore.getState().setTitle("V1");
    flushPendingSnapshot();
    useCourseStore.getState().setTitle("V2");
    flushPendingSnapshot();
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().future.length).toBeGreaterThan(0);
  });

  it("new action after undo clears redo stack", () => {
    useCourseStore.getState().setTitle("V1");
    flushPendingSnapshot();
    useCourseStore.getState().setTitle("V2");
    flushPendingSnapshot();
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().future.length).toBeGreaterThan(0);

    useCourseStore.getState().setTitle("V3");
    flushPendingSnapshot();
    expect(useHistoryStore.getState().future.length).toBe(0);
  });

  it("undo/redo works with addModule", () => {
    useCourseStore.getState().addModule();
    flushPendingSnapshot();
    expect(modules()).toHaveLength(1);

    useHistoryStore.getState().undo();
    expect(modules()).toHaveLength(0);

    useHistoryStore.getState().redo();
    expect(modules()).toHaveLength(1);
  });

  it("undo/redo preserves module content", () => {
    useCourseStore.getState().addModule();
    flushPendingSnapshot();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    flushPendingSnapshot();
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().addBlock(modId, lesId, "text");
    flushPendingSnapshot();
    const blockId = modules()[0].lessons[0].blocks[0].id;

    useHistoryStore.getState().undo();
    useHistoryStore.getState().undo();
    useHistoryStore.getState().undo();
    expect(modules()).toHaveLength(0);

    useHistoryStore.getState().redo();
    useHistoryStore.getState().redo();
    useHistoryStore.getState().redo();
    const mods = modules();
    expect(mods).toHaveLength(1);
    expect(mods[0].lessons).toHaveLength(1);
    expect(mods[0].lessons[0].blocks).toHaveLength(1);
    expect(mods[0].lessons[0].blocks[0].id).toBe(blockId);
  });

  it("undo at empty history is a no-op", () => {
    const titleBefore = useCourseStore.getState().title;
    useHistoryStore.getState().undo();
    expect(useCourseStore.getState().title).toEqual(titleBefore);
  });

  it("redo at empty future is a no-op", () => {
    const titleBefore = useCourseStore.getState().title;
    useHistoryStore.getState().redo();
    expect(useCourseStore.getState().title).toEqual(titleBefore);
  });

  it("clear empties both past and future", () => {
    useCourseStore.getState().setTitle("V1");
    flushPendingSnapshot();
    useCourseStore.getState().setTitle("V2");
    flushPendingSnapshot();
    useHistoryStore.getState().undo();

    useHistoryStore.getState().clear();
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  it("limits history to 50 steps", () => {
    for (let i = 0; i < 60; i++) {
      useCourseStore.getState().setTitle(`Step ${i}`);
      flushPendingSnapshot();
    }
    expect(useHistoryStore.getState().past.length).toBeLessThanOrEqual(50);

    for (let i = 0; i < 50; i++) {
      useHistoryStore.getState().undo();
    }
    const titleBefore = useCourseStore.getState().title;
    useHistoryStore.getState().undo();
    expect(useCourseStore.getState().title).toEqual(titleBefore);
  });
});
