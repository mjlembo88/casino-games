# Casino Blackjack: polish punch list (Proto Bot → Engineer)

v0.1 · 2026-10-23 · for Marcus's play-money blackjack. Each item is written so you can paste it into a Grok Build prompt.

**Ground rules for every item**
- Don't touch `src/games/blackjack/engine.ts` or `strategy.ts`. Rules, payouts, legality, and settlement stay exactly as the engine has them. Items only *read* engine state and events (`deal`, `peek`, `turn`, `reveal`, `dealerHit`, `settled`, `shuffle`, `hand.outcome`, `hand.net`, `game.payout`).
- Colors and timings come only from `theme` (`src/kit/theme.ts`). New tokens go in `theme` first (§K), never as literals.
- Play money only. No real money, purchases, ads, analytics, or accounts. No "win big" or gambling-promo copy. Use "Marcus" wherever a name appears.
- Every animation scales with `anim.speed`. Under reduce motion (`anim.speed = 4`, no rotation), particles, shakes, and camera moves are skipped, and state changes stay visible as fades or color changes.
- Every effect has a `quality:'low'` path: no particles, blur, or breathing.

Tokens used below: felt `#0b5d34` / deep `#073d22` / light `#14804a`, gold `#f2c14e` (dark `#c89527`), red `#c8102e`, cream `#f7f3ea`, text `#fff8e7`, dim `rgba(255,248,231,.65)`, printInk `rgba(255,240,200,.55)`, `timing.{deal 280, flip 260, slide 380, settle 520, dealerTalkGap 250, chipStep 40}`.

---

## P0: makes the first build feel finished (do these first)

### P0-1 Round-result moments: win, blackjack, push, bust (`kit/ui.ts` toast + `kit/anim.ts`, plus the blackjack controller)
What the player sees, by `hand.outcome` (one beat per round, and the biggest result wins):
| Result | Toast text | Toast style | Extra |
|---|---|---|---|
| Natural blackjack | `BLACKJACK!` | 96px `font.print` bold, gold gradient `#ffe08a→#f2c14e→#c89527`, 2px `#021a0e` drop shadow | gold confetti burst (see below), cards in that hand get the `highlight` glow, dealer `react('surprise')`, `Sound 'bj'` |
| Win (incl. dealer bust) | `YOU WIN` / `DEALER BUSTS` | 72px, `text` color, gold 2px stroke | winning hand's cards: 1 gold glow pulse, 0→1→0 over 600 ms; dealer `react('smile')`, `Sound 'win'` |
| Push | `PUSH` | 64px, `dim` color, no stroke | chips do a 4px "nudge" back toward the player (160 ms) |
| Loss or bust | `BUST` only on a player bust; otherwise no toast | 56px, red `#c8102e` | losing cards go to `dim` (opacity .5) over 200 ms; dealer `react('sympathy')`, `Sound 'lose'` |
- Timing: toast scale 0.6→1.08→1.0 with `outBack(1.4)` over the kit's 900 ms in, then a 1200 ms hold, then fade 250 ms. It starts **after** the last chip of the payout lands (settle), never before.
- Confetti (BJ only): 40 particles (kit cap). Colors are 70% gold `#f2c14e`, 15% cream `#f7f3ea`, and 15% red `#c8102e`, as 6×10 px rects that spin (rotation 0-720° over life). They emit from the toast center at 10 to 170° upward, speed 380-720 px/s (virtual px), gravity 1400 px/s², and live 1100-1500 ms, fading out over the last 300 ms. `quality:'low'` or reduce motion: no confetti, and the toast just fades in over 200 ms.
- Side-bet hit: a small banner under the toast reads, for example, `21+3 · Straight flush · 40 to 1` (text from `game.side[]` and `rules.pay`), on a cream pill with ink text, sliding in 300 ms after the toast.
- **Acceptance:** with a seeded shoe that deals a natural, the order is chips land → toast → confetti, and the toast ends 2.35 s ±50 ms after it starts at 1×. A push shows no confetti and no gold. At `quality:'low'`, the canvas draws zero particles (check with a counter). The engine diff is empty.

