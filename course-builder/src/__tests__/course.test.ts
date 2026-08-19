import { describe, it, expect, beforeEach } from "vitest";
import { useCourseStore } from "../store/course";
import { getLocalized } from "../lib/localization";
import { LANGUAGE_MAP, getLanguageDirection } from "../lib/constants";

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
});

const lang = "en" as const;
const get = (obj: { en: string; ar: string; fr: string; de: string }) => getLocalized(obj, lang);

function modules() {
  return useCourseStore.getState().versions.en.modules;
}

describe("Course store — modules", () => {
  it("addModule creates a module with default title", () => {
    useCourseStore.getState().addModule();
    const mods = modules();
    expect(mods).toHaveLength(1);
    expect(get(mods[0].title)).toMatch(/New Module/);
    expect(mods[0].lessons).toEqual([]);
    expect(mods[0].collapsed).toBe(false);
  });

  it("addModule auto-numbers the title", () => {
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();
    const mods = modules();
    expect(get(mods[0].title)).toBe("New Module 1");
    expect(get(mods[1].title)).toBe("New Module 2");
  });

  it("removeModule removes by id", () => {
    useCourseStore.getState().addModule();
    const id = modules()[0].id;
    useCourseStore.getState().removeModule(id);
    expect(modules()).toHaveLength(0);
  });

  it("removeModule clears selection if selected module is removed", () => {
    useCourseStore.getState().addModule();
    const id = modules()[0].id;
    useCourseStore.getState().selectBlock(id, "lesson", "block");
    useCourseStore.getState().removeModule(id);
    expect(useCourseStore.getState().selectedBlockId).toBeNull();
  });

  it("reorderModules changes module order", () => {
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();
    useCourseStore.getState().reorderModules(0, 2);
    const mods = modules();
    expect(get(mods[0].title)).toBe("New Module 2");
    expect(get(mods[2].title)).toBe("New Module 1");
  });

  it("renameModule updates title for current language", () => {
    useCourseStore.getState().addModule();
    const id = modules()[0].id;
    useCourseStore.getState().renameModule(id, "Custom Title");
    expect(get(modules()[0].title)).toBe("Custom Title");
  });

  it("toggleModuleCollapse toggles collapsed flag", () => {
    useCourseStore.getState().addModule();
    const id = modules()[0].id;
    expect(modules()[0].collapsed).toBe(false);
    useCourseStore.getState().toggleModuleCollapse(id);
    expect(modules()[0].collapsed).toBe(true);
    useCourseStore.getState().toggleModuleCollapse(id);
    expect(modules()[0].collapsed).toBe(false);
  });
});

describe("Course store — lessons", () => {
  it("addLesson adds to correct module", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    expect(modules()[0].lessons).toHaveLength(1);
  });

  it("removeLesson removes by id", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().removeLesson(modId, lesId);
    expect(modules()[0].lessons).toHaveLength(0);
  });

  it("reorderLessons changes order within module", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    useCourseStore.getState().addLesson(modId);
    useCourseStore.getState().addLesson(modId);
    useCourseStore.getState().reorderLessons(modId, 0, 2);
    const lessons = modules()[0].lessons;
    expect(get(lessons[0].title)).toBe("New Lesson 2");
    expect(get(lessons[2].title)).toBe("New Lesson 1");
  });

  it("renameLesson updates title for current language", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().renameLesson(modId, lesId, "My Lesson");
    expect(get(modules()[0].lessons[0].title)).toBe("My Lesson");
  });
});

describe("Course store — blocks", () => {
  it("addBlock adds to correct lesson with correct defaults", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().addBlock(modId, lesId, "text");
    const blocks = modules()[0].lessons[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    expect(get(blocks[0].title)).toBe("Text Block");
    expect(blocks[0].id).toBeTruthy();
  });

  it("addBlock at specific index inserts correctly", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().addBlock(modId, lesId, "text");
    useCourseStore.getState().addBlock(modId, lesId, "video", 0);
    const blocks = modules()[0].lessons[0].blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("video");
    expect(blocks[1].type).toBe("text");
  });

  it("removeBlock removes by id", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().addBlock(modId, lesId, "text");
    const blockId = modules()[0].lessons[0].blocks[0].id;
    useCourseStore.getState().removeBlock(modId, lesId, blockId);
    expect(modules()[0].lessons[0].blocks).toHaveLength(0);
  });

  it("updateBlock modifies block title and content for current language", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().addBlock(modId, lesId, "text");
    const blockId = modules()[0].lessons[0].blocks[0].id;
    const block = modules()[0].lessons[0].blocks[0];
    useCourseStore.getState().updateBlock(modId, lesId, blockId, {
      title: { ...block.title, en: "Updated" },
      content: { ...block.content, en: "New content" },
    });
    const updated = modules()[0].lessons[0].blocks[0];
    expect(get(updated.title)).toBe("Updated");
    expect(get(updated.content)).toBe("New content");
  });

  it("reorderBlocks changes order within lesson", () => {
    useCourseStore.getState().addModule();
    const modId = modules()[0].id;
    useCourseStore.getState().addLesson(modId);
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().addBlock(modId, lesId, "text");
    useCourseStore.getState().addBlock(modId, lesId, "video");
    useCourseStore.getState().reorderBlocks(modId, lesId, 0, 1);
    const blocks = modules()[0].lessons[0].blocks;
    expect(blocks[0].type).toBe("video");
    expect(blocks[1].type).toBe("text");
  });
});

