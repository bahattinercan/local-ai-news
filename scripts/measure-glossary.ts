/**
 * What the glossary is allowed to be, measured (docs/en/GLOSSARY-PLAN.md §5 G5).
 *
 *   npx tsx scripts/measure-glossary.ts http://localhost:3000
 *
 * Exits non-zero when a route regresses on one of the things the plan promised:
 *  - the index is a ruled list, not a card grid (`a.card` count is 0);
 *  - every entry page has at least one in-body cross-reference on the entries that
 *    declare one (measured before the change: 0 links inside every article);
 *  - no horizontal overflow at 320 / 390 / 1440;
 *  - no standalone target below 24 px (inline links inside a sentence are exempt:
 *    WCAG 2.5.8, and a 24 px word would break the line box it lives in).
 *
 * It deliberately prints the numbers instead of only asserting them: the plan's
 * height ceilings were the least reliable guess in the document, and a ratio
 * (page per term) is what a reader actually feels.
 */
const CDP_PORT = Number(process.env.CDP_PORT ?? 9222);
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const WIDTHS = [1440, 390, 320];

interface Target {
  type: string;
  webSocketDebuggerUrl: string;
}

interface Measurement {
  width: number;
  path: string;
  overflow: number;
  pageHeight: number;
  rows: number;
  listHeight: number;
  cards: number;
  inBodyLinks: number | null;
  smallTargets: string[];
  words: number | null;
}

async function main(): Promise<void> {
  const targets = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json()) as Target[];
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("no page target — start headless Chrome with --remote-debugging-port");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve));
  let id = 1;
  const pending = new Map<number, (_value: Record<string, unknown>) => void>();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as { id?: number; result?: Record<string, unknown> };
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)!(message.result ?? {});
      pending.delete(message.id);
    }
  });
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve) => {
      const callId = id++;
      pending.set(callId, resolve);
      ws.send(JSON.stringify({ id: callId, method, params }));
    });
  const evaluate = async (expression: string) => {
    const result = (await send("Runtime.evaluate", { expression, returnByValue: true })) as {
      result?: { value?: unknown };
    };
    return result.result?.value;
  };

  await send("Page.enable");
  const measurements: Measurement[] = [];

  for (const width of WIDTHS) {
    for (const path of ["/tr/glossary", "/tr/glossary/quantization", "/en/glossary/gguf"]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: BASE + path });
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const ready =
          (await evaluate("window.innerWidth")) === width && (await evaluate("location.pathname")) === path;
        if (ready) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));

      const overflow = (await evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")) as number;
      const pageHeight = (await evaluate("document.documentElement.scrollHeight")) as number;
      const rows = (await evaluate(
        "[...document.querySelectorAll('ul.rule-strong')].reduce((n, l) => n + l.querySelectorAll('li').length, 0)"
      )) as number;
      const listHeight = (await evaluate(
        "(() => { const l = [...document.querySelectorAll('ul.rule-strong')]; if (!l.length) return 0; const t = Math.min(...l.map(e => e.getBoundingClientRect().top + scrollY)); const b = Math.max(...l.map(e => e.getBoundingClientRect().bottom + scrollY)); return Math.round(b - t); })()"
      )) as number;
      const cards = (await evaluate("document.querySelectorAll('a.card').length")) as number;
      const inBodyLinks = (await evaluate(
        "document.querySelector('article') ? document.querySelectorAll('article p a').length : -1"
      )) as number;
      const words = (await evaluate(
        "document.querySelector('article') ? document.querySelector('article').textContent.trim().split(/\s+/).length : 0"
      )) as number;
      /* Inline links inside a sentence are exempt (WCAG 2.5.8): a 24 px word would
         break the line box it lives in. Standalone controls are not. */
      const smallTargets = (await evaluate(
        "[...document.querySelectorAll('a')].filter(a => !a.closest('p')).filter(a => { const b = a.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.width < 24 || b.height < 24); }).map(a => a.textContent.trim().slice(0, 20) + ' ' + Math.round(a.getBoundingClientRect().width) + 'x' + Math.round(a.getBoundingClientRect().height))"
      )) as string[];

      const measurement: Measurement = {
        width,
        path,
        overflow,
        pageHeight,
        rows,
        listHeight,
        cards,
        inBodyLinks: inBodyLinks >= 0 ? inBodyLinks : null,
        smallTargets,
        words: words > 0 ? words : null
      };

      measurements.push(measurement);
      console.log(
        [
          `${String(measurement.width).padStart(4)}`,
          measurement.path.padEnd(26),
          `overflow ${measurement.overflow}`,
          `page ${measurement.pageHeight}`,
          `rows ${measurement.rows}`,
          `list ${measurement.listHeight}`,
          `cards ${measurement.cards}`,
          measurement.inBodyLinks === null ? "links -" : `links ${measurement.inBodyLinks}`,
          measurement.smallTargets.length ? `SMALL ${measurement.smallTargets.join(", ")}` : "targets ok"
        ].join("  ")
      );
    }
  }

  ws.close();

  const problems: string[] = [];
  const index = measurements.filter((entry) => entry.path === "/tr/glossary");
  const desktops = measurements.filter((entry) => entry.width === 1440 && entry.path !== "/tr/glossary");
  const mobile = measurements.filter((entry) => entry.path === "/tr/glossary" && entry.width === 390)[0];

  for (const entry of measurements) {
    if (entry.overflow !== 0) problems.push(`${entry.path} @${entry.width}: ${entry.overflow} px of horizontal overflow`);
    for (const target of entry.smallTargets) {
      problems.push(`${entry.path} @${entry.width}: target below 24 px — ${target}`);
    }
  }
  for (const entry of index) {
    if (entry.cards !== 0) problems.push(`/glossary @${entry.width}: ${entry.cards} card rows (the index is a ruled list)`);
    if (entry.rows < 10) problems.push(`/glossary @${entry.width}: only ${entry.rows} rows`);
  }
  for (const entry of desktops) {
    if (!entry.inBodyLinks) problems.push(`${entry.path}: no cross-reference inside the definition`);
  }
  if (index.length && mobile) {
    console.log(
      `page per term @1440: ${(index.find((entry) => entry.width === 1440)!.pageHeight / Math.max(1, index.find((entry) => entry.width === 1440)!.rows)).toFixed(1)} px · ` +
        `@390: ${(mobile.pageHeight / Math.max(1, mobile.rows)).toFixed(1)} px`
    );
  }

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`\nok — ${measurements.length} measurements, 0 problems`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
