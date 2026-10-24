import { describe, it, expect } from 'vitest';
import { PRESETS, Rules, cards, card } from '../src/blackjack';
import { strategyChart, basicStrategy, hiLoValue, trueCount, betForTrueCount, decksRemaining, runningCount } from '../src/strategy';

const R = (o: Partial<Rules>): Rules => ({ ...PRESETS.vegasStrip, ...o });
const x = (s: string) => s.trim().split(/\s+/);
const rep = (c: string, n: number) => Array(n).fill(c).join(' ');
// Transcribed from Wizard of Odds charts (sources in src/strategy.ts). Columns: 2 3 4 5 6 7 8 9 T A
const ONE_S17 = {
  hard: ['H H H H H H H H H H', 'H H H Dh Dh H H H H H', `${rep('Dh', 5)} ${rep('H', 5)}`, `${rep('Dh', 8)} H H`, rep('Dh', 10),
    'H H S S S H H H H H', `${rep('S', 5)} ${rep('H', 5)}`, `${rep('S', 5)} ${rep('H', 5)}`, `${rep('S', 5)} ${rep('H', 5)}`, 'S S S S S H H H Rh Rh', rep('S', 10)],
  soft: ['H H Dh Dh Dh H H H H H', 'H H Dh Dh Dh H H H H H', 'H H Dh Dh Dh H H H H H', 'H H Dh Dh Dh H H H H H',
    `${rep('Dh', 5)} ${rep('H', 5)}`, 'S Ds Ds Ds Ds S S H H S', 'S S S S Ds S S S S S', rep('S', 10)],
  pairs: ['Ph P P P P P H H H H', 'Ph Ph P P P P Ph H H H', 'H H Ph Pd Pd H H H H H', `${rep('Dh', 8)} H H`, 'P P P P P Ph H H H H',
    'P P P P P P Ph H Rs H', rep('P', 10), 'P P P P P S P P S S', rep('S', 10), rep('P', 10)],
};
const patch = (base: typeof ONE_S17, edits: [keyof typeof ONE_S17, number, number, string][]) => {
  const c = JSON.parse(JSON.stringify(base)) as typeof ONE_S17;
  for (const [sec, row, col, code] of edits) { const r = x(c[sec][row]); r[col] = code; c[sec][row] = r.join(' '); }
  return c;
};
const ONE_H17 = patch(ONE_S17, [['hard', 8, 9, 'Rh'], ['hard', 10, 9, 'Rs'], ['soft', 5, 9, 'H'], ['pairs', 5, 9, 'Rh'], ['pairs', 7, 9, 'Ps']]);
// Double deck S17
const TWO_S17 = {
  hard: [rep('H', 10), rep('H', 10), `${rep('Dh', 5)} ${rep('H', 5)}`, `${rep('Dh', 8)} H H`, rep('Dh', 10),
    'H H S S S H H H H H', `${rep('S', 5)} ${rep('H', 5)}`, `${rep('S', 5)} ${rep('H', 5)}`, 'S S S S S H H H Rh H', 'S S S S S H H H Rh Rh', rep('S', 10)],
  soft: ['H H H Dh Dh H H H H H', 'H H H Dh Dh H H H H H', 'H H Dh Dh Dh H H H H H', 'H H Dh Dh Dh H H H H H',
    'H Dh Dh Dh Dh H H H H H', 'S Ds Ds Ds Ds S S H H H', rep('S', 10), rep('S', 10)],
  pairs: ['Ph Ph P P P P H H H H', 'Ph Ph P P P P H H H H', 'H H H Ph Ph H H H H H', `${rep('Dh', 8)} H H`, 'P P P P P Ph H H H H',
    'P P P P P P Ph H H H', rep('P', 10), 'P P P P P S P P S S', rep('S', 10), rep('P', 10)],
};
const TWO_H17 = patch(TWO_S17, [['hard', 8, 9, 'Rh'], ['hard', 10, 9, 'Rs'], ['soft', 5, 0, 'Ds'], ['soft', 6, 4, 'Ds'], ['pairs', 6, 9, 'Rp']]);
// 4-8 decks S17 (from the WoO text strategy)
const SIX_S17 = {
  hard: [rep('H', 10), rep('H', 10), `H ${rep('Dh', 4)} ${rep('H', 5)}`, `${rep('Dh', 8)} H H`, `${rep('Dh', 9)} H`,
    'H H S S S H H H H H', `${rep('S', 5)} ${rep('H', 5)}`, `${rep('S', 5)} ${rep('H', 5)}`, 'S S S S S H H H Rh H', 'S S S S S H H Rh Rh Rh', rep('S', 10)],
  soft: ['H H H Dh Dh H H H H H', 'H H H Dh Dh H H H H H', 'H H Dh Dh Dh H H H H H', 'H H Dh Dh Dh H H H H H',
    'H Dh Dh Dh Dh H H H H H', 'S Ds Ds Ds Ds S S H H H', rep('S', 10), rep('S', 10)],
  pairs: ['Ph Ph P P P P H H H H', 'Ph Ph P P P P H H H H', 'H H H Ph Ph H H H H H', `${rep('Dh', 8)} H H`, 'Ph P P P P H H H H H',
    'P P P P P P H H H H', rep('P', 10), 'P P P P P S P P S S', rep('S', 10), rep('P', 10)],
};
const SIX_H17 = patch(SIX_S17, [['hard', 4, 9, 'Dh'], ['hard', 8, 9, 'Rh'], ['hard', 10, 9, 'Rs'], ['soft', 5, 0, 'Ds'], ['soft', 6, 4, 'Ds'], ['pairs', 6, 9, 'Rx']]);