describe("Course store — selection", () => {
  it("selectBlock sets all three IDs", () => {
    useCourseStore.getState().selectBlock("mod1", "les1", "blk1");
    expect(useCourseStore.getState().selectedModuleId).toBe("mod1");
    expect(useCourseStore.getState().selectedLessonId).toBe("les1");
    expect(useCourseStore.getState().selectedBlockId).toBe("blk1");
  });

  it("deselectBlock clears all three IDs", () => {
    useCourseStore.getState().selectBlock("mod1", "les1", "blk1");
    useCourseStore.getState().deselectBlock();
    expect(useCourseStore.getState().selectedBlockId).toBeNull();
    expect(useCourseStore.getState().selectedModuleId).toBeNull();
    expect(useCourseStore.getState().selectedLessonId).toBeNull();
  });
});

describe("Course store — cross-container moves", () => {
  it("moveBlock moves block between lessons", () => {
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();
    const [mod1, mod2] = modules();
    useCourseStore.getState().addLesson(mod1.id);
    useCourseStore.getState().addLesson(mod2.id);
    const les1 = modules()[0].lessons[0].id;
    const les2 = modules()[1].lessons[0].id;
    useCourseStore.getState().addBlock(mod1.id, les1, "text");
    const blockId = modules()[0].lessons[0].blocks[0].id;
    useCourseStore.getState().moveBlock(mod1.id, les1, 0, mod2.id, les2, 0);
    expect(modules()[0].lessons[0].blocks).toHaveLength(0);
    expect(modules()[1].lessons[0].blocks).toHaveLength(1);
    expect(modules()[1].lessons[0].blocks[0].id).toBe(blockId);
  });

  it("moveLesson moves lesson between modules", () => {
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();
    const [mod1, mod2] = modules();
    useCourseStore.getState().addLesson(mod1.id);
    const lesId = modules()[0].lessons[0].id;
    useCourseStore.getState().moveLesson(mod1.id, 0, mod2.id, 0);
    expect(modules()[0].lessons).toHaveLength(0);
    expect(modules()[1].lessons).toHaveLength(1);
    expect(modules()[1].lessons[0].id).toBe(lesId);
  });
});

describe("Course store — metadata", () => {
  it("setTitle updates title for current language", () => {
    useCourseStore.getState().setTitle("My Course");
    expect(get(useCourseStore.getState().title)).toBe("My Course");
  });

  it("setDescription updates description for current language", () => {
    useCourseStore.getState().setDescription("A description");
    expect(get(useCourseStore.getState().description)).toBe("A description");
  });
});

describe("Course store — language switching", () => {
  it("setLanguage changes current language", () => {
    useCourseStore.getState().setLanguage("ar");
    expect(useCourseStore.getState().currentLanguage).toBe("ar");
  });

  it("setTitle only updates current language", () => {
    useCourseStore.getState().setTitle("Arabic Title");
    useCourseStore.getState().setLanguage("ar");
    useCourseStore.getState().setTitle("عنوان عربي");
    expect(useCourseStore.getState().title.en).toBe("Arabic Title");
    expect(useCourseStore.getState().title.ar).toBe("عنوان عربي");
  });

  it("resetCourse clears everything", () => {
    useCourseStore.getState().addModule();
    useCourseStore.getState().setTitle("My Course");
    useCourseStore.getState().resetCourse();
    expect(useCourseStore.getState().versions.en.modules).toHaveLength(0);
    expect(useCourseStore.getState().title.en).toBe("Untitled Course");
  });

  it("each language has independent modules", () => {
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();
    expect(modules()).toHaveLength(2);

    // Switch to Arabic — should be empty
    useCourseStore.getState().setLanguage("ar");
    expect(useCourseStore.getState().versions.ar.modules).toHaveLength(0);

    // Add modules in Arabic
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();
    expect(useCourseStore.getState().versions.ar.modules).toHaveLength(3);

    // Switch back to English — should still have 2
    useCourseStore.getState().setLanguage("en");
    expect(modules()).toHaveLength(2);
  });

  it("switchLanguage loads new version and saves old", () => {
    useCourseStore.getState().addModule();
    useCourseStore.getState().addModule();

    // Mock syncFromBuilder to just read current state
    const switchLang = useCourseStore.getState().switchLanguage;
    switchLang("ar");

    // Arabic version should be loaded
    expect(useCourseStore.getState().currentLanguage).toBe("ar");
    expect(useCourseStore.getState().versions.ar.modules).toHaveLength(0);

    // Add in Arabic
    useCourseStore.getState().addModule();
    expect(useCourseStore.getState().versions.ar.modules).toHaveLength(1);

    // Switch back to English
    useCourseStore.getState().switchLanguage("en");
    expect(modules()).toHaveLength(2);
  });
});

describe("RTL support", () => {
  it("LANGUAGE_MAP has all languages with correct direction", () => {
    expect(LANGUAGE_MAP.en.dir).toBe("ltr");
    expect(LANGUAGE_MAP.ar.dir).toBe("rtl");
    expect(LANGUAGE_MAP.fr.dir).toBe("ltr");
    expect(LANGUAGE_MAP.de.dir).toBe("ltr");
  });

  it("getLanguageDirection returns correct direction", () => {
    expect(getLanguageDirection("en")).toBe("ltr");
    expect(getLanguageDirection("ar")).toBe("rtl");
    expect(getLanguageDirection("fr")).toBe("ltr");
    expect(getLanguageDirection("de")).toBe("ltr");
  });
});
