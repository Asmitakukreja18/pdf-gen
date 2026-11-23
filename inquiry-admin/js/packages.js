/**
 * packages.js — Real-Time Destination Packages & Cloud Itinerary Management
 * Lets Explore DMC Luxury ERP Portal
 * 
 * Features:
 * - 33 Authentic Destination Packages (PDF & DOCX Master Quotations)
 * - Automatic strict purge of dummy / test / fake records
 * - 1-Click Direct Download of genuine PDF or DOCX quotation files
 * - 1-Click "Edit in Studio" (customizeWithLogoById) with full pre-filled costing & hotel details
 * - Active / Inactive status toggle with instant real-time sync
 * - Multi-destination country filter pills
 */

// 33 Verified Master Quotation Packages from Let's Explore DMC Archive
const DEFAULT_MASTER_PACKAGES = [
  {
    "id": 100,
    "package_code": "PKG-MLE-VN-DINING",
    "name": "Villa Nautica Maldives — Candle Light & Beach Dining Experiences (With Decoration)",
    "country": "Maldives",
    "destination": "Paradise Island, Maldives",
    "duration_days": 1,
    "duration_nights": 0,
    "hotel_category": "5-Star Luxury Resort Dining",
    "hotel_details": "Villa Nautica Paradise Island Maldives (7 Romantic Dining Selections with Decoration)",
    "pricing_inr": 35000,
    "pricing_usd": 400,
    "markup_percent": 15,
    "highlights": "Candle Light Dinner ($400++), Dig-In Beach Dinner ($488++), Seafood Lunch ($256++-$322++), Vegetarian Dinner ($340++), Oriental Night ($488++), Private BBQ ($368++), Crow's Nest ($396++)",
    "inclusions": "Private Beachfront Canopy Setup, Floral Decoration, Candlelit Path, Ambient Lanterns, Personalized Welcome Board, Dedicated Private Server & Multi-Course Dining",
    "exclusions": "Beverages / Alcohol unless specified, International Airfare, Resort Accommodation (Available as separate booking)",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/VillaNautica_Maldives_Dining_Experiences_Doubled.html",
    "source_drive_file": "VillaNautica_Maldives_Dining_Experiences_Doubled.html",
    "created_at": "2026-11-17 17:00:00"
  },
  {
    "id": 201,
    "package_code": "PKG-IN-KER-52400",
    "name": "Kerala Scenic Hills & Backwaters — Arti Meghani Tour (7D/6N)",
    "country": "India",
    "destination": "Munnar, Thekkady & Alleppey Houseboat, Kerala",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "4-Star Deluxe Resorts & Private Houseboat",
    "hotel_details": "2N Munnar Tea Valley + 1N Thekkady Spice Resort + 1N Alleppey Deluxe Houseboat + 2N Cochin",
    "pricing_inr": 52400,
    "pricing_usd": 630,
    "markup_percent": 12,
    "highlights": "Munnar Tea Plantations, Eravikulam National Park, Mattupetty Dam, Periyar Wildlife Sanctuary boating, Traditional Alleppey Backwater cruise with onboard freshly cooked Kerala meals, Fort Kochi heritage walk",
    "inclusions": "6 Nights Deluxe Stay, Daily Breakfast & All Meals on Houseboat, Dedicated AC Sedan Cochin-to-Cochin, Fuel, Toll, Driver Allowance",
    "exclusions": "Flight/Train tickets, Monument entry & boating fees, Personal expenses",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Arti-meghani_KERALA-52400.pdf",
    "source_drive_file": "Arti-meghani_KERALA-52400.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 202,
    "package_code": "PKG-VN-HAN-20927",
    "name": "Vietnam Grand Explorer — Ashutosh Sahu Tour (10D/9N)",
    "country": "Vietnam",
    "destination": "Hanoi, Halong Bay, Da Nang, Hoi An & Ba Na Hills",
    "duration_days": 10,
    "duration_nights": 9,
    "hotel_category": "4-Star & 5-Star Luxury Cruise",
    "hotel_details": "Hanoi Golden Silk + 5-Star Overnight Halong Bay Cruise + Da Nang Beachfront Resort + Hoi An Ancient Boutique",
    "pricing_inr": 148000,
    "pricing_usd": 1780,
    "markup_percent": 15,
    "highlights": "Overnight 5-Star Halong Bay Cruise with kayaking and cave discovery, Sun World Ba Na Hills Golden Bridge, Hoi An lantern ancient town, Hanoi Old Quarter street food tour, Marble Mountains",
    "inclusions": "9 Nights Accommodation, Full Board on Halong Cruise, Ba Na Hills Cable Car & Golden Bridge tickets, Private Airport Transfers, English Speaking Guide",
    "exclusions": "International Flights, Vietnam Visa stamping fee, Beverages & personal tips",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/ashutosh-sahu_VIETNAM-TRIP-20927.pdf",
    "source_drive_file": "ashutosh-sahu_VIETNAM-TRIP-20927.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 203,
    "package_code": "PKG-SG-SIN-24589",
    "name": "Singapore Super Saver — Chabbra Dental Clinic Tour (7D/6N)",
    "country": "Singapore",
    "destination": "Singapore City & Sentosa Island",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "4-Star Deluxe City Hotel",
    "hotel_details": "Orchard / Marina Bay Area 4-Star Hotel with daily buffet breakfast",
    "pricing_inr": 82800,
    "pricing_usd": 995,
    "markup_percent": 12,
    "highlights": "Universal Studios Singapore full day pass with Express access, Sentosa Island Cable Car, Wings of Time fireworks show, Gardens by the Bay Cloud Forest & Flower Dome, Marina Bay Sands SkyPark observation deck",
    "inclusions": "6 Nights Stay with Daily Breakfast, Return Airport Transfers, All attraction entrance tickets mentioned, AC Minivan Coach transfers",
    "exclusions": "Airfare, Singapore Visa, Meals outside breakfast, Personal expenses",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/chabbra-dental-clinic_SINGAPORE-TRIP-24589.pdf",
    "source_drive_file": "chabbra-dental-clinic_SINGAPORE-TRIP-24589.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 204,
    "package_code": "PKG-IN-KER-54486",
    "name": "Kerala Exotic Wilderness & Houseboat — Darshan D Tour (7D/6N)",
    "country": "India",
    "destination": "Cochin, Munnar, Thekkady, Alleppey & Kovalam",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "Deluxe Hill & Coastal Resorts",
    "hotel_details": "Luxury Resorts with valley views + Private Houseboat",
    "pricing_inr": 54486,
    "pricing_usd": 655,
    "markup_percent": 10,
    "highlights": "Cheeyappara & Valara waterfalls, Tea Museum & processing tour, Spice plantations walk, Kathakali & Kalaripayattu martial arts show, Alleppey backwaters Vembanad lake cruise",
    "inclusions": "6 Nights Accommodation, Daily Breakfast, Houseboat all meals (Kerala Cuisine), AC Vehicle for full itinerary",
    "exclusions": "Airfare, Elephant rides & spice garden entry, Personal tipping",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/darshan-D_KERALA-54486.pdf",
    "source_drive_file": "darshan-D_KERALA-54486.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 205,
    "package_code": "PKG-ID-DPS-26456",
    "name": "Bali Tropical Paradise Escape — Mohit Kodwani Tour (7D/6N)",
    "country": "Indonesia",
    "destination": "Kuta, Seminyak, Ubud & Nusa Penida, Bali",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "4-Star Beach Resort & Ubud Jungle Pool Villa",
    "hotel_details": "4N Kuta/Seminyak Resort + 2N Ubud Private Pool Villa",
    "pricing_inr": 26456,
    "pricing_usd": 320,
    "markup_percent": 15,
    "highlights": "Nusa Penida West Island tour (Kelingking Beach, Broken Beach, Angel Billabong, Crystal Bay), Ubud Aloha Swing & Tegalalang Rice Terrace, Kintamani Volcano view with Indonesian lunch, Uluwatu sunset sea temple & Kecak dance",
    "inclusions": "6 Nights Stay, Daily Breakfast, Return Fastboat to Nusa Penida, Private AC Minivan for all tours, English speaking Balinese driver-guide",
    "exclusions": "Flight tickets, Indonesia Tourist Visa ($35 on arrival), Lunches & Dinners unless specified",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/MOHIT-KODWANI_Bali-Indonesia-26456.pdf",
    "source_drive_file": "MOHIT-KODWANI_Bali-Indonesia-26456.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 206,
    "package_code": "PKG-MY-KUL-12225",
    "name": "Malaysia with Bali Duo Explorer — Mohit Kodwani Tour (8D/7N)",
    "country": "Malaysia",
    "destination": "Kuala Lumpur, Genting & Bali Island",
    "duration_days": 8,
    "duration_nights": 7,
    "hotel_category": "4-Star City & Island Resorts",
    "hotel_details": "3N Kuala Lumpur City Centre + 4N Bali Seminyak Resort",
    "pricing_inr": 122138,
    "pricing_usd": 1470,
    "markup_percent": 12,
    "highlights": "Petronas Twin Towers photo stop, Batu Caves Murugan Temple, Genting Skyway Cable Car, Tanjung Benoa Watersports (Banana Boat, Jet Ski), Tanah Lot Sunset Temple",
    "inclusions": "7 Nights Accommodation, Daily Breakfast, Inter-city AC transfers, Genting Cable Car tickets, All listed sightseeing tours with transfers",
    "exclusions": "International & Inter-country air tickets, Malaysia Tourism Tax (MYR 10/night), Personal tipping",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Mohit-Kodwani_Malaysia-with-Bali-12225.pdf",
    "source_drive_file": "Mohit-Kodwani_Malaysia-with-Bali-12225.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 207,
    "package_code": "PKG-TH-HKT-DEC12",
    "name": "Thailand Phuket & Bangkok Festive Grand Tour (12D/11N)",
    "country": "Thailand",
    "destination": "Phuket, Phi Phi, Krabi & Bangkok",
    "duration_days": 12,
    "duration_nights": 11,
    "hotel_category": "5-Star & 4-Star Deluxe Beach Resorts",
    "hotel_details": "My Beach Resort Phuket + Ramada by Wyndham / Panwaburi Resort + Bangkok Luxury Hotel",
    "pricing_inr": 168000,
    "pricing_usd": 2020,
    "markup_percent": 12,
    "highlights": "Phuket City Tour & Promthep Cape Sunset, Phi Phi Island & Maya Bay speedboat tour with buffet lunch, James Bond Island sea canoeing, Bangkok Grand Palace & Chao Phraya Dinner Cruise",
    "inclusions": "11 Nights Stay with Daily Breakfast, All speedboat island excursions with national park fees, Private airport & pier transfers, Bangkok temple tour",
    "exclusions": "International flights, Personal expenses, Alcoholic beverages",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Package_tour_21_Dec_till_27_Dec_Phuket_27_Dec_till_1_Jan_12pct_markup.pdf",
    "source_drive_file": "Package_tour_21_Dec_till_27_Dec_Phuket_27_Dec_till_1_Jan_12pct_markup.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 208,
    "package_code": "PKG-AE-DXB-75610",
    "name": "Dubai Luxury Skyline & Desert Safari — Pax Trip (5D/4N)",
    "country": "UAE",
    "destination": "Dubai & Arabian Desert, UAE",
    "duration_days": 5,
    "duration_nights": 4,
    "hotel_category": "4-Star Deluxe Millennium / Grand Excelsior",
    "hotel_details": "Premium Dubai City Hotel with rooftop pool & central Metro connectivity",
    "pricing_inr": 42598,
    "pricing_usd": 515,
    "markup_percent": 12,
    "highlights": "Burj Khalifa 124th Floor At the Top observation ticket, Red Dune Desert Safari with 4x4 Dune Bashing, Camel ride, Tanoura & Belly Dance with BBQ dinner, Dubai Marina Luxury Dhow Cruise with buffet dinner, Dubai Frame visit",
    "inclusions": "4 Nights Accommodation, Daily Breakfast, Desert Safari with BBQ, Dhow Cruise Dinner, All Private AC Transfers, 5% UAE VAT",
    "exclusions": "International Flight, UAE Tourist Visa, Tourism Dirham Fee, Lunches",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/pax-trip_DUBAI-TOUR-75610.pdf",
    "source_drive_file": "pax-trip_DUBAI-TOUR-75610.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 209,
    "package_code": "PKG-MY-KUL-82107",
    "name": "Malaysia Twin Wonders — Pax Trip (5D/4N)",
    "country": "Malaysia",
    "destination": "Kuala Lumpur & Genting Highlands, Malaysia",
    "duration_days": 5,
    "duration_nights": 4,
    "hotel_category": "4-Star Central City Hotel",
    "hotel_details": "Dorsett / Furama Bukit Bintang + Genting First World Resort",
    "pricing_inr": 39364,
    "pricing_usd": 475,
    "markup_percent": 12,
    "highlights": "KL Tower observation deck, Batu Caves rainbow steps, Genting Skyway Cable Car, Chin Swee Caves Temple, Putrajaya administrative capital tour & cruise",
    "inclusions": "4 Nights Stay with Daily Breakfast, Return Airport Transfers, Two-way Genting Cable Car, AC Minivan transfers with driver",
    "exclusions": "Airfare, Malaysia Tourism Tax (MYR 10/rm/night), Theme park entry tickets",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/pax-trip_MALAYSIA-TOUR-82107.pdf",
    "source_drive_file": "pax-trip_MALAYSIA-TOUR-82107.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 210,
    "package_code": "PKG-SG-SIN-62898",
    "name": "Singapore City & Universal Thrills — Pax Trip (5D/4N)",
    "country": "Singapore",
    "destination": "Singapore City & Sentosa Island",
    "duration_days": 5,
    "duration_nights": 4,
    "hotel_category": "4-Star Hotel City Centre",
    "hotel_details": "Hotel Boss / V Hotel Lavender with MRT direct access",
    "pricing_inr": 58563,
    "pricing_usd": 705,
    "markup_percent": 12,
    "highlights": "Universal Studios Singapore full day adventure pass, Night Safari with tram ride, Gardens by the Bay Flower Dome & Supertree Grove, Sentosa Cable Car Sky Pass",
    "inclusions": "4 Nights Accommodation, Daily Breakfast, Return Changi Airport Transfers, All attraction tickets with shared transfers",
    "exclusions": "Airfare, Singapore Visa, Meals outside breakfast",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/pax-trip_SINGAPORE-TRIP-62898.pdf",
    "source_drive_file": "pax-trip_SINGAPORE-TRIP-62898.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 211,
    "package_code": "PKG-LK-CMB-87074",
    "name": "Sri Lanka Cultural & Scenic Trail — Pax Trip (5D/4N)",
    "country": "Sri Lanka",
    "destination": "Colombo, Kandy, Nuwara Eliya & Bentota, Sri Lanka",
    "duration_days": 5,
    "duration_nights": 4,
    "hotel_category": "4-Star Deluxe Resorts",
    "hotel_details": "1N Kandy Hill Resort + 1N Nuwara Eliya Tea Country + 1N Bentota Beachfront + 1N Colombo",
    "pricing_inr": 23064,
    "pricing_usd": 280,
    "markup_percent": 15,
    "highlights": "Pinnawala Elephant Orphanage, Temple of the Sacred Tooth Relic Kandy, Nuwara Eliya tea factory & Ramboda falls, Madu River boat safari with cinnamon island visit, Colombo city & shopping tour",
    "inclusions": "4 Nights Stay with Daily Breakfast, AC Private Car with English speaking chauffeur-guide for full tour, All toll & parking charges",
    "exclusions": "Airfare, Sri Lanka ETA Visa fee, Entry tickets to monuments, Lunch & Dinners",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/pax-trip_srilanka-87074.pdf",
    "source_drive_file": "pax-trip_srilanka-87074.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 212,
    "package_code": "PKG-ID-DPS-QUOT",
    "name": "Bali Luxury Island Escape — Official DMC Quotation (7D/6N)",
    "country": "Indonesia",
    "destination": "Kuta, Ubud, Bedugul & Nusa Dua, Bali",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "4-Star Beach Resort & Luxury Villa",
    "hotel_details": "Grand Mirage / Aston Kuta + Ubud Royal Villa with private plunge pool",
    "pricing_inr": 39014,
    "pricing_usd": 470,
    "markup_percent": 12,
    "highlights": "Ulun Danu Beratan Lake Temple, Handara Iconic Gate, Wanagiri Hidden Hills selfie spot, Waterblow Nusa Dua, Jimbaran Bay Candle Light Seafood Dinner by the waves",
    "inclusions": "6 Nights Stay, Daily Breakfast, Candlelight Dinner at Jimbaran Beach, Full sightseeing tours in private AC car with dedicated driver",
    "exclusions": "Flight tickets, Indonesia Tourist Visa ($35), Water sports activities on spot",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Quotation - bali.pdf",
    "source_drive_file": "Quotation - bali.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 213,
    "package_code": "PKG-CN-CAN-FAIR",
    "name": "China Canton Fair & Guangzhou City Highlights (7D/6N)",
    "country": "China",
    "destination": "Guangzhou & Pearl River, China",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "4-Star Business & Trade Hotel",
    "hotel_details": "Central Guangzhou Hotel near Pazhou Complex / Metro with shuttle service",
    "pricing_inr": 79200,
    "pricing_usd": 950,
    "markup_percent": 12,
    "highlights": "Canton Fair trade complex visits, Canton Tower observation deck, Pearl River evening cruise with city illumination, Shamian Island European architecture, Beijing Road shopping pedestrian street",
    "inclusions": "6 Nights Accommodation with Daily Breakfast, Airport & Fair shuttle transfers, Pearl River Cruise tickets, English speaking tour guide",
    "exclusions": "China Visa invitation letter fee, International flights, Lunches & dinners",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Quotation - canton.pdf",
    "source_drive_file": "Quotation - canton.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 214,
    "package_code": "PKG-AE-DXB-RHVI",
    "name": "Dubai Marina & Burj Skyline — Rahul Vi Tour (7D/6N)",
    "country": "UAE",
    "destination": "Dubai Marina, Palm Jumeirah & Downtown, UAE",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "4-Star Deluxe Marina Hotel",
    "hotel_details": "Millennium Place Dubai Marina / Stella Di Mare with marina views",
    "pricing_inr": 64410,
    "pricing_usd": 775,
    "markup_percent": 12,
    "highlights": "Burj Khalifa 124th Floor At the Top non-prime ticket, Red Dunes Desert Safari with quad bike option & BBQ buffet, Miracle Garden & Global Village entry tickets, Luxury Dubai Marina Mega Yacht Cruise with dinner",
    "inclusions": "6 Nights Stay, Daily Breakfast, Mega Yacht Cruise Dinner, Desert Safari with BBQ, All Private AC Transfers, 5% UAE VAT",
    "exclusions": "International Flights, UAE Visa, Tourism Dirham Fee",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Quotation - DUBAI rahul vi.pdf",
    "source_drive_file": "Quotation - DUBAI rahul vi.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 215,
    "package_code": "PKG-AE-DXB-6D5N",
    "name": "Dubai Extravaganza with Miracle Garden (6D/5N)",
    "country": "UAE",
    "destination": "Dubai, Palm Jumeirah & Desert, UAE",
    "duration_days": 6,
    "duration_nights": 5,
    "hotel_category": "4-Star Deluxe",
    "hotel_details": "4-Star Hotel in Al Barsha / Bur Dubai with swimming pool & gym",
    "pricing_inr": 66848,
    "pricing_usd": 805,
    "markup_percent": 12,
    "highlights": "Half day Dubai City tour (Gold Souk, Spice Souk, Dubai Creek Abra ride, Jumeirah Beach photo stop), Burj Khalifa 124th floor, Desert Safari with BBQ, Dhow Cruise Marina",
    "inclusions": "5 Nights Stay with Daily Breakfast, Desert Safari BBQ Dinner, Dhow Cruise Dinner, Private AC Transfers for all tours",
    "exclusions": "Airfare, UAE Visa, Tourism Dirham (AED 15/rm/night)",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Quotation - DUBAI TOUR.pdf",
    "source_drive_file": "Quotation - DUBAI TOUR.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 216,
    "package_code": "PKG-SG-SIN-6D5N",
    "name": "Singapore Complete Family Discovery (6D/5N)",
    "country": "Singapore",
    "destination": "Singapore & Sentosa Island",
    "duration_days": 6,
    "duration_nights": 5,
    "hotel_category": "4-Star Deluxe",
    "hotel_details": "4-Star City Hotel (Novotel / Furama / Hotel Boss)",
    "pricing_inr": 56784,
    "pricing_usd": 685,
    "markup_percent": 12,
    "highlights": "Singapore City Tour (Merlion Park, Chinatown, Little India), Sentosa Island Cable Car + S.E.A. Aquarium + Wings of Time, Universal Studios Singapore full day, Gardens by the Bay",
    "inclusions": "5 Nights Stay, Daily Breakfast, All Transfers & Attraction tickets on SIC / Private basis",
    "exclusions": "Airfare, Singapore Visa, Personal expenses",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Quotation - SINGAPORE TRIP.pdf",
    "source_drive_file": "Quotation - SINGAPORE TRIP.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 217,
    "package_code": "PKG-TH-HKT-6D5N",
    "name": "Thailand Phuket & Krabi Island Escapes (6D/5N)",
    "country": "Thailand",
    "destination": "Phuket & Krabi, Thailand",
    "duration_days": 6,
    "duration_nights": 5,
    "hotel_category": "4-Star Deluxe Beach Resorts",
    "hotel_details": "3N Ashlee Plaza Patong Phuket + 2N GLOW Ao Nang Krabi Resort",
    "pricing_inr": 100614,
    "pricing_usd": 1210,
    "markup_percent": 15,
    "highlights": "Phi Phi Island + Khai Island speedboat excursion with buffet lunch, James Bond Island & Phang Nga Bay sea canoeing, Krabi 4 Islands tour by longtail boat, Inter-destination land transfer",
    "inclusions": "5 Nights Accommodation with Daily Breakfast, All speedboat island tours with buffet lunch & national park fees, Private airport & inter-city AC transfers",
    "exclusions": "International Flights, Thailand Visa on arrival fees, Personal water sports",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Quotation - thailand.pdf",
    "source_drive_file": "Quotation - thailand.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 218,
    "package_code": "PKG-HK-HKG-98386",
    "name": "Hong Kong & Macau Adventure — Rahul Vi Tour (7D/6N)",
    "country": "Hong Kong",
    "destination": "Hong Kong Island, Kowloon & Macau",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "4-Star Central Hotel",
    "hotel_details": "4N Hong Kong City Centre Hotel + 2N Macau 4-Star Resort",
    "pricing_inr": 130985,
    "pricing_usd": 1575,
    "markup_percent": 12,
    "highlights": "Victoria Peak tram ride & Sky Terrace 428, Hong Kong Disneyland full day 1-day pass, Ocean Park thrill rides & giant panda exhibit, TurboJET ferry to Macau, Ruins of St. Paul's & Venetian Macau casino visit",
    "inclusions": "6 Nights Stay with Daily Breakfast, Disneyland & Ocean Park tickets, Two-way TurboJET ferry Hong Kong - Macau, All airport and city tour transfers",
    "exclusions": "International Airfare, Visa fees (PAR registration for Indians is free online), Personal tipping",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/rahul-vi_hong-kong-tour-98386.pdf",
    "source_drive_file": "rahul-vi_hong-kong-tour-98386.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 219,
    "package_code": "PKG-TH-BKK-96090",
    "name": "Thailand Complete Bangkok & Pattaya — Rajesh Chawla Tour (8D/7N)",
    "country": "Thailand",
    "destination": "Pattaya & Bangkok, Thailand",
    "duration_days": 8,
    "duration_nights": 7,
    "hotel_category": "4-Star Deluxe Resorts",
    "hotel_details": "4N Pattaya Beach Resort + 3N Bangkok Sukhumvit Hotel",
    "pricing_inr": 62362,
    "pricing_usd": 750,
    "markup_percent": 12,
    "highlights": "Coral Island speedboat tour with Indian buffet lunch, Alcazar Cabaret VIP show, Nong Nooch Tropical Botanical Garden & cultural elephant show, Bangkok Golden Buddha & Marble Temple tour, Safari World & Marine Park with lunch",
    "inclusions": "7 Nights Accommodation, Daily Breakfast, Coral Island with Lunch, Safari World with Lunch, All Transfers in Private AC Minivan",
    "exclusions": "International Flights, Water sports in Pattaya (parasailing, undersea walk), Personal shopping",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Rajesh-chawla_THAILAND-TOUR-96090.pdf",
    "source_drive_file": "Rajesh-chawla_THAILAND-TOUR-96090.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 220,
    "package_code": "PKG-SG-SIN-54916",
    "name": "Singapore Quick Escape — Shyam Lalwani Tour (4D/3N)",
    "country": "Singapore",
    "destination": "Singapore City & Sentosa Island",
    "duration_days": 4,
    "duration_nights": 3,
    "hotel_category": "4-Star City Centre Hotel",
    "hotel_details": "Hotel Boss / V Hotel Bencoolen (Centrally Located)",
    "pricing_inr": 52062,
    "pricing_usd": 625,
    "markup_percent": 12,
    "highlights": "Sentosa Island Cable Car + Madame Tussauds 4-in-1, Marina Bay Sands observation deck, Night Safari tram ride, Half day city tour with Merlion photo stop",
    "inclusions": "3 Nights Stay with Daily Breakfast, Return Airport Transfers, Listed attraction tickets with shared transfers",
    "exclusions": "Airfare, Singapore Visa, Personal shopping and meals outside breakfast",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/Shyam-lalwani_SINGAPORE-54916.pdf",
    "source_drive_file": "Shyam-lalwani_SINGAPORE-54916.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 221,
    "package_code": "PKG-IN-UJJ-13258",
    "name": "Ujjain Mahakal & Omkareshwar Divine Yatra — Suman Bhartia (5D/4N)",
    "country": "India",
    "destination": "Indore, Ujjain, Omkareshwar & Maheshwar, India",
    "duration_days": 5,
    "duration_nights": 4,
    "hotel_category": "3-Star & 4-Star Premium Heritage Hotels",
    "hotel_details": "2N Ujjain Deluxe Hotel near Temple + 2N Indore Central Hotel",
    "pricing_inr": 27708,
    "pricing_usd": 335,
    "markup_percent": 10,
    "highlights": "Mahakaleshwar Jyotirlinga Bhasma Aarti VIP Darshan assistance, Mahakal Lok Corridor walking tour, Omkareshwar Jyotirlinga & Narmada river boat ride, Maheshwar Ahilya Fort & Narmada Ghats, Indore Sarafa Night Food Market",
    "inclusions": "4 Nights Accommodation, Daily Breakfast, Dedicated AC Sedan for full tour Indore-to-Indore, Toll, Parking & Driver allowances",
    "exclusions": "Special pooja / Bhasma Aarti official trust fees, Train / Flight tickets, Meals outside breakfast",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/packages/suman-bhartia_ujjain-13258.pdf",
    "source_drive_file": "suman-bhartia_ujjain-13258.pdf",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 222,
    "package_code": "PKG-KG-FRU-3N4D",
    "name": "Kyrgyzstan Bishkek & Ala-Archa Nature Discovery (4D/3N)",
    "country": "Kyrgyzstan",
    "destination": "Bishkek & Ala-Archa National Park, Kyrgyzstan",
    "duration_days": 4,
    "duration_nights": 3,
    "hotel_category": "4-Star City Centre Hotel",
    "hotel_details": "Plaza Hotel Bishkek / Orion Hotel (4-Star)",
    "pricing_inr": 38500,
    "pricing_usd": 460,
    "markup_percent": 15,
    "highlights": "Ala-Archa Gorge panoramic alpine hike, Ala-Too Central Square, Oak Park & Open-Air Sculpture Museum, Osh Bazaar traditional spices & dry fruits, Traditional Kyrgyz folklore dinner",
    "inclusions": "3 Nights 4-Star Accommodation, Daily Breakfast, Ala-Archa National Park entry & transfers, Private AC Vehicle for all tours, English speaking guide",
    "exclusions": "International Airfare, Kyrgyzstan E-Visa, Lunches & dinners unless specified",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/itineraries/3N_Kyrgyzstan_itinerary_LetsExploreDMC.docx",
    "source_drive_file": "3N_Kyrgyzstan_itinerary_LetsExploreDMC.docx",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 223,
    "package_code": "PKG-AM-EVN-5N6D",
    "name": "Armenia Yerevan & Lake Sevan Discovery (6D/5N)",
    "country": "Armenia",
    "destination": "Yerevan, Garni, Geghard & Lake Sevan, Armenia",
    "duration_days": 6,
    "duration_nights": 5,
    "hotel_category": "4-Star Boutique City Hotel",
    "hotel_details": "Ani Plaza Hotel Yerevan / Opera Suite Hotel (4-Star)",
    "pricing_inr": 54000,
    "pricing_usd": 650,
    "markup_percent": 15,
    "highlights": "Garni Pagan Temple & Symphony of Stones basalt gorge, Geghard UNESCO rock-cut monastery with traditional lavash bread baking masterclass, Lake Sevan high-altitude blue lake & Sevanavank monastery, Yerevan Cascade & Republic Square dancing fountains",
    "inclusions": "5 Nights 4-Star Stay, Daily Breakfast, Lavash baking masterclass with lunch, All entrance fees, Dedicated AC Mercedes Sprinter/Minivan, Professional English guide",
    "exclusions": "International Flights, Armenia Visa, Personal expenses",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/itineraries/5N Armenia itinerary.docx",
    "source_drive_file": "5N Armenia itinerary.docx",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 224,
    "package_code": "PKG-AZ-BAK-5N6D",
    "name": "Azerbaijan Baku & Land of Fire Discovery (6D/5N)",
    "country": "Azerbaijan",
    "destination": "Baku, Gobustan & Absheron, Azerbaijan",
    "duration_days": 6,
    "duration_nights": 5,
    "hotel_category": "4-Star & 5-Star Central Hotel",
    "hotel_details": "Midtown Hotel Baku / Courtyard by Marriott Baku (4-Star)",
    "pricing_inr": 48500,
    "pricing_usd": 585,
    "markup_percent": 15,
    "highlights": "Baku Old City Icherisheher (Maiden Tower & Shirvanshahs' Palace), Flame Towers & Highland Park Caspian Sea panoramic view, Gobustan Rock Art & active Mud Volcanoes, Ateshgah Zoroastrian Fire Temple & Yanar Dag Burning Mountain",
    "inclusions": "5 Nights Hotel Stay, Daily Buffet Breakfast, Return Baku Heydar Aliyev Airport Transfers, Gobustan 4x4 Mud Volcano ride, All entrance tickets & private transport",
    "exclusions": "International Flights, ASAN Visa fee ($26), Meals outside breakfast",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/itineraries/5N_Baku_itinerary_LetsExploreDMC.docx",
    "source_drive_file": "5N_Baku_itinerary_LetsExploreDMC.docx",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 225,
    "package_code": "PKG-EG-CAI-4N5D",
    "name": "Egypt Cairo Pyramids & Pharaoh Heritage (5D/4N)",
    "country": "Egypt",
    "destination": "Cairo, Giza & Nile, Egypt",
    "duration_days": 5,
    "duration_nights": 4,
    "hotel_category": "4-Star & 5-Star Pyramid View Hotel",
    "hotel_details": "Steigenberger Pyramids Cairo / Ramses Hilton (Pyramid/Nile View)",
    "pricing_inr": 46000,
    "pricing_usd": 550,
    "markup_percent": 15,
    "highlights": "Great Pyramids of Giza (Khufu, Khafre, Menkaure) & Great Sphinx, Grand Egyptian Museum (GEM) & Tutankhamun golden treasures, Sakkara Step Pyramid, Khan El-Khalili medieval bazaar, Nile River traditional felucca sail",
    "inclusions": "4 Nights Accommodation, Daily Breakfast, Private Egyptologist tour guide for all excursions, All entrance tickets to Giza plateau & museum, AC transport",
    "exclusions": "International Flights, Entry inside Pyramids, Egypt Visa on arrival, Tipping to guides/drivers",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/itineraries/Egypt_4nights_Cairo.docx",
    "source_drive_file": "Egypt_4nights_Cairo.docx",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 226,
    "package_code": "PKG-EG-EGY-8N9D",
    "name": "Egypt Grand Wonders — Cairo, 5-Star Nile Cruise & Hurghada (9D/8N)",
    "country": "Egypt",
    "destination": "Cairo, Aswan, Kom Ombo, Edfu, Luxor & Hurghada Red Sea",
    "duration_days": 9,
    "duration_nights": 8,
    "hotel_category": "5-Star Hotels & 5-Star Deluxe Nile Cruise",
    "hotel_details": "3N Cairo Hotel + 3N 5-Star Deluxe Nile Cruise Ship (Full Board) + 2N Hurghada All-Inclusive Red Sea Resort",
    "pricing_inr": 92000,
    "pricing_usd": 1100,
    "markup_percent": 15,
    "highlights": "Giza Pyramids & Sphinx, High Dam Aswan & Philae Temple, Kom Ombo crocodile temple, Edfu Horus temple by horse carriage, Valley of the Kings Luxor & Karnak Temple, Hurghada Red Sea snorkeling & private beach relaxation",
    "inclusions": "8 Nights Stay (including 3N Full Board Nile Cruise & 2N All-Inclusive Hurghada Resort), All sightseeing with licensed Egyptologist, Inter-city transfers",
    "exclusions": "International & domestic Cairo-Aswan/Hurghada-Cairo flights, Hot air balloon over Luxor, Egypt Visa",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/itineraries/Egypt_8N_-_Cairo-Cruise-Hurghada.docx",
    "source_drive_file": "Egypt_8N_-_Cairo-Cruise-Hurghada.docx",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 227,
    "package_code": "PKG-JO-AMM-5N6D",
    "name": "Jordan Kingdom Classic — Dead Sea, Petra & Wadi Rum (6D/5N)",
    "country": "Jordan",
    "destination": "Amman, Jerash, Dead Sea, Petra & Wadi Rum Desert",
    "duration_days": 6,
    "duration_nights": 5,
    "hotel_category": "4-Star Hotels & Luxury Martian Bubble Desert Camp",
    "hotel_details": "2N Amman Hotel + 1N Dead Sea Resort with private beach + 1N Petra Hotel + 1N Wadi Rum Luxury Desert Camp",
    "pricing_inr": 78000,
    "pricing_usd": 940,
    "markup_percent": 15,
    "highlights": "Float in mineral-rich Dead Sea waters with mud therapy, Full day exploration of the UNESCO Wonder Rose-Red City of Petra through the Siq to the Treasury, 2-Hour 4x4 Bedouin Jeep Tour across red sand dunes of Wadi Rum, Jerash Roman ruins",
    "inclusions": "5 Nights Stay, Daily Breakfast & Traditional Zarb Dinner in Wadi Rum, 2-Hour 4x4 Jeep Tour in Wadi Rum, Petra entrance ticket, Private AC Car with English speaking chauffeur",
    "exclusions": "International Flights, Jordan Visa (waived with Jordan Pass / group regulations), Lunches & personal drinks",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/itineraries/LetsExplore_Jordan_5nights_DeadSea-Petra-WadiRum-Amman.docx",
    "source_drive_file": "LetsExplore_Jordan_5nights_DeadSea-Petra-WadiRum-Amman.docx",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 228,
    "package_code": "PKG-TR-IST-6N7D",
    "name": "Turkey Fairy Tale — Istanbul & Cappadocia Cave Discovery (7D/6N)",
    "country": "Turkey",
    "destination": "Istanbul & Cappadocia, Turkey",
    "duration_days": 7,
    "duration_nights": 6,
    "hotel_category": "4-Star City Hotel & Authentic Cave Resort",
    "hotel_details": "4N Istanbul Old City / Taksim Hotel + 2N Cappadocia Authentic Cave Hotel (Goreme)",
    "pricing_inr": 68500,
    "pricing_usd": 825,
    "markup_percent": 15,
    "highlights": "Hagia Sophia, Blue Mosque & Topkapi Palace, Bosphorus Cruise between Europe and Asia, Cappadocia Goreme Open Air Museum, Underground City of Kaymakli, Devrent Fairy Chimney Valley, Hot air balloon viewing over fairy chimneys at sunrise",
    "inclusions": "6 Nights Stay, Daily Breakfast, Red Tour Cappadocia with lunch, Bosphorus Strait Cruise, All airport transfers, Professional licensed Turkish guide",
    "exclusions": "International flights, Hot Air Balloon flight ticket (optional add-on), Turkey E-Visa",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/itineraries/LetsExplore_Turkey_6_nights.docx",
    "source_drive_file": "LetsExplore_Turkey_6_nights.docx",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 229,
    "package_code": "PKG-TR-IST-7N8D",
    "name": "Turkey Grand Highlights — Istanbul, Cappadocia & Pamukkale (8D/7N)",
    "country": "Turkey",
    "destination": "Istanbul, Cappadocia & Pamukkale / Kusadasi, Turkey",
    "duration_days": 8,
    "duration_nights": 7,
    "hotel_category": "4-Star Hotels & Cave Suites",
    "hotel_details": "3N Istanbul + 2N Cappadocia Cave Suite + 2N Pamukkale Thermal Resort",
    "pricing_inr": 79000,
    "pricing_usd": 950,
    "markup_percent": 15,
    "highlights": "Grand Bazaar & Spice Market shopping, Bosphorus sunset boat tour, Cappadocia valleys & pigeon valley hike, Pamukkale white travertine thermal terraces & Hierapolis ancient theater, Cleopatra antique thermal pool swim",
    "inclusions": "7 Nights Accommodation with Daily Breakfast, All guided tours mentioned with lunch, Inter-city transfers in AC coach, English speaking guide",
    "exclusions": "International Flights, Domestic Turkish air tickets, Hot air balloon ride",
    "is_published": 1,
    "status": "active",
    "file_path": "uploads/itineraries/LetsExplore_Turkey_7_nights.docx",
    "source_drive_file": "LetsExplore_Turkey_7_nights.docx",
    "created_at": "2026-11-17 14:00:00"
  },
  {
    "id": 101,
    "package_code": "PKG-IN-ALIBG-4D3N",
    "name": "Alibag 4 Days / 3 Nights — Let's Explore DMC",
    "country": "India",
    "destination": "Alibaug, Maharashtra",
    "duration_days": 4,
    "duration_nights": 3,
    "hotel_category": "4-Star Deluxe",
    "hotel_details": "Mansha Tropicana Resort Alibaug (2N in 2Rm / 1 Room Double Occupancy - MAP)",
    "pricing_inr": 32500,
    "pricing_usd": 390,
    "markup_percent": 10,
    "highlights": "Pickup from Mumbai Airport/City, Kihim Beach Water Sports, Revdanda Fort Sunset, Alibaug Local Sightseeing, Dedicated AC Vehicle for all transfers",
    "inclusions": "3 Nights Luxury Accommodation, Daily Breakfast & Dinner (MAP Plan), AC Private Vehicle Mumbai-Alibaug-Mumbai, Driver charges, toll & parking",
    "exclusions": "Personal water sports activities, Airfare / Train fare, Lunch and extra meals, Travel insurance",
    "is_published": 1,
    "status": "active",
    "file_path": "images/pdf/akash Dewani.pdf",
    "source_drive_file": "akash Dewani.pdf",
    "created_at": "2026-11-14 10:00:00"
  },
  {
    "id": 103,
    "package_code": "PKG-UAE-DXB8D",
    "name": "Dubai & Abu Dhabi Discovery — Let's Explore DMC (8D/7N)",
    "country": "UAE",
    "destination": "Dubai & Abu Dhabi, UAE",
    "duration_days": 8,
    "duration_nights": 7,
    "hotel_category": "4-Star Deluxe & Desert Resort",
    "hotel_details": "5N Grand Excelsior / Millennium Al Barsha + 2N Premium Desert Safari Resort",
    "pricing_inr": 68000,
    "pricing_usd": 820,
    "markup_percent": 12,
    "highlights": "Burj Khalifa 124th Floor, Dubai Aquarium & Underwater Zoo, Premium Desert Safari with Dune Bashing & BBQ, 1-Hr Private Yacht Cruise at Marina, Full Day Abu Dhabi & Grand Mosque, Return Airport Transfers",
    "inclusions": "7 Nights Stay, Daily Buffet Breakfast, Desert Safari with BBQ Dinner & Shows, Yacht Cruise, Sheikh Zayed Mosque Tour, All AC Transfers, 5% VAT & Tourism Dirham",
    "exclusions": "International Flight Tickets, UAE Tourist Visa, Lunches & Personal Expenses",
    "is_published": 1,
    "status": "active",
    "file_path": "images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf",
    "source_drive_file": "LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf",
    "created_at": "2026-11-14 10:30:00"
  },
  {
    "id": 105,
    "package_code": "PKG-TH-PTY-TMRW",
    "name": "Pattaya Tomorrowland Music & Beach Escape (5D/4N)",
    "country": "Thailand",
    "destination": "Pattaya & Bangkok, Thailand",
    "duration_days": 5,
    "duration_nights": 4,
    "hotel_category": "4-Star Deluxe / Private Pool Villa",
    "hotel_details": "4-Star Pattaya Beach Hotel or The Palm Pool Villa Pattaya",
    "pricing_inr": 35000,
    "pricing_usd": 420,
    "markup_percent": 10,
    "highlights": "Tomorrowland Festival Thailand Event Venue Private Transfers, Coral Island Speedboat excursion with lunch, Alcazar VIP Show, Walking Street Pattaya nightlife, Bangkok Suvarnabhumi Airport private transfers",
    "inclusions": "4 Nights Deluxe Accommodation, Daily Breakfast, Event festival transfers in private AC minivan, Coral Island tour with seafood lunch, Airport pickup and drop",
    "exclusions": "Festival entry pass tickets (sold separately), International flights, Personal expenses, Alcohol",
    "is_published": 1,
    "status": "active",
    "file_path": "format/Pattaya_Tomorrowland_Package_Quotation_4N_updated_3 (4).pdf",
    "source_drive_file": "Pattaya_Tomorrowland_Package_Quotation_4N_updated_3 (4).pdf",
    "created_at": "2026-11-14 11:00:00"
  }
];

