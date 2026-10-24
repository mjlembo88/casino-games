Now build the game on top of the engine you saved in `src/games/blackjack/engine.ts`. Use the engine as is: never reimplement the blackjack rules in UI code. All rules, payouts, legality (`game.available()`), and settlement come from the `Blackjack` class, `PRESETS`, and `Bankroll`.

This is PLAY MONEY ONLY. No real money, payments, purchases, ads, analytics, accounts, logins, or tracking. Use the name "Marcus" if a name is ever needed.

## Architecture: a reusable "Casino Kit" (future craps and roulette games reuse it)
Put the shared look in `src/kit/`, separate from the game in `src/games/blackjack/`. Kit files must never import game files.
- `kit/theme.ts`: ONE tokens object that every kit file reads.
  - Felt: base `#0b5d34`, deep `#073d22`, light `#14804a`, print ink `rgba(255,240,200,.55)`, rail `#3a2214`/`#6b4127`.
  - Gold `#f2c14e`, red `#c8102e`, ink `#121212`, cream `#f7f3ea`.
  - Chip colors [body, edge]: 1 `#f4f4f4`/`#1f4fa8`, 5 `#c8102e`/white, 25 `#138a3a`/white, 100 `#151515`/white, 500 `#6c2bb3`/`#ffd34d`, 1000 `#f2c14e`/`#151515`, 5000 `#e86a1c`/white.
  - Timings in ms: deal 280 (90 stagger), flip 260, peek 450, chip slide 380 (40 per chip), dealer hit pause 550, toast 900 in + 1200 hold, shuffle 2200.
  - `anim.speed` multiplier.
- `kit/anim.ts`: one shared rAF loop. `tween(target, to, {ms, ease, delay})` returns a Promise, plus `timeline()`, `parallel()`, and easings outCubic, inOutCubic, outBack, linear. It pauses when `document.hidden`. Reduced motion (setting or `prefers-reduced-motion`) means fast tweens with no rotation.
- `kit/table.ts`: a full-screen `<canvas>` behind a DOM layer.
  - Felt is a radial gradient (light at 50% 35%, deep at the edges) plus a pre-rendered noise grain tile (overlay, about 3%).
  - A warm overhead lamp glow over the dealer area with a slow 8 s "breathing", and a dark corner vignette.
  - A padded leather rail at the player edge, with a gradient and dashed stitching.
  - **Printed table text along arcs** in a serif font (Georgia) in the print-ink color, GENERATED FROM THE RULES: "BLACKJACK PAYS 3 TO 2" or "6 TO 5", "DEALER MUST STAND ON ALL 17s" or "DEALER MUST HIT SOFT 17", and "INSURANCE PAYS 2 TO 1".
  - An acrylic min/max placard.
  - `table.spot(name)` returns layout coordinates.
  - A virtual layout of 1600×900 (landscape) or 900×1600 (portrait), scaled to fit and respecting safe areas. It must look right in both orientations on a phone.
- `kit/card.ts`: cards are DOM elements with procedural inline SVG.
  - Suits are drawn from paths, not font glyphs. Standard pip layouts, index corners, and stylized procedural J/Q/K court panels (no copied commercial art).
  - Card back: a red `#8a0d22` diamond lattice with an "M" medallion.
  - Methods: `dealTo(x, y, {faceUp})` (a translate + rotate arc from the shoe, with the shadow growing on landing), `flip()` (rotateY to 90°, swap, back), `peek()`, `toDiscard()`, and `setState('highlight'|'dim')`.
- `kit/chips.ts`: SVG chips with six edge inlays, a dashed inner ring, a value inlay (1, 5, 25, 100, 500, 1K, 5K), and a sheen.
  - `ChipStack.fromAmount(n)` makes a greedy breakdown with a -4px-per-chip offset and small seeded jitter and rotation.
  - Animations: place (slide from the rack, ease-out-back), pay (from the dealer rack to beside the bet), and take (to the rack, then fade), cascading at 40 ms per chip.
  - The chip rack at the bottom: tap a chip to select it, tap a spot to add, long-press to remove. Buttons for Clear, Rebet, and 2× Rebet.
- `kit/dealer.ts`: a stylized waist-up dealer in layered SVG: head, hair, eyes with blinking lids, brows, a 5-viseme mouth (rest, slight, open-small, open, wide), a vest and bow tie, and two jointed arms with hands.
  - States: idle (breathing, random blinks, slight sway), deal (the arm reaches to the shoe, then the target, and the card launches at the reach peak), gestures (welcome, point, wave for "no more bets", tap, pay), and reactions (smile, sympathy, surprise, nod).
  - talk: mouth movement driven by the AUDIO LEVEL. Use an AnalyserNode on the playing clip, take the RMS, smooth it (attack .5, release .15), and map it to a viseme. Show a caption bubble too.
- `kit/sound.ts`: ALL sound effects synthesized with WebAudio, with no sample files.
  - Card snap: a 25 ms noise burst, bandpass 2.5 kHz.
  - Card slide: brown noise, lowpass.
  - Chip clack: 2.9 kHz + 4.3 kHz sine partials with a 60 ms decay, pitch rising per chip.
  - Shuffle: riffle noise bursts at 14–22 Hz for 1.6 s, then a whoosh.
  - Ambient casino room loop: pink noise at 600 Hz lowpass, very quiet, plus far-off random chip clacks.
  - Win, lose, and blackjack arpeggios.
  - The AudioContext is resumed on the first tap.
