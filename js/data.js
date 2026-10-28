/**
 * data.js — Central Data Model & Multi-Destination Datasets for DMC Quotation Engine
 * Complete architectural rebuild based on the official reference quotation PDF.
 * Supports:
 * - Package Header (Duration, Destination, Travellers, Pax count)
 * - Day-wise Itinerary & Pricing (Variable activities, Pax, Amount INR/USD)
 * - Hotel blocks (Per-day or stay range)
 * - Special Notes / Personal Expenses badges
 * - Price Summary (Breakdown + Automatic dual-currency totals)
 * - Dynamic Office Management (Thailand, Bali, India HQ + Custom Offices)
 * - Dynamic Custom Sections & Custom Key-Value Fields
 * - Multi-template & Color Theme Settings
 */

// ─── DOCUMENT TYPES (MULTI-FORMAT SUITE) ───────────────────────────────────────
const DOCUMENT_TYPES = {
  'itinerary': {
    id: 'itinerary',
    name: 'Travel Itinerary',
    badge: 'Experience Focused',
    icon: '🗺️',
    description: 'Day-by-day travel experience, sightseeing, transfers, meals, leisure, and hotels. Easy to read during travel.'
  },
  'quotation': {
    id: 'quotation',
    name: 'Costing Quotation',
    badge: 'Pricing Focused',
    icon: '💰',
    description: 'Detailed service breakdown with Unit Rates, Pax, Quantity, Hotel, Activity, Transfer, and Total package pricing.'
  },
  'hotel_costing': {
    id: 'hotel_costing',
    name: 'Hotel Comparison & Costing',
    badge: 'Hotel Focused',
    icon: '🏨',
    description: 'Hotel-wise comparison blocks with City, Room Type, Meal Plan, Free Cancellation, Non-refundable options, and totals.'
  },
  'summary': {
    id: 'summary',
    name: 'Package Summary',
    badge: 'Overview Focused',
    icon: '📋',
    description: 'Compact executive summary, cost breakdown table, package inclusions, exclusions, and essential trip guidelines.'
  },
  'confirmation': {
    id: 'confirmation',
    name: 'Hotel Booking Voucher',
    badge: 'Hotel Voucher',
    icon: '🏨',
    description: 'Official luxury hotel booking voucher with stay details, room occupancy, guest list, location map & hotel policies.'
  },
  'invoice': {
    id: 'invoice',
    name: 'Tax Invoice / Billing',
    badge: 'Billing Focused',
    icon: '🧾',
    description: 'Corporate invoice with Invoice #, Bill To, itemized charges, GST/tax calculation, bank payment details, and signature.'
  },
  'custom': {
    id: 'custom',
    name: 'Custom Document Builder',
    badge: 'Modular Builder',
    icon: '🛠️',
    description: 'Build any custom document by adding, removing, and re-ordering custom text, tables, hotels, activities, terms, and signatures.'
  }
};

// ─── THEME PRESETS ─────────────────────────────────────────────────────────────
const THEME_PRESETS = {
  'classic-blue': {
    name: 'Classic Blue (DMC Master)',
    primaryColor: '#0F2C59',
    secondaryColor: '#1E3A8A',
    accentColor: '#2563EB',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    borderColor: '#CBD5E1',
    tableHeaderBg: '#0F2C59',
    tableHeaderText: '#FFFFFF',
    bgBody: '#FFFFFF'
  },
  'luxury-navy': {
    name: 'Luxury Navy & Gold',
    primaryColor: '#0A192F',
    secondaryColor: '#172A45',
    accentColor: '#C5A880',
    textColor: '#1E293B',
    mutedColor: '#5A6E85',
    borderColor: '#D4AF37',
    tableHeaderBg: '#0A192F',
    tableHeaderText: '#F8FAFC',
    bgBody: '#FFFFFF'
  },
  'elegant-burgundy': {
    name: 'Elegant Burgundy',
    primaryColor: '#4A0E17',
    secondaryColor: '#721C24',
    accentColor: '#D4AF37',
    textColor: '#1F2937',
    mutedColor: '#6B7280',
    borderColor: '#E5E7EB',
    tableHeaderBg: '#4A0E17',
    tableHeaderText: '#FFFFFF',
    bgBody: '#FFFFFF'
  },
  'warm-beige': {
    name: 'Warm Beige & Bronze',
    primaryColor: '#2B2118',
    secondaryColor: '#4A3B32',
    accentColor: '#9C7A5B',
    textColor: '#292524',
    mutedColor: '#78716C',
    borderColor: '#E7E5E4',
    tableHeaderBg: '#2B2118',
    tableHeaderText: '#FAF8F5',
    bgBody: '#FFFFFF'
  },
  'modern-black': {
    name: 'Modern Black & Gold',
    primaryColor: '#111827',
    secondaryColor: '#1F2937',
    accentColor: '#F59E0B',
    textColor: '#111827',
    mutedColor: '#6B7280',
    borderColor: '#E5E7EB',
    tableHeaderBg: '#111827',
    tableHeaderText: '#FFFFFF',
    bgBody: '#FFFFFF'
  }
};

