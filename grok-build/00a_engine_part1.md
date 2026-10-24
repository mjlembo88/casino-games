This is a new project called "Casino Blackjack": a play-money casino blackjack game for Marcus. Don't build any UI yet.

Step 1 of 2 for the rules engine: create the file `src/games/blackjack/engine.ts` with EXACTLY the TypeScript below (part 1 of 2). Don't change, reformat, or "improve" it, because it's a unit-tested reference implementation. My next message has part 2, which must be appended to the same file. Reply only "part 1 saved".

```ts
// Casino Kit — Blackjack rules engine (pure TS, no DOM). Play money only.
// Reference implementation for Grok Build. Rules spec: BLACKJACK_RULES.md
export type Suit = 'S' | 'H' | 'D' | 'C';
export interface Card { rank: number; suit: Suit } // rank 1=A … 11=J 12=Q 13=K
const RANKS = 'A23456789TJQK';
export const card = (s: string): Card => ({ rank: RANKS.indexOf(s[0]) + 1, suit: s[1] as Suit });
export const cards = (s: string): Card[] => s.trim().split(/\s+/).map(card);
export const cardStr = (c: Card) => RANKS[c.rank - 1] + c.suit;
export const pip = (c: Card) => (c.rank === 1 ? 1 : Math.min(10, c.rank));
export const isRed = (c: Card) => c.suit === 'H' || c.suit === 'D';

export function handValue(cs: Card[]): { total: number; soft: boolean } {
  let t = 0, ace = false;
  for (const c of cs) { t += pip(c); if (c.rank === 1) ace = true; }
  if (ace && t + 10 <= 21) return { total: t + 10, soft: true };
  return { total: t, soft: false };
}
export const isNatural = (cs: Card[]) => cs.length === 2 && handValue(cs).total === 21;

// ---------- Rules & presets ----------
export type DoubleRule = 'any' | '9-11' | '10-11';
export interface PayTables {
  perfectPairs: { perfect: number; colored: number; mixed: number };
  twentyOnePlus3: { suitedTrips: number; straightFlush: number; trips: number; straight: number; flush: number };
  luckyLadies: { qhPairDealerBJ: number; qhPair: number; matched20: number; suited20: number; any20: number };
  buster: { 3: number; 4: number; 5: number; 6: number; 7: number; 8: number; bj7?: number; bj8?: number };
  royalMatch: { royal: number; easy: number };
}
export interface Rules {
  name: string; decks: 1 | 2 | 6 | 8; penetration: number; burn: number;
  hitSoft17: boolean; peek: boolean; insurance: boolean;
  bjPays: [number, number]; double: DoubleRule; das: boolean;
  maxHands: number; resplitAces: boolean; splitTensByValue: boolean;
  lateSurrender: boolean; min: number; max: number; sideMax: number;
  sideBets: SideBetId[]; pay: PayTables;
}
export type SideBetId = 'perfectPairs' | 'twentyOnePlus3' | 'luckyLadies' | 'buster' | 'royalMatch';
export const PAYTABLES: PayTables = {
  perfectPairs: { perfect: 25, colored: 12, mixed: 6 },                 // WoO Perfect Pairs v1 table A
  twentyOnePlus3: { suitedTrips: 100, straightFlush: 40, trips: 30, straight: 10, flush: 5 }, // WoO 21+3 v7
  luckyLadies: { qhPairDealerBJ: 1000, qhPair: 125, matched20: 19, suited20: 9, any20: 4 },   // WoO LL table A
  buster: { 3: 2, 4: 2, 5: 4, 6: 15, 7: 50, 8: 250 },                   // WoO Buster v1 (AGS)
  royalMatch: { royal: 25, easy: 2.5 },                                  // WoO Royal Match v1 (6D)
};
const base: Omit<Rules, 'name'> = {
  decks: 6, penetration: 0.8, burn: 1, hitSoft17: false, peek: true, insurance: true,
  bjPays: [3, 2], double: 'any', das: true, maxHands: 4, resplitAces: false, splitTensByValue: true,
  lateSurrender: true, min: 25, max: 5000, sideMax: 100,
  sideBets: ['perfectPairs', 'twentyOnePlus3', 'luckyLadies', 'buster', 'royalMatch'], pay: PAYTABLES,
};
export const PRESETS: Record<string, Rules> = {
  vegasStrip: { ...base, name: 'Vegas Strip 6D S17 3:2' },
  downtownSD: { ...base, name: 'Downtown single deck H17 6:5', decks: 1, penetration: 0.65, hitSoft17: true,
    bjPays: [6, 5], das: false, maxHands: 2, lateSurrender: false, min: 5, max: 500, sideMax: 25,
    pay: { ...PAYTABLES, royalMatch: { royal: 10, easy: 3 } } },               // WoO Royal Match v2 (1D)
  doubleDeck: { ...base, name: 'Double deck H17 3:2 (pitch)', decks: 2, penetration: 0.7, hitSoft17: true,
    double: 'any', lateSurrender: false, min: 10, max: 2000, sideMax: 50 },
  atlantic8: { ...base, name: 'Atlantic City 8D S17 3:2 LS', decks: 8, penetration: 0.83, min: 15, max: 5000 },
  euroNoPeek: { ...base, name: 'European 6D no-hole-card S17', peek: false, double: '9-11', lateSurrender: false, min: 10, max: 1000 },
};

// ---------- RNG & Shoe ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export class Shoe {
  cards: Card[] = []; pos = 0; cutAt = 0; burned: Card[] = []; shuffles = 0; private rng: () => number;
  constructor(public decks: number, public penetration: number, public burnCount = 1,
    opts: { seed?: number; rng?: () => number; preset?: Card[] } = {}) {
    this.rng = opts.rng ?? (opts.seed !== undefined ? mulberry32(opts.seed) : Math.random);
    if (opts.preset) { this.cards = opts.preset.slice(); this.cutAt = Math.max(1, Math.floor(this.cards.length * penetration)); }
    else this.shuffle();
  }
  get size() { return this.decks * 52; }
  get remaining() { return this.cards.length - this.pos; }
  /** true once the cut card has come out; reshuffle before the next round. */
  get needsShuffle() { return this.pos >= this.cutAt; }
  shuffle() {
    const d: Card[] = [];
    for (let n = 0; n < this.decks; n++) for (const s of ['S', 'H', 'D', 'C'] as Suit[]) for (let r = 1; r <= 13; r++) d.push({ rank: r, suit: s });
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    this.cards = d; this.pos = 0; this.shuffles++;
    const jitter = Math.floor((this.rng() - 0.5) * 0.04 * d.length); // ±2% like a human cut
    this.cutAt = Math.min(d.length - 15, Math.max(20, Math.floor(d.length * this.penetration) + jitter));
    this.burned = []; for (let i = 0; i < this.burnCount; i++) this.burned.push(this.cards[this.pos++]);
  }
  draw(): Card { if (this.pos >= this.cards.length) this.shuffle(); return this.cards[this.pos++]; }
}

// ---------- Side bets ----------
export interface SideResult { id: SideBetId; label: string; pays: number } // pays = "to 1"; 0 => lose
export function perfectPairs(a: Card, b: Card, p = PAYTABLES.perfectPairs): SideResult {
  const id = 'perfectPairs';
  if (a.rank !== b.rank) return { id, label: 'No pair', pays: 0 };
  if (a.suit === b.suit) return { id, label: 'Perfect pair', pays: p.perfect };
  if (isRed(a) === isRed(b)) return { id, label: 'Colored pair', pays: p.colored };
  return { id, label: 'Mixed pair', pays: p.mixed };
}
export function twentyOnePlus3(a: Card, b: Card, up: Card, p = PAYTABLES.twentyOnePlus3): SideResult {
  const id = 'twentyOnePlus3', cs = [a, b, up];
  const flush = cs.every(c => c.suit === a.suit);
  const trips = cs.every(c => c.rank === a.rank);
  const r = cs.map(c => c.rank).sort((x, y) => x - y);
  const straight = !trips && new Set(r).size === 3 && ((r[2] - r[0] === 2) || (r[0] === 1 && r[1] === 12 && r[2] === 13));
  if (trips && flush) return { id, label: 'Suited three of a kind', pays: p.suitedTrips };
  if (straight && flush) return { id, label: 'Straight flush', pays: p.straightFlush };
  if (trips) return { id, label: 'Three of a kind', pays: p.trips };
  if (straight) return { id, label: 'Straight', pays: p.straight };
  if (flush) return { id, label: 'Flush', pays: p.flush };
  return { id, label: 'No hand', pays: 0 };
}
export function luckyLadies(a: Card, b: Card, dealerBJ: boolean, p = PAYTABLES.luckyLadies): SideResult {
  const id = 'luckyLadies';
  if (handValue([a, b]).total !== 20) return { id, label: 'No 20', pays: 0 };
  const qh = (c: Card) => c.rank === 12 && c.suit === 'H';
  if (qh(a) && qh(b)) return dealerBJ ? { id, label: 'Q♥ pair + dealer blackjack', pays: p.qhPairDealerBJ } : { id, label: 'Q♥ pair', pays: p.qhPair };
  if (a.rank === b.rank && a.suit === b.suit) return { id, label: 'Matched 20', pays: p.matched20 };
  if (a.suit === b.suit) return { id, label: 'Suited 20', pays: p.suited20 };
  return { id, label: 'Any 20', pays: p.any20 };
}
export function busterBlackjack(dealer: Card[], playerBJ = false, p = PAYTABLES.buster): SideResult {
  const id = 'buster', n = dealer.length;
  if (handValue(dealer).total <= 21) return { id, label: 'Dealer did not bust', pays: 0 };
  if (playerBJ && n >= 8 && p.bj8) return { id, label: `Bust with ${n} cards + player BJ`, pays: p.bj8 };
  if (playerBJ && n === 7 && p.bj7) return { id, label: 'Bust with 7 cards + player BJ', pays: p.bj7 };
  const k = Math.min(8, n) as 3 | 4 | 5 | 6 | 7 | 8;
  return { id, label: `Dealer busts with ${n} cards`, pays: p[k] };
}
export function royalMatch(a: Card, b: Card, p = PAYTABLES.royalMatch): SideResult {
  const id = 'royalMatch';
  if (a.suit !== b.suit) return { id, label: 'No match', pays: 0 };
  const kq = [a.rank, b.rank].sort((x, y) => x - y).join() === '12,13';
  return kq ? { id, label: 'Royal match (suited K-Q)', pays: p.royal } : { id, label: 'Easy match (suited)', pays: p.easy };
}

```
