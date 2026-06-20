// Tenta confirmar produtos reais do AliExpress e seus precos
// usando o que da para extrair via pagina estatica + Google cache

const targetUrls = {
  "aliexpress-1 (QCY T13 ANC)": "https://pt.aliexpress.com/item/1005006043761615.html",
  "Lenovo GM2 Pro (real)": "https://pt.aliexpress.com/item/1005004847794096.html"
};

async function checkProduct(name, url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(15000)
    });
    const html = await res.text();
    console.log(name + ":");
    console.log("  Status:", res.status);
    console.log("  Size:", html.length, "bytes");

    // Check for JSON-LD structured data
    const ldRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let found = false;
    let m;
    while ((m = ldRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(m[1]);
        if (data.name && data["@type"] === "Product") {
          console.log("  JSON-LD Product found!");
          console.log("  Name:", data.name);
          console.log("  Price:", data.offers?.price || data.offers?.lowPrice || "N/A");
          console.log("  Currency:", data.offers?.priceCurrency || "N/A");
          found = true;
        }
      } catch(e) {}
    }

    // Check for typical AliExpress patterns
    const patterns = [
      { key: "preco", regex: /"price"\s*:\s*["']?([\d.]+)["']?/ },
      { key: "productId", regex: /"productId"\s*:\s*["']?(\d+)["']?/ },
      { key: "prodName", regex: /"productName"\s*:\s*["']([^"']+)["']/ },
    ];

    for (const p of patterns) {
      const match = html.match(p.regex);
      if (match) console.log("  " + p.key + ":", match[1].substring(0, 80));
    }

    // Check meta
    const ogTitle = html.match(/og:title[^>]*content="([^"]+)"/);
    if (ogTitle) console.log("  og:title:", ogTitle[1].substring(0, 80));
    const ogDesc = html.match(/og:description[^>]*content="([^"]+)"/);
    if (ogDesc) console.log("  og:desc:", ogDesc[1].substring(0, 80));

    if (!found) console.log("  -> Produto parece existir (HTTP 200) mas dados sao carregados via JS.");
    console.log("");
  } catch(e) {
    console.log(name + ": ERRO -", e.message.substring(0, 60));
  }
}

(async () => {
  for (const [name, url] of Object.entries(targetUrls)) {
    await checkProduct(name, url);
  }

  // Also check our placeholder IDs to confirm they don't work
  const placholders = [
    ["aliexpress-2 placeholder", "https://pt.aliexpress.com/item/1005006001234567.html"],
    ["aliexpress-4 placeholder", "https://pt.aliexpress.com/item/1005004001234567.html"],
  ];
  for (const [name, url] of placholders) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(15000)
    });
    const html = await res.text();
    const ogTitle = html.match(/og:title[^>]*content="([^"]+)"/);
    console.log(name + ": HTTP", res.status, "| og:title:", ogTitle?.[1]?.substring(0, 80) || "(none)");
  }
})();
