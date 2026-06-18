const https = require('https');

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      }, timeout: 15000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', () => resolve(''));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test(asin) {
  console.log('ASIN:', asin);
  const html = await fetchPage(`https://www.amazon.com.br/dp/${asin}`);
  
  const imgMatch = html.match(/"hiRes":\s*"([^"]+)"/);
  const img2 = html.match(/data-old-hires="([^"]+)"/);
  const priceMatch = html.match(/a-price-whole[^>]*>([\d.]+)</);
  const title = html.match(/<title>([^<]+)</);
  
  console.log('  Title:', title ? title[1].substring(0, 60) : 'NOT FOUND');
  console.log('  Image:', imgMatch ? 'OK ' + imgMatch[1].substring(0, 50) : (img2 ? 'OK2 ' + img2[1].substring(0, 50) : 'NOT FOUND'));
  console.log('  Price:', priceMatch ? priceMatch[1] : 'NOT FOUND');
  await sleep(2000);
}

async function main() {
  const asins = ['B0GRBVVV9G', 'B0CCZ26B5V', 'B0F6VYPLD6', 'B0GW94QK6S', 'B07L8PWVW5'];
  for (const a of asins) await test(a);
}
main().catch(e => console.log('Error:', e));
