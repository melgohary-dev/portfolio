import hljs from "highlight.js/lib/core";
import "highlight.js/lib/common";

function normalizeLanguage(language: string | undefined): string {
  const clean = language?.trim().toLowerCase() ?? "";
  if (
    clean === "" ||
    clean === "text" ||
    clean === "txt" ||
    clean === "plaintext"
  ) {
    return "plaintext";
  }
  return clean;
}

/** Highlight a code snippet into safely-escaped HTML for a given language. */
export function highlightCode(code: string, language?: string): string {
  const lang = normalizeLanguage(language);
  const grammar = hljs.getLanguage(lang);
  if (grammar) {
    return hljs.highlight(code, { language: lang }).value;
  }
  return hljs.highlightAuto(code).value;
}