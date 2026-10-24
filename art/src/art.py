"""Procedural art for Casino Blackjack (Marcus). Hand-written SVG -> PNG via cairosvg.
No downloaded/licensed art, no web fonts. Font: DejaVu Serif (system), Georgia fallback name.
Run: python src/art.py   (from proto-bot/)"""
import math, os, random
import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

T = dict(base='#0b5d34', deep='#073d22', light='#14804a', gold='#f2c14e', goldDk='#c89527',
         red='#c8102e', redDk='#8a0d22', ink='#121212', cream='#f7f3ea', text='#fff8e7',
         printInk='rgba(255,240,200,.55)')
FONT = "DejaVu Serif"  # kit font.print = Georgia, serif; DejaVu Serif is the on-box serif stand-in
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = lambda *p: os.path.join(ROOT, *p)

SPADE = ("M0,-1 C0.28,-0.58 1,-0.28 1,0.2 C1,0.56 0.72,0.76 0.46,0.76 "
         "C0.27,0.76 0.12,0.67 0.06,0.56 C0.09,0.8 0.22,0.96 0.4,1.06 L-0.4,1.06 "
         "C-0.22,0.96 -0.09,0.8 -0.06,0.56 C-0.12,0.67 -0.27,0.76 -0.46,0.76 "
         "C-0.72,0.76 -1,0.56 -1,0.2 C-1,-0.28 -0.28,-0.58 0,-1 Z")

def spade(cx, cy, s, fill):
    return f'<path d="{SPADE}" transform="translate({cx},{cy}) scale({s})" fill="{fill}"/>'

def defs():
    return f'''<defs>
<radialGradient id="felt" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="{T['light']}"/>
<stop offset=".55" stop-color="{T['base']}"/><stop offset="1" stop-color="{T['deep']}"/></radialGradient>
<radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/>
<stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<radialGradient id="lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe6b4" stop-opacity=".22"/>
<stop offset="1" stop-color="#ffe6b4" stop-opacity="0"/></radialGradient>
<linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf7"/>
<stop offset="1" stop-color="{T['cream']}"/></linearGradient>
<linearGradient id="goldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/>
<stop offset=".5" stop-color="{T['gold']}"/><stop offset="1" stop-color="{T['goldDk']}"/></linearGradient>
<radialGradient id="chipG" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#e8394f"/>
<stop offset=".6" stop-color="{T['red']}"/><stop offset="1" stop-color="{T['redDk']}"/></radialGradient>
<radialGradient id="sheen" cx="30%" cy="25%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/>
<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>'''

def chip(cx, cy, r):
    """Kit $5 chip (red/white) with a gold rim: six edge inlays, dashed inner ring, sheen."""
    g = [f'<circle cx="{cx}" cy="{cy+r*0.06}" r="{r*1.02}" fill="#000" opacity=".35"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#goldG)"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{r*0.9}" fill="url(#chipG)"/>']
    for i in range(6):
        a = i * 60 + 30
        w, h = r * 0.30, r * 0.17
        g.append(f'<rect x="{-w/2}" y="{-r*0.9}" width="{w}" height="{h}" rx="{h*0.2}" fill="{T["cream"]}" '
                 f'transform="translate({cx},{cy}) rotate({a})"/>')
    circ = 2 * math.pi * r * 0.68
    g.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.68}" fill="none" stroke="{T["cream"]}" stroke-width="{r*0.035}" '
             f'stroke-dasharray="{circ/36} {circ/36}" opacity=".85"/>')
    g.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.9}" fill="url(#sheen)"/>')
    g.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.995}" fill="none" stroke="#7a5a12" stroke-width="{r*0.02}"/>')
    return "\n".join(g)

