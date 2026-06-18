const puppeteer = require('puppeteer-core');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    const page = await browser.newPage();

    await page.goto('https://ui.awin.com/', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(3000);

    await page.type('input[id="email"]', 'wanderson.inovacao@gmail.com', { delay: 20 });
    await sleep(500);
    await page.click('button[id="login"]');
    await sleep(5000);

    await page.type('input[type="password"]', 'Wmnnw-86.', { delay: 20 });
    await sleep(500);

    // Check page content
    const text = await page.evaluate(() => document.body.innerText);
    console.log('=== PAGE TEXT ===');
    console.log(text.substring(0, 2000));

    await page.keyboard.press('Enter');
    await sleep(3000);

    console.log('=== AFTER SUBMIT URL ===');
    console.log(page.url());

    const text2 = await page.evaluate(() => document.body.innerText);
    console.log('=== AFTER SUBMIT TEXT ===');
    console.log(text2.substring(0, 2000));

    await sleep(60000);
    await browser.close();
}

main().catch(e => console.error('Error:', e.message));