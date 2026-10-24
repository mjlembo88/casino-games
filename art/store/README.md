# Google Play store assets: Casino Blackjack (Marcus's play-money blackjack)

Made by Proto Bot on 2026-10-23 and **recaptured 2026-10-24 (1:05–1:52 AM ET) from the rebuilt live site** at https://marcus-casino-blackjack.grok.me (fresh loads, `Cache-Control: no-cache`, bundle `index-vw6iRnpb.js` / `routes-CkIwc6Tr.js`). APK v0.1.1: https://github.com/mjlembo88/casino-games/releases/tag/v0.1.1.
Everything here is **procedural** or uses existing Casino Kit art (MIT model `SimianLuo/LCM_Dreamshaper_v7` plus original code, per `assets/kit/manifest.json`). **No Krea, no paid media, no AI generation in this drop.** There are no real casino names or logos, no celebrity likenesses, no real-money claims, and no prices. Play money only. The site was never modified; the init script only reads.

## Files
| Path | What it is | How it was made |
|---|---|---|
| `raw/01_bet.png` | Bet screen: 25+25+100 = 150 on BET as a settled 3-chip stack, chip rack, Clear/Rebet/2×/Deal | `src/store_bet.mjs`: Playwright (headless Chrome, playwright-core), phone **portrait** 432×768 CSS px at DPR 2.5 = **1080×1920** (9:16). Unedited pixels. |
| `raw/02_dealing.png` | Opening deal with the hole card in flight | `src/celeb2.mjs` (STORE=1), ~2.9 s after Deal |
| `raw/03_decision.png` | Hit / Stand / Double / Split / Surrender, 10 up vs 3-3 | same, when the actions appeared |
| `raw/04_in_play.png` | After a hit: three player cards (16) vs 10, Hit/Stand | same, when the actions came back after the hit |
| `raw/05_result.png` | Settled win, 20 vs dealer 17, "20 win" badge, payout chips, after the toast faded | same, ~350 ms after the YOU WIN toast left |
| `raw/06_coach.png` | Strategy Coach: grade bar "✓ Hit · Hard 7 vs 10" plus the coach panel docked above the actions | `celeb2.mjs` coach mode, 800 ms after the action |
| `raw/07_win.png` | "YOU WIN" toast over the player's hand | `celeb2.mjs`, full-res frame ~1.1 s after the toast node appeared |
| `raw/08_dealer_busts.png` | "YOU WIN" + red "Dealer busts" label over the dealer's cards | same |
| `raw/09_push.png` | Translucent "PUSH" toast | same |
| `raw/10_bust.png` | Red "BUST" with the red edge vignette | same |
| `raw/11_big_win.png` | Big win (500 bet): gold count-up "+492", ring, chip shower around the dealer | same |
| `raw/12_blackjack.png` | Natural: gold "BLACKJACK!", ring, confetti, dealer says "Blackjack! Pays three to two." | same |
| `framed/NN_*_framed.png` (12) | Store versions, 1080×1920: felt background, one caption per shot (84 px Playfair Display + 38 px Inter), real screenshot unchanged in a phone bezel, footer "PLAY MONEY ONLY · NO CASH PRIZES · NO ADS". Captions unchanged from the last drop (all still true on the new build). | `src/frame.mjs` (local HTML/CSS in headless Chrome; felt = kit-token radial gradients + SVG grain, CASINO_KIT §2) |
| `feature-graphic_1024x500.png` | Feature graphic, 1024×500 RGB, phone now shows the new `raw/05_result.png` | `src/frame.mjs` |
| `promo/promo_1080x1920.mp4` | Promo loop, **14.0 s**, 1080×1920, 30 fps, H.264, no audio. Beats: title → bet → deal → decision → result → blackjack (8.6–10.6 s) → coach → title. **Seamless:** frame 420 = frame 0 (mean abs diff 0.0). Zooms cut to ≤1.04 so no header text is clipped on the new layout. | `src/promo.py` (Pillow + numpy → frames → ffmpeg) |
| `promo/promo_preview_360x640.gif` | GIF preview (15 fps, loops) | ffmpeg palettegen/paletteuse |
| `promo/build/felt_bg_1080x1920.png` | Felt background used by the promo | `src/frame.mjs` |
| `review/screenshots-contact-sheet.png` | 12 raw + 12 framed + feature graphic | `src/shots_sheet.py` |
| `review/promo-contact-sheet.png` | Promo every 0.5 s + last frame | `src/promo.py` |
| `review/blackjack-evidence-sheet.png` | Live natural (1:11:53 AM ET, no-reload session, no screenshot stalls) in 100 ms steps from −600 to +3700 ms | `src/bj_evidence.py` from `celeb/evidence/v2_blackjack_live_a_r12_432x768.mp4` |
| `review/layering-sheet.png` | Full-res crops: toast vs cards vs total badge for blackjack ×2, win, dealer bust, push, bust, big win | `src/layering_sheet.py` from `celeb/evidence/v2_layering/` |
| `review/widths-check.png` | Bet screen, top-bar zoom and chip-rack zoom at 360 / 412 / 432 px | `src/widths.mjs` + Pillow |
| `celeb/evidence/v2_blackjack_live_{a_r12,b_r3}_432x768.mp4` + `_sequence.png` | Two live naturals, 4.4 s screen recordings + 10 fps sheets | Playwright recordVideo + `src/bj_evidence.py` |
| `celeb/evidence/v2_layering/*.jpg` | 11 full-res 1080×1920 celebration frames cited in the layering verdict | `celeb2.mjs` |
| `celeb/evidence/blackjack_live_*`, `bj_frames/` | Evidence from the 2026-10-23 build (kept) | `src/celeb.mjs` |
| `celeb/v2/logs/rounds_*.json.gz` | Every v2 round: cards, actions, marks (deal/hit/stand), 50 ms in-page samples (card count, cards moving, visible action pills, Deal + chip-rack visibility, toast text/opacity, dim, canvas lit px), console errors | `src/celeb2.mjs` |
| `celeb/v2/analysis.json` | Per-round verdicts (stuck, actions before cards land / in dealer turn / after result, Deal or rack during toast, toast ms) and totals | `src/analyze2.py` |
| `celeb/v2/widths_{360,412,432}.png` | Raw width-check screens | `src/widths.mjs` |
| `celeb/summary.json`, `celeb/run*/rounds_*.json`, `celeb/stuck/*.png` | 2026-10-23 capture data and the old no-card bug screens (kept as evidence; the burst folders were deleted) | `src/celeb.mjs`, `src/celeb_summary.py` |
| `src/celeb2.mjs` | v2 harness: `node celeb2.mjs <worker> <rounds> [width] [table\|coach]`, **no reload between rounds** (set `RELOAD_EACH=1` to reload), `STORE=1` also saves store candidates; scratch shots/videos go to `celeb/v2/shots`, `celeb/v2/video_*` (don't commit) | |
| `src/analyze2.py`, `src/bj_evidence.py`, `src/layering_sheet.py`, `src/widths.mjs`, `src/store_bet.mjs` | Analysis, evidence clip/sheet, layering sheet, width check, 01 bet shot | |
| `src/frame.mjs`, `src/promo.py`, `src/shots_sheet.py`, `src/sheet.py`, `src/capture.mjs`, `src/celeb.mjs`, `src/celeb_summary.py` | Framing, promo, sheets, the 2026-10-23 capture scripts | |

Fonts: Playfair Display and Inter (SIL OFL), installed locally. Kit art: `/workspace/casino/assets/kit/manifest.json`.

## Regenerate
```
cd store/src && npm i playwright-core     # Chrome via channel:'chrome'
for w in a b c; do node celeb2.mjs $w 34 & done; wait       # retest, no reloads
STORE=1 node celeb2.mjs s 14; node celeb2.mjs coach 4 432 coach; node store_bet.mjs ../raw/01_bet.png
python3 ../src/analyze2.py   # run from store/
# pick frames from celeb/v2/shots into raw/NN_*.png, then:
node frame.mjs && cd .. && python3 src/promo.py && python3 src/shots_sheet.py && python3 src/layering_sheet.py && node src/widths.mjs
```
For the repo: commit everything except `promo/build/frames/`, `celeb/v2/shots/`, `celeb/v2/video_*/`, `src/node_modules`, `src/_page.html`. `celeb/stuck/` (35 MB, old-build bug screens) is optional.

## Retest of the rebuilt site (2026-10-24, 1:05–1:52 AM ET)
225 live rounds in one page session per worker, **no reloads between rounds** (3–5 parallel workers plus one solo worker for timing), table "Vegas Strip 6D S17 3:2", 432×768 @2.5, 100 bets (500 when hunting the big win, 25+25+100 for stack checks). **Console: 0 errors, 0 warnings, 0 page errors.**

| Check | Result |
|---|---|
| Stuck deal (bet taken, actions shown, no cards) | **0 of 225** (was 32 of ~88) |
| Hit/Stand before the cards land | 0 of 225. The first action appears 5.1–5.2 s after Deal (median 5.22 s), about 1.3 s after the 4th card stops moving |
| Hit/Stand during the dealer's turn | 0 of 225 |
| Hit/Stand after the result | 0 of 225 |
| Deal button during a toast | 0 of 225. Deal comes back 2.2–3.0 s after the toast leaves (payout first) |
| Chip rack during a toast | 0 of 225 |
| Toasts above the cards | Pass for all six (see layering table) |
| Top bar at 360 / 412 / 432 | Pass. Full title "Vegas Strip 6D S17 3:2", Menu clear of it, "Bankroll · Bet · Min 25 · Max 5,000" on one row, nothing truncated (no ellipsis or overflow in the DOM) |
| Chip rack at 360 | Pass. All 7 chips on screen, none overlapping |
| Coach panel vs dealer | Pass. It docks at the bottom above the actions; dealer, cards and badges stay clear |
| Bet stack | Pass. 25+25+100 shows a 3-chip stack, then 165 / 665 stacks correctly (largest at the bottom). The restack animates for ~1 s, so a shot within ~0.6 s can catch a chip mid-air |
| Total badges | Pass. Large dark pills with gold rim next to each hand ("10", "17 win", "11/21 blackjack", "22 bust") |
| "Dealer busts" vs felt text | Pass. It's now a red label above the dealer's cards, clear of "BLACKJACK PAYS 3 TO 2" |
| Chip shower vs bankroll | Pass. Chips fall around the dealer portrait; the top bar stays clear (Bankroll still shows the pre-payout value during the toast) |

**Layering per celebration** (frames in `celeb/evidence/v2_layering/`, crops in `review/layering-sheet.png`):
- BLACKJACK! (15 naturals; checked on #1 and #3): gold letters, ring and confetti draw over the cards. Pass. `blackjack1_d_r3_550ms.jpg`, `blackjack1_d_r3_1100ms.jpg`, `blackjack3_d_r8_550ms.jpg`
- YOU WIN: the letters draw over the card edge and the "win" badge. Pass. `win1_g_r1_550ms.jpg`, `win1_g_r1_1100ms.jpg`
- Dealer bust: same toast plus the label. Pass. `dealerbust1_g_r8_1100ms.jpg`
- PUSH: translucent silver letters over the cards (by design they're see-through). Pass. `push1_f_r4_1100ms.jpg`
- BUST: red letters over the dimmed cards. Pass. `bust1_d_r1_1100ms.jpg`
- Big win "+492": digits over the card and badge, ring, chip shower. Pass. `bigWin1_e_r3_550ms.jpg`, `_1100ms.jpg`, `_1900ms.jpg`

**Toast durations** (node added → removed, clean rounds without screenshot stalls): solo worker win 2.46–2.57 s, push 2.46–2.48 s, bust 2.47–2.50 s, dealer bust 2.47 s (spec small/big 900+1200+250 = 2.35 s, so about +120 ms). Blackjack 2.50–2.55 s at best (2.5–4.9 s with 3+ parallel workers; the stretch tracks headless load, not the site). Big win only seen under load: 4.1 s (epic tier spec 2.95 s plus the count-up; not verified solo).
**Blackjack detail** (`review/blackjack-evidence-sheet.png`): the dealer peeks and says "Blackjack! Pays three to two." ~100 ms before the toast; the canvas lights at ~25 ms (gold ring), confetti peaks at ~380–400 lit px (of 108×192 sampled) at ~180–600 ms and is gone by ~1.7–2.0 s; the toast holds and fades by ~2.5 s; Deal and the chip rack come back ~2.7 s after that. No dim on blackjack. Frame time averaged 17.0 ms.

## Old issues: status on the rebuilt site
- HUD overlap / "Vegas St…" truncation / placard under Menu: **fixed**.
- Stale Hit/Stand during the dealer's turn, after the result, before cards land: **fixed** (0/225).
- Chip rack cut off at 360 px: **fixed**.
- Coach panel covering the dealer: **fixed**.
- One chip for a 150 bet: **fixed** (real stack).
- Tiny total badges: **fixed**.
- Toasts behind the cards: **fixed**.
- Live round with no cards: **fixed** (0/225 without reloads).
- Deal/chip rack/bankroll back during the blackjack toast: **fixed**.
- "Dealer busts" pill over the felt text: **fixed**.
- Landscape: still skipped on purpose.

## Remaining issues (minor)
- **The dealer's speech bubble covers his own cards and total badge.** You can see it in "Blackjack! Pays three to two.", "Too many. Bust." and "You win." (see `raw/12_blackjack.png` and the top crops of `review/layering-sheet.png`). Move the bubble up beside the portrait or shorten its hold.
- **The player's total badge sits inside the toast band.** "11/21 blackjack", "win", "push" and "bust" are partly covered by the toast letters for ~2.5 s (the toast is drawn above them, so it's legible but cluttered). Offsetting the toast slightly upward would clear it.
- **The cards jump 1 px when the action dock appears** (145 of 225 rounds). Cosmetic.
- **Toasts run ~120 ms over the spec** (2.47 s vs 2.35 s). Harmless.
- The big chip shower covers the dealer portrait and dealer cards for ~1.5 s. That's intended flair, but worth a look.
