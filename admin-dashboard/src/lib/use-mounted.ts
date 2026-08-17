"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` after the first animation frame following mount.
 *
 * Recharts' `ResponsiveContainer` measures its parent during render; if it
 * renders during SSR or hydration the measurement is wrong (no layout yet),
 * which causes the chart to render at 0×0 or flash a broken frame. Gating on
 * a post-mount rAF defers the chart until the DOM actually has dimensions.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return mounted;
}
