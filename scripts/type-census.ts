/**
 * Type census: what sizes the text on a page actually is, measured in the browser
 * (docs/en/DESIGN-V3.md §5).
 *
 *   npx tsx scripts/type-census.ts http://localhost:3000/tr [width]
 *
 * Why it exists: DESIGN-V2 §2 measured 484 of 517 text elements (94 %) at ≤ 14 px
 * with a 24 px maximum - a page where nothing was more important than anything
 * else. That is invisible in a screenshot review and not something opinion can
 * settle, so it is a number.
 *
 * The gate is deliberately *not* "most text is 15–17 px". The design puts every
 * kicker, byline, count and annotation at 11–13 px on purpose - letterspaced small
 * caps are the reference's signature move and its whole reason for being readable
 * at a glance. What must never happen is a *sentence* set that small, or a page
 * with several competing display sizes. So the checks are:
 *
 *   1. exactly one element at ≥ 40 px (the hero headline; zero is fine on phones);
 *   2. no element whose own text is a sentence (≥ 50 characters) below 15 px,
 *      unless it is mono data or a label/annotation;
 *   3. reported for the record: the histogram, and the share at ≥ 15 px.
 *
 * SVG `<text>` is excluded: the letters inside a `PressPlate` are artwork, not
 * page text (counting them once reported a page with fifteen 30 px headings).
 */
const CDP_PORT = Number(process.env.CDP_PORT ?? 9222);
const url = process.argv[2] ?? "http://localhost:3000/tr";
const width = Number(process.argv[3] ?? 1440);

const BODY_MIN_PX = 15;
const SENTENCE_CHARS = 50;
const DISPLAY_PX = 40;

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
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)!(message.result);
      pending.delete(message.id);
    }
  });
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve) => {
      const current = id++;
      pending.set(current, resolve);
      ws.send(JSON.stringify({ id: current, method, params }));
    });
  /* The resolver receives `message.result`, so the value sits one level above
     `check-overflow.ts`'s `.result.result.value` (which resolves with the whole
     CDP message). Getting this wrong yields `undefined`, not an error. */
  const evaluate = async (expression: string) =>
    ((await send("Runtime.evaluate", { expression, returnByValue: true })) as {
      result?: { value?: unknown };
    }).result?.value;

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if ((await evaluate("window.innerWidth")) === width) break;
  }
  await new Promise((resolve) => setTimeout(resolve, 700));

  const result = (await evaluate(`(function(){
    const rows = [];
    for (const el of document.querySelectorAll('main *')) {
      if (el.ownerSVGElement || el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'text') continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim();
      if (!own) continue;
      const style = getComputedStyle(el);
      rows.push({
        size: Math.round(parseFloat(style.fontSize)),
        text: own.slice(0, 70),
        tag: el.tagName.toLowerCase(),
        className: String(el.className).slice(0, 60),
        mono: style.fontFamily.toLowerCase().includes('mono'),
        /* A byline label sits inside a byline paragraph, so this walks up: the
           org name "Mohamed Bin Zayed University of Artificial Intelligence" is 56
           characters of small print, and a byline is small print. */
        smallPrint: Boolean(el.closest('.label, .byline, sup'))
      });
    }
    const sizes = rows.map((row) => row.size);
    const histogram = {};
    for (const size of sizes) histogram[size] = (histogram[size] || 0) + 1;
    const display = rows.filter((row) => row.size >= ${DISPLAY_PX});
    const tinySentences = rows.filter(
      (row) => row.size < ${BODY_MIN_PX} && row.text.length >= ${SENTENCE_CHARS} && !row.mono && !row.smallPrint
    );
    return {
      total: rows.length,
      histogram,
      largest: Math.max(...sizes),
      display: display.map((row) => row.size + 'px ' + row.tag + '.' + row.className + ' :: ' + row.text),
      tinySentences: tinySentences.map((row) => row.size + 'px ' + row.text.slice(0, 60)),
      atLeast15: sizes.filter((size) => size >= ${BODY_MIN_PX}).length
    };
  })()`)) as {
    total: number;
    histogram: Record<string, number>;
    largest: number;
    display: string[];
    tinySentences: string[];
    atLeast15: number;
  };

  const share = Math.round((result.atLeast15 / result.total) * 100);
  console.log(`${url} @${width}`);
  console.log(`  own-text elements: ${result.total}`);
  console.log(`  histogram:         ${JSON.stringify(result.histogram)}`);
  console.log(`  largest:           ${result.largest} px · at ≥${DISPLAY_PX} px: ${result.display.length}`);
  console.log(`  at ≥${BODY_MIN_PX} px:        ${result.atLeast15} (${share} %)`);

  let failures = 0;
  if (result.display.length > 1) {
    failures += 1;
    console.log(`  FAIL: ${result.display.length} elements at ≥${DISPLAY_PX} px (one hero headline is enough)`);
    console.log(`    ${result.display.join("\n    ")}`);
  }
  if (result.tinySentences.length > 0) {
    failures += 1;
    console.log(`  FAIL: ${result.tinySentences.length} sentence(s) below ${BODY_MIN_PX} px`);
    console.log(`    ${result.tinySentences.join("\n    ")}`);
  }
  console.log(failures === 0 ? "  pass" : "  FAIL");
  ws.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});

export {};
