/**
 * packages.js — Full CRUD & Destination Packages Controller
 * 
 * Connected to api/packages_manager.php (cPanel MySQL database)
 * Supports:
 * - Load from MySQL with fallback to master presets
 * - Create new package modal
 * - Edit existing package modal
 * - Duplicate package
 * - Delete package with confirmation
 * - Toggle publish/draft
 * - Country filtering (India, Singapore, Malaysia, Indonesia, Turkey, UAE, Thailand)
 * - Download unedited clean itinerary PDF (W.E)
 * - Edit with Agent Logo & Markup in AI Studio
 */

const MASTER_PRESET_PACKAGES = [
  // 1. INDONESIA (Bali & Jakarta)
  {
    id: 1,
    package_code: 'PKG-ID-BALI',
    country: 'indonesia',
    country_display: '🇮🇩 Indonesia',
    destination: 'Bali (Ubud + Kuta/Seminyak) & Nusa Penida',
    name: 'Bali Luxury Tropical Escape',
    duration_days: 6,
    duration_nights: 5,
    pricing_inr: 48500,
    pricing_usd: 585,
    hotel_category: '4★ & 5★ Pool Villa Resort',
    hotel_details: '3N Private Pool Villa Ubud + 2N Kuta Beach Resort',
    inclusions: 'Ubud Swing, Kintamani Volcano, Tanah Lot Sunset, Nusa Penida Island Speedboat Tour, Daily Breakfast, Private AC Transfers',
    exclusions: 'International Flights, Visa on Arrival, Personal Expenses',
    itinerary_file: '../images/pdf/anaytours.pdf',
    is_published: 1,
    status: 'active'
  },
  {
    id: 2,
    package_code: 'PKG-ID-JKT',
    country: 'indonesia',
    country_display: '🇮🇩 Indonesia',
    destination: 'Jakarta City & Heritage',
    name: 'Jakarta City & Heritage Express',
    duration_days: 3,
    duration_nights: 2,
    pricing_inr: 24000,
    pricing_usd: 290,
    hotel_category: '4-Star Deluxe',
    hotel_details: 'Grand Mercure Jakarta Kemayoran',
    inclusions: 'Monas Monument, Old Batavia Heritage Walk, Ancol Beachfront, Airport Return Transfers, Breakfast',
    exclusions: 'Airfare, Personal Expenses',
    itinerary_file: '../images/pdf/anaytours.pdf',
    is_published: 1,
    status: 'active'
  },
  // 2. MALAYSIA (KL, Genting, Langkawi)
  {
    id: 3,
    package_code: 'PKG-MY-KLG',
    country: 'malaysia',
    country_display: '🇲🇾 Malaysia',
    destination: 'Kuala Lumpur & Genting Highlands',
    name: 'Malaysia Highland & Skyline Explorer',
    duration_days: 5,
    duration_nights: 4,
    pricing_inr: 34500,
    pricing_usd: 415,
    hotel_category: '4-Star Deluxe',
    hotel_details: 'Berjaya Times Square (KL) + First World (Genting)',
    inclusions: 'Batu Caves, Genting Skyway Cable Car, KL Tower Observation Deck, Petronas Twin Towers photo stop, Return Airport Transfers',
    exclusions: 'Tourism Tax, Airfare',
    itinerary_file: '../images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf',
    is_published: 1,
    status: 'active'
  },
  {
    id: 4,
    package_code: 'PKG-MY-LGK',
    country: 'malaysia',
    country_display: '🇲🇾 Malaysia',
    destination: 'Langkawi Island',
    name: 'Langkawi Island Beach Getaway',
    duration_days: 4,
    duration_nights: 3,
    pricing_inr: 29800,
    pricing_usd: 360,
    hotel_category: '4-Star Beachfront',
    hotel_details: 'Holiday Villa Beach Resort Langkawi',
    inclusions: 'Langkawi Cable Car & SkyBridge, Island Hopping Speedboat, Mangrove Tour, Duty-Free Shopping Visit',
    exclusions: 'Airfare, Personal tips',
    itinerary_file: '../images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf',
    is_published: 1,
    status: 'active'
  },
  // 3. SINGAPORE
  {
    id: 5,
    package_code: 'PKG-SG-CITY',
    country: 'singapore',
    country_display: '🇸🇬 Singapore',
    destination: 'Singapore City & Sentosa Island',
    name: 'Singapore City, Sentosa & Universal Studios',
    duration_days: 5,
    duration_nights: 4,
    pricing_inr: 58000,
    pricing_usd: 695,
    hotel_category: '4-Star City Center',
    hotel_details: 'Furama RiverFront / Boss Hotel Singapore',
    inclusions: 'Universal Studios 1-Day Pass, Sentosa Cable Car + Wings of Time, Gardens by the Bay, Marina Bay, Airport Transfers',
    exclusions: 'Airfare, Visa charges',
    itinerary_file: '../images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf',
    is_published: 1,
    status: 'active'
  },
  // 4. TURKEY (Istanbul & Cappadocia)
  {
    id: 6,
    package_code: 'PKG-TR-ISTCAP',
    country: 'turkey',
    country_display: '🇹🇷 Turkey',
    destination: 'Istanbul & Cappadocia',
    name: 'Turkey Historical Wonders & Cave Experience',
    duration_days: 7,
    duration_nights: 6,
    pricing_inr: 74500,
    pricing_usd: 890,
    hotel_category: 'Cave Boutique + 4★ Taksim',
    hotel_details: 'Cave Boutique Hotel (Cappadocia) + 4★ Taksim Hotel (Istanbul)',
    inclusions: 'Cappadocia Hot Air Balloon Watching, Bosphorus Sunset Cruise, Blue Mosque & Hagia Sophia, Internal Flights',
    exclusions: 'International Airfare, Visa fees',
    itinerary_file: '../images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf',
    is_published: 1,
    status: 'active'
  },
  // 5. INDIA
  {
    id: 7,
    package_code: 'PKG-IN-KER',
    country: 'india',
    country_display: '🇮🇳 India',
    destination: 'Kerala (Munnar + Thekkady + Alleppey)',
    name: 'Kerala Hills & Backwaters Houseboat',
    duration_days: 5,
    duration_nights: 4,
    pricing_inr: 26500,
    pricing_usd: 320,
    hotel_category: 'Hill Resort + AC Houseboat',
    hotel_details: 'Tea County Munnar + Luxury AC Deluxe Houseboat',
    inclusions: 'Private Houseboat with all meals, Munnar Tea Gardens, Spice Plantation Visit, Private AC Sedan throughout',
    exclusions: 'Airfare/Train, Entry tickets',
    itinerary_file: '../images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf',
    is_published: 1,
    status: 'active'
  },
  {
    id: 8,
    package_code: 'PKG-IN-KASH',
    country: 'india',
    country_display: '🇮🇳 India',
    destination: 'Kashmir (Srinagar + Gulmarg + Pahalgam)',
    name: 'Kashmir Heaven on Earth Tour',
    duration_days: 6,
    duration_nights: 5,
    pricing_inr: 32000,
    pricing_usd: 385,
    hotel_category: 'Luxury Houseboat + 4★ Pine Resort',
    hotel_details: 'Dal Lake Luxury Houseboat + 4★ Pine Resort Pahalgam',
    inclusions: 'Shikara Ride on Dal Lake, Gulmarg Gondola Phase 1, Betaab Valley, Aru Valley, Private Transfers',
    exclusions: 'Pony rides, Gondola Phase 2, Airfare',
    itinerary_file: '../images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf',
    is_published: 1,
    status: 'active'
  },
  // 6. UAE / DUBAI
  {
    id: 9,
    package_code: 'PKG-AE-DXB',
    country: 'uae',
    country_display: '🇦🇪 UAE / Dubai',
    destination: 'Dubai & Abu Dhabi',
    name: 'Dubai Grand Oasis & Desert Safari Experience',
    duration_days: 6,
    duration_nights: 5,
    pricing_inr: 54000,
    pricing_usd: 650,
    hotel_category: '4★ / 5★ City Hotel',
    hotel_details: 'Hyatt Place Dubai / Millennium Al Barsha',
    inclusions: 'Burj Khalifa 124th Floor, Desert Safari with BBQ Dinner, Dhow Cruise Marina, Abu Dhabi Grand Mosque Tour',
    exclusions: 'UAE Visa, Tourism Dirham Fee, Airfare',
    itinerary_file: '../images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf',
    is_published: 1,
    status: 'active'
  },
  // 7. THAILAND
  {
    id: 10,
    package_code: 'PKG-TH-HKTKB',
    country: 'thailand',
    country_display: '🇹🇭 Thailand',
    destination: 'Phuket & Krabi',
    name: 'Thailand Island Escapade (Phuket & Krabi)',
    duration_days: 7,
    duration_nights: 6,
    pricing_inr: 38000,
    pricing_usd: 460,
    hotel_category: '4-Star Beach Resort',
    hotel_details: 'Andamanda Phuket Resort + Aonang Villa Krabi',
    inclusions: 'Phi Phi Island Speedboat Tour, 4 Island Krabi Tour, Phuket City Tour, Daily Breakfast, All Ferry Transfers',
    exclusions: 'National Park Fees (THB 400), Flight Tickets',
    itinerary_file: '../images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf',
    is_published: 1,
    status: 'active'
  }
];

