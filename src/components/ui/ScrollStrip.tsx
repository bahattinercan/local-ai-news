"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/format";

/**
 * A horizontally scrollable strip a mouse user can actually use.
 *
 * Measured 2026-10-18 on the ribbon: `client 1248 / scroll 2966` — genuinely
 * scrollable, but `scrollbar-width: none` hid the only affordance and a vertical
 * wheel over a 37 px tall strip scrolls the *page*, so with a mouse the rest of
 * the ticker was simply unreachable ("bu kısım kaydırılmıyor"). The desk strip had
 * the same problem and was not even a tab stop (`tabIndex = -1`).
 *
 * Three ways out, all of them native-feeling:
 *  - a thin, themed scrollbar (the honest affordance: it shows there is more and
 *    can be dragged);
 *  - drag-to-pan with the mouse, because that is what a ticker invites;
 *  - `tabIndex = 0` + an accessible name, so arrow keys scroll it (WCAG 2.1.1).
 *
 * The vertical wheel is deliberately NOT hijacked: stealing page scroll from
 * whoever's pointer happens to cross a 37 px strip is worse than the problem.
 */
export function ScrollStrip({
  children,
  label,
  className,
  innerClassName
}: {
  children: ReactNode;
  /** Accessible name; also why the strip is a tab stop. */
  label: string;
  className?: string;
  innerClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    /* Touch and pen already pan natively; only the mouse needs help. */
    if (!el || event.pointerType !== "mouse" || el.scrollWidth <= el.clientWidth) return;

    const startX = event.clientX;
    const startLeft = el.scrollLeft;
    let moved = 0;

    const move = (native: PointerEvent) => {
      moved = Math.abs(native.clientX - startX);
      /* A drag that has travelled a few pixels is a scroll, not a click, so the
         link under the cursor must not fire on release. */
      if (moved > 4) el.dataset.dragging = "true";
      el.scrollLeft = startLeft - (native.clientX - startX);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      delete el.dataset.dragging;
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (ref.current?.dataset.dragging === "true") {
      delete ref.current.dataset.dragging;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      className={cn(
        "scroll-strip cursor-grab select-none overflow-x-auto active:cursor-grabbing",
        className,
        innerClassName
      )}
    >
      {children}
    </div>
  );
}
