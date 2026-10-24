Create `src/games/blackjack/strategy.ts` with EXACTLY this TypeScript, unchanged (it's unit-tested against the published Wizard of Odds basic-strategy charts). It imports from `./engine`. Don't change the UI yet; my next message describes the training modes. Reply "strategy saved".

```ts
// Basic strategy + Hi-Lo trainer helpers. Pure functions, generated from the table's Rules.
// Sources (Wizard of Odds, M. Shackleford, retrieved 2026-10-23):
//  1 deck : https://wizardofodds.com/games/blackjack/strategy/1-deck/
//  2 decks: https://wizardofodds.com/games/blackjack/strategy/2-decks/
//  4-8    : https://wizardofodds.com/games/blackjack/strategy/4-decks/
import { Card, Rules, handValue, pip } from './engine';

/** Chart codes: H hit, S stand, Dh double/else hit, Ds double/else stand, P split,
 *  Ph split if DAS/else hit, Pd split if DAS/else double, Ps split if DAS/else stand,
 *  Rh surrender/else hit, Rs surrender/else stand, Rp surrender if no DAS/else split, Rx surrender/else split. */
export type Code = 'H' | 'S' | 'Dh' | 'Ds' | 'P' | 'Ph' | 'Pd' | 'Ps' | 'Rh' | 'Rs' | 'Rp' | 'Rx';
export type Play = 'hit' | 'stand' | 'double' | 'split' | 'surrender';
export const UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const; // 11 = Ace
type Deck = '1' | '2' | 'multi';
const deckClass = (r: Rules): Deck => (r.decks === 1 ? '1' : r.decks === 2 ? '2' : 'multi');
const inr = (u: number, a: number, b: number) => u >= a && u <= b;

/** Hard total code (no surrender layer). */
function hardCode(t: number, u: number, r: Rules): Code {
  const d = deckClass(r), h17 = r.hitSoft17;
  if (t >= 17) return 'S';
  if (t >= 13) return inr(u, 2, 6) ? 'S' : 'H';
  if (t === 12) return inr(u, 4, 6) ? 'S' : 'H';
  if (t === 11) return u === 11 && d === 'multi' && !h17 ? 'H' : 'Dh';
  if (t === 10) return inr(u, 2, 9) ? 'Dh' : 'H';
  if (t === 9) return (d === 'multi' ? inr(u, 3, 6) : inr(u, 2, 6)) ? 'Dh' : 'H';
  if (t === 8) return d === '1' && inr(u, 5, 6) ? 'Dh' : 'H';
  return 'H';
}
/** Surrender overlay for hard totals (and 8,8 handled in pairs). */
function hardSurrender(t: number, u: number, r: Rules): Code | null {
  const d = deckClass(r), h17 = r.hitSoft17;
  if (t === 16 && (u === 10 || u === 11 || (d === 'multi' && u === 9))) return 'Rh';
  if (t === 15 && u === 10 && d !== '1') return 'Rh';
  if (t === 15 && u === 11 && h17) return 'Rh';
  if (t === 17 && u === 11 && h17) return 'Rs';
  return null;
}
function softCode(t: number, u: number, r: Rules): Code {
  const d = deckClass(r), h17 = r.hitSoft17;
  if (t >= 20) return 'S';
  if (t === 19) return u === 6 && (d === '1' || h17) ? 'Ds' : 'S';
  if (t === 18) {
    if (inr(u, 3, 6) || (u === 2 && h17 && d !== '1')) return 'Ds';
    if (u === 2 || u === 7 || u === 8) return 'S';
    if (u === 11 && d === '1' && !h17) return 'S';
    return 'H';
  }
  if (t === 17) return (d === '1' ? inr(u, 2, 6) : inr(u, 3, 6)) ? 'Dh' : 'H';
  if (t === 15 || t === 16) return inr(u, 4, 6) ? 'Dh' : 'H';
  if (t === 12) return (d === 'multi' ? u === 6 : inr(u, 5, 6)) ? 'Dh' : 'H'; // A,A that can't be resplit
  // 13, 14
  return (d === '1' ? inr(u, 4, 6) : inr(u, 5, 6)) ? 'Dh' : 'H';
}
/** Pair code by pip value (2..11, 11 = aces). 5,5 and 10,10 never split (use hard total). */
function pairCode(p: number, u: number, r: Rules): Code | null {
  const d = deckClass(r), h17 = r.hitSoft17;
  switch (p) {
    case 11: return 'P';
    case 10: case 5: return null;
    case 8:
      if (u === 11 && h17 && d === 'multi') return 'Rx';
      if (u === 11 && h17 && d === '2') return 'Rp';
      return 'P';
    case 9: return inr(u, 2, 6) || u === 8 || u === 9 ? 'P' : (u === 11 && h17 && d === '1' ? 'Ps' : 'S');
    case 7:
      if (inr(u, 2, 7)) return 'P';
      if (u === 8 && d !== 'multi') return 'Ph';
      if (d === '1' && u === 10) return 'Rs';
      if (d === '1' && u === 11 && h17) return 'Rh';
      return null;
    case 6:
      if (d === 'multi') return inr(u, 3, 6) ? 'P' : u === 2 ? 'Ph' : null;
      return inr(u, 2, 6) ? 'P' : u === 7 ? 'Ph' : null;
    case 4:
      if (d === '1') return u === 4 ? 'Ph' : inr(u, 5, 6) ? 'Pd' : null;
      return inr(u, 5, 6) ? 'Ph' : null;
    case 3:
      if (d === '1') return inr(u, 2, 3) || u === 8 ? 'Ph' : inr(u, 4, 7) ? 'P' : null;
      return inr(u, 2, 3) ? 'Ph' : inr(u, 4, 7) ? 'P' : null;
    case 2:
      if (d === '1') return u === 2 ? 'Ph' : inr(u, 3, 7) ? 'P' : null;
      return inr(u, 2, 3) ? 'Ph' : inr(u, 4, 7) ? 'P' : null;
  }
  return null;
}
export const upValue = (c: Card) => (c.rank === 1 ? 11 : pip(c));

export interface Ctx { canDouble: boolean; canSplit: boolean; canSurrender: boolean }
/** Raw chart code for a 2-card (or longer) hand. */
export function strategyCode(hand: Card[], up: Card, rules: Rules, ctx?: Partial<Ctx>): Code {
  const u = upValue(up), v = handValue(hand), two = hand.length === 2;
  const canSplit = ctx?.canSplit ?? two;
  if (two && canSplit && pip(hand[0]) === pip(hand[1])) {
    const p = hand[0].rank === 1 ? 11 : pip(hand[0]);
    const pc = pairCode(p, u, rules); if (pc) return pc;
  }
  if (v.soft) return softCode(v.total, u, rules);
  const sur = two ? hardSurrender(v.total, u, rules) : null;
  return sur ?? hardCode(v.total, u, rules);
}
function doubleAllowedByTotal(hand: Card[], r: Rules) {
  const v = handValue(hand);
  if (r.double === 'any') return true;
  return !v.soft && v.total >= (r.double === '9-11' ? 9 : 10) && v.total <= 11;
}
/** Resolve a code into a legal play for this table and moment. */
export function resolve(code: Code, hand: Card[], rules: Rules, ctx: Ctx): Play {
  const D = ctx.canDouble && doubleAllowedByTotal(hand, rules), P = ctx.canSplit, R = ctx.canSurrender && rules.lateSurrender;
  switch (code) {
    case 'H': return 'hit'; case 'S': return 'stand';
    case 'Dh': return D ? 'double' : 'hit'; case 'Ds': return D ? 'double' : 'stand';
    case 'P': return P ? 'split' : 'hit';
    case 'Ph': return P && rules.das ? 'split' : 'hit';
    case 'Pd': return P && rules.das ? 'split' : D ? 'double' : 'hit';
    case 'Ps': return P && rules.das ? 'split' : 'stand';
    case 'Rh': return R ? 'surrender' : 'hit'; case 'Rs': return R ? 'surrender' : 'stand';
    case 'Rp': return R && !rules.das ? 'surrender' : P ? 'split' : 'hit';
    case 'Rx': return R ? 'surrender' : P ? 'split' : 'hit';
  }
}
const REASON: Record<Play, (t: string, u: string) => string> = {
  hit: (t, u) => `${t} can't win standing vs ${u} often enough — take a card.`,
  stand: (t, u) => `${t} vs ${u}: let the dealer risk busting.`,
  double: (t, u) => `${t} vs ${u} is a strong spot — get more money out.`,
  split: (t, u) => `Splitting ${t} vs ${u} turns one weak or average hand into two better ones.`,
  surrender: (t, u) => `${t} vs ${u} loses over half the time — save half the bet.`,
};
export interface Advice { play: Play; code: Code; reason: string }
export function basicStrategy(hand: Card[], dealerUp: Card, rules: Rules, ctx?: Partial<Ctx>): Advice {
  const two = hand.length === 2;
  const c: Ctx = { canDouble: ctx?.canDouble ?? two, canSplit: ctx?.canSplit ?? two, canSurrender: ctx?.canSurrender ?? two };
  const code = strategyCode(hand, dealerUp, rules, c), play = resolve(code, hand, rules, c);
  const v = handValue(hand), u = upValue(dealerUp);
  const isPair = two && pip(hand[0]) === pip(hand[1]) && play === 'split';
  const t = isPair ? `pair of ${hand[0].rank === 1 ? 'aces' : pip(hand[0]) + 's'}` : `${v.soft ? 'soft' : 'hard'} ${v.total}`;
  return { play, code, reason: REASON[play](t, u === 11 ? 'an ace' : String(u)) };
}
/** Chart rows generated from the same function the coach uses. */
export function strategyChart(rules: Rules) {
  const mk = (r: number, s = 'S' as Card['suit']) => ({ rank: r, suit: s });
  const ups = UPCARDS.map(u => mk(u === 11 ? 1 : u === 10 ? 13 : u, 'C'));
  const hardHands: [string, Card[]][] = [['5-7', [mk(2), mk(5, 'H')]], ['8', [mk(2), mk(6, 'H')]], ['9', [mk(2), mk(7, 'H')]], ['10', [mk(2), mk(8, 'H')]],
    ['11', [mk(2), mk(9, 'H')]], ...[2, 3, 4, 5, 6].map(n => [String(10 + n), [mk(10), mk(n, 'H')]] as [string, Card[]]), ['17+', [mk(10), mk(7, 'H')]]];
  const row = (h: Card[], split: boolean) => ups.map(u => strategyCode(h, u, rules, { canSplit: split }));
  const hard = hardHands.map(([k, h]) => ({ label: k, codes: row(h, false) }));
  const soft = [2, 3, 4, 5, 6, 7, 8, 9].map(x => ({ label: `A,${x}`, codes: row([mk(1), mk(x, 'H')], false) }));
  const pairs = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1].map(x => ({ label: x === 1 ? 'A,A' : x === 10 ? 'T,T' : `${x},${x}`, codes: row([mk(x), mk(x, 'H')], true) }));
  return { upcards: UPCARDS.map(u => (u === 11 ? 'A' : String(u))), hard, soft, pairs };
}

