import { Sparkles } from "lucide-react";
import { SUGGESTED_PROMPTS } from "../../lib/seed";

export function EmptyState({
  onSuggestion,
}: {
  onSuggestion: (prompt: string) => void;
}) {

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-amber-500 text-white shadow-lg shadow-brand/20">
        <Sparkles className="h-8 w-8" />
      </div>
      <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-50">
        AI Chat Workspace
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
        A realtime streaming chat surface with session management, markdown, and
        keyboard-first UX. Bring your own API key to go live, or explore the
        simulated mode — no signup, no payment.
      </p>

      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSuggestion(prompt)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm transition hover:border-brand/60 hover:text-brand dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand/60"
          >
            {prompt}
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Enter to send · Shift+Enter for a new line · Esc to stop
      </p>
    </div>
  );
}
