/**
 * data.js — Central Data Model & Multi-Destination Samples for Quotation Engine
 * Implements strict JSON schema and verified mathematical calculations.
 * Supports diverse destinations: Dubai, Thailand, Kashmir, Bali, and custom user inputs.
 */

// 1. DUBAI SAMPLE (5 Days / 4 Nights)
const DEMO_DUBAI_DATA = {
  client: {
    name: 'Sharma Travels B2B',
    contact: '+91 98112 34567',
    pickupFrom: 'Delhi',
    details: 'info@sharmatravels.in'
  },
  trip: {
    destination: 'Dubai',
    country: 'UAE',
    travelDate: 'March 2027',
    duration: '5 Days / 4 Nights',
    travellers: '2 Adults'
  },
  flights: {
    origin: 'DEL',
    destination: 'DXB',
    cabinClass: 'Economy',
    routeSummary: 'Delhi – Dubai – Delhi',
    onward: {
      airline: 'Emirates',
      flightNumber: 'EK 511',
      route: 'DEL (New Delhi) → DXB (Dubai International)',
      departure: 'Thu, 11 Mar 2027, 10:45',
      arrival: 'Thu, 11 Mar 2027, 13:20',
      duration: '4h 05m · Non-stop',
      baggage: '7 kg cabin + 25 kg check-in'
    },
    return: {
      airline: 'Emirates',
      flightNumber: 'EK 512',
      route: 'DXB (Dubai International) → DEL (New Delhi)',
      departure: 'Mon, 15 Mar 2027, 21:50',
      arrival: 'Tue, 16 Mar 2027, 02:45',
      duration: '3h 25m · Non-stop',
      baggage: '7 kg cabin + 25 kg check-in'
    }
  },
  landArrangement: {
    hotel: 'Millennium Place Dubai Marina',
    nights: '4',
    sharing: 'Twin Share',
    dates: '11 – 15 Mar 2027',
    itinerary: [
      { day: 'Day 1', activity: 'Arrival at Dubai Airport & Private Transfer to Marina Hotel' },
      { day: 'Day 2', activity: 'Half-Day Dubai City Tour & Evening Marina Dhow Cruise with Dinner' },
      { day: 'Day 3', activity: 'Desert Safari with Dune Bashing, BBQ Dinner & Tanoura Dance Show' },
      { day: 'Day 4', activity: 'Burj Khalifa 124th Floor (At The Top) & Dubai Mall Musical Fountain' },
      { day: 'Day 5', activity: 'Check-out, Souk Shopping & Private Departure Transfer to Airport' }
    ],
    inclusions: [
      '4 nights accommodation on twin sharing with daily buffet breakfast',
      'Private airport transfers (DXB - Hotel - DXB)',
      'Desert Safari with BBQ dinner, dune bashing, camel ride & live shows',
      'Burj Khalifa 124th Floor entrance tickets (non-prime)',
      'Marina Dhow Cruise with international buffet dinner',
      'English-speaking tour guide & private AC vehicle for sightseeing'
    ],
    note: 'Accommodation based on leading category / lowest category. Rates subject to availability.'
  },
  pricing: {
    flights: 58400,
    landPackage: 46200,
    otherCharges: 0,
    total: 104600
  },
  contact: {
    person: 'Mr. Ritesh & Team',
    phone: '+91 80075 86881',
    email: 'info@letsexploredmc.com',
    website: 'www.letsexploredmc.com'
  },
  meta: {
    preparedDate: '23 Oct 2026',
    quotationNumber: 'LE-DMC-DXB-2027-042'
  }
};

