const CDP_PORT = Number(process.env.CDP_PORT ?? 9222);
const BASE = process.argv[2] ?? "http://localhost:3101";
const WIDTHS = [360, 390, 768, 1280, 1440];

const PAGES_ALL = [
  { path: "/en", label: "front-en" },
  { path: "/tr", label: "front-tr" },
  /* The index moved here (docs/en/DESIGN-V3.md D3) and is the only route that
     serves the feed's query surface, so it has to be in the sweep. */
  { path: "/en/models", label: "models-en" },
  { path: "/tr/models", label: "models-tr" },
  { path: "/en/c/image", label: "category-image" },
  { path: "/en/c/coding", label: "category-coding" },
  { path: "/en/c/llm", label: "category-llm" },
  { path: "/en/m/Cdimabusinessent-Qwen-Image-2.1-viggle-turbo", label: "model-detail" },
  { path: "/en/news", label: "news" },
  { path: "/en/stats", label: "stats" },
  { path: "/en/compare", label: "compare" }
];

const labels = process.argv[3]?.split(",");
const PAGES = labels ? PAGES_ALL.filter((page) => labels.includes(page.label)) : PAGES_ALL;

const METRICS = `(function(){
  const d = document.documentElement;
  const inner = window.innerWidth;
  const overflow = d.scrollWidth - inner;
  const offenders = overflow > 0
    ? [...document.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().right > inner + 1)
        .slice(0, 6)
        .map((el) => el.tagName.toLowerCase() + '.' + (el.className || '').split(' ')[0] + ' right=' + Math.round(el.getBoundingClientRect().right))
    : [];
  const cards = [...document.querySelectorAll('article')];
  const sections = [...document.querySelectorAll('h1,h2')].map((h) => {
    const box = h.parentElement.getBoundingClientRect();
    return { heading: h.textContent.trim().slice(0, 24), containerHeight: Math.round(box.height) };
  });
  const luminance = (r, g, b) => {
    const s = [r, g, b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2); });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  };
  const parse = (color) => {
    const m = color.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const surface = (el) => {
    let node = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      const c = parse(bg);
      if (c && c.a > 0) return c;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const ratio = (fg, bg) => {
    const comp = { r: fg.a * fg.r + (1 - fg.a) * bg.r, g: fg.a * fg.g + (1 - fg.a) * bg.g, b: fg.a * fg.b + (1 - fg.a) * bg.b };
    const l1 = luminance(comp.r, comp.g, comp.b), l2 = luminance(bg.r, bg.g, bg.b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const contrast = [];
  for (const sel of ['body', 'article', 'a', '.text-muted', '.badge', 'button', 'input', 'select']) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = surface(el);
    if (fg) contrast.push({ selector: sel, color: style.color, surface: bg.r + ',' + bg.g + ',' + bg.b, ratio: Math.round(ratio(fg, bg) * 100) / 100 });
  }
  return {
    innerWidth: inner,
    scrollWidth: d.scrollWidth,
    overflow,
    offenders,
    pageHeight: Math.round(d.getBoundingClientRect().height),
    cardCount: cards.length,
    cardWidth: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : 0,
    cardImageWidth: cards[0]?.querySelector('.thumb, .card-image, img') ? Math.round(cards[0].querySelector('.thumb, .card-image, img').getBoundingClientRect().width) : 0,
    sections,
    contrast
  };
})()`;

async function main(): Promise<void> {
  const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
  const page = (targets as Array<{ type: string; webSocketDebuggerUrl: string }>).find((t) => t.type === "page");
  if (!page) throw new Error("no CDP page target");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve));

  let nextId = 1;
  const pending = new Map<number, (_value: Record<string, unknown>) => void>();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)!(message);
      pending.delete(message.id);
    }
  });
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");

  for (const { path, label } of PAGES) {
    for (const width of WIDTHS) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await send("Page.navigate", { url: BASE + path });
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const result = await send("Runtime.evaluate", { expression: METRICS, returnByValue: true });
      const value = (result.result as { result?: { value?: unknown } })?.result?.value;
      if (!value) {
        console.log(`${label} ${width}px EVALUATE FAILED: ${JSON.stringify(result).slice(0, 300)}`);
        continue;
      }
      const metrics = value as {
        innerWidth: number; scrollWidth: number; overflow: number; offenders: string[];
        pageHeight: number; cardCount: number; cardWidth: number; cardImageWidth: number;
        sections: Array<{ heading: string; containerHeight: number }>; contrast: Array<{ selector: string; ratio: number }>
      };
      console.log(
        `${label.padEnd(15)} ${String(width).padStart(4)}px  overflow=${String(metrics.overflow).padStart(3)}  height=${String(metrics.pageHeight).padStart(5)}  cards=${metrics.cardCount}  cardW=${metrics.cardWidth}  imgW=${metrics.cardImageWidth}` +
          (metrics.offenders.length ? `  OFFENDERS: ${metrics.offenders.join(" | ")}` : "")
      );
      if (width === 1440 || width === 390) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        const data = (shot.result as { data?: string })?.data;
        if (data) {
          const fs = await import("node:fs");
          fs.writeFileSync(`.shots/${label}-${width}.png`, Buffer.from(data, "base64"));
        }
      }
      if (width === 1440) {
        console.log("   contrast: " + metrics.contrast.map((c: { selector: string; ratio: number }) => `${c.selector}=${c.ratio}:1`).join("  "));
      }
    }
  }
  ws.close();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});

export {};
