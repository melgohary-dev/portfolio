import { useState } from "react";
import { Check, MessageSquare, Pencil, Trash2 } from "lucide-react";
import type { ChatSession } from "../../types";
import { cn } from "../../lib/cn";

export function SessionItem({
  session,
  active,
  onClick,
  onRename,
  onDelete,
}: {
  session: ChatSession;
  active: boolean;
  onClick: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);

  const commitRename = () => {
    onRename(session.id, draft);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition",
        active
          ? "bg-gray-200/70 dark:bg-gray-800"
          : "hover:bg-gray-100 dark:hover:bg-gray-800/50",
      )}
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 rounded border border-brand bg-transparent px-1 py-0.5 text-sm text-gray-900 focus:outline-none dark:text-gray-100"
          aria-label="Rename session"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
          {session.title}
        </span>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDraft(session.title);
              setEditing(true);
            }}
            aria-label="Rename session"
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            {editing ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id);
            }}
            aria-label="Delete session"
            className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
