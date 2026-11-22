// Builds a real page for every product at /p/CODE/ (readable by Google, with WhatsApp previews),
// plus sitemap.xml and robots.txt. When a visitor opens one, the site's app takes over.
// Run from the site folder:  node tools/build_share.js .
// Then make the preview photos:  python3 tools/build_og.py
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || '.');
const BASE = 'https://vidishaethnics.com';
global.window = {};
require(path.join(root, 'assets/js/config.js'));
require(path.join(root, 'assets/js/catalog.js'));
try { require(path.join(root, 'assets/js/reviews.js')); } catch (e) {}
const REV = (window.VE_REVIEWS || []).filter(r => r && r.c && +r.rating >= 1 && +r.rating <= 5 && String(r.text || '').trim());
const P = window.VE_PRODUCTS, C = window.VE_CONFIG, SIZES = window.VE_SIZES, CARE = window.VE_CARE || {};
const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const fam = p => { const f = p.fab.toLowerCase(); if (f.includes('request')) return null; if (f.includes('kota')) return 'Kota doria'; if (f.includes('chanderi')) return 'Chanderi'; if (f.includes('mul') || f.includes('muslin')) return 'Mul and muslin'; if (f.includes('tissue') || f.includes('silk')) return 'Silk and tissue'; if (f.includes('rayon') || f.includes('viscose') || f.includes('modal')) return 'Viscose and rayon'; return 'Cotton'; };
const priced = v => typeof v === 'number' && v > 0;
const inr = v => '₹' + v.toLocaleString('en-IN');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const catHash = p => p.cat === 'Sarees' ? 'sarees' : p.cat === 'Kurtas' ? 'kurtas' : 'kurta-sets';

