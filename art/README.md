# Proto Bot art + polish package: Casino Blackjack (com.marcus.blackjack)

Everything here is procedural: hand-written SVG (see `src/art.py`) rendered with cairosvg. The font is DejaVu Serif, the on-box stand-in for the kit's `Georgia, serif` print style. There's no downloaded or licensed art, no web fonts, and no AI images. Play money only.
Regenerate everything with `python3 -m venv .venv && .venv/bin/pip install cairosvg pillow numpy && .venv/bin/python src/art.py`.

**Icon concept:** an ace of spades (cream card, gold inner border, ink spade) tilted −9° over a gold-rimmed red $5 Casino Kit chip, on green felt with a lamp glow and vignette. The chip and card stay inside the 66% adaptive safe zone (max radius 134 px of the 142.5 px limit at 432 px).

## Android drop-in (`res/` → `android/app/src/main/res/`)
Tested: a throwaway copy of `/workspace/casino/android` with these files merged built `assembleDebug` cleanly. `aapt2 dump badging` shows `icon='res/mipmap-anydpi-v26/ic_launcher.xml'`. The real android/ and repo folders were not touched.

| File | Goes to | Notes |
|---|---|---|
| `res/mipmap-anydpi-v26/ic_launcher.xml` | same path | **Replaces** the existing one. It uses `@mipmap/ic_launcher_background`, `_foreground`, and `_monochrome` (Android 13 themed icon). |
| `res/mipmap-anydpi-v26/ic_launcher_round.xml` | same path | new |
| `res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png` | same | legacy rounded square 48/72/96/144/192 (minSdk 26 means launchers use the adaptive XML; these are fallbacks) |
| `res/mipmap-*/ic_launcher_round.png` | same | legacy circle 48/72/96/144/192 |
| `res/mipmap-*/ic_launcher_foreground.png` | same | 108/162/216/324/432, transparent, mark inside the 66% safe circle |
| `res/mipmap-*/ic_launcher_background.png` | same | 108/162/216/324/432 felt gradient + lamp + vignette |
| `res/mipmap-*/ic_launcher_monochrome.png` | same | 108–432 white-on-transparent silhouette for themed icons |
| `res/drawable-{mdpi…xxxhdpi}/splash_icon.png` | same | Android 12+ splash icon, 288 dp (288/432/576/864/1152 px). The mark sits inside the 192 dp circle (max radius 95 of 96 px at mdpi). |
| `res/values/colors.xml` | same path (new file) | `kit_felt_deep #073D22`, `kit_felt_base`, `kit_felt_light`, `kit_gold`. The new names avoid clashing with `@color/felt` in `values/styles.xml`. |
| `res/values-v31/styles.xml` | same path (new file) | overrides `Fullscreen` on API 31+, adding `windowSplashScreenBackground` = `kit_felt_deep` and `windowSplashScreenAnimatedIcon` = `@drawable/splash_icon` |

Small follow-ups for Engineer, because I didn't touch those files:
1. `AndroidManifest.xml`: change `android:roundIcon="@mipmap/ic_launcher"` to `@mipmap/ic_launcher_round`, and **add `<uses-permission android:name="android.permission.VIBRATE" />`**. Without it, `navigator.vibrate` in the WebView silently does nothing (POLISH_SPECS P0-3).
2. Optional: `res/drawable/ic_foreground.xml` (the old vector) is no longer referenced and can be deleted.
3. Optional consistency: `values/styles.xml` `felt` is `#0B3D23` and `MainActivity` uses `#0b3d23` for the WebView background. The kit's `felt.deep` is `#073d22`, the color the splash uses. Matching them avoids a 1-shade flash between the splash and the WebView.

## Masters and store assets
| File | Use |
|---|---|
| `svg/icon_master.svg` | master full icon (the 108-unit artwork, viewBox cropped to the visible 72) |
| `svg/ic_launcher_foreground.svg`, `svg/ic_launcher_background.svg`, `svg/ic_launcher_monochrome.svg` | adaptive layer masters (108×108 units) |
| `svg/splash-portrait-1080x1920.svg`, `svg/splash-landscape-1920x1080.svg` | splash masters (they reference the "DejaVu Serif" font by name) |
| `icon/icon-512.png` | Google Play store icon (512, full-bleed square; Play applies its own mask) |
| `icon/icon-1024.png` | hi-res master / web app icon / GitHub release art |
| `icon/ic_launcher_foreground.png`, `icon/ic_launcher_background.png`, `icon/ic_launcher_monochrome.png` | 432 px adaptive layers (same as xxxhdpi) |
| `splash/splash-portrait-1080x1920.png`, `splash/splash-landscape-1920x1080.png` | felt, lamp, vignette, leather rail, "MARCUS'S TABLE" printed arc, gold "Blackjack" title, "PLAY MONEY ONLY". For the web app's first-paint / loading screen (POLISH_SPECS P2-4), store graphics, and the release page. 256-color dithered PNGs (~1.4 MB). |
| `splash/splash_icon-288.png` | Android 12 splash icon at mdpi, for reference (shown on `#073d22`) |
| `contact-sheet.png` | QA sheet: the icon at 48/96/192 (square + round) on light and dark, the 512 store icon, the adaptive layers with the safe circle, the monochrome icon, both splashes, and the Android 12 splash preview |
| `POLISH_SPECS.md` | P0/P1/P2 punch list plus Casino Kit extensions, written as Grok Build-ready specs |
| `src/art.py` | the generator (the only source of truth; edit and re-run) |

Not in this drop yet: store screenshots and a promo loop. Both need the published build at marcus-casino-blackjack.grok.me, so they come next.
