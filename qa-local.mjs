import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173';
const b = await chromium.launch();
for (let i = 1; i <= 2; i++) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const net = []; const errs = [];
  p.on('response', r => { const u = r.url(); if (/jsdelivr|\.wasm|\.onnx|\.mjs/.test(u)) net.push(r.status() + ' ' + u.replace(BASE, '').split('/').pop()); });
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)); });
  const t0 = Date.now();
  await p.goto(BASE + '/analyze', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /suspicious/i }).click();
  await p.getByRole('button', { name: /^analyze$/i }).click();
  let verdict = 'TIMEOUT';
  try {
    await p.waitForFunction(() => /FRAUDULENT|LEGITIMATE/.test(document.body.innerText), null, { timeout: 60000 });
    const m = (await p.textContent('main')) ?? '';
    verdict = /FRAUDULENT/.test(m) ? 'FRAUDULENT' : 'LEGITIMATE';
  } catch {}
  console.log(`local run ${i}: ${verdict} in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  console.log('  net:', JSON.stringify(net));
  console.log('  errs:', errs.length ? JSON.stringify(errs.slice(0,3)) : 'none');
  await ctx.close();
}
await b.close();
