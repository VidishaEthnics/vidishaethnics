// Builds /p/<CODE>/index.html share pages (with WhatsApp/Facebook previews) and assets/og/*.jpg
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=process.argv[2]; const BASE='https://vidishaethnics.com';
global.window={};require(path.join(root,'assets/js/config.js'));require(path.join(root,'assets/js/catalog.js'));
const P=window.VE_PRODUCTS, C=window.VE_CONFIG;
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
fs.mkdirSync(path.join(root,'assets/og'),{recursive:true});
const jobs=[];
const page=(o)=>`<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(o.title)}</title><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(o.desc)}"><link rel="canonical" href="${o.url}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Vidisha Ethnics">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${o.url}">${o.img?`<meta property="og:image" content="${o.img}"><meta property="og:image:width" content="600"><meta property="og:image:height" content="800">`:''}
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${o.to}"><script>location.replace(${JSON.stringify(o.to)})</script>
</head><body style="font-family:Georgia,serif;text-align:center;padding:60px 20px"><p><a href="${o.to}">${esc(o.title)}</a></p></body></html>`;
let n=0;
for(const p of P){
  const lead=Object.keys(p.ph||{})[0]; const src=lead?p.ph[lead][0]:null;
  let img=null;
  if(src){const out=path.join(root,'assets/og',p.c+'.jpg');jobs.push([path.join(root,'assets/img',src+'.webp'),out]);img=`${BASE}/assets/og/${p.c}.jpg`}
  const pr=typeof p.inr==='number'&&p.inr>0?`₹${p.inr.toLocaleString('en-IN')} in India. `:'';
  const desc=`${pr}${p.d}`.slice(0,190);
  const dir=path.join(root,'p',p.c);fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),page({title:`${p.n} | Vidisha Ethnics`,desc,url:`${BASE}/p/${p.c}/`,img,to:`/#p-${p.c}`}));n++;
}
fs.writeFileSync('/tmp/og_jobs.json',JSON.stringify(jobs));
console.log('pages',n,'images',jobs.length);
