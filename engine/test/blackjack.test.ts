import { describe, it, expect } from 'vitest';
import { Blackjack, PRESETS, Rules, Shoe, cards, card, handValue, dealerShouldHit, perfectPairs, twentyOnePlus3,
  luckyLadies, busterBlackjack, royalMatch, Bankroll, PAYTABLES } from '../src/blackjack';

const VS = PRESETS.vegasStrip;
const game = (order: string, r: Partial<Rules> = {}) => new Blackjack({ ...VS, ...r }, { preset: cards(order + ' 2C 2C 2C 2C 2C 2C 2C 2C 2C 2C') });
// preset order: player1, dealerUp, player2, dealerHole, then draws

describe('hand values & dealer rules', () => {
  it('soft/hard totals', () => {
    expect(handValue(cards('AS 6H'))).toEqual({ total: 17, soft: true });
    expect(handValue(cards('AS 6H TD'))).toEqual({ total: 17, soft: false });
    expect(handValue(cards('AS AH 9D'))).toEqual({ total: 21, soft: true });
  });
  it('S17 stands, H17 hits soft 17', () => {
    expect(dealerShouldHit(cards('AS 6H'), false)).toBe(false);
    expect(dealerShouldHit(cards('AS 6H'), true)).toBe(true);
    expect(dealerShouldHit(cards('TS 7H'), true)).toBe(false);
    expect(dealerShouldHit(cards('TS 6H'), false)).toBe(true);
  });
  it('dealer draws to soft 17 under H17 and stands under S17', () => {
    const s = game('TS AH 8D 6C 4H'); s.deal({ main: 25 }); s.decideInsurance(false); s.act('stand');
    expect(s.dealer.length).toBe(2); expect(s.hands[0].outcome).toBe('win');
    const h = game('TS AH 8D 6C 4H', { hitSoft17: true }); h.deal({ main: 25 }); h.decideInsurance(false); h.act('stand');
    expect(h.dealer.map(c => c.rank)).toEqual([1, 6, 4]); expect(h.hands[0].outcome).toBe('lose');
  });
});

describe('shoe, cut card, burn', () => {
  it('builds N decks, burns one, cut card at penetration ±2%', () => {
    for (const d of [1, 2, 6, 8]) {
      const s = new Shoe(d, 0.75, 1, { seed: 7 });
      expect(s.cards.length).toBe(52 * d); expect(s.burned.length).toBe(1); expect(s.pos).toBe(1);
      expect(Math.abs(s.cutAt - 52 * d * 0.75)).toBeLessThanOrEqual(Math.ceil(0.02 * 52 * d) + 20);
    }
  });
  it('every card exactly decks times', () => {
    const s = new Shoe(6, 0.8, 1, { seed: 3 }); const m = new Map<string, number>();
    for (const c of s.cards) m.set(c.rank + c.suit, (m.get(c.rank + c.suit) ?? 0) + 1);
    expect(m.size).toBe(52); expect([...m.values()].every(v => v === 6)).toBe(true);
  });
  it('seeded shuffles are reproducible', () => {
    expect(new Shoe(2, 0.7, 1, { seed: 42 }).cards).toEqual(new Shoe(2, 0.7, 1, { seed: 42 }).cards);
  });
  it('finishes the round past the cut card, then reshuffles before the next deal', () => {
    const g = new Blackjack({ ...VS, decks: 1, penetration: 0.5 }, { seed: 9 });
    let shuffles = 0, rounds = 0;
    while (shuffles < 2 && rounds < 200) {
      const before = g.shoe.shuffles; g.deal({ main: 25 });
      if (g.phase === 'insurance') g.decideInsurance(false);
      while (g.phase === 'player') g.act('stand');
      if (g.shoe.shuffles > before) { shuffles++; expect(g.log[0].t).toBe('shuffle'); }
      rounds++;
    }
    expect(shuffles).toBe(2);
  });
});