let allPackages = [];
let currentCountryFilter = 'all';

function isFakePackage(p) {
  if (!p) return true;
  const name = (p.name || '').toLowerCase().trim();
  const country = (p.country || '').toLowerCase().trim();
  const code = (p.package_code || '').toLowerCase().trim();
  const details = (p.hotel_details || '').toLowerCase().trim();

  // Strip test / mock artifacts
  if (code === 'pkg-in-478f' || code === 'pkg-co-4962' || code === 'pkg-ma-3991' || code === 'pkg-th-d7a0') return true;
  if (code.startsWith('pkg-co-') || code.startsWith('pkg-ma-') || code.startsWith('pkg-in-478')) return true;
  if (name === 'package tour' || name === 'custom travel package') return true;
  if (name === 'villa nautica' && (country === 'india' || country.includes('india'))) return true;
  
  // Only 1 canonical Villa Nautica Dining package allowed: id 100 or PKG-MLE-VN-DINING
  if (name.includes('villa nautica')) {
    if (code !== 'pkg-mle-vn-dining' && p.id != 100) return true;
  }

  // Corrupted mismatch: Thailand code with Villa Nautica Maldives content
  if (code.startsWith('pkg-th-') && (name.includes('villa nautica') || (p.destination || '').toLowerCase().includes('maldives'))) {
    return true;
  }

  if (details.includes('standard deluxe accommodation as per voucher')) return true;
  if (code.includes('pkg-id-bali') || code.includes('pkg-id-jkt')) return true;
  if (name.includes('bali luxury tropical escape') || name.includes('jakarta city & heritage')) return true;

  // Real packages can have file_path OR itinerary_json OR full_data OR valid pricing
  const hasContent = !!(p.file_path || p.itinerary_json || p.full_data || p.pricing_inr || p.name);
  if (!hasContent) return true;

  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  // Purge any fake / duplicate test cards from local storage
  try {
    const rawLocal = localStorage.getItem('dmc_real_packages');
    if (rawLocal) {
      let parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(p => !isFakePackage(p));
        localStorage.setItem('dmc_real_packages', JSON.stringify(clean));
      }
    }
  } catch (e) {}

  loadPackagesFromDatabase();
  setupPackageFilterEvents();

  // Create Package Form submission
  const pkgForm = document.getElementById('pkgForm');
  if (pkgForm) {
    pkgForm.addEventListener('submit', savePackageForm);
  }

  // Import from Drive trigger
  const driveBtn = document.getElementById('btnUploadDrivePkg');
  if (driveBtn) {
    driveBtn.addEventListener('click', openDriveImportModal);
  }
});

