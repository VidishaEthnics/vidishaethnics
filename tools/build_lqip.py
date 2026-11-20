# Builds assets/js/lqip.js: tiny blurred previews for every photo in assets/img.
import base64,io,os,json,urllib.parse
from PIL import Image
d='assets/img'; out={}
for f in sorted(os.listdir(d)):
    if not f.endswith('.webp'): continue
    im=Image.open(os.path.join(d,f)).convert('RGB'); w,h=im.size
    tw=12; th=max(1,round(h*tw/w))
    b=io.BytesIO(); im.resize((tw,th),Image.LANCZOS).save(b,'JPEG',quality=45,optimize=True)
    b64=base64.b64encode(b.getvalue()).decode()
    svg=(f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {tw} {th}' preserveAspectRatio='xMidYMid slice'>"
         f"<filter id='b'><feGaussianBlur stdDeviation='.9'/><feComponentTransfer><feFuncA type='discrete' tableValues='1 1'/></feComponentTransfer></filter>"
         f"<image filter='url(#b)' width='{tw}' height='{th}' preserveAspectRatio='none' href='data:image/jpeg;base64,{b64}'/></svg>")
    out[f[:-5]]='data:image/svg+xml,'+urllib.parse.quote(svg,safe="/:=' ;,.")
open('assets/js/lqip.js','w').write('/* Tiny blurred previews shown while photos load. Rebuild: python3 tools/build_lqip.py */\nwindow.VE_LQIP='+json.dumps(out,separators=(',',':'))+';\n')
print(len(out), os.path.getsize('assets/js/lqip.js'))
