# Celebrations: win, blackjack, push, bust, and big-win effects (Casino Kit K1)

This is a drop-in shared celebration engine for Marcus's play-money casino games. It's 100% original procedural code: DOM text plus Canvas2D particles plus a WebAudio synth. It uses **no images, fonts, samples, or AI models**, and **no real casino names or logos**. The only name in it is "Marcus". It's play money only.

| Path | What it is |
|---|---|
| `src/celebrate.ts` | **The module.** Strict-TS clean, no dependencies, imports nothing from games. Copy to `src/kit/celebrate.ts`. |
| `dist/celebrate.mjs` / `dist/celebrate.iife.js` | Built JS (ESM / `window.CasinoCelebrate`), for non-TS use |
| `demo.html` | Self-contained demo (open from disk, works offline). It has buttons for each effect plus toggles for quality:low, reduce motion, sound, and speed, and a live particle counter. |
| `src/demo.src.html`, `build.mjs` | Demo source and build (`node build.mjs`, needs `esbuild`) |
| `capture.mjs` | Headless Chrome (playwright-core) capture: frames, MP4/GIF, and checks |
| `media/<effect>.mp4` / `.gif` | Review clips at 1280×720 / 30 fps (GIF 640 px wide) |
| `media/<effect>-<ms>ms.png` | Key frames. `blackjack-quality-low.png`, `blackjack-reduce-motion.png`, `blackjack-portrait.png` |
| `media/capture-report.json` | Automated checks (below) |
| `review/contact-sheet.png` | All effects on one sheet |

## What each effect does (matches POLISH_SPECS P0-1 and K1)
| Call | Toast | Extras | Haptic / sound |
|---|---|---|---|
| `fx.win({cards})` | `YOU WIN` (or `text:'DEALER BUSTS'`), 72 px print serif, text color with a gold stroke | one gold glow pulse on the winning cards, 0→1→0 over 600 ms | `win` / C-E-G-C arpeggio |
| `fx.blackjack({cards, chips, sub})` | `BLACKJACK!` 96 px print serif, gold gradient `#ffe08a→#f2c14e→#c89527`, 2 px `#021a0e` drop shadow, gold rule-and-diamond banner lines | 40 confetti pieces (70% gold, 15% cream, 15% red, 6×10 spinning rects, 10–170° up, gravity 1400), two gold ring flashes at the toast, a 2 px ring 1.0→1.4 in 300 ms on the payout `chips` element, cards keep the `highlight` glow. The optional `sub` pill ("Pays 3 to 2" or a side-bet line) slides in 300 ms later. | `blackjack` / C6-D6-E6-G6-A6 sparkle |
| `fx.push({chips})` | `PUSH` 64 px in `dim`, no stroke, **no gold** and no particles | chips nudge 4 px toward the player (160 ms) | none (neutral) |
| `fx.bust({cards})` | `BUST` 56 px red (thin cream outline for contrast on felt) | subtle red vignette dim over the felt (fade in 200 ms, out 600 ms), losing cards go to 50% opacity and shake ±6 px, decaying over 300 ms | `bust` / descending minor third |
| `fx.lose({cards})` | none (spec: no toast on a plain loss) | cards dim to 50% | sound only, no vibration |
| `fx.bigWin({amount, to, sub})` | `+1,500` count-up in the gold style (no "win big" copy), e.g. sub "Added to Marcus's bankroll" | **chip shower**: 60 kit chips (sprites drawn with `drawChip`, the same art as kit §4) rain down, flip in fake 3-D, bounce once (restitution .35) on the tray, clack with rising pitch, and fade. Gold rings at the toast and the tray. | `blackjack` |
| `fx.celebrate(level, text, at?, sub?)` | generic K1 API: `'small'` = win style, `'big'` = blackjack style, `'epic'` = gold toast plus ring plus 60 confetti, holding 1800 ms | for craps ("POINT!") and roulette ("STRAIGHT UP 35 TO 1") | |

Timing: the toast scales 0.6→1.08→1.0 over 900 ms, holds 1200 ms (epic 1800), and fades over 250 ms. Durations are divided by `speed` (`anim.speed`). There's one beat per round: any new call clears the previous one. Each call returns a Promise that resolves when its toast is gone, so a controller can `await` it before "Place your bets". Every toast text is also written to an `aria-live="polite"` region.