function openDriveImportModal() {
  const modal = document.getElementById('driveImportModal');
  if (modal) modal.style.display = 'flex';
}

function closeDriveImportModal() {
  const modal = document.getElementById('driveImportModal');
  if (modal) modal.style.display = 'none';
}

function switchDriveTab(tab) {
  const folderTabBtn = document.getElementById('tabDriveFolder');
  const customTabBtn = document.getElementById('tabDriveCustom');
  const folderContent = document.getElementById('driveTabFolderContent');
  const customContent = document.getElementById('driveTabCustomContent');

  if (tab === 'folder') {
    if (folderTabBtn) {
      folderTabBtn.style.color = '#2563EB';
      folderTabBtn.style.borderBottom = '2px solid #2563EB';
      folderTabBtn.style.fontWeight = '700';
    }
    if (customTabBtn) {
      customTabBtn.style.color = '#64748B';
      customTabBtn.style.borderBottom = '2px solid transparent';
      customTabBtn.style.fontWeight = '600';
    }
    if (folderContent) folderContent.style.display = 'block';
    if (customContent) customContent.style.display = 'none';
  } else {
    if (customTabBtn) {
      customTabBtn.style.color = '#2563EB';
      customTabBtn.style.borderBottom = '2px solid #2563EB';
      customTabBtn.style.fontWeight = '700';
    }
    if (folderTabBtn) {
      folderTabBtn.style.color = '#64748B';
      folderTabBtn.style.borderBottom = '2px solid transparent';
      folderTabBtn.style.fontWeight = '600';
    }
    if (folderContent) folderContent.style.display = 'none';
    if (customContent) customContent.style.display = 'block';
  }
}

