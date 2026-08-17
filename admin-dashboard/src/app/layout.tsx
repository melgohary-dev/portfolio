import "./globals.css";
import type { Metadata } from "next";
import { ViewTransitions } from "next-view-transitions";
import { SettingsProvider } from "@/components/settings-provider";
import { AppShell } from "@/components/app-shell";
import { AxeAudit } from "@/components/axe-audit";

export const metadata: Metadata = {
  title: "Admin Console",
  description: "A professional admin dashboard demo — revenue, orders, users, and settings.",
};

/**
 * Inline script that runs before hydration to apply theme, language, and
 * text-direction from localStorage — preventing a flash of the wrong theme
 * (FOUC). This mirrors the logic in `SettingsProvider` (the effect that
 * toggles `classList.dark`, sets `.lang`, and `.dir`). Both must stay in
 * lockstep: the script reads `admin-dashboard:settings` and applies the same
 * defaults (`system` / `en` / `ltr`). Changes here require a matching edit
 * in `settings-provider.tsx`.
 */
const THEME_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('admin-dashboard:settings'))||{};var theme=s.theme||'system';var dark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var locale=(s.locale==='ar')?'ar':'en';var r=document.documentElement;r.classList.toggle('dark',dark);r.lang=locale;r.dir=locale==='ar'?'rtl':'ltr';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ViewTransitions>
          <SettingsProvider>
            <AppShell>{children}</AppShell>
          </SettingsProvider>
        </ViewTransitions>
        <AxeAudit />
      </body>
    </html>
  );
}
