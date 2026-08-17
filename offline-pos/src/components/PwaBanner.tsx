import { useState } from "react";
import { RotateCw, Download, X } from "lucide-react";
import { usePwaLifecycle } from "../hooks/usePwaLifecycle";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";

const UPDATE_DISMISS_KEY = "offlinepos:pwa-update-dismissed";
const INSTALL_DISMISS_KEY = "offlinepos:pwa-install-dismissed";

function dismissed(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * Floating toast stack for the PWA lifecycle. Two independent banners:
 *  - "New version available → Reload" when the service worker has staged an
 *    update (dismissed for the session so it never nags mid-shift);
 *  - "Install OfflinePOS" when Chromium is offering a native install
 *    (`beforeinstallprompt`), with a graceful dismiss.
 *
 * Positioned above the mobile tab/cart bars on small screens and the bottom
 * corner on desktop.
 */
export function PwaBanner() {
  const { t } = useI18n();
  const { updateAvailable, installPrompt, requestUpdate, promptInstall } = usePwaLifecycle();
  const [updateDismissed, setUpdateDismissed] = useState(() => dismissed(UPDATE_DISMISS_KEY));
  const [installDismissed, setInstallDismissed] = useState(() => dismissed(INSTALL_DISMISS_KEY));

  const dismissUpdate = () => {
    try {
      sessionStorage.setItem(UPDATE_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setUpdateDismissed(true);
  };

  const dismissInstall = () => {
    try {
      sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setInstallDismissed(true);
  };

  const showUpdate = updateAvailable && !updateDismissed;
  const showInstall = installPrompt !== null && !installDismissed;
  if (!showUpdate && !showInstall) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-4 lg:items-end">
      {showUpdate && (
        <div
          role="status"
          className="pointer-events-auto flex w-full max-w-sm animate-pos-pop items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xl"
        >
          <RotateCw className="h-4 w-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold text-primary">{t("pwaUpdateTitle")}</p>
            <p className="text-xs text-faint-strong">{t("pwaUpdateBody")}</p>
          </div>
          <button
            type="button"
            onClick={() => void requestUpdate()}
            className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-dark active:scale-95"
          >
            {t("pwaReload")}
          </button>
          <button
            type="button"
            onClick={dismissUpdate}
            aria-label={t("pwaDismiss")}
            className="cursor-pointer rounded-lg p-1 text-faint-strong transition-colors hover:bg-sunken hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showInstall && (
        <div
          role="status"
          className={cn(
            "pointer-events-auto flex w-full max-w-sm animate-pos-pop items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xl",
            showUpdate && "lg:hidden", // keep the stack to one banner on desktop
          )}
        >
          <Download className="h-4 w-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold text-primary">{t("pwaInstallTitle")}</p>
            <p className="text-xs text-faint-strong">{t("pwaInstallBody")}</p>
          </div>
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-dark active:scale-95"
          >
            {t("pwaInstall")}
          </button>
          <button
            type="button"
            onClick={dismissInstall}
            aria-label={t("pwaDismiss")}
            className="cursor-pointer rounded-lg p-1 text-faint-strong transition-colors hover:bg-sunken hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