// ---------- Hi-Lo counting ----------
export const hiLoValue = (c: Card) => (c.rank >= 2 && c.rank <= 6 ? 1 : c.rank >= 7 && c.rank <= 9 ? 0 : -1);
export const runningCount = (cs: Card[]) => cs.reduce((s, c) => s + hiLoValue(c), 0);
/** Decks remaining as a player estimates it from the discard tray (rounded to `step` decks, min one step). */
export function decksRemaining(cardsRemaining: number, step = 0.5) {
  return Math.max(step, Math.round(cardsRemaining / 52 / step) * step);
}
/** True count = running count / decks remaining. `mode` floor (common for betting) or exact. */
export function trueCount(running: number, decksLeft: number, mode: 'exact' | 'floor' | 'round' = 'exact') {
  const t = running / Math.max(0.25, decksLeft);
  return mode === 'floor' ? Math.floor(t) : mode === 'round' ? Math.round(t) : t;
}
export interface Spread { minUnits: number; maxUnits: number; unit: number; ramp?: (tcFloor: number) => number }
/** Default ramp: TC<=1 → min; then 2×(TC−1) units (TC2=2, TC3=4, TC4=6, TC5=8), capped at max. */
export function betForTrueCount(tc: number, s: Spread = { minUnits: 1, maxUnits: 8, unit: 25 }) {
  const f = Math.floor(tc), raw = s.ramp ? s.ramp(f) : f <= 1 ? s.minUnits : 2 * (f - 1);
  const units = Math.min(s.maxUnits, Math.max(s.minUnits, raw));
  return { units, amount: units * s.unit };
}
```
