import type { ReactNode } from "react";
import { dictionary, pickLocale, t } from "@/i18n";
import { Masthead } from "@/components/shell/Masthead";
import { Ribbon } from "@/components/shell/Ribbon";
import { Footer } from "@/components/Footer";
import { grotesk, mono, display } from "../fonts";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = dictionary(pickLocale(locale));
  return {
    title: `${t(dict, "brand")} — ${t(dict, "tagline")}`,
    description: t(dict, "tagline"),
    icons: { icon: "/icon.svg", apple: "/apple-icon.png" }
  };
}

/**
 * Read the saved theme before the first paint so there is no flash.
 *
 * The default is now **paper** (docs/en/DESIGN-V3.md D2): a newspaper is ink on
 * paper, and the dark ramp is a second edition rather than the ground state. The
 * `localStorage` key and its `light`/`dark` values are unchanged, so nobody's
 * existing choice is lost; `prefers-color-scheme` is deliberately NOT consulted,
 * because on a print design "the operating system prefers dark" is not a reader
 * asking for the night edition.
 */
const THEME_BOOTSTRAP = `try{var s=localStorage.getItem("owr.theme");document.documentElement.dataset.theme=s==="dark"?"dark":"light";}catch(e){}`;

export default async function Layout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = pickLocale(raw);

  return (
    <html
      lang={locale}
      data-theme="light"
      className={`${grotesk.variable} ${mono.variable} ${display.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        {/* The masthead and the ribbon own their containers because their rules
            are the page's widest horizontal lines. The desk nav is NOT here: a
            layout never receives the route params or the search params, so it
            could not mark the active desk or count the filtered view. */}
        <Masthead locale={locale} />
        <Ribbon locale={locale} />

        <div className="shell">
          <main className="py-5">{children}</main>
        </div>

        <Footer locale={locale} />
      </body>
    </html>
  );
}
