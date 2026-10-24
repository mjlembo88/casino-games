Add optional raster art to the Casino Kit, keeping the procedural versions as the fallback. Don't change the blackjack engine, payouts, strategy, or training modes. Kit files still never import game files, and the public kit APIs (Table, CardView, ChipStack, Dealer, ui, Sound, Voice) keep their signatures, so craps and roulette can reuse this unchanged.

ASSET HOST (GitHub Pages, CORS *): const ART = 'https://mjlembo88.github.io/casino-games/assets/kit/';
Index: ART + 'manifest.json' (fields: items[{file,url,purpose,size}], dealer_anim, chips). All files are original, generated with a local MIT-licensed model. No secrets.

1) NEW src/kit/art.ts
- `export const Art = { ready: Promise<void>, ok: (key) => boolean, img: (key) => HTMLImageElement | null, url: (path) => string }`.
- On startup (after first paint, don't block it), fetch the manifest with a 5 s timeout. Preload the images for the current orientation via `new Image()` with `decoding='async'` and `crossOrigin='anonymous'`. Mark each key ok only when `onload` fires; on `onerror` or timeout, leave it not-ok.
- Prefer .webp, and fall back to .jpg or .png if webp fails.
- Settings gains a toggle "Table art: Photo / Classic" (default Photo, persisted in localStorage). With Classic, or with `theme.quality === 'low'` on slow devices, nothing is loaded and everything stays procedural.
- If a single asset fails, only that piece falls back. Never show a broken image.

2) TABLE (src/kit/table.ts)
- When `Art.ok`, draw the background image cover-fit to the canvas instead of the procedural felt, gradient and rail. Use `table/table_topdown_1920x1080.webp` in landscape and `table/table_topdown_1080x1920.webp` in portrait (`table_perspective_*` is an option in settings: "View: Top / Angled").
- Keep drawing the vignette, lamp breathing (as a subtle overlay), printed arc text, bet spots and placard procedurally on top. The images are blank felt on purpose.
- The curved player rail in the image: landscape is a circle at center (960,-900) with r=1850 and rail 1850..1924 in 1920×1080 px; portrait is center (540,-700) with r=2400 and rail 2400..2464. Map these through the same cover transform, and align `table.spot()` seats along an arc of r-260 so the bet spots sit just inside the rail.
- Felt tile for other games: `textures/felt_tile_512.webp` (#073d22) as a repeating pattern. `textures/felt_detail_gray_512.webp` can be multiplied or overlaid on any felt color (blue/red/purple) for fabric grain.
- The optional printed overlay `table/overlay_bj_pays_3to2_*.png` matches only the top-down geometry. Use it only when the rules are 3:2; otherwise keep the procedural text.

3) CHIPS (src/kit/chips.ts)
- When ok, the chip face uses `chips/chip_<d>.png`, where d is 1, 5, 25, 100, 500, 1000 or 5000. These are transparent 512 px; `chip_<d>_128.png` is for racks.
- Stacks use `chips/chip_<d>_side.png` (transparent edge view). Stack each chip by -0.16 × its rendered width, keep the existing seeded jitter, and put the face image on top.
- If any of these fail, use the current SVG chip. The same denominations, colors and the animations (place/pay/take) are unchanged.

4) CARDS (src/kit/card.ts)
- The back uses `cards/card_back_red.webp` or `card_back_blue.webp` (500×700, rounded alpha), with the SVG back as fallback.
- The face SVG may use `textures/card_face_paper_512.webp` as a very subtle background pattern (opacity .35). Faces stay procedural.

5) DEALER (src/kit/dealer.ts): photo dealer with the SVG dealer as fallback
- Render a framed "live dealer" panel above the dealer card area (rounded 16 px, inner shadow, gold 1 px border, aspect 3:2, about 42% of the layout width in landscape and 70% in portrait).
- Layer 1 is a `<video muted playsinline loop preload="auto" crossorigin="anonymous" poster=...>` with `<source>` = `dealer/dealer_<state>.webm` then `.mp4`. States are:
  - idle → `dealer_idle` (4 s loop with blink and breathing)
  - talk → `dealer_talk` (3 s mouth-flap loop)
  - react smile/surprise → `dealer_react_win`
  - sympathy / nod / any other state → `dealer_idle`
  - gesture/deal → keep `dealer_idle` and show the existing procedural arm/card motion over the felt
- Swap the src only when the state changes, crossfading 150 ms between two stacked video elements.
- Layer 2 is lip-sync sprites for the talk state. Preload `dealer/frames/dealer_{rest,mid,open,blink,smile}_768x512.webp`, and a `<canvas>` covers the video while `Voice` is speaking. Each frame, pick from the AnalyserNode level (§5): level < 0.08 → rest, < 0.25 → mid, otherwise open. With Web Speech fallback, use the 9 Hz flap envelope. Every 2–6 s, show blink for 120 ms. When speech ends, hide the canvas and return to the idle video. This keeps the mouth synced to the actual TTS clip; the `dealer_talk` loop is only used if the sprites failed.
- `d.say()`, `d.react()`, `d.setState()` and `d.dealMotion()` keep their signatures and Promises. Captions/speech bubble unchanged.
- Fallback: if the video `error` event fires, if the sprites aren't ok, under "Reduce motion" (show the poster/still `dealer/dealer_still_1536x1024.webp`, rest frame only, no flap), or with "Classic" art, use the existing SVG Dealer exactly as it is now.
- Pause the video when the tab is hidden (visibilitychange).

6) CELEBRATIONS
If `src/kit/celebrate.ts` isn't in the project yet, ask me for it (it lives in the repo at kit/celebrate.ts). Don't write a new one.

7) TEST AND REPORT
- Test with the network blocked to mjlembo88.github.io: everything must look exactly like the current procedural build, with no console errors except the failed fetch logged once.
- Test landscape 1600×900 and portrait 390×844: the table fills with no letterboxing, bet spots sit inside the rail, and the dealer panel doesn't overlap the cards or the HUD.
- Then show me a screenshot of each orientation and list any file that failed to load.