def card(cx, cy, w, rot, index=True):
    h = w * 1.4; rx = w * 0.06 * 1.3
    x, y = -w / 2, -h / 2
    g = [f'<g transform="translate({cx},{cy}) rotate({rot})">',
         f'<rect x="{x+w*0.05}" y="{y+w*0.07}" width="{w}" height="{h}" rx="{rx}" fill="#000" opacity=".38"/>',
         f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="url(#paper)" stroke="#5a4a2a" stroke-opacity=".35" stroke-width="{w*0.012}"/>',
         f'<rect x="{x+w*0.06}" y="{y+w*0.06}" width="{w*0.88}" height="{h-w*0.12}" rx="{rx*0.6}" fill="none" stroke="{T["gold"]}" stroke-width="{w*0.018}" opacity=".9"/>',
         spade(0, h * 0.02, w * 0.30, T['ink'])]
    if index:
        fs = w * 0.26
        for flip in (0, 180):
            g.append(f'<g transform="rotate({flip})"><text x="{x+w*0.17}" y="{y+fs*1.02}" font-family="{FONT}" font-weight="bold" '
                     f'font-size="{fs}" fill="{T["ink"]}" text-anchor="middle">A</text>'
                     f'{spade(x+w*0.17, y+fs*1.42, w*0.075, T["ink"])}</g>')
    g.append('</g>')
    return "\n".join(g)

def mark(cx=54, cy=54, k=1.0, index=True):
    """The icon mark in 108-unit space: chip r=31 (inside the 33-unit safe circle) + ace of spades."""
    return chip(cx, cy, 31 * k) + card(cx + 0.5 * k, cy - 0.5 * k, 29 * k, -9, index)

def svg(w, h, body, vb=None):
    vb = vb or f"0 0 {w} {h}"
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{vb}">{defs()}{body}</svg>'

def bg108():
    return ('<rect width="108" height="108" fill="url(#felt)"/>'
            '<ellipse cx="54" cy="34" rx="46" ry="30" fill="url(#lamp)"/>'
            '<rect width="108" height="108" fill="url(#vig)" opacity=".8"/>')

def mono108():
    """Android 13 themed-icon silhouette (alpha only): chip disk with the card punched out (evenodd), spade + card outline."""
    def rect(cx, cy, w, h, rot):
        a = math.radians(rot); pts = []
        for dx, dy in ((-w/2, -h/2), (w/2, -h/2), (w/2, h/2), (-w/2, h/2)):
            pts.append((cx + dx*math.cos(a) - dy*math.sin(a), cy + dx*math.sin(a) + dy*math.cos(a)))
        return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + " Z"
    circ = "M23,54 a31,31 0 1 0 62,0 a31,31 0 1 0 -62,0 Z"
    notches = "".join(f'<rect x="-4.6" y="-31" width="9.2" height="5" fill="#000" transform="translate(54,54) rotate({i*60+30})"/>' for i in range(6))
    return (f'<path d="{circ} {rect(54.5, 53.5, 34, 46.6, -9)}" fill="#fff" fill-rule="evenodd"/>'
            f'<path d="{rect(54.5, 53.5, 29, 40.6, -9)}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>'
            f'<g transform="translate(54.5,53.5) rotate(-9)"><path d="{SPADE}" transform="translate(0,0.6) scale(8.7)" fill="#fff"/></g>')

def render(svgtext, path, w, h=None):
    h = h or w
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cairosvg.svg2png(bytestring=svgtext.encode(), write_to=path, output_width=w, output_height=h)

def grain(path, amt=0.03, seed=7):
    im = Image.open(path).convert("RGBA"); a = np.asarray(im).astype(np.float32)
    rng = np.random.default_rng(seed); n = rng.normal(0, 255 * amt, a.shape[:2])[..., None]
    a[..., :3] = np.clip(a[..., :3] + n, 0, 255)
    Image.fromarray(a.astype(np.uint8)).save(path, optimize=True)

def mask_shape(path, shape):
    im = Image.open(path).convert("RGBA"); W = im.size[0]
    m = Image.new("L", (W * 4, W * 4), 0); d = ImageDraw.Draw(m)
    if shape == "round": d.ellipse([0, 0, W * 4 - 1, W * 4 - 1], fill=255)
    else: d.rounded_rectangle([0, 0, W * 4 - 1, W * 4 - 1], radius=int(W * 4 * 0.18), fill=255)
    m = m.resize((W, W), Image.LANCZOS)
    im.putalpha(Image.fromarray(np.minimum(np.asarray(im.getchannel("A")), np.asarray(m))))
    im.save(path, optimize=True)

