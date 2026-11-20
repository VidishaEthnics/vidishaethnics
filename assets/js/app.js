/* Vidisha Ethnics — storefront, order requests and admin.
   Plain JavaScript, no build step. Data: catalog.js. Settings: config.js. */
(function(){
'use strict';
const C=window.VE_CONFIG, COLORS=window.VE_COLORS, CARE=window.VE_CARE, SIZES=window.VE_SIZES, FABRICS=window.VE_FABRICS;
const P0=window.VE_PRODUCTS;
const STATUSES=['New','Payment pending','Confirmed','In making','Shipped','Delivered','Cancelled'];
const LIVE=!!C.appsScriptUrl;

/* ---------- storage ---------- */
const store={get(k,d){try{const v=localStorage.getItem('ve_'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('ve_'+k,JSON.stringify(v))}catch(e){}}};

/* ---------- state ---------- */
const S={
 country:store.get('country',null),
 geo:store.get('geo',null),
 bag:store.get('bag',[]),
 wish:store.get('wish',[]),
 fit:store.get('fit',null),
 over:store.get('over',{}),
 uploads:{},
 orders:store.get('orders',null),
 f:{cat:'All',crafts:[],fabs:[],cols:[],price:'all',sort:'featured'},
 admin:{auth:false,key:'',tab:'orders',filter:'All',sel:null,loading:false,live:null}
};
if(!S.orders){S.orders=[
 {id:'VE-1118-204',date:'2026-11-18T10:12:00',name:'Sample: Ananya R.',wa:'+91 90000 00001',email:'',city:'Bengaluru',country:'India',items:[{c:'W006',col:'Peach',size:'38',q:1},{c:'W017',col:'Butter yellow',size:'38',q:1}],m:{unit:'in',bust:'36',waist:'30',hip:'39',shoulder:'14',height:"5'4\""},by:'',notes:'Need before 28 Nov',status:'Payment pending',cc:'IN',sample:1},
 {id:'VE-1119-311',date:'2026-11-19T18:40:00',name:'Sample: Meera K.',wa:'+971 50 000 0002',email:'',city:'Dubai',country:'United Arab Emirates',items:[{c:'W020',col:'Powder blue',size:'42',q:2}],m:{unit:'in',bust:'40',waist:'34',hip:'43',shoulder:'15',height:"5'6\""},by:'2026-12-10',notes:'',status:'New',cc:'AE',sample:1},
 {id:'VE-1112-118',date:'2026-11-12T09:05:00',name:'Sample: Priya S.',wa:'+44 7700 900003',email:'',city:'London',country:'United Kingdom',items:[{c:'W011',col:'Mustard',size:'40',q:1}],m:{unit:'cm',bust:'97',waist:'81',hip:'104',shoulder:'',height:'165'},by:'',notes:'',status:'Shipped',cc:'GB',sample:1}
];}
/* Where the visitor is browsing from. A quick guess from the time zone, then confirmed by IP in boot(). */
function tzGuess(){try{const z=Intl.DateTimeFormat().resolvedOptions().timeZone||'';if(/Kolkata|Calcutta/.test(z))return 'IN';if(/Colombo/.test(z))return 'LK';if(/Kuala_Lumpur|Kuching/.test(z))return 'MY';if(/Dubai/.test(z))return 'AE';if(/London/.test(z))return 'GB';if(/^America\//.test(z))return 'US';return z?'XX':'IN'}catch(e){return 'IN'}}
if(!S.geo)S.geo=tzGuess();
function defaultCountry(g){return g==='IN'?'IN':(C.countries.some(k=>k.code===g)?g:'US')}
if(!S.country)S.country=defaultCountry(S.geo);
function save(){store.set('country',S.country);store.set('bag',S.bag);store.set('wish',S.wish);store.set('fit',S.fit);store.set('over',S.over);store.set('orders',S.orders)}

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const IMG=n=>n.startsWith('data:')?n:'assets/img/'+n+'.webp';
const cty=(cc=S.country)=>C.countries.find(c=>c.code===cc)||C.countries[0];
const priced=inr=>typeof inr==='number'&&inr>0;
const abroad=(g=S.geo)=>!!g&&g!=='IN';
function roundTo(v,k){if(k.code==='IN')return Math.ceil(v/50)*50;if(k.round==='nine')return v<100?Math.ceil(v):Math.ceil((v+1)/10)*10-1;return Math.ceil(v/k.round)*k.round}
/* Outside India (by delivery country or by where the visitor is browsing from) prices are the India price x intlMultiplier. */
function amount(inr,cc=S.country,g=S.geo){if(!priced(inr))return null;const k=cty(cc);if(k.code==='IN'&&!abroad(g))return inr;return roundTo(inr*C.intlMultiplier/k.rate,k)}
/* India Post International Speed Post (EMS), merchandise tariff plus GST. Returns rupees. */
const WT={saree:700,set:600,coord:600,frock:550,kurta:350,short:300};
function shipGrams(items){return items.reduce((a,it)=>{const p=prod(it.c);return a+(p?(WT[p.type]||500)*it.q:0)},0)+(C.shipping.packGrams||150)}
function shipINR(items,cc=S.country){const k=cty(cc);if(k.code==='IN'||!k.ems||!items.length)return 0;const slabs=Math.max(1,Math.ceil(shipGrams(items)/250));return (k.ems[0]+(slabs-1)*k.ems[1])*(1+(C.shipping.gst||0))}
function shipAmount(items,cc=S.country){const v=shipINR(items,cc);if(!v)return 0;const k=cty(cc);return roundTo(v/k.rate,k)}
function money(v,cc=S.country){const k=cty(cc);return k.code==='IN'?'₹'+Math.round(v).toLocaleString('en-IN'):k.symbol+Math.round(v).toLocaleString('en-US')}
const price=(inr,cc)=>priced(inr)?money(amount(inr,cc),cc):'Price on request';
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('on'),2600)}
function wa(text,num=C.whatsapp){const n=String(num||'').replace(/[^0-9]/g,'');return 'https://wa.me/'+n+'?text='+encodeURIComponent(text)}
function hexRGB(h){const n=parseInt(h.slice(1),16);return [n>>16,(n>>8)&255,n&255]}
function shade(h,a){const [r,g,b]=hexRGB(h);const t=a<0?0:255,p=Math.abs(a);const f=x=>Math.round((t-x)*p+x);return '#'+((1<<24)+(f(r)<<16)+(f(g)<<8)+f(b)).toString(16).slice(1)}
function lum(h){const [r,g,b]=hexRGB(h);return (0.299*r+0.587*g+0.114*b)/255}
const col=n=>COLORS[n]||'#C9A98C';
let UID=0;
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
/* One set of fabric groups, used on the home page, the filters and product labels. */
function fam(p){const f=p.fab.toLowerCase();if(f.includes('request'))return null;if(f.includes('kota'))return 'Kota doria';if(f.includes('chanderi'))return 'Chanderi';if(f.includes('mul')||f.includes('muslin'))return 'Mul and muslin';if(f.includes('tissue')||f.includes('silk'))return 'Silk and tissue';if(f.includes('rayon')||f.includes('viscose')||f.includes('modal'))return 'Viscose and rayon';return 'Cotton'}
const FAB_ORDER=['Mul and muslin','Cotton','Chanderi','Kota doria','Viscose and rayon','Silk and tissue'];
/* Colour families for the colour filter, worked out from each colour's swatch. */
function hexHSL(h){h=h.replace('#','');const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let hh=0,ss=0;if(mx!==mn){const d=mx-mn;ss=l>.5?d/(2-mx-mn):d/(mx+mn);hh=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);hh*=60}return [hh,ss,l]}
function colFam(n){const nl=n.toLowerCase();
 const R=[[/white|ivory|cream/,'White and ivory'],[/black|charcoal|grey|gray/,'Black and grey'],[/pink|peach|blush|coral|rose/,'Pink and peach'],[/red|maroon|wine/,'Red and wine'],[/green|sage|olive|pista|mint/,'Green'],[/blue|aqua|turquoise|teal|navy/,'Blue'],[/purple|lavender|lilac|violet/,'Purple and lavender'],[/orange|tangerine|mustard|yellow|carrot|rust/,'Orange and yellow'],[/skin|nude|beige|gold|tan|brown|camel/,'Beige and gold']];
 for(const [re,f] of R)if(re.test(nl))return f;
 const [h,s,l]=hexHSL(col(n));if(s<.12)return l<.35?'Black and grey':'White and ivory';
 if(h<15||h>=345)return 'Red and wine';if(h<70)return 'Orange and yellow';if(h<170)return 'Green';if(h<250)return 'Blue';if(h<300)return 'Purple and lavender';return 'Pink and peach'}
const COLFAM_ORDER=['White and ivory','Beige and gold','Pink and peach','Red and wine','Orange and yellow','Green','Blue','Purple and lavender','Black and grey'];
const COLFAM_SW={'White and ivory':'#F4EFE6','Beige and gold':'#D8BE97','Pink and peach':'#E9A7B4','Red and wine':'#8E1B2C','Orange and yellow':'#E39B2E','Green':'#7E9A5A','Blue':'#8DB0D3','Purple and lavender':'#9A7BC4','Black and grey':'#3A3532'};
const PRODUCTS=()=>P0.map(p=>Object.assign({},p,S.over[p.c]||{}));
const prod=c=>PRODUCTS().find(p=>p.c===c);
const hasPhoto=p=>!!(S.uploads[p.c]||(p.ph&&Object.keys(p.ph).length));
const visible=()=>PRODUCTS().filter(p=>!p.hidden&&(C.showUnphotographed||hasPhoto(p)));
function photoOf(p,c){return [...(S.uploads[p.c]?[S.uploads[p.c]]:[]),...(((p.ph||{})[c])||[]).map(IMG)]}
function leadColour(p){const k=Object.keys(p.ph||{});return k.length?k[0]:p.cols[0]}
function sub(p){const g=fam(p);const cr=p.craft==='Chikankari'?'chikankari':p.craft==='Other embroidery'?'hand embroidery':p.craft==='Everyday'?'':p.craft.toLowerCase();return g?(cr?`${g}, ${cr}`:g):`${p.craft==='Chikankari'?'Chikankari':p.craft}, fabric of your choice`}
function featuredSort(a,b){return (hasPhoto(b)-hasPhoto(a))||(((b.tags||[]).includes('loved'))-((a.tags||[]).includes('loved')))}

/* ===================== ILLUSTRATION ENGINE ===================== */
function patDef(id,kind,base,scale=1){
 const light=lum(base)>0.62;
 const m=light?shade(base,-0.38):shade(base,0.6);
 const gold='#C99A4B';
 const T=scale!==1?` patternTransform="scale(${scale})"`:'';
 switch(kind){
  case 'chikan':return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"${T}><g fill="none" stroke="${m}" stroke-width=".7" opacity=".85"><circle cx="8" cy="8" r="1.3"/><path d="M8 4.4c1.1 1.1 1.1 2.2 0 2.4c-1.1-.2-1.1-1.3 0-2.4zM8 11.6c1.1-1.1 1.1-2.2 0-2.4c-1.1.2-1.1 1.3 0 2.4zM4.4 8c1.1-1.1 2.2-1.1 2.4 0c-.2 1.1-1.3 1.1-2.4 0zM11.6 8c-1.1-1.1-2.2-1.1-2.4 0c.2 1.1 1.3 1.1 2.4 0z"/></g><g fill="${m}" opacity=".7"><circle cx="0" cy="0" r=".7"/><circle cx="16" cy="0" r=".7"/><circle cx="0" cy="16" r=".7"/><circle cx="16" cy="16" r=".7"/></g></pattern>`;
  case 'shadow':return `<pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse"${T}><g fill="${m}" opacity=".32"><path d="M10 3c3 3 3 6 0 7c-3-1-3-4 0-7z"/><path d="M10 17c3-3 3-6 0-7c-3 1-3 4 0 7z"/><path d="M3 10c3-3 6-3 7 0c-1 3-4 3-7 0z"/><path d="M17 10c-3-3-6-3-7 0c1 3 4 3 7 0z"/></g><g fill="none" stroke="${m}" stroke-width=".55" opacity=".75"><path d="M10 3c3 3 3 6 0 7c-3-1-3-4 0-7z"/><path d="M10 17c3-3 3-6 0-7c-3 1-3 4 0 7z"/></g><circle cx="0" cy="0" r=".8" fill="${m}" opacity=".6"/><circle cx="20" cy="20" r=".8" fill="${m}" opacity=".6"/></pattern>`;
  case 'kota':return `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"${T}><path d="M0 .5H6M.5 0V6" stroke="${m}" stroke-width=".55" opacity=".6"/><rect x="2.6" y="2.6" width=".9" height=".9" fill="${m}" opacity=".35"/></pattern>`;
  case 'block':return `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"${T}><g fill="${m}" opacity=".75"><circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="7.6" r="2"/><circle cx="12" cy="16.4" r="2"/><circle cx="7.8" cy="10" r="2"/><circle cx="16.2" cy="10" r="2"/><circle cx="7.8" cy="14" r="2"/><circle cx="16.2" cy="14" r="2"/></g><circle cx="12" cy="12" r="1.1" fill="${base}"/><g fill="${m}" opacity=".55"><circle cx="0" cy="0" r="1.2"/><circle cx="24" cy="0" r="1.2"/><circle cx="0" cy="24" r="1.2"/><circle cx="24" cy="24" r="1.2"/></g></pattern>`;
  case 'resham':return `<pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse"${T}><path d="M3 26C9 18 17 18 24 8" fill="none" stroke="${gold}" stroke-width=".8" opacity=".9"/><g fill="${gold}" opacity=".85"><ellipse cx="11" cy="19" rx="2.6" ry="1.1" transform="rotate(-35 11 19)"/><ellipse cx="18" cy="14" rx="2.6" ry="1.1" transform="rotate(30 18 14)"/></g><g fill="${light?shade(base,-0.25):'#F7E4D6'}"><circle cx="24" cy="8" r="2.2"/><circle cx="24" cy="8" r=".9" fill="${gold}"/></g></pattern>`;
  case 'floral':return `<pattern id="${id}" width="34" height="34" patternUnits="userSpaceOnUse"${T}><g fill="${shade(base,0.45)}" stroke="${shade(base,-0.2)}" stroke-width=".4"><circle cx="17" cy="11" r="3.4"/><circle cx="12" cy="16" r="3.4"/><circle cx="22" cy="16" r="3.4"/><circle cx="14" cy="22" r="3.4"/><circle cx="20" cy="22" r="3.4"/></g><circle cx="17" cy="17.5" r="2.4" fill="#E2B867"/><path d="M2 32c3-4 6-5 9-4" stroke="${shade(base,0.35)}" fill="none" stroke-width=".8"/></pattern>`;
  case 'pearl':return `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"${T}><circle cx="6" cy="6" r="1.35" fill="#FFFDF7" opacity=".95"/><circle cx="6.4" cy="6.5" r="1.35" fill="#000" opacity=".08"/><circle cx="0" cy="0" r=".6" fill="${gold}"/><circle cx="12" cy="12" r=".6" fill="${gold}"/></pattern>`;
  case 'zari':return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"${T}><g fill="${gold}"><path d="M7 4.5l1.1 2.5L7 9.5 5.9 7z" opacity=".95"/><circle cx="0" cy="0" r=".55"/><circle cx="14" cy="14" r=".55"/></g></pattern>`;
  default:return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"${T}><path d="M0 2H4" stroke="${m}" stroke-width=".4" opacity=".07"/></pattern>`;
 }
}
const SKIN='#C68E68', HAIR='#2E1B10', JUTTI='#B98A4A';

function figure(p,colorName,opt={}){
 const body=opt.body||'regular';
 const bw=body==='petite'?0.88:body==='curvy'?1.36:1;
 const sy=body==='petite'?0.91:1;
 const base=col(colorName);
 const id='g'+(++UID);
 const pid=id+'p', gid=id+'gr';
 const ombre=p.pat==='ombre';
 const fill=ombre?`url(#${gid})`:base;
 const pat=ombre?'plain':p.pat;
 const cx=120,s=30*bw,b=27*bw,w=22*bw,hp=29*bw;
 const gold='#C99A4B';
 const accent=['zari','resham','pearl','floral'].includes(p.pat)?gold:(lum(base)>0.62?shade(base,-0.3):shade(base,0.45));
 let defs=patDef(pid,pat,base);
 if(ombre)defs+=`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(base,0.62)}"/><stop offset=".55" stop-color="${shade(base,0.15)}"/><stop offset="1" stop-color="${shade(base,-0.12)}"/></linearGradient>`;
 const both=(d,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/><path d="${d}" fill="url(#${pid})"/>`;
 let back='',arms='',legs='',garment='',front='';
 // arms
 const armL=`${cx-s+4},104 ${cx-s-9*bw},198 ${cx-s-6*bw},288`;
 const armR=`${cx+s-4},104 ${cx+s+9*bw},198 ${cx+s+6*bw},288`;
 arms=`<polyline points="${armL}" fill="none" stroke="${SKIN}" stroke-width="${10*bw}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${armR}" fill="none" stroke="${SKIN}" stroke-width="${10*bw}" stroke-linecap="round" stroke-linejoin="round"/>`;
 const sleeves=(len)=>{const ey=104+len;const lx=cx-s+4+(-9*bw-(-s+4)+s-4)*0;const pL=`${cx-s+4},104 ${cx-s-9*bw},${Math.min(198,ey)}${ey>198?` ${cx-s-9*bw+3*bw*(ey-198)/90},${ey}`:''}`;const pR=`${cx+s-4},104 ${cx+s+9*bw},${Math.min(198,ey)}${ey>198?` ${cx+s+9*bw-3*bw*(ey-198)/90},${ey}`:''}`;return [pL,pR].map(pt=>`<polyline points="${pt}" fill="none" stroke="${ombre?shade(base,0.5):base}" stroke-width="${14.5*bw}" stroke-linejoin="round"/><polyline points="${pt}" fill="none" stroke="url(#${pid})" stroke-width="${14.5*bw}" stroke-linejoin="round"/>`).join('')+(accent!==base&&p.pat!=='plain'?[pL,pR].map(pt=>{const last=pt.split(' ').pop().split(',');return `<circle cx="${last[0]}" cy="${last[1]}" r="${7*bw}" fill="none" stroke="${accent}" stroke-width="1.6" opacity=".9"/>`}).join(''):'')};
 const feet=`<ellipse cx="${cx-12*bw}" cy="546" rx="9" ry="4" fill="${JUTTI}"/><ellipse cx="${cx+12*bw}" cy="546" rx="9" ry="4" fill="${JUTTI}"/>`;
 const head=`<rect x="${cx-7}" y="72" width="14" height="22" fill="${SKIN}"/><ellipse cx="${cx}" cy="56" rx="16" ry="20" fill="${SKIN}"/><path d="M${cx-17},60 Q${cx-19},33 ${cx},33 Q${cx+19},33 ${cx+17},60 Q${cx+13},43 ${cx},43 Q${cx-13},43 ${cx-17},60Z" fill="${HAIR}"/><circle cx="${cx}" cy="31" r="10" fill="${HAIR}"/>`;
 const pants=(style,top,pc)=>{
  const pfill=pc||fill;
  let L,R;
  if(style==='palazzo'){L=`M${cx-hp+3},${top} L${cx},${top} L${cx-1},540 L${cx-36*bw},540Z`;R=`M${cx+hp-3},${top} L${cx},${top} L${cx+1},540 L${cx+36*bw},540Z`}
  else if(style==='churidar'){L=`M${cx-hp+8},${top} L${cx-1},${top} L${cx-6},538 L${cx-17*bw},538Z`;R=`M${cx+hp-8},${top} L${cx+1},${top} L${cx+6},538 L${cx+17*bw},538Z`}
  else {L=`M${cx-hp+5},${top} L${cx-1},${top} L${cx-4},538 L${cx-21*bw},538Z`;R=`M${cx+hp-5},${top} L${cx+1},${top} L${cx+4},538 L${cx+21*bw},538Z`}
  let out=`<path d="${L}" fill="${pfill}"/><path d="${R}" fill="${pfill}"/>`;
  if(!pc)out+=`<path d="${L}" fill="url(#${pid})" opacity=".6"/><path d="${R}" fill="url(#${pid})" opacity=".6"/>`;
  if(style==='churidar')out+=[0,1,2].map(i=>`<path d="M${cx-16*bw},${522+i*5}h${10*bw} M${cx+6},${522+i*5}h${10*bw}" stroke="${shade(pc||base,-0.15)}" stroke-width=".8"/>`).join('');
  return out+`<line x1="${cx}" y1="${top+20}" x2="${cx}" y2="538" stroke="${shade(pc||base,-0.18)}" stroke-width=".8" opacity=".6"/>`;
 };
 const kurta=(hemY,flare,waistSeam)=>{
  const d=`M${cx-11},90 L${cx-s},101 Q${cx-b-3},128 ${cx-b},158 Q${cx-w-1},205 ${cx-w},${waistSeam?200:228} Q${cx-hp},${waistSeam?230:262} ${cx-flare},${hemY} Q${cx},${hemY+6} ${cx+flare},${hemY} Q${cx+hp},${waistSeam?230:262} ${cx+w},${waistSeam?200:228} Q${cx+w+1},205 ${cx+b},158 Q${cx+b+3},128 ${cx+s},101 L${cx+11},90 Q${cx},118 ${cx-11},90Z`;
  let g=both(d);
  // neckline & yoke detail
  g+=`<path d="M${cx-11},90 Q${cx},118 ${cx+11},90" fill="none" stroke="${accent}" stroke-width="1.4"/>`;
  if(p.pat!=='plain'&&!ombre)g+=`<path d="M${cx-14},96 Q${cx},134 ${cx+14},96" fill="none" stroke="${accent}" stroke-width="1" stroke-dasharray="2.5 2" opacity=".9"/>`;
  // hem band
  const band=['zari','resham','pearl','floral'].includes(p.pat);
  if(band)g+=`<path d="M${cx-flare+1},${hemY-10} Q${cx},${hemY-4} ${cx+flare-1},${hemY-10}" fill="none" stroke="${gold}" stroke-width="5" opacity=".8"/><path d="M${cx-flare+1},${hemY-10} Q${cx},${hemY-4} ${cx+flare-1},${hemY-10}" fill="none" stroke="#F5E3B8" stroke-width="1" stroke-dasharray="1.5 2.5"/>`;
  if(waistSeam){g+=`<path d="M${cx-w},200 Q${cx},206 ${cx+w},200" fill="none" stroke="${accent}" stroke-width="1.6"/>`+[-2,-1,0,1,2].map(i=>`<path d="M${cx+i*7*bw},204 L${cx+i*13*bw},${hemY-2}" stroke="${shade(base,-0.14)}" stroke-width=".9" opacity=".7"/>`).join('')}
  else if(hemY>380)g+=`<path d="M${cx-hp-1},${hemY-46} L${cx-flare+2},${hemY}" stroke="${shade(base,-0.2)}" stroke-width=".9"/><path d="M${cx+hp+1},${hemY-46} L${cx+flare-2},${hemY}" stroke="${shade(base,-0.2)}" stroke-width=".9"/>`;
  if(ombre)g+=`<path d="${d}" fill="#fff" opacity=".06"/>`;
  return g;
 };
 const dupBack=()=>{const dc=ombre?shade(base,0.3):base;const L=`M${cx-s-2},98 L${cx-s+12},96 L${cx-s-4},470 L${cx-s-22*bw},466Z`;const R=`M${cx+s+2},98 L${cx+s-12},96 L${cx+s+4},470 L${cx+s+22*bw},466Z`;return `<g opacity=".88"><path d="${L}" fill="${dc}"/><path d="${L}" fill="url(#${pid})"/><path d="${R}" fill="${dc}"/><path d="${R}" fill="url(#${pid})"/><path d="M${cx-s-4},470 L${cx-s-22*bw},466 M${cx+s+4},470 L${cx+s+22*bw},466" stroke="${gold}" stroke-width="3"/></g>`};
 const dupFront=()=>`<path d="M${cx-s+2},100 Q${cx},146 ${cx+s-2},100" fill="none" stroke="${ombre?shade(base,0.3):base}" stroke-width="9" opacity=".9"/><path d="M${cx-s+2},100 Q${cx},146 ${cx+s-2},100" fill="none" stroke="url(#${pid})" stroke-width="9"/>`;

 if(p.type==='saree'){
  const blouse=shade(base,lum(base)>0.62?-0.3:-0.22);
  const skirt=`M${cx-w-2},194 L${cx-hp-16*bw},546 L${cx+hp+16*bw},546 L${cx+w+2},194Z`;
  back=`<path d="M${cx-s+2},100 L${cx-s-30*bw},440 L${cx-s-8*bw},450 L${cx-s+14},104Z" fill="${base}"/><path d="M${cx-s+2},100 L${cx-s-30*bw},440 L${cx-s-8*bw},450 L${cx-s+14},104Z" fill="url(#${pid})"/><path d="M${cx-s-30*bw},440 L${cx-s-8*bw},450" stroke="${gold}" stroke-width="6"/>`;
  legs=feet;
  garment=`<path d="M${cx-11},90 L${cx-s},101 Q${cx-b-3},128 ${cx-b},158 L${cx-w-1},176 L${cx+w+1},176 L${cx+b},158 Q${cx+b+3},128 ${cx+s},101 L${cx+11},90 Q${cx},118 ${cx-11},90Z" fill="${blouse}"/>`+
   `<rect x="${cx-w-1}" y="174" width="${2*w+2}" height="22" fill="${SKIN}"/>`+
   both(skirt)+`<path d="M${cx-hp-16*bw},538 L${cx+hp+16*bw},538" stroke="${gold}" stroke-width="10" opacity=".85"/>`+
   [0,1,2,3].map(i=>`<path d="M${cx+4+i*5},200 L${cx+2+i*8},544" stroke="${shade(base,-0.18)}" stroke-width=".9"/>`).join('')+
   sleeves(30);
  const pallu=`M${cx+hp+4},268 L${cx-s-3},96 L${cx-s+20},92 L${cx+hp+8},236Z`;
  front=`<path d="${pallu}" fill="${base}"/><path d="${pallu}" fill="url(#${pid})"/><path d="M${cx+hp+4},268 L${cx-s-3},96" stroke="${gold}" stroke-width="4" opacity=".9"/><path d="M${cx-s+20},92 L${cx+hp+8},236" stroke="${gold}" stroke-width="2" opacity=".9"/>`;
 } else {
  let hemY=418,flare=hp+9,ws=false,sl=118,pc=null;
  if(p.type==='short'){hemY=300;flare=hp+3;sl=96}
  if(p.type==='coord'){hemY=292;flare=hp+6;sl=80}
  if(p.type==='frock'){hemY=436;flare=64*bw;ws=true;sl=124}
  if(p.type==='set'){hemY=414;flare=hp+15}
  if(p.type==='kurta'){pc='#EFE6D6'}
  
  if(p.dup)back=dupBack();
  legs=pants(p.pant||'pant',hemY-40,pc)+feet;
  garment=kurta(hemY,flare,ws)+sleeves(sl);
  if(p.dup)front=dupFront();
 }
 const tr=sy!==1?` transform="translate(0 ${560*(1-sy)}) scale(1 ${sy})"`:'';
 const ground=opt.ground===false?'':`<ellipse cx="120" cy="549" rx="${58*bw}" ry="5" fill="#3F230D" opacity=".07"/>`;
 return `<svg class="${opt.cls||''}" viewBox="${opt.vb||'0 0 240 560'}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${esc(p.n)} in ${esc(colorName)}, illustrated"><defs>${defs}</defs>${opt.bg?`<rect x="-200" y="-200" width="640" height="960" fill="${opt.bg}"/>`:''}${ground}<g${tr}>${back}${arms}${legs}${garment}${head}${front}</g></svg>`;
}
function tileFig(p,c,cls){return figure(p,c,{cls,vb:'-30 0 300 560'})}

function detail(p,colorName,opt={}){
 const base=col(colorName);const id='d'+(++UID);
 const ombre=p.pat==='ombre';
 let defs=patDef(id+'p',ombre?'plain':p.pat,base,3.2);
 if(ombre)defs+=`<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(base,0.6)}"/><stop offset="1" stop-color="${shade(base,-0.1)}"/></linearGradient>`;
 const gold='#C99A4B';
 const band=['zari','resham','pearl','floral'].includes(p.pat);
 return `<svg class="${opt.cls||''}" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Fabric detail: ${esc(p.fab)}"><defs>${defs}</defs><rect width="300" height="400" fill="${ombre?`url(#${id}g)`:base}"/><rect width="300" height="400" fill="url(#${id}p)"/>`+
 `<path d="M-10 70 Q150 150 310 70" fill="none" stroke="${shade(base,-0.25)}" stroke-width="2" opacity=".5"/><path d="M-10 86 Q150 166 310 86" fill="none" stroke="${band?gold:shade(base,lum(base)>.6?-0.35:0.5)}" stroke-width="1.6" stroke-dasharray="7 5"/>`+
 (band?`<rect y="318" width="300" height="34" fill="${gold}" opacity=".85"/><rect y="324" width="300" height="22" fill="url(#${id}p)"/><path d="M0 318H300M0 352H300" stroke="#F5E3B8" stroke-width="1.2" stroke-dasharray="2 3"/>`:'')+
 `<path d="M0 0 L300 400" stroke="#fff" stroke-width="80" opacity=".05"/></svg>`;
}
function swatchArt(kind,bg,cls){
 const id='s'+(++UID);
 return `<svg class="${cls||''}" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${patDef(id,kind,bg,2.6)}</defs><rect width="300" height="400" fill="${bg}"/><rect width="300" height="400" fill="url(#${id})"/><path d="M-10 300 Q150 250 310 300" fill="none" stroke="#BA6D31" stroke-width="1.6" stroke-dasharray="7 5"/></svg>`;
}
const heartSVG=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="#3F230D" stroke-width="1.5"/></svg>`;



function thumb(p,c){const ph=photoOf(p,c);return ph.length?`<img src="${ph[0]}" alt="" loading="lazy">`:detail(p,c,{})}
const LOGO='assets/logo/wordmark.png', LOGO_LIGHT='assets/logo/wordmark-light.png';
const ornament=(cls='')=>`<div class="orn ${cls}" aria-hidden="true"><img src="assets/logo/ornament.png" alt=""></div>`;

/* ---------- layout ---------- */
const NAV=[['shop-new','New'],['shop-kurta-sets','Kurta sets'],['shop-kurtas','Kurtas'],['shop-sarees','Sarees'],['shop-festive','Festive'],['story','Our story']];
function countrySelect(id){return `<label class="sr" for="${id}">Deliver to</label><select class="ship" id="${id}" data-act="country" title="Deliver to">${C.countries.map(k=>`<option value="${k.code}" ${S.country===k.code?'selected':''}>${SHORT[k.code]||k.name}, ${k.currency}</option>`).join('')}</select>`}
const SHORT={IN:'India',US:'USA',GB:'UK',AE:'UAE',MY:'Malaysia',LK:'Sri Lanka'};
function header(active){
 const n=S.bag.reduce((a,i)=>a+i.q,0);
 const nav=NAV.map(([h,t])=>`<a href="#${h}" class="${active===h?'on':''}">${t}</a>`).join('');
 return `${LIVE||C.whatsapp?'':`<div class="demo">Preview mode. Order requests stay in this browser until the order sheet is connected. <a href="#admin">Admin</a></div>`}
 <div class="announce"><span class="long">Handmade to order and delivered across India, the USA, the UK, Sri Lanka, Malaysia and the UAE</span><span class="short">Made to order. Delivered to India and 5 countries</span></div>
 <header class="site"><div class="wrap hbar">
  <div style="display:flex;align-items:center;gap:14px"><button class="menuBtn" data-act="menu" aria-label="Menu" aria-expanded="false" style="background:none;border:0;padding:8px 0"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" stroke="#341A05" stroke-width="1.5"/></svg></button><nav class="hnav" aria-label="Main">${nav}</nav></div>
  <a class="logo" href="#" aria-label="Vidisha Ethnics, home"><img src="${LOGO}" alt="Vidisha Ethnics" width="172" height="61"></a>
  <div class="htools">
   <span class="hide-s">${countrySelect('ship1')}</span>
   <a href="#fit" class="hide-s">Find my size</a>
   <a href="#wishlist" aria-label="Wishlist, ${S.wish.length} saved">${heartSVG.replace('viewBox','class="icon" viewBox')}</a>
   <a href="#bag" aria-label="Bag, ${n} items"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="#341A05" stroke-width="1.4"/></svg><span class="count">${n}</span></a>
  </div></div>
  <nav class="mnav" id="mnav" aria-label="Mobile"><a href="#shop" class="${active==='shop'?'on':''}">Shop all</a>${nav}<a href="#fit">Find my size</a><a href="#shipping">Shipping and exchanges</a><a href="#contact">Contact</a><div style="padding-top:14px">${countrySelect('ship2')}</div></nav>
 </header>`;
}
function footer(){
 return `<footer><div class="wrap"><div class="cols">
  <div class="brandcol"><img src="assets/logo/lockup-light.png" alt="Vidisha Ethnics. From local artisans to your wardrobe."><p style="font-size:15px;color:#CDB39C;max-width:24em;margin-top:22px">Handcrafted chikankari and Indian textiles, made to order in India.</p></div>
  <div><h4>Shop</h4><a href="#shop">Shop all</a><a href="#shop-new">New</a><a href="#shop-kurta-sets">Kurta sets</a><a href="#shop-kurtas">Kurtas</a><a href="#shop-sarees">Sarees</a><a href="#shop-festive">Festive</a></div>
  <div><h4>Help</h4><a href="#fit">Find my size</a><a href="#shipping">Shipping and exchanges</a><a href="#help">Questions</a><a href="#contact">Contact</a><a href="#privacy">Privacy</a></div>
  <div><h4>Vidisha Ethnics</h4><a href="#story">Our story</a><a href="#craft">Chikankari</a><a href="${C.instagram}" target="_blank" rel="noopener">Instagram</a><a href="${wa('Hi Vidisha Ethnics, I have a question.')}" target="_blank" rel="noopener">WhatsApp +91 87229 49275</a><a href="${C.catalogue}" target="_blank" rel="noopener">WhatsApp catalogue</a><a href="mailto:${C.email}">${esc(C.email)}</a></div>
 </div><div class="fine"><span>© 2026 Vidisha Ethnics. Handmade in India.</span><span>We deliver to India, the USA, the UK, Sri Lanka, Malaysia and the UAE.</span></div></div></footer>`;
}
function tile(p,opt){
 const c=leadColour(p), ph=photoOf(p,c);
 const tag=opt&&opt.nobadge?'':(C.badges||{})[p.c]||'';
 const on=S.wish.includes(p.c);
 const main=ph.length?`<img src="${ph[0]}" alt="${esc(p.n)} in ${esc(c)}" loading="lazy">`:detail(p,c,{});
 const altSrc=ph.length>1?ph[1]:(()=>{const o=Object.keys(p.ph||{}).find(x=>x!==c);return o?IMG(p.ph[o][0]):null})();
 const alt=altSrc?`<img class="alt" src="${altSrc}" alt="" loading="lazy">`:ph.length?'':figure(p,c,{cls:'alt',vb:'-30 0 300 560',bg:'#FCF3EC'});
 return `<article class="tile"><a class="im" href="#p-${p.c}" aria-label="${esc(p.n)}">${main}${alt}${tag?`<span class="tag">${tag}</span>`:''}${ph.length?'':'<span class="soon">Photographs coming soon</span>'}</a>
 <button class="heart ${on?'on':''}" data-act="wish" data-c="${p.c}" aria-pressed="${on}" aria-label="${on?'Remove from':'Save to'} wishlist">${heartSVG}</button>
 <div class="meta"><a class="nm" href="#p-${p.c}">${esc(p.n)}</a><span class="cr">${esc(sub(p))}</span>${p.note?`<span class="cr note">${esc(p.note)}</span>`:''}<span class="pr">${price(p.inr)}</span>
 <span class="dots" aria-label="${p.cols.length} colours">${p.cols.slice(0,7).map(x=>`<i style="background:${col(x)}" title="${esc(x)}"></i>`).join('')}${p.cols.length>7?`<span class="cr">+${p.cols.length-7}</span>`:''}</span></div></article>`;
}
const PROCESS=`<ol class="process">
 <li><span class="n">1</span><div><h3>The pattern is printed</h3><p>The design is carved into wooden blocks and stamped onto the fabric in a washable blue dye. It guides the needle and disappears in the wash.</p></div></li>
 <li><span class="n">2</span><div><h3>It is stitched on a hoop</h3><p>The fabric is stretched on a small hoop and embroidered by hand, stitch by stitch: flat petals, raised knots, and the soft glow of shadow work. One kurta can take days.</p></div></li>
 <li><span class="n">3</span><div><h3>It is washed and finished</h3><p>The finished piece is washed to lift the blue outlines, then starched, pressed and checked before it reaches us.</p></div></li></ol>`;
const VIDEO=(cap=true)=>`<figure><div class="archimg"><video src="assets/img/artisan.mp4" poster="${IMG('artisan')}" autoplay muted loop playsinline preload="metadata" aria-label="An artisan stitching chikankari on a hoop"></video></div>${cap?'<figcaption>An artisan at work on a chikankari motif</figcaption>':''}</figure>`;
const FOUNDER=(sound,lazy=true)=>`<figure class="fvid"><div class="archimg tall"><video src="assets/img/vidisha.mp4" poster="${IMG('vidisha')}" autoplay muted loop playsinline preload="${lazy?'none':'metadata'}" aria-label="Vidisha Chaurasia, founder of Vidisha Ethnics"></video>${sound?'<button type="button" class="snd" data-act="snd" aria-pressed="false">Play with sound</button>':''}</div><figcaption>Vidisha Chaurasia, founder</figcaption></figure>`;
const SITE='https://vidishaethnics.com';
const shareUrl=c=>`${SITE}/p/${c}/`;
const COUNTRY_NAMES=['India','USA','UK','Sri Lanka','Malaysia','UAE'];

/* ---------- pages ---------- */
function pageHome(){
 const v=visible();
 const loved=v.filter(hasPhoto).sort(featuredSort).slice(0,4);
 const fresh=v.filter(p=>hasPhoto(p)&&!loved.includes(p)&&p.c!=='S008'&&((p.tags||[]).includes('new')||(p.tags||[]).includes('festive'))).sort((x,y)=>((y.tags||[]).includes('new'))-((x.tags||[]).includes('new'))).slice(0,3);
 const hs=prod('S010'), w34=prod('W034');
 return `
 <section class="hero">
  <div>
   <div class="reveal">${ornament()}</div>
   <h1 class="reveal d2">From local artisans to your wardrobe</h1>
   <p class="lede reveal d3">Lucknow chikankari, hand-stitched on mul, chanderi, kota doria and more. Every piece is made to your order, in your size.</p>
   <div class="ctas reveal d3"><a class="btn" href="#shop">Explore the collection</a><a class="btn ghost" href="#story">Our story</a></div>
  </div>
  <figure class="reveal d2"><div style="position:relative"><div class="frame" aria-hidden="true"></div><div class="archimg"><img src="${IMG('s010-offwhite-2')}" alt="Off-white tissue chikankari saree with a gold border" fetchpriority="high"></div></div>
   <figcaption><a href="#p-S010">${esc(hs.n)}</a><span>${price(hs.inr)}</span></figcaption></figure>
 </section>
 <section class="sec"><div class="wrap">
  <div class="sechead"><div><h2>Most loved</h2><p>The pieces our clients come back for, in new colours.</p></div><a class="link" href="#shop">Shop all</a></div>
  <div class="grid">${loved.map(p=>tile(p,{nobadge:1})).join('')}</div>
 </div></section>

 <section class="sec dark"><div class="wrap craftband">
  ${VIDEO()}
  <div><h2>Chikankari, stitch by stitch</h2>
  <p style="font-size:18px;margin-top:18px;max-width:34em">Almost everything we make carries chikankari, the hand embroidery of Lucknow. This is how a piece comes to life before it reaches you.</p>
  ${PROCESS}
  <a class="btn light" href="#craft">About the craft</a></div>
 </div></section>

 <section class="sec"><div class="wrap split">
  <div class="lead"><h2>New and festive</h2><p>Fresh chikankari for weddings, pujas and celebrations, made to order in your size.</p><p style="display:flex;gap:26px;flex-wrap:wrap;margin-top:6px"><a class="link" href="#shop-new">See what's new</a><a class="link" href="#shop-festive">Shop festive</a></p>
   <figure><a href="#p-S008" style="display:block"><div class="archimg"><img src="${IMG('s008-red-1')}" alt="Red chikankari saree with pearl and crystal work" loading="lazy"></div></a></figure></div>
  <div class="grid three">${fresh.map(p=>tile(p,{nobadge:1})).join('')}</div>
 </div></section>

 <section class="sec"><div class="wrap">
  <div class="sechead"><div><h2>Shop by fabric</h2><p>The same hand embroidery, on fabrics chosen for the season and the occasion.</p></div></div>
  <div class="fabrics">${FABRICS.map(f=>`<a class="fabric" href="#shop-fabric-${slug(f.k)}"><div class="im"><img src="${IMG(f.img)}" alt="" loading="lazy"></div><h3>${f.k}</h3><span>${f.line}</span></a>`).join('')}</div>
 </div></section>

 <section class="sec band" style="background:var(--cream2)"><div class="wrap">
  <div class="sechead"><div><h2>Worn and loved</h2><p>Our clients, at home, at work and at celebrations.</p></div><a class="link" href="${C.instagram}" target="_blank" rel="noopener">Follow @vidishaethnic</a></div>
  <div class="loved">
   <blockquote class="quote"><span class="q" aria-hidden="true">“</span><p>Thank you for this lovely kurta. The fabric is incredibly soft, comfortable, and the beautiful embroidery.</p><cite>A client, on her powder blue chikankari kurta</cite></blockquote>
   ${[1,2,3,4,5,6].map(i=>`<figure><img src="${IMG('client-'+i)}" alt="A Vidisha Ethnics client wearing her piece" loading="lazy"></figure>`).join('')}
  </div>
 </div></section>

 <section class="sec" style="padding-top:0"><div class="wrap teaser">
  ${FOUNDER(false)}
  <div>${ornament('sm')}<blockquote style="margin-top:26px">Clothing made by hand should reach the person who wears it with nothing lost on the way.</blockquote>
  <p class="who">Vidisha Chaurasia started Vidisha Ethnics in Bengaluru in March 2025. We buy directly from artisan clusters and make each piece only when you ask for it.</p>
  <a class="btn ghost" href="#story">Read our story</a></div>
 </div></section>`;
}

function pageShop(preset){
 const f=S.f;
 if(!f.cols)f.cols=[];
 if(preset&&!route.keep){Object.assign(f,{cat:'All',crafts:[],fabs:[],cols:[],price:'all'},preset)}
 let list=visible();
 if(f.cat==='Festive')list=list.filter(p=>(p.tags||[]).includes('festive'));
 else if(f.cat==='New')list=list.filter(p=>(p.tags||[]).includes('new'));
 else if(f.cat!=='All')list=list.filter(p=>p.cat===f.cat);
 if(f.crafts.length)list=list.filter(p=>f.crafts.includes(p.craft));
 if(f.fabs.length)list=list.filter(p=>f.fabs.includes(fam(p)));
 if(f.cols.length)list=list.filter(p=>p.cols.some(c=>f.cols.includes(colFam(c))));
 if(f.price!=='all')list=list.filter(p=>priced(p.inr));
 if(f.price==='lt2')list=list.filter(p=>p.inr<2000);
 if(f.price==='2to4')list=list.filter(p=>p.inr>=2000&&p.inr<=4000);
 if(f.price==='gt4')list=list.filter(p=>p.inr>4000);
 if(f.sort==='featured')list.sort(featuredSort);
 if(f.sort==='lo')list.sort((a,b)=>(a.inr||1e9)-(b.inr||1e9));
 if(f.sort==='hi')list.sort((a,b)=>(b.inr||-1)-(a.inr||-1));
 if(f.sort==='new')list.sort((a,b)=>((b.tags||[]).includes('new'))-((a.tags||[]).includes('new')));
 const T={All:['The collection','Handcrafted kurtas, sets and sarees, made to order in your size.'],'Kurta sets':['Kurta sets','Complete sets with pants, slips and dupattas, matched in colour.'],Kurtas:['Kurtas','Long and short kurtas to pair with what you already own.'],Sarees:['Sarees','Chanderi, tissue, kota doria and cotton drapes.'],Festive:['Festive','For weddings, pujas and Diwali evenings.'],New:['New','The latest chikankari, made to order in your size.']};
 let [t,sub]=T[f.cat]||T.All;
 if(f.fabs.length===1&&f.cat==='All'){t=f.fabs[0];sub=(FABRICS.find(x=>x.k===f.fabs[0])||{}).line||sub}
 const vis=visible();
 const fabs=FAB_ORDER.filter(g=>vis.some(p=>fam(p)===g));
 const cfs=COLFAM_ORDER.filter(g=>vis.some(p=>p.cols.some(c=>colFam(c)===g)));
 const any=f.crafts.length||f.fabs.length||f.cols.length||f.price!=='all'||f.cat!=='All';
 return `<div class="wrap pagehead"><div class="crumbs"><a href="#">Home</a> / Shop</div><h1>${esc(t)}</h1><p>${esc(sub)}</p></div>
 <div class="wrap shop">
  <aside class="filters" id="filters" aria-label="Filters">
   <div class="fgroup"><h4>Category</h4>${['All','New','Kurta sets','Kurtas','Sarees','Festive'].map(c=>`<label class="chk"><input type="radio" name="cat" data-act="fcat" value="${c}" ${f.cat===c?'checked':''}>${c==='All'?'Everything':c}</label>`).join('')}</div>
   <div class="fgroup"><h4>Fabric</h4>${fabs.map(c=>`<label class="chk"><input type="checkbox" data-act="ffab" value="${esc(c)}" ${f.fabs.includes(c)?'checked':''}>${esc(c)}</label>`).join('')}</div>
   <div class="fgroup"><h4>Colour</h4><div class="cfam">${cfs.map(c=>`<label class="cchip" title="${esc(c)}"><input type="checkbox" data-act="fcol" value="${esc(c)}" ${f.cols.includes(c)?'checked':''}><i style="background:${COLFAM_SW[c]}"></i><span>${esc(c)}</span></label>`).join('')}</div></div>
   <div class="fgroup"><h4>Price in India</h4>${[['all','Any price'],['lt2','Under ₹2,000'],['2to4','₹2,000 to ₹4,000'],['gt4','Above ₹4,000']].map(([v,l])=>`<label class="chk"><input type="radio" name="price" data-act="fprice" value="${v}" ${f.price===v?'checked':''}>${l}</label>`).join('')}</div>
   ${any?`<button class="textlink" data-act="fclear">Clear filters</button>`:''}
  </aside>
  <div>
   <div class="shopbar"><span>${list.length} ${list.length===1?'piece':'pieces'}</span><span style="display:flex;gap:12px;align-items:center"><button class="btn ghost fToggle" style="min-height:40px;padding:0 16px" data-act="ftoggle">Filters</button><label>Sort <select data-act="fsort">${[['featured','Featured'],['new','New in'],['lo','Price, low to high'],['hi','Price, high to low']].map(([v,l])=>`<option value="${v}" ${f.sort===v?'selected':''}>${l}</option>`).join('')}</select></label></span></div>
   ${list.length?`<div class="grid three">${list.map(tile).join('')}</div>`:`<div class="empty"><p>Nothing matches these filters.</p><button class="btn ghost" data-act="fclear">Clear filters</button></div>`}
  </div>
 </div>`;
}

let PDP={};
function pagePDP(code){
 const p=prod(code);
 if(!p||p.hidden)return `<div class="wrap empty"><h1>This piece isn't available right now</h1><p style="margin-top:16px"><a class="link" href="#shop">Back to the collection</a></p></div>`;
 if(PDP.c!==code)PDP={c:code,col:leadColour(p),size:null,q:1};
 const isSaree=p.type==='saree'; if(isSaree)PDP.size='Free';
 const rec=S.fit&&S.fit.size;
 const own=photoOf(p,PDP.col), lead=leadColour(p);
 const stand=!own.length&&p.ph&&Object.keys(p.ph).length;
 const shownCol=stand?(p.ph[lead]?lead:Object.keys(p.ph)[0]):PDP.col;
 const phs=stand?photoOf(p,shownCol):own;
 const tiles=[];
 phs.forEach((src,i)=>tiles.push(`<figure class="${i===0?'lead':''}"><button type="button" class="zoom" data-act="zoom" data-v="${src}" aria-label="Enlarge photo ${i+1}"><img src="${src}" alt="${esc(p.n)} in ${esc(shownCol)}, photo ${i+1}" ${i?'loading="lazy"':'fetchpriority="high"'}></button>${i===0&&stand?`<figcaption>Shown in ${esc(shownCol)}. Yours will be made in ${esc(PDP.col)}.</figcaption>`:''}</figure>`));
 const need=phs.length===1?2:phs.length%2===0?1:0;if(need){const others=Object.keys(p.ph||{}).filter(c=>c!==shownCol);const extra=[];others.forEach(c=>(p.ph[c]||[]).forEach(n=>extra.push([c,n])));extra.slice(0,need).forEach(([c,n])=>tiles.push(`<figure><button data-act="col" data-v="${esc(c)}" style="all:unset;cursor:pointer;display:block;width:100%;height:100%" aria-label="See ${esc(c)}"><img src="${IMG(n)}" alt="${esc(p.n)} in ${esc(c)}" loading="lazy"></button><figcaption>${esc(c)}</figcaption></figure>`))}
 if(!phs.length)tiles.push(`<figure>${detail(p,PDP.col,{})}<figcaption>${phs.length?'Colour and work':'Photographs coming soon. Colour and work shown.'}</figcaption></figure>`);
 if(!phs.length)tiles.push(`<figure>${figure(p,PDP.col,{vb:'-30 0 300 560',bg:'#FCF3EC'})}<figcaption>Illustrated silhouette</figcaption></figure>`);
 const care=CARE[p.care]||CARE.dry;
 const related=visible().filter(x=>x.c!==p.c&&(fam(x)===fam(p)||x.cat===p.cat)).sort(featuredSort).slice(0,4);
 const k=cty();
 const one=[{c:p.c,q:1}];
 const note=!priced(p.inr)?`We'll confirm the price for ${k.code==='IN'?'India':k.name} on WhatsApp.`:k.code==='IN'?(abroad()?'Price for orders placed from outside India. Free shipping within India.':'Price for delivery in India. Free shipping.'):`Price for ${k.name}. India Post Speed Post shipping is about ${money(shipAmount(one),k.code)} for this piece.`;
 const cvt=r=>PDP.u==='cm'?String(r).split('–').map(x=>Math.round(+x*2.54)).join('–'):r;
 const SZ=p.sizes?SIZES.filter(z=>p.sizes.includes(z.s)):SIZES.filter(z=>+z.s<=46);
 const catHash=p.cat==='Sarees'?'sarees':p.cat==='Kurtas'?'kurtas':'kurta-sets';
 return `<div class="wrap"><div class="crumbs" style="padding-top:26px"><a href="#">Home</a> / <a href="#shop-${catHash}">${p.cat}</a> / ${esc(p.n)}</div>
 <div class="pdp">
  <div class="gallery">${tiles.join('')}</div>
  <div class="info">
   <div class="code">${p.c}${p.craft==='Chikankari'?', hand-embroidered chikankari':''}</div>
   <h1>${esc(p.n)}</h1>
   <div class="price">${price(p.inr)}<small>${note}</small></div>
   <p style="color:var(--ink2);margin-top:18px;font-size:16.5px">${esc(p.d)}</p>
   <div class="opt"><div class="lab"><span>Colour: <b>${esc(PDP.col)}</b></span><span class="small">${p.cols.length} colours</span></div>
    <div class="swatches">${p.cols.map(c=>`<button class="swatch ${PDP.col===c?'on':''}" style="background:${col(c)}" data-act="col" data-v="${esc(c)}" aria-label="${esc(c)}" aria-pressed="${PDP.col===c}"></button>`).join('')}</div>${stand?`<p class="small" style="margin:10px 0 0">We haven't photographed ${esc(PDP.col)} yet. Ask us on WhatsApp for a picture of the fabric.</p>`:''}</div>
   ${isSaree?`<div class="opt"><div class="lab"><span>Size: <b>Free size</b></span></div><p class="small">Saree length and blouse details are confirmed with you on WhatsApp.</p></div>`:
   `<div class="opt"><div class="lab"><span>Size${PDP.size?`: <b>${PDP.size} (${SIZES.find(z=>z.s===PDP.size).l})</b>`:''}</span><span style="display:flex;gap:18px"><button class="textlink" data-act="sizeguide" style="font-size:14px">Size guide</button><button class="textlink" data-act="openfit" style="font-size:14px">${rec?`Your size is ${rec}`:'Find my size'}</button></span></div>
    <div class="sizes" role="group" aria-label="Size" style="grid-template-columns:repeat(${Math.min(SZ.length,7)},1fr)">${SZ.map(z=>`<button class="size ${PDP.size===z.s?'on':''} ${rec===z.s&&PDP.size!==z.s?'rec':''}" data-act="size" data-v="${z.s}" aria-pressed="${PDP.size===z.s}">${z.s}<small>${z.l}</small></button>`).join('')}</div>
    <div class="hint" id="sizehint">${rec&&!PDP.size?(SZ.some(z=>z.s===rec)?'Your fit-finder size has a gold outline.':`Your fit-finder size (${rec}) isn't offered in this piece. Message us and we'll advise.`):''}</div></div>`}
   <div class="opt" style="display:flex;align-items:center;gap:18px"><span style="font-size:14px">Quantity</span><div class="qty"><button data-act="q-" aria-label="Decrease quantity">−</button><span aria-live="polite">${PDP.q}</span><button data-act="q+" aria-label="Increase quantity">+</button></div></div>
   <div class="actions"><button class="btn wide" data-act="add">Add to bag</button>
    <a class="btn ghost wide" target="_blank" rel="noopener" href="${wa(`Hi Vidisha Ethnics, I'd like to know more about ${p.c} ${p.n} in ${PDP.col}.\n${shareUrl(p.c)}`)}">Ask about this on WhatsApp</a>
    <button type="button" class="textlink sharebtn" data-act="share" data-v="${p.c}">Share this piece</button></div>
   <div class="assure"><div><b>Made to order</b>Ready in ${C.leadTime}</div><div><b>Size exchange</b>If it doesn't fit, we exchange it</div><div><b>No payment now</b>We confirm with you first</div></div>
   <details class="acc" open><summary>What's included</summary><div class="bd">${esc(p.inc)}.${!isSaree&&!/slip/i.test(p.inc)&&/chanderi|kota|mul|muslin|tissue/i.test(p.fab)?' A matching cotton slip can be added for ₹350.':''}</div></details>
   <details class="acc"><summary>Fabric and care</summary><div class="bd"><p><b>Fabric:</b> ${esc(p.fab)}</p><p style="margin:0">${care}</p></div></details>
   ${p.craft==='Chikankari'?`<details class="acc"><summary>The craft: chikankari</summary><div class="bd"><p>Hand embroidery from Lucknow, worked on a hoop one stitch at a time. Small irregularities are the mark of a hand, not a flaw.</p><a class="link" href="#craft">How a piece is made</a></div></details>`:''}
   ${isSaree?'':`<details class="acc" id="sizeacc"><summary>Size guide</summary><div class="bd"><p>Body measurements. Every piece is made for you, so we also note your own measurements with your request.</p>
   <div class="seg" role="group" aria-label="Units" style="margin-bottom:12px"><button type="button" data-act="szu" data-v="in" class="${PDP.u!=='cm'?'on':''}">Inches</button><button type="button" data-act="szu" data-v="cm" class="${PDP.u==='cm'?'on':''}">cm</button></div>
   <table class="tbl sz"><thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead><tbody>${SZ.map(z=>`<tr class="${PDP.size===z.s?'hl':''}"><td><b>${z.s}</b> ${z.l}</td><td>${cvt(z.b)}</td><td>${cvt(z.w)}</td><td>${cvt(z.h)}</td></tr>`).join('')}</tbody></table>
   <p class="small" style="margin:12px 0 0">Between two sizes? Choose the larger one, or <button class="textlink" data-act="openfit">use the fit finder</button>.</p></div></details>`}
   <details class="acc"><summary>Shipping and exchange</summary><div class="bd">Made to order in ${C.leadTime}, then shipped with tracking to India, the USA, the UK, Sri Lanka, Malaysia and the UAE. We exchange for size; message us within 7 days of delivery. <a class="link" href="#shipping">Details</a></div></details>
  </div>
 </div>
 ${!isSaree?`<details class="trioacc"${PDP.trio?' open':''}><summary><span>See how it falls on three body types</span><small>Drawn in ${esc(PDP.col)}, to help you picture the length</small></summary>
  <div class="trio">${[['petite','Petite',"5'1\", size 36"],['regular','Regular',"5'5\", size 40"],['curvy','Curvy',"5'6\", size 44"]].map(([b,l,m])=>`<figure>${figure(p,PDP.col,{body:b})}<figcaption><b>${l}</b>${m}</figcaption></figure>`).join('')}</div></details>`:''}
 ${related.length?`<section class="sec" style="padding-top:72px"><div class="sechead"><div><h2>You may also like</h2></div></div><div class="grid">${related.map(tile).join('')}</div></section>`:''}
 </div>`;
}

function fitForm(ctx){
 const f=S.fit||{unit:'in'}, u=f.unit||'in';
 return `<form class="form" data-form="fit" data-ctx="${ctx}" data-unit="${u}" novalidate>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><span class="small">Measure over light clothing, tape snug but not tight.</span><div class="seg" role="group" aria-label="Units"><button type="button" data-act="unit" data-v="in" class="${u==='in'?'on':''}">Inches</button><button type="button" data-act="unit" data-v="cm" class="${u==='cm'?'on':''}">cm</button></div></div>
  <div class="row2"><label class="f"><span class="req">Bust, at the fullest part</span><input class="t" name="bust" inputmode="decimal" value="${esc(f.bust||'')}"></label><label class="f"><span>Waist, at the narrowest</span><input class="t" name="waist" inputmode="decimal" value="${esc(f.waist||'')}"></label></div>
  <div class="row2"><label class="f"><span class="req">Hip, at the fullest part</span><input class="t" name="hip" inputmode="decimal" value="${esc(f.hip||'')}"></label><label class="f"><span>Height</span><input class="t" name="height" value="${esc(f.height||'')}" placeholder="5'4&quot; or 163 cm"></label></div>
  <div class="err" role="alert" data-err></div>
  <button class="btn" type="submit">Show my size</button>
  <div data-res>${f.size!==undefined&&f.bust?fitResult(f):''}</div>
 </form>`;
}
function calcSize(bust,hip,unit){let B=parseFloat(bust),H=parseFloat(hip);if(unit==='cm'){B/=2.54;H/=2.54}const ub=[33,35,37,39,41,43,45,47,49],uh=[36,38,40,42,44,46,48,50,52];let ib=ub.findIndex(x=>B<=x+0.4),ih=uh.findIndex(x=>H<=x+0.4);if(ib<0)ib=9;if(ih<0)ih=9;const i=Math.max(ib,ih);return i>8?null:SIZES[i].s}
function fitResult(f){
 if(!f.size)return `<div class="result"><div class="big">Made to measure</div><p style="margin:10px 0 0">Your measurements are above our size 50. We can make your piece to measure; mention it in your request.</p></div>`;
 const z=SIZES.find(x=>x.s===f.size);const body=+f.size<=36?'petite':+f.size>=44?'curvy':'regular';const ext=+f.size>46?' Sizes 48 and 50 are available in selected pieces, such as our cotton chikankari kurtis.':'';
 return `<div class="result"><div class="small">Your size</div><div class="big">${z.s} <span style="font-size:24px">(${z.l})</span></div><p style="margin:10px 0 0">The closest body-type preview is <b>${body}</b>. We'll add your measurements to your request.${ext}</p></div>`;
}
function pageFit(){
 const fz=S.fit&&S.fit.size;
 return `<div class="wrap pagehead"><div class="crumbs"><a href="#">Home</a> / Find my size</div><h1>Find my size</h1><p>Three measurements are enough to suggest your size. Every piece is made to order, so we also keep your measurements with your request.</p></div>
 <div class="wrap two"><div>${fitForm('page')}</div>
 <div><h2 class="t3" style="margin-bottom:14px">Size chart</h2><p class="small">Body measurements in inches.</p>
 <table class="tbl"><thead><tr><th>Size</th><th></th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead><tbody>${SIZES.map(z=>`<tr class="${fz===z.s?'hl':''}"><td><b>${z.s}</b></td><td>${z.l}</td><td>${z.b}</td><td>${z.w}</td><td>${z.h}</td></tr>`).join('')}</tbody></table>
 <p class="small" style="margin-top:14px">Between two sizes? Choose the larger one.</p></div></div>`;
}

const bagTotal=(cc=S.country)=>S.bag.reduce((a,it)=>{const p=prod(it.c);return a+(p&&priced(p.inr)?amount(p.inr,cc)*it.q:0)},0);
const bagOnRequest=()=>S.bag.some(it=>{const p=prod(it.c);return p&&!priced(p.inr)});
const totalLabel=(v,onreq,cc)=>v?money(v,cc)+(onreq?' + pieces priced on request':''):'Confirmed on WhatsApp';
function sumRows(items,cc,g){const k=cty(cc);let sub=0,onreq=false;items.forEach(it=>{const p=prod(it.c);if(p&&priced(p.inr))sub+=amount(p.inr,cc,g)*it.q;else if(p)onreq=true});const sh=shipAmount(items,cc);
 return `<div class="sumrow"><span>Pieces</span><span>${sub?money(sub,cc)+(onreq?' +':''):'On request'}</span></div><div class="sumrow"><span>Shipping${k.code==='IN'?'':' by India Post Speed Post'}</span><span>${k.code==='IN'?'Free':'about '+money(sh,cc)}</span></div><div class="tot"><span>Estimated total</span><b>${sub?money(sub+sh,cc)+(onreq?' + pieces priced on request':''):'Confirmed on WhatsApp'}</b></div>`}
function bagLine(it,i){
 const p=prod(it.c);if(!p)return '';
 return `<div class="line"><a class="th" href="#p-${p.c}">${thumb(p,it.col)}</a><div><a href="#p-${p.c}" class="bname">${esc(p.n)}</a><div class="small">${p.c}, ${esc(it.col)}, size ${it.size==='Free'?'free':it.size}</div>
 <div style="display:flex;gap:16px;align-items:center;margin-top:10px"><div class="qty"><button data-act="bq-" data-i="${i}" aria-label="Decrease">−</button><span>${it.q}</span><button data-act="bq+" data-i="${i}" aria-label="Increase">+</button></div><button class="textlink" data-act="brm" data-i="${i}">Remove</button></div></div>
 <div>${priced(p.inr)?price(p.inr*it.q):'On request'}</div></div>`;
}
const STEPS=(n)=>`<ol class="flow" aria-label="Ordering steps">${['Your bag','Your details','Confirm on WhatsApp'].map((t,i)=>`<li class="${i+1===n?'on':i+1<n?'done':''}"${i+1===n?' aria-current="step"':''}><span>${i+1}</span>${t}</li>`).join('')}</ol>`;
const HOWTO=`<div class="howto"><h3 class="t4">How ordering works</h3><ol><li><b>Send a request</b> with your piece, colour, size and measurements. Nothing is charged here.</li><li><b>We confirm on WhatsApp</b> and share the final amount for your country and how to pay.</li><li><b>Made for you</b> in ${C.leadTime}, then shipped with tracking. If the size is wrong, we exchange it.</li></ol></div>`;
function pageBag(){
 if(!S.bag.length)return `<div class="wrap pagehead"><h1>Your bag</h1></div><div class="wrap empty"><p>Your bag is empty. Add the pieces you'd like us to make for you.</p><a class="btn" href="#shop">Explore the collection</a></div>`;
 const k=cty();
 return `<div class="wrap pagehead">${STEPS(1)}<h1>Your bag</h1><p>Review your pieces, then send us a request. Nothing is charged on the website.</p></div>
 <div class="wrap two"><div>${S.bag.map(bagLine).join('')}</div>
 <aside class="summary"><h2 class="t3">Summary</h2><p class="small" style="margin:6px 0 0">Delivering to ${k.name}</p>${sumRows(S.bag,S.country,S.geo)}
 <p class="small">${k.code==='IN'?'Free shipping within India.':'Shipping is the India Post Speed Post rate to '+k.name+' for the weight of your pieces, with tracking.'} We confirm the final amount with you on WhatsApp before you pay.</p>
 <a class="btn wide" href="#request">Continue to your details</a><a class="link" href="#shop" style="display:inline-block;margin-top:16px">Keep browsing</a>${HOWTO}</aside></div>`;
}
function pageRequest(){
 if(!S.bag.length)return pageBag();
 const f=S.fit||{}, u=f.unit||'in', k=cty();
 return `<div class="wrap pagehead">${STEPS(2)}<h1>Your details</h1><p>We'll message you on WhatsApp to confirm the details and share how to pay. Nothing is charged here.</p></div>
 <div class="wrap two"><form class="form" data-form="req" novalidate>
  <fieldset class="fs"><legend>Your details</legend><div class="form">
   <label class="f"><span class="req">Full name</span><input class="t" name="name" autocomplete="name"></label>
   <div class="row2"><label class="f"><span class="req">WhatsApp number, with country code</span><input class="t" name="wa" inputmode="tel" autocomplete="tel" placeholder="${k.code==='IN'?'+91':k.code==='US'?'+1':k.code==='GB'?'+44':k.code==='AE'?'+971':k.code==='MY'?'+60':'+94'} …"></label><label class="f"><span>Email (optional)</span><input class="t" name="email" type="email" autocomplete="email"></label></div>
   <div class="row2"><label class="f"><span class="req">City</span><input class="t" name="city" autocomplete="address-level2"></label><label class="f"><span class="req">Country</span><select class="t" name="country" data-act="reqcountry">${C.countries.map(c=>`<option value="${c.code}" ${S.country===c.code?'selected':''}>${c.name}</option>`).join('')}</select></label></div>
  </div></fieldset>
  <fieldset class="fs"><legend>Your measurements</legend><div class="form">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><span class="small">${S.fit?'Filled in from your fit finder. Change anything that needs it.':'This helps us make your piece to fit. Not sure? <a class="textlink" href="#fit">Use the fit finder</a>'}</span><div class="seg" role="group" aria-label="Units"><button type="button" data-act="unit" data-v="in" class="${u==='in'?'on':''}">Inches</button><button type="button" data-act="unit" data-v="cm" class="${u==='cm'?'on':''}">cm</button></div></div>
   <input type="hidden" name="unit" value="${u}">
   <div class="row3"><label class="f"><span class="req">Bust</span><input class="t" name="bust" inputmode="decimal" value="${esc(f.bust||'')}"></label><label class="f"><span class="req">Waist</span><input class="t" name="waist" inputmode="decimal" value="${esc(f.waist||'')}"></label><label class="f"><span class="req">Hip</span><input class="t" name="hip" inputmode="decimal" value="${esc(f.hip||'')}"></label></div>
   <div class="row3"><label class="f"><span>Shoulder</span><input class="t" name="shoulder" inputmode="decimal"></label><label class="f"><span>Height</span><input class="t" name="height" value="${esc(f.height||'')}"></label><label class="f"><span>Kurta length</span><input class="t" name="length" inputmode="decimal" placeholder="Optional"></label></div>
  </div></fieldset>
  <fieldset class="fs"><legend>Anything else</legend><div class="form">
   <label class="f"><span>Need it by a date? (optional)</span><input class="t" name="by" placeholder="For example, 12 December" autocomplete="off"></label>
   <label class="f"><span>Notes</span><textarea class="t" name="notes" placeholder="Sleeve length, colour questions, a gift, the occasion"></textarea></label>
  </div></fieldset>
  <div class="err" id="reqerr" role="alert"></div>
  <button class="btn" type="submit" id="sendbtn">Send order request</button>
 </form>
 <aside class="summary"><h2 class="t3" style="margin-bottom:6px">Your request</h2>
 ${S.bag.map(it=>{const p=prod(it.c);return `<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);font-size:15px"><span>${esc(p.n)}<br><span class="small">${esc(it.col)}, size ${it.size==='Free'?'free':it.size}, qty ${it.q}</span></span><span>${priced(p.inr)?price(p.inr*it.q):'On request'}</span></div>`}).join('')}
 ${sumRows(S.bag,S.country,S.geo)}<p class="small" style="margin:0">Made to order: ready ${C.leadTime} after payment is confirmed.</p></aside></div>`;
}
function orderTotal(o,withShip=true){const sub=o.items.reduce((a,it)=>{const p=prod(it.c);return a+(p&&priced(p.inr)?amount(p.inr,o.cc,o.geo||'IN')*it.q:0)},0);return sub&&withShip?sub+shipAmount(o.items,o.cc):sub}
const shipLine=o=>o.cc==='IN'?'Shipping: free within India':`Shipping by India Post Speed Post: about ${money(shipAmount(o.items,o.cc),o.cc)} (included above)`;
const orderOnReq=o=>o.items.some(it=>{const p=prod(it.c);return p&&!priced(p.inr)});
function custMsg(o){
 const lines=o.items.map((it,i)=>{const p=prod(it.c);return `${i+1}. ${it.c} ${p?p.n:''}, ${it.col}, size ${it.size}, qty ${it.q}`}).join('\n');const m=o.m;
 return `Hi Vidisha Ethnics, I've sent order request ${o.id}.\n\n${lines}\n\nEstimated total: ${totalLabel(orderTotal(o),orderOnReq(o),o.cc)}\n${shipLine(o)}\nMeasurements (${m.unit}): bust ${m.bust}, waist ${m.waist}, hip ${m.hip}${m.shoulder?', shoulder '+m.shoulder:''}${m.height?', height '+m.height:''}\n\n${o.name}, ${o.city}, ${o.country}\nPlease share the payment details.`;
}
function pageDone(id){
 const o=S.orders.find(x=>x.id===id);
 if(!o)return `<div class="done"><h1>We couldn't find that request</h1><p style="margin-top:16px"><a class="link" href="#shop">Back to the collection</a></p></div>`;
 return `<div class="done">${STEPS(3)}<img src="assets/logo/medallion.png" alt="" style="width:64px;margin:0 auto 24px"><h1>Thank you, ${esc(o.name.split(' ')[0])}. Your request is in.</h1>
 <div class="id">Request ${o.id}</div><p style="color:var(--ink2)">${!LIVE?'<b>One last step:</b> tap below to send your request to us on WhatsApp, so we receive it.':o.offline?'We couldn\'t reach our order desk just now, so please send your request on WhatsApp.':'Our team has your request. To speed things up, you can also send it on WhatsApp now.'}</p>
 <a class="btn" target="_blank" rel="noopener" href="${wa(custMsg(o))}">Send my order on WhatsApp</a>
 <div class="next"><div><span class="n">1</span><span><b>We confirm the details,</b> usually within one working day, on WhatsApp at ${esc(o.wa)}.</span></div><div><span class="n">2</span><span><b>You pay as agreed.</b> We share the final amount${o.cc!=='IN'?', including India Post shipping to '+esc(o.country)+',':''} and payment options before you pay.</span></div><div><span class="n">3</span><span><b>We make and ship your piece</b> within ${C.leadTime} of payment, with tracking.</span></div></div>
 <a class="link" href="#shop">Continue browsing</a></div>`;
}
function pageWish(){
 const list=S.wish.map(prod).filter(Boolean);
 return `<div class="wrap pagehead"><h1>Wishlist</h1><p>Saved on this device. Share it with us on WhatsApp if you'd like help choosing.</p></div>
 <div class="wrap" style="padding-top:44px;padding-bottom:110px">${list.length?`<div class="grid">${list.map(tile).join('')}</div><div style="margin-top:44px"><a class="btn ghost" target="_blank" rel="noopener" href="${wa('Hi Vidisha Ethnics, these are on my wishlist: '+list.map(p=>p.c+' '+p.n).join('; '))}">Share my wishlist on WhatsApp</a></div>`:`<div class="empty"><p>Tap the heart on any piece to save it here.</p><a class="btn" href="#shop">Explore the collection</a></div>`}</div>`;
}

function pageCraft(){
 const n=visible().filter(p=>p.craft==='Chikankari').length;
 return `<section class="wrap story-hero">
  <div>${ornament()}<h1>Chikankari</h1><p>The hand embroidery of Lucknow, and the heart of almost everything we make. Each motif is stitched by hand on a hoop, on fabrics chosen for the season.</p>
  <p style="margin-top:22px"><a class="btn" href="#shop" data-act="shopcraft" data-v="Chikankari">Shop chikankari (${n})</a></p></div>
  ${VIDEO()}
 </section>
 <section class="sec dark"><div class="wrap craftband" style="grid-template-columns:1fr 1fr">
  <div><h2>How a piece is made</h2>${PROCESS}</div>
  <figure><div class="archimg"><img src="${IMG('w006-peach-2')}" alt="Chikankari flowers on peach mul chanderi" loading="lazy"></div><figcaption>Chikankari on mul chanderi, from our frock kurta set</figcaption></figure>
 </div></section>
 <section class="sec"><div class="wrap">
  <div class="sechead"><div><h2>The fabrics we stitch on</h2><p>Each fabric changes how the embroidery looks and feels.</p></div></div>
  <div class="fabrics">${FABRICS.map(f=>`<a class="fabric" href="#shop-fabric-${slug(f.k)}"><div class="im"><img src="${IMG(f.img)}" alt="" loading="lazy"></div><h3>${f.k}</h3><span>${f.line}</span></a>`).join('')}</div>
  <div class="mosaic" style="margin-top:72px">${['chikan-yellow','chikan-sage','chikan-pink'].map(n=>`<figure><img src="${IMG(n)}" alt="Chikankari kurtas, folded" loading="lazy"></figure>`).join('')}</div>
  <p class="small" style="margin-top:14px">Small irregularities in hand embroidery are the mark of a person, not a machine.</p>
 </div></section>`;
}

function pageStory(){
 return `<section class="wrap story-hero">
  <div>${ornament()}<h1>Started at home in Bengaluru, stitched by hand in Lucknow</h1>
  <p>Vidisha Chaurasia began Vidisha Ethnics in March 2025 with a simple idea. Clothing made by hand should reach the person who wears it directly, with the care and the craft still in it.</p></div>
  ${FOUNDER(true,false)}
 </section>

 <section class="sec" style="background:var(--cream);padding:96px 0"><div class="wrap"><p class="statement">Every kurta we send out has spent days on an artisan's hoop. We want you to feel that the first time you wear it.</p></div></section>

 <div class="wrap">
 <section class="chapter"><div class="label">How it began</div><div>
  <h2>A brand built around the people who make the clothes</h2>
  <div class="body"><p>Vidisha Chaurasia started Vidisha Ethnics to bring the work of India's local artisans straight to the women who wear it, and to make sustainable, handmade clothing easy to choose.</p>
  <p>The approach is deliberately simple. We buy directly from artisan clusters, keep our range to crafts that take real skill, chikankari above all, and make each piece only when someone asks for it.</p>
  <p>What began with friends and neighbours in Bengaluru now reaches women across India and in five other countries.</p></div>
 </div></section>
 </div>

 <section class="sec dark"><div class="wrap craftband">
  ${VIDEO()}
  <div><div class="label elabel" style="color:var(--goldline)">The hands behind it</div>
  <h2 style="margin-top:12px">Chikankari, stitch by stitch</h2>
  ${PROCESS}</div>
 </div></section>

 <div class="wrap">
 <section class="chapter"><div class="label">Made for you</div><div>
  <h2>Made when you ask for it, in your size</h2>
  <div class="body"><p>Nothing here sits in a warehouse waiting for a buyer. When you send a request, we confirm your size and measurements with you on WhatsApp, and your piece is made in ${C.leadTime}.</p>
  <p>That means we don't overproduce, and your kurta is cut to the measurements you gave us. If the size still isn't right, we exchange it.</p></div>
 </div></section>

 <section class="chapter"><div class="label">Where our pieces live</div><div>
  <h2>Worn in six countries</h2>
  <div class="body"><p>Our clients wear their pieces to work, to pujas, to weddings and to Independence Day celebrations. They live in:</p></div>
  <div class="clist">${[['India','Free shipping'],['United States','Shipped with tracking'],['United Kingdom','Shipped with tracking'],['Sri Lanka','Shipped with tracking'],['Malaysia','Shipped with tracking'],['United Arab Emirates','Shipped with tracking']].map(([a,b])=>`<div>${a}<small>${b}</small></div>`).join('')}</div>
  <div class="mosaic" style="margin-top:40px">${[4,6,3,2,5,1].map(i=>`<figure><img src="${IMG('client-'+i)}" alt="A Vidisha Ethnics client" loading="lazy"></figure>`).join('')}</div>
 </div></section>

 <section class="chapter"><div class="label">What we promise</div><div>
  <div class="promises" style="grid-template-columns:1fr 1fr;gap:36px 48px">
   <div><h3>Direct from artisans</h3><p>We work with the clusters who stitch, weave and dye, with no layers in between.</p></div>
   <div><h3>Made to order</h3><p>Each piece is made for one person, so nothing is wasted.</p></div>
   <div><h3>Natural fabrics</h3><p>Mul, chanderi, kota doria and cotton that breathe in the heat.</p></div>
   <div><h3>A size that fits</h3><p>Your measurements travel with your order, and we exchange for size.</p></div>
  </div>
 </div></section>
 </div>

 <section class="sec" style="padding-top:40px"><div class="wrap">
  <div class="founder"><img src="assets/logo/medallion.png" alt="">
   <div><h3>Vidisha Chaurasia, Founder</h3><p>Questions about a piece, a size or a gift? Write to us on WhatsApp and we'll help you choose.</p>
   <p style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="#shop">Explore the collection</a><a class="btn ghost" target="_blank" rel="noopener" href="${wa('Hi Vidisha, I read your story and have a question.')}">Message us</a></p></div></div>
 </div></section>`;
}

function pageShipping(){
 return `<div class="wrap pagehead"><div class="crumbs"><a href="#">Home</a> / Shipping and exchanges</div><h1>Shipping and exchanges</h1><p>Every piece is made to order and shipped with tracking.</p></div>
 <div class="prose" style="max-width:960px">
  <table class="tbl"><thead><tr><th>Country</th><th>Prices shown in</th><th>Shipping, one kurta set</th></tr></thead><tbody>
  ${C.countries.map(k=>`<tr><td>${k.name}</td><td>${k.currency}</td><td>${k.code==='IN'?'Free':'about '+money(shipAmount([{c:'W020',q:1}],k.code),k.code)}</td></tr>`).join('')}</tbody></table>
  <p class="small">Overseas parcels go by India Post International Speed Post, with tracking. The shipping charge is India Post's rate for the weight of your parcel, plus GST, and it is added to your estimated total before you send a request. Prices for clients outside India are set separately from prices in India.</p>
  <h2>How long it takes</h2><p>We make your piece in ${C.leadTime} after payment is confirmed, then dispatch it with tracking. Delivery time after dispatch depends on your city and country; we'll share the tracking link on WhatsApp.</p>
  <h2>Paying</h2><p>There is no payment on the website. Once we've confirmed your request on WhatsApp, we share the final amount and payment options for your country.</p>
  <h2>Exchanges</h2><p>We exchange for size. Message us on WhatsApp within 7 days of delivery with your request number. The piece should be unworn, with its tags.</p>
  <h2>Returns</h2><p>Because every piece is made to order, we don't accept returns other than size exchanges.</p>
  <h2>Customs and duties</h2><p>For deliveries outside India, local import duties may apply. We'll tell you what we know for your country when we confirm your order.</p>
 </div>`;
}
function pageHelp(){
 const qa=[['How do I order?','Add pieces to your bag and send a request with your measurements. We message you on WhatsApp to confirm, share the final amount and how to pay. Once payment is received, we start making your piece.'],['Do you deliver outside India?','Yes. We deliver to the USA, the UK, Sri Lanka, Malaysia and the UAE. Choose your country at the top of the page to see prices in your currency. Shipping is by India Post Speed Post and is shown in your total before you send a request.'],['How long does it take?','Every piece is made to order, in '+C.leadTime+' after payment. Need it by a date? Add it to your request and we will tell you whether it is possible.'],['Can I change a colour or length?','Often, yes. Most pieces can be made in other colours, and we can adjust length. Mention it in your request notes.'],['Can I exchange?','We exchange for size within 7 days of delivery. The piece should be unworn, with tags.'],['How do I care for chikankari?','Hand wash cotton and mul gently in cold water, or dry clean chanderi, kota doria and festive pieces. Each product page lists its own care.'],['Why is a colour shown in another colour\'s photo?','We haven\'t photographed every colour yet. The photo shows the cut and the work, and your piece is made in the colour you choose. Ask us on WhatsApp for a picture of the fabric.']];
 return `<div class="wrap pagehead"><div class="crumbs"><a href="#">Home</a> / Questions</div><h1>Questions</h1></div>
 <div class="prose">${qa.map(([q,a],i)=>`<details class="acc" ${i===0?'open':''}><summary>${q}</summary><div class="bd">${a}</div></details>`).join('')}
 <p style="margin-top:36px"><a class="btn ghost" target="_blank" rel="noopener" href="${wa('Hi Vidisha Ethnics, I have a question.')}">Ask us on WhatsApp</a></p></div>`;
}
function pageContact(){
 return `<div class="wrap pagehead"><div class="crumbs"><a href="#">Home</a> / Contact</div><h1>Contact</h1><p>The quickest way to reach us is WhatsApp. We reply within a working day.</p></div>
 <div class="prose"><div class="steps">
  <div class="step"><h3>WhatsApp</h3><p>+91 87229 49275<br><a class="link" target="_blank" rel="noopener" href="${wa('Hi Vidisha Ethnics')}">Start a chat</a><br><a class="link" target="_blank" rel="noopener" href="${C.catalogue}">Browse our WhatsApp catalogue</a></p></div>
  <div class="step"><h3>Email</h3><p><a class="link" href="mailto:${C.email}">${esc(C.email)}</a></p></div>
  <div class="step"><h3>Instagram</h3><p><a class="link" target="_blank" rel="noopener" href="${C.instagram}">@vidishaethnic</a></p></div></div>
  <p style="margin-top:44px">Vidisha Ethnics, Bengaluru, India.</p></div>`;
}
function pagePrivacy(){
 return `<div class="wrap pagehead"><div class="crumbs"><a href="#">Home</a> / Privacy</div><h1>Privacy</h1></div>
 <div class="prose"><p>When you send an order request, we collect your name, WhatsApp number, optional email, city, country and body measurements. We use them only to make, confirm and deliver your order and to contact you about it.</p>
 <p>Your details are stored in our private order sheet, which only the Vidisha Ethnics team can open. We never sell or share them, and we never show your measurements publicly.</p>
 <p>Your bag, wishlist and fit-finder results are saved in your own browser so you don't lose them.</p>
 <p>To see, correct or delete your details, message us on WhatsApp or write to ${esc(C.email)}.</p></div>`;
}

/* ---------- admin ---------- */
async function api(action,payload,method='POST'){
 if(!LIVE)throw new Error('demo');
 if(method==='GET'){const q=new URLSearchParams(Object.assign({action},payload)).toString();const r=await fetch(C.appsScriptUrl+'?'+q);return r.json()}
 const r=await fetch(C.appsScriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},payload))});return r.json();
}
const adminOrders=()=>S.admin.live||S.orders;
function adminMsg(o){const first=o.name.replace(/^Sample: /,'').split(' ')[0];return `Hi ${first}, thank you for your order request ${o.id} with Vidisha Ethnics.\n\nTotal: ${totalLabel(orderTotal(o),orderOnReq(o),o.cc)}\n${shipLine(o)}.\nOnce we receive payment we'll start making your piece. It will be ready in ${C.leadTime}.`}
function pageAdmin(){
 const A=S.admin;
 if(!A.auth)return `<div class="admin"><div class="pin"><img src="${LOGO}" alt="Vidisha Ethnics"><h1 class="t3" style="margin-bottom:6px">Admin</h1><p class="small">${LIVE?'Enter your admin key.':'Preview mode. PIN: 2025'}</p><form data-form="pin" class="form" style="margin-top:16px"><input class="t" name="pin" type="password" aria-label="${LIVE?'Admin key':'PIN'}" placeholder="${LIVE?'Admin key':'PIN'}" style="text-align:center"><div class="err" id="pinerr" role="alert"></div><button class="btn" type="submit">Sign in</button></form><a class="link" href="#" style="display:inline-block;margin-top:18px;font-size:14px">Back to the shop</a></div></div>`;
 const top=`<div class="atop"><div class="wrap"><a class="logo" href="#"><img src="${LOGO}" alt="Vidisha Ethnics"></a><div class="tabs" role="tablist">${[['orders','Orders'],['products','Products'],['settings','Settings']].map(([k,l])=>`<button role="tab" aria-selected="${A.tab===k}" class="${A.tab===k?'on':''}" data-act="atab" data-v="${k}">${l}</button>`).join('')}</div><button class="textlink" data-act="logout">Sign out</button></div></div>`;
 let body='';
 if(A.tab==='orders'){
  const os=adminOrders().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const cnt=s=>os.filter(o=>o.status===s).length;
  const list=A.filter==='All'?os:os.filter(o=>o.status===A.filter);
  const open=os.filter(o=>!['Delivered','Cancelled'].includes(o.status));
  const sel=os.find(o=>o.id===A.sel);
  body=`<div class="kpis"><div class="kpi"><b>${cnt('New')}</b><span>New requests to contact</span></div><div class="kpi"><b>${cnt('Payment pending')}</b><span>Awaiting payment</span></div><div class="kpi"><b>${cnt('Confirmed')+cnt('In making')}</b><span>Being made</span></div><div class="kpi"><b>${inrFmt(open.reduce((a,o)=>a+o.items.reduce((x,it)=>{const p=prod(it.c);return x+(p&&priced(p.inr)?p.inr*it.q:0)},0),0))}</b><span>Open orders at India prices</span></div></div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div class="chips">${['All',...STATUSES].map(s=>`<button class="chip ${A.filter===s?'on':''}" data-act="afilter" data-v="${s}">${s}${s!=='All'?` (${cnt(s)})`:''}</button>`).join('')}</div><button class="btn ghost" style="min-height:40px;padding:0 16px" data-act="csv">Copy as CSV</button></div>
  <div class="agrid"><div><table class="atable"><thead><tr><th>Request</th><th>Customer</th><th>Items</th><th>Value</th><th>Status</th></tr></thead><tbody>${list.map(o=>`<tr class="${A.sel===o.id?'sel':''}"><td><button class="textlink" data-act="asel" data-v="${o.id}">${o.id}</button><div class="small">${new Date(o.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div></td><td>${esc(o.name)}<div class="small">${esc(o.city)}, ${esc(o.country)}</div></td><td>${o.items.map(it=>`${it.c} × ${it.q}`).join('<br>')}</td><td>${totalLabel(orderTotal(o),orderOnReq(o),o.cc).replace(' + pieces priced on request',' +')}</td><td><select class="st" data-act="astatus" data-v="${o.id}" aria-label="Status for ${o.id}">${STATUSES.map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')||`<tr><td colspan="5" class="small" style="padding:30px;text-align:center">No requests with this status.</td></tr>`}</tbody></table></div>
  <div>${sel?`<div class="apanel" style="margin-top:0"><div style="display:flex;justify-content:space-between;align-items:center"><h2 class="t3">${sel.id}</h2><span class="pill ${sel.status.split(' ')[0]}">${sel.status}</span></div><p class="small" style="margin:4px 0 14px">${new Date(sel.date).toLocaleString('en-IN')}${sel.sample?' (sample)':''}</p>
   <p style="margin:0"><b>${esc(sel.name)}</b><br>${esc(sel.wa)}${sel.email?'<br>'+esc(sel.email):''}<br>${esc(sel.city)}, ${esc(sel.country)}</p>
   <div style="margin:14px 0;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:14px">${sel.items.map(it=>{const p=prod(it.c);return `<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0"><span>${it.c} ${p?esc(p.n):''}<br><span class="small">${esc(it.col)}, size ${it.size}, qty ${it.q}</span></span><span>${p&&priced(p.inr)?money(amount(p.inr,sel.cc)*it.q,sel.cc):'On request'}</span></div>`}).join('')}</div>
   <p style="font-size:14px;margin:0 0 6px"><b>Measurements (${esc(sel.m.unit)})</b><br>Bust ${esc(sel.m.bust)||'–'}, waist ${esc(sel.m.waist)||'–'}, hip ${esc(sel.m.hip)||'–'}, shoulder ${esc(sel.m.shoulder)||'–'}, height ${esc(sel.m.height)||'–'}${sel.m.length?', length '+esc(sel.m.length):''}</p>
   ${sel.by?`<p style="font-size:14px;margin:0 0 6px"><b>Needed by</b> ${esc(sel.by)}</p>`:''}${sel.notes?`<p style="font-size:14px;margin:0 0 6px"><b>Notes</b> ${esc(sel.notes)}</p>`:''}
   <div style="display:grid;gap:8px;margin-top:16px"><a class="btn" target="_blank" rel="noopener" href="${wa(adminMsg(sel),sel.wa)}">Message customer on WhatsApp</a><button class="btn ghost" data-act="copymsg" data-v="${sel.id}">Copy payment message</button></div></div>`:`<div class="apanel" style="margin-top:0"><p class="small" style="margin:0">Select a request to see measurements, notes and a ready-made WhatsApp message.</p></div>`}</div></div>`;
 }
 if(A.tab==='products'){
  body=`<div class="apanel"><h2 class="t3">Products</h2><p class="small" style="margin:6px 0 0">Change a price or hide a piece. ${LIVE?'Changes are saved to the Products tab of your order sheet and show on the site for everyone.':'In preview mode, changes are saved in this browser only.'} To add photographs, send them to your developer or place them in assets/img.</p></div>
  <table class="atable" style="margin-top:14px"><thead><tr><th>Piece</th><th>Category</th><th>India price (₹)</th><th>Abroad (USD / GBP)</th><th>Photos</th><th>On site</th></tr></thead><tbody>${PRODUCTS().map(p=>{const n=Object.values(p.ph||{}).flat().length;return `<tr><td><b>${p.c}</b> ${esc(p.n)}<div class="small">${p.cols.length} colours</div></td><td>${p.cat}</td><td><input class="t" style="width:110px;padding:7px" inputmode="numeric" data-act="aprice" data-v="${p.c}" value="${p.inr||''}" placeholder="On request" aria-label="India price for ${p.c}"></td><td class="small">${price(p.inr,'US')}<br>${price(p.inr,'GB')}</td><td>${n?`<span class="pill Confirmed">${n} photo${n>1?'s':''}</span>`:'<span class="pill New">Needs photos</span>'}</td><td><label class="toggle"><input type="checkbox" data-act="ahide" data-v="${p.c}" ${p.hidden?'':'checked'} aria-label="Show ${p.c} on site"><i></i></label></td></tr>`}).join('')}</tbody></table>`;
 }
 if(A.tab==='settings'){
  body=`<div class="apanel" style="max-width:760px"><h2 class="t3" style="margin-bottom:14px">Settings</h2>
  <p>These live in <b>assets/js/config.js</b> so they can't be changed by accident. Current values:</p>
  <table class="tbl"><tbody><tr><td>WhatsApp number</td><td>${C.whatsapp?'+'+esc(C.whatsapp):'<span class="pill New">Not set</span>'}</td></tr><tr><td>Order sheet connection</td><td>${LIVE?'<span class="pill Confirmed">Connected</span>':'<span class="pill New">Preview mode</span>'}</td></tr><tr><td>International multiplier</td><td>${C.intlMultiplier}×</td></tr>
  ${C.countries.filter(k=>k.code!=='IN').map(k=>`<tr><td>${k.name}</td><td>₹${k.rate} per ${k.currency}. Example: ₹3,650 shows as ${price(3650,k.code)}</td></tr>`).join('')}</tbody></table>
  ${LIVE?'':'<p style="margin-top:18px"><button class="textlink" data-act="reset">Reset preview data</button></p>'}</div>`;
 }
 return `<div class="admin">${top}<div class="wrap" style="padding-bottom:80px">${A.loading?'<p class="small" style="padding:30px 0">Loading…</p>':body}</div></div>`;
}
const inrFmt=n=>'₹'+Math.round(n).toLocaleString('en-IN');

/* ---------- router ---------- */
function route(){
 const h=decodeURIComponent(location.hash.slice(1));
 if(!route.keep&&$('#drawer').classList.contains('on'))closeDrawer();
 let html='',active=h,isAdmin=false,title='';
 if(!h)html=pageHome();
 else if(h==='shop')html=pageShop({cat:'All'});
 else if(h==='shop-kurta-sets')html=pageShop({cat:'Kurta sets'}),title='Kurta sets';
 else if(h==='shop-kurtas')html=pageShop({cat:'Kurtas'}),title='Kurtas';
 else if(h==='shop-sarees')html=pageShop({cat:'Sarees'}),title='Sarees';
 else if(h==='shop-festive')html=pageShop({cat:'Festive'}),title='Festive edit';
 else if(h.startsWith('shop-fabric-')){const fb=FAB_ORDER.find(x=>slug(x)===h.slice(12));html=pageShop({fabs:fb?[fb]:[]});active='shop';title=fb||''}
 else if(h==='shop-chikankari'){html=pageShop({crafts:['Chikankari']});active='shop'}
 else if(h==='shop-new'){html=pageShop({cat:'New'});title='New'}
 else if(h.startsWith('p-')){html=pagePDP(h.slice(2));const p=prod(h.slice(2));title=p?p.n:''}
 else if(h==='fit')html=pageFit(),title='Find my size';
 else if(h==='bag')html=pageBag(),title='Your bag';
 else if(h==='request')html=pageRequest(),title='Order request';
 else if(h.startsWith('done-'))html=pageDone(h.slice(5)),title='Request received';
 else if(h==='wishlist')html=pageWish(),title='Wishlist';
 else if(h==='craft')html=pageCraft(),title='Chikankari';
 else if(h==='story')html=pageStory(),title='Our story';
 else if(h==='shipping')html=pageShipping(),title='Shipping and exchanges';
 else if(h==='help')html=pageHelp(),title='Questions';
 else if(h==='contact')html=pageContact(),title='Contact';
 else if(h==='privacy')html=pagePrivacy(),title='Privacy';
 else if(h==='admin'){html=pageAdmin();isAdmin=true;title='Admin'}
 else html=pageHome();
 $('#app').innerHTML=isAdmin?html:header(active)+`<main id="main">${html}</main>`+footer();
 document.title=(title?title+' | ':'')+'Vidisha Ethnics | Handcrafted chikankari, made to order';
 document.querySelectorAll('video').forEach(v=>{v.muted=true;const pr=v.play();if(pr&&pr.catch)pr.catch(()=>{})});
 if(!route.keep)window.scrollTo(0,0);
 route.keep=false;
}
function rerender(){route.keep=true;const y=window.scrollY;route();window.scrollTo(0,y)}
window.addEventListener('hashchange',route);

/* ---------- drawer ---------- */
let lastFocus=null;
function openDrawer(html){lastFocus=document.activeElement;const d=$('#drawer');d.innerHTML=`<button class="x" data-act="close" aria-label="Close">×</button>`+html;d.classList.add('on');d.setAttribute('aria-hidden','false');$('#scrim').classList.add('on');setTimeout(()=>{const i=d.querySelector('input,a.btn,button.btn');i&&i.focus()},350)}
function closeDrawer(){const d=$('#drawer');d.classList.remove('on');d.setAttribute('aria-hidden','true');$('#scrim').classList.remove('on');if(lastFocus&&document.contains(lastFocus))lastFocus.focus()}
$('#scrim').addEventListener('click',closeDrawer);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#drawer').classList.contains('on'))closeDrawer()});

document.addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('trioacc'))PDP.trio=e.target.open},true);
/* ---------- photo viewer ---------- */
function openZoom(src){
 let lb=$('#lb');
 if(!lb){lb=document.createElement('div');lb.id='lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Photo');
  lb.innerHTML='<button type="button" class="lbx" aria-label="Close">×</button><div class="lbin"><img alt=""></div><p class="lbh">Tap the photo to zoom in</p>';document.body.appendChild(lb);
  const im=lb.querySelector('img'),inn=lb.querySelector('.lbin');
  const close=()=>{lb.classList.remove('on');im.classList.remove('z');document.body.style.overflow=''};
  lb.querySelector('.lbx').addEventListener('click',close);
  lb.addEventListener('click',e=>{if(e.target===lb||e.target===inn)close()});
  im.addEventListener('click',e=>{const r=im.getBoundingClientRect();im.style.transformOrigin=`${(e.clientX-r.left)/r.width*100}% ${(e.clientY-r.top)/r.height*100}%`;im.classList.toggle('z')});
  im.addEventListener('mousemove',e=>{if(!im.classList.contains('z'))return;const r=im.getBoundingClientRect();im.style.transformOrigin=`${(e.clientX-r.left)/r.width*100}% ${(e.clientY-r.top)/r.height*100}%`});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lb.classList.contains('on'))close()});
 }
 lb.querySelector('img').src=src;lb.classList.add('on');document.body.style.overflow='hidden';lb.querySelector('.lbx').focus();
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-act]');if(!t)return;
 const a=t.dataset.act,v=t.dataset.v;
 if(['country','fcat','fcraft','ffab','fcol','fprice','fsort','astatus','aprice','ahide','reqcountry'].includes(a))return;
 if(a==='close-nav'){closeDrawer();return}
 if(t.tagName==='A'&&a!=='shopcraft'&&a!=='pickcol')return;
 switch(a){
  case 'share':{const p=prod(v);const u=shareUrl(v);if(navigator.share){navigator.share({title:p.n+' | Vidisha Ethnics',url:u}).catch(()=>{})}else{try{navigator.clipboard.writeText(u).then(()=>toast('Link copied'),()=>toast(u))}catch(e){toast(u)}}break}
  case 'zoom':{openZoom(v);break}
  case 'sizeguide':{const d=$('#sizeacc');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'})}break}
  case 'szu':{PDP.u=v;rerender();const d=$('#sizeacc');if(d)d.open=true;break}
  case 'snd':{const vd=t.parentElement.querySelector('video');if(!vd)break;const on=vd.muted;vd.muted=!on;if(on){vd.currentTime=0;vd.play().catch(()=>{})}t.textContent=on?'Mute':'Play with sound';t.setAttribute('aria-pressed',on);break}
  case 'menu':{const m=$('#mnav');m.classList.toggle('on');t.setAttribute('aria-expanded',m.classList.contains('on'));break}
  case 'wish':{const c=t.dataset.c,i=S.wish.indexOf(c);if(i>=0){S.wish.splice(i,1);toast('Removed from your wishlist')}else{S.wish.push(c);toast('Saved to your wishlist')}save();rerender();break}
  case 'ftoggle':$('#filters').classList.toggle('on');break;
  case 'fclear':S.f={cat:'All',crafts:[],fabs:[],cols:[],price:'all',sort:'featured'};if(location.hash==='#shop')rerender();else location.hash='shop';break;
  case 'shopcraft':e.preventDefault();location.hash='shop-chikankari';break;
  case 'pickcol':e.preventDefault();PDP={c:t.dataset.c,col:v,size:null,q:1};location.hash='p-'+t.dataset.c;break;
  case 'col':PDP.col=v;rerender();break;
  case 'size':PDP.size=v;rerender();break;
  case 'q-':PDP.q=Math.max(1,PDP.q-1);rerender();break;
  case 'q+':PDP.q=Math.min(10,PDP.q+1);rerender();break;
  case 'add':{if(!PDP.size){const h=$('#sizehint');if(h){h.textContent='Please choose a size, or use Find my size.';h.scrollIntoView({block:'center',behavior:'smooth'})}return}
   const ex=S.bag.find(i=>i.c===PDP.c&&i.col===PDP.col&&i.size===PDP.size);if(ex)ex.q+=PDP.q;else S.bag.push({c:PDP.c,col:PDP.col,size:PDP.size,q:PDP.q});save();rerender();
   const p=prod(PDP.c);openDrawer(`<h2>Added to your bag</h2><div class="line" style="grid-template-columns:96px 1fr"><div class="th">${thumb(p,PDP.col)}</div><div><b class="t4">${esc(p.n)}</b><div class="small">${esc(PDP.col)}, size ${PDP.size==='Free'?'free':PDP.size}, qty ${PDP.q}</div><div style="margin-top:6px">${price(p.inr*PDP.q)}</div></div></div><div style="display:grid;gap:10px;margin-top:24px"><a class="btn" href="#request" data-act="close-nav">Send order request</a><a class="btn ghost" href="#bag" data-act="close-nav">View bag</a><button class="textlink" data-act="close" style="justify-self:start;margin-top:8px">Keep browsing</button></div>`);break}
  case 'openfit':openDrawer(`<h2>Find my size</h2><p class="small" style="margin-bottom:18px">We'll suggest a size and keep your measurements for your request.</p>${fitForm('drawer')}<p class="small" style="margin-top:18px"><a class="link" href="#fit" data-act="close-nav">See the size chart</a></p>`);break;
  case 'close':closeDrawer();break;
  case 'unit':{const form=t.closest('form');form.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b===t));const hid=form.querySelector('[name=unit]');if(hid)hid.value=v;form.dataset.unit=v;S.fit=Object.assign({},S.fit||{},{unit:v});save();break}
  case 'bq-':{const i=+t.dataset.i;S.bag[i].q=Math.max(1,S.bag[i].q-1);save();rerender();break}
  case 'bq+':{const i=+t.dataset.i;S.bag[i].q=Math.min(10,S.bag[i].q+1);save();rerender();break}
  case 'brm':{S.bag.splice(+t.dataset.i,1);save();rerender();toast('Removed from your bag');break}
  case 'atab':S.admin.tab=v;rerender();break;
  case 'afilter':S.admin.filter=v;rerender();break;
  case 'asel':S.admin.sel=v;rerender();break;
  case 'logout':S.admin.auth=false;S.admin.key='';S.admin.live=null;rerender();break;
  case 'csv':{const rows=[['Request','Date','Name','WhatsApp','Email','City','Country','Items','Value','Currency','Bust','Waist','Hip','Shoulder','Height','Unit','Needed by','Notes','Status']].concat(adminOrders().map(o=>[o.id,o.date,o.name,o.wa,o.email,o.city,o.country,o.items.map(it=>`${it.c} ${it.col} ${it.size} x${it.q}`).join('; '),orderTotal(o),cty(o.cc).currency,o.m.bust,o.m.waist,o.m.hip,o.m.shoulder,o.m.height,o.m.unit,o.by,o.notes,o.status]));
   const csv=rows.map(r=>r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\n');
   navigator.clipboard.writeText(csv).then(()=>toast('Copied. Paste into a spreadsheet.'),()=>toast('Your browser blocked copying'));break}
  case 'copymsg':{const o=adminOrders().find(x=>x.id===v);navigator.clipboard.writeText(adminMsg(o)).then(()=>toast('Message copied'),()=>toast('Your browser blocked copying'));break}
  case 'reset':{try{['bag','wish','fit','over','orders','country'].forEach(k=>localStorage.removeItem('ve_'+k))}catch(err){}location.reload();break}
 }
});
document.addEventListener('change',async e=>{
 const t=e.target,a=t.dataset.act;if(!a)return;
 if(a==='country'){S.country=t.value;store.set('picked',1);save();rerender();toast(`Showing prices for ${cty().name}`)}
 if(a==='reqcountry'){S.country=t.value;store.set('picked',1);save();const form=t.closest('form');const keep=Object.fromEntries(new FormData(form).entries());rerender();const f2=document.querySelector('form[data-form=req]');if(f2)Object.entries(keep).forEach(([k,v])=>{const el=f2.elements[k];if(el&&el.type!=='checkbox'&&k!=='country')el.value=v})}
 if(a==='fcat'){S.f.cat=t.value;rerender()}
 if(a==='fcol'){const c=t.value;S.f.cols=t.checked?[...S.f.cols,c]:S.f.cols.filter(x=>x!==c);rerender()}
 if(a==='fcraft'){const c=t.value;S.f.crafts=t.checked?[...S.f.crafts,c]:S.f.crafts.filter(x=>x!==c);rerender()}
 if(a==='ffab'){const c=t.value;S.f.fabs=t.checked?[...S.f.fabs,c]:S.f.fabs.filter(x=>x!==c);rerender()}
 if(a==='fprice'){S.f.price=t.value;rerender()}
 if(a==='fsort'){S.f.sort=t.value;rerender()}
 if(a==='astatus'){const o=adminOrders().find(x=>x.id===t.dataset.v);const prev=o.status;o.status=t.value;
  if(LIVE){try{const r=await api('status',{key:S.admin.key,id:o.id,status:t.value});if(!r.ok)throw 0}catch(err){o.status=prev;rerender();toast('Could not save. Check your connection.');return}}else save();
  rerender();toast(`${o.id} marked ${t.value.toLowerCase()}`)}
 if(a==='aprice'||a==='ahide'){const c=t.dataset.v;const patch=a==='aprice'?{inr:parseInt(t.value.replace(/[^0-9]/g,''))}:{hidden:!t.checked};if(a==='aprice'&&!(patch.inr>0)){toast('Enter a price in rupees');return}
  S.over[c]=Object.assign({},S.over[c],patch);
  if(LIVE){try{const r=await api('product',Object.assign({key:S.admin.key,code:c},S.over[c]));if(!r.ok)throw 0}catch(err){toast('Could not save. Check your connection.');return}}else save();
  rerender();toast(a==='aprice'?'Price updated':(t.checked?'Now showing on the site':'Hidden from the site'))}
});
document.addEventListener('submit',async e=>{
 const form=e.target,k=form.dataset.form;if(!k)return;e.preventDefault();
 const fd=Object.fromEntries(new FormData(form).entries());
 if(k==='fit'){
  const unit=form.dataset.unit||'in',err=form.querySelector('[data-err]');
  const B=parseFloat(fd.bust),H=parseFloat(fd.hip),lim=unit==='in'?[24,70]:[60,180];
  if(!(B>=lim[0]&&B<=lim[1])||!(H>=lim[0]&&H<=lim[1])){err.textContent=`Enter your bust and hip in ${unit==='in'?'inches, for example 36':'centimetres, for example 91'}.`;return}
  err.textContent='';
  const size=calcSize(fd.bust,fd.hip,unit);
  S.fit={unit,bust:fd.bust,waist:fd.waist,hip:fd.hip,height:fd.height,size};save();
  if(form.dataset.ctx==='drawer'&&size){PDP.size=size;rerender();form.querySelector('[data-res]').innerHTML=fitResult(S.fit)+`<button class="btn wide" style="margin-top:12px" data-act="close">Use size ${size}</button>`}
  else{form.querySelector('[data-res]').innerHTML=fitResult(S.fit);document.querySelectorAll('.tbl tbody tr').forEach((tr,i)=>tr.classList.toggle('hl',SIZES[i].s===size))}
  return;
 }
 if(k==='req'){
  const err=$('#reqerr'),miss=[];
  if(!fd.name.trim())miss.push('your name');
  if(fd.wa.replace(/[^0-9]/g,'').length<8)miss.push('a WhatsApp number with country code');
  if(!fd.city.trim())miss.push('your city');
  if(!fd.bust||!fd.waist||!fd.hip)miss.push('bust, waist and hip');
  if(miss.length){err.textContent='Please add '+miss.join(', ')+'.';err.scrollIntoView({block:'center',behavior:'smooth'});return}
  const d=new Date();const id='VE-'+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'-'+String(Math.floor(100+Math.random()*900));
  const k2=cty(fd.country);
  const o={id,date:d.toISOString(),name:fd.name.trim(),wa:fd.wa.trim(),email:fd.email.trim(),city:fd.city.trim(),country:k2.name,cc:k2.code,geo:S.geo,items:S.bag.map(x=>Object.assign({},x)),m:{unit:fd.unit,bust:fd.bust,waist:fd.waist,hip:fd.hip,shoulder:fd.shoulder,height:fd.height,length:fd.length},by:fd.by,notes:fd.notes.trim(),consent:true,status:'New'};
  o.total=orderTotal(o);o.currency=k2.currency;
  o.lines=o.items.map(it=>{const p=prod(it.c);return {code:it.c,name:p?p.n:'',colour:it.col,size:it.size,qty:it.q,unit:p?amount(p.inr,o.cc):null}});o.onRequest=orderOnReq(o);
  const btn=$('#sendbtn');btn.disabled=true;btn.textContent='Sending…';
  if(LIVE){try{const r=await api('order',{order:o});if(!r.ok)throw 0}catch(er){o.offline=true}}
  S.orders.push(o);S.bag=[];S.fit=Object.assign({},S.fit||{},{unit:fd.unit,bust:fd.bust,waist:fd.waist,hip:fd.hip,height:fd.height});save();
  location.hash='done-'+id;return;
 }
 if(k==='pin'){
  if(LIVE){S.admin.loading=true;S.admin.auth=true;S.admin.key=fd.pin;rerender();try{const r=await api('orders',{key:fd.pin},'GET');if(!r.ok)throw 0;S.admin.live=r.orders}catch(er){S.admin.auth=false;S.admin.loading=false;rerender();const el=$('#pinerr');if(el)el.textContent='That key did not work, or the order sheet could not be reached.';return}S.admin.loading=false;rerender();return}
  if(fd.pin==='2025'){S.admin.auth=true;rerender()}else{$('#pinerr').textContent='That PIN is incorrect.'}return;
 }
});

