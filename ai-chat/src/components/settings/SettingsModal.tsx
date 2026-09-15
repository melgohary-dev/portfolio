import { useEffect, useState } from "react";
import { Cpu, KeyRound, Save, Trash2, Wifi, WifiOff, X } from "lucide-react";
import { PROVIDERS, PROVIDER_IDS, getApiKey, keyStatus, setApiKey } from "../../lib/providers";
import type { ProviderId } from "../../lib/providers/types";
import { useUiStore } from "../../store/ui";
import { cn } from "../../lib/cn";

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const provider = useUiStore((s) => s.provider);
  const setProvider = useUiStore((s) => s.setProvider);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI provider settings"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              AI Provider
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SettingsForm
          key={provider}
          provider={provider}
          setProvider={setProvider}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function SettingsForm({
  provider,
  setProvider,
  onClose,
}: {
  provider: ProviderId;
  setProvider: (p: ProviderId) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => getApiKey(provider) ?? "");
  const current = PROVIDERS[provider];
  const status = keyStatus(provider);
  const needsKey = current.requiresKey;

  const save = () => {
    setApiKey(provider, draft.trim());
    onClose();
  };

  return (
    <>
      <div className="overflow-y-auto px-5 py-4">
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Bring your own API key to go live, or use the free simulated mode — no
          key, no payment.
        </p>

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {PROVIDER_IDS.map((id) => {
            const p = PROVIDERS[id];
            const st = keyStatus(id);
            const active = id === provider;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setProvider(id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                  active
                    ? "border-brand bg-brand/5 text-gray-900 dark:text-gray-50"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.name}
                </span>
                {id === "mock" ? (
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-brand">
                    Free
                  </span>
                ) : st === "none" ? (
                  <WifiOff className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
                ) : (
                  <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>

        {needsKey && (
          <div className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <label
              htmlFor="apikey"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200"
            >
              <KeyRound className="h-3.5 w-3.5" />
              API key
              {status === "env" && (
                <span className="font-medium text-emerald-500">
                  · loaded from {current.envVar}
                </span>
              )}
            </label>
            <input
              id="apikey"
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                status === "env" ? `Set via ${current.envVar}` : "Paste your API key"
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
            <p className="mt-2 text-xs text-gray-400">
              Stored only in your browser (localStorage). Prefer the{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">
                {current.envVar}
              </code>{" "}
              env var so the key never ships in the bundle.
            </p>

            {status === "stored" && (
              <button
                type="button"
                onClick={() => {
                  setApiKey(provider, "");
                  setDraft("");
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove key
              </button>
            )}
          </div>
        )}

        {!needsKey && (
          <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
            Simulated mode streams a realistic demo response with no API call —
            perfect for the free, no-signup default.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
    </>
  );
}