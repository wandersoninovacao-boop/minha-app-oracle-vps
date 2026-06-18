const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      timeout: 15000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  const html = await fetch('https://www.amazon.com.br/dp/B0GX1V2MG3');

  // Try multiple image patterns
  const patterns = [
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    /"largeImage":\s*"([^"]+)"/,
    /"hiRes":\s*"([^"]+)"/,
    /id="imgTagWrapperId"[^>]*>\s*<img[^>]+src="([^"]+)"/,
    /"mainUrl":\s*"([^"]+)"/,
    /data-old-hires="([^"]+)"/,
    /"imageURL":\s*"([^"]+)"/,
    /https:\/\/m\.media-amazon\.com\/images\/I\/[^"\\]+/g
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      console.log('Pattern:', p.toString().substring(0, 50), '->', m[1] || m[0]);
      if (p.global) break;
    }
  }

  // Check if there are any media-amazon images
  const allImgs = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[^"\\'"]+/g);
  if (allImgs) {
    console.log('All media-amazon images:', allImgs.slice(0, 3));
  }

  // Check price patterns
  const pricePatterns = [
    /a-price-whole[^>]*>([\d.]+)</,
    /"price":\s*"([^"]+)"/,
    /"displayPrice":\s*"([^"]+)"/,
    /"priceAmount":\s*([\d.]+)/,
    /R\$\s*([\d.,]+)/
  ];
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) {
      console.log('Price pattern found:', m[1]);
      break;
    }
  }

  // Check title
  const titleMatch = html.match(/<title>([^<]+)</);
  if (titleMatch) console.log('Title:', titleMatch[1].substring(0, 100));
}

test().catch(e => console.log('Error:', e));
