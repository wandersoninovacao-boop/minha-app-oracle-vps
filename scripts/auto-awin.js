const puppeteer = require('puppeteer-core');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    console.log('Lancando Chrome...');
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    const page = await browser.newPage();

    // Step 1: Login page - enter email
    console.log('Abrindo Awin...');
    await page.goto('https://ui.awin.com/', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(3000);

    const emailInput = await page.$('input[id="email"]');
    if (emailInput) {
        console.log('Preenchendo email...');
        await emailInput.type('wanderson.inovacao@gmail.com', { delay: 20 });
        await sleep(500);
        const continueBtn = await page.$('button[id="login"]');
        if (continueBtn) {
            console.log('Clicando Continuar...');
            await continueBtn.click();
            await sleep(5000);
        }
    }

    // Step 2: Password page
    console.log('URL pos-email:', page.url());
    const pwInput = await page.$('input[type="password"]');
    if (pwInput) {
        console.log('Digitando senha...');
        await pwInput.type('Wmnnw-86.', { delay: 20 });
        await sleep(1000);

        // Click submit
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
            console.log('Clicando Login...');
            await submitBtn.click();
        } else {
            await page.keyboard.press('Enter');
        }
        await sleep(5000);
    }

    console.log('Pos-login URL:', page.url());

    // Step 3: Navigate to Join Programmes
    console.log('Navegando para Join Programmes...');
    await page.goto('https://ui.awin.com/awin/join-programmes', {
        waitUntil: 'networkidle0', timeout: 30000
    }).catch(e => console.log('Erro navegacao:', e.message));
    await sleep(3000);
    console.log('Join programmes URL:', page.url());

    // Step 4: Search for KaBuM
    try {
        const searchInput = await page.$('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
        if (searchInput) {
            console.log('Buscando KaBuM...');
            await searchInput.type('KaBuM', { delay: 20 });
            await sleep(2000);
        } else {
            console.log('Campo de busca nao encontrado');
        }
    } catch (e) {
        console.log('Erro busca:', e.message);
    }

    console.log('Browser aberto - finalize manualmente se necessario.');
}

main().catch(e => console.error('Erro:', e.message));