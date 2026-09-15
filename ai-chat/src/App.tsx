import { useEffect, useState } from "react";
import { useChatStore, useActiveSession } from "./store/chat";
import { useUiStore } from "./store/ui";
import { useSendMessage } from "./hooks/useSendMessage";
import { createWelcomeSession } from "./lib/seed";
import { Sidebar } from "./components/sidebar/Sidebar";
import { ChatWindow } from "./components/chat/ChatWindow";
import { ChatHeader } from "./components/chat/ChatHeader";
import { Composer } from "./components/composer/Composer";
import { SettingsModal } from "./components/settings/SettingsModal";
import { cn } from "./lib/cn";

const SEED_FLAG = "ai-chat:seeded";

export default function App() {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const newSession = useChatStore((s) => s.newSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const renameSession = useChatStore((s) => s.renameSession);
  const setActiveSession = useChatStore((s) => s.setActiveSession);

    const darkMode = useUiStore((s) => s.darkMode);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const initTheme = useUiStore((s) => s.initTheme);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeSession = useActiveSession();
  const { sendMessage, stop } = useSendMessage();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Seed a welcome conversation on first visit
  useEffect(() => {
    try {
      if (localStorage.getItem(SEED_FLAG)) return;
      const { sessions } = useChatStore.getState();
      if (sessions.length === 0) {
        const welcome = createWelcomeSession();
        useChatStore.setState((s) => ({
          sessions: [welcome, ...s.sessions],
          activeSessionId: welcome.id,
        }));
      }
      localStorage.setItem(SEED_FLAG, "1");
    } catch {
      // ignore
    }
  }, []);

  // Ensure we have an active session on first load
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSession(sessions[0].id);
    }
  }, [activeSessionId, sessions, setActiveSession]);

  const handleSend = (text: string) => {
    setSidebarOpen(false);
    void sendMessage(text);
  };

  const handleSuggestion = (text: string) => {
    void sendMessage(text);
  };

  const handleRetry = (messageId: string) => {
    // Re-run with the last user prompt
    if (!activeSession) return;
    const idx = activeSession.messages.findIndex((m) => m.id === messageId);
    const prior = activeSession.messages.slice(0, idx);
    const lastUser = [...prior].reverse().find((m) => m.role === "user");
    if (lastUser) {
      void sendMessage(lastUser.content);
    }
  };

  const handleNewChat = () => {
    newSession();
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 lg:flex dark:border-gray-800 dark:bg-gray-900">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNew={handleNewChat}
          onOpen={setActiveSession}
          onRename={renameSession}
          onDelete={deleteSession}
          darkMode={darkMode}
          onToggleTheme={toggleDarkMode}
        />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-gray-200 bg-gray-50 transition-transform duration-300 lg:hidden dark:border-gray-800 dark:bg-gray-900",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNew={handleNewChat}
          onOpen={setActiveSession}
          onRename={renameSession}
          onDelete={deleteSession}
          darkMode={darkMode}
          onToggleTheme={toggleDarkMode}
        />
      </aside>

      {/* Main chat */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        <ChatHeader
          session={activeSession}
          onOpenSidebar={toggleSidebar}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            session={activeSession}
            onSuggestion={handleSuggestion}
            onRetry={handleRetry}
          />
        </div>
        <Composer
          onSend={handleSend}
          onStop={stop}
          isStreaming={isStreaming}
        />
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
