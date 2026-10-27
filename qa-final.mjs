import { chromium } from '@playwright/test';

const BASE = 'https://8847d28e.fraudshield-ai-7hk.pages.dev';
const errors = [];
const browser = await chromium.launch();

// ---- 1. cold-start inference timing (fresh profile = no CDN/wasm cache) ----
for (let i = 1; i <= 2; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const t0 = Date.now();
  await page.goto(BASE + '/analyze', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-tour="load-fraud"]');
    return b && !b.disabled;
  }, null, { timeout: 30000 });
  const tReady = Date.now();
  await page.click('[data-tour="load-fraud"]');
  await page.click('[data-tour="analyze-btn"]');
  await page.waitForFunction(() => /FRAUDULENT|LEGITIMATE/.test(document.body.innerText), null, { timeout: 120000 });
  const tVerdict = Date.now();
  console.log(`run ${i}: page+examples ${((tReady - t0) / 1000).toFixed(1)}s · inference ${((tVerdict - tReady) / 1000).toFixed(1)}s · total ${((tVerdict - t0) / 1000).toFixed(1)}s`);
  await ctx.close();
}

// ---- 2. batch percentage formatting ----
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page2 = await ctx2.newPage();
page2.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page2.goto(BASE + '/batch', { waitUntil: 'networkidle' });
await page2.locator('input[type=file]').setInputFiles('public/data/demo_transactions.csv');
await page2.waitForFunction(() => /Highest-risk txn/.test(document.body.innerText), null, { timeout: 120000 });
const cells = await page2.$$eval('tbody tr td:first-child', tds => tds.slice(0, 3).map(td => td.textContent?.trim()));
console.log('batch prob cells:', JSON.stringify(cells), cells.every(v => v?.endsWith('%')) ? 'all % ✓' : 'NOT all %');

// ---- 3. insights axis ticks ----
await page2.goto(BASE + '/insights', { waitUntil: 'networkidle' });
await page2.waitForTimeout(1500);
const ticks = await page2.$$eval('.recharts-xAxis .recharts-cartesian-axis-tick-value tspan', ts => ts.map(t => t.textContent ?? ''));
const long = ticks.filter(t => t.length > 6);
console.log('insights ticks sample:', JSON.stringify(ticks.slice(0, 5)));
console.log('overlong float ticks:', long.length ? long : 'none ✓');

await ctx2.close();
await browser.close();
console.log('ERRORS:', errors.length ? errors.slice(0, 4) : 'none');
