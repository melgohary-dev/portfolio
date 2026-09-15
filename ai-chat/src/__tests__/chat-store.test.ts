import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "../store/chat";
import { useUiStore } from "../store/ui";

function resetAll() {
  localStorage.clear();
  useChatStore.setState({ sessions: [], activeSessionId: null, isStreaming: false });
  useUiStore.setState({ darkMode: false, provider: "mock", sidebarOpen: false });
}

describe("chat store", () => {
  beforeEach(() => resetAll());

  it("newSession creates and activates a session", () => {
    const id = useChatStore.getState().newSession();
    const state = useChatStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe(id);
    expect(state.sessions[0].title).toBe("New chat");
    expect(state.activeSessionId).toBe(id);
  });

  it("addMessage appends a message and auto-titles from first user message", () => {
    const id = useChatStore.getState().newSession();
    useChatStore.getState().addMessage(id, {
      role: "user",
      content: "hello world",
      status: "done",
    });
    const session = useChatStore.getState().sessions.find((s) => s.id === id)!;
    expect(session.messages).toHaveLength(1);
    expect(session.title).toBe("hello world");
  });

  it("does not overwrite a custom title on later user messages", () => {
    const id = useChatStore.getState().newSession();
    useChatStore.getState().renameSession(id, "Custom Title");
    useChatStore.getState().addMessage(id, {
      role: "user",
      content: "first",
      status: "done",
    });
    const session = useChatStore.getState().sessions.find((s) => s.id === id)!;
    expect(session.title).toBe("Custom Title");
  });

  it("appendToken accumulates into the streaming message", () => {
    const id = useChatStore.getState().newSession();
    const msg = useChatStore.getState().addMessage(id, {
      role: "assistant",
      content: "",
      status: "streaming",
    });
    useChatStore.getState().appendToken(id, msg.id, "Hel");
    useChatStore.getState().appendToken(id, msg.id, "lo");
    const m = useChatStore.getState().sessions
      .find((s) => s.id === id)!
      .messages.find((x) => x.id === msg.id)!;
    expect(m.content).toBe("Hello");
  });

  it("updateMessage finalizes content and status", () => {
    const id = useChatStore.getState().newSession();
    const msg = useChatStore.getState().addMessage(id, {
      role: "assistant",
      content: "",
      status: "streaming",
    });
    useChatStore.getState().updateMessage(id, msg.id, {
      status: "done",
      usage: { inputTokens: 2, outputTokens: 5 },
    });
    const m = useChatStore.getState().sessions
      .find((s) => s.id === id)!
      .messages.find((x) => x.id === msg.id)!;
    expect(m.status).toBe("done");
    expect(m.usage?.outputTokens).toBe(5);
  });

  it("deleteSession removes and falls back to another active session", () => {
    const a = useChatStore.getState().newSession();
    const b = useChatStore.getState().newSession();
    useChatStore.getState().deleteSession(a);
    const state = useChatStore.getState();
    expect(state.sessions.find((s) => s.id === a)).toBeUndefined();
    expect(state.activeSessionId).toBe(b);
  });

  it("deleteSession clears active when nothing remains", () => {
    const a = useChatStore.getState().newSession();
    useChatStore.getState().deleteSession(a);
    expect(useChatStore.getState().sessions).toHaveLength(0);
    expect(useChatStore.getState().activeSessionId).toBeNull();
  });

  it("renameSession updates the title", () => {
    const id = useChatStore.getState().newSession();
    useChatStore.getState().renameSession(id, "My Chat");
    expect(
      useChatStore.getState().sessions.find((s) => s.id === id)!.title,
    ).toBe("My Chat");
  });

  it("startStreaming and stopStreaming toggle the flag", () => {
    expect(useChatStore.getState().isStreaming).toBe(false);
    useChatStore.getState().startStreaming();
    expect(useChatStore.getState().isStreaming).toBe(true);
    useChatStore.getState().stopStreaming();
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it("setActiveSession changes active id", () => {
    const a = useChatStore.getState().newSession();
    const b = useChatStore.getState().newSession();
    useChatStore.getState().setActiveSession(a);
    expect(useChatStore.getState().activeSessionId).toBe(a);
    expect(useChatStore.getState().activeSessionId).not.toBe(b);
  });
});

describe("ui store", () => {
  beforeEach(() => resetAll());

  it("toggleDarkMode flips the flag", () => {
    expect(useUiStore.getState().darkMode).toBe(false);
    useUiStore.getState().toggleDarkMode();
    expect(useUiStore.getState().darkMode).toBe(true);
  });

  it("setProvider updates the provider", () => {
    useUiStore.getState().setProvider("gemini");
    expect(useUiStore.getState().provider).toBe("gemini");
  });

  it("toggleSidebar flips sidebarOpen", () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it("setDarkMode toggles the document dark class", () => {
    document.documentElement.classList.remove("dark");
    useUiStore.getState().setDarkMode(true);
    expect(useUiStore.getState().darkMode).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setSidebarOpen sets the flag explicitly", () => {
    useUiStore.getState().setSidebarOpen(true);
    expect(useUiStore.getState().sidebarOpen).toBe(true);
    useUiStore.getState().setSidebarOpen(false);
    expect(useUiStore.getState().sidebarOpen).toBe(false);
  });

  it("initTheme applies the persisted dark mode", () => {
    useUiStore.setState({ darkMode: true });
    document.documentElement.classList.remove("dark");
    useUiStore.getState().initTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists provider selection to localStorage", () => {
    useUiStore.getState().setProvider("groq");
    const raw = localStorage.getItem("ai-chat:ui");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).state.provider).toBe("groq");
  });
});