// 2. THAILAND SAMPLE (6 Days / 5 Nights — Bangkok & Phuket)
const DEMO_THAILAND_DATA = {
  client: {
    name: 'Horizon Holidays B2B',
    contact: '+91 97170 88990',
    pickupFrom: 'Mumbai',
    details: 'bookings@horizonholidays.com'
  },
  trip: {
    destination: 'Thailand (Bangkok & Phuket)',
    country: 'Thailand',
    travelDate: 'April 2027',
    duration: '6 Days / 5 Nights',
    travellers: '2 Adults'
  },
  flights: {
    origin: 'BOM',
    destination: 'HKT',
    cabinClass: 'Economy',
    routeSummary: 'Mumbai – Phuket / Bangkok – Mumbai',
    onward: {
      airline: 'IndiGo',
      flightNumber: '6E 1701',
      route: 'BOM (Mumbai) → HKT (Phuket International)',
      departure: 'Sat, 17 Apr 2027, 04:30',
      arrival: 'Sat, 17 Apr 2027, 10:45',
      duration: '4h 45m · Non-stop',
      baggage: '7 kg cabin + 20 kg check-in'
    },
    return: {
      airline: 'IndiGo',
      flightNumber: '6E 1054',
      route: 'BKK (Bangkok Suvarnabhumi) → BOM (Mumbai)',
      departure: 'Thu, 22 Apr 2027, 19:30',
      arrival: 'Thu, 22 Apr 2027, 22:45',
      duration: '4h 45m · Non-stop',
      baggage: '7 kg cabin + 20 kg check-in'
    }
  },
  landArrangement: {
    hotel: 'Amari Phuket (3N) & Berkeley Pratunam Bangkok (2N)',
    nights: '5',
    sharing: 'Twin Share',
    dates: '17 – 22 Apr 2027',
    itinerary: [
      { day: 'Day 1', activity: 'Arrival in Phuket, Private Transfer to Resort & Evening at Leisure' },
      { day: 'Day 2', activity: 'Full Day Phi Phi Islands Tour by Speedboat with Buffet Lunch' },
      { day: 'Day 3', activity: 'Domestic Flight to Bangkok, Transfer to Hotel & Evening Chao Phraya Cruise' },
      { day: 'Day 4', activity: 'Bangkok City & Temples Tour (Wat Arun, Wat Traimit, Golden Buddha)' },
      { day: 'Day 5', activity: 'Full Day Safari World & Marine Park with Lunch' },
      { day: 'Day 6', activity: 'Check-out, Shopping at Pratunam & Private Transfer to Suvarnabhumi Airport' }
    ],
    inclusions: [
      '5 nights luxury accommodation with daily breakfast',
      'All inter-city & airport transfers in private AC vehicle',
      'Phi Phi Islands speedboat excursion with national park fees',
      'Chao Phraya Princess luxury dinner cruise',
      'Bangkok Temple & City tour with English-speaking guide',
      'Safari World & Marine Park entrance tickets with buffet lunch'
    ],
    note: 'Accommodation based on leading category / lowest category. Rates subject to availability.'
  },
  pricing: {
    flights: 52800,
    landPackage: 41500,
    otherCharges: 0,
    total: 94300
  },
  contact: {
    person: 'Mr. Ritesh & Team',
    phone: '+91 80075 86881',
    email: 'info@letsexploredmc.com',
    website: 'www.letsexploredmc.com'
  },
  meta: {
    preparedDate: '23 Oct 2026',
    quotationNumber: 'LE-DMC-THAI-2027-088'
  }
};

