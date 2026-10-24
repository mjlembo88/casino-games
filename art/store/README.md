# Google Play store assets: Casino Blackjack (Marcus's play-money blackjack)

Made by Proto Bot on 2026-10-23 from the live build at https://marcus-casino-blackjack.grok.me (APK v0.1.1: https://github.com/mjlembo88/casino-games/releases/tag/v0.1.1).
Everything here is **procedural** or uses existing Casino Kit art (MIT model `SimianLuo/LCM_Dreamshaper_v7` plus original code, per `assets/kit/manifest.json`). **No Krea, no paid media, no AI generation in this drop.** There are no real casino names or logos, no celebrity likenesses, no real-money claims, and no prices. Play money only.
Celebration effects are **not** shown anywhere: they are being republished, so every shot was taken before the result toast appeared.

## Files
| Path | What it is | How it was made |
|---|---|---|
| `raw/01_bet.png` | Bet screen: 150 in chips on BET, chip rack, Clear/Rebet/2×/Deal | Playwright (headless Chrome via playwright-core) on the live site, phone **portrait** viewport 432×768 CSS px at DPR 2.5 = **1080×1920** (9:16). Unedited pixels. |
| `raw/02_dealing.png` | Opening deal mid-motion (card in flight from the shoe) | same, 3.7 s after Deal |
| `raw/03_decision.png` | Hit / Stand / Double / Surrender with the dealer's "Hit or stand?" | same, when the action buttons appeared |
| `raw/04_in_play.png` | Hand in play after a hit (three player cards, hole card down) | same |
| `raw/05_result.png` | Result: dealer stands on 17, player 20, dealer says "You win." (before any toast) | same |
| `raw/06_coach.png` | Strategy Coach table: grade card "✓ Stand · Hard 14 vs 6" plus the coach panel | same, Strategy Coach → "Vegas Strip 6D S17 3:2 with coach" |
| `framed/0N_*_framed.png` (6) | Store versions, 1080×1920: felt background, one caption per shot (84 px Playfair Display headline + 38 px Inter subline), real screenshot unchanged inside a simple phone bezel, 30 px footer "PLAY MONEY ONLY · NO CASH PRIZES · NO ADS" | `src/frame.mjs` renders local HTML/CSS in headless Chrome. Felt = CSS radial gradients in kit tokens (`#14804a` → `#0b5d34` → `#073d22`) + SVG feTurbulence grain + vignette (CASINO_KIT §2). |
| `feature-graphic_1024x500.png` | Play feature graphic, 1024×500, 24-bit RGB (no alpha) | `src/frame.mjs`: same felt, title "Casino Blackjack", tagline "Play money. Real rules. Strategy Coach built in.", kit card backs (`cards/card_back_red|blue.png`) and chips (`chips/chip_25|100|1000.png`), tilted phone showing `raw/05_result.png` |
| `promo/promo_1080x1920.mp4` | Promo loop: 12.0 s, 1080×1920, 30 fps, H.264 yuv420p, no audio | `src/promo.py` (Pillow + numpy → PNG frames → ffmpeg). Beats: title card (kit cards + chips) → "Stack your chips" → "Dealt card by card" (card back flies across) → "Every classic move" → "Beat the dealer for fun" (second card fly-by) → "Learn basic strategy" → title rebuilds. Slow pans/zooms on the real screenshots, slide transitions, caption fades. **Seamless loop:** frame 360 renders identical to frame 0 (mean abs diff 0.0); chip bob is periodic over the loop. |
| `promo/promo_preview_360x640.gif` | GIF preview of the loop (15 fps, 360 px wide, loops forever) | ffmpeg palettegen/paletteuse from the same frames |
| `promo/build/felt_bg_1080x1920.png` | Shared felt background used by the promo | `src/frame.mjs` |
| `review/promo-contact-sheet.png` | Every 0.5 s of the promo plus the last frame | `src/promo.py` |
| `review/screenshots-contact-sheet.png` | All raw + framed shots + feature graphic on one sheet | Pillow |
| `raw/_capture_logs/*.json` | Per-frame game state logged during capture (cards, caption, HUD) | `src/capture.mjs` |
| `src/capture.mjs` | Plays real rounds on the live site and saves candidate frames (`raw/cand/`, scratch) | `node capture.mjs table 3 0` / `node capture.mjs coach 1 20` |
| `src/frame.mjs` | Framed shots + feature graphic + felt bg | `node frame.mjs` |
| `src/promo.py` | Promo mp4 + gif + contact sheet | `python3 promo.py` (~2 min) |
| `src/sheet.py` | Quick contact-sheet helper for reviewing candidates | `python3 sheet.py 'glob' out.png [cols]` |

Fonts: Playfair Display and Inter (both SIL Open Font License), installed locally. Kit art: see `/workspace/casino/assets/kit/manifest.json` (MIT model, original code, no third-party marks).

## Regenerate
```
cd store/src && npm i playwright-core          # Chrome via channel:'chrome' (src/node_modules is a local symlink; don't commit it)
node capture.mjs table 3 0 && node capture.mjs coach 1 20   # pick frames from raw/cand/, copy to raw/0N_*.png
node frame.mjs && python3 promo.py
```
The rounds are random (live shoe), so a re-capture gives different hands; pick frames by eye and check the caption/toast fields in the log.
For the repo: commit everything except `raw/cand/`, `promo/build/frames/` and `src/node_modules`.

## Known site issues visible in these shots (worth fixing, then re-run capture)
- **HUD overlap at every phone portrait width (360–540 px):** the bankroll and bet values draw on top of the "Min 25 · Max 5,000 · play money" line, the table name truncates to "Vegas St…", and the min/max placard sits under the Menu button. It's in all six raw shots.
- **Stale action buttons:** Hit/Stand stay visible during the dealer's turn and after the result, and on the next round Hit/Stand/Double show during the deal before the cards land.
- At 360 px wide the chip rack overflows: the 1 and 5K chips are cut off at the edges (the 432 px capture avoids this).
- In Strategy Coach the coach panel covers the dealer's face and his speech captions in portrait.
- The bet spot shows one chip for a 150 bet (25+25+100) instead of a stack (POLISH_SPECS P0-2).
- Hand total badges under the cards are very small at phone size.
- Landscape was skipped on purpose (known dealer-card/photo overlap).
