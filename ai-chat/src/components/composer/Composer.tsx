import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "../../lib/cn";

export function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholders = [
    "Ask me anything…",
    "Ask me to write some code…",
    "Explain a concept to me…",
  ];
  const [phIndex, setPhIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setPhIndex((i) => (i + 1) % placeholders.length),
      4000,
    );
    return () => clearInterval(t);
  }, [placeholders.length]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const submit = () => {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      textareaRef.current?.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = !isStreaming && !disabled && value.trim().length > 0;

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm transition focus-within:border-brand/60 dark:bg-gray-900",
            isStreaming
              ? "border-amber-400/60"
              : "border-gray-200 dark:border-gray-700",
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            name="message"
            autoComplete="off"
            onChange={(e) => {
              setValue(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={placeholders[phIndex]}
            aria-label="Message"
            className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white transition hover:bg-amber-600"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              title="Send"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                canSend
                  ? "bg-brand text-white hover:bg-brand/90"
                  : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800",
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Enter to send · Shift+Enter for newline
          </span>
        </div>
      </div>
    </div>
  );
}
