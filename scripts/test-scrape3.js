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

async function test(asin) {
  console.log('Testing ASIN:', asin);
  const html = await fetchPage(`https://www.amazon.com.br/dp/${asin}`);
  
  const patterns = [
    /"hiRes":\s*"([^"]+)"/,
    /data-old-hires="([^"]+)"/,
    /"largeImage":\s*"([^"]+)"/,
    /"mainUrl":\s*"([^"]+)"/,
    /id="landingImage"[^>]+src="([^"]+)"/,
    /id="imgTagWrapperId"[^>]*>\s*<img[^>]+src="([^"]+)/,
  ];
  
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      console.log('Found with:', p.toString().substring(0, 40), '->', m[1].substring(0, 80));
      return;
    }
  }
  console.log('No image found. HTML length:', html.length);
  // check title
  const title = html.match(/<title>([^<]+)</);
  console.log('Title:', title ? title[1].substring(0, 80) : 'no title');
}

async function main() {
  await test('B0FX36BLHK'); // bandeira
  await test('B0BN6QT69V'); // cobertor
  await test('B07S1S8P3C'); // cuecas
  await test('B07Q15Q81X'); // panela
  await test('B0CCZ26B5V'); // echo dot (worked before)
}
main();
