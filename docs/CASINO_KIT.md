# Casino Kit: shared look and engine for Marcus's casino games

Version 0.1 (2026-10-23). Blackjack is the first game built on it. Craps and roulette should reuse it unchanged and only add their own table layout and rules module.
Everything is procedural (Canvas2D, SVG, CSS, WebAudio). It uses **no paid, licensed, or downloaded art or fonts**. The only external files are the optional dealer voice clips (Apache-2.0, see §8).
It's play money only, with no wagering, payments, ads, analytics, or accounts.

## 0. How it fits in one Grok Build project
```
src/kit/theme.ts      tokens (§1)          src/kit/table.ts     felt + lighting (§2)
src/kit/card.ts       faces/backs (§3)     src/kit/chips.ts     ChipStack + animations (§4)
src/kit/dealer.ts     avatar (§5)          src/kit/ui.ts        buttons, bet spots, HUD, modal, settings (§6)
src/kit/sound.ts      WebAudio synth (§7)  src/kit/voice.ts     clips + Web Speech fallback (§8)
src/kit/shoe.ts       shoe/discard visuals src/kit/anim.ts      tween + timeline (§9)
src/games/blackjack/  engine (pasted from engine/src/*.ts) + UI
```
- Rule: **kit files never import game files.** A game imports the kit, and a new game is a new folder under `src/games/`.
- Rendering is a DOM layer for UI and cards (CSS transforms, GPU-friendly) over one full-screen `<canvas>` for the felt, lighting, and particles.
- Cards and chips are DOM elements with inline SVG, so they stay crisp on any DPI. They're cached as `data:` URIs per face.
- Responsive: a layout with a virtual size of 1600×900 (landscape) or 900×1600 (portrait) is scaled with `transform: scale()` to fit. Safe areas use `env(safe-area-inset-*)`.

## 1. Theme tokens (`theme.ts`)
```ts
export const theme = {
  felt:   { base: '#0b5d34', deep: '#073d22', light: '#14804a', printInk: 'rgba(255,240,200,.55)', rail: '#3a2214', railHi: '#6b4127' },
  // alternative felts: blue '#0f3f6b'/'#082544', red '#6b0f1a'/'#3d0710', purple '#3d1f5c'/'#22102f'
  gold: '#f2c14e', ink: '#121212', red: '#c8102e', cream: '#f7f3ea', text: '#fff8e7', dim: 'rgba(255,248,231,.65)',
  chip: { 1: ['#f4f4f4','#1f4fa8'], 5: ['#c8102e','#ffffff'], 25: ['#138a3a','#ffffff'], 100: ['#151515','#ffffff'],
          500: ['#6c2bb3','#ffd34d'], 1000: ['#f2c14e','#151515'], 5000: ['#e86a1c','#ffffff'] }, // [body, inlay/edge]
  radius: { card: 0.06 /* of card width */, button: 14, modal: 18 },
  card: { w: 110, h: 154 },        // virtual px; ratio 2.5:3.5
  chipSize: 64, shadow: '0 6px 14px rgba(0,0,0,.45)',
  font: { ui: 'system-ui, -apple-system, Roboto, "Segoe UI", sans-serif', print: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, Menlo, monospace' },
  timing: { deal: 280, flip: 260, slide: 380, settle: 520, dealerTalkGap: 250, chipStep: 40 }, // ms (§9)
  quality: 'auto' as 'auto' | 'high' | 'low',  // low = no particles/blur, fewer shadows
};
```
Every module reads colors and timings only from `theme`, so a reskin means editing just this one object.

## 2. Felt table (`Table`)
- **Felt:** a radial gradient from `felt.light` at the center top (50% 35%) to `felt.deep` at the edges. Grain is a 256×256 noise tile drawn once to an offscreen canvas (random alpha speckles at 3%) and tiled with `globalCompositeOperation='overlay'`.
- **Lighting:** one warm overhead "pendant lamp" ellipse (`rgba(255,230,180,.18)`, blur 120px) above the dealer area, plus a subtle second hotspot on the betting arc. Animate a 0.5% brightness "breathing" over 8 s for life (disabled at `quality:'low'`).
- **Vignette:** a radial gradient overlay from transparent at 55% to `rgba(0,0,0,.55)` at the corners.
- **Rail:** a padded leather rail along the player edge, drawn as a rounded path. The fill is a gradient from `railHi` to `rail`, with an inner highlight stroke and stitch dashes (`setLineDash([6,6])`, `rgba(255,255,255,.15)`).
- **Printed table text** is drawn along an arc (per-character rotate) in `font.print`, small caps, `felt.printInk`, with a 1px darker "ink bleed" shadow. For blackjack:
  - "BLACKJACK PAYS 3 TO 2" (or "6 TO 5") is generated from the rules.
  - "Dealer must stand on all 17s" or "Dealer must hit soft 17".
  - "INSURANCE PAYS 2 TO 1" sits on a second, smaller arc.
  - Table min/max sits on the placard (top right) with an acrylic look (white gradient, 1px border, reflection).