### P0-2 Chip feel: stack, cascade, and payout choreography (`kit/chips.ts`, `kit/anim.ts`, `kit/sound.ts`)
- **Place:** a chip leaves the rack, rises along a 24px arc, and lands on the stack with `outBack(1.4)` over `timing.slide` 380 ms. On landing it squashes (scaleY .92 for 60 ms, then back to 1.0 over 90 ms), and `clack` plays with pitch ×(1 + 0.03·i) for the i-th chip.
- **Stack look:** a -4px y step per chip, seeded ±1.5px x jitter and ±3° rotation (kit §4). A contact shadow ellipse sits under each stack: `rgba(0,0,0,.35)`, width = chip size × 1.1, height 18px, opacity +0.02 per chip up to .55.
- **Columns:** at most 20 chips visible per column, then a new column at +chipSize×0.9 x. The column order is highest denomination at the back.
- **Pay (win):** the dealer's matching chips slide from the rack to a column **beside** the bet (`timing.slide`, chips cascade every `timing.chipStep` 40 ms), then wait 200 ms, then both columns slide to the player tray together over 520 ms (`timing.settle`, `inOutCubic`). The bankroll HUD counts up during that slide, with the count-up ending exactly when the chips land.
- **Blackjack pay:** the same, but the payout column lands with a single gold rim flash: a 2px `#f2c14e` ring scaling 1.0→1.4 with opacity 1→0 over 300 ms.
- **Take (loss):** the stack slides to the dealer rack (380 ms `inCubic`), and each chip fades over its last 120 ms.
- **Long-press (500 ms) a spot** removes the top chip: it lifts 12px and slides back to the rack (240 ms), playing `clack` at rate 0.9.
- **Over-limit tap:** the spot shakes ±6px x, 3 cycles in 200 ms (kit spec). The chip doesn't leave the rack, and a `dim` caption shows "Table max 500".
- **Acceptance:** betting 1,265 shows 1K + 2×100 + 2×25 + 3×5 in descending-value columns (it's greedy). Ten fast taps produce ten distinct clacks with rising pitch and no dropped animation. A payout's count-up ends within 1 frame of the last chip landing. 60 fps on a mid-range phone with 3 stacks of 20.

### P0-3 Haptics that actually fire in the APK (`kit/ui.ts` new `haptic()` helper, plus a one-line Android manifest change)
- **Blocker:** the WebView only honors `navigator.vibrate()` if the app declares `<uses-permission android:name="android.permission.VIBRATE" />` in `AndroidManifest.xml`, and the current manifest only has INTERNET. Add it (it's a normal permission, with no runtime prompt). Without it, every pattern below silently does nothing.
- Add `kit/ui.ts → haptic(name)`. It's a no-op if `!('vibrate' in navigator)`, if the setting `casino.settings.haptics === false` (new toggle, default **on**), or if `document.hidden`. It also throttles to at most 1 call per 60 ms so it doesn't buzz.
| name | pattern (ms) | when |
|---|---|---|
| `tap` | `12` | any button press, chip select |
| `chip` | `8` | a chip lands on a spot (once per tap, not per cascade chip) |
| `deal` | `6` | the player's own card lands (not the dealer's) |
| `invalid` | `[20, 40, 20]` | over-limit or illegal tap (spot shake) |
| `win` | `[18, 60, 28]` | after a win settles |
| `blackjack` | `[30, 40, 30, 40, 60]` | natural blackjack toast (extends the 02_polish `[30,40,30]`) |
| `bust` | `40` | the player busts |
| `shuffle` | `[10, 90, 10, 90, 10]` | the shuffle sequence starts |
| `checkpoint` | `[15, 50, 15]` | Counting Trainer pauses for a checkpoint |
- Losses don't vibrate (except bust), which keeps feedback positive.
- **Acceptance:** on an Android 12+ phone with the new APK, every pattern can be felt. With the toggle off, `navigator.vibrate` is never called (spy). Reduce motion doesn't disable haptics (they're separate settings).

### P0-4 Dealer timing that reads like a real dealer (`kit/dealer.ts`, `kit/card.ts`, `kit/anim.ts`)
- **Deal:** the arm reaches to the shoe (160 ms), and the card launches at the arm's peak (`onRelease`). The card flies `timing.deal` 280 ms with a 6px lift arc and a 3D tilt (rotateX 8°→0, perspective 900px), lands with a 2px bounce (90 ms), and casts a shadow that grows from 0 to `theme.shadow`. Stagger 90 ms. The four-card opening deal therefore takes about 280 + 3×90 + 90 = 640 ms of card motion plus arm lead-in.
- **Hole-card peek** (`peek:true`, ace or ten up): the card corner lifts 8px over 150 ms, holds 150 ms, and drops back over 150 ms (450 total, kit table). Caption: "Checking for blackjack…". The voice says `dealer_peek`, and then `no_dealer_bj` or `dealer_bj`.
- **Dealer turn:** flip the hole card (`timing.flip` 260 ms, scale 1.04 at the midpoint). Wait 300 ms, then each hit is reach (160) → deal (280) → a 550 ms pause (kit `dealer draw pause`). The total badge updates on landing with a 120 ms scale pop of 1.0→1.15→1.0.
- **Your turn:** the dealer does `gesture('point')` toward the active hand, and that hand gets a gold rim light: a 2px `#f2c14e` outline at 60% opacity, pulsing to 100% over 1.2 s. The pulse stops at reduce motion, but the outline stays.
- **Idle extras** (02_polish): a weight shift (torso translateX ±2px every 6-9 s, 900 ms `inOutCubic`). Blink 120 ms at random 2-6 s.
- **Acceptance:** recorded at 60 fps, the card leaves the dealer's hand within ±1 frame of the arm's peak. No voice line overlaps another (250 ms gap). At `anim.speed = 2`, everything is half the duration, and the voice still isn't clipped.