// 3. KASHMIR SAMPLE (6 Days / 5 Nights)
const DEMO_KASHMIR_DATA = {
  client: {
    name: 'Pooja Enterprises B2B',
    contact: '+91 99887 66554',
    pickupFrom: 'Delhi',
    details: 'pooja.enterprises@gmail.com'
  },
  trip: {
    destination: 'Kashmir',
    country: 'India',
    travelDate: 'May 2027',
    duration: '6 Days / 5 Nights',
    travellers: '2 Adults'
  },
  flights: {
    origin: 'DEL',
    destination: 'SXR',
    cabinClass: 'Economy',
    routeSummary: 'Delhi – Srinagar – Delhi',
    onward: {
      airline: 'Air India',
      flightNumber: 'AI 825',
      route: 'DEL (New Delhi) → SXR (Srinagar Airport)',
      departure: 'Sun, 09 May 2027, 09:15',
      arrival: 'Sun, 09 May 2027, 10:45',
      duration: '1h 30m · Non-stop',
      baggage: '7 kg cabin + 15 kg check-in'
    },
    return: {
      airline: 'Air India',
      flightNumber: 'AI 826',
      route: 'SXR (Srinagar Airport) → DEL (New Delhi)',
      departure: 'Fri, 14 May 2027, 16:30',
      arrival: 'Fri, 14 May 2027, 18:00',
      duration: '1h 30m · Non-stop',
      baggage: '7 kg cabin + 15 kg check-in'
    }
  },
  landArrangement: {
    hotel: 'Heritage Houseboat Dal Lake (2N) & Pine Palace Pahalgam (3N)',
    nights: '5',
    sharing: 'Double Sharing',
    dates: '09 – 14 May 2027',
    itinerary: [
      { day: 'Day 1', activity: 'Arrival at Srinagar Airport, Transfer to Dal Lake Houseboat & Sunset Shikara Ride' },
      { day: 'Day 2', activity: 'Day Excursion to Gulmarg Meadow of Flowers & Gondola Cable Car Ride (Phase 1)' },
      { day: 'Day 3', activity: 'Scenic Drive from Srinagar to Pahalgam Valley via Saffron Fields & Awantipora' },
      { day: 'Day 4', activity: 'Local Pahalgam Sightseeing: Betaab Valley, Chandanwari & Aru Valley' },
      { day: 'Day 5', activity: 'Drive back to Srinagar, Visit Mughal Gardens (Shalimar & Nishat Bagh)' },
      { day: 'Day 6', activity: 'Morning Souvenir & Dry Fruits Shopping, Departure Transfer to Srinagar Airport' }
    ],
    inclusions: [
      '5 nights accommodation with MAPAI plan (Daily Breakfast & Dinner)',
      '1-Hour complimentary Shikara ride on Dal Lake',
      'Exclusive private sedan vehicle (Etios / Dzire) for all transfers & sightseeing',
      'Toll taxes, parking, driver night charges & fuel included',
      'Assistance on arrival & departure at Srinagar Airport'
    ],
    note: 'Union cab in Pahalgam / Gulmarg pony rides at direct payment as per local union rules.'
  },
  pricing: {
    flights: 34500,
    landPackage: 38200,
    otherCharges: 0,
    total: 72700
  },
  contact: {
    person: 'Mr. Ritesh & Team',
    phone: '+91 80075 86881',
    email: 'info@letsexploredmc.com',
    website: 'www.letsexploredmc.com'
  },
  meta: {
    preparedDate: '23 Oct 2026',
    quotationNumber: 'LE-DMC-KASH-2027-015'
  }
};