- **Layout helpers:** `table.arc(cx, cy, r, a0, a1)` gives points for N seats. `table.spot(name)` returns the virtual coordinates of named spots: `shoe`, `discard`, `dealerCards`, `seat0..6`, `bet`, `side:<id>`, `chipTray`.
- **API:** `new Table(canvas, { layout: 'blackjack' | 'roulette' | 'craps', felt?: 'green' | 'blue' | 'red' | 'purple', printed: PrintedText[] })`, with `.resize()`, `.render()`, and `.spot(name)`.

## 3. Cards (`Card`)
- **Faces** are SVG at 250×350.
  - Index corners show the rank, plus the suit below it at the top-left and the same rotated 180° at the bottom-right.
  - Pip layouts follow the standard positions for A-10.
  - J/Q/K use a procedural "court" design: a framed panel in the suit color with a large crown/shield glyph built from paths, a mirrored half, and the rank letter. It's intentionally stylized and not a copy of any commercial deck.
  - Suits are drawn from paths (no font glyphs), so they render the same on every device.
  - Red is `#c8102e` and black is `#121212`, on a `cream` face with a faint paper gradient.
  - Four-color deck option (♦ blue, ♣ green) is a setting.
- **Backs:** a two-tone diamond lattice (`pattern` element) with a white border, in Marcus red `#8a0d22` or blue. Center medallion "M".
- **States:** `faceDown`, `faceUp`, `highlight` (gold glow), `dim` (lost hand at 50% opacity).
- **Animations** (via `anim.ts`):
  - `deal(from='shoe', to)`: translate + rotate from the shoe mouth over 280 ms (ease-out cubic), with a 6px "lift" arc on the y axis. A shadow grows as the card lands and a `snap` sound plays at the end.
  - `flip()`: `rotateY` 0→90°, swap the face, then 90→0 (130 ms each), with a slight scale of 1.04 at the midpoint.
  - `peek()`: dealer slides the hole card's corner 8px up over a peek mirror, then back (no reveal).
  - `toDiscard()`: gather, square, and slide into the discard tray, which shows its stack height (the counting trainer reads this).
  - Hand-pitched (single and double deck): cards arrive from the dealer's hand with more rotation (±18°) and land face-down for players. The deal sound is a softer `snap`.
- **API:** `const c = new CardView(card | null, { back: 'red' })`, then `c.el`, `await c.dealTo(x, y, { faceUp })`, `await c.flip()`, and `c.setState(s)`.

## 4. Chips (`ChipStack`)
- **Denominations and colors** come from `theme.chip`: 1 white/blue, 5 red, 25 green, 100 black, 500 purple, 1k gold, 5k orange.
- **Chip SVG:**
  - The body circle carries six edge "spots" (rectangular inlays in the edge color around the rim).
  - An inner ring is dashed, and a center inlay disc shows the value in bold (`1`, `5`, `25`, `100`, `500`, `1K`, `5K`).
  - A radial-gradient sheen sits top-left, and the edge has a darker 2px stroke.
  - Side view (for stacks) is an ellipse plus a rect with stripes in the edge color.
