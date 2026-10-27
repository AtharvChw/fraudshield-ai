import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE = 'https://597c7de5.fraudshield-ai-7hk.pages.dev';
mkdirSync('qa/fix', { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const routes = [['/', 'home'], ['/analyze', 'analyze'], ['/batch', 'batch'], ['/insights', 'insights'], ['/about', 'about']];

// ---- light pass ----
for (const [r, n] of routes) {
  await page.goto(BASE + r, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('fs-theme', 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `qa/fix/light-${n}.png`, fullPage: true });
}

// ---- dark pass + chart fill audit ----
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('fs-theme', 'dark'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const barFills = await page.$$eval('.recharts-bar-rectangle path, .recharts-bar-rectangle rect',
  els => els.map(e => getComputedStyle(e).fill));
console.log('DARK overview bar fills:', JSON.stringify([...new Set(barFills)]));
console.log('black bars present:', barFills.some(f => /rgb\(0,\s*0,\s*0\)|#000/.test(f)) ? 'YES (BAD)' : 'no');
await page.screenshot({ path: 'qa/fix/dark-home.png', fullPage: true });

for (const [r, n] of routes.slice(1)) {
  await page.goto(BASE + r, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `qa/fix/dark-${n}.png`, fullPage: true });
}

// ---- mobile: horizontal overflow + nav visible ----
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('fs-theme', 'light'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const mob = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  lastTabVisible: (() => {
    const links = [...document.querySelectorAll('nav a')];
    const about = links.find(a => a.textContent?.trim() === 'About');
    if (!about) return 'no-about-link';
    const r = about.getBoundingClientRect();
    return r.right <= window.innerWidth + 1 && r.width > 0 ? 'yes' : `no (right=${Math.round(r.right)})`;
  })(),
  kpiCards: document.querySelectorAll('[data-tour="kpis"] > div').length,
}));
console.log('MOBILE overflow:', mob.scrollWidth > mob.innerWidth + 1 ? `YES (${mob.scrollWidth} > ${mob.innerWidth}) BAD` : 'none');
console.log('MOBILE About tab reachable:', mob.lastTabVisible);
console.log('MOBILE kpi cards:', mob.kpiCards);
await page.screenshot({ path: 'qa/fix/mobile-home.png', fullPage: true });

await browser.close();
console.log('ERRORS:', errors.length ? errors : 'none');
