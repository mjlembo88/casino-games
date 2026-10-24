# Casino Blackjack: exact rules spec (v0.1, 2026-10-23)

This is play money only. The reference implementation is `engine/src/blackjack.ts` (table, round, side bets, bankroll) plus `engine/src/strategy.ts` (basic strategy and Hi-Lo). Tests are in `engine/test/`, and every number below is asserted there.

## 1. Table setup
| Mode | Decks | Dealing | Penetration (cut card) | Burn |
|---|---|---|---|---|
| Single deck | 1 | hand-pitched (player cards face down in the UI style; values identical) | 65% (~34 cards) | 1 |
| Double deck | 2 | hand-pitched | 70% (~73 cards) | 1 |
| 6-deck shoe | 6 | dealt from shoe, all player cards face up | 80% (~250 cards) | 1 |
| 8-deck shoe | 8 | dealt from shoe | 83% (~345 cards) | 1 |
- **Shuffle:** an unbiased Fisher-Yates over `decks × 52` cards. It's seedable (mulberry32) for tests and replays.
- **Cut card:** placed at `penetration × cards ± 2%` (a "human cut"), clamped to at least 20 cards from the top and at least 15 from the bottom.
- **Burn:** after every shuffle, `burn` cards (default 1) go straight to the discard tray, and the UI shows the burn animation.
- **Reshuffle at the cut card:**
  - When the cut card comes out, the current round is **finished**, and the shoe is reshuffled before the next deal (event `shuffle`, voice "Shuffling").
  - If the shoe is exhausted mid-round (which shouldn't happen with these penetrations), a fresh shoe is shuffled and dealing continues.
- **Deal order (US):**
  - Player 1st card, then the dealer up card, then the player 2nd card, then the dealer hole card.
  - With `peek: false` (European no-hole-card), the dealer's second card is dealt only when the dealer's turn starts.

## 2. Dealer play
- **S17/H17 toggle (`hitSoft17`):** the dealer hits any total below 17. On soft 17 (an ace counted as 11), the dealer stands under S17 and hits under H17. The dealer always stands on hard 17+ and on soft 18+.
- **Peek (`peek: true`, US hole card):**
  - With an ace or a ten-value card up, the dealer checks for blackjack. With an ace up, this happens after insurance is decided.
  - If the dealer has blackjack, the round ends immediately. Player blackjacks push, and every other hand loses only the original bet.
- **No peek (`peek: false`, ENHC):** if the dealer ends with blackjack, every player hand loses **all** money wagered on it, including doubles and splits. A player blackjack still pushes.
- **Dealer drawing:**
  - The dealer draws to completion only if at least one player hand is still live (not busted, surrendered, paid even money, or a natural).
  - **Exception:** when a Buster Blackjack bet is active, the dealer always plays out the hand, which is the standard rule for that bet.
- **Insurance:**
  - Offered only when the dealer's up card is an ace (`insurance: true`).
  - The stake is up to half the main bet, and it pays **2:1** if the dealer has blackjack; otherwise it's lost.
  - Under no-peek, it's resolved at the end of the round.
- **Even money:**
  - If the player has blackjack and the dealer shows an ace, the insurance offer becomes "Even money?".
  - Taking it pays the main bet **1:1 immediately**, and the hand is closed. Declining keeps the natural, which pays at the table's rate unless the dealer also has blackjack (push).

## 3. Player options
| Option | Rule (engine field) |
|---|---|
| Hit / Stand | Always allowed while the hand is < 21. A hand of 21 auto-stands. |
| Double | Exactly one more card at double the bet. `double: 'any'` = any first two cards. `'9-11'` = hard 9, 10, 11 only. `'10-11'` = hard 10 or 11. |
| Double after split | `das` toggle. |
| Split | Two cards of the same rank. `splitTensByValue: true` also allows any two ten-value cards (K-Q). Each split hand receives a second card and is played in order. |
| Resplit to N | `maxHands` (default 4; 2 means no resplit). |
| Split aces | Each ace gets **exactly one card** and the hand auto-stands. A 10 on a split ace is 21, **not** blackjack (pays 1:1). |
| Resplit aces | `resplitAces` toggle. If an ace is drawn to a split ace and the hand limit isn't reached, the player may split again (only split or stand are offered). |
| Late surrender | `lateSurrender` toggle. Only on the first two cards of the original hand (never after a split or hit), and only after the dealer's peek. It returns half the bet. |
| Insurance / even money | See §2. |

## 4. Payouts and limits
- **Blackjack pays** `bjPays`: **3:2** (default) or **6:5**. A $25 natural pays $37.50 at 3:2 and $30 at 6:5.
- **Other results:** a win pays 1:1, a push returns the bet, and a loss takes it. Surrender returns half.
- **Limits:**
  - `min` ≤ main bet ≤ `max`.
  - Each side bet is ≤ `sideMax` and only allowed if it's in `sideBets`.
  - Doubles and splits need a bankroll ≥ the original bet; the UI checks this.
- **Chips:** 1, 5, 25, 100, 500, 1K, 5K (colors are in `CASINO_KIT.md`).
- **Settlement accounting** (on the `Blackjack` class):
  - `deal()` returns the stake to debit.
  - `decideInsurance()` and `act()` return extra stakes (insurance, double, split).
  - After `settled`, `payout` is the amount to credit back (stakes plus winnings), and `net` is the round's win or loss.

## 5. Side bets: real, commonly published paytables ("to 1")
All of them use the player's first two cards (before any split).

**Perfect Pairs** (player's two cards). Source: Wizard of Odds, Perfect Pairs version 1, pay table A (Evolution live dealer): https://wizardofodds.com/games/blackjack/side-bets/perfect-pairs/
| Hand | Pays |
|---|---|
| Perfect pair (same rank and suit) | 25 |
| Colored pair (same rank and color) | 12 |
| Mixed pair (red/black) | 6 |
The house edge is 4.10% (8 decks) and 6.11% (6 decks). On a single deck a perfect pair is impossible, but the bet is still offered there and simply can't hit the top pay.

**21+3** (player's two cards plus the dealer's up card, as a 3-card poker hand). Source: Wizard of Odds, 21+3 version 7 (Evolution, 8 decks): https://wizardofodds.com/games/blackjack/side-bets/21plus3/
| Hand | Pays |
|---|---|
| Suited three of a kind | 100 |
| Straight flush | 40 |
| Three of a kind | 30 |
| Straight | 10 |
| Flush | 5 |
- Straights: A-2-3 and Q-K-A count, but K-A-2 doesn't. Only the highest hand pays.
- The house edge is 3.70% (8 decks).
- The classic Las Vegas Hilton version (a flat 9 to 1 on any of the hands) is on the same page if a "classic" table is wanted.

**Lucky Ladies** (player's first two cards total 20). Source: Wizard of Odds, Lucky Ladies pay table A: https://wizardofodds.com/games/blackjack/side-bets/lucky-ladies/
| Hand | Pays |
|---|---|
| Q♥ pair + dealer blackjack | 1000 |
| Q♥ pair | 125 |
| Matched 20 (same rank and suit) | 19 |
| Suited 20 | 9 |
| Any 20 | 4 |
The house edge is 24.71% (6 decks). It's resolved once the dealer's blackjack status is known.

**Buster Blackjack** (wins if the dealer busts; pays by the number of cards in the busted dealer hand). Source: Wizard of Odds, Buster Blackjack version 1 (AGS): https://wizardofodds.com/games/blackjack/side-bets/buster-blackjack/
| Dealer busts with | Pays |
|---|---|
| 8+ cards | 250 |
| 7 cards | 50 |
| 6 cards | 15 |
| 5 cards | 4 |
| 3 or 4 cards | 2 |
- The dealer always plays out the hand when this bet is active.
- **Discrepancy to know:** WoO's version 1 pay table lists 6 cards at 15, but its six-deck H17 analysis row uses 12. The engine uses the published pay table (15).
- WoO's version 2 (6 cards at 18, plus 800 and 2000 for 7 and 8+ cards with a player blackjack) is supported through `pay.buster.bj7/bj8`.

**Royal Match** (player's first two cards suited). Source: Wizard of Odds, Royal Match: https://wizardofodds.com/games/blackjack/side-bets/royal-match/
| Hand | Version 1 (multi-deck) | Version 2 (single deck) |
|---|---|---|
| Royal match (suited K-Q) | 25 | 10 |
| Easy match (any suited) | 2.5 (5:2) | 3 |
The Downtown single-deck preset uses version 2. The house edge is 6.67% for version 1 at 6 decks and 3.77% for version 2 at 1 deck.

## 6. Preset tables
| Preset | Decks | Dealer | BJ | Double | DAS | Max hands | Surrender | Peek | Min / Max | Side max |
|---|---|---|---|---|---|---|---|---|---|---|
| Vegas Strip 6D S17 3:2 | 6 | S17 | 3:2 | any 2 | yes | 4 | late | yes | 25 / 5,000 | 100 |
| Downtown single deck H17 6:5 | 1 | H17 | 6:5 | any 2 | no | 2 | no | yes | 5 / 500 | 25 |
| Double deck H17 3:2 (pitch) | 2 | H17 | 3:2 | any 2 | yes | 4 | no | yes | 10 / 2,000 | 50 |
| Atlantic City 8D S17 3:2 LS | 8 | S17 | 3:2 | any 2 | yes | 4 | late | yes | 15 / 5,000 | 100 |
| European 6D no-hole-card S17 | 6 | S17 | 3:2 | 9-11 | yes | 4 | no | **no** | 10 / 1,000 | 100 |
- Resplitting aces is off in every preset and can be toggled in Settings.
- Every preset field can be overridden in Settings. The UI labels the table "Custom" once anything has changed.

## 7. Bankroll
- The bankroll is play money, stored in `localStorage['casino.bankroll']` and shared by every Casino Kit game. It starts at 1,000.
- **Reset** (Settings → "Reset bankroll", with a confirm dialog) sets it back to 1,000.
- If the bankroll drops below the table minimum, a "Get fresh chips" button resets it.
- No real-money value, no purchases, no ads.

## 8. Training modes (separate menu modes; normal casino tables are coach-free)
### 8.1 Strategy Coach
- It plays like a normal table, using any preset or custom rules.
- **Grading:** before every player decision (including insurance), the coach computes `basicStrategy(hand, dealerUp, rules, ctx)`.
  - `ctx` is the actions that are legal right now (`canDouble`, `canSplit`, `canSurrender`, from `game.available()`).
  - After the player acts, it shows ✓ or ✗, the correct play, and the one-line `reason`.
  - Insurance and even money are always graded as "decline" (basic strategy never takes them).
- **Accuracy:** session % and lifetime %, stored in `localStorage['casino.coach.lifetime'] = { right, total }`, plus a "most-missed spots" list (by chart cell).
- **Chart view:** hard, soft, and pairs grids generated by `strategyChart(rules)`, which is the **same function the grading uses**.
  - The cell colors follow the legend: H red, S yellow, Dh/Ds blue, P green, Ph/Pd/Ps light green, Rh/Rs/Rp/Rx white.
  - A legend is shown, and the current hand's cell is highlighted.
- **Strategy source:** Wizard of Odds basic strategy charts.
  - Single deck: https://wizardofodds.com/games/blackjack/strategy/1-deck/
  - Double deck: https://wizardofodds.com/games/blackjack/strategy/2-decks/
  - 4-8 decks: https://wizardofodds.com/games/blackjack/strategy/4-decks/
  - Each has S17 and H17 variants, and all 6 charts are asserted cell by cell in `engine/test/strategy.test.ts`.
- **What it adapts to:** deck class (1, 2, or 4-8), S17/H17, DAS (the Ph/Pd/Ps codes), surrender (the Rh/Rs/Rp/Rx codes), and the double restriction (9-11 or 10-11 turns Dh into hit and Ds into stand). Hands of 3+ cards fall back from double or surrender.
- **Codes:**
  - Rp = surrender if DAS isn't allowed, otherwise split (2D H17 8,8 vs A).
  - Rx = surrender if allowed, otherwise split (4-8D H17 8,8 vs A, per the WoO text strategy).
- **Sanity check:** a 200,000-round simulation of basic strategy on the Vegas Strip rules gives a house edge of about 0.5% (`engine/test/sim.test.ts`).

### 8.2 Card Counting Trainer (Hi-Lo)
- **Values (`hiLoValue`):** 2-6 count +1, 7-9 count 0, and 10/J/Q/K/A count −1. A full deck sums to 0.
- **Drill:**
  - Pick 1, 2, 6, or 8 decks and a speed (0.4–3.0 s per card, or "casino pace" pairs).
  - Cards are dealt from the shoe one at a time (or as round-like groups) into the discard tray. The tray's height is drawn in proportion to the cards used, with a deck scale.
- **Checkpoints:** every N cards (adjustable, default 20) or at a random point.
  - The user enters the running count and the true count.
  - The truth is the running count = `runningCount(seen)`, and the true count = `trueCount(rc, decksRemaining(cardsLeft, 0.5))`. The estimate rounds the decks remaining to the half deck, as a player would judge it from the tray, and the exact value is shown as well.
  - Scoring: running count must match exactly, and true count is correct within ±0.5. Results go into a history list (time, cards seen, your answer, the truth, and ✓/✗), stored in `localStorage['casino.count.history']` (last 200 entries).
- **Bet-spread practice (optional):** at each checkpoint, also ask for the bet.
  - The truth is `betForTrueCount(tc, { minUnits, maxUnits, unit })`.
  - Default ramp: TC ≤ 1 bets the minimum, then 2×(TC−1) units (TC2 = 2, TC3 = 4, TC4 = 6, TC5+ = 8), capped at the configured spread (for example 1-8 or 1-12). It uses the floored true count, and the ramp is configurable.
  - Scored and kept in the same history.
- Every value is asserted in `engine/test/strategy.test.ts`.
