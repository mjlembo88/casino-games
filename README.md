# casino-games
These are shared assets and reference code for Marcus's play-money casino games (Grok Build apps). There is **no real-money wagering, no payments, no ads, no accounts.**

| Path | What |
|---|---|
| `voice/` | Dealer voice clips (MP3) + `manifest.json`, served by GitHub Pages at https://mjlembo88.github.io/casino-games/voice/manifest.json (Kokoro-82M, Apache-2.0; see `voice/LICENSE.md`) |
| `engine/` | Pure-TypeScript blackjack rules engine, basic strategy, and Hi-Lo helpers, with vitest tests (`npm i -D vitest typescript && npx vitest run`) |
| `docs/CASINO_KIT.md` | Shared table/cards/chips/dealer/UI/sound theme spec reused by blackjack, craps, roulette |
| `docs/BLACKJACK_RULES.md` | Exact blackjack rules, side-bet paytables with sources, presets, training modes |
| `grok-build/` | The prompts used to build the app in Grok Build |
| `android/` | Thin Android WebView shell (`com.marcus.blackjack`) that opens the published grok.me app. Signing keys are **not** in this repo. |
| `tts/gen.py` | Script that generated the voice clips |

The APK is on the [Releases](https://github.com/mjlembo88/casino-games/releases) page.
