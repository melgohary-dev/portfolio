import { Menu, Settings, Wifi, WifiOff } from "lucide-react";
import type { ChatSession } from "../../types";
import { useUiStore } from "../../store/ui";
import { PROVIDERS, keyStatus } from "../../lib/providers";
import { cn } from "../../lib/cn";

export function ChatHeader({
  session,
  onOpenSidebar,
  onOpenSettings,
}: {
  session: ChatSession | null;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}) {
  const provider = useUiStore((s) => s.provider);
  const active = PROVIDERS[provider];
  const status = keyStatus(provider);
  const isLive = active.requiresKey ? status !== "none" : true;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6 dark:border-gray-800 dark:bg-gray-950/80">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
          {session?.title ?? "New chat"}
        </h2>
        <p className="truncate text-xs text-gray-400">
          {session
            ? `${session.messages.length} message${
                session.messages.length === 1 ? "" : "s"
              }`
            : "No messages yet"}
        </p>
      </div>

      <span
        className={cn(
          "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex",
          isLive
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
        )}
        title={isLive ? `Live · ${active.name}` : "Simulated · no API key"}
      >
        {isLive ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        <span className="max-w-32 truncate">
          {isLive ? active.name : "Simulated"}
        </span>
      </span>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="AI settings"
        title="AI settings"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <Settings className="h-4 w-4" />
      </button>
    </header>
  );
}
