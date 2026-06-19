const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "products.json");
const assetsDir = path.join(root, "public", "assets", "products");

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function htmlDecode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function meta(html, prop) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return htmlDecode(match[1]);
  }
  return "";
}

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": userAgent,
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.7",
      },
    });
    return { ok: res.ok, status: res.status, url: res.url, html: await res.text() };
  } catch (error) {
    return { ok: false, status: 0, url, html: "", error: error.message };
  }
}

async function imageExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD", headers: { "user-agent": userAgent } });
    const type = res.headers.get("content-type") || "";
    const length = Number(res.headers.get("content-length") || 0);
    return res.ok && type.startsWith("image/") && type !== "image/gif" && length > 1000;
  } catch {
    return false;
  }
}

function imageExtension(contentType, url) {
  if (contentType.includes("webp") || /\.webp(?:$|\?)/i.test(url)) return "webp";
  if (contentType.includes("png") || /\.png(?:$|\?)/i.test(url)) return "png";
  return "jpg";
}

async function downloadImage(url, productId) {
  try {
    const res = await fetch(url, { headers: { "user-agent": userAgent, "referer": "" } });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !type.startsWith("image/") || type === "image/gif") return "";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) return "";
    fs.mkdirSync(assetsDir, { recursive: true });
    const ext = imageExtension(type, url);
    const file = path.join(assetsDir, `${productId}.${ext}`);
    fs.writeFileSync(file, buffer);
    return `/assets/products/${productId}.${ext}`;
  } catch {
    return "";
  }
}

