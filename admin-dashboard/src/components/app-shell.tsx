"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/settings-provider";
import { Sidebar } from "@/components/sidebar";
import { MobileTopBar } from "@/components/mobile-top-bar";
import { DesktopTopBar } from "@/components/desktop-top-bar";
import { PageTransition } from "@/components/page-transition";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, settings } = useSettings();
  const collapsed = settings.sidebarCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  // The hamburger button (rendered by MobileTopBar) is where focus returns
  // when the mobile drawer closes.
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        suppressHydrationWarning
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t("aria.skipToContent")}
      </a>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 animate-fade-in bg-slate-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        restoreRef={mobileTriggerRef}
      />

      <div className={cn("flex min-w-0 flex-1 flex-col transition-[margin] duration-200", collapsed ? "lg:ms-20" : "lg:ms-60")}>
        <MobileTopBar
          onOpenMenu={() => setMobileOpen(true)}
          expanded={mobileOpen}
          triggerRef={mobileTriggerRef}
        />
        <DesktopTopBar />
        <main id="main-content" className="flex-1 px-6 py-6 lg:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
