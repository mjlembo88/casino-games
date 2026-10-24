# Trim a live natural from a worker's screen recording and build a 100 ms sequence sheet.
# python3 src/bj_evidence.py <video.webm> <toast_offset_s> <name>
import sys, subprocess, glob, os, shutil
from PIL import Image, ImageDraw, ImageFont
v, off, name = sys.argv[1], float(sys.argv[2]), sys.argv[3]
out = 'celeb/evidence/v2_'; start = max(0, off - 0.6)
mp4 = f'{out}{name}_432x768.mp4'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{start:.2f}', '-i', v, '-t', '4.4', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '25', mp4], check=True)
fd = f'/tmp/{name}_frames'; shutil.rmtree(fd, ignore_errors=True); os.makedirs(fd)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp4, '-vf', 'fps=10', f'{fd}/%03d.png'], check=True)
fs = sorted(glob.glob(f'{fd}/*.png'))
F = ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf', 16)
tw, th, cols = 216, 384, 9; rows = (len(fs) + cols - 1) // cols
s = Image.new('RGB', (cols * tw, rows * (th + 24)), (20, 20, 20)); d = ImageDraw.Draw(s)
for k, p in enumerate(fs):
    x, y = (k % cols) * tw, (k // cols) * (th + 24); s.paste(Image.open(p).convert('RGB').resize((tw, th)), (x, y))
    d.text((x + 5, y + th + 3), f'{(k * 100 - 600):+d} ms vs toast', font=F, fill=(230, 230, 230))
s.save(f'{out}{name}_sequence.png'); print(mp4, len(fs))