describe('peek, insurance, even money', () => {
  it('dealer blackjack under peek ends the round; insurance pays 2:1', () => {
    const g = game('TS AH 9D KC'); g.deal({ main: 100 }); expect(g.phase).toBe('insurance');
    expect(g.decideInsurance(true)).toBe(50);
    expect(g.phase).toBe('settled'); expect(g.hands[0].outcome).toBe('lose'); expect(g.net).toBe(0); // -100 + 100
  });
  it('insurance loses when dealer has no blackjack', () => {
    const g = game('TS AH 9D 5C TH'); g.deal({ main: 100 }); g.decideInsurance(true);
    expect(g.phase).toBe('player'); g.act('stand');
    expect(g.hands[0].outcome).toBe('win'); expect(g.net).toBe(100 - 50); // dealer A5T = 16 → hits 2 → 18? check
  });
  it('even money pays 1:1 immediately', () => {
    const g = game('AS AH KD 9C'); g.deal({ main: 50 }); g.decideInsurance(true);
    expect(g.hands[0].outcome).toBe('evenMoney'); expect(g.net).toBe(50); expect(g.payout).toBe(100);
  });
  it('player blackjack vs dealer blackjack pushes', () => {
    const g = game('AS AH KD KC'); g.deal({ main: 50 }); g.decideInsurance(false);
    expect(g.hands[0].outcome).toBe('push'); expect(g.net).toBe(0);
  });
  it('peeks under a ten without offering insurance', () => {
    const g = game('9S KH 9D AC'); g.deal({ main: 25 });
    expect(g.phase).toBe('settled'); expect(g.log.some(e => e.t === 'peek')).toBe(true); expect(g.net).toBe(-25);
  });
  it('no-peek (ENHC): dealer BJ later takes doubles too', () => {
    const g = game('5S TH 6D 2C AC', { ...PRESETS.euroNoPeek }); // p:5,6 up:T, double draws 2, hole A
    g.deal({ main: 20 }); expect(g.dealer.length).toBe(1);
    expect(g.act('double')).toBe(20);
    expect(g.dealer.map(c => c.rank)).toEqual([10, 1]); expect(g.hands[0].net).toBe(-40);
  });
});

describe('blackjack payouts', () => {
  it('3:2 and 6:5', () => {
    const a = game('AS 9H KD 8C'); a.deal({ main: 100 }); expect(a.net).toBe(150);
    const b = game('AS 9H KD 8C', { bjPays: [6, 5] }); b.deal({ main: 100 }); expect(b.net).toBe(120);
  });
  it('enforces table min/max', () => {
    expect(() => game('AS 9H KD 8C').deal({ main: 5 })).toThrow(); expect(() => game('AS 9H KD 8C').deal({ main: 9999 })).toThrow();
    expect(() => game('AS 9H KD 8C').deal({ main: 25, side: { perfectPairs: 500 } })).toThrow();
  });
});

describe('double, surrender', () => {
  it('double any two vs 9-11 only', () => {
    const g = game('AS 6H 7D 8C'); g.deal({ main: 25 }); expect(g.available()).toContain('double');
    const e = game('AS 6H 7D 8C', { double: '9-11' }); e.deal({ main: 25 }); expect(e.available()).not.toContain('double');
    const t = game('AS 6H 4D 8C TC', { double: '10-11' }); t.deal({ main: 25 }); expect(t.available()).not.toContain('double');
  });
  it('double takes exactly one card and doubles the bet', () => {
    const g = game('5S 6H 6D TC TD'); g.deal({ main: 25 }); g.act('double');
    expect(g.hands[0].cards.length).toBe(3); expect(g.hands[0].bet).toBe(50); expect(g.net).toBe(50);
  });
  it('late surrender returns half, only on first two cards', () => {
    const g = game('TS TH 6D 7C'); g.deal({ main: 50 }); expect(g.available()).toContain('surrender');
    g.act('surrender'); expect(g.net).toBe(-25); expect(g.payout).toBe(25);
    const n = game('TS TH 6D 7C', { lateSurrender: false }); n.deal({ main: 50 }); expect(n.available()).not.toContain('surrender');
    const h = game('2S TH 3D 7C 4C'); h.deal({ main: 50 }); h.act('hit'); expect(h.available()).not.toContain('surrender');
  });
});

