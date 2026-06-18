const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "products.json");
const postJsonPath = path.join(root, "out", "posts-hoje.json");
const postTxtPath = path.join(root, "out", "posts-hoje.txt");

function parseMoney(value) {
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Number(normalized) || 0;
}

function markTodayAsPosted(productIds) {
  const raw = fs.readFileSync(dataPath, "utf8");
  const state = JSON.parse(raw.replace(/^\uFEFF/, ""));
  const postedAt = new Date().toISOString();
  let count = 0;
  for (const product of state.products) {
    if (productIds.includes(product.id)) {
      product.status = "Postado";
      product.postedAt = postedAt;
      count++;
    }
  }
  if (count > 0) {
    fs.writeFileSync(dataPath, JSON.stringify(state, null, 4), "utf8");
    console.log(`${count} produtos marcados como Postado.`);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function sendPhoto(token, chatId, imagePath, caption) {
  const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
  const imageBuffer = fs.readFileSync(imagePath);
  const captionBuffer = Buffer.from(caption, "utf8");

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="photo"; filename="image.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`
  );
  const footer = Buffer.from(
    `\r\n--${boundary}\r\n` +
    `Content-Disposition: form-data; name="caption"\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n\r\n`
  );
  const endFooter = Buffer.from(`\r\n--${boundary}--\r\n`);

  const body = Buffer.concat([header, imageBuffer, footer, captionBuffer, endFooter]);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body
  });
  const result = await response.text();
  return { ok: response.ok, body: result };
}

async function main() {
  const token = process.env.SHOPEE_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.SHOPEE_TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("Configure SHOPEE_TELEGRAM_BOT_TOKEN e SHOPEE_TELEGRAM_CHAT_ID antes de enviar.");
  }

  if (!fs.existsSync(postJsonPath)) {
    throw new Error("Arquivo out/posts-hoje.json nao encontrado. Rode generate-assets.js primeiro.");
  }

  const data = JSON.parse(fs.readFileSync(postJsonPath, "utf8"));
  const posts = data.posts || [];

  if (posts.length === 0) {
    console.log("Nenhum post para enviar.");
    if (fs.existsSync(postTxtPath)) {
      const text = fs.readFileSync(postTxtPath, "utf8").slice(0, 3900);
      if (!text.includes("Sem produtos prontos")) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false })
        });
      }
    }
    return;
  }

  const postedIds = [];
  const imgDir = path.join(root, "out", "images");

  for (const post of posts) {
    await sleep(1000);

    if (post.imagePath && fs.existsSync(post.imagePath)) {
      const result = await sendPhoto(token, chatId, post.imagePath, post.text.slice(0, 1024));

      if (result.ok) {
        console.log(`Post ${post.index}/${posts.length}: foto enviada (${post.productId})`);
        // Delete image after successful send
        try {
          fs.unlinkSync(post.imagePath);
          console.log(`  Foto apagada: ${post.imagePath}`);
        } catch (e) {
          console.log(`  Erro ao apagar foto: ${e.message}`);
        }
      } else {
        console.log(`Post ${post.index}/${posts.length}: erro foto, enviando texto. ${result.body.slice(0, 100)}`);
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: post.text.slice(0, 3900), disable_web_page_preview: false })
        });
        if (!response.ok) throw new Error(`Telegram erro: ${await response.text()}`);
        console.log(`  Texto enviado como fallback`);
      }
    } else {
      // No image - send text
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: post.text.slice(0, 3900), disable_web_page_preview: false })
      });
      if (!response.ok) throw new Error(`Telegram erro: ${await response.text()}`);
      console.log(`Post ${post.index}/${posts.length}: texto enviado (${post.productId})`);
    }

    postedIds.push(post.productId);
  }

  // Clean up any remaining images
  try {
    if (fs.existsSync(imgDir)) {
      const files = fs.readdirSync(imgDir);
      for (const f of files) {
        try { fs.unlinkSync(path.join(imgDir, f)); } catch (e) {}
      }
      try { fs.rmdirSync(imgDir); } catch (e) {}
      if (files.length > 0) console.log(`Lixeira limpa: ${files.length} arquivos`);
    }
  } catch (e) {}

  markTodayAsPosted(postedIds);
  console.log("Envio concluido.");
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});