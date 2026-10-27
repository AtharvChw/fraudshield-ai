import { chromium } from '@playwright/test';

const BASE = 'https://b55c28c2.fraudshield-ai-7hk.pages.dev';
const browser = await chromium.launch();

for (let i = 1; i <= 3; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  const net = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 160)); });
  page.on('response', r => {
    const u = r.url();
    if (u.includes('jsdelivr') || u.endsWith('.wasm') || u.endsWith('.onnx') || u.includes('/models/')) {
      net.push(`${r.status()} ${(u.split('/').pop() || '').slice(0, 40)}`);
    }
  });
  page.on('requestfailed', r => {
    const u = r.url();
    if (u.includes('jsdelivr') || u.endsWith('.wasm')) net.push(`FAILED ${(u.split('/').pop() || '').slice(0, 40)} :: ${r.failure()?.errorText}`);
  });

  const t0 = Date.now();
  await page.goto(BASE + '/analyze', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /suspicious/i }).click();
  await page.getByRole('button', { name: /^analyze$/i }).click();

  let verdict = 'TIMEOUT';
  try {
    await page.waitForFunction(() => /FRAUDULENT|LEGITIMATE/.test(document.body.innerText), null, { timeout: 45000 });
    verdict = ((await page.textContent('main')) ?? '').includes('FRAUDULENT') ? 'FRAUDULENT' : 'LEGITIMATE';
  } catch {}
  console.log(`--- run ${i}: ${verdict} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log('    net:', JSON.stringify(net));
  console.log('    errors:', errors.length ? JSON.stringify(errors.slice(0, 3)) : 'none');
  await ctx.close();
}

await browser.close();
