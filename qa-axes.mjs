import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('https://34134609.fraudshield-ai-7hk.pages.dev/insights', { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);
const axes = await p.$$eval('.recharts-wrapper', ws => ws.map(w => {
  const title = w.closest('.card')?.querySelector('h3')?.textContent ?? '?';
  const ticks = [...w.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value tspan')].map(t => t.textContent);
  return { title, ticks };
}));
for (const a of axes) console.log(a.title.padEnd(34), '|', JSON.stringify(a.ticks));
await p.screenshot({ path: 'qa/fix/dark-insights.png', fullPage: true });
await b.close();
console.log('ERR:', errs.length ? errs : 'none');
