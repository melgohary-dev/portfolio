import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, ChatSession } from "../types";
import { createId } from "../lib/id";
import { titleFromPrompt } from "../lib/markdown";

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  newSession: () => string;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setActiveSession: (id: string) => void;
  addMessage: (sessionId: string, message: Omit<ChatMessage, "id" | "createdAt">) => ChatMessage;
  updateMessage: (sessionId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  appendToken: (sessionId: string, messageId: string, token: string) => void;
  startStreaming: () => void;
  stopStreaming: () => void;
  touchSession: (id: string) => void;
}

function updateSessionList(
  sessions: ChatSession[],
  sessionId: string,
  fn: (s: ChatSession) => ChatSession,
): ChatSession[] {
  return sessions.map((s) => (s.id === sessionId ? fn(s) : s));
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isStreaming: false,

      newSession: () => {
        const id = createId("session");
        const now = Date.now();
        const session: ChatSession = {
          id,
          title: "New chat",
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id,
          isStreaming: false,
        }));
        return id;
      },

      deleteSession: (id) => {
        set((s) => {
          const sessions = s.sessions.filter((x) => x.id !== id);
          const activeSessionId =
            s.activeSessionId === id
              ? (sessions[0]?.id ?? null)
              : s.activeSessionId;
          return { sessions, activeSessionId, isStreaming: false };
        });
      },

      renameSession: (id, title) => {
        set((s) => ({
          sessions: updateSessionList(s.sessions, id, (sess) => ({
            ...sess,
            title: title.trim() || sess.title,
          })),
        }));
      },

      setActiveSession: (id) => {
        set({ activeSessionId: id });
      },

      addMessage: (sessionId, message) => {
        const msg: ChatMessage = {
          ...message,
          id: createId("msg"),
          createdAt: Date.now(),
        };
        set((s) => ({
          sessions: updateSessionList(s.sessions, sessionId, (sess) => ({
            ...sess,
            messages: [...sess.messages, msg],
            updatedAt: Date.now(),
          })),
        }));
        // Auto-title from first user message
        if (message.role === "user") {
          const session = get().sessions.find((x) => x.id === sessionId);
          if (session && session.title === "New chat") {
            get().renameSession(sessionId, titleFromPrompt(message.content));
          }
        }
        return msg;
      },

      updateMessage: (sessionId, messageId, patch) => {
        set((s) => ({
          sessions: updateSessionList(s.sessions, sessionId, (sess) => ({
            ...sess,
            messages: sess.messages.map((m) =>
              m.id === messageId ? { ...m, ...patch } : m,
            ),
            updatedAt: Date.now(),
          })),
        }));
      },

      appendToken: (sessionId, messageId, token) => {
        set((s) => ({
          sessions: updateSessionList(s.sessions, sessionId, (sess) => ({
            ...sess,
            messages: sess.messages.map((m) =>
              m.id === messageId
                ? { ...m, content: m.content + token }
                : m,
            ),
          })),
        }));
      },

      startStreaming: () => set({ isStreaming: true }),

      stopStreaming: () => set({ isStreaming: false }),

      touchSession: (id) => {
        set((s) => ({
          sessions: updateSessionList(s.sessions, id, (sess) => ({
            ...sess,
            updatedAt: Date.now(),
          })),
        }));
      },
    }),
    {
      name: "ai-chat-sessions",
      version: 1,
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ChatState> | undefined;
        return {
          ...current,
          sessions: p?.sessions ?? current.sessions,
          activeSessionId: p?.activeSessionId ?? current.activeSessionId,
        };
      },
    },
  ),
);

/** Selector: the active session object (or null). */
export function useActiveSession(): ChatSession | null {
  return useChatStore((s) => {
    const activeId = s.activeSessionId;
    return activeId ? (s.sessions.find((x) => x.id === activeId) ?? null) : null;
  });
}
