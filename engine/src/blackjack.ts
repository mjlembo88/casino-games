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

// ---------- Dealer ----------
export function dealerShouldHit(cs: Card[], hitSoft17: boolean) {
  const v = handValue(cs);
  return v.total < 17 || (v.total === 17 && v.soft && hitSoft17);
}

// ---------- Round ----------
export type Phase = 'betting' | 'insurance' | 'player' | 'dealer' | 'settled';
export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';
export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'surrender' | 'evenMoney' | '';
export interface Hand { cards: Card[]; bet: number; doubled: boolean; fromSplit: boolean; splitAces: boolean; done: boolean; outcome: Outcome; net: number }
export interface Bets { main: number; side?: Partial<Record<SideBetId, number>> }
export interface RoundEvent { t: string; [k: string]: unknown }
export interface Storage { getItem(k: string): string | null; setItem(k: string, v: string): void }

export class Bankroll {
  constructor(private store?: Storage, public key = 'casino.bankroll', public start = 1000) {}
  private mem: number | null = null;
  get value(): number { const raw = this.store ? this.store.getItem(this.key) : null; const v = raw === null ? this.mem ?? this.start : Number(raw); return Number.isFinite(v) ? v : this.start; }
  set value(v: number) { v = Math.round(v * 100) / 100; this.mem = v; this.store?.setItem(this.key, String(v)); }
  debit(n: number) { if (n > this.value) throw new Error('insufficient bankroll'); this.value = this.value - n; }
  credit(n: number) { this.value = this.value + n; }
  reset() { this.value = this.start; }
}

export class Blackjack {
  phase: Phase = 'betting'; shoe: Shoe; hands: Hand[] = []; active = 0; dealer: Card[] = [];
  bets: Bets = { main: 0 }; insurance = 0; evenMoneyTaken = false; side: SideResult[] = []; sideNet = 0;
  log: RoundEvent[] = []; private holeDealt = false;
  constructor(public rules: Rules, opts: { seed?: number; preset?: Card[]; rng?: () => number } = {}) {
    this.shoe = new Shoe(rules.decks, rules.penetration, opts.preset ? 0 : rules.burn, opts);
  }
  private ev(t: string, d: Record<string, unknown> = {}) { this.log.push({ t, ...d }); }
  get hand() { return this.hands[this.active]; }
  get dealerUp() { return this.dealer[0]; }

