const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const mode = args.includes("--qr") ? "qr" : args.includes("--send") ? "send" : "help";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function postSignature(product) {
  return JSON.stringify([
    String(product.price || "").trim(),
    String(product.affiliateLink || "").trim()
  ]);
}

if (mode === "help") {
  console.log(`Uso:
  node scripts/send-whatsapp.js --qr              Mostra QR code para conectar
  node scripts/send-whatsapp.js --send --queue=aliexpress-grupo3.json
                                                Envia Grupo de 3 ao WhatsApp AliExpress`);
  process.exit(0);
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "achadinhos" }),
  puppeteer: {
    executablePath: chromePath,
    headless: mode !== "qr",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

client.on("qr", (qr) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
  console.log("=== ESCANEIE O QR CODE ===");
  console.log("Abra no navegador para escanear com o WhatsApp:");
  console.log(qrUrl);
  console.log("Ou escaneie diretamente do terminal com um leitor de QR.");
});

client.on("authenticated", () => {
  console.log("WhatsApp autenticado! Sessao salva.");
});

client.on("ready", async () => {
  console.log(`WhatsApp conectado como ${client.info?.pushname || "?"}`);

  if (mode === "qr") {
    console.log("QR code ja escaneado. Conexao estabelecida.");
    await client.destroy();
    return;
  }

  if (mode === "send") {
    const chatId = process.env.WHATSAPP_GROUP_ID;
    if (!chatId) {
      console.error("Defina WHATSAPP_GROUP_ID com o ID do grupo.");
      await client.destroy();
      process.exit(1);
    }

    const queueFile = args.find((a) => a.startsWith("--queue="))?.split("=")[1] || "aliexpress-grupo3.json";
    const queuePath = path.join(root, "out", path.basename(queueFile));

    if (!fs.existsSync(queuePath)) {
      console.error(`Fila nao encontrada: ${queuePath}`);
      await client.destroy();
      process.exit(1);
    }

    const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
    const posts = Array.isArray(queue.posts) ? queue.posts : [];

    if (queue.destination !== "aliexpress-only" || queue.exclusive !== true) {
      console.error("Envio recusado: o WhatsApp configurado aceita somente a fila exclusiva AliExpress.");
      await client.destroy();
      process.exit(1);
    }

    if (posts.length !== 3) {
      console.error(`Envio recusado: esperadas exatamente 3 ofertas AliExpress; encontradas: ${posts.length}.`);
      await client.destroy();
      process.exit(1);
    }

    if (!posts.length) {
      console.log("Nenhum anuncio na fila.");
      await client.destroy();
      return;
    }

    const chat = await client.getChatById(chatId);
    const chatName = String(chat?.name || "").toLowerCase();
    if (!chat.isGroup || !chatName.includes("aliexpress")) {
      console.error(`Envio recusado: o destino "${chat?.name || chatId}" nao foi reconhecido como grupo AliExpress.`);
      await client.destroy();
      process.exit(1);
    }

    console.log(`Enviando ${posts.length} anuncios exclusivos para ${chat.name}...`);

    const sentIds = [];
    const failures = [];

    for (const post of posts) {
      try {
        const imagePath = post.image
          ? path.resolve(root, "public", post.image.replace(/^\//, ""))
          : null;

        if (imagePath && fs.existsSync(imagePath)) {
          const media = require("whatsapp-web.js").MessageMedia.fromFilePath(imagePath);
          await client.sendMessage(chatId, media, { caption: post.text.slice(0, 1024) });
        } else {
          await client.sendMessage(chatId, post.text);
        }

        console.log(`  Enviado ${post.sequence}/${posts.length}: ${post.productId}`);
        sentIds.push(post.productId);
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`  ERRO ${post.productId}: ${err.message}`);
        failures.push(post.productId);
      }
    }

    const statePath = path.join(root, "data", "products.json");
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, "utf8").replace(/^\uFEFF/, ""));
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
      for (const product of state.products || []) {
        if (sentIds.includes(product.id)) {
          product.lastGroupPostedAt = today;
          product.lastGroupPostSignature = postSignature(product);
        }
      }
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
    }

    if (failures.length) {
      throw new Error(`Envio incompleto. Falharam: ${failures.join(", ")}.`);
    }

    console.log("Grupo de 3 enviado exclusivamente ao WhatsApp AliExpress.");
  }

  await client.destroy();
});

client.on("disconnected", (reason) => {
  console.log(`WhatsApp desconectado: ${reason}`);
  process.exit(1);
});

client.initialize();
