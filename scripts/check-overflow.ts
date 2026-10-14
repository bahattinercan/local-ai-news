const CDP_PORT = Number(process.env.CDP_PORT ?? 9222);
const url = process.argv[2];
const width = Number(process.argv[3] ?? 360);

async function main(): Promise<void> {
  const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
  const page = (targets as Array<{ type: string; webSocketDebuggerUrl: string }>).find((t) => t.type === "page");
  const ws = new WebSocket(page!.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve));
  let id = 1;
  const pending = new Map<number, (_value: Record<string, unknown>) => void>();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) { pending.get(message.id)!(message); pending.delete(message.id); }
  });
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve) => { const i = id++; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  await send("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const result = await send("Runtime.evaluate", {
    expression: `(function(){
      const d=document.documentElement;
      const wide=[...document.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>window.innerWidth+1)
        .slice(0,8).map(el=>el.tagName.toLowerCase()+'['+(el.className||'').split(' ')[0]+'] right='+Math.round(el.getBoundingClientRect().right)+' w='+Math.round(el.getBoundingClientRect().width));
      return {inner:window.innerWidth, scroll:d.scrollWidth, bodyW:Math.round(document.body.getBoundingClientRect().width), wide};
    })()`,
    returnByValue: true
  });
  console.log(url, width, JSON.stringify((result.result as { result?: { value?: unknown } })?.result?.value));
  ws.close();
}
main().catch((error) => { console.error(error.message); process.exit(1); });

export {};
