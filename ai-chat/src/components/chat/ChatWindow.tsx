import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { ChatMessage, ChatSession } from "../../types";
import { Message } from "./Message";
import { EmptyState } from "./EmptyState";
import { cn } from "../../lib/cn";

export function ChatWindow({
  session,
  onSuggestion,
  onRetry,
}: {
  session: ChatSession | null;
  onSuggestion: (prompt: string) => void;
  onRetry: (messageId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const stickToBottom = useRef(true);
  const messages = session?.messages ?? [];

  const sessionId = session?.id;
  const contentSignature = messages
    .map((m) => `${m.id}:${m.status}:${m.content.length}`)
    .join("|");

  useEffect(() => {
    stickToBottom.current = true;
  }, [sessionId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [contentSignature]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distanceFromBottom < 80;
    setShowJump(distanceFromBottom > 120);
  };

  const jumpToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    stickToBottom.current = true;
    setShowJump(false);
  };

  if (!session || messages.length === 0) {
    return <EmptyState onSuggestion={onSuggestion} />;
  }

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {session.messages.map((message: ChatMessage) => (
            <Message
              key={message.id}
              message={message}
              onRetry={() => onRetry(message.id)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={jumpToBottom}
        className={cn(
          "absolute bottom-20 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition hover:text-brand dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300",
          showJump ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Jump to latest"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}
