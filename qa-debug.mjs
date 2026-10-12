import { chromium } from '@playwright/test';

const b = await chromium.launch();
const p = await b.newPage();
const reqs = [];
p.on('response', r => { if (r.url().includes('demo_transactions')) reqs.push(r.status() + ' ' + r.url()); });
p.on('console', m => { if (m.type() === 'error') console.log('CERR:', m.text()); });
p.on('pageerror', e => console.log('PERR:', e.message));
await p.goto('https://6628aa26.fraudshield-ai-7hk.pages.dev/analyze', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
const st = await p.evaluate(() => ({
  loadFraudDisabled: document.querySelector('[data-tour="load-fraud"]')?.disabled,
  hasAnalyzeBtn: !!document.querySelector('[data-tour="analyze-btn"]'),
  hasGuidedAttr: !!document.querySelector('[data-tour="load-fraud"]'),
}));
console.log('state:', JSON.stringify(st));
console.log('demo reqs:', reqs.length ? reqs : 'NONE');
await b.close();