/* ---------- blurred previews while photos load ---------- */
const LQ=window.VE_LQIP||{};
function blurUp(img){if(img.dataset.lq)return;img.dataset.lq=1;const m=(img.getAttribute('src')||'').match(/assets\/img\/([\w-]+)\.webp$/);if(!m||!LQ[m[1]]||(img.complete&&img.naturalWidth))return;
 img.style.backgroundImage=`url("${LQ[m[1]]}")`;img.classList.add('lq');const done=()=>{img.classList.remove('lq');img.style.backgroundImage=''};img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true})}
function blurAll(root){(root||document).querySelectorAll('img').forEach(blurUp)}
try{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.tagName==='IMG')blurUp(n);else if(n.querySelectorAll)blurAll(n)}}).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}

/* ---------- WhatsApp help ---------- */
function helpCtx(){const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('p-')){const p=prod(PDP.c);if(p&&!p.hidden)return p}return null}
function helpItems(){
 const p=helpCtx(), k=cty(), place=k.code==='IN'?'my city in India':k.name;
 const about=p?` ${p.c}, ${p.n}${PDP.col?' in '+PDP.col:''}`:'';
 const link=p?`\n${shareUrl(p.c)}`:'';
 const last=(S.orders||[]).filter(o=>!o.sample).slice(-1)[0];
 const items=[];
 items.push(['size','Help me choose my size',`Hi Vidisha Ethnics, could you help me choose my size${p?' for'+about:''}?\nMy bust, waist and hip in inches are: ${link}`]);
 if(p&&p.cols.length>1)items.push(['colour','Can I get this in another colour?',`Hi Vidisha Ethnics, I'm looking at${about}. Can I see it in another colour? I'd like: ${link}`]);
 if(p&&!priced(p.inr))items.push(['price','What is the price of this piece?',`Hi Vidisha Ethnics, could you share the price of${about} for delivery to ${k.name}?${link}`]);
 if(p&&p.ph&&!(p.ph[PDP.col]))items.push(['photo','Send me a photo of this colour',`Hi Vidisha Ethnics, could you send a photo of${about}? It isn't on the website yet.${link}`]);
 items.push(['ship',`Delivery time to ${k.code==='IN'?'my city':k.name}`,`Hi Vidisha Ethnics, how long would delivery to ${place} take${p?' for'+about:''}? I'd like it by: ${link}`]);
 items.push(['order',last?`About my request ${last.id}`:'A question about my order',last?`Hi Vidisha Ethnics, I have a question about my order request ${last.id}: `:'Hi Vidisha Ethnics, I have a question about my order: ']);
 items.push(['other','Something else',`Hi Vidisha Ethnics, ${p?"I'm looking at"+about+'. ':''}`]);
 return items;
}
function helpRender(){
 const box=$('#help .hbody');if(!box)return;const p=helpCtx();
 box.innerHTML=`<p class="hhead">Ask us on WhatsApp</p><p class="hsub">${p?`About ${esc(p.n)}${PDP.col?', '+esc(PDP.col):''}. `:''}Pick a question and we'll reply to you personally.</p>
 <ul>${helpItems().map(([id,label])=>`<li><button type="button" data-help="${id}">${esc(label)}</button></li>`).join('')}</ul>
 <p class="hfoot">Opens WhatsApp with your message ready to send to +91 87229 49275.</p>`;
}
function helpInit(){
 if($('#help'))return;
 const el=document.createElement('div');el.id='help';
 el.innerHTML=`<div class="hpanel" id="helppanel" role="dialog" aria-label="Ask us on WhatsApp" hidden><button type="button" class="hx" aria-label="Close">×</button><div class="hbody"></div></div>
 <button type="button" class="hbtn" aria-expanded="false" aria-controls="helppanel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v10H9l-5 4v-14z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg><span>Need help?</span></button>`;
 document.body.appendChild(el);
 const btn=el.querySelector('.hbtn'),panel=el.querySelector('.hpanel');
 const close=()=>{panel.hidden=true;btn.setAttribute('aria-expanded','false');el.classList.remove('open')};
 btn.addEventListener('click',()=>{if(!panel.hidden){close();return}helpRender();panel.hidden=false;el.classList.add('open');btn.setAttribute('aria-expanded','true');const f=panel.querySelector('[data-help]');if(f)f.focus()});
 el.querySelector('.hx').addEventListener('click',()=>{close();btn.focus()});
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-help]');if(!b)return;const it=helpItems().find(x=>x[0]===b.dataset.help);if(!it)return;window.open(wa(it[2]),'_blank','noopener');close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();btn.focus()}});
 document.addEventListener('click',e=>{if(!panel.hidden&&!el.contains(e.target))close()});
}
function helpReveal(){const el=$('#help');if(el)el.classList.toggle('shown',location.hash.length>1||window.scrollY>window.innerHeight*0.6||!!el.querySelector('.hpanel:not([hidden])'))}
window.addEventListener('scroll',helpReveal,{passive:true});
function helpSync(){const el=$('#help');if(!el)return;const h=location.hash.slice(1);el.classList.toggle('gone',h==='admin'||h==='request'||h.startsWith('done-')||h.startsWith('p-'));helpReveal();const panel=el.querySelector('.hpanel');if(panel&&!panel.hidden)helpRender()}

