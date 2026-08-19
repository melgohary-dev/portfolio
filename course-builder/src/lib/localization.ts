import type { Language, LocalizedText } from "../types";

const ALL_LANGUAGES: Language[] = ["en", "ar", "fr", "de"];

/** Create a localized text with defaults */
export function createLocalized(
  defaults: Partial<Record<Language, string>> = {},
): LocalizedText {
  return Object.fromEntries(
    ALL_LANGUAGES.map((lang) => [lang, defaults[lang] ?? ""]),
  ) as LocalizedText;
}

/** Get text for a specific language with fallback */
export function getLocalized(
  text: LocalizedText,
  lang: Language,
  fallback?: Language,
): string {
  const value = text[lang];
  if (value) return value;
  if (fallback && text[fallback]) return text[fallback];
  // Fall back to English, then first non-empty value
  if (text.en) return text.en;
  for (const v of Object.values(text)) {
    if (v) return v;
  }
  return "";
}

/** Set text for a specific language */
export function setLocalized(
  text: LocalizedText,
  lang: Language,
  value: string,
): LocalizedText {
  return { ...text, [lang]: value };
}

/** Get all non-empty languages for a localized text */
export function getFilledLanguages(
  text: LocalizedText,
  languages: Language[],
): Language[] {
  return languages.filter((lang) => text[lang]?.trim());
}

/** Create localized defaults for module titles */
export function moduleTitle(index: number): LocalizedText {
  return createLocalized({
    en: `New Module ${index}`,
    ar: `وحدة جديدة ${index}`,
    fr: `Nouveau module ${index}`,
    de: `Neues Modul ${index}`,
  });
}

/** Create localized defaults for lesson titles */
export function lessonTitle(index: number): LocalizedText {
  return createLocalized({
    en: `New Lesson ${index}`,
    ar: `درس جديد ${index}`,
    fr: `Nouvelle leçon ${index}`,
    de: `Neue Lektion ${index}`,
  });
}
