import type { StreamEvent } from "../../types";

export type ProviderId =
  | "mock"
  | "gemini"
  | "openai"
  | "openrouter"
  | "groq"
  | "together"
  | "mistral"
  | "deepseek";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StreamRequest {
  provider: ProviderId;
  prompt: string;
  history: ChatTurn[];
  signal: AbortSignal;
}

export interface OpenAIConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface GeminiConfig {
  model: string;
  apiKey: string;
}

export interface ProviderAdapter {
  id: ProviderId;
  name: string;
  defaultModel: string;
  requiresKey: boolean;
  envVar: string;
  /**
   * Stream a reply as a sequence of StreamEvents. Implementations must throw an
   * AbortError (name === "AbortError") when the request signal aborts.
   */
  stream(req: StreamRequest, key?: string): AsyncGenerator<StreamEvent>;
}
