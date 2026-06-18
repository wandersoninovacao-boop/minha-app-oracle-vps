const puppeteer = require('puppeteer-core');

async function main() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        defaultViewport: null,
        userDataDir: 'C:\\Users\\wande\\AppData\\Local\\Google\\Chrome\\User Data',
        args: ['--start-maximized']
    });
    const page = await browser.newPage();

    await page.goto('https://ui.awin.com/merchant-profile/17729', {
        waitUntil: 'networkidle0', timeout: 30000
    });
    await new Promise(r => setTimeout(r, 3000));

    console.log('URL:', page.url());
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Texto da pagina:');
    console.log(text.substring(0, 1500));

    // Try to find join button
    const btns = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a, button')).map(el => ({
            text: el.innerText.trim().substring(0, 50),
            href: el.href || '',
            id: el.id,
            class: el.className.substring(0, 40)
        })).filter(el => el.text.toLowerCase().includes('join') || el.href.toLowerCase().includes('join'));
    });
    console.log('Botoes Join:', JSON.stringify(btns, null, 2));

    await new Promise(r => setTimeout(r, 120000));
    await browser.close();
}

main().catch(e => console.error('Error:', e.message));