const check = (rules: Rules, exp: typeof ONE_S17) => {
  const c = strategyChart(rules);
  for (const sec of ['hard', 'soft', 'pairs'] as const)
    c[sec].forEach((row, i) => expect(`${row.label}: ${row.codes.join(' ')}`).toBe(`${row.label}: ${exp[sec][i]}`));
};
describe('basic strategy charts match published charts', () => {
  it('single deck S17', () => check(R({ decks: 1, hitSoft17: false }), ONE_S17));
  it('single deck H17', () => check(R({ decks: 1, hitSoft17: true }), ONE_H17));
  it('double deck S17', () => check(R({ decks: 2, hitSoft17: false }), TWO_S17));
  it('double deck H17', () => check(R({ decks: 2, hitSoft17: true }), TWO_H17));
  it('6 deck S17', () => check(R({ decks: 6, hitSoft17: false }), SIX_S17));
  it('8 deck H17', () => check(R({ decks: 8, hitSoft17: true }), SIX_H17));
});
describe('basicStrategy resolves codes against table rules', () => {
  const vs = PRESETS.vegasStrip;
  it('doubles 11 vs 6, hits 3-card 11', () => {
    expect(basicStrategy(cards('5H 6D'), card('6C'), vs).play).toBe('double');
    expect(basicStrategy(cards('2H 3D 6S'), card('6C'), vs).play).toBe('hit');
  });
  it('surrenders 16 vs T only when allowed', () => {
    expect(basicStrategy(cards('TH 6D'), card('KC'), vs).play).toBe('surrender');
    expect(basicStrategy(cards('TH 6D'), card('KC'), { ...vs, lateSurrender: false }).play).toBe('hit');
  });
  it('Ph splits only with DAS', () => {
    expect(basicStrategy(cards('2H 2D'), card('3C'), vs).play).toBe('split');
    expect(basicStrategy(cards('2H 2D'), card('3C'), { ...vs, das: false }).play).toBe('hit');
  });
  it('9-11 double rule turns soft doubles into hit/stand', () => {
    const eu = PRESETS.euroNoPeek;
    expect(basicStrategy(cards('AH 7D'), card('4C'), eu).play).toBe('stand');
    expect(basicStrategy(cards('AH 4D'), card('5C'), eu).play).toBe('hit');
  });
  it('gives a one-line reason', () => {
    const a = basicStrategy(cards('8H 8D'), card('TC'), vs);
    expect(a.play).toBe('split'); expect(a.reason).toMatch(/pair of 8s/);
  });
});
describe('Hi-Lo', () => {
  it('card values', () => {
    expect(cards('2S 3S 4S 5S 6S').map(hiLoValue)).toEqual([1, 1, 1, 1, 1]);
    expect(cards('7S 8S 9S').map(hiLoValue)).toEqual([0, 0, 0]);
    expect(cards('TS JS QS KS AS').map(hiLoValue)).toEqual([-1, -1, -1, -1, -1]);
  });
  it('balanced over a full deck', () => {
    const deck = []; for (const s of 'SHDC') for (const r of 'A23456789TJQK') deck.push(card(r + s));
    expect(runningCount(deck)).toBe(0);
  });
  it('true count and deck estimate', () => {
    expect(trueCount(6, 2)).toBe(3); expect(trueCount(-5, 2, 'floor')).toBe(-3); expect(trueCount(5, 2, 'round')).toBe(3);
    expect(decksRemaining(156)).toBe(3); expect(decksRemaining(100)).toBe(2); expect(decksRemaining(10)).toBe(0.5);
  });
  it('bet ramp 1-8', () => {
    expect([-2, 0, 1, 1.9, 2, 3, 4, 5, 9].map(t => betForTrueCount(t).units)).toEqual([1, 1, 1, 1, 2, 4, 6, 8, 8]);
    expect(betForTrueCount(3, { minUnits: 1, maxUnits: 12, unit: 10 }).amount).toBe(40);
    expect(betForTrueCount(4, { minUnits: 1, maxUnits: 4, unit: 5, ramp: t => t }).units).toBe(4);
  });
});
