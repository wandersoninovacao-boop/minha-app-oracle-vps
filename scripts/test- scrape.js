const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      timeout: 10000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  const html = await fetch('https://www.amazon.com.br/dp/B0GX1V2MG3');
  const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  console.log('Image:', imgMatch ? imgMatch[1] : 'not found');
  const priceMatch = html.match(/"price":\s*"([\d.]+)"/);
  console.log('Price:', priceMatch ? priceMatch[1] : 'not found (try other)');
  const priceMatch2 = html.match(/"displayPrice":\s*"([\d.,]+)"/);
  console.log('Price2:', priceMatch2 ? priceMatch2[1] : 'not found');
  // Try a-price
  const priceMatch3 = html.match(/a-price-whole[^>]*>([\d.]+)</);
  console.log('Price3:', priceMatch3 ? priceMatch3[1] : 'not found');
}
test().catch(e => console.log('Error:', e));
