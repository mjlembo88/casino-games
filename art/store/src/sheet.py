import sys,glob
from PIL import Image,ImageDraw
pat,out=sys.argv[1],sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 8
fs=sorted(glob.glob(pat))
ims=[Image.open(f).convert('RGB').resize((216,384)) for f in fs]
rows=(len(ims)+cols-1)//cols
s=Image.new('RGB',(216*cols,404*rows),'white');d=ImageDraw.Draw(s)
for i,(f,im) in enumerate(zip(fs,ims)): s.paste(im,((i%cols)*216,(i//cols)*404)); d.text(((i%cols)*216+4,(i//cols)*404+386),f.split('/')[-1][:24],fill='black')
s.save(out)
