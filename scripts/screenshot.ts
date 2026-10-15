const CDP_PORT = Number(process.env.CDP_PORT ?? 9222);
const BASE = process.argv[2] ?? "http://localhost:3101";
const WIDTHS = [1440, 390];
const PAGES = [
  { path: "/tr", label: "feed" },
  { path: "/tr/news", label: "news" },
  { path: "/tr/stats", label: "stats" },
  { path: "/tr/m/Cdimabusinessent-Qwen-Image-2.1-viggle-turbo", label: "model" },
  { path: "/tr/compare?ids=Cdimabusinessent-Qwen-Image-2.1-viggle-turbo,Joscio-Qwen-Image-2.1-Uncensored-Quantized", label: "compare" }
];

async function main(): Promise<void> {
  const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
  const page = (targets as Array<{ type: string; webSocketDebuggerUrl: string }>).find((t) => t.type === "page");
  if (!page) throw new Error("no page target");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve));

  let id = 1;
  const pending = new Map<number, (_value: unknown) => void>();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)!(message.result);
      pending.delete(message.id);
    }
  });
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<unknown>((resolve) => {
      const current = id++;
      pending.set(current, resolve);
      ws.send(JSON.stringify({ id: current, method, params }));
    });

  await send("Page.enable");

  for (const target of PAGES) {
    for (const width of WIDTHS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 500
      });
      await send("Page.navigate", { url: `${BASE}${target.path}` });
      await new Promise((resolve) => setTimeout(resolve, 3500));
      const result = (await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true
      })) as { data?: string };
      const file = `.shots/redesign-${target.label}-${width}.png`;
      await import("node:fs").then((fs) => fs.writeFileSync(file, Buffer.from(result.data ?? "", "base64")));
      console.log(file);
    }
  }

  ws.close();
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
