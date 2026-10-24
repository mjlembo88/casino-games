Add two TRAINING modes to the main menu, each a separate game mode next to the casino tables. The normal casino tables stay coach-free: no hints, no counts. Use the same Casino Kit look (felt, cards, chips, dealer, sounds, voice) and don't change the engine files. Use `basicStrategy`, `strategyChart`, `hiLoValue`, `runningCount`, `decksRemaining`, `trueCount`, and `betForTrueCount` from `src/games/blackjack/strategy.ts`.

## 1. Strategy Coach
- It plays exactly like a normal table (same `Blackjack` engine, same bankroll), with any preset or Custom rules. The coach panel shows the rule summary it's grading against: decks, S17/H17, DAS, surrender, and the double rule.
- **Grading:**
  - Before each player decision, compute `basicStrategy(hand.cards, game.dealerUp, game.rules, { canDouble, canSplit, canSurrender })`, with the `can*` flags taken from `game.available()`.
  - After the player taps an action, grade it: a green ✓ or a red ✗, the correct play, and the advice's one-line `reason`, in a small card above the action buttons.
  - The dealer reacts: a nod for correct, sympathy for wrong.
  - Insurance and even money are always graded "Decline: basic strategy never takes insurance."
  - Optional setting "Hint before I act" shows the advice before the tap. It's off by default.
- **Accuracy:**
  - Track session % (right/total) and lifetime % in `localStorage['casino.coach.lifetime'] = { right, total }`, with a Reset.
  - Keep a "Most-missed spots" list by chart cell (for example "Soft 18 vs 9").
- **Chart view** (button "Strategy chart"): a modal with three grids, Hard (5-7 … 17+), Soft (A,2 … A,9), and Pairs (2,2 … A,A), against dealer up cards 2-10 and A.
  - Generate it with `strategyChart(game.rules)`, so it always matches the table's rules.
  - Cell colors: H red, S yellow, Dh and Ds blue, P green, Ph/Pd/Ps light green, Rh/Rs/Rp/Rx white with dark text.
  - Include a legend: Dh = double, otherwise hit. Ds = double, otherwise stand. Ph = split if DAS, otherwise hit. Pd = split if DAS, otherwise double. Ps = split if DAS, otherwise stand. Rh = surrender, otherwise hit. Rs = surrender, otherwise stand. Rp = surrender if no DAS, otherwise split. Rx = surrender, otherwise split.
  - Highlight the current hand's cell while a hand is in play.
  - Add the source line "Charts: Wizard of Odds basic strategy (1 deck, 2 decks, 4-8 decks)" with links to https://wizardofodds.com/games/blackjack/strategy/1-deck/, /2-decks/, and /4-decks/.

## 2. Card Counting Trainer (Hi-Lo)
- **Setup:** shoe size 1, 2, 6, or 8 decks. Speed slider from 0.4 to 3.0 s per card. Deal style: single cards, or round-like groups (2 player cards plus the dealer). Checkpoint every N cards (10–60, default 20) or "random".
- **The drill:**
  - Shuffle a `Shoe(decks, 0.9, 1)`, then deal cards face up with the normal deal animation and snap sound into a visible **discard tray**.
  - The tray's stack height is proportional to the cards used, with a small deck-scale ruler marked in half decks. Also show the shoe with its remaining stack.
  - Pause and resume. No count is ever shown during the drill.
- **Checkpoint:** the dealing pauses and a number-pad sheet asks for the Running count and the True count (a decimal is allowed).
  - The truth: `rc = runningCount(cardsSeen)`, and `tc = trueCount(rc, decksRemaining(cardsLeft, 0.5))`. Also show the exact `trueCount(rc, cardsLeft/52)`.
  - Scoring: running count must be exact, and true count is correct within ±0.5. Show the truth, the decks-remaining estimate the user should have read from the tray, and ✓/✗.
- **Bet-spread practice** (toggle):
  - Settings for the table unit (default 25) and the spread: min units 1, max units 8 by default, with presets 1-4, 1-8, and 1-12.
  - At each checkpoint, also ask "Your bet?". The truth is `betForTrueCount(tc, { minUnits, maxUnits, unit })`.
  - Show the ramp table (TC ≤ 1: min, TC2: 2u, TC3: 4u, TC4: 6u, TC5+: max) and score the answer.
- **History:** a scrollable list of time, deck size, cards seen, your RC/TC/bet vs. the truth, and ✓/✗, with an accuracy % at the top. Keep the last 200 entries in `localStorage['casino.count.history']`, with a Clear button.
- A small info card explains Hi-Lo: 2-6 = +1, 7-9 = 0, 10-A = −1, and true count = running count ÷ decks remaining.

Both modes need to work in portrait and landscape on an Android phone. Give me a checklist when you're done.