const head = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fontLinks = (head.match(/<link rel="preload" href="assets\/fonts[^>]*>/g) || []).join('\n');
const scripts = (head.match(/<script src="assets\/js\/[^"]+"><\/script>/g) || []).join('\n');

fs.mkdirSync(path.join(root, 'assets/og'), { recursive: true });
const ogJobs = [], urls = [`${BASE}/`];

for (const p of P) {
  if (p.hidden) continue;
  if (!C.showUnphotographed && !(p.ph && Object.keys(p.ph).length)) continue;
  const lead = Object.keys(p.ph || {})[0];
  const photos = lead ? p.ph[lead] : [];
  const allPhotos = Object.entries(p.ph || {}).flatMap(([c, l]) => l.map(n => [c, n]));
  const url = `${BASE}/p/${p.c}/`;
  const g = fam(p);
  const craft = p.craft === 'Chikankari' ? 'Hand-embroidered Lucknow chikankari' : p.craft;
  const desc = `${p.n} in ${p.fab.toLowerCase()}. ${p.d} Made to order in ${C.leadTime}${priced(p.inr) ? ', ' + inr(p.inr) + ' in India' : ''}.`.slice(0, 300);
  const metaDesc = `${p.d} ${priced(p.inr) ? inr(p.inr) + ' in India. ' : ''}Made to order in your size.`.slice(0, 158);
  const sizes = p.type === 'saree' ? 'Free size' : (p.sizes ? p.sizes : SIZES.filter(z => +z.s <= 46).map(z => z.s)).join(', ');
  if (photos.length) ogJobs.push([path.join(root, 'assets/img', photos[0] + '.webp'), path.join(root, 'assets/og', p.c + '.jpg')]);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.n, sku: p.c, description: desc,
    brand: { '@type': 'Brand', name: 'Vidisha Ethnics' },
    image: allPhotos.map(([, n]) => `${BASE}/assets/img/${n}.webp`),
    material: p.fab, color: p.cols.join(', '), category: p.cat,
    ...(() => { const l = REV.filter(r => r.c === p.c); if (!l.length) return {}; const avg = l.reduce((a, r) => a + (+r.rating), 0) / l.length; return { aggregateRating: { '@type': 'AggregateRating', ratingValue: Math.round(avg * 10) / 10, reviewCount: l.length, bestRating: 5, worstRating: 1 }, review: l.slice(0, 10).map(r => ({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: +r.rating, bestRating: 5 }, author: { '@type': 'Person', name: r.name || 'Client' }, reviewBody: r.text, ...(r.date ? { datePublished: r.date } : {}) })) }; })(),
    ...(priced(p.inr) ? { offers: { '@type': 'Offer', url, priceCurrency: 'INR', price: p.inr, availability: 'https://schema.org/MadeToOrder', itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: 'Vidisha Ethnics' } } } : {})
  };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
    { '@type': 'ListItem', position: 2, name: p.cat, item: `${BASE}/#shop-${catHash(p)}` },
    { '@type': 'ListItem', position: 3, name: p.n, item: url }] };
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="/">
<title>${esc(p.n)} | ${esc(g ? g + ' ' : '')}${p.craft === 'Chikankari' ? 'chikankari' : esc(p.craft.toLowerCase())} | Vidisha Ethnics</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#FFFFFF">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Vidisha Ethnics">
<meta property="og:title" content="${esc(p.n)} | Vidisha Ethnics">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${url}">
${photos.length ? `<meta property="og:image" content="${BASE}/assets/og/${p.c}.jpg">\n<meta property="og:image:width" content="600">\n<meta property="og:image:height" content="800">` : `<meta property="og:image" content="${BASE}/assets/og/home.jpg">`}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="assets/logo/favicon.png">
${fontLinks}
<link rel="stylesheet" href="assets/css/site.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>
</head>
<body>
<div id="app">
<header class="site"><div class="wrap hbar"><span></span><a class="logo" href="/"><img src="assets/logo/wordmark.png" alt="Vidisha Ethnics" width="172" height="61"></a><span></span></div></header>
<main class="wrap">
<nav class="crumbs" style="padding-top:26px" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/#shop-${catHash(p)}">${esc(p.cat)}</a> / ${esc(p.n)}</nav>
<div class="pdp">
 <div class="gallery">${photos.map((n, i) => `<figure class="${i === 0 ? 'lead' : ''}"><img src="assets/img/${n}.webp" alt="${esc(p.n)} in ${esc(lead)}, photo ${i + 1}"${i ? ' loading="lazy"' : ''}></figure>`).join('')}</div>
 <div class="info">
  <div class="code">${p.c}, ${esc(craft.toLowerCase())}</div>
  <h1>${esc(p.n)}</h1>
  <div class="price">${priced(p.inr) ? inr(p.inr) + '<small>Price for delivery in India. Free shipping within India.</small>' : 'Price on request<small>We confirm the price on WhatsApp.</small>'}</div>
  ${p.buyers >= 5 ? `<p style="margin-top:14px;font-size:15px"><b style="font-weight:500">Ordered by ${p.buyers >= 30 ? Math.floor(p.buyers / 10) * 10 + '+' : p.buyers >= 10 ? Math.floor(p.buyers / 5) * 5 + '+' : p.buyers} clients</b>${p.places && p.places.length > 1 ? `. Worn in ${esc(p.places.slice(0, -1).join(', ') + ' and ' + p.places[p.places.length - 1])}.` : ''}</p>` : ''}
  <p style="color:var(--ink2);margin-top:18px">${esc(p.d)}</p>
  <table class="tbl" style="margin-top:22px"><tbody>
   <tr><td>Fabric</td><td>${esc(p.fab)}</td></tr>
   <tr><td>Work</td><td>${esc(craft)}</td></tr>
   <tr><td>Included</td><td>${esc(p.inc)}</td></tr>
   <tr><td>Colours</td><td>${esc(p.cols.join(', '))}</td></tr>
   <tr><td>Sizes</td><td>${esc(sizes)}</td></tr>
   <tr><td>Made to order</td><td>Ready in ${esc(C.leadTime)}, then shipped with tracking</td></tr>
   <tr><td>Delivery</td><td>India, the USA, the UK, Sri Lanka, Malaysia and the UAE</td></tr>
  </tbody></table>
  <p style="margin-top:28px"><a class="btn wide" href="/#p-${p.c}">Choose your colour and size</a></p>
 </div>
</div>
</main>
</div>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Panel"></aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
${scripts}
</body>
</html>
`;
  const dir = path.join(root, 'p', p.c);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  urls.push(url);
}
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(root, 'tools', 'og_jobs.json'), JSON.stringify(ogJobs.map(([a, b]) => [path.relative(root, a), path.relative(root, b)])));
console.log('product pages', urls.length - 1, 'preview photos', ogJobs.length);