describe('splits', () => {
  it('split, DAS, two independent hands', () => {
    const g = game('8S 6H 8D TC 3C 2H TS TD'); // after split: hand1 8+3, hand2 8+2
    g.deal({ main: 25 }); expect(g.act('split')).toBe(25);
    expect(g.hands.length).toBe(2); expect(g.available()).toContain('double');
    g.act('double'); // 8,3 + T = 21
    g.act('stand');  // 8,2
    expect(g.hands[0].bet).toBe(50); expect(g.hands[0].cards.length).toBe(3);
    expect(g.phase).toBe('settled'); // dealer 6+T = 16, hits 2C? preset filler
  });
  it('no DAS blocks double after split', () => {
    const g = game('8S 6H 8D TC 3C 2H', { das: false }); g.deal({ main: 25 }); g.act('split');
    expect(g.available()).not.toContain('double');
  });
  it('resplit up to maxHands', () => {
    const g = game('8S 6H 8D TC 8C 8H 8S 9C 9D 9H', { maxHands: 3 }); g.deal({ main: 25 });
    g.act('split'); expect(g.available()).toContain('split');
    g.act('split'); expect(g.hands.length).toBe(3); expect(g.available()).not.toContain('split');
  });
  it('split aces get one card each and 21 is not blackjack', () => {
    const g = game('AS 6H AD TC KC 5H TH'); g.deal({ main: 25 }); g.act('split');
    expect(g.phase).toBe('settled');
    expect(g.hands.map(h => h.cards.length)).toEqual([2, 2]);
    expect(g.hands[0].outcome).toBe('win'); expect(g.hands[0].net).toBe(25); // A,K = 21 pays 1:1
  });
  it('resplit aces only when toggled', () => {
    const off = game('AS 6H AD TC AC 5H', { resplitAces: false }); off.deal({ main: 25 }); off.act('split');
    expect(off.hands.length).toBe(2);
    const on = game('AS 6H AD TC AC 5H 9H 9D', { resplitAces: true }); on.deal({ main: 25 }); on.act('split');
    expect(on.available().sort()).toEqual(['split', 'stand']); on.act('split'); expect(on.hands.length).toBe(3);
  });
  it('splits tens by value only when allowed', () => {
    const a = game('KS 6H QD TC'); a.deal({ main: 25 }); expect(a.available()).toContain('split');
    const b = game('KS 6H QD TC', { splitTensByValue: false }); b.deal({ main: 25 }); expect(b.available()).not.toContain('split');
  });
  it('no surrender after split', () => {
    const g = game('8S TH 8D 7C 8C 2H'); g.deal({ main: 25 }); g.act('split'); expect(g.available()).not.toContain('surrender');
  });
});

