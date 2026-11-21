/**
 * Vidisha Ethnics order desk (Google Apps Script).
 *
 * What it does
 *  - Receives order requests from the website and adds one row per request to the "Orders" tab.
 *  - Emails a copy to NOTIFY_EMAIL.
 *  - Optionally sends a WhatsApp alert through the WhatsApp Business Cloud API.
 *  - Lets the website admin read orders, change status, and change product price or visibility.
 *  - Receives client reviews into the "Reviews" tab. Tick "Approved" on a row and it appears on the website.
 *
 * Setup (about 10 minutes)
 *  1. Create a Google Sheet called "Vidisha Ethnics orders". Extensions > Apps Script. Paste this file.
 *  2. Project Settings > Script properties. Add:
 *       ADMIN_KEY      a long private passphrase for the website admin
 *       NOTIFY_EMAIL   where new-order emails go
 *     Optional, for WhatsApp alerts (needs an approved Meta template):
 *       WA_TOKEN, WA_PHONE_ID, WA_TO (digits with country code), WA_TEMPLATE, GRAPH_VERSION (e.g. v21.0)
 *  3. Run setup() once from the editor and accept the permissions.
 *  4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *  5. Copy the web app URL into assets/js/config.js as appsScriptUrl, and redeploy the website.
 */

const ORDER_HEADERS = ['Request','Received','Status','Name','WhatsApp','Email','City','Country','Currency','Estimated total',
  'Items','Bust','Waist','Hip','Shoulder','Height','Kurta length','Unit','Needed by','Notes','WhatsApp consent','Order JSON'];
const PRODUCT_HEADERS = ['Code','India price','Hidden','Updated'];
const REVIEW_HEADERS = ['Received','Approved','Code','Rating','Review','Name','City','Colour','Size','Request','WhatsApp','Photo link'];
const STATUSES = ['New','Payment pending','Confirmed','In making','Shipped','Delivered','Cancelled'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let o = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
  if (o.getLastRow() === 0) o.appendRow(ORDER_HEADERS);
  o.setFrozenRows(1);
  o.getRange(1, 1, 1, ORDER_HEADERS.length).setFontWeight('bold').setBackground('#F8E5D7');
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  o.getRange(2, 3, 2000, 1).setDataValidation(rule);
  o.hideColumns(ORDER_HEADERS.length);
  let p = ss.getSheetByName('Products') || ss.insertSheet('Products');
  if (p.getLastRow() === 0) p.appendRow(PRODUCT_HEADERS);
  p.setFrozenRows(1);
  p.getRange(1, 1, 1, PRODUCT_HEADERS.length).setFontWeight('bold').setBackground('#F8E5D7');
  let r = ss.getSheetByName('Reviews') || ss.insertSheet('Reviews');
  if (r.getLastRow() === 0) r.appendRow(REVIEW_HEADERS);
  r.setFrozenRows(1);
  r.getRange(1, 1, 1, REVIEW_HEADERS.length).setFontWeight('bold').setBackground('#F8E5D7');
  r.getRange(2, 2, 2000, 1).insertCheckboxes();
}

const props = () => PropertiesService.getScriptProperties();
const json = obj => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
const authed = key => key && key === props().getProperty('ADMIN_KEY');

function doGet(e) {
  const a = (e.parameter && e.parameter.action) || '';
  if (a === 'catalog') return json({ ok: true, overrides: readOverrides(), reviews: readReviews() });
  if (a === 'orders') {
    if (!authed(e.parameter.key)) return json({ ok: false, error: 'unauthorised' });
    return json({ ok: true, orders: readOrders() });
  }
  return json({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'bad json' }); }
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (body.action === 'order') return json(saveOrder(body.order));
    if (body.action === 'review') return json(saveReview(body.review));
    if (!authed(body.key)) return json({ ok: false, error: 'unauthorised' });
    if (body.action === 'status') return json(setStatus(body.id, body.status));
    if (body.action === 'product') return json(setProduct(body.code, body.inr, body.hidden));
    return json({ ok: false, error: 'unknown action' });
  } finally { lock.releaseLock(); }
}

function saveOrder(o) {
  if (!o || !o.id || !o.name || !o.wa) return { ok: false, error: 'missing fields' };
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const items = (o.lines || []).map(l => `${l.code} ${l.name}, ${l.colour}, size ${l.size}, qty ${l.qty}`).join('\n');
  const m = o.m || {};
  const clean = v => String(v == null ? '' : v).replace(/^[=+\-@]/, "'$&").slice(0, 2000); // block formula injection
  sh.appendRow([o.id, new Date(), 'New', clean(o.name), clean(o.wa), clean(o.email), clean(o.city), clean(o.country), o.currency,
    o.total, clean(items), clean(m.bust), clean(m.waist), clean(m.hip), clean(m.shoulder), clean(m.height), clean(m.length), m.unit,
    clean(o.by), clean(o.notes), o.consent ? 'Yes' : 'No', JSON.stringify(o).slice(0, 45000)]);
  notifyEmail(o, items);
  notifyWhatsApp(o);
  return { ok: true, id: o.id };
}

