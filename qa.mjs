import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE = 'https://fraudshield-ai-7hk.pages.dev';
const errors = [];
const failed = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure()?.errorText ?? '')));
mkdirSync('qa', { recursive: true });

// 1. all routes render
for (const [route, h1] of [['/', 'FraudShield AI'], ['/analyze', 'Analyze Transaction'], ['/batch', 'Batch Scan CSV'], ['/insights', 'Model Insights'], ['/about', 'About']]) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  const text = await page.textContent('h1');
  console.log(`route ${route} -> h1="${(text ?? '').trim()}" ${String(text).includes(h1) ? 'OK' : 'MISMATCH'}`);
  await page.screenshot({ path: `qa/route-${route === '/' ? 'home' : route.slice(1)}.png` });
}

// 2. mobile width + dark mode
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'qa/mobile-home.png' });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.setItem('fs-theme', 'dark'); });
await page.reload({ waitUntil: 'networkidle' });
await page.screenshot({ path: 'qa/dark-home.png' });
await page.evaluate(() => { localStorage.setItem('fs-theme', 'light'); });

// 3. real inference: suspicious example -> Analyze
await page.goto(BASE + '/analyze', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /suspicious/i }).click();
await page.getByRole('button', { name: /^analyze$/i }).click();
await page.waitForFunction(() => /FRAUDULENT|LEGITIMATE/.test(document.body.innerText), null, { timeout: 90000 });
const verdict = await page.textContent('main');
console.log('analyze verdict present:', /FRAUDULENT/.test(verdict ?? '') ? 'FRAUDULENT (correct: suspicious example)' : /LEGITIMATE/.test(verdict ?? '') ? 'LEGITIMATE (WRONG for fraud demo)' : 'NONE');
await page.screenshot({ path: 'qa/analyze-result.png' });

// 4. batch: upload real demo csv
await page.goto(BASE + '/batch', { waitUntil: 'networkidle' });
await page.locator('input[type=file]').setInputFiles('public/data/demo_transactions.csv');
await page.waitForFunction(() => /Flagged/.test(document.body.innerText), null, { timeout: 120000 });
const summary = await page.textContent('main');
console.log('batch summary:', (summary ?? '').match(/Total rows\d+|Flagged fraud\d+ \([\d.]+%\)|Avg fraud prob[\d.]+%|Highest-risk txn[\d.]+%/)?.join(' | ') ?? 'NOT-FOUND');
await page.screenshot({ path: 'qa/batch-result.png' });

await browser.close();
console.log('CONSOLE+PAGE ERRORS:', errors.length ? errors : 'none');
console.log('FAILED REQUESTS:', failed.length ? failed : 'none');
