# Makes the 600x800 JPEG previews used when a product link is shared. Run after build_share.js.
import json
from PIL import Image
for a, b in json.load(open('tools/og_jobs.json')):
    im = Image.open(a).convert('RGB'); w, h = im.size; t = w / h
    if abs(t - 0.75) > 0.01:
        if t > 0.75:
            nw = int(h * 0.75); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            im = im.crop((0, 0, w, int(w / 0.75)))
    im.resize((600, 800), Image.LANCZOS).save(b, quality=82, optimize=True)
print('done')
