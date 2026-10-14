const PORT = Number(process.env.CDP_PORT ?? 9222);
const URL_TO_MEASURE = process.argv[2] ?? "http://localhost:3104/tr";

async function main(): Promise<void> {
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const page = (targets as Array<{ type: string; webSocketDebuggerUrl: string }>).find((t) => t.type === "page");
  if (!page) throw new Error("no page target");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve));

  const send = (id: number, method: string, params: Record<string, unknown> = {}) =>
    ws.send(JSON.stringify({ id, method, params }));

  send(1, "Page.enable");
  send(2, "Page.navigate", { url: URL_TO_MEASURE });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const expression = `(function(){
    const d = document.documentElement;
    const widest = [...document.querySelectorAll('*')]
      .map((el) => ({ tag: el.tagName, w: Math.round(el.getBoundingClientRect().width) }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 6);
    return JSON.stringify({ clientWidth: d.clientWidth, scrollWidth: d.scrollWidth, widest });
  })()`;

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id === 3) {
      console.log(URL_TO_MEASURE);
      console.log(message.result?.value ?? JSON.stringify(message));
      ws.close();
      process.exit(0);
    }
  });

  send(3, "Runtime.evaluate", { expression, returnByValue: true });
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
