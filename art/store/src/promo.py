"""Procedural promo loop: python3 promo.py -> promo/promo_1080x1920.mp4 + promo.gif + review/promo-contact-sheet.png
Inputs: real live-site screenshots (raw/*.png), Casino Kit art (card backs, chips; MIT model + original code), felt bg rendered by frame.mjs.
Fonts: Playfair Display + Inter (SIL OFL). No paid media, no Krea."""
import math, os, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
KIT = '/workspace/casino/assets/kit/'
W, H, FPS, DUR = 1080, 1920, 30, 12.0
N = int(FPS * DUR)
BUILD = f'{ROOT}/promo/build'; FR = f'{BUILD}/frames'
shutil.rmtree(FR, ignore_errors=True); os.makedirs(FR, exist_ok=True)
PF = '/usr/share/fonts/truetype/sand-box/google/Playfair Display/PlayfairDisplay-VariableFont_wght.ttf'
IF = '/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf'
def font(path, size, var):
    f = ImageFont.truetype(path, size)
    try: f.set_variation_by_name(var)
    except Exception: pass
    return f
F_TITLE = font(PF, 132, 'Black'); F_CAP = font(PF, 84, 'ExtraBold'); F_SUB = font(IF, 40, 'Medium'); F_FOOT = font(IF, 30, 'SemiBold'); F_TAG = font(IF, 46, 'SemiBold')
CREAM = (255, 248, 231); GOLD = (242, 193, 78)
bg = Image.open(f'{BUILD}/felt_bg_1080x1920.png').convert('RGBA')

def ease(t):  # outCubic
    t = min(1, max(0, t)); return 1 - (1 - t) ** 3
def inout(t):
    t = min(1, max(0, t)); return 4 * t * t * t if t < .5 else 1 - (-2 * t + 2) ** 3 / 2
def outback(t, s=1.4):
    t = min(1, max(0, t)) - 1; return 1 + (s + 1) * t ** 3 + s * t ** 2

# phone mockup: bezel + rounded screen + gold outline, with a zoomable screen
PW, PH, BZ = 808, 1436, 14
def phone(shot, zoom=1.0, fy=0.45):
    img = Image.open(f'{ROOT}/raw/{shot}.png').convert('RGB')
    cw, ch = img.width / zoom, img.height / zoom
    cy = min(max(fy * img.height, ch / 2), img.height - ch / 2); cx = img.width / 2
    img = img.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2))).resize((PW - 2 * BZ, PH - 2 * BZ), Image.LANCZOS)
    out = Image.new('RGBA', (PW, PH), (0, 0, 0, 0)); d = ImageDraw.Draw(out)
    d.rounded_rectangle((0, 0, PW - 1, PH - 1), 56, fill=(13, 13, 13, 255), outline=(242, 193, 78, 200), width=3)
    m = Image.new('L', img.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), 44, fill=255)
    out.paste(img, (BZ, BZ), m); return out
SHADOW = Image.new('RGBA', (PW + 160, PH + 160), (0, 0, 0, 0))
ImageDraw.Draw(SHADOW).rounded_rectangle((80, 110, PW + 80, PH + 100), 60, fill=(0, 0, 0, 150)); SHADOW = SHADOW.filter(ImageFilter.GaussianBlur(30))

def paste_scaled(canvas, im, cx, cy, scale=1.0, rot=0.0, alpha=1.0):
    if scale != 1.0: im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BILINEAR)
    if rot: im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1: a = im.getchannel('A').point(lambda v: int(v * alpha)); im = im.copy(); im.putalpha(a)
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

def text_c(canvas, y, s, f, fill, alpha=1.0, dy=0, shadow=True):
    if alpha <= 0: return
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    w = d.textlength(s, font=f); x = (W - w) / 2
    if shadow: d.text((x, y + dy + 4), s, font=f, fill=(2, 26, 14, int(230 * alpha)))
    d.text((x, y + dy), s, font=f, fill=fill + (int(255 * alpha),))
    canvas.alpha_composite(layer)

