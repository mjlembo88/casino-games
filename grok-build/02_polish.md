Polish pass for Casino Blackjack. Keep the engine files unchanged and the Casino Kit structure intact (`src/kit/` never imports the game).

1. **Dealer realism:**
   - Add weight shifts in idle, a hand gesture toward the active hand on "your turn", and a small chip-pushing motion when paying.
   - Sync the deal arm so every card leaves exactly at the arm's peak.
   - Add a second dealer look (alternate hair, skin tone, and vest color) with a "Change dealer" setting.
   - Keep the lip-sync driven by the audio level.
2. **Card feel:**
   - A subtle 3D tilt (perspective 900px) while a card is in flight, and a micro-bounce on landing.
   - On double, the doubled card lands sideways.
   - On a single-deck pitch game, add a short "pitch" slide across the felt with the slide sound.
3. **Chips:**
   - Stacks show a contact shadow. A winning payout stacks the dealer's chips next to the bet column first, then both slide to the tray together.
   - Add a "color up" animation when leaving the table, and a "chip value" tooltip on long-press in the rack.
4. **Lighting:** a soft specular sweep across the felt when a round starts, and a gold rim light on the active bet spot. Card and chip shadows should follow the lamp position.
5. **Toasts and juice:**
   - Show "BLACKJACK!" with confetti, "DEALER BUSTS", "PUSH", and big side-bet hits with a payout banner showing the pays from the paytable.
   - Haptics with `navigator.vibrate(15)` on Android for taps and `[30,40,30]` for a blackjack, with a setting to turn them off.
6. **Sound:**
   - Level-balance all sound effects and add a master limiter (DynamicsCompressor).
   - Fade the ambient loop in and out on pause or visibility change.
   - The dealer never talks over themselves: queue lines with a 250 ms gap.
7. **Shoe and discard:** the discard tray grows visibly, and the cut card shows as a yellow card edge sticking out of the shoe stack. When it comes out, the dealer says "There's the cut card. Last hand before the shuffle" (`cut_card`) and sets it aside.
8. **Accessibility:**
   - Large-text mode, captions always available, and a color-blind four-color deck option (♦ blue, ♣ green).
   - All buttons get aria-labels, and keyboard shortcuts work on desktop (H, S, D, P, R, Space = deal).
9. **Performance:** cap the device pixel ratio at 2 for the canvas, pre-render the felt to an offscreen canvas on resize, and keep 60 fps on a mid-range Android phone. The low-quality mode turns off confetti, breathing, and blur.
10. **Stats screen:** hands played, win/push/loss %, blackjacks, biggest win, side-bet results by type, and bankroll over time (a simple sparkline), all in `localStorage` under `casino.stats`.

Give me a checklist of what changed when you're done.
