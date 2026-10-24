// Top bar + chip rack check at 360 / 412 / 432 CSS px (portrait 9:16, 1080 px wide output). Writes celeb/v2/widths_<w>.png
// and prints overlap/truncation metrics for the HUD row and the chip rack.
import { chromium } from 'playwright-core';
const OUT = new URL('../celeb/v2/', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome' });
for (const w of [360, 412, 432]) {
  const ctx = await b.newContext({ viewport: { width: w, height: Math.round(w * 16 / 9) }, deviceScaleFactor: 1080 / w, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto('https://marcus-casino-blackjack.grok.me/?nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.click('[aria-label="Vegas Strip 6D S17 3:2"]'); await p.waitForTimeout(2500);
  const m = await p.evaluate(() => {
    const vw = innerWidth; const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
    const trunc = [...document.querySelectorAll('.hud *, header *, [class*=hud] *')].filter(e => e.children.length === 0 && e.offsetParent && (e.scrollWidth > e.clientWidth + 1) && getComputedStyle(e).overflow !== 'visible').map(e => e.className + ':' + e.innerText);
    const ell = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0 && /…/.test(e.innerText || '')).map(e => e.innerText).slice(0, 5);
    const chips = [...document.querySelectorAll('[aria-label$="play money"]')].filter(e => e.offsetParent).map(box);
    const off = chips.filter(c => c.l < 0 || c.r > vw).length;
    let ov = 0; for (let i = 1; i < chips.length; i++) if (chips[i].l < chips[i - 1].r - 1) ov++;
    const menu = document.querySelector('[aria-label="Menu"]'); const title = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /Vegas Strip/.test(e.innerText || '') && e.offsetParent);
    const tb = title && box(title), mb = menu && box(menu);
    return { vw, chips: chips.length, chipsOffscreen: off, chipsOverlapping: ov, titleMenuGap: tb && mb ? Math.round(mb.l - tb.r) : null, truncated: trunc, ellipsis: ell, hud: document.querySelector('.hud-money')?.innerText.replace(/\n/g, ' | ') };
  });
  console.log(w, JSON.stringify(m));
  await p.screenshot({ path: `${OUT}widths_${w}.png` }); await ctx.close();
}
await b.close();
