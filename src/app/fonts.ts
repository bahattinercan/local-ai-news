import { Playfair_Display, Space_Grotesk, JetBrains_Mono } from "next/font/google";

export const grotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-grotesk"
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono-jb"
});

/**
 * The nameplate and section titles (docs/en/DESIGN-V3.md §5 D4).
 *
 * `latin-ext` is not optional: without it Turkish headlines lose ğ ş İ ı and
 * silently fall back to Georgia. Only the two weights the design uses are
 * requested, so the extra face costs one small preloaded file.
 */
export const display = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-playfair"
});
