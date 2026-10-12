import { chromium } from '@playwright/test';

const BASE = 'https://32e188bd.fraudshield-ai-7hk.pages.dev';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /guided demo/i }).click();
await page.waitForFunction(() => /GUIDED DEMO/.test(document.body.innerText), null, { timeout: 15000 });
console.log('tour started OK');
// let autoplay run through analyze + batch actions (~30s), screenshot mid-tour
await page.waitForTimeout(26000);
await page.screenshot({ path: 'qa/tour-mid.png' });
const body = await page.textContent('body');
console.log('mid-tour sees batch results:', /Highest-risk txn/.test(body ?? '') ? 'YES' : 'no');
console.log('mid-tour sees fraud verdict:', /FRAUDULENT/.test(body ?? '') ? 'YES' : 'no');
// wait for tour end (6 steps x 6s + actions ≈ 45s total)
await page.waitForFunction(() => /Tour complete/.test(document.body.innerText), null, { timeout: 90000 });
console.log('tour reached final step OK');
await page.getByRole('button', { name: /^finish$/i }).click();
await page.waitForTimeout(1000);
console.log('tour closed:', !(await page.textContent('body')).includes('GUIDED DEMO') ? 'YES' : 'no');
await browser.close();
console.log('TOUR ERRORS:', errors.length ? errors : 'none');