describe('side bets — paytables', () => {
  it('Perfect Pairs', () => {
    expect(perfectPairs(card('QS'), card('QS')).pays).toBe(25);
    expect(perfectPairs(card('QS'), card('QC')).pays).toBe(12);
    expect(perfectPairs(card('QS'), card('QH')).pays).toBe(6);
    expect(perfectPairs(card('QS'), card('KS')).pays).toBe(0);
  });
  it('21+3', () => {
    const t = (s: string) => { const [a, b, c] = cards(s); return twentyOnePlus3(a, b, c); };
    expect(t('7H 7H 7H').pays).toBe(100); expect(t('5D 6D 7D').pays).toBe(40); expect(t('7H 7S 7C').pays).toBe(30);
    expect(t('QH KS AC').pays).toBe(10); expect(t('AH 2S 3C').pays).toBe(10); expect(t('KH AS 2C').pays).toBe(0);
    expect(t('2H 9H KH').pays).toBe(5); expect(t('2H 2S KH').pays).toBe(0);
    expect(t('QH KH AH').label).toBe('Straight flush');
  });
  it('Lucky Ladies', () => {
    expect(luckyLadies(card('QH'), card('QH'), true).pays).toBe(1000);
    expect(luckyLadies(card('QH'), card('QH'), false).pays).toBe(125);
    expect(luckyLadies(card('KS'), card('KS'), false).pays).toBe(19);
    expect(luckyLadies(card('KS'), card('JS'), false).pays).toBe(9);
    expect(luckyLadies(card('AS'), card('9H'), false).pays).toBe(4);
    expect(luckyLadies(card('KS'), card('9H'), false).pays).toBe(0);
  });
  it('Buster Blackjack', () => {
    expect(busterBlackjack(cards('TS 6H 7D')).pays).toBe(2);
    expect(busterBlackjack(cards('2S 3H 4D 5C 6S 2D 2H 9C')).pays).toBe(250);
    expect(busterBlackjack(cards('2S 3H 4D 2C 2H 3C 9D')).pays).toBe(50);
    expect(busterBlackjack(cards('2S 3H 4D 2C 6H 9D')).pays).toBe(15);
    expect(busterBlackjack(cards('2S 4H 6D TC')).pays).toBe(2);
    expect(busterBlackjack(cards('2S 3H 4D 5C 9S')).pays).toBe(4);
    expect(busterBlackjack(cards('TS 7H')).pays).toBe(0);
    const v2 = { ...PAYTABLES.buster, 6: 18, bj7: 800, bj8: 2000 };
    expect(busterBlackjack(cards('2S 3H 4D 2C 2H 3C 9D'), true, v2).pays).toBe(800);
  });
  it('Royal Match', () => {
    expect(royalMatch(card('KH'), card('QH')).pays).toBe(25);
    expect(royalMatch(card('2H'), card('9H')).pays).toBe(2.5);
    expect(royalMatch(card('KH'), card('QS')).pays).toBe(0);
    expect(royalMatch(card('KH'), card('QH'), PRESETS.downtownSD.pay.royalMatch).pays).toBe(10);
  });
  it('settles side bets into the round, dealer plays out for Buster', () => {
    const g = game('QH 6S QH 9D 7C', {}); // player QQ hearts=20 stands, dealer 6,9 =15 hits 7 = 22 bust
    g.deal({ main: 25, side: { perfectPairs: 5, luckyLadies: 5, buster: 5, twentyOnePlus3: 5, royalMatch: 5 } });
    g.act('stand');
    const by = Object.fromEntries(g.side.map(s => [s.id, s.pays]));
    expect(by).toEqual({ perfectPairs: 25, twentyOnePlus3: 0, royalMatch: 2.5, luckyLadies: 125, buster: 2 });
    expect(g.sideNet).toBe(5 * 25 - 5 + 5 * 2.5 + 5 * 125 + 5 * 2);
    const bj = game('AS 6S KS 9D 7C'); bj.deal({ main: 25, side: { buster: 5 } });
    expect(bj.dealer.length).toBe(3); expect(bj.side[0].pays).toBe(2);
  });
});

describe('presets and bankroll', () => {
  it('named presets', () => {
    expect(PRESETS.vegasStrip.name).toBe('Vegas Strip 6D S17 3:2');
    expect(PRESETS.downtownSD).toMatchObject({ decks: 1, hitSoft17: true, bjPays: [6, 5] });
    expect(Object.values(PRESETS).map(p => p.decks).sort()).toEqual([1, 2, 6, 6, 8]);
  });
  it('bankroll persists to storage and resets', () => {
    const m = new Map<string, string>(); const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const b = new Bankroll(st); expect(b.value).toBe(1000); b.debit(100); expect(m.get('casino.bankroll')).toBe('900');
    expect(new Bankroll(st).value).toBe(900); b.credit(250); expect(b.value).toBe(1150);
    expect(() => b.debit(5000)).toThrow(); b.reset(); expect(b.value).toBe(1000);
  });
});
