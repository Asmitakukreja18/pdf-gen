/**
 * config.js — Global Configuration & Permanent Company Information
 * Let's Explore DMC Master Configuration
 * All company-level information is locked here and NOT modified by AI.
 */

const CONFIG = {
  // Server-Side AI Configuration (All keys stored strictly outside document root on server)
  get GEMINI_API_KEY() {
    return ''; // Secrets never held or exposed in public client runtime
  },
  set GEMINI_API_KEY(val) {
    // Purge any legacy browser storage
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem('dmc_gemini_api_key'); } catch(e) {}
    }
  },
  _GEMINI_API_KEY: '',
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_FALLBACK_MODEL: 'gemini-flash-latest',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',

  // Anthropic Claude API Configuration (Handled strictly via server-side api/ai.php gateway)
  get CLAUDE_API_KEY() {
    return ''; // Secrets never held or exposed in public client runtime
  },
  set CLAUDE_API_KEY(val) {
    // Purge any legacy browser storage
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem('dmc_claude_api_key'); } catch(e) {}
    }
  },

  // Company Brand
  COMPANY: {
    name: "LET'S EXPLORE DMC",
    brandTitle: "Let's Explore DMC",
    tagline: 'Your Destination Management Specialist',
    phone1: '+91 80075 86881',
    phone2: '+91 95459 55966',
    email: 'info@letsexploredmc.com',
    website: 'www.letsexploredmc.com',
    websiteUrl: 'http://www.letsexploredmc.com/',
    instagram: '@lets_exploredmc',
    logo: 'images/logo.png',
    defaultContactPerson: 'Let\'s Explore DMC Travel Specialist'
  },

  // Color Theme (Master Reference Palette)
  THEME: {
    primaryNavy: '#0F2C59',      // Deep navy primary brand color
    secondaryBlue: '#1E3A8A',    // Supporting deep blue
    accentBlue: '#2563EB',       // Interactive accent
    darkCharcoal: '#1E293B',     // Main body text
    mutedGrey: '#64748B',        // Subtitles and captions
    borderGrey: '#CBD5E1',       // Table borders & dividers
    bgLightGrey: '#F8FAFC',      // Table header & container bg
    bgWhite: '#FFFFFF',          // Clean white document bg
    warningAmber: '#D97706',     // Missing info warning
    successGreen: '#16A34A'      // Validated checkmarks
  },

  // Locked Global Desks (Permanent Ground Operations)
  GLOBAL_DESKS: [
    {
      title: 'BALI OFFICE (Direct Ground HQ)',
      company: 'PT. Chrysthalia Athena Sejahtera',
      address: 'Komplek Perhotelan Viking, Jalan Diponegoro, Denpasar, Bali, Indonesia',
      email: 'bali@letsexploredmc.com',
      phone: ''
    },
    {
      title: 'THAILAND OFFICE',
      contact: 'Mr. Jumphol Vongchun (Sales & Mktg Dir)',
      company: 'Operated by One Trip · Co-partners by Let\'s Explore DMC',
      address: '229/63 Thesaban 4 Road, Pak Phriao, Mueang Saraburi, Saraburi 18000, Thailand',
      phone: '+66 818311204',
      email: 'thailand@letsexploredmc.com'
    },
    {
      title: "LET'S EXPLORE DMC (India HQ)",
      contact: 'Central Reservations & Operations',
      phones: ['+91 80075 86881', '+91 95459 55966'],
      website: 'www.letsexploredmc.com',
      instagram: '@lets_exploredmc'
    }
  ],

  // Locked Other Offices List (Permanent Network)
  OTHER_OFFICES: [
    'Amravati',
    'Taksim, Istanbul',
    'Baku, Azerbaijan',
    'Oud Metha, Dubai',
    'Srinagar, Kashmir',
    'Cairo, Egypt (North Africa & Nile Desk)',
    'Pannipitiya, Sri Lanka (Island Partner Desk)',
    'Kochi, Kerala',
    'Mumbai',
    'Jaipur',
    'Nagpur',
    'Pune',
    'Raipur',
    'Noida'
  ],

  // Dynamic Fare Note
  DYNAMIC_FARE_NOTE: 'Airline ticket pricing is dynamic. Fares are valid as of now and may change at the time of issuance.',

  // Thank You Message
  THANK_YOU_TITLE: "Thank you for choosing LET'S EXPLORE DMC.",
  SUPPORT_LABEL: 'For any support:'
};

/**
 * Global Toast Notification System
 * Displays temporary animated notifications to the user
 */
function showToast(message, type = 'info') {
  if (typeof document === 'undefined') return;
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    if (document.body) document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;

  if (container) container.appendChild(toast);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('toast-fading');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }, 3500);
}

/**
 * Global HTML Escaper
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
if (typeof window !== 'undefined') {
  window.escapeHTML = escapeHTML;
}

// Security Sanitization: Immediately cleanse any historical AI credentials from browser localStorage
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('dmc_claude_api_key');
    localStorage.removeItem('dmc_gemini_api_key');
  } catch (e) {}
}


if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
if (typeof global !== 'undefined') {
  global.CONFIG = CONFIG;
}