def arc_text(text, cx, cy, r, size, fill, spacing=1.0, up=True):
    """Per-character rotated text along an arc (kit §2 printed-table style)."""
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 100)
    ws = [f.getlength(c) / 100 * size + size * 0.18 * spacing for c in text]
    total = sum(ws); out = []; pos = -total / 2
    for i, ch in enumerate(text):
        s = pos + ws[i] / 2; pos += ws[i]; a = s / r
        x = cx + r * math.sin(a); y = cy - r * math.cos(a) if up else cy + r * math.cos(a)
        rot = math.degrees(a) if up else -math.degrees(a)
        out.append(f'<text x="0" y="0" transform="translate({x:.1f},{y:.1f}) rotate({rot:.2f})" font-family="{FONT}" '
                   f'font-size="{size}" fill="{fill}" text-anchor="middle">{ch}</text>')
    return "".join(out)

def splash(W, H):
    portrait = H > W; s = min(W, H) / 1080
    cx = W / 2; my = H * (0.40 if portrait else 0.37)
    msc = (7.0 if portrait else 5.0) * s        # mark scale (108 units -> px)
    ty = my + 33 * msc + (190 if portrait else 150) * s
    rail = ""
    if True:
        rh = 150 * s
        rail = (f'<defs><linearGradient id="railG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4127"/>'
                f'<stop offset="1" stop-color="#3a2214"/></linearGradient></defs>'
                f'<path d="M0,{H-rh} Q{W/2},{H-rh-60*s} {W},{H-rh} L{W},{H} L0,{H} Z" fill="url(#railG)"/>'
                f'<path d="M0,{H-rh+2*s} Q{W/2},{H-rh-58*s} {W},{H-rh+2*s}" fill="none" stroke="#8a5a36" stroke-width="{3*s}"/>'
                f'<path d="M0,{H-rh+22*s} Q{W/2},{H-rh-38*s} {W},{H-rh+22*s}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="{2*s}" stroke-dasharray="{9*s} {9*s}"/>')
    title = (f'<text x="{cx+3*s}" y="{ty+4*s}" font-family="{FONT}" font-weight="bold" font-size="{150*s}" fill="#021a0e" opacity=".6" text-anchor="middle" letter-spacing="{2*s}">Blackjack</text>'
             f'<text x="{cx}" y="{ty}" font-family="{FONT}" font-weight="bold" font-size="{150*s}" fill="url(#goldG)" text-anchor="middle" letter-spacing="{2*s}">Blackjack</text>')
    arc_r = 33 * msc + 62 * s
    printed = arc_text("MARCUS'S TABLE", cx, my, arc_r, 34 * s, T['printInk'], 1.25)
    sub = (f'<line x1="{cx-150*s}" y1="{ty+52*s}" x2="{cx+150*s}" y2="{ty+52*s}" stroke="{T["gold"]}" stroke-opacity=".6" stroke-width="{2*s}"/>')
    foot_y = H - 150 * s - (90 if portrait else 70) * s
    foot = (f'<text x="{cx}" y="{foot_y}" font-family="{FONT}" font-size="{32*s}" fill="{T["text"]}" fill-opacity=".72" '
            f'text-anchor="middle" letter-spacing="{4*s}">PLAY MONEY ONLY</text>')
    body = (f'<rect width="{W}" height="{H}" fill="url(#felt)"/>'
            f'<ellipse cx="{cx}" cy="{my-40*s}" rx="{W*0.55}" ry="{H*0.32}" fill="url(#lamp)"/>'
            + rail +
            f'<rect width="{W}" height="{H}" fill="url(#vig)"/>'
            f'<g transform="translate({cx-54*msc},{my-54*msc}) scale({msc})">{mark(index=True)}</g>'
            + printed + title + sub + foot)
    return svg(W, H, body)

