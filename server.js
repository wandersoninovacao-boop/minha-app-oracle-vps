import http from "node:http";

const port = process.env.PORT || 3000;

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Oracle VPS Online</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at 20% 20%, rgba(0, 114, 178, 0.18), transparent 32rem),
          radial-gradient(circle at 80% 70%, rgba(0, 158, 115, 0.18), transparent 28rem),
          #101317;
        color: #f5f7fa;
      }

      main {
        width: min(680px, calc(100vw - 32px));
      }

      h1 {
        margin: 0 0 16px;
        font-size: clamp(2rem, 6vw, 4.5rem);
        line-height: 1;
      }

      p {
        margin: 0;
        color: #c8d0d8;
        font-size: 1.15rem;
        line-height: 1.6;
      }

      code {
        color: #99e2b4;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Oracle VPS online</h1>
      <p>Deploy automatico funcionando via <code>GitHub Actions</code>, <code>GHCR</code>, <code>Docker Compose</code> e <code>Caddy</code>.</p>
    </main>
  </body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, service: "minha-app-oracle-vps" }));
    return;
  }

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, () => {
  console.log(`minha-app-oracle-vps ouvindo em :${port}`);
});
