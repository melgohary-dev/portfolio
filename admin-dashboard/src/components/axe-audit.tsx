"use client";

import { useEffect } from "react";

const RUN_DELAYS_MS = [1500, 3500, 6000];

/**
 * Dev-only accessibility audit. Runs axe-core against the rendered DOM a few
 * times after load (the grid hydrates in stages — worker aggregation, saved
 * views, etc.) and logs any WCAG A/AA violations to the console. No-ops in
 * production builds.
 *
 * Runs are chained sequentially: each scan awaits the previous one before
 * starting so two `axe.run()` calls never overlap (axe rejects concurrent
 * runs with "Axe is already running").
 */
export function AxeAudit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      let disposed = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const getAxe = import("axe-core")
        .then((mod) => mod.default ?? mod)
        .catch(() => null);

      const scan = async () => {
        if (disposed) return;
        const axe = await getAxe;
        if (disposed || !axe) return;
        const results = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        });
        if (disposed || results.violations.length === 0) return;
        console.group(`[axe] ${results.violations.length} accessibility violation(s)`);
        for (const v of results.violations) {
          console.error(
            `[axe] ${v.impact}: ${v.help}`,
            v.nodes.map((n) => n.target.map(String)),
          );
        }
        console.groupEnd();
      };

      // Schedule scans in sequence: wait for delay → run scan → next delay.
      const run = async () => {
        for (const ms of RUN_DELAYS_MS) {
          if (disposed) return;
          await new Promise<void>((resolve) => {
            timer = setTimeout(resolve, ms);
          });
          if (disposed) return;
          await scan();
        }
      };
      run();

      return () => {
        disposed = true;
        if (timer !== null) clearTimeout(timer);
      };
    }
  }, []);

  return null;
}
