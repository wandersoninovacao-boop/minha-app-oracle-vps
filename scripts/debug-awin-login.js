const puppeteer = require('puppeteer-core');
const path = require('path');

async function main() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();

    // Go to Awin login
    await page.goto('https://ui.awin.com/', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'out/awin-01-email.png' });
    console.log('Step 1: Pagina de email - OK');

    // Enter email
    await page.type('input[id="email"]', 'wanderson.inovacao@gmail.com', { delay: 20 });
    await new Promise(r => setTimeout(r, 500));
    await page.click('button[id="login"]');
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'out/awin-02-password.png' });
    console.log('Step 2: Pagina de senha - OK');

    // Enter password
    const pwInput = await page.$('input[type="password"]');
    if (pwInput) {
        await pwInput.type('Wmnnw-86.', { delay: 20 });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: 'out/awin-03-pw-filled.png' });

        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
            await submitBtn.click();
        } else {
            await page.keyboard.press('Enter');
        }
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: 'out/awin-04-after-login.png' });
        console.log('Step 3: Apos tentativa de login');
        console.log('URL final:', page.url());

        // Check for error
        const text = await page.evaluate(() => document.body.innerText);
        console.log('Texto da pagina:', text.substring(0, 2000));
    }

    await new Promise(r => setTimeout(r, 10000));
    await browser.close();
    console.log('Screenshots salvos em out/awin-*.png');
}

main().catch(e => console.error('Error:', e.message));