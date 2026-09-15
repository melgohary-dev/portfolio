import { useCallback, useRef } from "react";
import { useChatStore } from "../store/chat";
import { useUiStore } from "../store/ui";
import { createProviderStream } from "../lib/providers";
import type { ChatTurn } from "../lib/providers/types";
import type { Usage } from "../types";

export function useSendMessage() {
  const abortRef = useRef<AbortController | null>(null);

  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const appendToken = useChatStore((s) => s.appendToken);
  const newSession = useChatStore((s) => s.newSession);
  const startStreaming = useChatStore((s) => s.startStreaming);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const setActiveSession = useChatStore((s) => s.setActiveSession);

  const sendMessage = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt) return;

      // Ensure an active session exists
      let sessionId = useChatStore.getState().activeSessionId;
      if (!sessionId) {
        sessionId = newSession();
      }

      // Build conversational history from prior user/assistant messages
      const session = useChatStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const history: ChatTurn[] = (session?.messages ?? [])
        .filter(
          (m) =>
            (m.role === "user" || m.role === "assistant") &&
            m.content.trim().length > 0 &&
            m.status === "done",
        )
        .map((m) => ({
          role: m.role as ChatTurn["role"],
          content: m.content,
        }));

      // Insert user message
      addMessage(sessionId, {
        role: "user",
        content: prompt,
        status: "done",
      });

      // Create the assistant placeholder
      const placeholder = addMessage(sessionId, {
        role: "assistant",
        content: "",
        status: "streaming",
      });

      // Abort any previous stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startStreaming();

      const provider = useUiStore.getState().provider;

      const result = await runProvider(prompt, history, provider, controller.signal, {
        onToken: (token) => {
          appendToken(sessionId, placeholder.id, token);
        },
        onDone: (usage: Usage) => {
          updateMessage(sessionId, placeholder.id, {
            status: "done",
            usage,
          });
        },
        onError: (message) => {
          const current =
            useChatStore
              .getState()
              .sessions.find((x) => x.id === sessionId)
              ?.messages.find((m) => m.id === placeholder.id)?.content ?? "";
          updateMessage(sessionId, placeholder.id, {
            status: "error",
            content: current ? `${current}\n\n_Error: ${message}_` : `_Error: ${message}_`,
          });
        },
      });

      if (result === "aborted") {
        updateMessage(sessionId, placeholder.id, { status: "stopped" });
      }
      stopStreaming();

      setActiveSession(sessionId);
      return sessionId;
    },
    [addMessage, updateMessage, appendToken, newSession, startStreaming, stopStreaming, setActiveSession],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, stop };
}

interface Callbacks {
  onToken: (token: string) => void;
  onDone: (usage: Usage) => void;
  onError: (message: string) => void;
}

async function runProvider(
  prompt: string,
  history: ChatTurn[],
  provider: Parameters<typeof createProviderStream>[0]["provider"],
  signal: AbortSignal,
  cb: Callbacks,
): Promise<"done" | "aborted"> {
  let aborted = false;
  const onAbort = () => {
    aborted = true;
  };
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    const gen = createProviderStream({ provider, prompt, history, signal });
    for await (const event of gen) {
      if (event.type === "token") cb.onToken(event.value);
      else if (event.type === "done") cb.onDone(event.usage);
      else if (event.type === "error") cb.onError(event.message);
    }
    return "done";
  } catch (err) {
    if (aborted || (err instanceof Error && err.name === "AbortError")) {
      return "aborted";
    }
    cb.onError(err instanceof Error ? err.message : "Unknown error");
    return "done";
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
