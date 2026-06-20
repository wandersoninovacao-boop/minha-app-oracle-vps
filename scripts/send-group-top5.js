const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "products.json");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const prefix = `--${name}=`;
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
};
const queueFile = option("queue", "grupos-top5.json");
const chatEnv = option("chat-env", "SHOPEE_TELEGRAM_CHAT_ID");
const expectedCount = Number(option("expected", "0")) || 0;
const queuePath = path.join(root, "out", path.basename(queueFile));
const dryRun = process.argv.includes("--dry-run");

function todayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function postSignature(product) {
  return JSON.stringify([
    String(product.price || "").trim(),
    String(product.affiliateLink || "").trim()
  ]);
}

const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveImagePath(image) {
  if (!image || /^https?:\/\//i.test(image)) return null;
  const relative = String(image).replace(/^\/+/, "");
  const imagePath = path.resolve(root, "public", relative);
  const publicRoot = path.resolve(root, "public") + path.sep;
  if (!imagePath.startsWith(publicRoot) || !fs.existsSync(imagePath)) return null;
  return imagePath;
}

function validatePost(post) {
  const errors = [];
  const imagePath = resolveImagePath(post.image);
  const extension = imagePath ? path.extname(imagePath).toLowerCase() : "";

  if (!post.productId) errors.push("produto sem ID");
  if (!post.text) errors.push("produto sem texto");
  if (!post.image) errors.push("produto sem imagem");
  if (post.image && !imagePath && !/^https?:\/\//i.test(post.image)) errors.push("imagem local nao encontrada");
  if (imagePath && !mimeTypes[extension]) errors.push(`formato de imagem nao suportado: ${extension}`);

  return { errors, imagePath, extension };
}

async function telegramRequest(token, method, body, headers = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers,
    body
  });
  const result = await response.text();
  if (!response.ok) throw new Error(`${method}: ${result}`);
  return JSON.parse(result);
}

async function sendPhotoFile(token, chatId, imagePath, caption) {
  const extension = path.extname(imagePath).toLowerCase();
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption.slice(0, 1024));
  form.append(
    "photo",
    new Blob([fs.readFileSync(imagePath)], { type: mimeTypes[extension] }),
    path.basename(imagePath)
  );
  return telegramRequest(token, "sendPhoto", form);
}

async function sendPhotoUrl(token, chatId, imageUrl, caption) {
  return telegramRequest(
    token,
    "sendPhoto",
    JSON.stringify({ chat_id: chatId, photo: imageUrl, caption: caption.slice(0, 1024) }),
    { "Content-Type": "application/json" }
  );
}

async function main() {
  if (!fs.existsSync(queuePath)) {
    throw new Error("Fila nao encontrada. Rode npm run groups:top5 primeiro.");
  }

  const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
  if (queue.destination === "aliexpress-only" && chatEnv !== "ALIEXPRESS_TELEGRAM_CHAT_ID") {
    throw new Error("Fila exclusiva AliExpress recusada: use somente ALIEXPRESS_TELEGRAM_CHAT_ID.");
  }
  const posts = Array.isArray(queue.posts) ? queue.posts : [];
  if (expectedCount && posts.length !== expectedCount) {
    throw new Error(`A fila precisa conter exatamente ${expectedCount} anuncios; encontrados: ${posts.length}.`);
  }
  if (!posts.length) throw new Error("A fila nao possui anuncios individuais.");

  const validations = posts.map((post) => ({ post, ...validatePost(post) }));
  const invalid = validations.filter((item) => item.errors.length);

  console.log(`Fila individual: ${posts.length} anuncios.`);
  for (const item of validations) {
    const status = item.errors.length ? item.errors.join(", ") : "imagem pronta";
    console.log(`${item.post.sequence}. ${item.post.platform} | ${item.post.productId} | ${status}`);
  }

  if (invalid.length) {
    throw new Error(`${invalid.length} anuncio(s) sem imagem valida. Envio cancelado.`);
  }

  if (dryRun) {
    console.log("Dry-run concluido. Nenhuma mensagem foi enviada.");
    return;
  }

  const token = process.env.SHOPEE_TELEGRAM_BOT_TOKEN;
  const chatId = process.env[chatEnv];
  if (!token || !chatId) {
    throw new Error(`Configure SHOPEE_TELEGRAM_BOT_TOKEN e ${chatEnv}.`);
  }

  const state = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
  const productsMap = new Map((state.products || []).map((p) => [p.id, p]));
  const today = todayDate();

  for (const item of validations) {
    const { post, imagePath } = item;
    const result = imagePath
      ? await sendPhotoFile(token, chatId, imagePath, post.text)
      : await sendPhotoUrl(token, chatId, post.image, post.text);
    console.log(
      `Enviado ${post.sequence}/${posts.length}: ${post.productId} (messageId ${result.result?.message_id || "?"})`
    );
    const product = productsMap.get(post.productId);
    if (product) {
      product.lastGroupPostedAt = today;
      product.lastGroupPostSignature = postSignature(product);
      fs.writeFileSync(dataPath, JSON.stringify(state, null, 2), "utf8");
    }
    await sleep(1200);
  }

  console.log("Todos os anuncios foram enviados individualmente com imagem.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