def main():
    P = OUT
    # ---- master SVGs
    splash_fg = svg(108, 108, '<g transform="translate(54,54) scale(1.06) translate(-54,-54)">' + mark() + '</g>')
    fg = svg(108, 108, mark()); bg = svg(108, 108, bg108()); mono = svg(108, 108, mono108())
    full = svg(108, 108, bg108() + mark(), vb="18 18 72 72")   # what a launcher shows (inner 72 of 108)
    os.makedirs(P("svg"), exist_ok=True)
    for n, t in [("icon_master.svg", full), ("ic_launcher_foreground.svg", fg),
                 ("ic_launcher_background.svg", bg), ("ic_launcher_monochrome.svg", mono)]:
        open(P("svg", n), "w").write(t)
    # ---- store / master PNGs (full-bleed square; Play applies its own mask)
    render(full, P("icon", "icon-512.png"), 512); render(full, P("icon", "icon-1024.png"), 1024)
    render(fg, P("icon", "ic_launcher_foreground.png"), 432); render(bg, P("icon", "ic_launcher_background.png"), 432)
    render(mono, P("icon", "ic_launcher_monochrome.png"), 432)
    # no grain on icon layers: invisible at launcher size and it bloats the APK
    # ---- res/ drop-in
    dens = dict(mdpi=1, hdpi=1.5, xhdpi=2, xxhdpi=3, xxxhdpi=4)
    for d, k in dens.items():
        L = int(48 * k); A = int(108 * k)
        for shape, name in [("square", "ic_launcher.png"), ("round", "ic_launcher_round.png")]:
            p = P("res", f"mipmap-{d}", name); render(full, p, L); mask_shape(p, shape)
        render(fg, P("res", f"mipmap-{d}", "ic_launcher_foreground.png"), A)
        render(bg, P("res", f"mipmap-{d}", "ic_launcher_background.png"), A)
        render(mono, P("res", f"mipmap-{d}", "ic_launcher_monochrome.png"), A)
        # Android 12 splash icon: 288dp canvas, mark inside the 192dp circle (chip dia 62/108*288 = 165dp)
        render(splash_fg, P("res", f"drawable-{d}", "splash_icon.png"), int(288 * k))
    os.makedirs(P("res", "mipmap-anydpi-v26"), exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@mipmap/ic_launcher_background" />\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
           '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />\n</adaptive-icon>\n')
    for n in ("ic_launcher.xml", "ic_launcher_round.xml"):
        open(P("res", "mipmap-anydpi-v26", n), "w").write(xml)
    os.makedirs(P("res", "values"), exist_ok=True); os.makedirs(P("res", "values-v31"), exist_ok=True)
    open(P("res", "values", "colors.xml"), "w").write(
        '<?xml version="1.0" encoding="utf-8"?>\n<!-- Casino Kit tokens. Names are new so they never clash with @color/felt in values/styles.xml. -->\n<resources>\n'
        '    <color name="kit_felt_deep">#073D22</color>\n    <color name="kit_felt_base">#0B5D34</color>\n    <color name="kit_felt_light">#14804A</color>\n    <color name="kit_gold">#F2C14E</color>\n</resources>\n')
    open(P("res", "values-v31", "styles.xml"), "w").write(
        '<?xml version="1.0" encoding="utf-8"?>\n<!-- Android 12+ system splash. Same style name as values/styles.xml so it overrides on API 31+. -->\n<resources>\n'
        '    <style name="Fullscreen" parent="android:Theme.Material.NoActionBar.Fullscreen">\n'
        '        <item name="android:windowBackground">@color/kit_felt_deep</item>\n'
        '        <item name="android:statusBarColor">@color/kit_felt_deep</item>\n'
        '        <item name="android:navigationBarColor">@color/kit_felt_deep</item>\n'
        '        <item name="android:windowSplashScreenBackground">@color/kit_felt_deep</item>\n'
        '        <item name="android:windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>\n'
        '    </style>\n</resources>\n')
    # ---- splashes
    for W, H, n in [(1080, 1920, "splash-portrait-1080x1920.png"), (1920, 1080, "splash-landscape-1920x1080.png")]:
        t = splash(W, H); open(P("svg", n.replace(".png", ".svg")), "w").write(t)
        render(t, P("splash", n), W, H); grain(P("splash", n), 0.016)
        Image.open(P("splash", n)).convert("RGB").quantize(256, Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(P("splash", n), optimize=True)
    render(splash_fg, P("splash", "splash_icon-288.png"), 288)

def contact_sheet():
    P = OUT; W, H = 2400, 1500
    sheet = Image.new("RGB", (W, H), "#1b1b1b"); d = ImageDraw.Draw(sheet)
    fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 40)
    fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    d.text((60, 40), "Casino Blackjack (Marcus) - icon + splash contact sheet", font=fb, fill=T["gold"])
    d.text((60, 95), "Procedural SVG -> PNG. Top: legacy square/round + adaptive (circle mask) on light & dark. Play money only.", font=fs, fill="#cccccc")
    src = Image.open(P("icon", "icon-1024.png")).convert("RGBA")
    def masked(sz, shape):
        im = src.resize((sz, sz), Image.LANCZOS); m = Image.new("L", (sz*4, sz*4), 0); md = ImageDraw.Draw(m)
        if shape == "circle": md.ellipse([0, 0, sz*4-1, sz*4-1], fill=255)
        else: md.rounded_rectangle([0, 0, sz*4-1, sz*4-1], radius=int(sz*4*.18), fill=255)
        im.putalpha(m.resize((sz, sz), Image.LANCZOS)); return im
    for row, (bgc, label, txt) in enumerate([("#f3f1ec", "light", "#333"), ("#0f0f10", "dark", "#ddd")]):
        y0 = 150 + row * 330; d.rectangle([40, y0, 1300, y0 + 300], fill=bgc)
        x = 70
        for sz in (48, 96, 192):
            for shape in ("square", "circle"):
                im = masked(sz, shape); sheet.paste(im, (x, y0 + 250 - sz), im)
                d.text((x, y0 + 262), f"{sz}{'r' if shape=='circle' else ''}", font=fs, fill=txt); x += sz + 34
        d.text((60, y0 + 10), label, font=fs, fill=txt)
    big = masked(512, "square").resize((480, 480), Image.LANCZOS)
    d.rectangle([1340, 150, 1840, 780], fill="#f3f1ec"); sheet.paste(big, (1350, 160), big)
    d.text((1350, 650), "512 store icon", font=fs, fill="#333"); d.text((1350, 682), "(full-bleed; 18% corner preview)", font=fs, fill="#666")
    fg = Image.open(P("icon", "ic_launcher_foreground.png")).convert("RGBA").resize((216, 216), Image.LANCZOS)
    bgl = Image.open(P("icon", "ic_launcher_background.png")).convert("RGBA").resize((216, 216), Image.LANCZOS)
    comp = Image.alpha_composite(bgl, fg); dd = ImageDraw.Draw(comp)
    dd.ellipse([108-71, 108-71, 108+71, 108+71], outline="#ff4dff", width=2)   # 66% safe zone
    sheet.paste(comp, (1880, 160)); d.text((1880, 385), "adaptive layers, 66% safe", font=fs, fill="#ccc")
    mono = Image.open(P("icon", "ic_launcher_monochrome.png")).convert("RGBA").resize((216, 216), Image.LANCZOS)
    tile = Image.new("RGBA", (216, 216), "#33463b"); tile.alpha_composite(mono); sheet.paste(tile, (1880, 430))
    d.text((1880, 655), "monochrome (themed)", font=fs, fill="#ccc")
    sp = Image.open(P("splash", "splash-portrait-1080x1920.png")).convert("RGB").resize((360, 640), Image.LANCZOS)
    sl = Image.open(P("splash", "splash-landscape-1920x1080.png")).convert("RGB").resize((1138, 640), Image.LANCZOS)
    sheet.paste(sp, (60, 820)); sheet.paste(sl, (450, 820))
    a12 = Image.new("RGBA", (288, 288), T["deep"]); si = Image.open(P("splash", "splash_icon-288.png")).convert("RGBA")
    a12.alpha_composite(si); m = Image.new("L", (288, 288), 0); ImageDraw.Draw(m).ellipse([0, 0, 287, 287], fill=255)
    a12.putalpha(m); sheet.paste(a12, (1700, 900), a12)
    ImageDraw.Draw(sheet).ellipse([1700+48, 900+48, 1700+240, 900+240], outline="#ff4dff", width=2)
    d.text((1640, 1210), "Android 12 splash icon on #073d22", font=fs, fill="#ccc")
    d.text((1640, 1245), "(magenta = 192dp content circle)", font=fs, fill="#999")
    d.text((60, 1470), "portrait 1080x1920", font=fs, fill="#ccc"); d.text((450, 1470), "landscape 1920x1080", font=fs, fill="#ccc")
    sheet.save(P("contact-sheet.png"), optimize=True)

if __name__ == "__main__":
    main(); contact_sheet()
