# Contact sheet: raw shots (row 1-2), framed shots (row 3-4), feature graphic. python3 src/shots_sheet.py
import glob
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf', 15)
raw = sorted(glob.glob('raw/[0-9]*.png')); fr = sorted(glob.glob('framed/*.png'))
tw, th, cols, lab = 240, 427, 6, 28
rows = [raw[i:i+cols] for i in range(0, len(raw), cols)] + [fr[i:i+cols] for i in range(0, len(fr), cols)]
fg = sorted(glob.glob('feature-graphic*.png'))
H = len(rows) * (th + lab) + (520 + lab if fg else 0)
s = Image.new('RGB', (cols * tw, H), (18, 18, 15)); d = ImageDraw.Draw(s)
for r, row in enumerate(rows):
    for c, p in enumerate(row):
        x, y = c * tw, r * (th + lab); s.paste(Image.open(p).convert('RGB').resize((tw, th)), (x, y)); d.text((x + 6, y + th + 6), p.split('/')[-1], font=F, fill=(225, 225, 225))
if fg:
    y = len(rows) * (th + lab); im = Image.open(fg[0]).convert('RGB'); s.paste(im.resize((1040, 508)), (10, y + 6)); d.text((10, y + 520), fg[0], font=F, fill=(225, 225, 225))
s.save('review/screenshots-contact-sheet.png'); print(s.size, len(raw), len(fr), fg)
