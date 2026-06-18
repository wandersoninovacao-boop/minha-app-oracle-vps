const puppeteer = require('puppeteer-core');
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        defaultViewport: null
    });
    const page = (await browser.pages())[0];

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    await page.goto('https://ui.awin.com/', { waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(2000);
    await page.evaluate(() => {
        const el = document.getElementById('email');
        if (el) { el.value = 'wanderson.inovacao@gmail.com'; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await sleep(200);
    await page.click('button[id="login"]');
    await sleep(4000);
    await page.evaluate(() => {
        const el = document.querySelector('input[type="password"]');
        if (el) { el.value = 'Wmnnw-18051986.'; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await sleep(200);
    await page.click('button[type="submit"]');
    await sleep(5000);

    await page.goto('https://ui.awin.com/publisher-signup/br/awin/step1', { waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(3000);

    await page.evaluate(() => {
        const n = document.getElementById('companyName');
        if (n) { n.value = 'Wanderson Carlos Jacinto'; n.dispatchEvent(new Event('input', { bubbles: true })); }
        const t = document.getElementById('taxResidency');
        if (t) { t.value = 'BR'; t.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await sleep(1000);
    await page.evaluate(() => {
        const s = document.querySelector('select');
        if (s) {
            for (let i = 0; i < s.options.length; i++) {
                if (s.options[i].text.includes('Sole')) {
                    s.selectedIndex = i;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }
    });
    await sleep(2000);
    await page.evaluate(() => {
        const c = document.getElementById('taxNumber');
        if (c) { c.value = '330.426.818-90'; c.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await sleep(300);
    const v = await page.$('#btnVerify');
    if (v) { const d = await page.evaluate(el => el.disabled, v); if (!d) await v.click(); }

    console.log('Resolva o reCAPTCHA e clique Next Step manualmente.');
    console.log('Aguardando...');

    for (let i = 0; i < 300; i++) {
        await sleep(1000);
        try { if (!page.url().includes('step1')) { console.log('Step 1 done, URL:', page.url()); break; } } catch(e) {}
    }

    // Step 2 - debug fields
    if (page.url().includes('step2')) {
        const html = await page.evaluate(() => {
            const labels = document.querySelectorAll('label');
            const inputs = document.querySelectorAll('input, select, textarea');
            const errs = document.querySelectorAll('[class*="error"], [class*="invalid"], [class*="help"]');
            return {
                labels: Array.from(labels).map(l => ({ for: l.htmlFor, text: l.innerText.substring(0, 80) })),
                inputs: Array.from(inputs).map(i => ({
                    id: i.id, type: i.type || 'select', name: i.name, placeholder: i.placeholder,
                    disabled: i.disabled, value: i.value?.substring(0, 30)
                })),
                errors: Array.from(errs).map(e => ({ id: e.id, text: (e.innerText || e.textContent || '').substring(0, 100) }))
            };
        });
        console.log('Step 2 labels:', JSON.stringify(html.labels));
        console.log('Step 2 inputs:', JSON.stringify(html.inputs));
        console.log('Step 2 errors:', JSON.stringify(html.errors));
        await page.screenshot({ path: 'out/step2-debug.png' });
    }

    console.log('URL final:', page.url());
    await sleep(120000);
    await browser.close();
}

main().catch(e => console.error('ERRO:', e.message));