  /** Validates and starts a round; returns total staked (debit it from the bankroll). */
  deal(bets: Bets): number {
    const R = this.rules;
    if (this.phase !== 'betting' && this.phase !== 'settled') throw new Error('round in progress');
    if (bets.main < R.min || bets.main > R.max) throw new Error(`bet must be ${R.min}-${R.max}`);
    for (const [k, v] of Object.entries(bets.side ?? {})) {
      if (!v) continue; if (!R.sideBets.includes(k as SideBetId)) throw new Error(`${k} not offered`);
      if (v < 0 || v > R.sideMax) throw new Error(`side bet max ${R.sideMax}`);
    }
    this.log = [];
    if (this.shoe.needsShuffle) { this.shoe.shuffle(); this.ev('shuffle'); }
    this.bets = bets; this.insurance = 0; this.evenMoneyTaken = false; this.side = []; this.sideNet = 0;
    const h: Hand = { cards: [], bet: bets.main, doubled: false, fromSplit: false, splitAces: false, done: false, outcome: '', net: 0 };
    this.hands = [h]; this.active = 0; this.dealer = []; this.holeDealt = R.peek;
    h.cards.push(this.shoe.draw()); this.dealer.push(this.shoe.draw()); h.cards.push(this.shoe.draw());
    if (R.peek) this.dealer.push(this.shoe.draw());
    this._orig = h.cards.slice(); this.ev('deal');
    const [a, b] = h.cards, sb = bets.side ?? {};
    if (sb.perfectPairs) this.side.push(perfectPairs(a, b, R.pay.perfectPairs));
    if (sb.twentyOnePlus3) this.side.push(twentyOnePlus3(a, b, this.dealerUp, R.pay.twentyOnePlus3));
    if (sb.royalMatch) this.side.push(royalMatch(a, b, R.pay.royalMatch));
    if (R.insurance && this.dealerUp.rank === 1) { this.phase = 'insurance'; this.ev('insurance', { evenMoney: isNatural(h.cards) }); }
    else this.afterInsurance();
    return bets.main + Object.values(sb).reduce((s, v) => s + (v || 0), 0);
  }
  /** Insurance (up to half the bet) or, with a player blackjack, even money. Returns extra stake. */
  decideInsurance(take: boolean, amount = this.bets.main / 2): number {
    if (this.phase !== 'insurance') throw new Error('no insurance offered');
    let stake = 0;
    if (take && isNatural(this.hands[0].cards)) this.evenMoneyTaken = true;
    else if (take) { this.insurance = Math.min(amount, this.bets.main / 2); stake = this.insurance; }
    this.afterInsurance(); return stake;
  }
  private dealerHasBJ() { return this.dealer.length === 2 && isNatural(this.dealer); }
  private afterInsurance() {
    const h = this.hands[0], up = this.dealerUp;
    if (this.evenMoneyTaken) { h.outcome = 'evenMoney'; h.net = h.bet; h.done = true; this.ev('evenMoney'); }
    if (this.rules.peek && (pip(up) >= 10 || up.rank === 1)) {
      this.ev('peek');
      if (this.dealerHasBJ()) { this.ev('dealerBlackjack'); return this.settle(); }
    }
    if (h.done || isNatural(h.cards)) { h.done = true; return this.toDealer(); }
    this.phase = 'player'; this.ev('turn', { hand: 0 });
  }
  available(): Action[] {
    if (this.phase !== 'player') return [];
    const h = this.hand, R = this.rules, out: Action[] = [];
    if (h.splitAces && !(R.resplitAces && h.cards.length === 2 && h.cards[1].rank === 1)) return ['stand'];
    out.push('hit', 'stand');
    if (h.cards.length === 2) {
      const t = handValue(h.cards).total, hard = !handValue(h.cards).soft;
      const okTotal = R.double === 'any' || (R.double === '9-11' ? hard && t >= 9 && t <= 11 : hard && t >= 10 && t <= 11);
      if (okTotal && (!h.fromSplit || R.das)) out.push('double');
      const [x, y] = h.cards, pair = R.splitTensByValue ? pip(x) === pip(y) : x.rank === y.rank;
      if (pair && this.hands.length < R.maxHands && (!h.splitAces || R.resplitAces)) out.push('split');
      if (R.lateSurrender && !h.fromSplit && this.hands.length === 1) out.push('surrender');
    }
    if (h.splitAces) return out.filter(a => a === 'split' || a === 'stand');
    return out;
  }
  /** Perform an action; returns extra stake required (double/split). */
  act(a: Action): number {
    if (!this.available().includes(a)) throw new Error(`${a} not allowed`);
    const h = this.hand; let stake = 0; this.ev(a, { hand: this.active });
    if (a === 'hit') { h.cards.push(this.shoe.draw()); if (handValue(h.cards).total >= 21) h.done = true; }
    else if (a === 'stand') h.done = true;
    else if (a === 'double') { stake = h.bet; h.bet *= 2; h.doubled = true; h.cards.push(this.shoe.draw()); h.done = true; }
    else if (a === 'surrender') { h.outcome = 'surrender'; h.net = -h.bet / 2; h.done = true; }
    else if (a === 'split') {
      stake = h.bet; const aces = h.cards[0].rank === 1;
      const n: Hand = { cards: [h.cards.pop()!], bet: h.bet, doubled: false, fromSplit: true, splitAces: aces, done: false, outcome: '', net: 0 };
      h.fromSplit = true; h.splitAces = aces; this.hands.splice(this.active + 1, 0, n);
      h.cards.push(this.shoe.draw()); if (handValue(h.cards).total === 21) h.done = true;
      if (aces && !(this.rules.resplitAces && h.cards[1].rank === 1 && this.hands.length < this.rules.maxHands)) h.done = true;
    }
    this.advance(); return stake;
  }
  private advance() {
    while (this.active < this.hands.length && this.hands[this.active].done) {
      this.active++;
      const n = this.hands[this.active];
      if (n && n.cards.length === 1) {
        n.cards.push(this.shoe.draw());
        const canResplit = this.rules.resplitAces && n.cards[1].rank === 1 && this.hands.length < this.rules.maxHands;
        if (n.splitAces && !canResplit) n.done = true;
        if (handValue(n.cards).total === 21) n.done = true;
      }
    }
    if (this.active >= this.hands.length) return this.toDealer();
    const h = this.hand; if (h.cards.length === 1) { h.cards.push(this.shoe.draw()); }
    this.ev('turn', { hand: this.active });
  }
  private toDealer() {
    this.phase = 'dealer';
    if (!this.holeDealt) { this.dealer.push(this.shoe.draw()); this.holeDealt = true; }
    this.ev('reveal', { total: handValue(this.dealer).total });
    const live = this.hands.some(h => h.outcome !== 'surrender' && h.outcome !== 'evenMoney' && handValue(h.cards).total <= 21 && !(isNatural(h.cards) && !h.fromSplit));
    const mustPlay = live || !!this.bets.side?.buster;
    if (mustPlay && !this.dealerHasBJ()) while (dealerShouldHit(this.dealer, this.rules.hitSoft17)) { this.dealer.push(this.shoe.draw()); this.ev('dealerHit'); }
    this.settle();
  }
  /** Settles everything. Hand.net / sideNet are win(+)/loss(-) relative to stake. */
  private settle() {
    if (!this.holeDealt) { this.dealer.push(this.shoe.draw()); this.holeDealt = true; }
    const R = this.rules, d = handValue(this.dealer).total, dBJ = this.dealerHasBJ(), [bn, bd] = R.bjPays;
    for (const h of this.hands) {
      if (h.outcome === 'surrender' || h.outcome === 'evenMoney') continue;
      const v = handValue(h.cards).total, pBJ = isNatural(h.cards) && !h.fromSplit;
      if (pBJ && dBJ) { h.outcome = 'push'; h.net = 0; }
      else if (dBJ) { h.outcome = 'lose'; h.net = -h.bet; } // no-peek: lose doubles/splits too
      else if (pBJ) { h.outcome = 'blackjack'; h.net = h.bet * bn / bd; }
      else if (v > 21) { h.outcome = 'bust'; h.net = -h.bet; }
      else if (d > 21 || v > d) { h.outcome = 'win'; h.net = h.bet; }
      else if (v === d) { h.outcome = 'push'; h.net = 0; }
      else { h.outcome = 'lose'; h.net = -h.bet; }
    }
    if (this.insurance) this.ev('insuranceResult', { net: dBJ ? this.insurance * 2 : -this.insurance });
    const sb = this.bets.side ?? {}, [a, b] = this._orig;
    if (sb.luckyLadies) this.side.push(luckyLadies(a, b, dBJ, R.pay.luckyLadies));
    if (sb.buster) this.side.push(busterBlackjack(this.dealer, isNatural(this._orig), R.pay.buster));
    this.sideNet = this.side.reduce((s, r) => s + (r.pays ? (sb[r.id] ?? 0) * r.pays : -(sb[r.id] ?? 0)), 0);
    this.phase = 'settled'; this.ev('settled', { dealer: d, net: this.net });
  }
  private _orig: Card[] = [];
  /** Original two player cards (before any split). */
  get origCards(): Card[] { return this._orig; }
  /** Net result of the round including insurance and side bets. */
  get net(): number {
    const ins = this.insurance ? (this.dealerHasBJ() ? this.insurance * 2 : -this.insurance) : 0;
    return this.hands.reduce((s, h) => s + h.net, 0) + ins + this.sideNet;
  }
  /** Amount to credit back to the bankroll at settlement (stakes returned + winnings). */
  get payout(): number {
    const sb = this.bets.side ?? {}, sideStake = Object.values(sb).reduce((s, v) => s + (v || 0), 0);
    return this.hands.reduce((s, h) => s + h.bet, 0) + this.insurance + sideStake + this.net;
  }
}
