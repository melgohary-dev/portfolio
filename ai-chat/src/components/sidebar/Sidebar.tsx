import { useState } from "react";
import { Moon, Plus, Sun, Sparkles } from "lucide-react";
import type { ChatSession } from "../../types";
import { SessionItem } from "./SessionItem";
import { ConfirmDialog } from "./ConfirmDialog";
import { cn } from "../../lib/cn";

function groupKey(ts: number): string {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const yesterdayStart = startOfDay.getTime() - 86400000;
  const sevenDaysStart = startOfDay.getTime() - 7 * 86400000;

  if (ts >= startOfDay.getTime()) return "Today";
  if (ts >= yesterdayStart) return "Yesterday";
  if (ts >= sevenDaysStart) return "Previous 7 days";
  return "Older";
}

const GROUP_ORDER = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Older",
];

export function Sidebar({
  sessions,
  activeSessionId,
  onNew,
  onOpen,
  onRename,
  onDelete,
  darkMode,
  onToggleTheme,
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const groups = GROUP_ORDER.map((label) => ({
    label,
    items: sessions.filter((s) => groupKey(s.updatedAt) === label),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-amber-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
          AI Chat
        </span>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-3">
        {sessions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-gray-400">
            No conversations yet.
            <br />
            Start a new chat below.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    active={session.id === activeSessionId}
                    onClick={() => onOpen(session.id)}
                    onRename={onRename}
                    onDelete={(id) => setConfirmId(id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 border-t border-gray-200 px-3 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={onToggleTheme}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
          )}
        >
          {darkMode ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete conversation?"
        message="This will permanently remove this conversation and its messages. This action cannot be undone."
        onConfirm={() => {
          if (confirmId) onDelete(confirmId);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
