const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "products.json");
const outDir = path.join(root, "out");
const imgDir = path.join(outDir, "images");

function readState() {
  if (!fs.existsSync(dataPath)) throw new Error(`Arquivo nao encontrado: ${dataPath}`);
  const state = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
  return {
    settings: state.settings || {},
    products: Array.isArray(state.products) ? state.products : []
  };
}

function parseMoney(value) {
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Number(normalized) || 0;
}

function formatMoney(value) {
  if (!value) return "";
  return "R$ " + String(value).replace(".", ",");
}

function extractASIN(url) {
  if (!url) return null;
  const m = url.match(/\/dp\/([A-Z0-9]{10})/);
  return m ? m[1] : null;
}

function fetchPage(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      }, timeout: 12000
    };
    https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', () => resolve(''));
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const file = fs.createWriteStream(dest);
    https.get(u.href, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000
    }, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', () => { file.close(); resolve(false); });
  });
}

async function scrapeAmazonPage(asin) {
  const html = await fetchPage(`https://www.amazon.com.br/dp/${asin}`);
  const imgMatch = html.match(/"hiRes":\s*"([^"]+)"/);
  const imageUrl = imgMatch ? imgMatch[1].replace(/\\u0026/g, '&') : null;
  const priceMatch = html.match(/a-price-whole[^>]*>([\d.]+)</);
  const scrapedPrice = priceMatch ? priceMatch[1] : null;
  return { imageUrl, scrapedPrice };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function preparePost(product, settings, index) {
  const price = product.price ? ` por ${formatMoney(product.price)}` : "";
  const brand = settings.brandName || "Achadinhos Ofertas Brasil";
  const platform = product.platform || "Amazon";
  const benefit = product.benefit || "produto util para o dia a dia";
  const call = settings.call || "Confira preco, frete e prazo antes de comprar.";

  const text = `${brand}\n\n${product.name}${price}\n${benefit}.\n\n\ud83d\udc49 Oferta no ${platform}: ${product.affiliateLink}\n\ud83d\udd14 Ative o sininho para mais ofertas todo dia!`;

  let imagePath = null;
  let amazonImageUrl = null;
  let scrapedPrice = null;

  // Try to scrape Amazon product image and price
  const asin = extractASIN(product.affiliateLink);
  if (asin) {
    const result = await scrapeAmazonPage(asin);
    amazonImageUrl = result.imageUrl;
    scrapedPrice = result.scrapedPrice;

    if (amazonImageUrl) {
      fs.mkdirSync(imgDir, { recursive: true });
      imagePath = path.join(imgDir, `${product.id}.jpg`);
      const ok = await downloadImage(amazonImageUrl, imagePath);
      if (!ok) {
        imagePath = null;
        if (fs.existsSync(imagePath)) try { fs.unlinkSync(imagePath); } catch(e) {}
      }
    }
    // Delay to avoid rate limiting
    await sleep(2500);
  }

  return { index, productId: product.id, text, imagePath, amazonImageUrl, price: product.price || scrapedPrice };
}

function activeProducts(products) {
  const priority = { Alta: 1, "Média": 2, Media: 2, Baixa: 3 };
  return products
    .filter(p => p.status !== "Pausado")
    .sort((a, b) => (priority[a.priority] || 9) - (priority[b.priority] || 9) || parseMoney(a.price) - parseMoney(b.price));
}

function readyProducts(products) {
  return activeProducts(products).filter(p => p.status !== "Postado");
}

function htmlEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function catalogHtml(products, settings) {
  const cards = activeProducts(products).map(p => {
    const image = p.image ? `<img src="${htmlEscape(p.image)}" alt="">` : `<div class="fallback">${htmlEscape((p.name || "O").slice(0, 2).toUpperCase())}</div>`;
    return `<article class="card">${image}<div class="body"><strong>${htmlEscape(p.name)}</strong><span>${formatMoney(p.price)} - ${htmlEscape(p.platform || "Shopee")} - ${htmlEscape(p.category || "")}</span><p>${htmlEscape(p.benefit || "Oferta selecionada.")}</p><a href="${htmlEscape(p.affiliateLink)}" target="_blank" rel="noreferrer">Ver oferta</a></div></article>`;
  }).join("");
  return `<!doctype html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${htmlEscape(settings.brandName || "Achadinhos Ofertas Brasil")}</title>\n  <style>\n    body{margin:0;background:#f4f6f8;color:#17202a;font-family:Arial,Helvetica,sans-serif}\n    header{padding:28px 18px;background:#111827;color:#fff}main{max-width:1100px;margin:0 auto;padding:22px 16px}\n    h1{margin:0;font-size:30px}p{line-height:1.45}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}\n    .card{background:#fff;border:1px solid #d8dee7;border-radius:8px;overflow:hidden}img,.fallback{width:100%;aspect-ratio:4/3;object-fit:cover;background:#edf2f7;display:grid;place-items:center;color:#667085;font-weight:800}\n    .body{display:grid;gap:8px;padding:13px}.body span{color:#667085}.body p{margin:0;color:#344054}\n    a{display:inline-flex;min-height:40px;align-items:center;justify-content:center;border-radius:8px;background:#ee4d2d;color:#fff;text-decoration:none;font-weight:700}\n  </style>\n</head>\n<body>\n  <header><main><h1>${htmlEscape(settings.brandName || "Achadinhos Ofertas Brasil")}</h1><p>${htmlEscape(settings.call || "Confira as ofertas selecionadas.")}</p></main></header>\n  <main><section class="grid">${cards || "<p>Nenhuma oferta ativa.</p>"}</section></main>\n</body>\n</html>`;
}

function csv(products) {
  const headers = ["plataforma", "nome", "preco", "categoria", "prioridade", "status", "link_afiliado"];
  const rows = products.map(p => [p.platform || "Shopee", p.name, p.price, p.category, p.priority, p.status, p.affiliateLink].map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","));
  return [headers.join(","), ...rows].join("\n");
}

async function main() {
  const state = readState();
  fs.mkdirSync(outDir, { recursive: true });

  const ready = readyProducts(state.products).slice(0, 5);

  // Generate posts with images
  const posts = [];
  for (let i = 0; i < ready.length; i++) {
    const post = await preparePost(ready[i], state.settings, i + 1);
    posts.push(post);
  }

  // Generate posts-hoje.json (for send-telegram)
  fs.writeFileSync(path.join(outDir, "posts-hoje.json"), JSON.stringify({ posts }, null, 2), "utf8");

  // Generate posts-hoje.txt (fallback)
  const textPosts = posts.map(p => `POST ${p.index}\n${p.text}`).join("\n\n---\n\n");
  fs.writeFileSync(path.join(outDir, "posts-hoje.txt"), textPosts || "Sem produtos prontos.", "utf8");

  // Generate other files
  fs.writeFileSync(path.join(outDir, "posts-semana.txt"), "N/A", "utf8");
  fs.writeFileSync(path.join(outDir, "vitrine.html"), catalogHtml(state.products, state.settings), "utf8");
  fs.writeFileSync(path.join(outDir, "catalogo.csv"), csv(state.products), "utf8");
  console.log(`Arquivos gerados em: ${outDir}`);
}

main().catch(e => { console.error("ERRO:", e.message); process.exit(1); });