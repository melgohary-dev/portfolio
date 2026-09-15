import DOMPurify from "dompurify";

export interface CodeBlock {
  language: string;
  code: string;
}

/** Split a markdown string into inline-markdown segments and fenced code blocks. */
export function segmentMarkdown(source: string): Array<
  { kind: "text"; value: string } | { kind: "code"; value: CodeBlock }
> {
  const segments: Array<
    { kind: "text"; value: string } | { kind: "code"; value: CodeBlock }
  > = [];
  const fenceRe = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: "text",
        value: source.slice(lastIndex, match.index),
      });
    }
    segments.push({
      kind: "code",
      value: { language: match[1] || "text", code: match[2].replace(/\n$/, "") },
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    segments.push({ kind: "text", value: source.slice(lastIndex) });
  }

  return segments;
}

/** Escape HTML special characters. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Convert inline markdown (bold, italic, inline code, links) to safe HTML. */
function renderInline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

/** Render a text-only markdown block (no fenced code) to sanitized HTML string. */
export function renderMarkdownText(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listType) {
      const tag = listType;
      out.push(`<${tag}>${list.map((li) => `<li>${li}</li>`).join("")}</${tag}>`);
      list = [];
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);

    if (heading) {
      flushList();
      const level = Math.min(heading[1].length, 3);
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      const isOl = Boolean(numbered);
      if (listType && listType !== (isOl ? "ol" : "ul")) flushList();
      listType = isOl ? "ol" : "ul";
      list.push(renderInline((bullet ?? numbered)![1]));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      out.push(`<p>${renderInline(line)}</p>`);
    }
  }
  flushList();

  return DOMPurify.sanitize(out.join(""), {
    ALLOWED_TAGS: [
      "p",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "code",
      "a",
      "br",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/** Full renderer: turns markdown source into an array of HTML-safe segments. */
export function renderMarkdown(source: string): Array<
  { kind: "html"; value: string } | { kind: "code"; value: CodeBlock }
> {
  return segmentMarkdown(source).map((seg) =>
    seg.kind === "code"
      ? { kind: "code" as const, value: seg.value }
      : { kind: "html" as const, value: renderMarkdownText(seg.value) },
  );
}

/** Compute a session title from the first user prompt. */
export function titleFromPrompt(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) return "New chat";
  return cleaned.length > 40 ? `${cleaned.slice(0, 40).trimEnd()}…` : cleaned;
}