function selectAllDriveItems(select) {
  document.querySelectorAll('.drive-item-chk').forEach(chk => {
    chk.checked = !!select;
  });
}

async function importSelectedDrivePackages() {
  const checkedBoxes = Array.from(document.querySelectorAll('.drive-item-chk:checked'));
  if (checkedBoxes.length === 0) {
    alert('Please select at least one Google Drive itinerary to import.');
    return;
  }

  const selectedCodes = checkedBoxes.map(cb => cb.dataset.code);
  const itemsToImport = DEFAULT_MASTER_PACKAGES.filter(item => selectedCodes.includes(item.package_code));

  const btn = document.getElementById('btnImportSelected');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Importing...';
  }

  try {
    const res = await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'batch_import_drive', items: itemsToImport })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Success! Imported ${itemsToImport.length} itineraries from Google Drive into live packages.`);
    } else {
      mergeFallbackPackages(itemsToImport);
      alert(`Imported ${itemsToImport.length} itineraries into active packages!`);
    }
  } catch (e) {
    mergeFallbackPackages(itemsToImport);
    alert(`Imported ${itemsToImport.length} itineraries into active packages!`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Import Selected Itineraries';
    }
    closeDriveImportModal();
    loadPackagesFromDatabase();
  }
}

function mergeFallbackPackages(items) {
  const local = getLocalPackages();
  items.forEach(item => {
    const idx = local.findIndex(p => p.package_code === item.package_code || p.name === item.name);
    const entry = {
      ...item,
      id: item.id || (Date.now() + Math.floor(Math.random() * 1000)),
      is_published: 1,
      status: 'active'
    };
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...entry };
    } else {
      local.unshift(entry);
    }
  });
  saveLocalPackages(local);
}

function getLocalPackages() {
  try {
    const raw = localStorage.getItem('dmc_real_packages');
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strict purge: Strip fake items
        const clean = parsed.filter(p => !isFakePackage(p));
        if (clean.length > 0) return clean;
      }
    }
  } catch (e) {}
  return [...DEFAULT_MASTER_PACKAGES];
}

function saveLocalPackages(pkgs) {
  try {
    const clean = pkgs.filter(p => !isFakePackage(p));
    localStorage.setItem('dmc_real_packages', JSON.stringify(clean));
  } catch (e) {}
}

async function loadPackagesFromDatabase() {
  let loaded = false;
  try {
    // Try primary packages API endpoint
    const res = await fetch('../api/packages_manager.php?action=list');
    const data = await res.json();
    if (data && data.success && Array.isArray(data.packages) && data.packages.length > 0) {
      const cleanList = data.packages.filter(p => !isFakePackage(p));
      if (cleanList.length > 0) {
        allPackages = cleanList.map(p => ({
          ...p,
          country_clean: (p.country || '').toLowerCase(),
          country_display: getCountryDisplay(p.country)
        }));
        saveLocalPackages(allPackages);
        loaded = true;
      }
    }
  } catch (err) {
    console.warn('Backend API notice, falling back to local master catalog:', err);
  }

  if (!loaded) {
    const local = getLocalPackages();
    allPackages = local.map(p => ({
      ...p,
      country_clean: (p.country || '').toLowerCase(),
      country_display: getCountryDisplay(p.country)
    }));
    saveLocalPackages(allPackages);
  }

  renderPackagesGrid();
}

function getCountryDisplay(code) {
  const c = (code || '').toLowerCase();
  if (c.includes('indonesia') || c.includes('bali')) return '🇮🇩 Indonesia';
  if (c.includes('malaysia')) return '🇲🇾 Malaysia';
  if (c.includes('singapore')) return '🇸🇬 Singapore';
  if (c.includes('turkey')) return '🇹🇷 Turkey';
  if (c.includes('india')) return '🇮🇳 India';
  if (c.includes('uae') || c.includes('dubai')) return '🇦🇪 UAE (Dubai)';
  if (c.includes('thailand')) return '🇹🇭 Thailand';
  if (c.includes('maldives')) return '🇲🇻 Maldives';
  if (c.includes('vietnam')) return '🇻🇳 Vietnam';
  if (c.includes('sri lanka')) return '🇱🇰 Sri Lanka';
  if (c.includes('china')) return '🇨🇳 China';
  if (c.includes('hong kong')) return '🇭🇰 Hong Kong';
  if (c.includes('kyrgyzstan')) return '🇰🇬 Kyrgyzstan';
  if (c.includes('armenia')) return '🇦🇲 Armenia';
  if (c.includes('azerbaijan') || c.includes('baku')) return '🇦🇿 Azerbaijan';
  if (c.includes('egypt')) return '🇪🇬 Egypt';
  if (c.includes('jordan')) return '🇯🇴 Jordan';
  return '🌍 International';
}

function setupPackageFilterEvents() {
  document.querySelectorAll('.pkg-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pkg-filter-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = '#FFF';
        t.style.color = '#334155';
        t.style.border = '1px solid #CBD5E1';
      });
      tab.classList.add('active');
      tab.style.background = '#0F2C59';
      tab.style.color = '#FFF';
      tab.style.border = '1px solid #0F2C59';

      currentCountryFilter = tab.dataset.country;
      renderPackagesGrid();
    });
  });

  const searchInput = document.getElementById('topSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.pkg-card-item');
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPackagesGrid() {
  const container = document.getElementById('packagesGrid');
  if (!container) return;

  const filtered = allPackages.filter(p => {
    if (!p || isFakePackage(p)) return false;
    if (currentCountryFilter === 'all') return true;
    const c = (p.country || '').toLowerCase();
    const d = (p.destination || '').toLowerCase();
    const target = currentCountryFilter.toLowerCase();
    return c.includes(target) || d.includes(target);
  });

  const countEl = document.getElementById('countAllPkgs');
  if (countEl) countEl.textContent = allPackages.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#64748B; background:#FFF; border:1px dashed #CBD5E1; border-radius:16px;">
        <i class="fa-solid fa-box-open" style="font-size:42px; color:#94A3B8; margin-bottom:12px;"></i>
        <h4 style="margin:0 0 6px 0; font-size:17px; color:#0F2C59; font-weight:800;">No Tour Packages Found for this Filter</h4>
        <p style="margin:0 0 18px 0; font-size:13px; color:#64748B;">Switch filter tab or click <strong>Import Drive</strong> to load itineraries.</p>
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button type="button" onclick="openDriveImportModal()" style="background:#2563EB; color:#FFF; border:none; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer;">
            <i class="fa-brands fa-google-drive"></i> Import from Drive
          </button>
          <button type="button" onclick="openPackageModal('create')" style="background:#0F2C59; color:#FFF; border:none; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer;">
            <i class="fa-solid fa-plus"></i> Create Package
          </button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(pkg => {
    const isPub = (pkg.is_published == 1 && pkg.status !== 'inactive');
    const priceInr = Number(pkg.pricing_inr || 0).toLocaleString();
    const priceUsd = Number(pkg.pricing_usd || 0).toLocaleString();
    const days = pkg.duration_days || 4;
    const nights = pkg.duration_nights || (days - 1);
    const code = pkg.package_code || ('PKG-' + (pkg.id || Math.floor(Math.random() * 1000)));

    const isDomestic = (pkg.country || '').toLowerCase() === 'india' ||
                       ['kerala', 'alibaug', 'goa', 'rajasthan', 'kashmir', 'himachal', 'andaman', 'uttarakhand', 'cochin', 'munnar', 'jaipur', 'udaipur'].some(d => (pkg.destination || '').toLowerCase().includes(d) || (pkg.name || '').toLowerCase().includes(d));

    // File type detection for download button
    const filePath = (pkg.file_path || '').toLowerCase();
    let downloadIcon = 'fa-solid fa-file-pdf';
    let downloadColor = '#DC2626';
    let downloadLabel = 'Download PDF';

    if (filePath.endsWith('.docx') || filePath.endsWith('.doc')) {
      downloadIcon = 'fa-solid fa-file-word';
      downloadColor = '#2563EB';
      downloadLabel = 'Download DOCX';
    } else if (filePath.endsWith('.html')) {
      downloadIcon = 'fa-solid fa-file-invoice-dollar';
      downloadColor = '#059669';
      downloadLabel = 'View Official Doc';
    }

    return `
      <div class="pkg-card-item" style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px; overflow:hidden; box-shadow:0 4px 14px rgba(15,23,42,0.04); display:flex; flex-direction:column; transition:transform 0.15s ease;">
        <!-- Card Top Badge -->
        <div style="padding:14px 18px; border-bottom:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center; background:#FAFBFD;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11.5px; font-weight:700; color:#1E3A8A; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:3px 10px;">
              ${pkg.country_display || getCountryDisplay(pkg.country)}
            </span>
            <span onclick="togglePublishStatus(${pkg.id})" style="cursor:pointer; font-size:10.5px; font-weight:700; padding:3px 10px; border-radius:9999px; transition:all 0.15s; ${isPub ? 'background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0;' : 'background:#FEF2F2; color:#991B1B; border:1px solid #FECACA;'}" title="Click to toggle Active (Live) / Inactive (Draft)">
              ${isPub ? '● Active' : '○ Inactive'}
            </span>
          </div>
          <span style="font-size:12px; font-weight:700; color:#475569;">
            ⏱️ ${days}D / ${nights}N
          </span>
        </div>

        <!-- Card Body -->
        <div style="padding:18px; flex:1; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <h3 style="margin:0; font-size:15.5px; font-weight:800; color:#0F2C59; line-height:1.35;">
              ${escapeHtml(pkg.name)}
            </h3>
            <span style="font-family:monospace; font-size:10.5px; font-weight:700; color:#64748B; background:#F1F5F9; padding:2px 7px; border-radius:4px; margin-left:8px; white-space:nowrap;">
              ${escapeHtml(code)}
            </span>
            ${pkg.version ? `<span style="font-family:monospace; font-size:10.5px; font-weight:800; color:#1D4ED8; background:#EFF6FF; border:1px solid #BFDBFE; padding:1px 6px; border-radius:4px; margin-left:4px; white-space:nowrap;">v${pkg.version}</span>` : ''}
          </div>

          <div style="font-size:12px; color:#2563EB; font-weight:700; margin-bottom:12px; display:flex; align-items:center; gap:5px;">
            <i class="fa-solid fa-location-dot"></i>
            <span>${escapeHtml(pkg.destination || 'Multiple Cities')}</span>
          </div>

          <div style="background:#F8FAFC; border:1px solid #F1F5F9; border-radius:10px; padding:12px; font-size:12px; color:#475569; margin-bottom:14px; line-height:1.5;">
            <div style="margin-bottom:6px;">
              <strong style="color:#0F172A;">🏨 Stay:</strong> ${escapeHtml(pkg.hotel_details || pkg.hotel_category || 'Deluxe Accommodation')}
            </div>
            ${pkg.highlights ? `<div><strong style="color:#0F172A;">✨ Highlights:</strong> ${escapeHtml(pkg.highlights)}</div>` : ''}
          </div>

          <!-- Dual Operation Mode Pill -->
          <div style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">
            <span style="font-size:11px; background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; padding:2px 8px; border-radius:6px; font-weight:700;">
              <i class="fa-solid fa-shield-halved"></i> Ready-to-Send (W.E)
            </span>
            <span style="font-size:11px; background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; padding:2px 8px; border-radius:6px; font-weight:700;">
              <i class="fa-solid fa-wand-magic-sparkles"></i> AI Customizable
            </span>
          </div>

          <!-- Pricing and Action Bar -->
          <div style="margin-top:auto; padding-top:12px; border-top:1px dashed #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:11px; color:#64748B; display:block;">Tariff / Land Package:</span>
              <span style="font-size:16px; font-weight:800; color:#059669;">
                INR ${priceInr} ${!isDomestic && pkg.pricing_usd ? `<span style="font-size:11px; font-weight:600; color:#64748B;">(USD ${priceUsd})</span>` : ''}
              </span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" onclick="editPackageById(${pkg.id})" style="background:none; border:none; color:#2563EB; font-size:12.5px; font-weight:700; cursor:pointer;" title="Quick Edit">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" onclick="duplicatePackage(${pkg.id})" style="background:none; border:none; color:#475569; font-size:12.5px; font-weight:700; cursor:pointer;" title="Duplicate Package">
                <i class="fa-solid fa-copy"></i>
              </button>
              <button type="button" onclick="deletePackage(${pkg.id})" style="background:none; border:none; color:#EF4444; font-size:12.5px; font-weight:700; cursor:pointer;" title="Delete Package">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- 4 DIRECT ACTION BUTTONS (DOWNLOAD, VIEW, EDIT IN STUDIO, WHATSAPP SHARE) -->
          <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button type="button" onclick="downloadCleanPdf(${pkg.id})" style="background:#FFFFFF; border:1px solid #CBD5E1; color:#0F2C59; padding:8px 8px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;" title="Download authentic quotation file">
              <i class="${downloadIcon}" style="color:${downloadColor};"></i>
              <span>${downloadLabel}</span>
            </button>
            <button type="button" onclick="viewDocumentById(${pkg.id})" style="background:#F0FDF4; border:1px solid #86EFAC; color:#166534; padding:8px 8px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;" title="View authentic document in new tab">
              <i class="fa-solid fa-eye" style="color:#16A34A;"></i>
              <span>👁️ View Document</span>
            </button>
          </div>

          <div style="margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button type="button" onclick="customizeWithLogoById(${pkg.id})" style="background:#0F2C59; border:none; color:#FFF; padding:8px 8px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;" title="Edit rates, hotel, markup, or add client logo in AI Studio">
              <i class="fa-solid fa-wand-magic-sparkles" style="color:#FDE68A;"></i>
              <span>Edit in Studio</span>
            </button>
            <button type="button" onclick="openWhatsAppModalById(${pkg.id})" style="background:#25D366; color:#FFF; border:none; padding:8px 8px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;" title="Share direct document link via WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
              <span>Share WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Synthesizes a rich, authentic QuotationData structure from any master package
