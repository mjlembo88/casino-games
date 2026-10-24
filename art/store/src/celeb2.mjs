// v2 harness (2026-10-24): node celeb2.mjs <worker> <rounds> [width] [mode]
// mode: table (default) | coach. No reload between rounds unless RELOAD_EACH=1. Observation-only init script.
// Logs every 50 ms in-page: cards (count / moving), visible action pills, Deal + chip rack visibility, toast, dim, celebration canvas.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const W = process.argv[2] || 'a', MAX = +(process.argv[3] || 30), VW = +(process.argv[4] || 432), MODE = process.argv[5] || 'table';
const VH = Math.round(VW * 16 / 9), DPR = 1080 / VW;
const OUT = new URL('../celeb/v2/', import.meta.url).pathname; fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
const SHOTS = OUT + 'shots/';
const SHARED = OUT + 'logs/found.json';
const readFound = () => { try { return JSON.parse(fs.readFileSync(SHARED, 'utf8')); } catch { return {}; } };
const bump = (k) => { const f = readFound(); f[k] = (f[k] || 0) + 1; fs.writeFileSync(SHARED, JSON.stringify(f, null, 1)); return f[k]; };
const init = () => {
  const C = window.__cel = { log: [], marks: [], frames: [] };
  C.mark = (m) => C.marks.push({ m, t: performance.now() });
  let last = performance.now(); const raf = (t) => { C.frames.push(t - last); if (C.frames.length > 600) C.frames.shift(); last = t; requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  const off = document.createElement('canvas'); off.width = 108; off.height = 192; const octx = off.getContext('2d', { willReadFrequently: true });
  const vis = (e) => { if (!e || !e.offsetParent) return 0; let o = 1, n = e; while (n && n !== document.body) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none') return 0; o *= +cs.opacity; n = n.parentElement; } return +o.toFixed(2); };
  let prevPos = '';
  const mo = new MutationObserver((ms) => { for (const m of ms) { for (const n of m.addedNodes) if (n.classList?.contains('cel-toast')) C.log.push({ ev: 'toast+', t: performance.now(), wall: Date.now(), cls: n.className, text: n.innerText });
    for (const n of m.removedNodes) if (n.classList?.contains('cel-toast')) C.log.push({ ev: 'toast-', t: performance.now(), cls: n.className }); } });
  const obs = () => mo.observe(document.documentElement, { childList: true, subtree: true }); if (document.documentElement) obs(); else document.addEventListener('DOMContentLoaded', obs);
  setInterval(() => {
    if (!document.querySelector('.casino-root')) return;
    const cards = [...document.querySelectorAll('.pcard')]; const pos = cards.map(c => { const r = c.getBoundingClientRect(); return Math.round(r.x) + ',' + Math.round(r.y); }).join(';');
    const moving = pos !== prevPos || cards.some(c => c.getAnimations({ subtree: true }).some(a => a.playState === 'running' && a.effect?.getComputedTiming().activeDuration < 5000)); prevPos = pos;
    const pills = [...document.querySelectorAll('.dock .pill')].map(e => [e.innerText.split('\n')[0].trim(), vis(e)]).filter(x => x[1] > 0.05).map(x => x[0]);
    const deal = vis(document.querySelector('[aria-label="Deal"]')); const rack = vis(document.querySelector('[aria-label="100 chip, 100 play money"]'));
    const tEl = document.querySelector('.cel-toast'); const dim = document.querySelector('.cel-dim'); let canvas = null;
    const cv = document.querySelector('.cel-canvas');
    if (tEl && cv) { octx.clearRect(0, 0, 108, 192); octx.drawImage(cv, 0, 0, 108, 192); const d = octx.getImageData(0, 0, 108, 192).data; let lit = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) lit++; canvas = lit; }
    C.log.push({ ev: 's', t: performance.now(), n: cards.length, moving, pills, deal, rack, busy: document.querySelector('.casino-root').classList.contains('busy'), toast: tEl ? (tEl.querySelector('.cel-text')?.innerText || '') + '|' + (tEl.querySelector('.cel-sub')?.innerText || '') + '|' + (+tEl.style.opacity || 0).toFixed(2) : null, dim: dim ? +getComputedStyle(dim).opacity : 0, canvas });
  }, 50);
};
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, recordVideo: { dir: OUT + `video_${W}/`, size: { width: 432, height: 768 } } });
const videoStart = Date.now();
await ctx.addInitScript(init);
await ctx.route('**/*', r => r.continue({ headers: { ...r.request().headers(), 'cache-control': 'no-cache', pragma: 'no-cache' } }));
const p = await ctx.newPage();
const consoleLog = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleLog.push({ t: Date.now(), type: m.type(), text: m.text() }); });
p.on('pageerror', e => consoleLog.push({ t: Date.now(), type: 'pageerror', text: e.message }));
const st = () => p.evaluate(() => {
  const cards = [...document.querySelectorAll('.pcard')].map(c => { const r = c.getBoundingClientRect(); return { r: (c.querySelector('.idx')?.innerText || '?').split('\n')[0], y: Math.round(r.y), up: c.classList.contains('up') }; });
  const vis = e => !!e?.offsetParent && getComputedStyle(e).opacity > 0.05;
  const pills = [...document.querySelectorAll('.dock .pill')].filter(vis).map(e => e.innerText.split('\n')[0].trim());
  const bank = +(document.querySelector('.hud-money')?.innerText.match(/Bankroll\s*([\d,]+)/)?.[1] || '0').replace(/,/g, '');
  return { cards, pills, deal: vis(document.querySelector('[aria-label="Deal"]')), bank, busy: document.querySelector('.casino-root').classList.contains('busy'), cel: !!document.querySelector('.cel-toast') };
});
const val = r => r === 'A' ? 11 : ['K', 'Q', 'J', '10'].includes(r) ? 10 : +r;
const total = rs => { let t = 0, a = 0; for (const r of rs) { t += val(r); if (r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return t; };
const split = s => { const ys = [...new Set(s.cards.map(c => c.y))].sort((a, b) => a - b); return { dealer: s.cards.filter(c => c.y === ys[0]), player: s.cards.filter(c => c.y !== ys[0]) }; };
async function waitFor(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { const s = await st(); if (fn(s)) return s; await p.waitForTimeout(60); } return null; }
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const mark = m => p.evaluate(m => window.__cel.mark(m), m);
const shot = async (name) => { await p.screenshot({ path: SHOTS + name + '.png' }); };
async function sitDown() {
  await p.goto('https://marcus-casino-blackjack.grok.me/?nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  if (MODE === 'coach') { await p.click('[aria-label="Strategy Coach"]'); await p.waitForTimeout(800); const c = await p.$('[aria-label="Vegas Strip 6D S17 3:2 with coach"]'); if (c) await c.click(); else await p.click('[aria-label="Vegas Strip 6D S17 3:2"]'); }
  else await p.click('[aria-label="Vegas Strip 6D S17 3:2"]');
  await p.waitForTimeout(2200);
}
await sitDown();
const rounds = []; let resultShots = 0; const STORE = !!process.env.STORE;
const save = () => fs.writeFileSync(`${OUT}logs/rounds_${W}.json`, JSON.stringify({ W, VW, MODE, videoStart, rounds, console: consoleLog }, null, 1));
for (let r = 0; r < MAX; r++) {
  if (process.env.RELOAD_EACH && r > 0) await sitDown();
  let s = await waitFor(x => x.deal && !x.busy && !x.cel, 30000);
  if (!s) { const z = await st(); console.log(W, 'NO DEAL BUTTON', JSON.stringify(z)); await shot(`nodeal_${W}_r${r}`); if (z.pills.includes('Stand')) { await click('.role-stand'); } else await sitDown(); rounds.push({ r, error: 'no deal button', state: z }); save(); continue; }
  if (s.bank < 700) { await p.evaluate(() => localStorage.clear()); await sitDown(); s = await st(); }
  const f = readFound();
  const big = !f.bigWin && r % 4 === 3;
  const goBust = !f.bust && r % 5 === 1;
  const stack = (W === 'a' || STORE) && r < 3; // 25+25+100 to check the bet stack
  await click('[aria-label="Clear"]'); await p.waitForTimeout(250);
  if (big) await click('[aria-label="500 chip, 500 play money"]');
  else if (stack) { for (const c of ['25', '25', '100']) { await click(`[aria-label="${c} chip, ${c} play money"]`); await p.waitForTimeout(150); await click('[aria-label="BET bet"]'); await p.waitForTimeout(350); } }
  else await click('[aria-label="100 chip, 100 play money"]');
  if (!stack) { await p.waitForTimeout(150); await click('[aria-label="BET bet"]'); } await p.waitForTimeout(600);
  if (stack) await shot(`bet_${W}_r${r}`);
  const bank0 = (await st()).bank;
  await p.evaluate(() => window.__cel.log.splice(0)); await mark('deal');
  await click('[aria-label="Deal"]');
  if (STORE && r < 4) { await p.waitForTimeout([2600, 2900, 3200, 3500][r]); await shot(`dealing_${W}_r${r}`); }
  let info = {}, hits = 0, decisionShot = false, inplayShot = false;
  for (let step = 0; step < 30; step++) {
    const x = await waitFor(y => y.cel || (y.cards.length >= 3 && !y.busy && (y.pills.includes('Stand') || y.pills.includes('No'))) || (y.deal && !y.busy), 15000);
    if (!x || x.cel || (x.deal && !x.pills.includes('Stand'))) break;
    if (x.pills.includes('No') && !x.pills.includes('Stand')) { await click('.dock .role-stand'); await p.waitForTimeout(500); continue; }
    if (!x.pills.includes('Stand')) break;
    const { player, dealer } = split(x); const pt = total(player.map(c => c.r)); const up = val(dealer.find(c => c.up)?.r || '10');
    info = { pt, up, player: player.map(c => c.r).join(','), dealerUp: dealer.find(c => c.up)?.r };
    if (STORE && hits >= 1 && !inplayShot && r < 14) { await p.waitForTimeout(300); await shot(`inplay_${W}_r${r}`); inplayShot = true; }
    if ((STORE || MODE === 'coach') && !decisionShot && r < 12) { await p.waitForTimeout(400); await shot(`decision_${W}_r${r}`); decisionShot = true; }
    const hit = goBust ? pt < 22 : (pt <= 11 || (pt <= 16 && up >= 7) || (pt === 12 && up <= 3));
    if (hit && pt < 21) { await mark('hit'); await click('.role-hit'); hits++; if (MODE === 'coach') { await p.waitForTimeout(800); await shot(`coachgrade_${W}_r${r}_h${hits}`); } else await p.waitForTimeout(900); continue; }
    await mark('stand'); await click('.role-stand'); if (MODE === 'coach') { await p.waitForTimeout(800); await shot(`coachgrade_${W}_r${r}_s`); } break;
  }
  // result: watch for a toast; first instance of each kind gets 2 full-res shots (~550 ms and ~1100 ms)
  const t0 = Date.now(); let saw = null, seenN = 0;
  while (Date.now() - t0 < 15000) {
    const L = await p.evaluate(() => window.__cel.log.filter(e => e.ev === 'toast+'));
    if (L.length) { saw = L[0]; break; }
    const y = await st(); if (y.deal && !y.busy && Date.now() - t0 > 6000) break; await p.waitForTimeout(40);
  }
  let kind = null;
  if (saw) { const k = saw.cls.replace('cel-toast', '').trim().replace('cel-', ''); kind = k === 'bj' ? 'blackjack' : k === 'big' ? 'bigWin' : k; if (k === 'win') { await p.waitForTimeout(350); const sub = await p.evaluate(() => [...document.querySelectorAll('.cel-sub,.cel-toast,.dealer-bust')].map(e => e.innerText).join(' ')); if (/dealer bust/i.test(saw.text + ' ' + sub)) kind = 'dealerbust'; } }
  let shots = [];
  if (kind) {
    seenN = bump(kind);
    const wantShots = seenN === 1 || (kind === 'blackjack' && seenN === 3);
    const tt = Date.now(); if (wantShots) for (const at of [550, 1100, 1900]) { const el = Date.now() - tt; if (el < at) await p.waitForTimeout(at - el); const nm = `${kind}${seenN}_${W}_r${r}_${at}ms`; await shot(nm); shots.push(nm); }
    if (STORE && !wantShots && (kind === 'win' || kind === 'dealerbust') && resultShots < 4) { await waitFor(y => !y.cel, 6000); await p.waitForTimeout(350); await shot(`result_${kind}_${W}_r${r}`); resultShots++; }
  }
  await waitFor(y => y.deal && !y.busy && !y.cel, 15000);
  await p.waitForTimeout(400);
  const log = await p.evaluate(() => { const L = window.__cel.log.splice(0); const M = window.__cel.marks.splice(0); return { L, M }; });
  const frame = await p.evaluate(() => { const f = window.__cel.frames.slice(-240); return +(f.reduce((x, y) => x + y, 0) / f.length).toFixed(1); });
  rounds.push({ r, bank0, big, goBust, hits, ...info, kind, toast: saw && { cls: saw.cls, text: saw.text }, seenN, shots, videoOffset: saw ? (saw.wall - videoStart) / 1000 : null, frameAvg: frame, marks: log.M, log: log.L });
  console.log(W, 'round', r, JSON.stringify({ kind, toast: saw?.text?.replace(/\n/g, ' | '), ...info, big, n: seenN }));
  save();
}
save(); await ctx.close(); await b.close();
