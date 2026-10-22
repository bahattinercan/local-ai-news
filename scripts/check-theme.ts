/**
 * "Does the night edition survive a language switch?" check.
 *
 * The defect it guards (docs/en/DESIGN-V3.md §0.2.10): the theme lived only in
 * `<html data-theme>` plus a `<head>` bootstrap script, and the root layout is
 * `app/[locale]/layout.tsx` - so clicking TR/EN remounted it, React re-wrote
 * `data-theme="light"` from the RSC payload, and the inline script (rendered via
 * `dangerouslySetInnerHTML`) never executed again. The reader got paper back
 * while `localStorage` still said `dark`. `ThemeSync` now re-asserts the choice
 * in a layout effect; this script proves it in a real browser, in both
 * directions, and also proves the page is actually painted dark (computed
 * `background-color`), not merely labelled so.
 *
 *   npx tsx scripts/check-theme.ts http://localhost:3000
 *
 * Needs a Chrome with `--remote-debugging-port=9222` (same rig as
 * `scripts/audit-ui.ts`). Exits non-zero on any failure.
 */

const CDP_PORT = Number(process.env.CDP_PORT ?? 9222);
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

type Page = { type: string; webSocketDebuggerUrl: string };

async function main(): Promise<void> {
  const targets = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json()) as Page[];
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("no CDP page target - start Chrome with --remote-debugging-port=9222");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise<void>((resolve) => ws.addEventListener("open", () => resolve()));

  let id = 1;
  const pending = new Map<number, (_value: any) => void>();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String((event as MessageEvent).data));
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)!(message.result);
      pending.delete(message.id);
    }
  });
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<any>((resolve) => {
      const current = id++;
      pending.set(current, resolve);
      ws.send(JSON.stringify({ id: current, method, params }));
    });
  const evaluate = async <T>(expression: string): Promise<T> => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return result.result?.value as T;
  };
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const failures: string[] = [];
  const check = (ok: boolean, message: string) => {
    console.log(`${ok ? "ok  " : "FAIL"}  ${message}`);
    if (!ok) failures.push(message);
  };

  /** Everything the reader can actually perceive, plus what storage says. */
  const probe = `JSON.stringify({
    path: location.pathname,
    theme: document.documentElement.dataset.theme ?? null,
    stored: (function(){ try { return localStorage.getItem("owr.theme"); } catch (e) { return null; } })(),
    bg: getComputedStyle(document.body).backgroundColor,
    label: document.querySelector('button[aria-label*="theme" i]')?.getAttribute("aria-label") ?? null
  })`;

  const read = async () =>
    JSON.parse(
      await evaluate<string>(probe)
    ) as { path: string; theme: string | null; stored: string | null; bg: string; label: string | null };
  const luminance = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+/g)!.map(Number).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const switchLocale = () =>
    evaluate<string>(
      `(function(){
        const link = [...document.querySelectorAll("a[hreflang]")].find((a) => a.getAttribute("hreflang") !== document.documentElement.lang);
        if (!link) return "none";
        const href = link.getAttribute("href");
        link.click();
        return href;
      })()`
    );

  await send("Page.enable");
  await send("Runtime.enable");

  /* Start from a known state: a cold load with no saved theme (paper). */
  await send("Page.navigate", { url: `${BASE}/en/models` });
  await wait(3000);
  await evaluate(`localStorage.removeItem("owr.theme")`);
  await send("Page.navigate", { url: `${BASE}/en/models` });
  await wait(3000);

  const first = await read();
  check(first.theme === "light", `cold load defaults to paper (got ${first.theme})`);

  /* --- night edition, then a language switch --- */
  await evaluate(`document.querySelector('button[aria-label*="theme" i]').click()`);
  await wait(400);
  const dark = await read();
  check(dark.theme === "dark" && dark.stored === "dark", `toggle reaches the night edition (theme=${dark.theme}, stored=${dark.stored})`);
  check(luminance(dark.bg) < 0.05, `night edition paints ink (body bg ${dark.bg})`);

  const toTurkish = await switchLocale();
  await wait(3000);
  const afterTr = await read();
  check(toTurkish.startsWith("/tr"), `the switch links to the Turkish page (${toTurkish})`);
  check(afterTr.path.startsWith("/tr"), `the switch land on Turkish (${afterTr.path})`);
  check(afterTr.theme === "dark", `the night edition survives EN → TR (data-theme=${afterTr.theme}, stored=${afterTr.stored})`);
  check(luminance(afterTr.bg) < 0.05, `the Turkish page is still painted ink (body bg ${afterTr.bg})`);
  check(afterTr.label === "Switch to light theme", `the toggle still offers paper (${afterTr.label})`);

  /* --- and back again, then the toggle must still work from here --- */
  const toEnglish = await switchLocale();
  await wait(3000);
  const afterEn = await read();
  check(toEnglish.startsWith("/en"), `the switch links back to English (${toEnglish})`);
  check(afterEn.theme === "dark" && luminance(afterEn.bg) < 0.05, `the night edition survives TR → EN (data-theme=${afterEn.theme}, bg ${afterEn.bg})`);

  await evaluate(`document.querySelector('button[aria-label*="theme" i]').click()`);
  await wait(400);
  const backToPaper = await read();
  check(
    backToPaper.theme === "light" && backToPaper.stored === "light" && luminance(backToPaper.bg) > 0.5,
    `the toggle still returns to paper after two switches (theme=${backToPaper.theme}, bg ${backToPaper.bg})`
  );

  /* --- a hard load must honour the saved choice, not flash the default --- */
  await evaluate(`localStorage.setItem("owr.theme", "dark")`);
  await send("Page.navigate", { url: `${BASE}/tr/glossary` });
  await wait(3000);
  const reloaded = await read();
  check(reloaded.theme === "dark" && luminance(reloaded.bg) < 0.05, `a cold load honours the saved night edition (data-theme=${reloaded.theme}, bg ${reloaded.bg})`);

  ws.close();

  if (failures.length > 0) {
    console.error(`\n${failures.length} theme check(s) failed`);
    process.exit(1);
  }
  console.log("\nthe night edition survives a language switch");
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});

export {};
