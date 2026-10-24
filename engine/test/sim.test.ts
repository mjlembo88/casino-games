import { it, expect } from 'vitest';
import { Blackjack, PRESETS } from '../src/blackjack';
import { basicStrategy } from '../src/strategy';
// Monte-Carlo sanity check: basic strategy on Vegas Strip rules should land near the published ~0.3-0.6% house edge.
it('basic-strategy simulation gives a realistic house edge', () => {
  const g = new Blackjack(PRESETS.vegasStrip, { seed: 2026 }); let net = 0, staked = 0; const N = 200000;
  for (let i = 0; i < N; i++) {
    g.deal({ main: 100 }); staked += 100;
    if (g.phase === 'insurance') g.decideInsurance(false);
    while (g.phase === 'player') {
      const av = g.available(), h = g.hand;
      const a = basicStrategy(h.cards, g.dealerUp, g.rules, { canDouble: av.includes('double'), canSplit: av.includes('split'), canSurrender: av.includes('surrender') });
      g.act(av.includes(a.play) ? a.play : (av.includes('hit') ? 'hit' : 'stand'));
    }
    net += g.net;
  }
  const edge = -net / staked; console.log('house edge', (edge * 100).toFixed(3) + '%');
  expect(edge).toBeGreaterThan(-0.01); expect(edge).toBeLessThan(0.015);
}, 120000);
