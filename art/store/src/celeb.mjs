// node celeb.mjs <workerId> <maxRounds>  : plays live rounds (phone portrait 432x768 @2.5x) and records every celebration.
// Observation only: an init script watches .cel-toast nodes, samples the .cel-canvas (downscaled copy) while a toast is up,
// and tracks rAF frame times. Nothing on the site is modified. Output: ../celeb/
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const W = process.argv[2] || 'a', MAX = +(process.argv[3] || 100);
const OUT = new URL('../celeb/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const SHARED = OUT + 'found.json';
const WANT = ['blackjack', 'win', 'dealerbust', 'push', 'bust', 'bigWin'];
const readFound = () => { try { return JSON.parse(fs.readFileSync(SHARED, 'utf8')); } catch { return {}; } };
const markFound = (k, v) => { const f = readFound(); if (!f[k]) { f[k] = v; fs.writeFileSync(SHARED, JSON.stringify(f, null, 1)); return true; } return false; };
const init = () => {
  const C = window.__cel = { log: [], frames: [], toastUp: false };
  let last = performance.now();
  const raf = (t) => { C.frames.push(t - last); if (C.frames.length > 600) C.frames.shift(); last = t; requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  const off = document.createElement('canvas'); off.width = 108; off.height = 192; const octx = off.getContext('2d', { willReadFrequently: true });
  const sample = () => {
    const cv = document.querySelector('.cel-canvas'); if (!cv) return null;
    octx.clearRect(0, 0, 108, 192); octx.drawImage(cv, 0, 0, 108, 192);
    const d = octx.getImageData(0, 0, 108, 192).data; let lit = 0, gold = 0, red = 0, cream = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 40) { lit++; const r = d[i], g = d[i + 1], b = d[i + 2]; if (r > 200 && g > 150 && b < 120) gold++; else if (r > 170 && g < 80) red++; else if (r > 220 && g > 220 && b > 200) cream++; } }
    return { lit, gold, red, cream };
  };
  const mo = new MutationObserver((ms) => { for (const m of ms) { for (const n of m.addedNodes) if (n.classList?.contains('cel-toast')) { C.toastUp = true; C.log.push({ ev: 'toast+', t: performance.now(), wall: Date.now(), cls: n.className, text: n.innerText }); }
    for (const n of m.removedNodes) if (n.classList?.contains('cel-toast')) { C.toastUp = !!document.querySelector('.cel-toast'); C.log.push({ ev: 'toast-', t: performance.now(), cls: n.className }); } } })
  const obs = () => mo.observe(document.documentElement, { childList: true, subtree: true }); if (document.documentElement) obs(); else document.addEventListener('DOMContentLoaded', obs);
  setInterval(() => { const tEl = document.querySelector('.cel-toast'); const dim = document.querySelector('.cel-dim');
    if (tEl || C.toastUp) { const s = sample(); C.log.push({ ev: 'sample', t: performance.now(), toast: tEl ? { text: tEl.querySelector('.cel-text')?.innerText, sub: tEl.querySelector('.cel-sub')?.innerText, op: tEl.style.opacity, tf: tEl.style.transform } : null, dim: dim ? getComputedStyle(dim).opacity : null, canvas: s }); } }, 50);
};
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, recordVideo: { dir: OUT + `video_${W}/`, size: { width: 432, height: 768 } } });
const videoStart = Date.now();
await ctx.addInitScript(init);
const p = await ctx.newPage();
const consoleLog = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleLog.push({ t: Date.now(), type: m.type(), text: m.text() }); });
p.on('pageerror', e => consoleLog.push({ t: Date.now(), type: 'pageerror', text: e.message }));
const st = () => p.evaluate(() => {
  const cards = [...document.querySelectorAll('.pcard')].map(c => { const r = c.getBoundingClientRect(); return { r: (c.querySelector('.idx')?.innerText || '?').split('\n')[0], y: Math.round(r.y), up: c.classList.contains('up') }; });
  const pills = [...document.querySelectorAll('.dock .pill')].filter(e => e.offsetParent).map(e => e.innerText.split('\n')[0].trim());
  const deal = !!document.querySelector('[aria-label="Deal"]')?.offsetParent;
  const bank = +(document.querySelector('.hud-money')?.innerText.match(/Bankroll\s*([\d,]+)/)?.[1] || '0').replace(/,/g, '');
  return { cards, pills, deal, bank, busy: document.querySelector('.casino-root').classList.contains('busy'), cel: !!document.querySelector('.cel-toast') };
});
const val = r => r === 'A' ? 11 : ['K', 'Q', 'J', '10'].includes(r) ? 10 : +r;
const total = rs => { let t = 0, a = 0; for (const r of rs) { t += val(r); if (r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return t; };
const split = s => { const ys = [...new Set(s.cards.map(c => c.y))].sort((a, b) => a - b); return { dealer: s.cards.filter(c => c.y === ys[0]), player: s.cards.filter(c => c.y !== ys[0]) }; };
async function waitFor(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { const s = await st(); if (fn(s)) return s; await p.waitForTimeout(80); } return null; }
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
async function sitDown() {
  await p.goto('https://marcus-casino-blackjack.grok.me', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.click('[aria-label="Vegas Strip 6D S17 3:2"]'); await p.waitForTimeout(2200);
}
await sitDown();
const rounds = [];
for (let r = 0; r < MAX; r++) {
  const found = readFound(); const need = WANT.filter(k => !found[k]);
  if (!need.length) { console.log(W, 'all found'); break; }
  if (process.env.RELOAD_EACH && r > 0) await sitDown();
  let s = await waitFor(x => x.deal && !x.busy && !x.cel, 25000); if (!s) { const z = await st(); console.log(W, 'stuck', JSON.stringify(z)); fs.mkdirSync(OUT + 'stuck/', { recursive: true }); await p.screenshot({ path: `${OUT}stuck/${W}_r${r}.png` }); if (z.pills.includes('Stand')) { await click('.role-stand'); continue; } console.log(W, 'reloading'); await sitDown(); continue; }
  await p.waitForTimeout(+(process.env.PRE_DEAL_MS || 0));
  if (s.bank < 600) { await ctx.clearCookies(); await p.evaluate(() => localStorage.clear()); await sitDown(); s = await st(); }
  const big = need.includes('bigWin') && (need.length <= 2 || r % 3 === 2) && s.bank >= 600;
  await click('[aria-label="Clear"]'); await p.waitForTimeout(250);
  await click(big ? '[aria-label="500 chip, 500 play money"]' : '[aria-label="100 chip, 100 play money"]'); await p.waitForTimeout(150);
  await click('[aria-label="BET bet"]'); await p.waitForTimeout(500);
  await click('[aria-label="Deal"]');
  if (!await waitFor(y => y.busy, 4000)) { console.log(W, 'deal did not start'); }
  await p.waitForTimeout(1500);
  const goBust = need.includes('bust') && !big && (need.length <= 2 || r % 4 === 1);
  let hits = 0, info = {};
  for (let step = 0; step < 30; step++) {
    const x = await waitFor(y => y.cel || !y.busy && (y.cards.length >= 3 && (y.pills.includes('Stand') || y.pills.includes('No') || y.deal)), 20000);
    if (!x || x.cel) break;
    if (x.pills.includes('No') && !x.pills.includes('Stand')) { await click('.dock .role-stand'); await p.waitForTimeout(500); continue; }
    if (!x.pills.includes('Stand')) break;
    const { player, dealer } = split(x); const pt = total(player.map(c => c.r)); const up = val(dealer.find(c => c.up)?.r || '10');
    info = { pt, up, player: player.map(c => c.r).join(','), dealerUp: dealer.find(c => c.up)?.r };
    const hit = goBust ? pt < 22 : (pt <= 11 || (pt <= 16 && up >= 7) || pt === 12 && up <= 3);
    if (hit && pt < 21) { await click('.role-hit'); hits++; await p.waitForTimeout(1200); continue; }
    await click('.role-stand'); break;
  }
  // wait for a celebration toast (or none, e.g. a plain loss)
  const t0 = Date.now(); let saw = null;
  while (Date.now() - t0 < 16000) { const L = await p.evaluate(() => window.__cel.log.filter(e => e.ev === 'toast+')); if (L.length > (rounds.toastCount || 0)) { saw = L[L.length - 1]; rounds.toastCount = L.length; break; }
    const y = await st(); if (y.deal && !y.busy && Date.now() - t0 > 7000) break; await p.waitForTimeout(60); }
  let kind = null;
  if (saw) { const k = saw.cls.replace('cel-toast', '').trim().replace('cel-', ''); kind = k === 'bj' ? 'blackjack' : k === 'big' ? 'bigWin' : k; if (k === 'win' && /dealer bust/i.test(saw.text)) kind = 'dealerbust'; }
  const rec = { r, big, goBust, hits, ...info, toast: saw && { cls: saw.cls, text: saw.text }, kind, wallStart: saw?.wall, videoOffset: saw ? (saw.wall - videoStart) / 1000 : null };
  // burst capture for the first instance of each kind (all workers share found.json)
  if (kind && WANT.includes(kind) && markFound(kind, `${W}_r${r}`) ) {
    const dir = `${OUT}${kind}_${W}_r${r}/`; fs.mkdirSync(dir, { recursive: true });
    const tb = Date.now(); let i = 0, gotFull = false; const times = [];
    while (Date.now() - tb < 3200) {
      const el = Date.now() - tb;
      if (!gotFull && el > 380) { await p.screenshot({ path: `${dir}full_${String(el).padStart(4, '0')}ms.png` }); gotFull = true; times.push({ full: el }); continue; }
      await p.screenshot({ path: `${dir}${String(i).padStart(3, '0')}.png`, scale: 'css' }); times.push({ i, ms: Date.now() - tb }); i++;
    }
    rec.burst = { dir, times };
    console.log(W, 'CAPTURED', kind, saw.text.replace(/\n/g, ' | '));
  } else if (kind === 'blackjack') { console.log(W, 'another blackjack', r); }
  rec.celLog = await p.evaluate(() => { const L = window.__cel.log.splice(0); return L; });
  rec.frameMs = await p.evaluate(() => { const f = window.__cel.frames.slice(-240); const a = f.reduce((x, y) => x + y, 0) / f.length; return { avg: +a.toFixed(1), max: +Math.max(...f).toFixed(1) }; });
  rounds.toastCount = 0;
  rounds.push(rec);
  console.log(W, 'round', r, JSON.stringify({ kind, toast: saw?.text?.replace(/\n/g, ' | '), ...info, big, frame: rec.frameMs }));
  fs.writeFileSync(`${OUT}rounds_${W}.json`, JSON.stringify({ videoStart, rounds, console: consoleLog }, null, 1));
}
fs.writeFileSync(`${OUT}rounds_${W}.json`, JSON.stringify({ videoStart, rounds, console: consoleLog }, null, 1));
await ctx.close(); await b.close();