def rule(canvas, y, alpha=1.0):
    d = ImageDraw.Draw(canvas); a = int(255 * alpha)
    for i in range(120):
        d.line((W/2 - 30 - i, y, W/2 - 30 - i, y + 1), fill=GOLD + (int(a * (1 - i / 120)),)); d.line((W/2 + 30 + i, y, W/2 + 30 + i, y + 1), fill=GOLD + (int(a * (1 - i / 120)),))
    d.polygon([(W/2, y - 9), (W/2 + 9, y), (W/2, y + 9), (W/2 - 9, y)], fill=GOLD + (a,))

# kit art
def kit(path, w):
    im = Image.open(KIT + path).convert('RGBA'); return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
CARD_R, CARD_B = kit('cards/card_back_red.png', 300), kit('cards/card_back_blue.png', 300)
CHIPS = {d: kit(f'chips/chip_{d}.png', 190) for d in (25, 100, 500, 1000, 5)}
# title scene rest positions (frame 0 == frame N for a clean loop)
TITLE_CARDS = [(CARD_R, 420, 1200, -14), (CARD_B, 660, 1210, 10)]
TITLE_CHIPS = [(25, 250, 1500, -10), (100, 830, 1480, 14), (1000, 540, 1590, 0)]

def title_scene(c, k_in, t):
    """k_in: 0 = elements off-screen, 1 = at rest. t: absolute time for idle bob (period = DUR)."""
    for i, (im, x, y, r) in enumerate(TITLE_CARDS):
        k = ease((k_in - i * .12) / .88) if k_in < 1 else 1
        sx = -400 if i == 0 else W + 400
        paste_scaled(c, im, sx + (x - sx) * k, y + (1 - k) * 300, 1, r + (1 - k) * (-40 if i == 0 else 40))
    for i, (d, x, y, r) in enumerate(TITLE_CHIPS):
        k = outback((k_in - .25 - i * .1) / .6) if k_in < 1 else 1
        bob = 8 * math.sin(2 * math.pi * (t / DUR) * 4 + i)  # 4 bobs per loop -> periodic
        paste_scaled(c, CHIPS[d], x, y - (1 - k) * 1100 + bob, 1, r + (1 - k) * 90)
    a = ease(k_in)
    text_c(c, 430, 'Casino', F_TITLE, CREAM, a, (1 - a) * 40)
    text_c(c, 580, 'Blackjack', F_TITLE, GOLD, a, (1 - a) * 40)
    rule(c, 780, a)
    text_c(c, 830, 'Play money. Real rules.', F_TAG, CREAM, a, (1 - a) * 30, False)
    text_c(c, 900, 'Strategy Coach built in.', F_TAG, (255, 248, 231), a * .85, (1 - a) * 30, False)

# timeline: (start, end, shot, caption, sub, zoom0, zoom1, focus_y)
SEG = [
    (1.6, 3.8, '01_bet', 'Stack your chips', 'Play money only', 1.00, 1.05, .62),
    (3.8, 5.0, '02_dealing', 'Dealt card by card', 'Smooth shoe-to-felt dealing', 1.06, 1.16, .40),
    (5.0, 6.8, '03_decision', 'Every classic move', 'Hit, stand, double or surrender', 1.00, 1.05, .55),
    (6.8, 8.6, '05_result', 'Beat the dealer for fun', 'Your bankroll keeps score', 1.00, 1.14, .38),
    (8.6, 10.6, '06_coach', 'Learn basic strategy', 'The Coach grades every play', 1.00, 1.08, .45),
]
TR = .35  # slide transition length
PCX, PCY = W / 2, 330 + PH / 2

