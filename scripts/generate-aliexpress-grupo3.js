const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "products.json");
const outDir = path.join(root, "out");
const jsonPath = path.join(outDir, "aliexpress-grupo3.json");
const txtPath = path.join(outDir, "aliexpress-grupo3.txt");

const args = process.argv.slice(2);
const countArg = args.find((arg) => arg.startsWith("--count="));
const count = Number(countArg ? countArg.split("=")[1] : 3) || 3;
const onlyReady = args.includes("--only-ready");
const markReady = args.includes("--mark-ready");

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

function canPostToday(product) {
  const lastPosted = product.lastGroupPostedAt;
  if (!lastPosted) return true;
  if (lastPosted !== todayDate()) return true;
  return product.lastGroupPostSignature !== postSignature(product);
}

function parseMoney(value) {
  if (!value) return 0;
  const normalized = String(value)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  return Number(normalized) || 0;
}

function formatMoney(value) {
  const amount = parseMoney(value);
  if (!amount) return "Conferir preco no site";
  return amount
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/\u00a0/g, " ");
}

function priorityRank(value) {
  const priority = { Alta: 1, Media: 2, "Média": 2, Baixa: 3 };
  return priority[value] || 9;
}

function messageFor(product, index, settings) {
  const brand = settings.brandName || "Achadinhos Ofertas Brasil";
  const call = settings.call || "Confira preco, frete e prazo antes de comprar.";
  const price = formatMoney(product.price);
  const benefit = product.benefit || "oferta selecionada para compra rapida";

  return [
    brand,
    "PROMOCAO EXCLUSIVA DO GRUPO ALIEXPRESS",
    `GRUPO DE 3 - OFERTA ${index} DE 3`,
    product.name,
    price,
    benefit,
    `Oferta no AliExpress: ${product.affiliateLink}`,
    call,
    "Esta promocao e exclusiva do grupo AliExpress.",
  ].filter(Boolean).join("\n");
}

function main() {
  const state = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
  const settings = state.settings || {};
  const products = state.products || [];

  const skipped = [];
  const eligible = products
    .filter((product) => product.platform === "AliExpress")
    .filter((product) => product.status !== "Postado")
    .filter((product) => (onlyReady ? product.status === "Pronto" : true))
    .filter((product) => {
      if (canPostToday(product)) return true;
      skipped.push(product.id);
      return false;
    })
    .sort((a, b) => {
      return priorityRank(a.priority) - priorityRank(b.priority) || parseMoney(a.price) - parseMoney(b.price);
    })
    .slice(0, count);

  if (skipped.length) {
    console.log(`Pulado(s) por ja postado hoje no grupo AliExpress: ${skipped.join(", ")}`);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const posts = eligible.map((product, index) => ({
    sequence: index + 1,
    index: index + 1,
    productId: product.id,
    name: product.name,
    platform: product.platform,
    price: product.price,
    category: product.category,
    priority: product.priority,
    status: product.status,
    affiliateLink: product.affiliateLink,
    image: product.image || "",
    text: messageFor(product, index + 1, settings),
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    destination: "aliexpress-only",
    destinationEnv: "ALIEXPRESS_TELEGRAM_CHAT_ID",
    exclusive: true,
    mode: onlyReady ? "only-ready" : "draft-including-paused",
    warning: onlyReady
      ? "Somente produtos Pronto foram incluidos."
      : "Rascunho inclui produtos pausados. Validar links/precos antes de postar.",
    posts,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(txtPath, posts.map((post) => post.text).join("\n\n---\n\n") || "Nenhum produto AliExpress elegivel.", "utf8");

  if (markReady && posts.length > 0) {
    const ids = new Set(posts.map((post) => post.productId));
    for (const product of products) {
      if (ids.has(product.id)) product.status = "Pronto";
    }
    fs.writeFileSync(dataPath, JSON.stringify(state, null, 4), "utf8");
  }

  console.log(`AliExpress Grupo de 3 gerado: ${posts.length} produto(s).`);
  console.log(jsonPath);
  console.log(txtPath);
  if (!onlyReady) {
    console.log("Modo rascunho: valide links/precos antes de postar.");
  }
}

main();
