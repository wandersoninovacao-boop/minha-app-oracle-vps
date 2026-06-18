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
    const page = (await browser.pages())[0];

    // Login
    await page.goto('https://ui.awin.com/', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);
    await page.type('input[id="email"]', 'wanderson.inovacao@gmail.com', { delay: 20 });
    await sleep(300);
    await page.click('button[id="login"]');
    await sleep(4000);
    await page.type('input[type="password"]', 'Wmnnw-18051986.', { delay: 20 });
    await sleep(300);
    const sb = await page.$('button[type="submit"]');
    if (sb) await sb.click();
    else await page.keyboard.press('Enter');
    await sleep(5000);

    // Go to signup
    await page.goto('https://ui.awin.com/publisher-signup/br/awin/step1', { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await sleep(3000);

    // Fill form
    await page.type('#companyName', 'Wanderson Carlos Jacinto', { delay: 15 });
    await page.select('#taxResidency', 'BR');
    await page.type('#firstName', 'Wanderson', { delay: 15 });
    await page.type('#lastName', 'Jacinto', { delay: 15 });

    // Email - just type, no clear
    await page.type('#email', 'wanderson.inovacao@gmail.com', { delay: 15 });
    await page.type('#emailConfirmation', 'wanderson.inovacao@gmail.com', { delay: 15 });

    await sleep(500);

    // Click Next
    await page.click('#next');
    await sleep(3000);

    // Check for errors
    const errors = await page.evaluate(() => {
        const errs = document.querySelectorAll('.error, .error-message, [class*="error"], [class*="invalid"], .field-error');
        return Array.from(errs).map(e => e.innerText || e.textContent);
    });
    console.log('Errors:', JSON.stringify(errors));

    const url2 = page.url();
    console.log('URL after Next:', url2);

    // Also check any validation messages
    const validation = await page.evaluate(() => {
        const spans = document.querySelectorAll('span[class*="error"], div[class*="error"], p[class*="error"]');
        return Array.from(spans).map(s => s.innerText);
    });
    console.log('Validation msgs:', JSON.stringify(validation));

    await page.screenshot({ path: 'out/awin-step1-after.png' });

    await sleep(60000);
    await browser.close();
}

main().catch(e => console.error('ERRO:', e.message));