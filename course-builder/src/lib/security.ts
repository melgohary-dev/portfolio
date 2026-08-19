import DOMPurify from "dompurify";

/** Sanitize HTML to prevent XSS — use before dangerouslySetInnerHTML */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "code", "pre",
      "h2", "h3", "h4",
      "ul", "ol", "li",
      "a", "blockquote", "hr",
      "span",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
  });
}

/** Validate URL is safe (no javascript: or data: URIs) */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["https:", "http:", "mailto:"].includes(parsed.protocol);
  } catch {
    // Allow relative URLs
    return url.startsWith("/") || url.startsWith("#");
  }
}

/** Validate URL and return it if safe, empty string otherwise */
export function safeUrl(url: string): string {
  return isSafeUrl(url) ? url : "";
}

const BLOCKED_KEYS = new Set([
  "__proto__", "constructor", "prototype",
  "__defineGetter__", "__defineSetter__",
  "__lookupGetter__", "__lookupSetter__",
]);

/** Safe object merge — strips __proto__/constructor/prototype keys */
export function safeMerge<T>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result = { ...target };
  for (const source of sources) {
    for (const key of Object.keys(source)) {
      if (BLOCKED_KEYS.has(key)) continue;
      (result as Record<string, unknown>)[key] = (source as Record<string, unknown>)[key];
    }
  }
  return result;
}
