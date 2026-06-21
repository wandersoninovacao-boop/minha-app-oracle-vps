const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const queuePath = path.join(root, "out", "aliexpress-grupo3.json");
const groupIdPath = path.join(root, "out", "whatsapp-aliexpress-group-id.txt");
const apiUrl = process.env.WAHA_LOCAL_URL || "http://127.0.0.1:3001";
const apiKey = process.env.WAHA_LOCAL_API_KEY;
const session = "default";
const dryRun = process.argv.includes("--dry-run");

function validPrice(value) {
  return Boolean(value && /\d/.test(String(value)) && !/conferir|preco no site/i.test(String(value)));
}

function imagePathFor(image) {
  if (!image || /^https?:\/\//i.test(image)) return null;
  const resolved = path.resolve(root, "public", String(image).replace(/^\/+/, ""));
  const publicRoot = path.resolve(root, "public") + path.sep;
  return resolved.startsWith(publicRoot) && fs.existsSync(resolved) ? resolved : null;
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      "X-Api-Key": apiKey,
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`${endpoint}: ${await response.text()}`);
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : response.text();
}

async function main() {
  if (!apiKey) throw new Error("WAHA_LOCAL_API_KEY nao configurada.");
  if (!fs.existsSync(queuePath)) throw new Error("Fila AliExpress nao encontrada.");
  if (!fs.existsSync(groupIdPath)) throw new Error("ID do grupo WhatsApp AliExpress nao encontrado.");

  const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
  const posts = Array.isArray(queue.posts) ? queue.posts : [];
  const groupId = fs.readFileSync(groupIdPath, "utf8").trim();

  if (queue.destination !== "aliexpress-only" || queue.exclusive !== true) {
    throw new Error("Somente a fila exclusiva AliExpress pode ser enviada ao WhatsApp.");
  }
  if (posts.length !== 3) throw new Error(`Esperadas 3 ofertas; encontradas: ${posts.length}.`);

  for (const post of posts) {
    if (!validPrice(post.price)) throw new Error(`${post.productId}: preco numerico nao confirmado.`);
    if (post.imageVerified !== true) throw new Error(`${post.productId}: imagem real nao verificada.`);
    if (!imagePathFor(post.image)) throw new Error(`${post.productId}: imagem local nao encontrada.`);
  }

  const group = await request(`/api/${session}/groups/${encodeURIComponent(groupId)}`);
  if (!/aliexpress/i.test(String(group.subject || ""))) {
    throw new Error(`Destino recusado: ${group.subject || groupId}.`);
  }

  console.log(`Fila validada para: ${group.subject}`);
  if (dryRun) {
    console.log("Dry-run concluido. Nenhuma mensagem foi enviada.");
    return;
  }

  for (const post of posts) {
    const imagePath = imagePathFor(post.image);
    const data = fs.readFileSync(imagePath).toString("base64");
    await request("/api/sendImage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session,
        chatId: groupId,
        file: {
          mimetype: `image/${path.extname(imagePath).slice(1).replace("jpg", "jpeg")}`,
          filename: path.basename(imagePath),
          data
        },
        caption: post.text
      })
    });
    console.log(`Enviado: ${post.productId}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