- `kit/voice.ts`: dealer voice clips.
  - Fetch `https://mjlembo88.github.io/casino-games/voice/manifest.json`. It's `{ base, lines: [{ key, text, file }] }`, and each clip URL is `base + file`. The server sends CORS `*`.
  - Decode the clips with WebAudio and cache them in memory. Route them through the analyser for lip-sync.
  - `Voice.say(keyOrText, {priority})` plays one line at a time, and a high-priority line interrupts a low one.
  - If the manifest or a clip fails, or the user picks "device voice", FALL BACK to the Web Speech API (`speechSynthesis`, rate 1.05, prefer an English male voice), with a pseudo-random 9 Hz mouth flap while speaking. Mode can be clips, device, or off. Captions always show.
  - Keys available: place_bets no_more_bets good_luck blackjack player_blackjack blackjack_6to5 insurance insurance_open even_money insurance_closed dealer_peek no_dealer_bj dealer_bj dealer_busts bust push winner you_win dealer_wins shuffling cut_card burn double split split_aces surrender hit_or_stand your_turn dealer_stands dealer_hits side_bet_win perfect_pair royal_match lucky_ladies twentyone_plus_three table_min table_max welcome thanks bankroll_reset dealer_17…dealer_21 total_4…total_21.
- `kit/ui.ts`:
  - Pill buttons at least 56px tall, colored by role (Hit green, Stand red, Double blue, Split purple, Surrender grey, primary gold) with a pressed state. On desktop, show the H/S/D/P/R shortcuts.
  - Bet spots: a circle with a dashed gold double ring and a printed label. An active spot glows, and a spot over the limit shakes.
  - HUD: bankroll with a count-up, bet, table name, min/max, the shoe remaining with the cut marker, and menu, paytable, settings, and mute icons.
  - A modal sheet, the toast ("BLACKJACK!", "DEALER BUSTS" with gold canvas confetti), and a settings panel.

## Blackjack game (`src/games/blackjack/`)
- **Menu:** choose a table from `PRESETS` (Vegas Strip 6D S17 3:2, Downtown single deck H17 6:5, Double deck H17 3:2, Atlantic City 8D S17 3:2 LS, European no-hole-card) or Custom.
  - Custom shows toggles for every `Rules` field: decks 1/2/6/8, hitSoft17, peek, bjPays 3:2/6:5, double any/9-11/10-11, das, maxHands, resplitAces, lateSurrender, penetration, min/max.
  - Leave room in the menu for two more modes coming later: "Strategy Coach" and "Card Counting Trainer".
- **Bankroll:** `new Bankroll(localStorage)` with the key `casino.bankroll`, starting at 1000. Settings has "Reset bankroll" with a confirm. Show "Get fresh chips" if the bankroll is below the table minimum.
- **Betting phase:**
  - A main BET spot plus side-bet spots for every id in `rules.sideBets`: Perfect Pairs (PP), 21+3, Lucky Ladies (LL), Buster (BUST), and Royal Match (RM). Each side bet is limited by `rules.sideMax`.
  - The dealer says place_bets, then a DEAL button. On deal the dealer waves and says no_more_bets.
  - Debit the stake returned by `game.deal(bets)`, and debit the extra stakes returned by `decideInsurance()` and `act()`.
- **Animate from the engine state:**
  - After every engine call, diff `game.hands`, `game.dealer`, `game.phase`, and the new `game.log` events (shuffle, deal, insurance, peek, turn, hit/stand/double/split/surrender, reveal, dealerHit, settled), then play them in order as animations, sounds, and voice lines. Block input while animating.
  - Single and double deck use the hand-pitched style: cards come from the dealer's hand with more rotation, and there's no shoe box.
  - Shoe games show a shoe on the dealer's left and a discard tray on the right, whose height reflects the cards used. When `shuffle` fires, play the shuffle sequence with the dealer saying "shuffling", the cut card going in, and the burn card going to the discard tray.
  - Insurance phase: show "Insurance?" (or "Even money?" when the player has blackjack) with Yes and No, and the dealer says insurance_open or even_money. Then the peek animation.
  - Player phase: show only the buttons in `game.available()`. Highlight the active hand. Split hands lay out side by side, and doubled cards land sideways.
  - Show hand totals as badges (soft shown as "7/17"). On reveal, the dealer flips the hole card and announces dealer_17…21, dealer_busts, or dealer_bj.
  - Settlement: chips are paid or taken per hand using `hand.outcome` and `hand.net`. Show side-bet results (`game.side[]` labels and pays), credit `game.payout` to the bankroll, and play a reaction plus a toast. Then return to betting, keeping Rebet available.
- **Paytable modal:** tabs for each side bet, generated from `rules.pay`, with the source link to the matching Wizard of Odds page (perfect-pairs, 21plus3, lucky-ladies, buster-blackjack, royal-match under https://wizardofodds.com/games/blackjack/side-bets/). Plus a "Table rules" tab generated from `rules`.
- **Settings:** table and rules, felt color (green, blue, red, purple), voice (clips, device, off), volume for SFX, voice, and ambient, animation speed 0.5–2×, reduce motion, and reset bankroll. Save them to `localStorage` under `casino.settings`.
- **Layout:** mobile-first. Landscape: dealer at the top center, the bet arc below, the chip rack and actions at the bottom. Portrait: everything stacks, with the action buttons in the bottom thumb zone. The buttons need to be easy to tap on an Android phone. Keep the frame rate at 60 fps, and add a low-quality mode with no particles, blur, or breathing.
- It must work offline after the first load, except the voice falls back to device speech when offline.

When it's done, give me a short checklist of what works and anything you stubbed.
