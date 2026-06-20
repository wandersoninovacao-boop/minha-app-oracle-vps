const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "products.json");
const outDir = path.join(root, "out");

const flashDealTtlHours = Number(process.env.FLASH_DEAL_TTL_HOURS || 24);
const flashDealTtlMs = Number.isFinite(flashDealTtlHours) && flashDealTtlHours > 0
  ? flashDealTtlHours * 60 * 60 * 1000
  : 24 * 60 * 60 * 1000;

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

function parseMoney(value) {
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Number(normalized) || 0;
}

function formatMoney(value) {
  const amount = parseMoney(value);
  if (!amount) return "Conferir preco no site";
  return amount
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/\u00a0/g, " ");
}

function priorityScore(product) {
  const priority = String(product.priority || "").toLowerCase();
  if (priority === "alta") return 3;
  if (priority === "media" || priority === "média") return 2;
  return 1;
}

function compareBestOffers(a, b) {
  const priorityDiff = priorityScore(b) - priorityScore(a);
  if (priorityDiff) return priorityDiff;

  const flashDiff = Number(isFlashDeal(b)) - Number(isFlashDeal(a));
  if (flashDiff) return flashDiff;

  const priceDiff = parseMoney(a.price) - parseMoney(b.price);
  if (priceDiff) return priceDiff;

  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

function groupTopOffers(products, limitPerPlatform = 5) {
  const groups = new Map();
  const skipped = [];

  for (const product of products.filter((item) => isPublicProduct(item))) {
    if (!canPostToday(product)) {
      skipped.push(product.id);
      continue;
    }
    const platform = product.platform || "Oferta";
    if (!groups.has(platform)) groups.set(platform, []);
    groups.get(platform).push(product);
  }

  if (skipped.length) {
    console.log(`Pulado(s) por ja postado hoje: ${skipped.join(", ")}`);
  }

  return Array.from(groups.entries())
    .map(([platform, items]) => ({
      platform,
      products: items.slice().sort(compareBestOffers).slice(0, limitPerPlatform)
    }))
    .filter((group) => group.products.length)
    .sort((a, b) => compareBestOffers(a.products[0], b.products[0]));
}

function postText(product, brandName) {
  const badge = isFlashDeal(product) ? "OFERTA RELAMPAGO" : "MELHOR OFERTA";
  const summary = product.benefit || product.category || "Oferta selecionada.";
  return [
    `${badge} | ${product.platform || brandName}`,
    product.name || "Produto",
    formatMoney(product.price),
    summary.length > 120 ? `${summary.slice(0, 117)}...` : summary,
    product.affiliateLink || ""
  ].filter(Boolean).join("\n");
}

function groupText(group, brandName) {
  const header = [
    `${brandName}`,
    `Top ${group.products.length} ${group.platform}`,
    "Confira preco, frete e disponibilidade antes de comprar."
  ].join("\n");

  const posts = group.products.map((product) => postText(product, brandName)).join("\n\n");
  return `${header}\n\n${posts}`;
}

function main() {
  const state = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
  const brandName = state.settings?.brandName || "Achadinhos Ofertas Brasil";
  const groups = groupTopOffers(Array.isArray(state.products) ? state.products : [], 5);

  fs.mkdirSync(outDir, { recursive: true });

  let sequence = 0;
  const posts = groups.flatMap((group) => group.products.map((product) => {
    sequence += 1;
    return {
      sequence,
      productId: product.id,
      platform: group.platform,
      name: product.name || "Produto",
      price: formatMoney(product.price),
      affiliateLink: product.affiliateLink || "",
      image: product.image || "",
      imageVerified: product.imageVerified === true,
      text: postText(product, brandName)
    };
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: "individual",
    totalPosts: posts.length,
    posts,
    groups: groups.map((group) => ({
      platform: group.platform,
      count: group.products.length,
      productIds: group.products.map((product) => product.id),
      text: groupText(group, brandName)
    }))
  };

  const text = payload.posts
    .map((post) => [
      `### ANUNCIO ${post.sequence} - ${post.platform}`,
      `IMAGEM: ${post.image || "SEM IMAGEM"}`,
      "",
      post.text
    ].join("\n"))
    .join("\n\n---\n\n");

  fs.writeFileSync(path.join(outDir, "grupos-top5.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "grupos-top5.txt"), text || "Sem ofertas ativas para grupos.", "utf8");

  console.log(`Anuncios individuais gerados: ${payload.totalPosts}`);
  for (const group of payload.groups) {
    console.log(`- ${group.platform}: ${group.count}`);
  }
}

main();
