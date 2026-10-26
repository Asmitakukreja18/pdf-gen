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
  package: {
    title: 'PACKAGE TOUR',
    duration: '12 Days / 11 Nights',
    destinations: 'Krabi + Phuket + Koh Yao Yai, Thailand',
    travellers: '2 Adults',
    paxCount: 2,
    clientName: 'Mr. Rajesh Sharma & Family',
    clientContact: '+91 98200 12345',
    clientEmail: 'rajesh.sharma@example.com',
    pickupFrom: 'Bangkok / Phuket Airport',
    quoteRef: 'LE-DMC-THAI-2027-112',
    preparedDate: '02 Jan 2027',
    usdToInrRate: 87.5,
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
          subtitle: 'Welcome assistance upon arrival at Krabi Airport',
          category: 'Transfer',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: ''
        },
        {
          title: 'Transfer Phuket to Krabi',
          subtitle: 'Transfer Phuket to Krabi · Adult · 81.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 81.00,
          amountUSD: 162.00,
          amountINR: 14175,
          tag: ''
        }
      ],
      hotel: {
        name: 'Krabi Resort',
        dates: '2 Jan to 6 Jan',
        nights: 4,
        roomType: 'Deluxe Pool View Room',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: 'Complimentary Wi-Fi & welcome drink'
      },
      dayNotes: ''
    },
    {
      dayNumber: 2,
      date: '3 Jan',
      title: 'Krabi 4 Islands Tour by Speedboat',
      items: [
        {
          title: 'Krabi 4 Island Tour by Speedboat',
          subtitle: 'Phra Nang Cave, Tup Island, Chicken Island & Poda Island · Adult · 35.00 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 35.00,
          amountUSD: 70.00,
          amountINR: 6125,
          tag: 'National Park Fee Included'
        }
      ],
      hotel: {
        name: 'Krabi Resort',
        dates: '2 Jan to 6 Jan',
        nights: 4,
        roomType: 'Deluxe Pool View Room',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: 'Includes snorkeling gear, life jacket and English-speaking guide.'
    },
    {
      dayNumber: 3,
      date: '4 Jan',
      title: 'Hong Island Tour with Lunch',
      items: [
        {
          title: 'Hong Island Tour by Speedboat with Lunch',
          subtitle: 'Hong Lagoon, Koh Lao Lading & Koh Pakbia · Adult · 48.00 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 48.00,
          amountUSD: 96.00,
          amountINR: 8400,
          tag: 'National Park Fee Included'
        }
      ],
      hotel: {
        name: 'Krabi Resort',
        dates: '2 Jan to 6 Jan',
        nights: 4,
        roomType: 'Deluxe Pool View Room',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 4,
      date: '5 Jan',
      title: 'Krabi Leisure & Sunset',
      items: [
        {
          title: 'Day @ Leisure · Explore Ao Nang Beach',
          subtitle: 'Free day for shopping, local cafe hopping, Thai massage and Ao Nang sunset walk',
          category: 'Leisure',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'Day @ Leisure'
        },
        {
          title: 'Local Lunch & Dinner',
          subtitle: 'Explore authentic Thai cuisine at local restaurants',
          category: 'Meals',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'meals not included'
        }
      ],
      hotel: {
        name: 'Krabi Resort',
        dates: '2 Jan to 6 Jan',
        nights: 4,
        roomType: 'Deluxe Pool View Room',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 5,
      date: '6 Jan',
      title: 'Transfer Krabi to Koh Yao Yai',
      items: [
        {
          title: 'Private Transfer from Krabi Resort to Pier',
          subtitle: 'Private AC minivan transfer · Adult · 25.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 25.00,
          amountUSD: 50.00,
          amountINR: 4375,
          tag: ''
        },
        {
          title: 'Speedboat Transfer to Koh Yao Yai',
          subtitle: 'Scenic shared speedboat across Phang Nga Bay · Adult · 32.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 32.00,
          amountUSD: 64.00,
          amountINR: 5600,
          tag: ''
        }
      ],
      hotel: {
        name: 'Santhiya Koh Yao Yai Resort & Spa',
        dates: '6 Jan to 8 Jan',
        nights: 2,
        roomType: 'Supreme Deluxe Sea View',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: 'Luxury Eco-resort with panoramic ocean view'
      },
      dayNotes: ''
    },
    {
      dayNumber: 6,
      date: '7 Jan',
      title: 'Koh Yao Yai Island Relaxation',
      items: [
        {
          title: 'Full Day @ Leisure / Island Exploration',
          subtitle: 'Relax at resort infinity pool, visit private beach or rent a scooter for village tour',
          category: 'Leisure',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'Day @ Leisure'
        },
        {
          title: 'Water Sports & Spa Treatment',
          subtitle: 'Kayaking, paddle boarding, Ayurvana spa facilities',
          category: 'Activity',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'Personal Expense'
        }
      ],
      hotel: {
        name: 'Santhiya Koh Yao Yai Resort & Spa',
        dates: '6 Jan to 8 Jan',
        nights: 2,
        roomType: 'Supreme Deluxe Sea View',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 7,
      date: '8 Jan',
      title: 'Koh Yao Yai to Phuket',
      items: [
        {
          title: 'Speedboat Transfer from Koh Yao Yai to Phuket Pier',
          subtitle: 'Resort private pier transfer + Speedboat · Adult · 32.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 32.00,
          amountUSD: 64.00,
          amountINR: 5600,
          tag: ''
        },
        {
          title: 'Transfer from Pier to Phuket Hotel',
          subtitle: 'Private transfer from Phuket Pier to Graceland Resort · Adult · 22.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 22.00,
          amountUSD: 44.00,
          amountINR: 3850,
          tag: ''
        }
      ],
      hotel: {
        name: 'Phuket Graceland Resort & Spa',
        dates: '8 Jan to 13 Jan',
        nights: 5,
        roomType: 'Deluxe Sunset Wing',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: 'Prime beachfront location on Patong Beach'
      },
      dayNotes: ''
    },
    {
      dayNumber: 8,
      date: '9 Jan',
      title: 'Phi Phi Islands Tour by Speedboat',
      items: [
        {
          title: 'Phi Phi, Maya Bay & Khai Island Tour',
          subtitle: 'Speedboat tour with buffet lunch, snorkeling & Maya Bay sightseeing · Adult · 55.00 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 55.00,
          amountUSD: 110.00,
          amountINR: 9625,
          tag: 'National Park Fee Included'
        }
      ],
      hotel: {
        name: 'Phuket Graceland Resort & Spa',
        dates: '8 Jan to 13 Jan',
        nights: 5,
        roomType: 'Deluxe Sunset Wing',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 9,
      date: '10 Jan',
      title: 'Phuket City Tour',
      items: [
        {
          title: 'Phuket Half Day City & Highlights Tour',
          subtitle: 'Big Buddha, Wat Chalong Temple, Karon Viewpoint, Cashew Nut Factory · 6 hrs · Adult · 28.00 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 28.00,
          amountUSD: 56.00,
          amountINR: 4900,
          tag: ''
        }
      ],
      hotel: {
        name: 'Phuket Graceland Resort & Spa',
        dates: '8 Jan to 13 Jan',
        nights: 5,
        roomType: 'Deluxe Sunset Wing',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 10,
      date: '11 Jan',
      title: 'James Bond Island Tour',
      items: [
        {
          title: 'James Bond Island & Phang Nga Bay by Big Boat',
          subtitle: 'Sea canoe exploration into caves at Hong Island, Koh Tapu, buffet lunch · Adult · 52.00 × 2',
          category: 'Sightseeing',
          pax: 2,
          unitPrice: 52.00,
          amountUSD: 104.00,
          amountINR: 9100,
          tag: 'National Park Fee Included'
        }
      ],
      hotel: {
        name: 'Phuket Graceland Resort & Spa',
        dates: '8 Jan to 13 Jan',
        nights: 5,
        roomType: 'Deluxe Sunset Wing',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 11,
      date: '12 Jan',
      title: 'Phuket Shopping & Leisure',
      items: [
        {
          title: 'Day @ Leisure · Patong Beach & Jungceylon Shopping',
          subtitle: 'Free day for shopping, souvenirs, Bangla Road nightlife and beach relaxation',
          category: 'Leisure',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'Day @ Leisure'
        },
        {
          title: 'Lunch & Dinner at Local Eateries',
          subtitle: 'Seafood dinner at Patong night market',
          category: 'Meals',
          pax: 2,
          unitPrice: 0,
          amountUSD: 0,
          amountINR: 0,
          tag: 'Personal Expense'
        }
      ],
      hotel: {
        name: 'Phuket Graceland Resort & Spa',
        dates: '8 Jan to 13 Jan',
        nights: 5,
        roomType: 'Deluxe Sunset Wing',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        notes: ''
      },
      dayNotes: ''
    },
    {
      dayNumber: 12,
      date: '13 Jan',
      title: 'Departure from Phuket',
      items: [
        {
          title: 'Private Airport Departure Transfer',
          subtitle: 'Graceland Resort Patong to Phuket International Airport (HKT) · Adult · 25.00 × 2',
          category: 'Transfer',
          pax: 2,
          unitPrice: 25.00,
          amountUSD: 50.00,
          amountINR: 4375,
          tag: ''
        }
      ],
      hotel: null,
      dayNotes: 'Please ensure room checkout before transfer timing. Safe travels!'
    }
  ],
  summary: {
    items: [
      { name: 'Hotel Costing (11 Nights Accommodation across 3 Resorts)', amountUSD: 1480.00, amountINR: 129500 },
      { name: 'Land Part (All Private Minivan & Speedboat Ferry Transfers)', amountUSD: 434.00, amountINR: 37975 },
      { name: 'Activities & Sightseeing (Speedboat Excursions, Guide & Fees)', amountUSD: 590.00, amountINR: 51625 },
      { name: 'Taxes & DMC Service Charges', amountUSD: 120.00, amountINR: 10500 }
    ],
    autoCalculate: true,
    totalUSD: 2624.00,
    totalINR: 229600
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