// 4. BALI REFERENCE SAMPLE (5 Days / 4 Nights)
const DEMO_BALI_DATA = {
  client: {
    name: 'Ketavs Ayush Health B2B',
    contact: '8894959190',
    pickupFrom: 'Delhi',
    details: '8894959190'
  },
  trip: {
    destination: 'Bali',
    country: 'Indonesia',
    travelDate: 'February 2027',
    duration: '5 Days / 4 Nights',
    travellers: '2 Adults'
  },
  flights: {
    origin: 'DEL',
    destination: 'DPS',
    cabinClass: 'Economy',
    routeSummary: 'Delhi – Bali – Delhi',
    onward: {
      airline: 'IndiGo',
      flightNumber: '6E 1613',
      route: 'DEL (New Delhi) → DPS (Denpasar Bali)',
      departure: 'Fri, 05 Feb 2027, 00:20',
      arrival: 'Fri, 05 Feb 2027, 10:35',
      duration: '7h 45m · Non-stop',
      baggage: '7 kg cabin + 20 kg check-in'
    },
    return: {
      airline: 'IndiGo',
      flightNumber: '6E 1614',
      route: 'DPS (Denpasar Bali) → DEL (New Delhi)',
      departure: 'Tue, 09 Feb 2027, 11:35',
      arrival: 'Tue, 09 Feb 2027, 17:00',
      duration: '7h 55m · Non-stop',
      baggage: '7 kg cabin + 20 kg check-in'
    }
  },
  landArrangement: {
    hotel: 'Sun Island Hotel & Spa Kuta',
    nights: '4',
    sharing: 'Twin Share',
    dates: '05 – 09 Feb 2027',
    itinerary: [
      { day: 'Day 1', activity: 'Arrival in Bali & Private Transfer to Kuta Hotel' },
      { day: 'Day 2', activity: 'Water sports at Tanjung Benoa – Sunset Uluwatu Cliff Temple' },
      { day: 'Day 3', activity: 'Ulun Danu Beratan Temple – Handara Gate – Tanah Lot Sunset' },
      { day: 'Day 4', activity: 'Tegalalang Rice Terrace – Bali Swing – Ayung River Rafting' },
      { day: 'Day 5', activity: 'Check-out & Private Departure Transfer to Airport' }
    ],
    inclusions: [
      '4 nights accommodation on twin sharing with breakfast',
      'Private car with English-speaking driver throughout itinerary',
      'All toll, parking & entrance fees for mentioned monuments',
      'Sightseeing and activities as per day-wise programme above'
    ],
    note: 'Accommodation based on leading category / lowest category.'
  },
  pricing: {
    flights: 110971,
    landPackage: 36354,
    otherCharges: 0,
    total: 147325
  },
  contact: {
    person: 'Mr. Ritesh & Team',
    phone: '+91 80075 86881',
    email: 'info@letsexploredmc.com',
    website: 'www.letsexploredmc.com'
  },
  meta: {
    preparedDate: '23 Oct 2026',
    quotationNumber: 'LE-DMC-BALI-2027-019'
  }
};

// ── SAMPLE RAW ENQUIRY TEXTS FOR QUICK DEMOS (ENGLISH, HINDI, HINGLISH, MESSY) ──
const SAMPLE_PROMPTS = {
  dubai: `Client Name: Sharma Travels B2B
Contact Number: 9811234567
Destination: Dubai, UAE
Travel Date: March 2027
Duration: 5 Days / 4 Nights
Travellers: 2 Adults
Pickup From: Delhi

Flights:
Airline: Emirates
Flight: EK 511
Route: DEL → DXB
Return Flight: EK 512 DXB → DEL

Hotel: Millennium Place Dubai Marina 4 Nights Twin Sharing
Itinerary:
Day 1: Arrival & transfer to Marina hotel
Day 2: City tour + Marina Dhow Cruise with dinner
Day 3: Desert safari with dune bashing & BBQ
Day 4: Burj Khalifa 124th floor & Dubai Mall
Day 5: Check-out and airport transfer

Flights Cost: ₹58,400
Land Package: ₹46,200
Total: ₹1,04,600`,

  thailand: `Enquiry from Horizon Holidays B2B (Contact: 9717088990)
Trip: Thailand (Bangkok & Phuket)
Dates: April 2027 · Duration: 6 Days / 5 Nights · Pax: 2 Adults
From: Mumbai

Flight Onward: IndiGo 6E 1701 BOM to HKT
Flight Return: 6E 1054 BKK to BOM
Hotel: Amari Phuket (3N) & Berkeley Pratunam (2N)

Day 1: Phuket arrival transfer
Day 2: Phi Phi Islands tour by speedboat
Day 3: Flight to Bangkok, Chao Phraya dinner cruise
Day 4: Bangkok City & Temples tour
Day 5: Safari World & Marine Park
Day 6: Shopping & transfer to airport

Pricing:
Flights: ₹52,800
Land Package: ₹41,500
Total Package: ₹94,300`,

  kashmir: `Client: Pooja Enterprises B2B
Phone: 9988766554
Destination: Kashmir, India
Duration: 6 Days / 5 Nights (2 Adults)
Pickup: Delhi
Travel Date: May 2027
Flights: Air India AI 825 DEL-SXR, Return AI 826 SXR-DEL
Stay: Heritage Houseboat Dal Lake (2N) + Pine Palace Pahalgam (3N)

Itinerary:
Day 1: Srinagar airport pickup, Dal Lake shikara ride
Day 2: Gulmarg day trip & Gondola ride
Day 3: Srinagar to Pahalgam via saffron fields
Day 4: Betaab valley & Aru valley
Day 5: Mughal gardens in Srinagar
Day 6: Souvenir shopping & flight back

Flights: ₹34,500
Land Package: ₹38,200
Total: ₹72,700`,

  bali: `Client Name: Ketavs Ayush Health B2B
Contact Number: 8894959190
Destination: Bali, Indonesia
Travel Date: February 2027
Duration: 5 Days / 4 Nights
Travellers: 2 Adults
Pickup From: Delhi

Flights:
Airline: IndiGo
Flight: 6E 1613
Route: DEL → DPS
Return: 6E 1614 DPS → DEL

Hotel: Sun Island 4 Nights Twin Sharing
Day 1: Arrival & transfer to Kuta
Day 2: Water sports – Uluwatu
Day 3: Ulun Danu – Handara Gate – Tanah Lot
Day 4: Rice terrace – Swing – Rafting
Day 5: Check-out & transfer out

Flights Cost: ₹1,10,971
Land Package: ₹36,354
Total: ₹1,47,325`,

  messy: `bhai ek quotation bana do jaldi:
client: Rohit Sharma
ph: 9876543210
2 adults ja rahe hain Dubai
5 days / 4 nights in March 2027
departure from Delhi
flight Emirates ya IndiGo DEL to DXB
hotel 4 star marina side with breakfast
ghoomna kya hai:
desert safari with bbq dinner
burj khalifa top floor
marina cruise dinner
city tour
aur shopping
approx budget: flights around 55000 and land package 48000 total.
please generate clean DMC quotation sheet.`
};

