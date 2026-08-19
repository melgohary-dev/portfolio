import { nanoid } from "nanoid";
import type { ContentBlock, BlockType } from "../types";
import { createLocalized } from "./localization";

/** Generate a unique ID for blocks, lessons, and modules */
export function createId(): string {
  return nanoid(10);
}

/** Factory for default content blocks by type */
export function createBlock(type: BlockType): ContentBlock {
  switch (type) {
    case "text":
      return {
        id: createId(),
        type: "text",
        title: createLocalized({ en: "Text Block", ar: "نص", fr: "Bloc de texte", de: "Textblock" }),
        content: createLocalized({ en: "Enter your content here...", ar: "...أدخل المحتوى هنا", fr: "Entrez votre contenu ici...", de: "Geben Sie Ihren Inhalt hier ein..." }),
        duration: 5,
        metadata: {},
      };
    case "video":
      return {
        id: createId(),
        type: "video",
        title: createLocalized({ en: "Video Lesson", ar: "درس فيديو", fr: "Leçon vidéo", de: "Videolektion" }),
        content: createLocalized(),
        duration: 10,
        metadata: { url: "" },
      };
    case "quiz":
      return {
        id: createId(),
        type: "quiz",
        title: createLocalized({ en: "Quiz", ar: "اختبار", fr: "Quiz", de: "Quiz" }),
        content: createLocalized(),
        metadata: { questions: [] },
      };
    case "image":
      return {
        id: createId(),
        type: "image",
        title: createLocalized({ en: "Image", ar: "صورة", fr: "Image", de: "Bild" }),
        content: createLocalized(),
        metadata: { src: "", caption: "", alt: "" },
      };
    case "assignment":
      return {
        id: createId(),
        type: "assignment",
        title: createLocalized({ en: "Assignment", ar: "واجب", fr: "Devoir", de: "Aufgabe" }),
        content: createLocalized({ en: "Describe the task...", ar: "...صف المهمة", fr: "Décrivez la tâche...", de: "Beschreiben Sie die Aufgabe..." }),
        metadata: { maxScore: 100 },
      };
    case "divider":
      return {
        id: createId(),
        type: "divider",
        title: createLocalized(),
        content: createLocalized(),
        metadata: {},
      };
  }
}
