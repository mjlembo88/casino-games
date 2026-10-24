// 01_bet: fresh load, 25+25+100 on the main spot, wait for the stack to settle, shoot 1080x1920.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('https://marcus-casino-blackjack.grok.me/?nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
await p.click('[aria-label="Vegas Strip 6D S17 3:2"]'); await p.waitForTimeout(2500);
const c = s => p.evaluate(s => document.querySelector(s).click(), s);
for (const chip of ['25', '25', '100']) { await c(`[aria-label="${chip} chip, ${chip} play money"]`); await p.waitForTimeout(250); await c('[aria-label="BET bet"]'); await p.waitForTimeout(700); }
await c('[aria-label="100 chip, 100 play money"]'); await p.waitForTimeout(2500);
await p.screenshot({ path: process.argv[2] || '/tmp/store_bet.png' });
await b.close();
