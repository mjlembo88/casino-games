// node capture.mjs  -> raw/cand/*.png + raw/cand/log.json  (live site, phone portrait 432x768 CSS @2.5x = 1080x1920)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const URL = 'https://marcus-casino-blackjack.grok.me';
const out = new globalThis.URL('../raw/cand/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const log = [];
const b = await chromium.launch({ channel: 'chrome' });
let ctx, p; const mkctx = async () => { if (ctx) await ctx.close(); ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
p = await ctx.newPage(); };
const st = () => p.evaluate(() => {
  const cards = [...document.querySelectorAll('.pcard')].map(c => { const r = c.getBoundingClientRect(); return { r: (c.querySelector('.idx')?.innerText || '?').split('\n')[0], y: Math.round(r.y), up: c.classList.contains('up') }; });
  const vis = s => { const e = document.querySelector(s); return !!(e && e.offsetParent); };
  return { cards, cap: document.querySelector('.caption')?.innerText || '', toast: document.querySelector('.toast')?.innerText || '', grade: (document.querySelector('.grade-card:not([hidden])')?.innerText) || '', pills: [...document.querySelectorAll('.dock .pill')].filter(e=>e.offsetParent).map(e=>e.innerText.split('\n')[0].trim()), stand: [...document.querySelectorAll('.dock .pill')].some(e=>e.offsetParent&&e.innerText.startsWith('Stand')), hit: vis('.role-hit'), deal: vis('[aria-label="Deal"]'), busy: document.querySelector('.casino-root').classList.contains('busy'), hud: document.querySelector('.hud-money')?.innerText.replace(/\n/g, ' ') };
});
const val = r => r === 'A' ? 11 : ['K', 'Q', 'J', '10'].includes(r) ? 10 : +r;
function total(rs) { let t = 0, a = 0; for (const r of rs) { t += val(r); if (r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return { t, soft: a > 0 }; }
function split(s) { const ys = [...new Set(s.cards.map(c => c.y))].sort((a, b) => a - b); const dy = ys[0]; return { dealer: s.cards.filter(c => c.y === dy), player: s.cards.filter(c => c.y !== dy) }; }
let n = 0;
async function shot(tag) { const s = await st(); const f = `${String(n++).padStart(3, '0')}_${tag}.png`; await p.screenshot({ path: out + f }); log.push({ f, ...s }); console.log(f, JSON.stringify({ cards: s.cards.map(c => c.r + (c.up ? '' : '*') + '@' + c.y).join(' '), cap: s.cap, toast: s.toast, grade: s.grade, hud: s.hud })); return s; }
async function waitFor(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { const s = await st(); if (fn(s)) return s; await p.waitForTimeout(100); } return null; }

const mode = process.argv[2] || 'table';
const rounds = +(process.argv[3] || 6); const R0 = +(process.argv[4] || 0);
for (let r = R0; r < R0 + rounds; r++) {
  await mkctx();
await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
if (mode === 'coach') { await p.click('[aria-label="Strategy Coach"]'); await p.waitForTimeout(800); await p.click('[aria-label="Vegas Strip 6D S17 3:2 with coach"]'); }
else await p.click('[aria-label="Vegas Strip 6D S17 3:2"]');
await p.waitForTimeout(2200);
  await waitFor(s => s.deal && !s.busy && !s.stand); 
  if (true) {
    for (const [chip, taps] of [['100 chip, 100 play money', 1], ['25 chip, 25 play money', 2]]) { await p.click(`[aria-label="${chip}"]`); for (let i = 0; i < taps; i++) { await p.click('[aria-label="BET bet"]'); await p.waitForTimeout(450); } }
  } else { await p.click('[aria-label="Rebet"]').catch(() => {}); }
  await p.waitForTimeout(900);
  await shot(`r${r}_bet`);
  await p.click('[aria-label="Deal"]');
  const t0 = Date.now();
  for (const ms of [2900, 3300, 3700, 4100]) { await p.waitForTimeout(ms - (Date.now() - t0)); await shot(`r${r}_deal${ms}`); }
  let decided = false, hits = 0;
  for (let step = 0; step < 40; step++) {
    const s = await waitFor(x => !x.busy && x.cards.length >= 3 && (x.stand || x.pills.includes('No') || x.deal), 15000);
    if (!s) { console.log('timeout'); break; }
    if (s.pills.includes('No') && !s.stand) { await shot(`r${r}_insurance`); await p.click('.dock .pill:has-text("No")'); await p.waitForTimeout(600); continue; }
    if (s.deal && !s.stand) { break; }
    let { player, dealer } = split(s); const pt = total(player.map(c => c.r));
    await shot(hits ? `r${r}_afterhit${hits}` : `r${r}_decision`);
    console.log('player', pt, 'dealer up', dealer.find(c => c.up)?.r, s.pills);
    if (pt.t <= 11 || (pt.t <= 12 && hits === 0 && r % 2 === 1)) { await p.evaluate(()=>document.querySelector('.role-hit').click()); hits++; await p.waitForTimeout(1600); continue; }
    await p.evaluate(()=>document.querySelector('.role-stand').click()); break;
  }
  for (let i = 0; i < 30; i++) { await p.waitForTimeout(400); const s = await shot(`r${r}_stand${i}`); if (s.deal && !s.busy && !s.stand && i > 6) break; }
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(500); await shot(`r${r}_after${i}`); }
}
fs.writeFileSync(out + `log_${mode}_${R0}.json`, JSON.stringify(log, null, 1));
await b.close();
