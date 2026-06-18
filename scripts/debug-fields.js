const puppeteer = require('puppeteer-core');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fillNative(page, id, value) {
    await page.evaluate(({ id, value }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const setter = Object.getOwnPropertyDescriptor(
            el.constructor.prototype, 'value'
        )?.set;
        if (setter) {
            setter.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            el.value = value;
        }
    }, { id, value });
}

async function main() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        defaultViewport: null
    });
    const page = (await browser.pages())[0];

    // Login
    await page.goto('https://ui.awin.com/', { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.type('input[id="email"]', 'wanderson.inovacao@gmail.com', { delay: 10 });
    await sleep(300);
    await page.click('button[id="login"]');
    await sleep(4000);
    await page.type('input[type="password"]', 'Wmnnw-18051986.', { delay: 10 });
    await sleep(300);
    await page.click('button[type="submit"]');
    await sleep(5000);

    // Go to signup - the select needs option label 'Brazil'
    await page.goto('https://ui.awin.com/publisher-signup/br/awin/step1', { waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(3000);

    // Fill company name
    await fillNative(page, 'companyName', 'Wanderson Carlos Jacinto');

    // Select Brazil - the option text is 'Brazil', need to find its value
    const selValue = await page.evaluate(() => {
        const sel = document.getElementById('taxResidency');
        for (const opt of sel.options) {
            if (opt.text === 'Brazil') return opt.value;
        }
        return null;
    });
    console.log('Brazil option value:', selValue);
    if (selValue) {
        await page.select('#taxResidency', selValue);
    }

    await sleep(2000);

    // Now check what fields are visible/interactive after selecting Brazil
    const interactable = await page.evaluate(() => {
        const all = document.querySelectorAll('input, select, textarea, button');
        return Array.from(all).map(el => ({
            id: el.id,
            type: el.type || el.tagName,
            disabled: el.disabled,
            hidden: el.hidden,
            rect: el.getBoundingClientRect(),
            style: el.style.cssText?.substring(0, 100),
            value: el.value,
            checked: el.checked
        })).filter(el => !el.hidden && el.rect.width > 0 && el.rect.height > 0);
    });
    console.log('INTERACTABLE FIELDS AFTER SELECTING BRAZIL:');
    interactable.forEach(f => console.log(JSON.stringify(f)));

    await page.screenshot({ path: 'out/awin-after-brazil.png' });

    await sleep(60000);
    await browser.close();
}

main().catch(e => console.error('ERRO:', e.message));