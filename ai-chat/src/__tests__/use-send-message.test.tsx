import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useChatStore } from "../store/chat";
import { useSendMessage } from "../hooks/useSendMessage";

function Harness() {
  const { sendMessage, stop } = useSendMessage();
  return (
    <div>
      <button onClick={() => void sendMessage("hello")}>SendHello</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  useChatStore.setState({ sessions: [], activeSessionId: null, isStreaming: false });
});

describe("useSendMessage integration", () => {
  it("creates a session, user message, and streaming assistant placeholder immediately", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("SendHello"));

    await waitFor(() => {
      const st = useChatStore.getState();
      const s = st.sessions[0];
      expect(s).toBeDefined();
      expect(st.activeSessionId).toBe(s.id);
      expect(s.messages.length).toBe(2);
      expect(s.messages[0].role).toBe("user");
      expect(s.messages[0].content).toBe("hello");
      expect(s.messages[1].role).toBe("assistant");
      expect(s.messages[1].status).toBe("streaming");
    });
  });

  it("eventually finalizes the assistant message as done", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("SendHello"));

    await waitFor(
      () => {
        const s = useChatStore.getState().sessions[0];
        const asst = s?.messages.find((m) => m.role === "assistant");
        expect(asst?.status).toBe("done");
        expect((asst?.content?.length ?? 0)).toBeGreaterThan(0);
      },
      { timeout: 10000 },
    );
  }, 15000);

  it("isStreaming toggles false after completion", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("SendHello"));

    await waitFor(
      () => expect(useChatStore.getState().isStreaming).toBe(false),
      { timeout: 10000 },
    );
  }, 15000);
});
