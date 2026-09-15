export type Role = "user" | "assistant" | "system";

export type MessageStatus = "done" | "streaming" | "stopped" | "error";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  status: MessageStatus;
  usage?: Usage;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type StreamEvent =
  | { type: "token"; value: string }
  | { type: "done"; usage: Usage }
  | { type: "error"; message: string };

export interface StreamOptions {
  signal: AbortSignal;
  prompt: string;
  onToken: (token: string) => void;
  onDone: (usage: Usage) => void;
  onError: (message: string) => void;
}

export interface SendState {
  status: "idle" | "streaming" | "stopped" | "error";
  error?: string;
}
