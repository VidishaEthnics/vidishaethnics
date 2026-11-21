/* Vidisha Ethnics site settings.
   Edit these values, then redeploy. Everything else reads from here. */
window.VE_CONFIG = {
  brand: 'Vidisha Ethnics',

  // Official WhatsApp number, digits only with country code (e.g. '9198xxxxxxxx').
  // Leave empty and WhatsApp buttons open a chat where the client picks the contact.
  whatsapp: '918722949275',

  // Contact email shown on the Contact page.
  email: 'vidishaethnic@gmail.com',

  // WhatsApp Business catalogue.
  catalogue: 'https://wa.me/c/918722949275',
  instagram: 'https://www.instagram.com/vidishaethnic',

  // Google Apps Script web app URL (see apps-script/Code.gs and README).
  // Empty = demo mode: requests and admin data stay in this browser only.
  appsScriptUrl: '',

  // Visitors outside India (by IP, or delivering abroad) see India price x multiplier,
  // converted and rounded up.
  intlMultiplier: 1.5,

  // Overseas shipping: India Post International Speed Post (EMS), merchandise.
  // ems: [first 250 g, each extra 250 g] in rupees, from indiapost.gov.in (November 2026).
  // GST is added on top. packGrams is the weight of the packaging.
  shipping: { gst: 0.18, packGrams: 150 },

  // Countries we deliver to, with currency and rate (rupees per 1 unit).
  // Rates as of mid-November 2026. Update monthly.
  countries: [
    { code: 'IN', name: 'India',                currency: 'INR', symbol: '₹',    rate: 1,     round: 1   },
    { code: 'US', name: 'United States',        currency: 'USD', symbol: 'US$',  rate: 94,    round: 'nine', ems: [1820,150] },
    { code: 'GB', name: 'United Kingdom',       currency: 'GBP', symbol: '£',    rate: 124.5, round: 'nine', ems: [1965,90] },
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'AED ', rate: 25.6,  round: 'nine', ems: [1400,40] },
    { code: 'MY', name: 'Malaysia',             currency: 'MYR', symbol: 'RM',   rate: 23.3,  round: 'nine', ems: [1610,60] },
    { code: 'LK', name: 'Sri Lanka',            currency: 'LKR', symbol: 'LKR ', rate: 0.29,  round: 100, ems: [790,55] }
  ],

  // Show pieces that have no photographs yet (shown as fabric cards).
  // Small labels on product tiles. Keep it to three or four pieces.
  badges: { W005: 'Best seller', W022: 'Best seller', W035: 'New', W034: 'New' },

  // Shown on the home page. Update as orders grow.
  ordersSoFar: '210+',
  ordersSince: 'March 2025',

  // Stars appear on a product once it has at least this many reviews.
  reviewsMin: 3,

  showUnphotographed: false,

  leadTime: '7 to 10 business days'
};
