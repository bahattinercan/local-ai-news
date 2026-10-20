"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * The copy affordance for a runner command.
 *
 * It is a `label`-register button, not a body-size one: every other action on the
 * site is an uppercase label (`AKIŞI AÇ`, `UYGULA`, `MODELİ GÖR`), and at 15 px it
 * was the loudest thing in a 275 px rail — 104 × 36 px, which is what squeezed the
 * command it belonged to (docs/en/DESIGN-V3.md §7.1).
 *
 * The copied state swaps *both* the glyph and the wording. It used to swap the
 * glyph and hardcode a "✓" next to it, so the button rendered a check icon and a
 * check character at once, and the state carried no text for anyone reading it.
 */
export function CopyCommand({
  text,
  label,
  copiedLabel
}: {
  text: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="label flex shrink-0 items-center gap-1.5 border border-rule-strong bg-text px-2.5 py-1.5 text-bg hover:opacity-90"
    >
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