- **Stacking:**
  - `ChipStack.fromAmount(n)` uses a greedy breakdown into the largest denominations, at most 20 chips visible per column, with columns side by side.
  - Each chip is offset by -4px in y with a ±1.5px random x jitter and ±3° rotation (seeded per chip, so it's stable between renders).
  - A tall stack gets a soft contact shadow.
- **Animations:**
  - `place` (bet): the chip slides from the tray to the spot (380 ms ease-out-back), with a `clack` on landing and a pitch rising for each chip in the stack.
  - `pay` (dealer pays): matching chips slide from the dealer's rack and stack beside the bet, then the pile slides to the player tray.
  - `take` (loss): the stack slides to the rack and fades out.
  - Multi-chip moves step by `timing.chipStep` (40 ms) so they cascade.
  - `color-up` (optional): exchanges 5×$100 for one $500 with a quick spin.
- **Input:** tap a chip in the rack to select it, tap a spot to add it, long-press a spot to remove the top chip, use "Rebet" / "2× Rebet", and "Clear". It respects the table min/max and the side-bet max.
- **API:** `new ChipStack({ amount })`, `.set(amount, { animateFrom })`, `.el`, `ChipRack.select(denom)`.

## 5. Dealer avatar (`Dealer`)
A stylized waist-up dealer drawn in **SVG with grouped parts** (no photo or 3D, so it's fast and license-free): head, hair, eyes (with lids), brows, mouth (5 visemes), torso with vest and bow tie, two arms (upper arm and forearm, plus hand groups with pivots).
- The look is configurable: skin tone, hair style (3 variants), vest color, name tag ("Ava", "Leo", or "Marcus's Table").
- **States** form a finite-state machine, with each state a small keyframe set tweened by `anim.ts`:
  - `idle`: breathing (torso scaleY 1→1.01 over 3.5 s), blinking (lids close for 120 ms at random 2-6 s), and a tiny head sway.
  - `deal`: the right arm reaches to the shoe, then to the target spot. The card launch is synced to the arm's peak (event `onRelease`).
  - `gesture`: `welcome` (open palm), `point` (to the active hand), `wave` (no more bets: a horizontal hand sweep over the layout), `tap` (taps the felt for "hit"), and `pay` (pushes chips).
  - `react`: `smile` (win for player), `sympathy` (brows up, small head tilt), `surprise` (eyes wide, brows high; for blackjack or a big side-bet hit), `nod`.
  - `talk`: the mouth is driven by audio level (below), and the head bobs slightly with loudness.
- **Lip-sync:**
  - Clips play through `AudioContext` with an `AnalyserNode` (fftSize 512).
  - Each animation frame, the RMS of the time-domain data → `level` (0..1, smoothed with an attack of 0.5 and a release of 0.15).
  - The viseme comes from the level: <0.05 `rest`, <0.15 `slight`, <0.3 `open-small`, <0.5 `open`, ≥0.5 `wide`, with an extra `oo` when the dominant frequency is below 400 Hz.
  - For the Web Speech fallback, which has no audio graph, it uses `boundary` events and a 9 Hz pseudo-random flap envelope while `speaking`.
- **Speech bubble:** optional text captions next to the dealer, which double as accessibility.
- **API:** `const d = new Dealer(svgHost, { look })`, then `d.setState('idle')`, `await d.gesture('wave')`, `d.react('smile')`, `await d.say(key | text)` (uses `Voice` and drives the mouth), and `d.dealMotion(target)` → Promise.

## 6. UI kit (`ui.ts`)
- **Buttons:**
  - Pill-shaped and at least 56px tall, so they're thumb-friendly.
  - Gradients by role: primary gold (`#f2c14e`→`#c89527`, dark text), action green (Hit), red (Stand), blue (Double), purple (Split), grey (Surrender).
  - Pressed state: translateY(2px) and the shadow shrinks.
  - Disabled: 40% opacity with no shadow.
  - The keyboard shortcut is shown as a small badge on desktop (H/S/D/P/R).
  - Each button shows only when the engine says the action is legal (`game.available()`).
- **Bet spots:** a circle with a double ring (gold dashed) and the label printed on the felt (`BET`, `PP`, `21+3`, `LL`, `BUST`, `RM`). An active spot glows, and a spot that would exceed the limit shakes for 200 ms.
- **HUD:**
  - Top bar: bankroll (animated count-up), current bet, table name, and min/max. Icons for the ☰ menu, ? paytable, ⚙ settings, and 🔊 mute.
  - The shoe indicator shows cards remaining and the cut-card marker.
  - Hand totals appear as small badges under each hand ("soft 17" shown as "7/17").
- **Paytable modal:**
  - Sheet-style on mobile and centered on desktop.
  - Tabs per side bet, each showing the paytable rows generated from `rules.pay`, plus the source link and a "for fun, house edge shown" line.
  - Also a "Table rules" tab generated from `Rules`.
- **Settings:** preset table picker, toggles (S17/H17, DAS, surrender, resplit aces, peek), BJ payout, deck count, penetration slider, felt color, four-color deck, voice (clips / device voice / off), volume sliders (SFX, voice, ambient), animation speed (0.5×–2×), "Reset bankroll" (confirm dialog), and "Reduce motion" (honors `prefers-reduced-motion`).
- **Toast/announcer:** the large center text "BLACKJACK!" and "DEALER BUSTS", with scale-in and gold particles (canvas confetti, 40 particles; none at `quality:'low'`).
- **API:** `ui.button(label, role, onClick)`, `ui.betSpot(id, label)`, `ui.hud.set({ bankroll, bet })`, `ui.modal(title, contentEl)`, `ui.toast(text, kind)`, `ui.settings(schema, values, onChange)`.

## 7. Sound (`Sound`): WebAudio synthesized, no sample files
| id | recipe |
|---|---|
| `snap` (card) | 25 ms white-noise burst → bandpass 2.5 kHz Q 1.2, gain env 0→0.6→0 in 30 ms, plus a 1 ms click |
| `slide` (card across felt) | 180 ms brown noise → lowpass 1.2 kHz, gain swell 0.15 |
| `flip` | two `snap`s 60 ms apart, the second 20% quieter |
| `clack` (chip) | two sine partials 2.9 kHz + 4.3 kHz, decay 60 ms, + noise tick; pitch ×(1 + 0.03·i) for the i-th chip in the stack |
| `shuffle` | 1.6 s of noise bursts at 14–22 Hz (riffle) → bandpass 3 kHz, with an amplitude ramp; then a 300 ms "bridge" whoosh |
| `ambient` | looping casino room: pink noise lowpass 600 Hz at gain 0.03, + random far-off chip clacks (every 0.8–3 s, gain 0.02), + an occasional soft slot-machine chime (sine arpeggio, gain 0.01). Off by default on mobile data. |
| `win` / `lose` / `bj` | short sine arpeggios (C-E-G-C at 90 ms; a descending minor third; a gold "sparkle" from a 5-note pentatonic run) |
- The `AudioContext` is created or resumed on the first user gesture, which the Android WebView allows automatically.
- **API:** `Sound.play(id, { gain, rate })`, `Sound.ambient(on)`, `Sound.volume.sfx|ambient = 0..1`.

## 8. Voice (`Voice`)
- **Clips:**
  - Dealer lines are prerecorded with **Kokoro-82M** (hexgrad, **Apache-2.0**), voice `am_michael`, as 64 kbps mono MP3.
  - Hosted on GitHub Pages: `https://mjlembo88.github.io/casino-games/voice/manifest.json`, with each clip at `…/voice/<key>.mp3`.
  - Manifest: `{ model, license, voice, format, base, lines: [{ key, text, file, duration_s }] }`.
- **Loading:**
  - Fetch the manifest. Lazily fetch each clip as an `ArrayBuffer` and decode with `decodeAudioData`, keeping it in an in-memory `Map`.
  - Preload the six most common lines after the first gesture.
  - Pages sends `Access-Control-Allow-Origin: *`, so the clips can feed the AnalyserNode for lip-sync.
- **Fallback (Web Speech API):** used if the manifest or clip fails, or the user picks "device voice".
  - `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`, with rate 1.05 and pitch 0.95.
  - Prefer an English voice whose name matches /male|daniel|google us english/i.
  - Captions always show, so "off" still works.
- **Queueing:** one line at a time. A new high-priority line (for example "Blackjack!") cuts a low-priority one, and the gap between lines is `timing.dealerTalkGap`.
- **Totals:** "Dealer has N" uses the clips `dealer_17…dealer_21`, and the player totals use `total_4…total_21`. Anything else goes through speech synthesis.
- **API:** `await Voice.init(manifestUrl)`, `await Voice.say(keyOrText, { priority })` (returns the `AudioNode` for analysis, or null on fallback), and `Voice.mode = 'clips' | 'device' | 'off'`.

## 9. Animation & timing (`anim.ts`)
- A tiny tween engine: `tween(el|obj, to, { ms, ease, delay })` → Promise. Easings: `outCubic`, `inOutCubic`, `outBack(1.4)`, `linear`.
- It runs on a single `requestAnimationFrame` loop shared by canvas and DOM, and pauses when `document.hidden`.
- `timeline([...steps])` runs steps sequentially. Steps can be `parallel([...])`.
- Global speed multiplier `anim.speed` (settings), with reduced motion → `speed = 4` and no rotation.

| beat | ms (at 1×) |
|---|---|
| card deal (each) | 280, with 90 ms stagger |
| card flip | 260 |
| hole-card peek | 450 |
| chip slide | 380, with 40 ms per-chip stagger |
| dealer draw pause between hits | 550 |
| result toast | 900 in, 1200 hold |
| shuffle sequence | 2200 (shuffle sound + dealer "Shuffling" + cut-card insertion) |

## 10. Module API summary
```ts
theme                                   // tokens
new Table(canvas, opts)                 // .render() .resize() .spot(name)
new CardView(card|null, opts)           // .dealTo() .flip() .toDiscard() .setState()
new ChipStack({amount}) / ChipRack      // .set(amount,{animateFrom}) select(denom)
new Dealer(host, {look})                // .setState() .gesture() .react() .say() .dealMotion()
new ShoeView(spot, {decks})             // .setRemaining(n,total) .showCut(frac) .discardHeight(n)
Sound.play(id) / Sound.ambient(on)      // synthesized SFX
Voice.init(url) / Voice.say(k|text)     // clips + Web Speech fallback
tween() / timeline() / parallel()       // animation
ui.button/betSpot/hud/modal/toast/settings
storage.get/set(key, value)             // localStorage JSON, keys prefixed 'casino.'
```
A game module provides `rules` (pure engine), `layout` (spots), and a controller that maps engine events (`deal`, `peek`, `turn`, `reveal`, `dealerHit`, `settled`, `shuffle`) onto kit animations and voice lines.

## 11. Reuse checklist for the next game (craps / roulette)
1. Copy `src/kit/` as is.
2. Add `layout: 'craps' | 'roulette'` printed text and spots in `Table` (the roulette wheel is its own Canvas component, `Wheel`, and the craps dice are `Dice`; both use the same tokens, lighting, and sounds).
3. Write a pure-TS rules engine with vitest tests in `engine/`, then paste it in.
4. Add voice lines to the manifest (same model and voice, for consistency) and regenerate with `tts/gen.py`.
5. Keep the shared bankroll key `casino.bankroll`, so all games share one play-money bankroll.

## 12. Art sources & licenses (art v1, 2026-10-23)
The kit can now load optional raster art from GitHub Pages: `https://mjlembo88.github.io/casino-games/assets/kit/` (CORS `*`). The index is `assets/kit/manifest.json`, which lists every file's purpose, size, model, license, method and prompt. If an asset fails to load, the procedural renderers in §2–§5 are still the fallback.

| Asset | Made with | License | Link |
|---|---|---|---|
| Dealer still + 5 sprite frames + idle/talk/react_win loops | **SimianLuo/LCM_Dreamshaper_v7**, run locally on CPU (diffusers txt2img/img2img). Frames are masked face edits; loops are built with ffmpeg | **MIT** | https://huggingface.co/SimianLuo/LCM_Dreamshaper_v7 |
| Felt, leather, paper, clay textures | same model; high-pass + offset-blend to make them tileable | MIT | same |
| Tables (top-down + perspective, 1920×1080 + 1080×1920) | procedural numpy composite of the AI felt/leather textures | MIT (model) / original code | — |
| Chips 1…5K (faces + side views) | procedural chip in `theme.chip` colors + AI clay detail (img2img 0.28; luminance only, so colors stay exact) | MIT (model) / original code | — |
| Card backs (red `#8a0d22`, blue) | procedural lattice + "M" medallion × AI paper texture | MIT (model) / original code | — |
| Overlay text "BLACKJACK PAYS 3 TO 2" | DejaVu Serif Bold | Bitstream Vera / DejaVu free license | https://dejavu-fonts.github.io/License.html |

- Libraries: diffusers (Apache-2.0), torch (BSD), Pillow, numpy, scipy, ffmpeg. All model downloads are public, with no HF token stored or used.
- The dealer is a fictional generated man in his 40s (salt-and-pepper hair and beard, black vest, burgundy bow tie). He isn't based on any real person, and there are no real casino names or logos.
- **No Krea output is in the repo or the app.** Krea drafts in `assets/kit/_samples/` are private reference only and git-ignored (the Krea account is on the Free plan, which has no commercial license or redistribution rights).
- Regenerate with `/workspace/casino/art-hf/*.py` (`.artvenv`). See `/home/box/ops/cheatsheets/casino-games.md`.

## 13. Celebrations (`celebrate.ts`)
Shared win/blackjack/push/bust/big-win effects by Proto Bot. They're 100% procedural (DOM + Canvas2D + WebAudio), with no images, fonts or AI.
- Kit source: `kit/celebrate.ts` in the repo, which goes to `src/kit/celebrate.ts` in a Grok Build project. It imports nothing, and has no game imports.
- The API, hookup steps, timings and reduce-motion/quality rules are in `art/celebrations/README.md` ("Wiring into src/kit"). The demo is `art/celebrations/demo.html`, and review clips are in `art/celebrations/media/*.mp4|gif`.
- API: `createCelebrator(tableEl, opts)` returns `fx.win | blackjack | push | bust | lose | bigWin | celebrate(level, text, at?, sub?) | set | clear`, plus `drawChip(ctx, x, y, r, denom, theme)`.