function notifyEmail(o, items) {
  const to = props().getProperty('NOTIFY_EMAIL'); if (!to) return;
  const m = o.m || {};
  MailApp.sendEmail({
    to: to,
    subject: `New order request ${o.id}: ${o.name}, ${o.city}, ${o.country}`,
    body: `${o.name}\nWhatsApp: ${o.wa}\nEmail: ${o.email || '-'}\n${o.city}, ${o.country}\n\n${items}\n\nEstimated total: ${o.currency} ${o.total}\n` +
      `Measurements (${m.unit}): bust ${m.bust}, waist ${m.waist}, hip ${m.hip}, shoulder ${m.shoulder || '-'}, height ${m.height || '-'}, length ${m.length || '-'}\n` +
      `Needed by: ${o.by || '-'}\nNotes: ${o.notes || '-'}`
  });
}

function notifyWhatsApp(o) {
  const p = props(); const token = p.getProperty('WA_TOKEN'), phoneId = p.getProperty('WA_PHONE_ID'), to = p.getProperty('WA_TO'), tpl = p.getProperty('WA_TEMPLATE');
  if (!token || !phoneId || !to || !tpl) return;
  const v = p.getProperty('GRAPH_VERSION') || 'v21.0';
  const summary = (o.lines || []).map(l => `${l.code} ${l.colour} ${l.size} x${l.qty}`).join(', ');
  try {
    UrlFetchApp.fetch(`https://graph.facebook.com/${v}/${phoneId}/messages`, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ messaging_product: 'whatsapp', to: to, type: 'template',
        template: { name: tpl, language: { code: 'en' }, components: [{ type: 'body', parameters: [
          { type: 'text', text: o.id }, { type: 'text', text: `${o.name}, ${o.city}, ${o.country}` },
          { type: 'text', text: summary.slice(0, 900) }, { type: 'text', text: `${o.currency} ${o.total}` } ] }] } })
    });
  } catch (err) { console.error(err); }
}

function readOrders() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const v = sh.getDataRange().getValues(); v.shift();
  return v.filter(r => r[0]).map(r => {
    let o = {}; try { o = JSON.parse(r[ORDER_HEADERS.length - 1]); } catch (e) {}
    o.status = r[2]; o.date = r[1] instanceof Date ? r[1].toISOString() : o.date;
    return o;
  });
}

function setStatus(id, status) {
  if (STATUSES.indexOf(status) < 0) return { ok: false, error: 'bad status' };
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => r[0]);
  const i = ids.indexOf(id); if (i < 0) return { ok: false, error: 'not found' };
  sh.getRange(i + 2, 3).setValue(status);
  return { ok: true };
}

function readOverrides() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products'); if (!sh) return {};
  const v = sh.getDataRange().getValues(); v.shift();
  const out = {};
  v.forEach(r => { if (!r[0]) return; const o = {}; if (r[1]) o.inr = Number(r[1]); if (r[2] === true || r[2] === 'TRUE' || r[2] === 'Yes') o.hidden = true; out[r[0]] = o; });
  return out;
}

function setProduct(code, inr, hidden) {
  if (!/^[A-Z]\d{3}$/.test(code)) return { ok: false, error: 'bad code' };
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
  const codes = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => r[0]);
  const row = [code, inr ? Number(inr) : '', hidden ? 'Yes' : 'No', new Date()];
  const i = codes.indexOf(code);
  if (i < 0) sh.appendRow(row); else sh.getRange(i + 2, 1, 1, 4).setValues([row]);
  return { ok: true };
}

/* ---------- reviews ---------- */
function clean_(v, n) { v = String(v == null ? '' : v).slice(0, n || 600); return /^[=+\-@]/.test(v) ? "'" + v : v; }
function saveReview(r) {
  r = r || {};
  const rating = Math.round(Number(r.rating));
  if (!/^[A-Z]\d{3}$/.test(r.code || '') || !(rating >= 1 && rating <= 5) || !String(r.text || '').trim()) return { ok: false, error: 'incomplete' };
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reviews');
  sh.appendRow([new Date(), false, r.code, rating, clean_(r.text, 1200), clean_(r.name, 60), clean_(r.city, 60), clean_(r.colour, 40), clean_(r.size, 10), clean_(r.request, 20), clean_(r.wa, 30), '']);
  const to = props().getProperty('NOTIFY_EMAIL');
  if (to) MailApp.sendEmail(to, 'New review for ' + r.code + ' (' + rating + '/5)', (r.name || 'A client') + ', ' + (r.city || '') + '\n\n' + r.text + '\n\nTick Approved in the Reviews tab to show it on the website.');
  return { ok: true };
}
function readReviews() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reviews');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, REVIEW_HEADERS.length).getValues()
    .filter(r => r[1] === true && r[2] && r[3])
    .map(r => ({ c: String(r[2]), rating: Number(r[3]), text: String(r[4]), name: String(r[5]), city: String(r[6]), colour: String(r[7]), size: String(r[8]), photo: String(r[11] || ''), date: Utilities.formatDate(new Date(r[0]), 'Asia/Kolkata', 'yyyy-MM-dd'), verified: !!r[9] }));
}
