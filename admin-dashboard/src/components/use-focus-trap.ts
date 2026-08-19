"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps keyboard focus inside an open popover: wraps Tab, closes on Escape and
 * returns focus to the trigger button, and moves focus into the panel on open.
 */
export function useFocusTrap(
  open: boolean,
  onClose: () => void,
  restoreRef: React.RefObject<HTMLButtonElement | null>,
) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const panel = ref.current;
    if (!panel) return;

    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        restoreRef.current?.focus();
      } else if (e.key === "Tab") {
        const items = focusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    const raf = requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      cancelAnimationFrame(raf);
      panel.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, restoreRef]);

  return ref;
}