/* ---------- boot ---------- */
async function geoLookup(){
 const tries=[['https://get.geojs.io/v1/ip/country.json',j=>j.country],['https://ipapi.co/json/',j=>j.country_code]];
 for(const [u,pick] of tries){try{const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),3500);const r=await fetch(u,{signal:ctl.signal});clearTimeout(tm);if(r.ok){const c=pick(await r.json());if(c&&/^[A-Z]{2}$/.test(c))return c}}catch(e){}}
 return null;
}
async function boot(){
 /* A product page at /p/CODE/ (the version Google reads) hands over to the full site. */
 const pm=location.pathname.match(/^\/p\/([A-Z]\d{3})\/?$/);
 if(pm){try{history.replaceState(null,'','/'+(location.hash.length>1?location.hash:'#p-'+pm[1]))}catch(e){location.hash='p-'+pm[1]}}
 route();helpInit();helpSync();window.addEventListener('hashchange',()=>setTimeout(helpSync,0));
 const cached=store.get('geo',null);
 geoLookup().then(g=>{if(!g)return;store.set('geo',g);const changed=g!==S.geo;S.geo=g;
  if(!store.get('picked',0)){const d=defaultCountry(g);if(d!==S.country){S.country=d;save();rerender();return}}
  if(changed)rerender()});
 if(LIVE){try{const r=await api('catalog',{},'GET');if(r&&r.ok&&r.overrides){S.over=r.overrides;rerender()}}catch(e){}}
}
boot();
})();
