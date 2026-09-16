import type { StreamEvent } from "../../types";
import { loadJson, saveJson, removeItem } from "../persist";
import { openAiAdapter } from "./openai";
import { geminiAdapter } from "./gemini";
import { mockStream } from "./mock";
import type { ProviderAdapter, ProviderId, StreamRequest } from "./types";

const KEYS_KEY = "ai-chat:keys";

interface ProviderDef {
  adapter: ProviderAdapter;
}

const openAiCompat = (
  id: ProviderId,
  name: string,
  baseUrl: string,
  model: string,
  envVar: string,
): ProviderDef => ({
  adapter: {
    id,
    name,
    defaultModel: model,
    requiresKey: true,
    envVar,
    stream: openAiAdapter({ baseUrl, defaultModel: model }),
  },
});

const DEFS: Record<ProviderId, ProviderDef> = {
  mock: {
    adapter: {
      id: "mock",
      name: "Simulated (free)",
      defaultModel: "mock",
      requiresKey: false,
      envVar: "",
      stream: mockStream,
    },
  },
  gemini: {
    adapter: {
      id: "gemini",
      name: "Google Gemini",
      defaultModel: "gemini-2.5-flash",
      requiresKey: true,
      envVar: "VITE_GEMINI_API_KEY",
      stream: geminiAdapter({ defaultModel: "gemini-2.5-flash" }),
    },
  },
  openai: openAiCompat(
    "openai",
    "OpenAI",
    "https://api.openai.com/v1",
    "gpt-4o-mini",
    "VITE_OPENAI_API_KEY",
  ),
  openrouter: openAiCompat(
    "openrouter",
    "OpenRouter",
    "https://openrouter.ai/api/v1",
    "openai/gpt-4o-mini",
    "VITE_OPENROUTER_API_KEY",
  ),
  groq: openAiCompat(
    "groq",
    "Groq",
    "https://api.groq.com/openai/v1",
    "openai/gpt-oss-120b",
    "VITE_GROQ_API_KEY",
  ),
  together: openAiCompat(
    "together",
    "Together AI",
    "https://api.together.xyz/v1",
    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "VITE_TOGETHER_API_KEY",
  ),
  mistral: openAiCompat(
    "mistral",
    "Mistral",
    "https://api.mistral.ai/v1",
    "open-mistral-nemo",
    "VITE_MISTRAL_API_KEY",
  ),
  deepseek: openAiCompat(
    "deepseek",
    "DeepSeek",
    "https://api.deepseek.com/v1",
    "deepseek-chat",
    "VITE_DEEPSEEK_API_KEY",
  ),
};

export const PROVIDERS: Record<ProviderId, ProviderAdapter> = Object.fromEntries(
  Object.entries(DEFS).map(([id, def]) => [id, def.adapter]),
) as Record<ProviderId, ProviderAdapter>;

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/** Where a provider's key is currently coming from. */
export type KeyStatus = "env" | "stored" | "none";

export function getApiKey(provider: ProviderId): string | null {
  const def = DEFS[provider];
  if (!def.adapter.envVar) return null;
  const fromEnv = (import.meta.env as Record<string, string | undefined>)[
    def.adapter.envVar
  ];
  if (fromEnv) return fromEnv;
  const keys = loadJson<Record<string, string>>(KEYS_KEY) ?? {};
  return keys[provider] ?? null;
}

export function keyStatus(provider: ProviderId): KeyStatus {
  const def = DEFS[provider];
  if (!def.adapter.envVar) return "none";
  if (
    (import.meta.env as Record<string, string | undefined>)[
      def.adapter.envVar
    ]
  )
    return "env";
  const keys = loadJson<Record<string, string>>(KEYS_KEY) ?? {};
  return keys[provider] ? "stored" : "none";
}

export function setApiKey(provider: ProviderId, key: string): void {
  const keys = loadJson<Record<string, string>>(KEYS_KEY) ?? {};
  if (key.trim() === "") {
    delete keys[provider];
  } else {
    keys[provider] = key.trim();
  }
  saveJson(KEYS_KEY, keys);
}

export function clearApiKeys(): void {
  removeItem(KEYS_KEY);
}

/**
 * Pick the async generator to use for a send. Falls back to the free simulated
 * stream whenever the selected provider is "mock" or has no key configured, so
 * the app always works with zero setup.
 */
export function createProviderStream(req: StreamRequest): AsyncGenerator<StreamEvent> {
  const def = DEFS[req.provider];
  if (!def.adapter.requiresKey || req.provider === "mock") {
    return def.adapter.stream(req);
  }
  const key = getApiKey(req.provider);
  if (!key) {
    return DEFS.mock.adapter.stream({ ...req, provider: "mock" });
  }
  return def.adapter.stream(req, key);
}
