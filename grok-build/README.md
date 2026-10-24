# Grok Build prompts: Casino Blackjack
Paste each file as ONE message, in this order, waiting for Grok to be fully idle between messages:
1. `00a_engine_part1.md`: engine part 1 (saves `src/games/blackjack/engine.ts`, no UI)
2. `00b_engine_part2.md`: engine part 2 (appends to the same file)
3. `01_initial.md`: Casino Kit + blackjack UI (the first playable build)
4. `03a_strategy_code.md`: saves `strategy.ts` (basic strategy + Hi-Lo)
5. `03_training.md`: Strategy Coach + Card Counting Trainer modes
6. `02_polish.md`: polish pass (can come later)
7. `04_art_assets.md`: photo table, chips, card backs and live dealer art from Pages, with procedural fallback (after 02)

Training (4-5) can go in the same session right after the first build; it doesn't block the first playable build.
Engine size: blackjack.ts 19,539 chars + strategy.ts 9,770 chars, so it's split across 3 code messages, each under 12k characters.
After 00b, ask Grok "show me the last 20 lines of engine.ts" to confirm it was appended verbatim.
Publish as `casino-blackjack` → https://marcus-casino-blackjack.grok.me, which is the APK's start URL. If it publishes under another name, change `START_URL` in android/MainActivity.java and rebuild.
