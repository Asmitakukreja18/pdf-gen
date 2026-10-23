/**
 * config.js — Global Configuration & Permanent Company Information
 * Let's Explore DMC Master Configuration
 * All company-level information is locked here and NOT modified by AI.
 */

const CONFIG = {
  // Gemini API Configuration
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  GEMINI_MODEL: 'gemini-2.0-flash',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',

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

  // Standard Quotation Note
  DEFAULT_ACCOMMODATION_NOTE: 'Accommodation based on leading category / lowest category.',

  // Thank You Message
  THANK_YOU_TITLE: "Thank you for choosing LET'S EXPLORE DMC.",
  SUPPORT_LABEL: 'For any support:'
};
