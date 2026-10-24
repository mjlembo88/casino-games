Step 2 of 2: APPEND the TypeScript below to the end of `src/games/blackjack/engine.ts`, right after part 1, unchanged. Then make sure the file compiles (it has no imports and no DOM use). Still don't build any UI. Reply "engine saved" plus the file's line count.

```ts
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
```