// Global Active Quotation Data Object (initialized to Dubai by default for fresh variety)
const QuotationData = JSON.parse(JSON.stringify(DEMO_DUBAI_DATA));

// Legacy compatibility shim for older components if referenced
const TravelData = {
  get clientName() { return QuotationData.client.name; },
  set clientName(v) { QuotationData.client.name = v; },
  get destination() { return QuotationData.trip.destination; },
  set destination(v) { QuotationData.trip.destination = v; },
  get nights() { return parseInt(QuotationData.landArrangement.nights, 10) || 4; },
  get days() { return QuotationData.landArrangement.itinerary.length || 5; },
  get grandTotal() { return QuotationData.pricing.total; },
  get services() { return []; },
  get inclusions() { return QuotationData.landArrangement.inclusions; },
  get itinerary() { return QuotationData.landArrangement.itinerary; }
};

/**
 * Recalculate and mathematically verify pricing total.
 * Total = flights + landPackage + otherCharges.
 */
function recalculateQuotationPricing() {
  const f = Math.max(0, Number(QuotationData.pricing.flights) || 0);
  const l = Math.max(0, Number(QuotationData.pricing.landPackage) || 0);
  const o = Math.max(0, Number(QuotationData.pricing.otherCharges) || 0);
  QuotationData.pricing.flights = f;
  QuotationData.pricing.landPackage = l;
  QuotationData.pricing.otherCharges = o;
  QuotationData.pricing.total = f + l + o;
  return QuotationData.pricing.total;
}

/**
 * Format Currency in INR Style: ₹ 1,47,325
 */
function formatCurrencyINR(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹ 0';
  const num = Math.round(Number(amount));
  return '₹ ' + num.toLocaleString('en-IN');
}

/**
 * Validate Quotation Data.
 */