**Reduce motion** (defaults to `prefers-reduced-motion`) and **`quality:'low'`**: no particles, no shake, no ring scaling, and no blur glows. The toast just fades in over 200 ms. State is still shown by text, glow, dim, and opacity. Under `'auto'`, quality drops to low if the average frame time is over 20 ms across 120 frames.

## Checks (from `media/capture-report.json`)
- Blackjack toast ends at **2350 ms** at 1× (spec: 2.35 s ±50 ms). Chained phases carry their exact end time, so frame jitter doesn't add up.
- `quality:'low'` and reduce motion: **0 particles drawn** for blackjack and big win (`fx.stats.particlesDrawn` counter).
- Peak live particles are 40 (blackjack) and 60 (big win), within the kit's pool of 60. There are no per-frame allocations in the particle loop.

## Wiring into `src/kit` (Grok Build project)
1. Copy `src/celebrate.ts` to `src/kit/celebrate.ts`. Kit files never import games, and this one imports nothing at all.
2. Add to `theme.ts` (K1/K2), or just pass the existing `theme`:
   ```ts
   import { celebrateLevels, hapticPatterns } from './celebrate';
   export const theme = { ...existing, celebrate: celebrateLevels, haptics: { ...hapticPatterns, /* game extras */ } };
   ```
3. Create one instance per table, on the same host element that holds the felt canvas and cards. It adds its own overlay (pointer-events: none, z-index 50) with a canvas and the toast:
   ```ts
   import { createCelebrator } from '../kit/celebrate';
   const fx = createCelebrator(tableEl, {
     theme: { gold: theme.gold, red: theme.red, cream: theme.cream, text: theme.text, dim: theme.dim, fontPrint: theme.font.print, fontUi: theme.font.ui, chip: theme.chip },
     quality: theme.quality, speed: anim.speed, reduceMotion: settings.reduceMotion,
     onHaptic: (name) => ui.haptic(name),                         // reuse the kit's throttled haptic + settings toggle
     onSound: (id, o) => { Sound.play(id, o); return true; },     // reuse kit Sound ('win' | 'bj' | 'lose' | 'clack')
   });
   settings.onChange((s) => fx.set({ reduceMotion: s.reduceMotion, speed: s.animSpeed, quality: s.quality }));
   ```
   Without `onSound`, the built-in synth plays only when `sound: true`. Without `onHaptic`, it calls `navigator.vibrate` directly, throttled to 60 ms. The APK still needs `<uses-permission android:name="android.permission.VIBRATE"/>` (P0-3).
4. Blackjack controller, on `settled`, **after the last payout chip lands** (spec order: chips → toast → confetti). Use the biggest result only:
   ```ts
   const cards = handView.cardEls;
   switch (hand.outcome) {
     case 'blackjack': await fx.blackjack({ cards, chips: payoutColumn.el, sub: sideBetLine }); break;
     case 'win':       await fx.win({ cards, text: dealerBusted ? 'DEALER BUSTS' : 'YOU WIN' }); break;
     case 'push':      await fx.push({ chips: betStack.chipEls }); break;
     case 'bust':      await fx.bust({ cards }); break;
     case 'lose':      await fx.lose({ cards }); break;
   }
   // optional, e.g. a side-bet top pay or net >= 10x bet: await fx.bigWin({ amount: hand.net, to: chipTrayEl, sub: "Added to Marcus's bankroll" });
   fx.clear(); // at the next deal
   ```
   It only reads outcomes. The engine, payouts, and strategy stay untouched.
5. Craps and roulette: `fx.celebrate('big', 'POINT!')`, `fx.celebrate('epic', 'STRAIGHT UP', undefined, '35 to 1')`, `fx.bigWin({ amount })`. `drawChip(ctx, x, y, r, denom, theme)` is exported too, for any game that needs chip art on canvas.

Performance: there's one rAF loop that only runs while something is animating, and it stops when idle. The canvas DPR is capped at 2, chip sprites are cached per denomination, and the particle pool holds 60.

## Regenerate
```
npm i esbuild playwright-core        # Chrome is used via channel:'chrome'
node build.mjs && node capture.mjs && python3 contact_sheet.py   # ~5 min; frames/ is scratch (gitignored)
```
For the repo, commit `src/`, `dist/`, `demo.html`, `README.md`, `media/*.mp4`, `media/*.gif`, the key-frame PNGs, and `review/`. Skip `frames/` and `node_modules`.