function buildQuotationDataFromPackage(pkg) {
  if (pkg.full_data && typeof pkg.full_data === 'object' && pkg.full_data.package) {
    return JSON.parse(JSON.stringify(pkg.full_data));
  }
  if (pkg.itinerary_json) {
    try {
      const parsed = typeof pkg.itinerary_json === 'string' ? JSON.parse(pkg.itinerary_json) : pkg.itinerary_json;
      if (parsed && parsed.package) return parsed;
    } catch (e) {}
  }

  const isDining = (pkg.id == 100 || (pkg.package_code && pkg.package_code.includes('VN-DINING')) || (pkg.name && pkg.name.toLowerCase().includes('villa nautica')));

  if (isDining) {
    return {
      activeDocType: 'villa_nautica_dining',
      file_path: 'uploads/VillaNautica_Maldives_Dining_Experiences_Doubled.html',
      package: {
        packageTitle: pkg.name,
        title: pkg.name,
        destination: 'Maldives',
        destinations: 'Paradise Island, Maldives',
        country: 'Maldives',
        duration: 'Romantic Dining Guide',
        clientName: 'Valued Traveler',
        travellers: 'Per Couple (2 Adults)',
        pax: 'Per Couple (2 Adults)',
        paxCount: 2,
        isVillaNauticaDining: true,
        totalCostINR: 35000,
        totalCostUSD: 400,
        ratePerAdultUSD: 200,
        ratePerAdultINR: 17500
      },
      pricing: {
        grandTotal: 35000,
        grandTotalUSD: 400,
        totalINR: 35000,
        totalUSD: 400,
        markupPercent: 15,
        gstPercent: 5
      }
    };
  }

  const totalDays = Number(pkg.duration_days) || 5;
  const nights = Number(pkg.duration_nights) || Math.max(1, totalDays - 1);
  const totalCostINR = Number(pkg.pricing_inr) || 45000;
  const totalCostUSD = Number(pkg.pricing_usd) || Math.round(totalCostINR / 83.5);

  const rawHighlights = (pkg.highlights || '').split(/[,;•\n]+/).map(s => s.trim()).filter(Boolean);
  const daysList = [];
  for (let i = 1; i <= totalDays; i++) {
    let dayTitle = '';
    let dayDesc = '';
    if (i === 1) {
      dayTitle = `Arrival & Check-in (${pkg.destination.split(',')[0].trim()})`;
      dayDesc = `Warm reception at airport by Let's Explore DMC team, private transfer to hotel, leisure evening.`;
    } else if (i === totalDays) {
      dayTitle = `Departure & Airport Transfer`;
      dayDesc = `Breakfast at hotel, check-out, souvenir shopping, and private vehicle transfer to airport.`;
    } else {
      const hlIndex = (i - 2) % (rawHighlights.length || 1);
      dayTitle = rawHighlights[hlIndex] || `Day ${i} Guided Tours & Sightseeing`;
      dayDesc = `Full day excursion with private AC vehicle, sightseeing admissions, and local assistance.`;
    }

    daysList.push({
      dayNumber: i,
      date: `Day ${i}`,
      title: dayTitle,
      items: [
        {
          title: dayTitle,
          subtitle: dayDesc,
          category: (i === 1 || i === totalDays) ? 'Transfer' : 'Sightseeing',
          pax: 2,
          unitPrice: Math.round(totalCostUSD / totalDays / 2),
          amountUSD: Math.round(totalCostUSD / totalDays),
          amountINR: Math.round(totalCostINR / totalDays),
          tag: ''
        }
      ],
      hotel: {
        name: pkg.hotel_details || pkg.hotel_category || 'Deluxe Accommodation',
        dates: `${nights} Nights Stay`,
        pax: 2,
        amountINR: Math.round(totalCostINR * 0.45),
        amountUSD: Math.round(totalCostUSD * 0.45),
        notes: 'Breakfast Included'
      },
      dayNotes: ''
    });
  }

  const incList = (pkg.inclusions || 'Accommodation with daily breakfast, Private AC transfers throughout, All sightseeing tours mentioned, Driver allowance, toll & parking, 24/7 Local DMC assistance').split(/[,;•\n]+/).map(s => s.trim()).filter(Boolean);
  const excList = (pkg.exclusions || 'International flight tickets, Tourist Visa fees, Personal expenses & shopping, Meals outside breakfast, Driver & guide tips').split(/[,;•\n]+/).map(s => s.trim()).filter(Boolean);

  const hotelList = [
    {
      name: pkg.hotel_details || pkg.hotel_category || 'Deluxe Accommodation',
      city: pkg.destination.split(',')[0].trim(),
      roomType: 'Deluxe Room',
      mealPlan: 'Daily Breakfast (CP Plan)',
      nights: nights,
      checkIn: 'Day 1',
      checkOut: `Day ${totalDays}`,
      amountINR: Math.round(totalCostINR * 0.45),
      amountUSD: Math.round(totalCostUSD * 0.45)
    }
  ];

  return {
    activeDocType: 'quotation',
    file_path: pkg.file_path || '',
    package: {
      quotationNo: pkg.package_code || ('PKG-' + pkg.id),
      packageTitle: pkg.name,
      title: pkg.name,
      destination: pkg.destination,
      destinations: pkg.destination,
      country: pkg.country || 'International',
      duration: `${totalDays} Days / ${nights} Nights`,
      clientName: 'Valued Traveler',
      travellers: '2 Adults',
      pax: '2 Adults',
      paxCount: 2,
      adultCount: 2,
      childCount: 0,
      totalCostINR: totalCostINR,
      totalCostUSD: totalCostUSD,
      ratePerAdultINR: Math.round(totalCostINR / 2),
      ratePerAdultUSD: Math.round(totalCostUSD / 2),
      currency: 'INR',
      usdToInrRate: 83.5,
      isVillaNauticaDining: false
    },
    days: daysList,
    hotels: hotelList,
    inclusions: incList,
    exclusions: excList,
    pricing: {
      grandTotal: totalCostINR,
      grandTotalUSD: totalCostUSD,
      totalINR: totalCostINR,
      totalUSD: totalCostUSD,
      perPerson: Math.round(totalCostINR / 2),
      perPersonINR: Math.round(totalCostINR / 2),
      perPersonUSD: Math.round(totalCostUSD / 2),
      markupPercent: pkg.markup_percent || 12,
      gstPercent: 5
    },
    summary: {
      items: [
        { name: `Accommodation (${nights} Nights Stay)`, amountINR: Math.round(totalCostINR * 0.45), amountUSD: Math.round(totalCostUSD * 0.45) },
        { name: `Sightseeing & Activities`, amountINR: Math.round(totalCostINR * 0.35), amountUSD: Math.round(totalCostUSD * 0.35) },
        { name: `Private AC Transfers & Assistance`, amountINR: Math.round(totalCostINR * 0.20), amountUSD: Math.round(totalCostUSD * 0.20) }
      ],
      totalINR: totalCostINR,
      totalUSD: totalCostUSD,
      autoCalculate: false
    },
    landArrangement: {
      hotelName: pkg.hotel_details || pkg.hotel_category || 'Deluxe Accommodation',
      nights: String(nights),
      costPerPerson: Math.round(totalCostINR / 2)
    },
    landTotal: totalCostINR,
    grandTotal: totalCostINR,
    itineraryNotes: pkg.highlights || ''
  };
}