function validateQuotationData() {
  const missing = [];
  const warnings = [];

  if (!QuotationData.client.name || QuotationData.client.name.trim() === '' || QuotationData.client.name === 'Not provided') {
    missing.push('Client Name');
  }
  if (!QuotationData.trip.destination || QuotationData.trip.destination.trim() === '' || QuotationData.trip.destination === 'Not provided') {
    missing.push('Destination');
  }
  if (!QuotationData.trip.travelDate || QuotationData.trip.travelDate.trim() === '' || QuotationData.trip.travelDate === 'Not provided') {
    missing.push('Travel Date');
  }
  if (!QuotationData.trip.travellers || QuotationData.trip.travellers.trim() === '' || QuotationData.trip.travellers === 'Not provided') {
    missing.push('Traveller Count');
  }
  if (!QuotationData.landArrangement.hotel || QuotationData.landArrangement.hotel.trim() === '' || QuotationData.landArrangement.hotel === 'Not provided') {
    missing.push('Hotel Details');
  }
  if (!QuotationData.landArrangement.itinerary || QuotationData.landArrangement.itinerary.length === 0) {
    missing.push('Itinerary Activities');
  }
  if (!QuotationData.pricing.flights && !QuotationData.pricing.landPackage && !QuotationData.pricing.total) {
    missing.push('Pricing Details');
  }

  const hasOnward = QuotationData.flights.onward && QuotationData.flights.onward.flightNumber && QuotationData.flights.onward.flightNumber !== 'Not provided';
  if (!hasOnward) {
    warnings.push('Flight details not confirmed yet (will show as On Request).');
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
    warnings: warnings
  };
}

/**
 * Reset data to clean empty template
 */
function resetQuotationData() {
  QuotationData.client = { name: '', contact: '', pickupFrom: '', details: '' };
  QuotationData.trip = { destination: '', country: '', travelDate: '', duration: '', travellers: '' };
  QuotationData.flights = {
    origin: '',
    destination: '',
    cabinClass: 'Economy',
    routeSummary: '',
    onward: { airline: '', flightNumber: '', route: '', departure: '', arrival: '', duration: '', baggage: '' },
    return: { airline: '', flightNumber: '', route: '', departure: '', arrival: '', duration: '', baggage: '' }
  };
  QuotationData.landArrangement = {
    hotel: '',
    nights: '',
    sharing: '',
    dates: '',
    itinerary: [],
    inclusions: [],
    note: CONFIG.DEFAULT_ACCOMMODATION_NOTE
  };
  QuotationData.pricing = { flights: 0, landPackage: 0, otherCharges: 0, total: 0 };
  QuotationData.contact = {
    person: CONFIG.COMPANY.defaultContactPerson,
    phone: CONFIG.COMPANY.phone1,
    email: CONFIG.COMPANY.email,
    website: CONFIG.COMPANY.website
  };
  QuotationData.meta = {
    preparedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    quotationNumber: 'LE-DMC-QUOT-' + Math.floor(1000 + Math.random() * 9000)
  };
}

/**
 * Load any sample dataset by key ('dubai' | 'thailand' | 'kashmir' | 'bali')
 */
function loadSampleDataset(key) {
  let demo = DEMO_DUBAI_DATA;
  if (key === 'thailand') demo = DEMO_THAILAND_DATA;
  else if (key === 'kashmir') demo = DEMO_KASHMIR_DATA;
  else if (key === 'bali') demo = DEMO_BALI_DATA;

  const clone = JSON.parse(JSON.stringify(demo));
  Object.assign(QuotationData.client, clone.client);
  Object.assign(QuotationData.trip, clone.trip);
  Object.assign(QuotationData.flights, clone.flights);
  Object.assign(QuotationData.landArrangement, clone.landArrangement);
  Object.assign(QuotationData.pricing, clone.pricing);
  Object.assign(QuotationData.contact, clone.contact);
  QuotationData.meta = clone.meta;
  recalculateQuotationPricing();
}

/**
 * Backwards compatibility helper
 */
function loadBaliMasterDemo() {
  loadSampleDataset('bali');
}
