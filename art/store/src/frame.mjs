// node frame.mjs -> framed/*.png (1080x1920) + feature-graphic.png (1024x500). Local HTML/CSS rendered in headless Chrome.
import { chromium } from 'playwright-core';
const here = new URL('.', import.meta.url).pathname;
const root = here + '../';
const KIT = '/workspace/casino/assets/kit/';
export const shots = [
  ['01_bet', 'Stack your chips', 'Seven chip colors, real table limits'],
  ['02_dealing', 'Dealt card by card', 'Smooth shoe-to-felt dealing'],
  ['03_decision', 'Every classic move', 'Hit, stand, double or surrender'],
  ['04_in_play', 'Real blackjack rules', 'Six-deck shoe, dealer stands on 17'],
  ['05_result', 'Beat the dealer for fun', 'Your play-money bankroll keeps score'],
  ['06_coach', 'Learn basic strategy', 'The Strategy Coach grades every play'],
];
const felt = `
  background:
    radial-gradient(ellipse 120% 70% at 50% 18%, rgba(255,230,180,.16), transparent 60%),
    radial-gradient(ellipse 140% 90% at 50% 35%, #14804a 0%, #0b5d34 38%, #073d22 78%),
    #073d22;`;
const grain = `<svg class="grain" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
const css = `
  @font-face{}
  *{margin:0;box-sizing:border-box}
  body{width:WIDTHpx;height:HEIGHTpx;overflow:hidden;position:relative;${felt}font-family:Inter,Roboto,sans-serif;color:#fff8e7}
  .grain{position:absolute;inset:0;mix-blend-mode:overlay;pointer-events:none}
  .vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.55));pointer-events:none}
  .rule{display:flex;align-items:center;justify-content:center;gap:18px;color:#f2c14e}
  .rule i{display:block;height:2px;width:120px;background:linear-gradient(90deg,transparent,#f2c14e)}
  .rule i:last-child{transform:scaleX(-1)}
  .rule b{width:14px;height:14px;background:#f2c14e;transform:rotate(45deg)}
`;
function framedHTML(file, title, sub) {
  return `<!doctype html><html><head><style>${css.replace('WIDTH', 1080).replace('HEIGHT', 1920)}
  h1{position:absolute;top:96px;left:60px;right:60px;text-align:center;font:800 84px/1.08 'Playfair Display',serif;color:#fff8e7;text-shadow:0 3px 0 #021a0e,0 8px 24px rgba(0,0,0,.45)}
  h2{position:absolute;top:212px;left:60px;right:60px;text-align:center;font:500 38px/1.2 Inter,sans-serif;color:rgba(255,248,231,.85)}
  .rule{position:absolute;top:278px;left:0;right:0}
  .phone{position:absolute;left:50%;top:330px;width:808px;height:1436px;transform:translateX(-50%);border-radius:56px;background:#0d0d0d;padding:14px;
    box-shadow:0 0 0 2px rgba(242,193,78,.75),0 40px 80px rgba(0,0,0,.6),0 10px 24px rgba(0,0,0,.5)}
  .phone img{display:block;width:780px;height:1387px;border-radius:44px}
  .foot{position:absolute;bottom:56px;left:0;right:0;text-align:center;font:600 30px/1 Inter,sans-serif;letter-spacing:.06em;color:rgba(255,248,231,.78)}
  .foot span{color:#f2c14e}
  </style></head><body>${grain}<div class="vig"></div>
  <h1>${title}</h1><h2>${sub}</h2><div class="rule"><i></i><b></b><i></i></div>
  <div class="phone"><img src="file://${root}raw/${file}.png"></div>
  <div class="foot">PLAY MONEY ONLY <span>·</span> NO CASH PRIZES <span>·</span> NO ADS</div>
  </body></html>`;
}
function featureHTML() {
  return `<!doctype html><html><head><style>${css.replace('WIDTH', 1024).replace('HEIGHT', 500)}
  .t{position:absolute;left:56px;top:92px;width:520px}
  .t h1{font:800 76px/1.0 'Playfair Display',serif;color:#fff8e7;text-shadow:0 3px 0 #021a0e,0 8px 24px rgba(0,0,0,.45)}
  .t h1 em{font-style:normal;color:#f2c14e}
  .t p{margin-top:22px;font:600 30px/1.25 Inter,sans-serif;color:rgba(255,248,231,.9)}
  .t .rule{justify-content:flex-start;margin-top:22px}.t .rule i:first-child{display:none}
  .t small{display:block;margin-top:22px;font:600 22px/1 Inter,sans-serif;letter-spacing:.08em;color:rgba(255,248,231,.72)}
  .phone{position:absolute;right:70px;top:34px;width:236px;height:420px;border-radius:28px;background:#0d0d0d;padding:7px;transform:rotate(6deg);
    box-shadow:0 0 0 2px rgba(242,193,78,.75),0 24px 50px rgba(0,0,0,.6)}
  .phone img{width:222px;height:406px;border-radius:22px;display:block;object-fit:cover}
  .card{position:absolute;width:118px;border-radius:8px;box-shadow:0 12px 26px rgba(0,0,0,.5)}
  .chip{position:absolute;filter:drop-shadow(0 8px 10px rgba(0,0,0,.5))}
  </style></head><body>${grain}<div class="vig"></div>
  <img class="card" src="file://${KIT}cards/card_back_red.png" style="left:600px;top:250px;transform:rotate(-16deg)">
  <img class="card" src="file://${KIT}cards/card_back_blue.png" style="left:650px;top:268px;transform:rotate(-4deg)">
  <img class="chip" src="file://${KIT}chips/chip_25.png" style="width:110px;left:585px;top:120px;transform:rotate(-12deg)">
  <img class="chip" src="file://${KIT}chips/chip_100.png" style="width:96px;left:690px;top:70px;transform:rotate(18deg)">
  <img class="chip" src="file://${KIT}chips/chip_1000.png" style="width:90px;left:930px;top:390px;transform:rotate(8deg)">
  <div class="phone"><img src="file://${root}raw/05_result.png"></div>
  <div class="t"><h1>Casino<br><em>Blackjack</em></h1><div class="rule"><i></i><b></b><i></i></div><p>Play money. Real rules.<br>Strategy Coach built in.</p><small>NO CASH · NO ADS · NO ACCOUNTS</small></div>
  </body></html>`;
}
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const fs = await import('node:fs');
fs.mkdirSync(root + 'framed', { recursive: true });
for (const [f, t, s] of shots) {
  fs.writeFileSync(here + '_page.html', framedHTML(f, t, s)); await p.goto('file://' + here + '_page.html', { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${root}framed/${f}_framed.png` });
}
fs.writeFileSync(here + '_page.html', `<!doctype html><html><head><style>${css.replace('WIDTH', 1080).replace('HEIGHT', 1920)}</style></head><body>${grain}<div class="vig"></div></body></html>`);
await p.goto('file://' + here + '_page.html'); fs.mkdirSync(root + 'promo/build', { recursive: true }); await p.screenshot({ path: `${root}promo/build/felt_bg_1080x1920.png` });
await p.setViewportSize({ width: 1024, height: 500 });
fs.writeFileSync(here + '_page.html', featureHTML()); await p.goto('file://' + here + '_page.html', { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: `${root}feature-graphic_1024x500.png` });
await b.close();
console.log('ok');