function extractAsin(url) {
  const match = String(url || "").match(/(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : "";
}

function normalizePrice(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (raw.includes(",")) return raw.replace(/^R\$\s*/i, "");
  const numeric = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function extractPrice(html, platform) {
  const candidates = [];
  const add = (value) => {
    const normalized = normalizePrice(value);
    if (normalized && !candidates.includes(normalized)) candidates.push(normalized);
  };

  add(meta(html, "product:price:amount"));
  add(meta(html, "twitter:data1"));

  const jsonPricePatterns = [
    /"price"\s*:\s*"?([0-9]+(?:[\.,][0-9]+)?)"?/g,
    /"lowPrice"\s*:\s*"?([0-9]+(?:[\.,][0-9]+)?)"?/g,
    /"priceValue"\s*:\s*"?([0-9]+(?:[\.,][0-9]+)?)"?/g,
  ];
  for (const pattern of jsonPricePatterns) {
    let match;
    while ((match = pattern.exec(html)) && candidates.length < 8) add(match[1]);
  }

  const moneyPattern = /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g;
  let moneyMatch;
  while ((moneyMatch = moneyPattern.exec(html)) && candidates.length < 12) add(moneyMatch[1]);

  const amazonWhole = html.match(/a-price-whole[^>]*>([0-9\.]+)</i)?.[1];
  const amazonFraction = html.match(/a-price-fraction[^>]*>([0-9]{2})</i)?.[1];
  if (amazonWhole && amazonFraction) add(`${amazonWhole},${amazonFraction}`);

  const mlFraction = html.match(/andes-money-amount__fraction[^>]*>([0-9\.]+)</i)?.[1];
  const mlCents = html.match(/andes-money-amount__cents[^>]*>([0-9]{2})</i)?.[1];
  if (mlFraction) add(`${mlFraction},${mlCents || "00"}`);

  if (platform === "Amazon") {
    return candidates.find((price) => price.includes(",")) || candidates[0] || "";
  }
  return candidates[0] || "";
}

function extractImage(html) {
  const candidates = [
    meta(html, "og:image"),
    meta(html, "twitter:image"),
    htmlDecode(html.match(/"hiRes"\s*:\s*"([^"]+)"/)?.[1] || ""),
    htmlDecode(html.match(/"large"\s*:\s*"([^"]+)"/)?.[1] || ""),
  ].filter(Boolean);

  return candidates.find((url) => /^https?:\/\//i.test(url)) || "";
}

function svgEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function productIcon(product) {
  const text = `${product.name} ${product.category}`.toLowerCase();
  if (/fone|ouvido|headset|qcy|philips|lenovo|baseus/.test(text)) return "headphone";
  if (/cafeteira|cafe/.test(text)) return "coffee";
  if (/air fryer|panela|liquidificador|churrasqueira/.test(text)) return "appliance";
  if (/carregador|usb|camera|smartwatch|echo|alexa|tv|drone/.test(text)) return "device";
  if (/camisa|cueca|pantufa|termico|moda/.test(text)) return "shirt";
  if (/creatina|whey|suplemento/.test(text)) return "jar";
  if (/bandeira|copa|torcedor|album|varal/.test(text)) return "flag";
  if (/ferramenta/.test(text)) return "tool";
  if (/caixa de som|jbl/.test(text)) return "speaker";
  return "box";
}

function iconSvg(kind) {
  const common = `fill="none" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    headphone: `<path ${common} d="M58 108V86a70 70 0 0 1 140 0v22"/><path ${common} d="M58 112h-8a18 18 0 0 0-18 18v26a18 18 0 0 0 18 18h18v-62Z"/><path ${common} d="M198 112h8a18 18 0 0 1 18 18v26a18 18 0 0 1-18 18h-18v-62Z"/>`,
    coffee: `<path ${common} d="M62 76h108v72a42 42 0 0 1-42 42H104a42 42 0 0 1-42-42V76Z"/><path ${common} d="M170 98h18a30 30 0 0 1 0 60h-18"/><path ${common} d="M88 44v-8M120 44v-8M152 44v-8"/>`,
    appliance: `<rect ${common} x="62" y="46" width="132" height="164" rx="18"/><path ${common} d="M88 84h80M92 160h72"/><circle cx="96" cy="122" r="9" fill="white"/><circle cx="132" cy="122" r="9" fill="white"/>`,
    device: `<rect ${common} x="74" y="42" width="108" height="172" rx="16"/><path ${common} d="M110 66h36M110 188h36"/>`,
    shirt: `<path ${common} d="M88 54 54 78l28 42 18-12v102h56V108l18 12 28-42-34-24-20 18h-40L88 54Z"/>`,
    jar: `<path ${common} d="M84 66h88v28H84zM72 94h112l-10 118H82L72 94Z"/><path ${common} d="M98 144h60"/>`,
    flag: `<path ${common} d="M72 212V44"/><path ${common} d="M72 54h128l-24 42 24 42H72"/><circle cx="126" cy="96" r="22" fill="white" opacity=".95"/>`,
    tool: `<path ${common} d="m78 176 76-76"/><path ${common} d="M154 100c-10-34 24-64 56-48l-34 34 24 24 34-34c16 32-14 66-48 56l-76 76-32-32Z"/>`,
    speaker: `<rect ${common} x="78" y="42" width="100" height="172" rx="18"/><circle cx="128" cy="93" r="20" fill="white" opacity=".9"/><circle cx="128" cy="160" r="32" fill="white" opacity=".9"/>`,
    box: `<path ${common} d="m128 36 82 46-82 46-82-46 82-46Z"/><path ${common} d="M46 82v92l82 46 82-46V82"/><path ${common} d="M128 128v92"/>`,
  };
  return icons[kind] || icons.box;
}

function platformPalette(platform) {
  const palettes = {
    Amazon: ["#f59e0b", "#7c3f00"],
    "Mercado Livre": ["#f8d934", "#c09200"],
    Magalu: ["#1ba7e1", "#075985"],
    Shopee: ["#f97316", "#9a3412"],
    AliExpress: ["#ef4444", "#991b1b"],
  };
  return palettes[platform] || ["#64748b", "#1f2937"];
}

function writeFallbackImage(product) {
  fs.mkdirSync(assetsDir, { recursive: true });
  const [start, end] = platformPalette(product.platform);
  const kind = productIcon(product);
  const file = path.join(assetsDir, `${product.id}.svg`);
  const title = svgEscape(product.name).slice(0, 70);
  const platform = svgEscape(product.platform || "Oferta");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 900 675" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="${start}"/>
      <stop offset="1" stop-color="${end}"/>
    </linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#000" flood-opacity=".24"/>
    </filter>
  </defs>
  <rect width="900" height="675" fill="url(#g)"/>
  <circle cx="760" cy="108" r="180" fill="#fff" opacity=".08"/>
  <circle cx="130" cy="570" r="210" fill="#fff" opacity=".08"/>
  <rect x="82" y="74" width="220" height="52" rx="18" fill="#fff" opacity=".94"/>
  <text x="192" y="108" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="#111827">${platform}</text>
  <g transform="translate(322 176)" filter="url(#s)">
    <rect width="256" height="256" rx="44" fill="#fff" opacity=".18" stroke="#fff" stroke-opacity=".38" stroke-width="3"/>
    <g transform="translate(0 0)">${iconSvg(kind)}</g>
  </g>
  <rect x="82" y="492" width="736" height="104" rx="22" fill="#fff" opacity=".92"/>
  <text x="122" y="544" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="800" fill="#111827">${title}</text>
</svg>`;
  fs.writeFileSync(file, svg, "utf8");
  return `/assets/products/${product.id}.svg`;
}

async function enrichProduct(product) {
  const report = { id: product.id, image: "fallback", price: product.price ? "kept" : "missing" };
  const page = product.affiliateLink ? await fetchText(product.affiliateLink) : { html: "" };
  const html = page.html || "";

  let image = extractImage(html);
  if (!image && product.platform === "Amazon") {
    const asin = extractAsin(product.affiliateLink);
    const amazonImage = asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg` : "";
    if (amazonImage && await imageExists(amazonImage)) image = amazonImage;
  }

  if (image) {
    const localImage = await downloadImage(image, product.id);
    if (localImage) {
      product.image = localImage;
      report.image = "local-real";
    } else {
      product.image = image;
      report.image = "remote";
    }
  } else {
    product.image = writeFallbackImage(product);
  }

  if (!product.price) {
    const price = extractPrice(html, product.platform);
    if (price) {
      product.price = price;
      report.price = "scraped";
    } else {
      product.price = "Preco no site";
      report.price = "fallback";
    }
  }

  await sleep(350);
  return report;
}

async function main() {
  const state = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
  const products = Array.isArray(state.products) ? state.products : [];
  const reports = [];

  for (const product of products) {
    reports.push(await enrichProduct(product));
  }

  fs.writeFileSync(dataPath, JSON.stringify(state, null, 4), "utf8");

  const summary = reports.reduce((acc, item) => {
    acc.images[item.image] = (acc.images[item.image] || 0) + 1;
    acc.prices[item.price] = (acc.prices[item.price] || 0) + 1;
    return acc;
  }, { images: {}, prices: {} });

  console.log(JSON.stringify({ total: reports.length, summary, reports }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
