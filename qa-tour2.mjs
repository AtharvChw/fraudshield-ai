import { chromium } from '@playwright/test';

const BASE = 'https://fraudshield-ai-7hk.pages.dev';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /guided demo/i }).click();
await page.waitForFunction(() => /GUIDED DEMO/.test(document.body.innerText), null, { timeout: 15000 });
// tour auto-runs analyze at step 3 and batch at step 4 — wait for their real outputs
await page.waitForFunction(() => /FRAUDULENT/.test(document.body.innerText), null, { timeout: 60000 });
console.log('tour auto-analyze produced FRAUDULENT: YES');
await page.waitForFunction(() => /Highest-risk txn/.test(document.body.innerText), null, { timeout: 120000 });
console.log('tour auto-batch produced summary: YES');
await page.waitForFunction(() => /Tour complete/.test(document.body.innerText), null, { timeout: 60000 });
console.log('tour finished: YES');
await browser.close();
console.log('ERRORS:', errors.length ? errors : 'none');
