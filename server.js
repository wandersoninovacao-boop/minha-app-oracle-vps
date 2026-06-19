const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = __dirname;
const dataPath = path.join(root, "data", "products.json");
const nodeExe = process.execPath;
const port = Number(process.env.PORT || 3000);
const flashDealTtlHours = Number(process.env.FLASH_DEAL_TTL_HOURS || 24);
const flashDealTtlMs = Number.isFinite(flashDealTtlHours) && flashDealTtlHours > 0
  ? flashDealTtlHours * 60 * 60 * 1000
  : 24 * 60 * 60 * 1000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 10_000_000) {
        reject(new Error("Body too large."));
        req.destroy();
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function runNodeScript(script) {
  return new Promise((resolve) => {
    const child = spawn(nodeExe, [path.join(root, "scripts", script)], {
      cwd: root,
      env: process.env,
      windowsHide: true
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function parseDateMs(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function isFlashDeal(product) {
  const platform = String(product.platform || "").toLowerCase();
  const category = String(product.category || "").toLowerCase();
  const benefit = String(product.benefit || "").toLowerCase();
  return platform === "shopee" && (category.includes("oferta relampago") || benefit.includes("oferta relampago"));
}

function flashDealExpiresAt(product) {
  const explicitExpiresAt = parseDateMs(product.expiresAt);
  if (explicitExpiresAt) return explicitExpiresAt;

  const baseTime = parseDateMs(product.postedAt) || parseDateMs(product.createdAt);
  if (!baseTime) return null;
  return baseTime + flashDealTtlMs;
}

function isPublicProduct(product, now = Date.now()) {
  if (product.status === "Pausado") return false;
  if (!isFlashDeal(product)) return true;

  const expiresAt = flashDealExpiresAt(product);
  return Boolean(expiresAt) && expiresAt > now;
}

async function handleApi(req, res) {
  const url = req.url;

  // Healthcheck (público)
  if (url === "/health" && req.method === "GET") {
    return send(res, 200, JSON.stringify({ ok: true }));
  }

  // Lista produtos ativos (público)
  if (url === "/api/products" && req.method === "GET") {
    if (!fs.existsSync(dataPath)) {
      return send(res, 200, JSON.stringify([]));
    }
    const raw = fs.readFileSync(dataPath, "utf8");
    const data = JSON.parse(raw);
    const active = (data.products || []).filter((p) => isPublicProduct(p));
    return send(res, 200, JSON.stringify({ products: active, settings: data.settings || {} }));
  }

  // --- Rotas de admin (protegidas por Caddy Basic Auth) ---

  if (url === "/admin/api/state" && req.method === "GET") {
    if (!fs.existsSync(dataPath)) {
      return send(res, 200, JSON.stringify({ settings: {}, products: [] }));
    }
    return send(res, 200, fs.readFileSync(dataPath, "utf8"));
  }

  if (url === "/admin/api/state" && req.method === "POST") {
    const body = await readBody(req);
    const parsed = JSON.parse(body);
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(parsed, null, 2), "utf8");
    return send(res, 200, JSON.stringify({ ok: true }));
  }

  if (url === "/admin/api/generate" && req.method === "POST") {
    const result = await runNodeScript("generate-assets.js");
    const ok = result.code === 0;
    return send(res, ok ? 200 : 500, JSON.stringify({ ok }));
  }

  if (url === "/admin/api/send-telegram" && req.method === "POST") {
    const result = await runNodeScript("send-telegram.js");
    const ok = result.code === 0;
    return send(res, ok ? 200 : 500, JSON.stringify({ ok }));
  }

  send(res, 404, JSON.stringify({ error: "API nao encontrada." }));
}

function serveStatic(req, res) {
  let url = decodeURIComponent(req.url.split("?")[0]);

  // Admin: serve index.html for /admin/ paths
  if (url.startsWith("/admin/")) {
    const subpath = url.replace(/^\/admin\//, "") || "index.html";
    const filePath = path.normalize(path.join(root, subpath));
    if (!filePath.startsWith(root)) {
      return send(res, 403, "Acesso negado.", "text/plain; charset=utf-8");
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return send(res, 404, "Arquivo nao encontrado.", "text/plain; charset=utf-8");
    }
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Public: serve public/ for root
  if (url === "/") url = "/index.html";
  const relative = url.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(root, "public", relative));

  if (!filePath.startsWith(path.join(root, "public"))) {
    return send(res, 403, "Acesso negado.", "text/plain; charset=utf-8");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Arquivo nao encontrado.", "text/plain; charset=utf-8");
  }

  const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/") || req.url.startsWith("/admin/api/") || req.url === "/health") {
      await handleApi(req, res);
    } else {
      serveStatic(req, res);
    }
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message }));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`App rodando em http://0.0.0.0:${port}`);
});
