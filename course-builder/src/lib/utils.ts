import { sanitizeHtml, isSafeUrl } from "./security";

/** Extract YouTube video ID from various URL formats */
export function getYouTubeId(url: string): string | null {
  if (!url || !isSafeUrl(url)) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

/** Render text content to HTML — sanitizes TipTap HTML, falls back to markdown */
export function renderRichText(text: string): string {
  if (!text) return "";
  // If content is already HTML (from TipTap), sanitize and render
  if (isHtml(text)) return sanitizeHtml(text);

  // Legacy markdown fallback
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label, url) => {
      if (!isSafeUrl(url)) return `[${label}]`;
      const safeHref = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="underline text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]">${label}</a>`;
    },
  );
  html = html.replace(/`(.+?)`/g, '<code class="rounded bg-[var(--color-sunken)] px-1 py-0.5 text-xs">$1</code>');
  html = html
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return sanitizeHtml(html);
}
