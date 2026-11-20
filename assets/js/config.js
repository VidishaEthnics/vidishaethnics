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

  // International price = India price x multiplier, converted and rounded up.
  intlMultiplier: 1.5,

  // Countries we deliver to, with currency and rate (rupees per 1 unit).
  // Rates as of mid-November 2026. Update monthly.
  countries: [
    { code: 'IN', name: 'India',                currency: 'INR', symbol: '₹',    rate: 1,     round: 1   },
    { code: 'US', name: 'United States',        currency: 'USD', symbol: 'US$',  rate: 94,    round: 'nine' },
    { code: 'GB', name: 'United Kingdom',       currency: 'GBP', symbol: '£',    rate: 124.5, round: 'nine' },
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'AED ', rate: 25.6,  round: 'nine' },
    { code: 'MY', name: 'Malaysia',             currency: 'MYR', symbol: 'RM',   rate: 23.3,  round: 'nine' },
    { code: 'LK', name: 'Sri Lanka',            currency: 'LKR', symbol: 'LKR ', rate: 0.29,  round: 100 }
  ],

  // Show pieces that have no photographs yet (shown as fabric cards).
  showUnphotographed: true,

  leadTime: '7 to 10 business days'
};
