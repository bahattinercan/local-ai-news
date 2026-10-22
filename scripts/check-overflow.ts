/**
 * Horizontal-overflow check for one url + width. Exits non-zero on overflow, so
 * it can gate a change.
 *
 * Two traps this avoids (see docs/en/DESIGN-V2.md §3 D2):
 *  - `mobile: true` on a small width inflates the layout viewport to the content
 *    width (`window.innerWidth` becomes 769 on a 360 px request), which made
 *    `scrollWidth - innerWidth` 0 by construction - a false pass on a page that
 *    was 424 px too wide.
 *  - `next dev` recompiles on save, so a measurement taken too early can belong
 *    to the previous route; wait until the emulated width is the layout width.
 *
 *   npx tsx scripts/check-overflow.ts http://localhost:3000/tr 360
 */
const CDP_PORT = Number(process.env.CDP_PORT ?? 9222);
const url = process.argv[2];
const width = Number(process.argv[3] ?? 360);

async function main(): Promise<void> {
  const targets = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json()) as Array<{
    type: string;
    webSocketDebuggerUrl: string;
  }>;
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("no page target");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve));
  let id = 1;
  const pending = new Map<number, (_value: Record<string, unknown>) => void>();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) { pending.get(message.id)!(message); pending.delete(message.id); }
  });
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve) => { const i = id++; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });

  const evaluate = async (expression: string) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true })) as {
      result?: { result?: { value?: unknown } };
    };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });

  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const probe = await evaluate("window.innerWidth");
    if (probe.result?.result?.value === width) break;
  }
  await new Promise((resolve) => setTimeout(resolve, 600));

  const result = await evaluate(`(function(){
    const d = document.documentElement;
    const cw = d.clientWidth;
    const wide = [...document.querySelectorAll('body *')]
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ el, rect }) => {
        if (rect.right <= cw + 1) return false;
        // A clipped decoration contributes 0 to scrollWidth; do not chase it.
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'hidden' || ox === 'auto' || ox === 'scroll' || ox === 'clip') return false;
        }
        return true;
      })
      .slice(0, 8)
      .map(({ el, rect }) => el.tagName.toLowerCase() + '[' + String(el.className || '').split(' ')[0] + '] right=' + Math.round(rect.right) + ' w=' + Math.round(rect.width));
    return { inner: window.innerWidth, client: cw, scroll: d.scrollWidth, overflow: d.scrollWidth - cw, wide };
  })()`);

  const value = result.result?.result?.value as
    | { inner: number; client: number; scroll: number; overflow: number; wide: string[] }
    | undefined;
  if (!value) throw new Error("measurement failed");
  if (value.inner !== width) {
    console.error(`${url} @${width}: layout viewport is ${value.inner} px, not ${width} - rerun`);
    process.exit(1);
  }

  console.log(`${url} @${width}: scroll ${value.scroll} vs client ${value.client} → overflow ${value.overflow > 0 ? "+" + value.overflow : "0"}`);
  if (value.wide.length > 0) console.log("  widest unclipped:", value.wide.join(" | "));
  ws.close();
  process.exit(value.overflow > 0 ? 1 : 0);
}

main().catch((error) => { console.error(error.message); process.exit(1); });

export {};