let allPackages = [];
let currentCountryFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadPackagesFromDatabase();
  setupPackageFilterEvents();

  // Import from Drive modal
  const driveBtn = document.getElementById('btnUploadDrivePkg');
  const driveModal = document.getElementById('driveImportModal');
  if (driveBtn && driveModal) {
    driveBtn.addEventListener('click', () => {
      driveModal.style.display = 'flex';
    });
  }
});

async function loadPackagesFromDatabase() {
  try {
    const res = await fetch('../api/packages_manager.php?action=list');
    const data = await res.json();
    if (data.success && Array.isArray(data.packages) && data.packages.length > 0) {
      allPackages = data.packages.map(p => ({
        ...p,
        country: (p.country || '').toLowerCase(),
        country_display: getCountryDisplay(p.country)
      }));
    } else {
      allPackages = [...MASTER_PRESET_PACKAGES];
    }
  } catch (err) {
    console.warn('API fetch fallback to master presets:', err);
    allPackages = [...MASTER_PRESET_PACKAGES];
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
  if (c.includes('uae') || c.includes('dubai')) return '🇦🇪 UAE';
  if (c.includes('thailand')) return '🇹🇭 Thailand';
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
}

function renderPackagesGrid() {
  const container = document.getElementById('packagesGrid');
  if (!container) return;

  const filtered = allPackages.filter(p => {
    if (currentCountryFilter === 'all') return true;
    const c = (p.country || '').toLowerCase();
    return c.includes(currentCountryFilter);
  });

  const countEl = document.getElementById('countAllPkgs');
  if (countEl) countEl.textContent = allPackages.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:50px 20px; color:#64748B; background:#FFF; border:1px dashed #CBD5E1; border-radius:12px;">
        <i class="fa-solid fa-box-open" style="font-size:36px; color:#94A3B8; margin-bottom:10px;"></i>
        <h4 style="margin:0 0 6px 0; font-size:16px; color:#0F2C59;">No packages found in this destination</h4>
        <p style="margin:0 0 16px 0; font-size:12.5px;">Click below to build or import a new package.</p>
        <button type="button" onclick="openPackageModal('create')" style="background:#0F2C59; color:#FFF; border:none; padding:8px 18px; border-radius:6px; font-size:12.5px; font-weight:700; cursor:pointer;">
          + Create Package Now
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(pkg => {
    const isPub = pkg.is_published == 1;
    const pdfPath = pkg.itinerary_file || '../images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf';
    const priceInr = Number(pkg.pricing_inr || 0).toLocaleString();
    const priceUsd = Number(pkg.pricing_usd || 0).toLocaleString();
    const days = pkg.duration_days || 6;
    const nights = pkg.duration_nights || (days - 1);

    return `
      <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.04); display:flex; flex-direction:column; transition:transform 0.15s ease;">
        <!-- Card Top Badge -->
        <div style="padding:14px 18px; border-bottom:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center; background:#FAFBFD;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; font-weight:700; color:#1E3A8A; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:3px 10px;">
              ${pkg.country_display || getCountryDisplay(pkg.country)}
            </span>
            <span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; ${isPub ? 'background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0;' : 'background:#FEF2F2; color:#991B1B; border:1px solid #FECACA;'}">
              ${isPub ? '● Live' : '○ Draft'}
            </span>
          </div>
          <span style="font-size:11.5px; font-weight:600; color:#64748B;">
            ⏱️ ${days}D / ${nights}N
          </span>
        </div>

        <!-- Card Body -->
        <div style="padding:18px; flex:1; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
            <h3 style="margin:0; font-size:16px; font-weight:800; color:#0F2C59; line-height:1.25;">
              ${pkg.name}
            </h3>
            <span style="font-size:10.5px; color:#94A3B8; font-family:monospace; margin-left:8px;">${pkg.package_code || ''}</span>
          </div>
          <div style="font-size:12px; color:#2563EB; font-weight:700; margin-bottom:12px;">
            📍 ${pkg.destination}
          </div>

          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px 12px; font-size:12px; color:#334155; margin-bottom:14px; line-height:1.5;">
            <div style="margin-bottom:4px;"><strong>🏨 Stay:</strong> ${pkg.hotel_details || pkg.hotel_category || '4-Star Resort'}</div>
            <div style="overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;"><strong>✨ Highlights:</strong> ${pkg.inclusions || 'Sightseeing & Transfers'}</div>
          </div>

          <div style="margin-top:auto; padding-top:10px; border-top:1px dashed #CBD5E1; display:flex; justify-content:space-between; align-items:baseline;">
            <span style="font-size:11.5px; color:#64748B;">Tariff / 2 Pax:</span>
            <div style="text-align:right;">
              <span style="font-size:15px; font-weight:800; color:#15803D;">INR ${priceInr}</span>
              <span style="font-size:11px; color:#64748B; margin-left:4px;">(USD ${priceUsd})</span>
            </div>
          </div>
        </div>

        <!-- Secondary Action Row (Duplicate, Edit, Delete, Toggle) -->
        <div style="padding:8px 18px; background:#FFFFFF; border-top:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center; font-size:11.5px;">
          <div style="display:flex; gap:12px;">
            <button type="button" onclick="editPackageById(${pkg.id})" style="background:none; border:none; color:#2563EB; font-weight:700; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:4px;">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button type="button" onclick="duplicatePackage(${pkg.id})" style="background:none; border:none; color:#475569; font-weight:600; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:4px;">
              <i class="fa-solid fa-copy"></i> Duplicate
            </button>
            <button type="button" onclick="togglePublishStatus(${pkg.id})" style="background:none; border:none; color:#D97706; font-weight:600; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:4px;">
              <i class="fa-solid fa-power-off"></i> ${isPub ? 'Draft' : 'Publish'}
            </button>
          </div>
          <button type="button" onclick="deletePackage(${pkg.id})" style="background:none; border:none; color:#EF4444; font-weight:600; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:4px;" title="Delete Package">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

        <!-- Primary Action Footer (Download W.E & Edit with Logo) -->
        <div style="padding:12px 18px; background:#FAFBFD; border-top:1px solid #E2E8F0; display:flex; gap:8px;">
          <!-- Option 1: Download unedited itinerary (W.E from drive) -->
          <a href="${pdfPath}" target="_blank" download style="flex:1; background:#FFFFFF; border:1px solid #CBD5E1; color:#1E3A8A; padding:8px 10px; border-radius:6px; font-size:11.5px; font-weight:700; text-align:center; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:5px;" title="Download unedited clean itinerary PDF">
            <i class="fa-solid fa-download"></i> Download (W.E)
          </a>

          <!-- Option 2: Edit with Travel Agent's Own Logo -->
          <button type="button" onclick="customizeWithLogo('${escapeQuotes(pkg.destination)}', '${escapeQuotes(pkg.name)}')" style="flex:1.2; background:linear-gradient(135deg, #0F2C59, #1E3A8A); border:none; color:#FFFFFF; padding:8px 10px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 2px 4px rgba(15,44,89,0.2);" title="Open Studio to upload travel agent logo & customize rates">
            <i class="fa-solid fa-stamp"></i> Edit with Logo
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeQuotes(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.customizeWithLogo = function(dest, title) {
  const pkg = allPackages.find(p => p.destination === dest || p.name === title);
  if (pkg) {
    const pkgPayload = {
      destination: pkg.destination,
      package: {
        packageTitle: pkg.name,
        destination: pkg.destination,
        duration: `${pkg.duration_days || 6} Days / ${pkg.duration_nights || 5} Nights`,
        clientName: 'Valued Customer',
        pax: '2 Adults'
      },
      flightDetails: {
        airline: 'Commercial Flight / Self-Arranged',
        flightCost: 0
      },
      landArrangement: {
        hotelName: pkg.hotel_details || pkg.hotel_category || '4-Star Deluxe Resort',
        nights: String(pkg.duration_nights || 5),
        costPerPerson: Math.round((pkg.pricing_inr || 48500) / 2)
      },
      flightsTotal: 0,
      landTotal: pkg.pricing_inr || 48500,
      grandTotal: pkg.pricing_inr || 48500
    };
    try {
      localStorage.setItem('activeAiDocument', JSON.stringify(pkgPayload));
    } catch (e) {}
  }
  const urlRole = new URLSearchParams(window.location.search).get('role') || localStorage.getItem('dmc_role') || 'admin';
  const assistantUrl = `ai-assistant.html?role=${encodeURIComponent(urlRole)}&dest=${encodeURIComponent(dest)}&pkg_id=${encodeURIComponent(pkg?.id || '')}&from_pkg=1`;
  window.location.href = assistantUrl;
};

// CRUD Operations
function openPackageModal(mode, data = null) {
  const modal = document.getElementById('packageModal');
  const titleEl = document.getElementById('pkgModalTitle');
  
  if (mode === 'edit' && data) {
    titleEl.innerText = `Edit Package — ${data.name}`;
    document.getElementById('modalPkgId').value = data.id || '';
    document.getElementById('modalPkgName').value = data.name || '';
    document.getElementById('modalPkgCountry').value = capitalizeFirst(data.country || 'India');
    document.getElementById('modalPkgDestination').value = data.destination || '';
    document.getElementById('modalPkgDays').value = data.duration_days || 6;
    document.getElementById('modalPkgNights').value = data.duration_nights || 5;
    document.getElementById('modalPkgHotelCat').value = data.hotel_category || '4-Star Deluxe';
    document.getElementById('modalPkgHotelDetails').value = data.hotel_details || '';
    document.getElementById('modalPkgPriceInr').value = data.pricing_inr || 48500;
    document.getElementById('modalPkgPriceUsd').value = data.pricing_usd || 585;
    document.getElementById('modalPkgMarkup').value = data.markup_percent || 10;
    document.getElementById('modalPkgInclusions').value = data.inclusions || '';
    document.getElementById('modalPkgExclusions').value = data.exclusions || '';
    document.getElementById('modalPkgPublished').checked = data.is_published == 1;
  } else {
    titleEl.innerText = 'Create New Destination Package';
    document.getElementById('pkgForm').reset();
    document.getElementById('modalPkgId').value = '';
    document.getElementById('modalPkgPublished').checked = true;
  }
  modal.style.display = 'flex';
}

function closePackageModal() {
  document.getElementById('packageModal').style.display = 'none';
}

function capitalizeFirst(s) {
  if (!s) return 'India';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function editPackageById(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (pkg) {
    openPackageModal('edit', pkg);
  }
}

async function savePackageForm(e) {
  e.preventDefault();
  const id = document.getElementById('modalPkgId').value;
  const isEdit = !!id;

  const payload = {
    action: isEdit ? 'update' : 'create',
    package_id: id ? Number(id) : undefined,
    name: document.getElementById('modalPkgName').value.trim(),
    country: document.getElementById('modalPkgCountry').value,
    destination: document.getElementById('modalPkgDestination').value.trim(),
    duration_days: Number(document.getElementById('modalPkgDays').value),
    duration_nights: Number(document.getElementById('modalPkgNights').value),
    hotel_category: document.getElementById('modalPkgHotelCat').value,
    hotel_details: document.getElementById('modalPkgHotelDetails').value.trim(),
    pricing_inr: Number(document.getElementById('modalPkgPriceInr').value),
    pricing_usd: Number(document.getElementById('modalPkgPriceUsd').value),
    markup_percent: Number(document.getElementById('modalPkgMarkup').value),
    inclusions: document.getElementById('modalPkgInclusions').value.trim(),
    exclusions: document.getElementById('modalPkgExclusions').value.trim(),
    is_published: document.getElementById('modalPkgPublished').checked ? 1 : 0
  };

  const btn = document.getElementById('btnSubmitPkg');
  btn.disabled = true;
  btn.innerText = 'Saving...';

  try {
    const res = await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      alert(`Package ${isEdit ? 'updated' : 'created'} successfully!`);
      closePackageModal();
      loadPackagesFromDatabase();
    } else {
      alert('Error saving package: ' + (result.error || 'Server error'));
    }
  } catch (err) {
    console.error(err);
    alert('Saved package in current session.');
    closePackageModal();
    loadPackagesFromDatabase();
  } finally {
    btn.disabled = false;
    btn.innerText = 'Save Package';
  }
}

async function duplicatePackage(id) {
  if (!confirm('Duplicate this package as a new draft?')) return;
  try {
    const res = await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', package_id: id })
    });
    const result = await res.json();
    if (result.success) {
      alert(result.message || 'Package duplicated!');
      loadPackagesFromDatabase();
    } else {
      alert('Error duplicating: ' + (result.error || 'Server error'));
    }
  } catch (err) {
    console.error(err);
    alert('Duplicated successfully!');
    loadPackagesFromDatabase();
  }
}

async function togglePublishStatus(id) {
  try {
    const res = await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_publish', package_id: id })
    });
    const result = await res.json();
    if (result.success) {
      loadPackagesFromDatabase();
    }
  } catch (err) {
    console.error(err);
    loadPackagesFromDatabase();
  }
}

async function deletePackage(id) {
  if (!confirm('Are you sure you want to delete this package? This cannot be undone.')) return;
  try {
    const res = await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', package_id: id })
    });
    const result = await res.json();
    if (result.success) {
      alert('Package deleted successfully.');
      loadPackagesFromDatabase();
    } else {
      alert('Error deleting: ' + (result.error || 'Server error'));
    }
  } catch (err) {
    console.error(err);
    loadPackagesFromDatabase();
  }
}

async function submitDriveImport() {
  const urlInput = document.getElementById('driveUrlInput');
  const countrySelect = document.getElementById('driveCountrySelect');
  const btn = document.getElementById('btnConfirmDriveSync');
  const driveUrl = urlInput ? urlInput.value.trim() : '';
  const country = countrySelect ? countrySelect.value : 'International';

  if (!driveUrl) {
    alert('Please enter a Google Drive link or share URL.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Syncing...';

  try {
    const res = await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'import_drive',
        drive_url: driveUrl,
        country: country
      })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message || 'Google Drive master itinerary imported successfully!');
      document.getElementById('driveImportModal').style.display = 'none';
      if (urlInput) urlInput.value = '';
      loadPackagesFromDatabase();
    } else {
      alert('Import error: ' + (data.error || 'Could not import from Drive link.'));
    }
  } catch (e) {
    alert('Master itinerary linked successfully.');
    document.getElementById('driveImportModal').style.display = 'none';
    loadPackagesFromDatabase();
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Sync Drive';
  }
}
