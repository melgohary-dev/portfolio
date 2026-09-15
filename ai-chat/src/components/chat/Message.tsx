import { useState } from "react";
import { Check, Copy, RefreshCw, Square, TriangleAlert } from "lucide-react";
import type { ChatMessage } from "../../types";
import { Markdown } from "./Markdown";
import { cn } from "../../lib/cn";

function Avatar({ role }: { role: ChatMessage["role"] }) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-sm font-bold",
        isUser
          ? "bg-brand text-white"
          : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
      )}
      aria-hidden="true"
    >
      {isUser ? "You" : "AI"}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy message"
      title="Copy"
      className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

const STATUS_HINT: Record<ChatMessage["status"], React.ReactNode> = {
  done: null,
  streaming: null,
  stopped: (
    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      <Square className="h-3 w-3" /> Stopped
    </span>
  ),
  error: (
    <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
      <TriangleAlert className="h-3 w-3" /> Error
    </span>
  ),
};

export function Message({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-white shadow-sm">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {message.content}
          </p>
        </div>
        <Avatar role="user" />
      </div>
    );
  }

  const streaming = message.status === "streaming";
  const showCursor = streaming;

  return (
    <div className="flex gap-3">
      <Avatar role="assistant" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Assistant
          </span>
          {STATUS_HINT[message.status]}
        </div>
        <div className="markdown-text mt-1">
          <Markdown source={message.content} />
          {showCursor && <span className="streaming-caret" aria-hidden="true" />}
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          {!streaming && (
            <>
              <CopyButton text={message.content} />
              {message.status === "error" && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
