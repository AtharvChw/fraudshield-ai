import { chromium } from '@playwright/test';

const BASE = 'https://8847d28e.fraudshield-ai-7hk.pages.dev';
const errors = [];
const failed = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure()?.errorText ?? '')));

await page.goto(BASE + '/analyze', { waitUntil: 'networkidle' });
await page.waitForFunction(() => {
  const b = document.querySelector('[data-tour="load-fraud"]');
  return b && !b.disabled;
}, null, { timeout: 30000 });
console.log('demo examples loaded: yes');

await page.click('[data-tour="load-fraud"]');
await page.waitForTimeout(500);
const amt = await page.inputValue('input[type=number] >> nth=1');
console.log('amount after load suspicious:', amt);

await page.click('[data-tour="analyze-btn"]');
try {
  await page.waitForFunction(() => /FRAUDULENT|LEGITIMATE/.test(document.body.innerText), null, { timeout: 120000 });
} catch {
  console.log('NO VERDICT after 120s');
  console.log('button state:', await page.textContent('[data-tour="analyze-btn"]'));
  const snippet = (await page.textContent('[data-tour="analyze-result"]')) ?? '';
  console.log('result panel text:', snippet.slice(0, 160).replace(/\s+/g, ' '));
}
const main = (await page.textContent('main')) ?? '';
console.log('verdict:', /FRAUDULENT/.test(main) ? 'FRAUDULENT ✓' : /LEGITIMATE/.test(main) ? 'LEGITIMATE (WRONG)' : 'NONE');
console.log('threshold context:', /× the operating threshold/.test(main) ? 'present ✓' : 'MISSING');
console.log('prob:', (/Fraud probability: ([\d.]+)%/.exec(main) || [])[0] ?? 'none');

await browser.close();
console.log('CONSOLE ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
console.log('FAILED REQUESTS:', failed.length ? failed.slice(0, 5) : 'none');
