import { useCallback, useEffect, useState } from "react";

/** Chromium's `beforeinstallprompt` event — not yet in the DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaLifecycle {
  /** A newer service worker has installed and is waiting to take control. */
  updateAvailable: boolean;
  /** Chromium install prompt is available — show an "Install app" button. */
  installPrompt: BeforeInstallPromptEvent | null;
  /** Ask the waiting worker to activate, then reload onto the new build. */
  requestUpdate: () => Promise<void>;
  /** Fire the captured install prompt so the browser shows its native sheet. */
  promptInstall: () => Promise<void>;
}

/**
 * Owns the service worker registration and surfaces the PWA install/update
 * lifecycle to the UI:
 *
 *  - registers `/sw.js` and checks for updates whenever the tab becomes
 *    visible again (a POS can sit open for days — updates should not wait for
 *    a manual reload to be noticed);
 *  - when a newer worker is staged, flips `updateAvailable` so a banner can
 *    offer "Reload" (`SKIP_WAITING` → `controllerchange` → reload);
 *  - captures `beforeinstallprompt` so the app can ask the cashier to install.
 *
 * First installs never show the update banner — there is no previous version
 * to replace.
 */
export function usePwaLifecycle(): PwaLifecycle {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const requestUpdate = useCallback(async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;
    setInstallPrompt(null);
    await installPrompt.prompt();
  }, [installPrompt]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;

    // A new worker calling skipWaiting() takes control → reload to swap the
    // running bundle without leaving the cashier on a half-updated app.
    const onControllerChange = () => {
      if (active) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const stageUpdate = (worker: ServiceWorker | null) => {
      if (!worker || worker.state !== "installed") return;
      if (navigator.serviceWorker.controller) setUpdateAvailable(true);
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (!active) return;
        stageUpdate(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && active) stageUpdate(next);
          });
        });
      } catch {
        // Registration is best-effort (fails in some private modes) — the app
        // still works online without a service worker.
      }
    };

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (active) setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void navigator.serviceWorker.getRegistration().then((r) => r?.update());
      }
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    document.addEventListener("visibilitychange", onVisibility);
    void register();

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { updateAvailable, installPrompt, requestUpdate, promptInstall };
}
