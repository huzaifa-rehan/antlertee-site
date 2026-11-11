"use client";

import { useEffect, type RefObject } from "react";
import { lockScroll } from "./lenis";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog behaviour: locks page scroll, traps Tab inside `ref`, closes on Escape,
 * moves focus in on open and returns it to the previously focused element on close
 * (or to `returnFocus()`, e.g. the trigger, when given: Safari doesn't focus buttons on click).
 */
export function useDialog(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  initialFocus?: RefObject<HTMLElement | null>,
  returnFocus?: () => HTMLElement | null | undefined,
): void {
  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockScroll(true);
    (initialFocus?.current ?? node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lockScroll(false);
      const target = returnFocus?.() ?? returnTo;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, [open, onClose, ref, initialFocus, returnFocus]);
}