def frame(i):
    t = i / FPS
    c = bg.copy()
    # title in/out
    if t < 1.6:   k = 1 - ease((t - 1.25) / .35) if t > 1.25 else 1
    elif t > 10.6: k = ease((t - 10.6) / 1.4)
    else: k = 0
    if t < 1.6:   # title exits upward / phone enters
        title_scene(c, 1, t) if t <= 1.25 else None
        if t > 1.25:
            lay = Image.new('RGBA', c.size, (0, 0, 0, 0)); title_scene(lay, 1, t)
            off = int(-ease((t - 1.25) / .35) * 500); a = 1 - ease((t - 1.25) / .35)
            lay = lay.transform(lay.size, Image.AFFINE, (1, 0, 0, 0, 1, -off)); al = lay.getchannel('A').point(lambda v: int(v * a)); lay.putalpha(al); c.alpha_composite(lay)
    elif t > 10.6:
        title_scene(c, k, t)
    # phones
    for j, (s0, s1, shot, cap, sub, z0, z1, fy) in enumerate(SEG):
        if not (s0 - TR <= t <= s1 + TR): continue
        inn = ease((t - (s0 - TR)) / TR) if t < s0 else 1
        out = ease((t - s1) / TR) if t > s1 else 0
        if j == 0 and t < s0: x = PCX; y = PCY + (1 - inn) * 1400  # first rises from bottom
        else: x = PCX + (1 - inn) * W
        if j == len(SEG) - 1 and t > s1: y = PCY + out * 1500; x = PCX
        else:
            y = PCY if not (j == 0 and t < s0) else y
            x -= out * W
        zt = inout((t - s0) / (s1 - s0)); ph = phone(shot, z0 + (z1 - z0) * zt, fy)
        paste_scaled(c, SHADOW, x, y + 20); paste_scaled(c, ph, x, y)
        # caption beat
        ca = min(ease((t - s0 + .1) / .4), 1 - ease((t - s1 + .25) / .3))
        if ca > 0:
            text_c(c, 96, cap, F_CAP, CREAM, ca, (1 - ca) * 30)
            text_c(c, 212, sub, F_SUB, (255, 248, 231), ca * .88, (1 - ca) * 20, False)
            rule(c, 290, ca)
    # card motion beat: a card back flies from the shoe side across during 3.8s transition
    for (tc, im, sx, sy, ex, ey) in [(3.8, CARD_R, 1180, 260, -200, 900), (6.8, CARD_B, -200, 300, 1280, 1000)]:
        u = (t - (tc - .45)) / .9
        if 0 <= u <= 1: e = inout(u); paste_scaled(c, im, sx + (ex - sx) * e, sy + (ey - sy) * e - 220 * math.sin(math.pi * e), .9, 360 * e * (1 if ex < sx else -1))
    # footer
    text_c(c, H - 86, 'PLAY MONEY ONLY  ·  NO CASH PRIZES  ·  NO ADS', F_FOOT, (255, 248, 231), .8, 0, False)
    return c.convert('RGB')

for i in range(N):
    frame(i).save(f'{FR}/{i:04d}.png', compress_level=1)
    if i % 60 == 0: print('frame', i, flush=True)
P = f'{ROOT}/promo'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{FR}/%04d.png', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{P}/promo_1080x1920.mp4'], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{FR}/%04d.png', '-vf', 'fps=15,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', f'{P}/promo_preview_360x640.gif'], check=True)
# review contact sheet: every 0.5 s (24 frames) + last frame vs first for loop check
idx = list(range(0, N, 15)) + [N - 1]
tw, th = 216, 384; cols = 9; rows = math.ceil(len(idx) / cols)
sheet = Image.new('RGB', (cols * tw, rows * (th + 26)), (20, 20, 20)); d = ImageDraw.Draw(sheet); lf = font(IF, 18, 'Medium')
for k, i in enumerate(idx):
    im = Image.open(f'{FR}/{i:04d}.png').resize((tw, th), Image.LANCZOS); x, y = (k % cols) * tw, (k // cols) * (th + 26)
    sheet.paste(im, (x, y)); d.text((x + 6, y + th + 3), f'{i/FPS:5.2f}s  #{i}', font=lf, fill=(240, 240, 240))
os.makedirs(f'{ROOT}/review', exist_ok=True); sheet.save(f'{ROOT}/review/promo-contact-sheet.png')
a = np.asarray(Image.open(f'{FR}/0000.png'), dtype=np.int16); b = np.asarray(frame(N), dtype=np.int16)
print('loop seam mean abs diff (frame N vs frame 0):', float(np.abs(a - b).mean()))