### P0-5 Accessibility basics (`kit/ui.ts`, `kit/card.ts`, settings)
- Every button gets an `aria-label` ("Hit", "Stand", "Double down", "Split", "Surrender", "Deal", "Rebet"). Hand totals live in an `aria-live="polite"` region, for example "Your hand 7 or 17. Dealer shows 10".
- Minimum tap target 56×56 px (the kit's button height). Chips in the rack are at least 48px, with 8px gaps.
- Contrast: text on felt uses `text #fff8e7` (≈12:1 on `#073d22`). Never put `printInk` on interactive labels, because it's decoration only.
- Color-blind four-color deck (♦ blue `#1f4fa8`, ♣ green `#138a3a`, both reused from chip tokens). Outcomes are never shown by color alone: every toast has text, and each hand badge gets a glyph (✓ win, = push, ✗ loss).
- Large-text setting: HUD and badges ×1.25, and toasts are unchanged.
- **Acceptance:** TalkBack on the APK reads every button and the totals. A Lighthouse a11y score ≥ 90 on the web build. No information is conveyed only by red/green.

---

## P1: depth and delight

### P1-1 Daily Challenge, play money only (new `src/games/blackjack/daily.ts`, plus the kit `ui.modal` and `storage`)
- Once per local calendar day, the menu shows a "Daily Challenge" card. The day's goal is chosen deterministically from the date seed (`mulberry32(yyyymmdd)`) from this pool:
  - "Win 5 hands", "Hit 2 blackjacks", "Make 10 correct basic-strategy plays in Strategy Coach", "Finish a Counting Trainer drill with 3 checkpoints correct", "Win a split hand", "Double down and win twice".
- Progress reads engine events and outcomes only (never alters dealing or payouts). The shoe is the normal shoe, **not** rigged by the seed.
- The reward is cosmetic only: a felt color or card-back unlock (for example "Midnight blue felt" `#0f3f6b`/`#082544`, from the kit's alternative felts) or a gold "✓ Daily" stamp in a 7-day streak row. **There are no chip, bankroll, or money rewards**, and nothing to buy.
- The streak is saved in `localStorage['casino.daily'] = { lastDay, streak, unlocked: [] }`. A missed day resets the streak quietly, with no guilt copy.
- UI: a cream card (`#f7f3ea`, ink text, 18px modal radius) with the goal, a progress bar in gold `#f2c14e` on `rgba(0,0,0,.15)`, and on completion a gold stamp scaling 1.4→1.0 (`outBack`, 400 ms) plus `haptic('win')`.
- **Acceptance:** two devices with the same date show the same challenge. Changing the date rolls the challenge. Bankroll is identical with and without daily mode for the same seeded shoe (diff test).

### P1-2 Training-mode UX (`03_training.md` modes: coach card, chart, trainer)
- **Coach grade card:** it sits above the action buttons, max width 360px, and slides up 16px with a fade over 200 ms.
  - ✓ is a gold `#f2c14e` circle with an ink check. ✗ is a red `#c8102e` circle with a cream ✗.
  - Line 1: "Stand. Correct" or "Hit. Basic strategy says Stand". Line 2: the `reason` in `dim`.
  - It auto-hides after 2.5 s or on the next tap.
- **Chart modal:** the current cell gets a 2px gold outline and the row/column headers are bolded. Tapping a cell shows a one-line tooltip with the legend text. Colors follow 03_training (H red, S yellow, D blue, P green, R white).
- **Counting trainer:** the speed slider shows live s/card. A checkpoint sheet slides up in 240 ms with a large 3×4 number pad (keys 64px; "−", "." and "⌫" included), and `haptic('checkpoint')` fires. For a wrong answer, the truth row turns red with the correct value in gold beside it.
- **Acceptance:** you can play a full coach session one-handed in portrait without the grade card covering any action button. Counting checkpoint inputs accept −12 to +12 and decimals.

### P1-3 Sound polish (`kit/sound.ts`)
- Master chain: all buses → `DynamicsCompressor` (threshold −14 dB, knee 6, ratio 4, attack 3 ms, release 120 ms) → master gain.
- Bus levels (linear): sfx .8, voice 1.0, ambient .35. The ambient ducks to 40% for 600 ms whenever the dealer speaks (attack 80 ms, release 400 ms).
- The `bj` sparkle is a 5-note pentatonic run (C6 D6 E6 G6 A6) at 70 ms per note, with sine plus a 2% detuned triangle and a 400 ms decay tail.
- Fade the ambient out over 300 ms on `visibilitychange` hidden and back in over 800 ms.
- **Acceptance:** no clipping (the analyser peak stays under 0 dBFS) during BJ toast, voice, and a 10-chip cascade together.

### P1-4 Card details (`kit/card.ts`)
- The doubled card lands rotated 90° and offset +18px x (02_polish), with a 1.0→1.06→1.0 scale (180 ms).
- On a split, the two cards slide apart over 380 ms, and the new second cards deal in normally. The active split hand gets the gold rim (P0-4), and finished hands go to 85% opacity.
- Hand-pitched single and double deck: cards spin ±18° and slide 40px across the felt after landing (`slide` sound, 180 ms).

### P1-5 Performance budget (`kit/table.ts`, `kit/anim.ts`)
- Device pixel ratio capped at 2. The felt plus grain plus rail are pre-rendered once per resize to an offscreen canvas, so a frame is just 1 `drawImage` plus particles.
- At most 1 shared rAF loop. Particles come from a pool of 60 objects with no per-frame allocation.
- Card and chip SVGs are cached as `data:` URIs per face/denom (kit §0). Animated elements get `will-change: transform` only while moving.
- `quality:'auto'` switches to low if the average frame time is above 20 ms over 2 s.
- **Acceptance:** Chrome DevTools performance on a 4× CPU throttle shows ≥ 55 fps during the opening deal and the BJ confetti. Under 50 MB JS heap after 200 hands.

---

## P2: nice to have
- **P2-1 Lamp sweep:** at round start, a 600px-wide soft specular band (`rgba(255,230,180,.08)`) crosses the felt left to right in 900 ms. Off at low quality.
- **P2-2 Stats sparkline** (02_polish §10): a gold 2px line on deep felt, with the last point as a cream dot. Show it in the menu under "Marcus's stats".
- **P2-3 Color-up on leaving the table:** 5×100 spins (rotateY 360°, 300 ms) and merges into one 500, stepping every 40 ms.
- **P2-4 In-app splash:** reuse `splash/splash-*.png` as the web app's first-paint background, fading over 300 ms to the live table once the felt has rendered, so the Android splash and the web app match.
- **P2-5 Card-back unlocks** for the daily streak: blue lattice `#1f4fa8`, green `#138a3a`, and gold-on-black `#151515`/`#f2c14e`, all procedural `pattern` SVG with the "M" medallion.

---

## K. Casino Kit extensions (useful for craps and roulette too)
Add these to `theme.ts` and the kit modules. None of them import game files.

### K1 `theme.celebrate` + `kit/fx.ts` (shared celebration engine)
```ts
celebrate: {
  small:  { toastMs: 900, holdMs: 1200, particles: 0,  haptic: 'win' },
  big:    { toastMs: 900, holdMs: 1400, particles: 40, haptic: 'blackjack', palette: ['#f2c14e','#f7f3ea','#c8102e'], weights: [.7,.15,.15] },
  epic:   { toastMs: 900, holdMs: 1800, particles: 60, haptic: 'blackjack', ring: true }, // e.g. a side-bet top pay, craps fire bet, roulette straight-up
}
```
`fx.celebrate(level, text, at?)` is the API. Blackjack uses small for wins and big for blackjack. Roulette uses big for a straight-up hit, and craps uses big for hitting the point.

### K2 `theme.haptics` + `ui.haptic(name)`
Move the P0-3 table into `theme.haptics: Record<string, number | number[]>`, so every game shares one vocabulary (`tap`, `chip`, `invalid`, `win`, `big`, `shuffle`). Roulette adds `ballDrop: [6,30,6,30,6,60,12]` (ball rattling into the pocket). Craps adds `diceHit: [14,30,10]` (dice hit the back wall).

### K3 `kit/physics.ts`: tiny 2D impulse sim for chips and dice
A fixed-step (120 Hz) circle/rect integrator with restitution .35, friction .8, and sleep below 2 px/s. Chips use it for a "drop on stack" wobble (a ±2° rotation settle over about 250 ms). Craps uses it for dice tumbling across the felt (the faces come from the rules engine *before* the roll is shown, and physics is cosmetic only, so the result is never physics-decided). Roulette can use it for the ball's final bounce. Seeded, so replays match.

### K4 `theme.feltText` print presets
The arc-text helper used in these splashes (per-glyph advance from the font, 18% tracking, `printInk`) becomes `table.printArc(text, { r, size, tracking })`, so roulette ("SINGLE ZERO") and craps ("PASS LINE", "DON'T PASS BAR") print identically.
