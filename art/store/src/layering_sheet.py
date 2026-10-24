# review/layering-sheet.png: full-res crops of each celebration over the player's hand (toast vs cards vs total badge).
from PIL import Image, ImageDraw, ImageFont
E = 'celeb/evidence/v2_layering/'
items = [('blackjack1_d_r3_550ms', 'BLACKJACK! natural #1 (+550 ms)'), ('blackjack3_d_r8_550ms', 'BLACKJACK! natural #3 (+550 ms)'),
         ('win1_g_r1_550ms', 'YOU WIN (+550 ms)'), ('dealerbust1_g_r8_1100ms', 'Dealer bust: YOU WIN + label (+1100 ms)'),
         ('push1_f_r4_1100ms', 'PUSH (+1100 ms)'), ('bust1_d_r1_1100ms', 'BUST (+1100 ms)'), ('bigWin1_e_r3_1100ms', 'Big win +amount, chip shower (+1100 ms)')]
F = ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf', 26)
cw, ch = 1080, 520
s = Image.new('RGB', (cw, len(items) * (ch + 44)), (18, 18, 18)); d = ImageDraw.Draw(s)
for i, (f, lab) in enumerate(items):
    im = Image.open(E + f + '.jpg')
    y0 = 560 if 'bigWin' in f or 'dealerbust' in f else 760
    s.paste(im.crop((0, y0, 1080, y0 + ch)), (0, i * (ch + 44) + 44)); d.text((14, i * (ch + 44) + 8), f'{lab}   [{f}.jpg]', font=F, fill=(240, 240, 240))
s.save('review/layering-sheet.png'); print(s.size)
