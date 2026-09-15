import type { ChatSession } from "../types";
import { createId } from "./id";

const welcomeAssistant = `Welcome to your AI workspace. 👋

I'm a simulated streaming assistant that demonstrates the exact UI/UX patterns of a production AI chat surface.

Try clicking one of the suggestions below, or ask for:

- **"code"** — I'll respond with a syntax-highlighted snippet
- **"explain"** — I'll break a concept down into clear sections
- **"list"** — I'll format the answer as a bulleted list

Everything you see streams token-by-token, is cancellable, and persists across reloads.`;

export function createWelcomeSession(): ChatSession {
  const now = Date.now();
  const id = createId("session");
  return {
    id,
    title: "Welcome",
    messages: [
      {
        id: createId("msg"),
        role: "assistant",
        content: welcomeAssistant,
        createdAt: now,
        status: "done",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export const SUGGESTED_PROMPTS = [
  "Explain offline-first architecture",
  "Write a debounce function in TypeScript",
  "List best practices for React state",
  "How do you scale a frontend monorepo?",
];