// ─── MASTER REFERENCE SAMPLE: 12-DAY THAILAND ITINERARY ────────────────────────
const DEMO_REFERENCE_THAILAND_12D = {
  activeDocType: 'quotation',
  package: {
    title: 'PACKAGE TOUR',
    duration: '12 Days / 11 Nights',
    destinations: 'Krabi + Phuket + Koh Yao Yai, Thailand',
    travellers: '2 Adults',
    paxCount: 2,
    clientName: 'Package for 2 pax',
    clientContact: '+91 80075 86881',
    clientEmail: 'info@letsexploredmc.com',
    pickupFrom: 'Phuket / Krabi Airport',
    quoteRef: 'LE-DMC-THAI-2027-112',
    preparedDate: '2 Jan to 13 Jan',
    usdToInrRate: 87.0,
    currency: 'BOTH'
  },
  days: [
    {
      dayNumber: 1,
      date: '2 Jan',
      title: 'Arrival in Krabi',
      items: [
        {
          title: 'Arrival to Krabi',
          subtitle: '',
          category: 'Transfer',
          pax: '',
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: ''
        },
        {
          title: 'Transfer Phuket to Krabi',
          subtitle: 'Transfer Phuket to Krabi · Adult · 121.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 121.00,
          amountUSD: 242.00,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Ramada By Wyndham',
        dates: '2 Jan to 5 Jan',
        pax: 2,
        amountINR: 43061,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 2,
      date: '3 Jan',
      title: '4 Islands Tour by Long Boat',
      items: [
        {
          title: '4 Island Tour by Long Boat',
          subtitle: '4 Island Tour · Adult · 84.40 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 84.40,
          amountUSD: 168.80,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Ramada By Wyndham',
        dates: '2 Jan to 5 Jan',
        pax: '',
        amountINR: 0,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 3,
      date: '4 Jan',
      title: 'Krabi City Tour (6 hours)',
      items: [
        { title: 'Phra Nang Beach', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Limestone Cliffs', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Cafe - Lunch (Personal Expense)', subtitle: '', category: 'Meals', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: 'Personal Expense' },
        { title: 'Sunset Time on Beach', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Private Transfer', subtitle: '', category: 'Transfer', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        {
          title: 'City Tour Krabi',
          subtitle: 'City Tour Krabi · 6 hrs · Adult · 100.50 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 100.50,
          amountUSD: 201.00,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Ramada By Wyndham',
        dates: '2 Jan to 5 Jan',
        pax: '',
        amountINR: 0,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 4,
      date: '5 Jan',
      title: 'ATV Ride',
      items: [
        { title: 'ATV Ride 30 mins', subtitle: '', category: 'Activity', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Driver + Pillion Driver', subtitle: '', category: 'Activity', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        {
          title: 'ATV Ride',
          subtitle: 'ATV Ride · Adult · 100.50 × 2',
          category: 'Activity',
          pax: 2,
          unitPrice: 100.50,
          amountUSD: 201.00,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Phi Phi Mountain Beach Resort',
        dates: '5 Jan to 7 Jan',
        pax: 2,
        amountINR: 29924,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 5,
      date: '6 Jan',
      title: 'Phi-Phi Island',
      items: [
        {
          title: 'Transfer to Phi-Phi Island + Maya Bay + Pileh Lagoon ( NPF included )',
          subtitle: '',
          category: 'Transfer',
          pax: '',
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'National Park Fee Included'
        },
        {
          title: 'Phi-Phi Island + NPF',
          subtitle: 'Phi-Phi Island + NPF · Adult · 144.53 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 144.53,
          amountUSD: 289.06,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Phi Phi Mountain Beach Resort',
        dates: '5 Jan to 7 Jan',
        pax: '',
        amountINR: 0,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 6,
      date: '7 Jan',
      title: 'Transfer to Phuket',
      items: [
        { title: 'Transfer to Phuket', subtitle: '', category: 'Transfer', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Day @ Leisure', subtitle: '', category: 'Leisure', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: 'Day @ Leisure' },
        {
          title: 'Transfer to Phuket',
          subtitle: 'Transfer to Phuket · Adult · 120.75 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 120.75,
          amountUSD: 241.50,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Hotel Andakira Phuket',
        dates: '7 Jan to 9 Jan',
        pax: 2,
        amountINR: 37505,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 7,
      date: '8 Jan',
      title: 'Phuket City Tour',
      items: [
        { title: 'Chalong Temple', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Big Buddha', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Old Town', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Promthep Cape', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Private Transfer by Car', subtitle: '', category: 'Transfer', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        {
          title: 'City Tour',
          subtitle: 'City Tour · Adult · 100.50 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 100.50,
          amountUSD: 201.00,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Hotel Andakira Phuket',
        dates: '7 Jan to 9 Jan',
        pax: '',
        amountINR: 0,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 8,
      date: '9 Jan',
      title: 'Oasis Spa & Candle Light Dinner',
      items: [
        { title: 'Oasis Spa & Massage', subtitle: '', category: 'Activity', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Aromatherapy Hot Oil Massage', subtitle: '', category: 'Activity', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'Candle Light Dinner at Beach @ Thavorn Beach Village Resort & Spa Phuket', subtitle: '', category: 'Meals', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: 'meals not included' },
        {
          title: 'Oasis Spa & Massage',
          subtitle: 'Oasis Spa & Massage · Adult · 115.12 × 2',
          category: 'Activity',
          pax: 2,
          unitPrice: 115.12,
          amountUSD: 230.24,
          amountINR: 0,
          tag: ''
        },
        {
          title: 'Candle Light Dinner',
          subtitle: 'Candle Light Dinner · Adult · 167.00 × 2',
          category: 'Meals',
          pax: 2,
          unitPrice: 167.00,
          amountUSD: 334.00,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Panwaburi Beachfront',
        dates: '9 Jan to 10 Jan',
        pax: 2,
        amountINR: 39950,
        amountUSD: 0,
        notes: 'Candle Light Dinner venue is at Thavorn Beach Village Resort'
      },
      dayNotes: ''
    },
    {
      dayNumber: 9,
      date: '10 Jan',
      title: 'James Bond Island by Speed Boat',
      items: [
        { title: 'James Bond Island by Speed Boat', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        { title: 'National Park Fee Included', subtitle: '', category: 'Sightseeing', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: 'National Park Fee Included' },
        {
          title: 'James Bond Island',
          subtitle: 'James Bond Island · Adult · 122.35 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 122.35,
          amountUSD: 244.70,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Esmeralda View',
        dates: '10 Jan to 13 Jan',
        pax: 2,
        amountINR: 35618,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 10,
      date: '11 Jan',
      title: 'Phuket to Koh Yao Yai',
      items: [
        { title: 'Phuket to Koh Yao Yai by Big Boat', subtitle: '', category: 'Transfer', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        {
          title: 'Phuket to Koh Yao Yai',
          subtitle: 'Phuket to Koh Yao Yai · Adult · 65.34 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 65.34,
          amountUSD: 130.68,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Esmeralda View',
        dates: '10 Jan to 13 Jan',
        pax: '',
        amountINR: 0,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 11,
      date: '12 Jan',
      title: 'Beach Visit & Relaxation',
      items: [
        { title: 'Beach Visit & Relaxation on Own', subtitle: '', category: 'Leisure', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: 'Day @ Leisure' }
      ],
      hotel: {
        name: 'Esmeralda View',
        dates: '10 Jan to 13 Jan',
        pax: '',
        amountINR: 0,
        amountUSD: 0,
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 12,
      date: '13 Jan',
      title: 'Koh Yao Yai to Phuket Airport',
      items: [
        { title: 'Koh Yao Yai to Phuket by Big Boat to Phuket Airport', subtitle: '', category: 'Transfer', pax: '', unitPrice: 0, amountUSD: 0, amountINR: 0, tag: '' },
        {
          title: 'Airport Transfer',
          subtitle: 'Airport Transfer · Adult · 89.13 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 89.13,
          amountUSD: 178.26,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: null,
      dayNotes: ''
    }
  ],
  summary: {
    items: [
      { name: 'Hotel Costing\nfor 2 adults', amountINR: 186058, amountUSD: 0 },
      { name: 'Land Part\nfor 2 adults', amountINR: 0, amountUSD: 2248.00 }
    ],
    autoCalculate: false,
    totalINR: 186058,
    totalUSD: 2248.00
  },
  offices: [
    {
      id: 'thailand-office',
      name: 'THAILAND OFFICE',
      country: 'Thailand',
      city: 'Saraburi & Phuket',
      company: 'Operated by One Trip · Co-partners by Let\'s Explore DMC',
      contactPerson: 'Mr. Jumphol Vongchun',
      designation: 'Sales & Mktg Director',
      address: '229/63 Thesaban 4 Road, Pak Phriao, Mueang Saraburi, Saraburi 18000, Thailand',
      phone: '+66 818311204',
      email: 'thailand@letsexploredmc.com'
    },
    {
      id: 'bali-office',
      name: 'BALI OFFICE (Direct Ground HQ)',
      country: 'Indonesia',
      city: 'Denpasar, Bali',
      company: 'PT. Chrysthalia Athena Sejahtera',
      contactPerson: 'Direct Ground Operations',
      designation: 'DMC Headquarters',
      address: 'Komplek Perhotelan Viking, Jalan Diponegoro, Denpasar, Bali, Indonesia',
      phone: '+62 812 3456 7890',
      email: 'bali@letsexploredmc.com'
    },
    {
      id: 'india-hq',
      name: 'LET\'S EXPLORE DMC (India HQ)',
      country: 'India',
      city: 'Central Reservations',
      company: 'Let\'s Explore DMC Pvt. Ltd.',
      contactPerson: 'Mr. Ritesh & Reservations Team',
      designation: 'B2B Partner Support',
      address: 'Corporate Reservations Desk, Maharashtra & New Delhi',
      phone: '+91 80075 86881 | +91 95459 55966',
      email: 'info@letsexploredmc.com',
      website: 'www.letsexploredmc.com',
      instagram: '@lets_exploredmc'
    }
  ],
  otherOfficesList: [
    'Amravati', 'Taksim, Istanbul', 'Baku, Azerbaijan', 'Oud Metha, Dubai',
    'Srinagar, Kashmir', 'Cairo, Egypt (North Africa & Nile Desk)',
    'Pannipitiya, Sri Lanka (Island Partner Desk)', 'Kochi, Kerala',
    'Mumbai', 'Jaipur', 'Nagpur', 'Pune', 'Raipur', 'Noida'
  ],
  customSections: [
    {
      id: 'inclusions',
      title: 'Package Inclusions',
      type: 'list',
      items: [
        '11 Nights luxury accommodation with daily buffet breakfast as specified',
        'All inter-destination speedboat and ferry transfers across Krabi, Koh Yao Yai and Phuket',
        'Private airport and pier arrival/departure transfers in modern AC minivan',
        'Phi Phi Island, 4 Islands, Hong Island & James Bond Island speedboat excursions with lunch',
        'National park entrance fees as specified in itinerary',
        'English-speaking tour guide during sightseeing tours',
        '24/7 dedicated Thailand DMC on-ground assistance and local support'
      ]
    },
    {
      id: 'exclusions',
      title: 'Package Exclusions',
      type: 'list',
      items: [
        'International and domestic flight tickets',
        'Personal expenses (laundry, telephone calls, minibar, optional activities)',
        'Meals other than specified above (lunches/dinners on leisure days)',
        'Travel and medical insurance (strongly recommended)',
        'Early check-in and late check-out fees if requested'
      ]
    },
    {
      id: 'important_notes',
      title: 'Important Quotation Notes',
      type: 'list',
      items: [
        'Accommodation based on leading category / lowest category. Rates subject to availability at time of booking.',
        'Speedboat schedules and sea tours are subject to weather and tidal conditions for guest safety.',
        'Passports must have a minimum validity of 6 months from the date of travel.'
      ]
    }
  ],
  customFields: [
    { key: 'Visa Information', value: 'Visa on Arrival / E-Visa available for Indian passport holders' },
    { key: 'Travel Insurance', value: 'Available upon request at nominal surcharge' },
    { key: 'Vehicle Type', value: 'Private Air-Conditioned Minivan (Toyota Commuter)' }
  ],
  activeDocType: 'quotation',
  hotels: [
    {
      id: 'h_1',
      name: 'Ramada By Wyndham',
      city: 'Krabi (Ao Nang Beach)',
      checkIn: '2 Jan',
      checkOut: '5 Jan',
      nights: 3,
      roomType: 'Deluxe Room',
      rooms: 1,
      mealPlan: 'Bed & Breakfast (CP)',
      amountINR: 43061,
      amountUSD: 492.13,
      opt1FreeCancel: 43061,
      opt2NonRefund: 38755,
      opt3PartialRefund: 40908,
      cancellation: 'Free cancellation until 20 Dec 2026',
      refundability: 'Refundable',
      status: 'Confirmed',
      notes: 'Walking distance to Ao Nang Beach & night market'
    },
    {
      id: 'h_2',
      name: 'Phi Phi Mountain Beach Resort',
      city: 'Koh Phi Phi Don',
      checkIn: '5 Jan',
      checkOut: '7 Jan',
      nights: 2,
      roomType: 'Superior Ocean View Bungalow',
      rooms: 1,
      mealPlan: 'Daily Buffet Breakfast',
      amountINR: 29924,
      amountUSD: 342.00,
      opt1FreeCancel: 29924,
      opt2NonRefund: 26932,
      opt3PartialRefund: 28428,
      cancellation: 'Free cancellation until 24 Dec 2026',
      refundability: 'Refundable',
      status: 'Confirmed',
      notes: 'Hillside resort with scenic panoramic sea view'
    },
    {
      id: 'h_3',
      name: 'Hotel Andakira Phuket',
      city: 'Phuket (Patong Beach)',
      checkIn: '7 Jan',
      checkOut: '9 Jan',
      nights: 2,
      roomType: 'Deluxe Premier Room',
      rooms: 1,
      mealPlan: 'Buffet Breakfast Included',
      amountINR: 37505,
      amountUSD: 428.63,
      opt1FreeCancel: 37505,
      opt2NonRefund: 33755,
      opt3PartialRefund: 35630,
      cancellation: 'Free cancellation until 30 Dec 2026',
      refundability: 'Refundable',
      status: 'Confirmed',
      notes: 'Overlooks Patong Bay; Candle Light Dinner venue on 9 Jan is set at Thavorn Beach Village Resort'
    },
    {
      id: 'h_4',
      name: 'Panwaburi Beachfront',
      city: 'Phuket (Cape Panwa)',
      checkIn: '9 Jan',
      checkOut: '10 Jan',
      nights: 1,
      roomType: 'Deluxe Pool Access Suite',
      rooms: 1,
      mealPlan: 'American Breakfast',
      amountINR: 39950,
      amountUSD: 456.57,
      opt1FreeCancel: 39950,
      opt2NonRefund: 35955,
      opt3PartialRefund: 37953,
      cancellation: 'Non-refundable tariff after confirmation',
      refundability: 'Non-Refundable',
      status: 'Confirmed',
      notes: 'Iconic beachfront glass pool resort'
    },
    {
      id: 'h_5',
      name: 'Esmeralda View',
      city: 'Koh Yao Yai',
      checkIn: '10 Jan',
      checkOut: '13 Jan',
      nights: 3,
      roomType: 'Ocean Panorama Cliff Villa',
      rooms: 1,
      mealPlan: 'Daily Island Breakfast',
      amountINR: 35618,
      amountUSD: 407.06,
      opt1FreeCancel: 35618,
      opt2NonRefund: 32056,
      opt3PartialRefund: 33837,
      cancellation: 'Free cancellation until 1 Jan 2027',
      refundability: 'Refundable',
      status: 'Confirmed',
      notes: 'Speedboat transfers to/from Chong Lard Pier included'
    }
  ],
  invoice: {
    invoiceNumber: '090587',
    invoiceDate: '28 Oct 2026',
    dueDate: '',

    // Invoice From
    fromCompany: "LET'S EXPLORE DMC",
    fromEmail: 'letsexploredmc@gmail.com',
    fromMobile: '8007586871',
    fromAddress: 'Sahakar Nagar Opp New Cotton Market,Inside Shiv Krupa Residence,Amravati\nAmravati, Maharashtra, India, 444603',
    fromGst: '27BVYPT1131M1ZT',

    // Invoice To
    toCustomerName: 'akash dewani',
    toCustomerAddress: 'Amravati, Maharashtra, India, 444603',
    toCustomerMobile: '',
    toCustomerEmail: '',

    // Itemized Services
    items: [
      {
        sn: 1,
        service: 'passport bill',
        description: '1 Adult',
        hsn: '',
        quantity: 1,
        perPaxPrice: 2850,
        netAmount: 2850,
        amount: 2850
      }
    ],

    subTotal: 2850,
    totalAmount: 2850,

    // Notes
    importantNotes: '',

    // Bank Details
    bankAccountHolder: 'LETS EXPLORE DMC',
    bankName: 'YES BANK LIMITED',
    bankAccountNo: '108163400004886',
    bankIfsc: 'YESB0001081',
    bankSwift: '',
    bankIban: '',
    bankBranch: 'AMRAVATI',
    bankQrCode: '',

    // Authorized Signatory
    authorizedSignatory: 'Authorized Signature',

    // Footer & Disclaimer
    footerLine: "LET'S EXPLORE DMC| Sahakar Nagar Opp New Cotton Market,Inside Shiv Krupa Residence,Amravati Amravati, Maharashtra, India, 444603 | letsexploredmc@gmail.com| 8007586871",
    disclaimer: 'This Is a System-Generated Invoice; No Stamp Is Required.'
  },
  confirmation: {
    // Agency Header
    agencyName: 'Aanay tours',
    contactPerson: 'Viraj Gaglani',
    agencyMobile: '7709123187',
    agencyEmail: 'Infoattdmc@gmail.com',

    // Hotel Top Highlight Box
    hotelName: 'hilton abu dhabi yas island',
    starRating: 5,
    refNo: 'TG/31130',
    confirmationNo: 'NH27002524635670',
    hotelEmail: 'reservations_yasisland@hilton.com',
    hotelMobile: '97122086888',
    cityName: 'dubai',
    guestName: 'Aanay tours',
    hotelType: 'luxury',
    guestEmail: 'Infoattdmc@gmail.com',
    guestMobile: '7709123187',

    // Map & Photo
    location: 'abu dhabi',
    mapsUrl: 'https://maps.google.com/?q=Hilton+Abu+Dhabi+Yas+Island',
    hotelPhoto: 'images/hotel-hilton.jpg',

    // Stay Dates & Times
    checkInDateTime: '16-Nov-2026 - 11:52 PM',
    checkOutDateTime: '18-Nov-2026 - 11:52 PM',

    // Room Occupancy Table
    rooms: [
      {
        roomType: 'Deluxe double room',
        roomOccupancy: 'double sharing + extra bed',
        mealPlan: 'Breakfast',
        noOfRooms: 2,
        extraBed: 0,
        noOfAdult: 4,
        noOfChild: 2,
        noOfInfant: 1,
        extraMattress: 1
      }
    ],

    // Adult Details (Guests)
    adults: [
      {
        name: 'pratik sangani',
        email: 'Infoattdmc@gmail.com',
        mobile: '7709123187'
      }
    ],

    // Important Information & Policies
    perksInfo: 'Complimentary access to any 1 out of 4 Yas Island Theme Parks- Ferrari World, Warner Bros World, Yas Waterworld or Sea World - per day for every person included in the booking.',
    passportNotice: 'Only passport is considered as valid ID proof that each guest must carry.',
    idProofPolicy: 'Passport is accepted as ID proof(s) | Local ids are allowed',
    mustRead: 'Extra-person charges may apply and vary depending on property policy | Government-issued photo identification and a credit card, debit card, or cash deposit may be required at check-in for incidental charges | Special requests are subject to availability upon check-in and may incur additional charges; special requests cannot be guaranteed | The name on the credit card used at check-in to pay for incidentals must be the primary name on the guestroom reservation | This property accepts credit cards, debit cards, and cash | Safety features at this property include a fire extinguisher and a smoke detector | This property has outdoor spaces, such as balconies, patios, terraces which may not be suitable for children; if you have concerns, we recommend contacting the property prior to your arrival to confirm they can accommodate you in a suitable room Guest Profile Pets are not allowed There are no pets living on the property Hotel Amenities',
    optionalFees: 'Optional : Fee for buffet breakfast: approximately AED 120 for adults and AED 60 for children | Rollaway bed fee: AED 150.0 per night',
    stayPolicies: 'Unmarried couples allowed | Groups with only male guests are also allowed at the property',
    petPolicy: 'Pet(s) Related: pets are not allowed | there are no pets living on the hotel',

    // Amenities Categories
    amenities: {
      transfers: 'Shuttle Service, Airport Transfers',
      entertainment: 'Beach club',
      foodDrinks: 'Indian Chef, Breakfast',
      roomAmenities: 'Bathtub, Balcony, Heater, Mineral Water, Jacuzzi, Sofa, Living Area, Minibar, Hairdryer, Air Conditioning, Dental Kit, Iron/Ironing Board, Mini Fridge, Geyser /Water Heater, Toiletries, Dining Area, Work Desk, Interconnected Room, Coffee Machine'
    },

    // Modular Section Toggles
    sections: {
      agencyHeader: true,
      summaryCard: true,
      mapPhoto: true,
      hotelDetails: true,
      adultDetails: true,
      importantInfo: true,
      amenities: true
    },

    // Legacy fields for backward compatibility
    bookingRef: 'TG/31130',
    leadPassenger: 'pratik sangani',
    contact: '7709123187',
    emergencyContact: 'reservations_yasisland@hilton.com | 97122086888',
    instructions: [
      'Please present a printed or digital copy of this official hotel booking confirmation voucher upon hotel check-in.',
      'Check-in: 16-Nov-2026 - 11:52 PM | Check-out: 18-Nov-2026 - 11:52 PM.',
      'Complimentary access to any 1 out of 4 Yas Island Theme Parks per day included.',
      'Valid original passport must be presented for all arriving guests.'
    ]
  },
  customDocument: {
    title: 'Executive Journey Dossier',
    docTypeLabel: 'Bespoke Travel Brief',
    sections: [
      { id: 'sec_1', type: 'text', title: 'Executive Introduction', content: 'Warm greetings from Let\'s Explore DMC. We take immense pleasure in presenting your custom-crafted 12-day Thailand luxury journey covering Krabi, Phuket, and the pristine shores of Koh Yao Yai.' },
      { id: 'sec_2', type: 'hotel', title: 'Selected Hotels & Resort Stays' },
      { id: 'sec_3', type: 'activity', title: 'Curated Sightseeing & Island Excursions' },
      { id: 'sec_4', type: 'pricing', title: 'Price Summary & Payment Schedule' },
      { id: 'sec_5', type: 'notes', title: 'Important Journey Guidelines & Notes' },
      { id: 'sec_6', type: 'office', title: 'Global Offices & On-Ground Support Network' },
      { id: 'sec_7', type: 'signature', title: 'Authorization & DMC Sign-Off' }
    ]
  },
  footerSettings: {
    companyName: "Let's Explore DMC",
    phones: '+91 80075 86881 | +91 95459 55966',
    website: 'www.letsexploredmc.com',
    instagram: '@lets_exploredmc'
  },
  themeSettings: {
    template: 'classic',
    preset: 'classic-blue',
    primaryColor: '#0F2C59',
    secondaryColor: '#1E3A8A',
    accentColor: '#2563EB',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    borderColor: '#CBD5E1',
    tableHeaderBg: '#0F2C59',
    tableHeaderText: '#FFFFFF',
    bgBody: '#FFFFFF'
  }
};

// ─── SAMPLE 2: DUBAI 5-DAY SAMPLE ──────────────────────────────────────────────
const DEMO_DUBAI_DATA = {
  package: {
    title: 'PACKAGE TOUR',
    duration: '5 Days / 4 Nights',
    destinations: 'Dubai & Abu Dhabi, UAE',
    travellers: '2 Adults',
    paxCount: 2,
    clientName: 'Sharma Travels B2B',
    clientContact: '+91 98112 34567',
    clientEmail: 'info@sharmatravels.in',
    pickupFrom: 'Delhi',
    quoteRef: 'LE-DMC-DXB-2027-042',
    preparedDate: '11 Mar 2027',
    usdToInrRate: 87.5,
    currency: 'BOTH'
  },
  days: [
    {
      dayNumber: 1,
      date: '11 Mar',
      title: 'Arrival in Dubai & Marina Transfer',
      items: [
        {
          title: 'Arrival at Dubai International Airport (DXB)',
          subtitle: 'Meet & Greet assistance by our airport representative',
          category: 'Transfer',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: ''
        },
        {
          title: 'Private Airport Transfer to Marina Hotel',
          subtitle: 'Private AC vehicle DXB to Hotel · Adult · 35.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 35.00,
          amountUSD: 70.00,
          amountINR: 6125,
          tag: ''
        }
      ],
      hotel: {
        name: 'Millennium Place Dubai Marina',
        dates: '11 Mar to 15 Mar',
        nights: 4,
        roomType: 'Superior Room City View',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: 'Centrally located near Dubai Marina Walk'
      },
      dayNotes: ''
    },
    {
      dayNumber: 2,
      date: '12 Mar',
      title: 'Half-Day Dubai City Tour & Dhow Cruise',
      items: [
        {
          title: 'Half-Day Dubai City Sightseeing Tour',
          subtitle: 'Dubai Frame photo-stop, Jumeirah Mosque, Burj Al Arab view · Adult · 28.00 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 28.00,
          amountUSD: 56.00,
          amountINR: 4900,
          tag: ''
        },
        {
          title: 'Evening Marina Dhow Cruise with Dinner',
          subtitle: 'Luxury 5-star buffet dinner, live Tanoura dance show · Adult · 38.00 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 38.00,
          amountUSD: 76.00,
          amountINR: 6650,
          tag: ''
        }
      ],
      hotel: {
        name: 'Millennium Place Dubai Marina',
        dates: '11 Mar to 15 Mar',
        nights: 4,
        roomType: 'Superior Room City View',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 3,
      date: '13 Mar',
      title: 'Desert Safari with BBQ Dinner',
      items: [
        {
          title: 'Morning @ Leisure',
          subtitle: 'Relax at hotel pool or visit Mall of the Emirates',
          category: 'Leisure',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'Day @ Leisure'
        },
        {
          title: 'Evening Desert Safari with Dune Bashing',
          subtitle: '4x4 Land Cruiser dune drive, camel ride, Tanoura & fire show, BBQ dinner · Adult · 45.00 × 2',
          category: 'Activity',
          pax: 2,
          unitPrice: 45.00,
          amountUSD: 90.00,
          amountINR: 7875,
          tag: ''
        }
      ],
      hotel: {
        name: 'Millennium Place Dubai Marina',
        dates: '11 Mar to 15 Mar',
        nights: 4,
        roomType: 'Superior Room City View',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 4,
      date: '14 Mar',
      title: 'Burj Khalifa & Dubai Mall Musical Fountain',
      items: [
        {
          title: 'Burj Khalifa 124th Floor (At The Top)',
          subtitle: 'High-speed elevator & panoramic observatory deck entry · Adult · 52.00 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 52.00,
          amountUSD: 104.00,
          amountINR: 9100,
          tag: ''
        },
        {
          title: 'Dubai Mall & Fountain Show',
          subtitle: 'World famous musical fountain show & leisure shopping',
          category: 'Leisure',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'Day @ Leisure'
        }
      ],
      hotel: {
        name: 'Millennium Place Dubai Marina',
        dates: '11 Mar to 15 Mar',
        nights: 4,
        roomType: 'Superior Room City View',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 5,
      date: '15 Mar',
      title: 'Departure Transfer to Dubai Airport',
      items: [
        {
          title: 'Private Departure Transfer to DXB Airport',
          subtitle: 'Hotel pickup to Dubai International Airport Terminal 3 · Adult · 35.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 35.00,
          amountUSD: 70.00,
          amountINR: 6125,
          tag: ''
        }
      ],
      hotel: null,
      dayNotes: 'Check-out time is 12:00 PM.'
    }
  ],
  summary: {
    items: [
      { name: 'Hotel Costing (4 Nights Millennium Place Dubai Marina)', amountUSD: 680.00, amountINR: 59500 },
      { name: 'Land Part (Private Airport Transfers & City Excursions)', amountUSD: 240.00, amountINR: 21000 },
      { name: 'Activities & Sightseeing (Desert Safari, Burj Khalifa 124F, Dhow Cruise)', amountUSD: 226.00, amountINR: 19775 },
      { name: 'Taxes & Tourism Dirham Fees', amountUSD: 50.00, amountINR: 4375 }
    ],
    autoCalculate: true,
    totalUSD: 1196.00,
    totalINR: 104650
  },
  offices: [
    {
      id: 'dubai-office',
      name: 'DUBAI DESK',
      country: 'UAE',
      city: 'Oud Metha, Dubai',
      company: 'Let\'s Explore DMC Middle East',
      contactPerson: 'Operations Team',
      designation: 'Ground Services Desk',
      address: 'Oud Metha Business Avenue, Dubai, UAE',
      phone: '+971 4 123 4567',
      email: 'dubai@letsexploredmc.com'
    },
    {
      id: 'india-hq',
      name: 'LET\'S EXPLORE DMC (India HQ)',
      country: 'India',
      city: 'Central Reservations',
      company: 'Let\'s Explore DMC Pvt. Ltd.',
      contactPerson: 'Mr. Ritesh & Reservations Team',
      designation: 'B2B Partner Support',
      address: 'Corporate Reservations Desk, Maharashtra & New Delhi',
      phone: '+91 80075 86881 | +91 95459 55966',
      email: 'info@letsexploredmc.com',
      website: 'www.letsexploredmc.com',
      instagram: '@lets_exploredmc'
    }
  ],
  otherOfficesList: [
    'Amravati', 'Taksim, Istanbul', 'Baku, Azerbaijan', 'Oud Metha, Dubai',
    'Srinagar, Kashmir', 'Cairo, Egypt', 'Pannipitiya, Sri Lanka', 'Kochi, Kerala',
    'Mumbai', 'Jaipur', 'Nagpur', 'Pune', 'Raipur', 'Noida'
  ],
  customSections: [
    {
      id: 'inclusions',
      title: 'Package Inclusions',
      type: 'list',
      items: [
        '4 nights accommodation at Millennium Place Dubai Marina with daily breakfast',
        'Private airport transfers (DXB - Hotel - DXB)',
        'Desert Safari with BBQ dinner, dune bashing, camel ride & live shows',
        'Burj Khalifa 124th Floor entrance tickets (non-prime slots)',
        'Marina Dhow Cruise with 5-star international buffet dinner',
        'English-speaking tour guide & private AC vehicle for city sightseeing'
      ]
    },
    {
      id: 'exclusions',
      title: 'Package Exclusions',
      type: 'list',
      items: [
        'International air tickets & UAE tourist visa fees',
        'Tourism Dirham fee payable directly at the hotel upon check-in',
        'Personal expenses and tips for drivers and guides'
      ]
    }
  ],
  customFields: [
    { key: 'Visa Information', value: '30-Day UAE Tourist Visa available at ₹ 7,500 per person' },
    { key: 'Tourism Dirham', value: 'AED 15 per room per night payable at hotel check-in' }
  ],
  footerSettings: {
    companyName: "Let's Explore DMC",
    phones: '+91 80075 86881 | +91 95459 55966',
    website: 'www.letsexploredmc.com',
    instagram: '@lets_exploredmc'
  },
  themeSettings: {
    template: 'classic',
    preset: 'classic-blue',
    primaryColor: '#0F2C59',
    secondaryColor: '#1E3A8A',
    accentColor: '#2563EB',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    borderColor: '#CBD5E1',
    tableHeaderBg: '#0F2C59',
    tableHeaderText: '#FFFFFF',
    bgBody: '#FFFFFF'
  }
};

// ─── SAMPLE 3: KASHMIR 6-DAY SAMPLE ────────────────────────────────────────────
const DEMO_KASHMIR_DATA = {
  package: {
    title: 'PACKAGE TOUR',
    duration: '6 Days / 5 Nights',
    destinations: 'Srinagar + Gulmarg + Pahalgam, Kashmir',
    travellers: '2 Adults',
    paxCount: 2,
    clientName: 'Pooja Enterprises B2B',
    clientContact: '+91 99887 66554',
    clientEmail: 'pooja.enterprises@gmail.com',
    pickupFrom: 'Delhi',
    quoteRef: 'LE-DMC-KASH-2027-015',
    preparedDate: '09 May 2027',
    usdToInrRate: 87.5,
    currency: 'INR'
  },
  days: [
    {
      dayNumber: 1,
      date: '09 May',
      title: 'Arrival in Srinagar & Dal Lake Houseboat',
      items: [
        {
          title: 'Arrival at Srinagar Airport & Transfer to Dal Lake',
          subtitle: 'Private Sedan Etios/Dzire transfer · Adult · 1,500 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 1500,
          amountUSD: 34.28,
          amountINR: 3000,
          tag: ''
        },
        {
          title: 'Sunset Shikara Ride on Dal Lake',
          subtitle: '1-Hour peaceful romantic shikara ride · Complimentary',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: ''
        }
      ],
      hotel: {
        name: 'Heritage Luxury Houseboat, Dal Lake',
        dates: '09 May to 11 May',
        nights: 2,
        roomType: 'Deluxe Carved Cedar Wood Suite',
        rooms: 1,
        mealPlan: 'MAPAI (Breakfast & Dinner)',
        notes: 'Traditional Kashmiri hospitality with lake view'
      },
      dayNotes: ''
    },
    {
      dayNumber: 2,
      date: '10 May',
      title: 'Day Excursion to Gulmarg Meadow of Flowers',
      items: [
        {
          title: 'Gulmarg Gondola Cable Car Ride (Phase 1)',
          subtitle: 'Scenic ride to Kongdoori station · Adult · 1,250 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 1250,
          amountUSD: 28.57,
          amountINR: 2500,
          tag: ''
        }
      ],
      hotel: {
        name: 'Heritage Luxury Houseboat, Dal Lake',
        dates: '09 May to 11 May',
        nights: 2,
        roomType: 'Deluxe Carved Cedar Wood Suite',
        rooms: 1,
        mealPlan: 'MAPAI (Breakfast & Dinner)',
        notes: ''
      },
      dayNotes: 'Pony rides in Gulmarg are directly payable to local union.'
    },
    {
      dayNumber: 3,
      date: '11 May',
      title: 'Scenic Drive to Pahalgam via Saffron Fields',
      items: [
        {
          title: 'Drive Srinagar to Pahalgam Valley of Shepherds',
          subtitle: 'Visit Awantipora Ruins, Apple Orchards & Saffron Fields · Adult · 2,000 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 2000,
          amountUSD: 45.71,
          amountINR: 4000,
          tag: ''
        }
      ],
      hotel: {
        name: 'Pine Palace Resort Pahalgam',
        dates: '11 May to 13 May',
        nights: 2,
        roomType: 'Riverview Cottage Room',
        rooms: 1,
        mealPlan: 'MAPAI (Breakfast & Dinner)',
        notes: 'Overlooking Lidder River'
      },
      dayNotes: ''
    },
    {
      dayNumber: 4,
      date: '12 May',
      title: 'Local Pahalgam Sightseeing (Betaab & Aru Valley)',
      items: [
        {
          title: 'Betaab Valley, Chandanwari & Aru Valley Tour',
          subtitle: 'Local union eco-van excursion · Adult · 1,800 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 1800,
          amountUSD: 41.14,
          amountINR: 3600,
          tag: ''
        }
      ],
      hotel: {
        name: 'Pine Palace Resort Pahalgam',
        dates: '11 May to 13 May',
        nights: 2,
        roomType: 'Riverview Cottage Room',
        rooms: 1,
        mealPlan: 'MAPAI (Breakfast & Dinner)',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 5,
      date: '13 May',
      title: 'Return to Srinagar & Mughal Gardens',
      items: [
        {
          title: 'Mughal Gardens Tour: Shalimar & Nishat Bagh',
          subtitle: 'Historical royal terrace gardens with Zabarwan mountain backdrop · Adult · 900 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 900,
          amountUSD: 20.57,
          amountINR: 1800,
          tag: ''
        }
      ],
      hotel: {
        name: 'The Grand Mamta Srinagar',
        dates: '13 May to 14 May',
        nights: 1,
        roomType: 'Executive Room',
        rooms: 1,
        mealPlan: 'MAPAI (Breakfast & Dinner)',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 6,
      date: '14 May',
      title: 'Departure Transfer to Srinagar Airport',
      items: [
        {
          title: 'Private Transfer to Srinagar Airport (SXR)',
          subtitle: 'Hotel to Srinagar Airport · Adult · 1,200 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 1200,
          amountUSD: 27.42,
          amountINR: 2400,
          tag: ''
        }
      ],
      hotel: null,
      dayNotes: 'Please arrive 3 hours prior to domestic flight departure due to security checkpoints.'
    }
  ],
  summary: {
    items: [
      { name: 'Hotel & Luxury Houseboat Accommodation (5 Nights MAPAI)', amountUSD: 548.57, amountINR: 48000 },
      { name: 'Private Sedan Transport for All Transfers & Inter-city Sightseeing', amountUSD: 194.28, amountINR: 17000 },
      { name: 'Gondola Phase 1 Tickets & Complimentary Shikara Ride', amountUSD: 68.57, amountINR: 6000 },
      { name: 'Toll Taxes, Parking, Driver Night Charges & Fuel', amountUSD: 19.42, amountINR: 1700 }
    ],
    autoCalculate: true,
    totalUSD: 830.84,
    totalINR: 72700
  },
  offices: [
    {
      id: 'kashmir-desk',
      name: 'SRINAGAR DESK',
      country: 'India',
      city: 'Srinagar, Kashmir',
      company: 'Let\'s Explore DMC Kashmir Ground',
      contactPerson: 'Mr. Tariq & Team',
      designation: 'Kashmir Operations Manager',
      address: 'Boulevard Road, Near Dal Lake Gate 2, Srinagar 190001',
      phone: '+91 94190 12345',
      email: 'kashmir@letsexploredmc.com'
    },
    {
      id: 'india-hq',
      name: 'LET\'S EXPLORE DMC (India HQ)',
      country: 'India',
      city: 'Central Reservations',
      company: 'Let\'s Explore DMC Pvt. Ltd.',
      contactPerson: 'Mr. Ritesh & Reservations Team',
      designation: 'B2B Partner Support',
      address: 'Corporate Reservations Desk, Maharashtra & New Delhi',
      phone: '+91 80075 86881 | +91 95459 55966',
      email: 'info@letsexploredmc.com',
      website: 'www.letsexploredmc.com',
      instagram: '@lets_exploredmc'
    }
  ],
  otherOfficesList: [
    'Amravati', 'Taksim, Istanbul', 'Baku, Azerbaijan', 'Oud Metha, Dubai',
    'Srinagar, Kashmir', 'Cairo, Egypt', 'Pannipitiya, Sri Lanka', 'Kochi, Kerala',
    'Mumbai', 'Jaipur', 'Nagpur', 'Pune', 'Raipur', 'Noida'
  ],
  customSections: [
    {
      id: 'inclusions',
      title: 'Package Inclusions',
      type: 'list',
      items: [
        '5 nights accommodation with MAPAI meal plan (Daily Buffet Breakfast & Dinner)',
        '1-Hour complimentary sunset Shikara ride on world-famous Dal Lake',
        'Exclusive private Etios / Dzire vehicle for all transfers and sightseeing',
        'Gulmarg Gondola Phase 1 tickets (subject to availability)',
        'All toll taxes, parking fees, driver night allowances and fuel charges',
        '24/7 dedicated local assistance in Kashmir'
      ]
    },
    {
      id: 'exclusions',
      title: 'Package Exclusions',
      type: 'list',
      items: [
        'Airfare (New Delhi - Srinagar - New Delhi)',
        'Local union cab at Pahalgam (Betaab & Aru Valley) and pony ride at Gulmarg',
        'Any garden entrance tickets, camera fees, or personal laundry/telephone'
      ]
    }
  ],
  customFields: [
    { key: 'Meal Plan', value: 'MAPAI (Breakfast & Dinner Included Everyday)' },
    { key: 'Vehicle Type', value: 'Exclusive Private Sedan (Etios / Dzire)' }
  ],
  footerSettings: {
    companyName: "Let's Explore DMC",
    phones: '+91 80075 86881 | +91 95459 55966',
    website: 'www.letsexploredmc.com',
    instagram: '@lets_exploredmc'
  },
  themeSettings: {
    template: 'classic',
    preset: 'classic-blue',
    primaryColor: '#0F2C59',
    secondaryColor: '#1E3A8A',
    accentColor: '#2563EB',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    borderColor: '#CBD5E1',
    tableHeaderBg: '#0F2C59',
    tableHeaderText: '#FFFFFF',
    bgBody: '#FFFFFF'
  }
};

// ─── ACTIVE WORKING QUOTATION DATA (CENTRAL INSTANCE) ──────────────────────────
const QuotationData = JSON.parse(JSON.stringify(DEMO_REFERENCE_THAILAND_12D));
QuotationData.activeDocType = 'quotation';

// ─── BACKWARDS COMPATIBILITY ALIASES ──────────────────────────────────────────
// Ensures any legacy code accessing QuotationData.client, trip, pricing doesn't crash
function syncLegacyCompatibilityFields() {
  if (!QuotationData.client) QuotationData.client = {};
  QuotationData.client.name = QuotationData.package.clientName;
  QuotationData.client.contact = QuotationData.package.clientContact;
  QuotationData.client.pickupFrom = QuotationData.package.pickupFrom;
  QuotationData.client.details = QuotationData.package.clientEmail;

  if (!QuotationData.trip) QuotationData.trip = {};
  QuotationData.trip.destination = QuotationData.package.destinations;
  QuotationData.trip.duration = QuotationData.package.duration;
  QuotationData.trip.travellers = QuotationData.package.travellers;
  QuotationData.trip.travelDate = QuotationData.package.preparedDate;

  if (!QuotationData.pricing) QuotationData.pricing = {};
  QuotationData.pricing.total = QuotationData.summary.totalINR;
  QuotationData.pricing.landPackage = QuotationData.summary.totalINR;
  QuotationData.pricing.flights = 0;

  if (!QuotationData.meta) QuotationData.meta = {};
  QuotationData.meta.quotationNumber = QuotationData.package.quoteRef;
  QuotationData.meta.preparedDate = QuotationData.package.preparedDate;

  if (!QuotationData.flights) {
    QuotationData.flights = {
      origin: 'DEL',
      destination: 'HKT',
      cabinClass: 'Economy',
      routeSummary: 'Delhi – Phuket – Delhi',
      onward: { airline: 'On Request', flightNumber: 'On Request', route: 'DEL → HKT', departure: '—', arrival: '—', duration: '—', baggage: '20 kg check-in' },
      return: { airline: 'On Request', flightNumber: 'On Request', route: 'HKT → DEL', departure: '—', arrival: '—', duration: '—', baggage: '20 kg check-in' }
    };
  }

  if (!QuotationData.landArrangement) {
    QuotationData.landArrangement = {
      hotel: QuotationData.days.find(d => d.hotel)?.hotel?.name || 'Selected Category Hotels',
      nights: String(QuotationData.days.length - 1),
      sharing: 'Twin Share',
      dates: QuotationData.package.duration,
      itinerary: QuotationData.days.map(d => ({
        day: `Day ${d.dayNumber}`,
        activity: d.title + (d.items && d.items.length ? ': ' + d.items.map(i => i.title).join('; ') : '')
      })),
      inclusions: QuotationData.customSections.find(s => s.id === 'inclusions')?.items || [],
      note: 'Accommodation based on leading category / lowest category.'
    };
  }
}
syncLegacyCompatibilityFields();

// ─── MATHEMATICAL CALCULATION ENGINE ───────────────────────────────────────────
function recalculateQuotationPricing() {
  const rate = Number(QuotationData.package.usdToInrRate) || 87.5;

  // 1. Recalculate each item in day activities
  QuotationData.days.forEach(day => {
    if (day.items && Array.isArray(day.items)) {
      day.items.forEach(item => {
        const pax = Number(item.pax) || Number(QuotationData.package.paxCount) || 1;
        const uPrice = Number(item.unitPrice) || 0;
        if (uPrice > 0 && (!item.amountUSD || item.amountUSD === uPrice * pax)) {
          item.amountUSD = Math.round(uPrice * pax * 100) / 100;
        }
        if (item.amountUSD > 0 && (!item.amountINR || item.amountINR === Math.round(item.amountUSD * rate))) {
          item.amountINR = Math.round(item.amountUSD * rate);
        }
      });
    }
  });

  // 2. Recalculate summary items if autoCalculate is on
  if (QuotationData.summary && QuotationData.summary.items) {
    let sumUSD = 0;
    let sumINR = 0;
    QuotationData.summary.items.forEach(item => {
      const u = Number(item.amountUSD) || 0;
      let inr = Number(item.amountINR) || 0;
      if (u > 0 && inr === 0) {
        inr = Math.round(u * rate);
        item.amountINR = inr;
      } else if (inr > 0 && u === 0) {
        item.amountUSD = Math.round((inr / rate) * 100) / 100;
      }
      sumUSD += Number(item.amountUSD) || 0;
      sumINR += Number(item.amountINR) || 0;
    });

    if (QuotationData.summary.autoCalculate) {
      QuotationData.summary.totalUSD = Math.round(sumUSD * 100) / 100;
      QuotationData.summary.totalINR = Math.round(sumINR);
    }
  }

  syncLegacyCompatibilityFields();
}

// ─── MARKUP & PRICING ADJUSTMENTS ENGINE ──────────────────────────────────────
/**
 * Apply markup or adjustments to the quotation
 * @param {Object} options
 * @param {number} [options.hotelPercent] e.g. 10 for +10%
 * @param {number} [options.activityUSD] e.g. 20 for +$20 on each activity
 * @param {boolean} [options.activityPerPax] true if +$20 on unit price (default true)
 * @returns {Object} result summary with before & after
 */
function applyMarkupAdjustments(options = {}) {
  const hotelPercent = Number(options.hotelPercent) || 0;
  const activityUSD = Number(options.activityUSD) || 0;
  const activityPerPax = options.activityPerPax !== false;

  const result = {
    hotelBeforeINR: 0,
    hotelAfterINR: 0,
    activitiesModified: 0,
    landBeforeUSD: 0,
    landAfterUSD: 0
  };

  // 1. Hotel Markup
  if (hotelPercent !== 0) {
    QuotationData.days.forEach(day => {
      if (day.hotel && day.hotel.amountINR > 0) {
        result.hotelBeforeINR += day.hotel.amountINR;
        day.hotel.amountINR = Math.round(day.hotel.amountINR * (1 + hotelPercent / 100));
        result.hotelAfterINR += day.hotel.amountINR;
      }
    });

    if (QuotationData.summary && QuotationData.summary.items) {
      const hItem = QuotationData.summary.items.find(i => /hotel/i.test(i.name));
      if (hItem && hItem.amountINR > 0) {
        hItem.amountINR = Math.round(hItem.amountINR * (1 + hotelPercent / 100));
      }
    }
  }

  // 2. Activities USD increase
  if (activityUSD !== 0) {
    QuotationData.days.forEach(day => {
      if (day.items && Array.isArray(day.items)) {
        day.items.forEach(item => {
          if (item.unitPrice > 0 || item.amountUSD > 0) {
            result.landBeforeUSD += Number(item.amountUSD) || 0;
            result.activitiesModified++;

            const pax = Number(item.pax) || Number(QuotationData.package.paxCount) || 2;
            if (item.unitPrice > 0) {
              item.unitPrice = Math.round((item.unitPrice + activityUSD) * 100) / 100;
              item.amountUSD = Math.round(item.unitPrice * pax * 100) / 100;
              if (item.subtitle) {
                item.subtitle = item.subtitle.replace(/(\d+(?:\.\d+)?)\s*([×x*])\s*(\d+)/, (m, oldP, op, pCount) => {
                  return `${item.unitPrice.toFixed(2)} ${op} ${pCount}`;
                });
              }
            } else if (item.amountUSD > 0) {
              item.amountUSD = Math.round((item.amountUSD + (activityPerPax ? activityUSD * pax : activityUSD)) * 100) / 100;
            }
            result.landAfterUSD += Number(item.amountUSD) || 0;
          }
        });
      }
    });

    // Update Land Part in summary
    if (QuotationData.summary && QuotationData.summary.items) {
      const landItem = QuotationData.summary.items.find(i => /land/i.test(i.name));
      if (landItem) {
        let sumUSD = 0;
        QuotationData.days.forEach(d => {
          (d.items || []).forEach(it => { sumUSD += Number(it.amountUSD) || 0; });
        });
        landItem.amountUSD = Math.round(sumUSD * 100) / 100;
      }
    }
  }

  recalculateQuotationPricing();
  return result;
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
function formatCurrencyINR(amount) {
  const num = Number(amount) || 0;
  return '₹ ' + num.toLocaleString('en-IN');
}

function formatCurrencyUSD(amount) {
  const num = Number(amount) || 0;
  return '$ ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────
function validateQuotationData() {
  const missing = [];
  const warnings = [];

  if (!QuotationData.package.destinations || !QuotationData.package.destinations.trim()) {
    missing.push('Destination');
  }
  if (!QuotationData.package.duration || !QuotationData.package.duration.trim()) {
    missing.push('Duration');
  }
  if (!QuotationData.days || QuotationData.days.length === 0) {
    missing.push('Day-wise Itinerary');
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
    warnings: warnings
  };
}

// ─── SAMPLE LOADER ────────────────────────────────────────────────────────────
function loadSampleDataset(key) {
  let demo = DEMO_REFERENCE_THAILAND_12D;
  if (key === 'dubai') demo = DEMO_DUBAI_DATA;
  else if (key === 'kashmir') demo = DEMO_KASHMIR_DATA;
  else if (key === 'thailand') demo = DEMO_REFERENCE_THAILAND_12D;
  else if (key === 'reference') demo = DEMO_REFERENCE_THAILAND_12D;

  const clone = JSON.parse(JSON.stringify(demo));

  QuotationData.activeDocType = clone.activeDocType || 'quotation';
  QuotationData.hotels = clone.hotels || [];
  QuotationData.invoice = clone.invoice || {};
  QuotationData.confirmation = clone.confirmation || {};
  QuotationData.customDocument = clone.customDocument || { title: 'Custom Travel Document', sections: [] };
  QuotationData.package = clone.package;
  QuotationData.days = clone.days;
  QuotationData.summary = clone.summary;
  QuotationData.offices = clone.offices;
  QuotationData.otherOfficesList = clone.otherOfficesList;
  QuotationData.customSections = clone.customSections;
  QuotationData.customFields = clone.customFields;
  QuotationData.footerSettings = clone.footerSettings;
  QuotationData.themeSettings = clone.themeSettings;

  recalculateQuotationPricing();
}

function resetQuotationData() {
  QuotationData.package = {
    title: 'PACKAGE TOUR',
    duration: '',
    destinations: '',
    travellers: '',
    paxCount: 2,
    clientName: '',
    clientContact: '',
    clientEmail: '',
    pickupFrom: '',
    quoteRef: 'LE-DMC-QUOT-' + Math.floor(1000 + Math.random() * 9000),
    preparedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    usdToInrRate: 87.5,
    currency: 'BOTH'
  };
  QuotationData.days = [];
  QuotationData.summary = { items: [], autoCalculate: true, totalUSD: 0, totalINR: 0 };
  QuotationData.customSections = [];
  QuotationData.customFields = [];
  recalculateQuotationPricing();
}

// Quick Sample Prompts for AI Input Panel
const SAMPLE_PROMPTS = {
  thailand: `PACKAGE TOUR: 12 Days / 11 Nights
Destination: Krabi + Phuket + Koh Yao Yai, Thailand
Travellers: 2 Adults
Client: Mr. Rajesh Sharma (+91 98200 12345)
Day 1: 2 Jan | Arrival in Krabi. Transfer Phuket to Krabi 81 USD x 2. Hotel Krabi Resort.
Day 2: 3 Jan | Krabi 4 Islands Tour by Speedboat 35 USD x 2. National Park Fee Included. Hotel Krabi Resort.
Day 3: 4 Jan | Hong Island Tour by Speedboat with Lunch 48 USD x 2. Hotel Krabi Resort.
Day 4: 5 Jan | Krabi Leisure & Sunset. Day @ Leisure. meals not included. Hotel Krabi Resort.
Day 5: 6 Jan | Transfer Krabi to Koh Yao Yai. Van 25 USD x 2, Speedboat 32 USD x 2. Hotel Santhiya Koh Yao Yai.
Day 6: 7 Jan | Koh Yao Yai Island Relaxation. Day @ Leisure. Personal Expense. Hotel Santhiya.
Day 7: 8 Jan | Koh Yao Yai to Phuket. Speedboat 32 USD x 2, Van 22 USD x 2. Hotel Phuket Graceland.
Day 8: 9 Jan | Phi Phi Islands Tour by Speedboat 55 USD x 2. Hotel Phuket Graceland.
Day 9: 10 Jan | Phuket City Tour 6 hrs 28 USD x 2. Hotel Phuket Graceland.
Day 10: 11 Jan | James Bond Island Tour 52 USD x 2. Hotel Phuket Graceland.
Day 11: 12 Jan | Phuket Shopping & Leisure. Day @ Leisure. Personal Expense.
Day 12: 13 Jan | Departure transfer to Phuket Airport 25 USD x 2.
Summary: Hotel 1480 USD, Land Transfers 434 USD, Activities 590 USD, Taxes 120 USD.`,

  dubai: `PACKAGE TOUR: 5 Days / 4 Nights
Destination: Dubai & Abu Dhabi, UAE
Travellers: 2 Adults
Client: Sharma Travels (+91 98112 34567)
Day 1: Arrival at DXB, Private transfer to Millennium Place Marina Hotel 35 USD x 2.
Day 2: Half Day City Tour 28 USD x 2. Evening Marina Dhow Cruise with Dinner 38 USD x 2.
Day 3: Day @ Leisure. Evening Desert Safari with Dune Bashing & BBQ Dinner 45 USD x 2.
Day 4: Burj Khalifa 124th Floor 52 USD x 2, Dubai Mall fountain show.
Day 5: Check-out and private transfer to airport 35 USD x 2.
Summary: Hotel 680 USD, Land Transfers 240 USD, Activities 226 USD, Taxes 50 USD.`,

  kashmir: `PACKAGE TOUR: 6 Days / 5 Nights
Destination: Srinagar, Gulmarg, Pahalgam, Kashmir
Travellers: 2 Adults
Client: Pooja Enterprises (+91 99887 66554)
Day 1: Srinagar airport arrival, Dal lake transfer INR 3000, complimentary shikara ride, stay at Heritage Houseboat.
Day 2: Gulmarg day excursion, Gondola phase 1 INR 2500, stay at Houseboat.
Day 3: Scenic drive Srinagar to Pahalgam via Saffron fields INR 4000, stay at Pine Palace Pahalgam.
Day 4: Local Pahalgam Betaab & Aru valley excursion INR 3600, stay at Pine Palace.
Day 5: Drive back to Srinagar, Mughal Gardens tour INR 1800, stay at Grand Mamta.
Day 6: Departure transfer to airport INR 2400.`,

  messy: `bhai Rajesh Sharma ka Thailand quotation bana do 2 adults ke liye. 12 din ka trip hai Jan 2 se 13 Jan tak.
Krabi, Koh Yao Yai and Phuket cover karna hai.
Krabi resort me 4 nights (2 to 6 Jan), Santhiya Koh Yao Yai me 2 nights (6 to 8 Jan) aur Graceland Phuket me 5 nights (8 to 13 Jan).
activities include Krabi 4 island speedboat (35$), Hong island (48$), Phi Phi speedboat (55$), James Bond island (52$), Phuket city tour (28$).
Sab transfers private chahiye. National park fees included likhna.
Summary me hotel 1480 USD, transfers 434 USD, tours 590 USD, taxes 120 USD. Dual currency INR and USD dikhana hai.`
};
