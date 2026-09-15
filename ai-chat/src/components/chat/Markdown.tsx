import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { renderMarkdown } from "../../lib/markdown";

function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // clipboard unavailable — ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1.5 dark:border-gray-800">
        <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          aria-label={`Copy ${language} code`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono text-gray-800 dark:text-gray-200">
          {code}
        </code>
      </pre>
    </div>
  );
}

export function Markdown({ source }: { source: string }) {
  const segments = renderMarkdown(source);

  return (
    <div className="markdown-body text-[15px] leading-relaxed">
      {segments.map((seg, i) =>
        seg.kind === "code" ? (
          <CodeBlock
            key={`c${i}`}
            language={seg.value.language}
            code={seg.value.code}
          />
        ) : (
          <div
            key={`h${i}`}
            dangerouslySetInnerHTML={{ __html: seg.value }}
          />
        ),
      )}
    </div>
  );
}