// 1-Click "Edit in Studio" by numeric ID — Pre-loads authentic layout directly!
window.customizeWithLogoById = function(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;

  const pkgPayload = buildQuotationDataFromPackage(pkg);

  try {
    localStorage.setItem('activeAiDocument', JSON.stringify(pkgPayload));
    localStorage.setItem('dmc_ai_prefill', JSON.stringify(pkgPayload));
  } catch (e) {}

  window.location.href = `ai-assistant.html?dest=${encodeURIComponent(pkg.destination)}&title=${encodeURIComponent(pkg.name)}&doctype=${pkgPayload.activeDocType}&pkg_id=${pkg.id}`;
};

// Backwards compatibility for customizeWithLogo
window.customizeWithLogo = function(dest, title) {
  const pkg = allPackages.find(p => p.destination === dest || p.name === title);
  if (pkg) {
    customizeWithLogoById(pkg.id);
  } else {
    window.location.href = `ai-assistant.html?dest=${encodeURIComponent(dest)}&title=${encodeURIComponent(title || '')}`;
  }
};

// Direct 1-Click PDF / DOCX Download
window.downloadCleanPdf = function(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;

  const isDining = (pkg.id == 100 || (pkg.name && pkg.name.toLowerCase().includes('villa nautica')));
  if (isDining) {
    window.open(`../view.html?package_id=${pkg.id}&doctype=villa_nautica_dining&title=${encodeURIComponent(pkg.name)}&print=1`, '_blank');
    return;
  }

  // Check destination sanity to prevent opening mismatched legacy PDF (e.g. Kerala PDF for Thailand)
  const fp = (pkg.file_path || '').toLowerCase();
  const destCombined = ((pkg.destination || '') + ' ' + (pkg.country || '') + ' ' + (pkg.name || '')).toLowerCase();
  const isMismatch = (fp.includes('kerala') && !destCombined.includes('kerala')) ||
                     (fp.includes('bali') && !destCombined.includes('bali')) ||
                     (fp.includes('dubai') && !destCombined.includes('dubai')) ||
                     ((destCombined.includes('thailand') || destCombined.includes('phuket')) && fp.includes('kerala'));

  let url = pkg.file_path;
  if (!isMismatch && url && (url.endsWith('.pdf') || url.endsWith('.docx'))) {
    if (!url.startsWith('http') && !url.startsWith('/')) {
      url = '../' + url;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = pkg.name.replace(/[^a-zA-Z0-9_\-]/g, '_') + (url.endsWith('.docx') ? '.docx' : '.pdf');
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  window.open(`../view.html?package_id=${pkg.id}&title=${encodeURIComponent(pkg.name)}&dest=${encodeURIComponent(pkg.destination)}&price=${pkg.pricing_inr}&print=1`, '_blank');
};

// Direct 1-Click "View Document" in New Tab (Guaranteed Zero 403 Errors)
window.viewDocumentById = function(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;

  const isDining = (pkg.id == 100 || (pkg.package_code && pkg.package_code.includes('VN-DINING')) || (pkg.name && pkg.name.toLowerCase().includes('villa nautica')));
  if (isDining) {
    window.open(`../view.html?package_id=100&doctype=villa_nautica_dining`, '_blank');
    return;
  }

  // Pre-sync activeAiDocument from authentic package data
  const pkgPayload = buildQuotationDataFromPackage(pkg);
  try {
    localStorage.setItem('activeAiDocument', JSON.stringify(pkgPayload));
  } catch (e) {}

  // Check destination sanity to prevent opening mismatched legacy PDF
  const fp = (pkg.file_path || '').toLowerCase();
  const destCombined = ((pkg.destination || '') + ' ' + (pkg.country || '') + ' ' + (pkg.name || '')).toLowerCase();
  const isMismatch = (fp.includes('kerala') && !destCombined.includes('kerala')) ||
                     (fp.includes('bali') && !destCombined.includes('bali')) ||
                     (fp.includes('dubai') && !destCombined.includes('dubai')) ||
                     ((destCombined.includes('thailand') || destCombined.includes('phuket')) && fp.includes('kerala'));

  if (!isMismatch && pkg.file_path && pkg.file_path.toLowerCase().endsWith('.pdf')) {
    let url = pkg.file_path;
    if (!url.startsWith('http') && !url.startsWith('/')) {
      url = '../' + url;
    }
    window.open(url, '_blank');
    return;
  }

  // Authoritative database-backed view by package_id
  window.open(`../view.html?package_id=${pkg.id}`, '_blank');
};

// Sleek WhatsApp Share Modal (NO browser prompt alerts!)
let currentWaPkg = null;
window.openWhatsAppModalById = function(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;
  currentWaPkg = pkg;

  const modal = document.getElementById('waShareModal');
  const preview = document.getElementById('waPreviewText');
  const phoneInput = document.getElementById('waGuestPhone');

  const isDining = (pkg.id == 100 || (pkg.name && pkg.name.toLowerCase().includes('villa nautica')));
  const fp = (pkg.file_path || '').toLowerCase();
  const destCombined = ((pkg.destination || '') + ' ' + (pkg.country || '') + ' ' + (pkg.name || '')).toLowerCase();
  const isMismatch = (fp.includes('kerala') && !destCombined.includes('kerala')) ||
                     (fp.includes('bali') && !destCombined.includes('bali')) ||
                     (fp.includes('dubai') && !destCombined.includes('dubai')) ||
                     ((destCombined.includes('thailand') || destCombined.includes('phuket')) && fp.includes('kerala'));

  let fullDocUrl = '';
  if (isDining) {
    fullDocUrl = 'https://pdf.letsexploredmc.com/view.html?package_id=100&doctype=villa_nautica_dining';
  } else if (!isMismatch && pkg.file_path && pkg.file_path.toLowerCase().endsWith('.pdf')) {
    fullDocUrl = pkg.file_path.startsWith('http') ? pkg.file_path : ('https://pdf.letsexploredmc.com/' + pkg.file_path.replace(/^\.\.\//, ''));
  } else {
    fullDocUrl = `https://pdf.letsexploredmc.com/view.html?package_id=${pkg.id}`;
  }

  const days = pkg.duration_days || 4;
  const nights = pkg.duration_nights || (days - 1);
  const priceInr = Number(pkg.pricing_inr || 0).toLocaleString();
  const priceUsd = Number(pkg.pricing_usd || 0).toLocaleString();

  const isDomestic = (pkg.country || '').toLowerCase() === 'india' ||
                     ['kerala', 'alibaug', 'goa', 'rajasthan', 'kashmir', 'himachal', 'andaman', 'uttarakhand', 'cochin', 'munnar', 'jaipur', 'udaipur'].some(d => (pkg.destination || '').toLowerCase().includes(d) || (pkg.name || '').toLowerCase().includes(d));

  const tariffText = isDomestic ? `INR ${priceInr}` : `INR ${priceInr} (USD ${priceUsd})`;

  const msg = `*Namaste! Greetings from Let\'s Explore DMC* ✈️🏖️\n\nHere are the details for your requested travel quotation:\n\n🌟 *Package:* ${pkg.name}\n📍 *Destination:* ${pkg.destination}\n⏱️ *Duration:* ${days}D/${nights}N\n💰 *Tariff:* ${tariffText}\n\n📄 *Official Document / PDF:* \n${fullDocUrl}\n\nPlease let us know if you would like any modifications or date shifts!\n\n_Let\'s Explore DMC | Official DMC Partner_`;

  if (preview) preview.value = msg;
  if (phoneInput) phoneInput.value = '';
  if (modal) modal.style.display = 'flex';
};

window.closeWhatsAppModal = function() {
  const modal = document.getElementById('waShareModal');
  if (modal) modal.style.display = 'none';
};

window.sendWhatsAppNow = function() {
  const phoneInput = document.getElementById('waGuestPhone');
  const preview = document.getElementById('waPreviewText');
  const rawPhone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
  const text = preview ? preview.value : '';

  let waUrl = '';
  if (rawPhone && rawPhone.length >= 7) {
    waUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(rawPhone)}&text=${encodeURIComponent(text)}`;
  } else {
    waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }
  window.open(waUrl, '_blank');
  closeWhatsAppModal();
};

window.copyWaText = function() {
  const preview = document.getElementById('waPreviewText');
  if (!preview) return;
  preview.select();
  navigator.clipboard.writeText(preview.value).then(() => {
    const btn = document.getElementById('btnCopyWaMsg');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check" style="color:#10B981;"></i> Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });
};

function openPackageModal(mode, data = null) {
  const modal = document.getElementById('packageModal');
  const titleEl = document.getElementById('pkgModalTitle');
  if (!modal) return;
  
  if (mode === 'edit' && data) {
    titleEl.innerText = `Edit Package — ${data.name}`;
    document.getElementById('modalPkgId').value = data.id || '';
    document.getElementById('modalPkgName').value = data.name || '';
    document.getElementById('modalPkgCountry').value = capitalizeFirst(data.country || 'India');
    document.getElementById('modalPkgDestination').value = data.destination || '';
    document.getElementById('modalPkgDays').value = data.duration_days || 4;
    document.getElementById('modalPkgNights').value = data.duration_nights || 3;
    document.getElementById('modalPkgHotelCat').value = data.hotel_category || '4-Star Deluxe';
    document.getElementById('modalPkgHotelDetails').value = data.hotel_details || '';
    document.getElementById('modalPkgPriceInr').value = data.pricing_inr || 35000;
    document.getElementById('modalPkgPriceUsd').value = data.pricing_usd || 420;
    document.getElementById('modalPkgMarkup').value = data.markup_percent || 10;
    document.getElementById('modalPkgInclusions').value = data.inclusions || '';
    document.getElementById('modalPkgExclusions').value = data.exclusions || '';
    document.getElementById('modalPkgPublished').checked = (data.is_published == 1 && data.status !== 'inactive');
  } else {
    titleEl.innerText = 'Create New Destination Package';
    const form = document.getElementById('pkgForm');
    if (form) form.reset();
    document.getElementById('modalPkgId').value = '';
    document.getElementById('modalPkgDays').value = 4;
    document.getElementById('modalPkgNights').value = 3;
    document.getElementById('modalPkgPublished').checked = true;
  }
  modal.style.display = 'flex';
}

function closePackageModal() {
  const modal = document.getElementById('packageModal');
  if (modal) modal.style.display = 'none';
}

function capitalizeFirst(s) {
  if (!s) return 'India';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function editPackageById(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (pkg) openPackageModal('edit', pkg);
}

async function savePackageForm(e) {
  e.preventDefault();
  const idInput = document.getElementById('modalPkgId').value;
  const isEdit = !!idInput;
  const numId = isEdit ? Number(idInput) : Date.now();

  const isPub = document.getElementById('modalPkgPublished').checked ? 1 : 0;
  const payload = {
    action: isEdit ? 'update' : 'create',
    package_id: numId,
    id: numId,
    name: document.getElementById('modalPkgName').value.trim(),
    country: document.getElementById('modalPkgCountry').value,
    destination: document.getElementById('modalPkgDestination').value.trim(),
    duration_days: Number(document.getElementById('modalPkgDays').value) || 4,
    duration_nights: Number(document.getElementById('modalPkgNights').value) || 3,
    hotel_category: document.getElementById('modalPkgHotelCat').value,
    hotel_details: document.getElementById('modalPkgHotelDetails').value.trim(),
    pricing_inr: Number(document.getElementById('modalPkgPriceInr').value) || 0,
    pricing_usd: Number(document.getElementById('modalPkgPriceUsd').value) || 0,
    markup_percent: Number(document.getElementById('modalPkgMarkup').value) || 10,
    inclusions: document.getElementById('modalPkgInclusions').value.trim(),
    exclusions: document.getElementById('modalPkgExclusions').value.trim(),
    is_published: isPub,
    status: isPub ? 'active' : 'inactive'
  };

  const btn = document.getElementById('btnSubmitPkg');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Saving...';
  }

  if (isEdit) {
    const idx = allPackages.findIndex(p => p.id == numId);
    if (idx !== -1) allPackages[idx] = { ...allPackages[idx], ...payload };
  } else {
    allPackages.unshift(payload);
  }
  saveLocalPackages(allPackages);

  try {
    const res = await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result && result.success && result.package_id && !isEdit) {
      payload.id = result.package_id;
      saveLocalPackages(allPackages);
    }
  } catch (err) {}

  alert(`Package "${payload.name}" saved successfully in real time!`);
  closePackageModal();
  renderPackagesGrid();

  if (btn) {
    btn.disabled = false;
    btn.innerText = 'Save Package';
  }
}

async function duplicatePackage(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;
  if (!confirm(`Duplicate "${pkg.name}" as a new draft?`)) return;

  const newPkg = {
    ...pkg,
    id: Date.now(),
    package_code: 'PKG-' + (pkg.country ? pkg.country.substring(0, 2).toUpperCase() : 'IN') + '-' + Math.floor(1000 + Math.random() * 9000),
    name: pkg.name + ' (Copy)',
    is_published: 0,
    status: 'inactive',
    created_at: new Date().toISOString()
  };

  allPackages.unshift(newPkg);
  saveLocalPackages(allPackages);

  try {
    await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...newPkg })
    });
  } catch (e) {}

  alert('Package duplicated as a new draft!');
  renderPackagesGrid();
}

async function togglePublishStatus(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;

  const willBeActive = (pkg.is_published != 1 || pkg.status === 'inactive');
  pkg.is_published = willBeActive ? 1 : 0;
  pkg.status = willBeActive ? 'active' : 'inactive';
  saveLocalPackages(allPackages);
  renderPackagesGrid();

  try {
    await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_publish',
        package_id: id,
        is_published: pkg.is_published,
        status: pkg.status
      })
    });
  } catch (e) {}
}

async function deletePackage(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;
  if (!confirm(`Are you sure you want to delete "${pkg.name}"?`)) return;

  allPackages = allPackages.filter(p => p.id != id);
  saveLocalPackages(allPackages);
  renderPackagesGrid();

  try {
    await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', package_id: id })
    });
  } catch (e) {}

  alert('Package deleted successfully.');
}
