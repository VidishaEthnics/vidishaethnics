# Vidisha Ethnics website

A static website: plain HTML, CSS and JavaScript with no build step. It runs on any static host, such as Netlify, Vercel, Cloudflare Pages or GitHub Pages. Order requests go to a Google Sheet through a small Google Apps Script.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The page shell, metadata and fonts |
| `assets/css/site.css` | All styles. Brand colours are at the top, sampled from the logo. |
| `assets/js/config.js` | **Settings to edit:** WhatsApp number, email, order-sheet URL, countries, exchange rates, international multiplier |
| `assets/js/catalog.js` | **Products:** names, prices, colours, photos, descriptions |
| `assets/js/app.js` | Storefront, order request flow and admin |
| `assets/img/` | Product, client and craft images (WebP) and the artisan video loop |
| `assets/logo/` | The real logo, cut out from the logo artwork: wordmark, light version, lockup, medallion, ornament, favicon |
| `apps-script/Code.gs` | The order desk that runs in Google Sheets |

## Go live

1. **Order sheet.** Follow the steps at the top of `apps-script/Code.gs`. Copy the web app URL it gives you.
2. **Settings.** In `assets/js/config.js`, set `whatsapp` (digits only, with country code), `email` and `appsScriptUrl`.
3. **Host.** Drag this folder into Netlify (or connect the repo to Vercel). Then point `vidishaethnics.com` at it from your domain registrar, using the DNS records the host gives you.
4. **Test.** Send a test request from a phone. Check that it appears in the Orders tab, that the email arrives, and that it shows in `/#admin` when you sign in with your ADMIN_KEY.

Until `appsScriptUrl` is set, the site runs in preview mode. Requests and admin changes stay in the visitor's own browser, and a thin bar at the top says so.

## Everyday changes

- **Price or hide a piece:** sign in to `/#admin`, then go to Products. When live, this saves to the Products tab of the sheet.
- **Change an order's status:** in admin, or straight in the Orders tab of the sheet (it has a dropdown).
- **Add photos:** export at 1080 × 1440 px (3:4) as WebP or JPG and put them in `assets/img/`. Then add the file names (without the extension) under `ph` for that colour in `catalog.js`, for example `ph:{'Peach':['w006-peach-1','w006-peach-2']}`. For new shoots, aim for at least 1600 px on the long side.
- **Exchange rates:** update `rate` in `config.js` once a month. The rate is rupees per one unit of the foreign currency.

## Image rules (so nothing pixelates)

- Product images are shown at no more than about 540 px wide, so a 1080 px file is sharp on retina screens.
- The current images come from Instagram videos. Each one is the sharpest frame in its clip, lightly denoised, upscaled 1.5× and sharpened. Replace them with shoot photos as they arrive.
- Never stretch an image across the full page width unless it is at least 2400 px wide.
