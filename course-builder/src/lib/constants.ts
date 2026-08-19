import { FileText, Video, CircleHelp, Image, ClipboardList, Minus } from "lucide-react";
import type { Language, BlockType, CertificateTemplate } from "../types";

/** Supported languages */
export const LANGUAGES: { code: Language; label: string; nativeLabel: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" },
];

export const LANGUAGE_MAP: Record<Language, (typeof LANGUAGES)[number]> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
) as Record<Language, (typeof LANGUAGES)[number]>;

/** Get text direction for a language */
export function getLanguageDirection(lang: Language): "ltr" | "rtl" {
  return LANGUAGE_MAP[lang]?.dir ?? "ltr";
}

/** Display labels for each block type */
export const BLOCK_LABELS: Record<BlockType, string> = {
  text: "Text",
  video: "Video",
  quiz: "Quiz",
  image: "Image",
  assignment: "Assignment",
  divider: "Divider",
};

/** Block type icons — shared across Palette, BlockRenderer, DragOverlayContent */
export const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ size?: number; className?: string }>> = {
  text: FileText,
  video: Video,
  quiz: CircleHelp,
  image: Image,
  assignment: ClipboardList,
  divider: Minus,
};

/** Named animation delay constants */
export const ANIMATION_DELAY_CLOSE = 200;
export const ANIMATION_DELAY_CLEAR_ANNOUNCER = 1000;
export const DEBOUNCE_DELAY_AUTO_SAVE = 800;
export const DEBOUNCE_DELAY_HISTORY_SNAPSHOT = 500;

/** Certificate templates */
export const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Formal certificate with elegant borders",
    preview: "classic",
    defaultConfig: {
      backgroundColor: "#ffffff",
      borderColor: "#1e3a5f",
      accentColor: "#1e3a5f",
      showDate: true,
      showInstructor: true,
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Clean and minimal design",
    preview: "modern",
    defaultConfig: {
      backgroundColor: "#f8fafc",
      borderColor: "#6366f1",
      accentColor: "#6366f1",
      showDate: true,
      showInstructor: true,
    },
  },
  {
    id: "professional",
    name: "Professional",
    description: "Corporate-style with accent bar",
    preview: "professional",
    defaultConfig: {
      backgroundColor: "#ffffff",
      borderColor: "#0f172a",
      accentColor: "#f59e0b",
      showDate: true,
      showInstructor: true,
    },
  },
  {
    id: "creative",
    name: "Creative",
    description: "Colorful and decorative",
    preview: "creative",
    defaultConfig: {
      backgroundColor: "#fefce8",
      borderColor: "#e11d48",
      accentColor: "#7c3aed",
      showDate: true,
      showInstructor: true,
    },
  },
];
