import { useEffect, useRef } from "react";

/**
 * Dialog/overlay accessibility hook. On open it moves focus into the dialog
 * (first focusable element, falling back to the dialog root itself with
 * `tabIndex={-1}`), traps Tab, closes on Escape, and restores focus to the
 * trigger element when the dialog closes.
 *
 * Escape is handled on a capture-phase document listener with
 * `stopPropagation`, so a dialog's Escape never also reaches background
 * shortcuts bound on `window` (e.g. CartPanel's cashier Enter/Esc keys).
 *
 * Pass `onEscape = null` to skip the Escape listener while keeping focus
 * management and the Tab trap. This is used by the mobile cart sheet, whose
 * Escape must stay context-aware (cancel parking / walk back to review before
 * the sheet closes) and is therefore owned by CartPanel, not the sheet.
 */
export function useDialogFocus<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  onEscape: (() => void) | null = onClose,
) {
  const ref = useRef<T | null>(null);
  // Keep the latest escape callback without re-running the focus effect.
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (!dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    (focusables()[0] ?? dialog).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const handler = onEscapeRef.current;
        if (!handler) return;
        e.stopPropagation();
        handler();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [open]);

  return ref;
}
