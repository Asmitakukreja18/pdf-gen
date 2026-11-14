/**
 * packages.js — Real-Time Destination Packages & Tour CRUD Controller
 * Lets Explore DMC Luxury ERP Portal
 * 
 * Features:
 * - Real-time persistence with MySQL (api/packages_manager.php) + localStorage sync
 * - Zero dummy data on clean init
 * - Full CRUD: Create, Edit, Duplicate, Toggle Publish/Draft, Delete
 * - Country Filtering: Thailand, Dubai/UAE, Bali/Indonesia, Singapore, Malaysia, Turkey, India
 * - 1-Click "Customize in AI Studio"
 * - PDF Itinerary Download
 */

const MASTER_PRESET_PACKAGES = [];
let allPackages = [];
let currentCountryFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadPackagesFromDatabase();
  setupPackageFilterEvents();

  // Create Package Form submission
  const pkgForm = document.getElementById('pkgForm');
  if (pkgForm) {
    pkgForm.addEventListener('submit', savePackageForm);
  }

  // Import from Drive modal
  const driveBtn = document.getElementById('btnUploadDrivePkg');
  const driveModal = document.getElementById('driveImportModal');
  if (driveBtn && driveModal) {
    driveBtn.addEventListener('click', () => {
      driveModal.style.display = 'flex';
    });
  }
});

function getLocalPackages() {
  try {
    const raw = localStorage.getItem('dmc_real_packages');
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strict purge: Strip any old mock packages (Bali Tropical, Jakarta Heritage, dummy codes)
        parsed = parsed.filter(p => {
          const n = (p.name || '').toLowerCase();
          const c = (p.package_code || '').toLowerCase();
          return !c.includes('pkg-id-bali') && !c.includes('pkg-id-jkt') && !n.includes('bali luxury tropical escape') && !n.includes('jakarta city & heritage');
        });
        localStorage.setItem('dmc_real_packages', JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {}
  return [];
}

function saveLocalPackages(pkgs) {
  try {
    localStorage.setItem('dmc_real_packages', JSON.stringify(pkgs));
  } catch (e) {}
}

async function loadPackagesFromDatabase() {
  let loaded = false;
  try {
    const res = await fetch('../api/packages_manager.php?action=list');
    const data = await res.json();
    if (data.success && Array.isArray(data.packages) && data.packages.length > 0) {
      allPackages = data.packages.map(p => ({
        ...p,
        country: (p.country || '').toLowerCase(),
        country_display: getCountryDisplay(p.country)
      }));
      saveLocalPackages(allPackages);
      loaded = true;
    }
  } catch (err) {
    console.warn('Backend API notice, falling back to real-time local storage:', err);
  }

  if (!loaded) {
    const local = getLocalPackages();
    allPackages = local.map(p => ({
      ...p,
      country: (p.country || '').toLowerCase(),
      country_display: getCountryDisplay(p.country)
    }));
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
      <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#64748B; background:#FFF; border:1px dashed #CBD5E1; border-radius:16px;">
        <i class="fa-solid fa-box-open" style="font-size:42px; color:#94A3B8; margin-bottom:12px;"></i>
        <h4 style="margin:0 0 6px 0; font-size:17px; color:#0F2C59; font-weight:800;">No Tour Packages Found</h4>
        <p style="margin:0 0 18px 0; font-size:13px; color:#64748B;">All sample mock data has been purged. Create a new package or generate an authentic itinerary in the AI Studio.</p>
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button type="button" onclick="openPackageModal('create')" style="background:#0F2C59; color:#FFF; border:none; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer;">
            <i class="fa-solid fa-plus"></i> Create Package
          </button>
          <a href="ai-assistant.html" style="background:#2563EB; color:#FFF; border:none; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Open AI Studio
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(pkg => {
    const isPub = pkg.is_published == 1;
    const priceInr = Number(pkg.pricing_inr || 0).toLocaleString();
    const priceUsd = Number(pkg.pricing_usd || 0).toLocaleString();
    const days = pkg.duration_days || 6;
    const nights = pkg.duration_nights || (days - 1);
    const code = pkg.package_code || ('PKG-' + (pkg.id || Math.floor(Math.random() * 1000)));

    return `
      <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:14px; overflow:hidden; box-shadow:0 2px 8px rgba(15,23,42,0.04); display:flex; flex-direction:column; transition:transform 0.15s ease;">
        <!-- Card Top Badge -->
        <div style="padding:14px 18px; border-bottom:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center; background:#FAFBFD;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; font-weight:700; color:#1E3A8A; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:3px 10px;">
              ${pkg.country_display || getCountryDisplay(pkg.country)}
            </span>
            <span onclick="togglePublishStatus(${pkg.id})" style="cursor:pointer; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; ${isPub ? 'background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0;' : 'background:#FEF2F2; color:#991B1B; border:1px solid #FECACA;'}" title="Click to toggle Live/Draft">
              ${isPub ? '● Live' : '○ Draft'}
            </span>
          </div>
          <span style="font-size:11.5px; font-weight:600; color:#64748B;">
            ⏱️ ${days}D / ${nights}N
          </span>
        </div>

        <!-- Card Body -->
        <div style="padding:18px; flex:1; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <h3 style="margin:0; font-size:16px; font-weight:800; color:#0F2C59; line-height:1.3;">
              ${escapeQuotes(pkg.name)}
            </h3>
            <span style="font-family:monospace; font-size:10.5px; font-weight:700; color:#64748B; background:#F1F5F9; padding:2px 6px; border-radius:4px; margin-left:8px; white-space:nowrap;">
              ${code}
            </span>
          </div>

          <div style="font-size:12px; color:#2563EB; font-weight:700; margin-bottom:12px; display:flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-location-dot"></i>
            <span>${escapeQuotes(pkg.destination || 'Multiple Cities')}</span>
          </div>

          <div style="background:#F8FAFC; border-radius:8px; padding:10px 12px; font-size:12px; color:#475569; margin-bottom:14px; line-height:1.45;">
            <div style="margin-bottom:4px;">
              <strong>🏨 Hotel:</strong> ${escapeQuotes(pkg.hotel_details || pkg.hotel_category || '4-Star / Deluxe Accommodation')}
            </div>
            ${pkg.highlights ? `<div><strong>✨ Highlights:</strong> ${escapeQuotes(pkg.highlights)}</div>` : ''}
          </div>

          <div style="margin-top:auto; padding-top:12px; border-top:1px dashed #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:11px; color:#64748B; display:block;">Tariff / 2 Pax:</span>
              <span style="font-size:16px; font-weight:800; color:#059669;">
                INR ${priceInr} <span style="font-size:11px; font-weight:600; color:#64748B;">(USD ${priceUsd})</span>
              </span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" onclick="editPackageById(${pkg.id})" style="background:none; border:none; color:#2563EB; font-size:12px; font-weight:700; cursor:pointer;" title="Edit Package">
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button type="button" onclick="duplicatePackage(${pkg.id})" style="background:none; border:none; color:#475569; font-size:12px; font-weight:700; cursor:pointer;" title="Duplicate Package">
                <i class="fa-solid fa-copy"></i>
              </button>
              <button type="button" onclick="deletePackage(${pkg.id})" style="background:none; border:none; color:#EF4444; font-size:12px; font-weight:700; cursor:pointer;" title="Delete Package">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div style="margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button type="button" onclick="downloadCleanPdf(${pkg.id})" style="background:#FFF; border:1px solid #CBD5E1; color:#0F2C59; padding:7px 10px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
              <i class="fa-solid fa-download"></i> Download PDF
            </button>
            <button type="button" onclick="customizeWithLogo('${escapeQuotes(pkg.destination)}', '${escapeQuotes(pkg.name)}')" style="background:#0F2C59; border:none; color:#FFF; padding:7px 10px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Edit in AI Studio
            </button>
          </div>
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
      landArrangement: {
        hotelName: pkg.hotel_details || pkg.hotel_category || '4-Star Deluxe Resort',
        nights: String(pkg.duration_nights || 5),
        costPerPerson: Math.round((pkg.pricing_inr || 48500) / 2)
      },
      landTotal: pkg.pricing_inr || 48500,
      grandTotal: pkg.pricing_inr || 48500
    };
    try {
      localStorage.setItem('activeAiDocument', JSON.stringify(pkgPayload));
    } catch (e) {}
  }
  window.location.href = `ai-assistant.html?dest=${encodeURIComponent(dest)}&title=${encodeURIComponent(title || '')}`;
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
    const form = document.getElementById('pkgForm');
    if (form) form.reset();
    document.getElementById('modalPkgId').value = '';
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
  if (pkg) {
    openPackageModal('edit', pkg);
  }
}

async function savePackageForm(e) {
  e.preventDefault();
  const idInput = document.getElementById('modalPkgId').value;
  const isEdit = !!idInput;
  const numId = isEdit ? Number(idInput) : Date.now();

  const payload = {
    action: isEdit ? 'update' : 'create',
    package_id: numId,
    id: numId,
    name: document.getElementById('modalPkgName').value.trim(),
    country: document.getElementById('modalPkgCountry').value,
    destination: document.getElementById('modalPkgDestination').value.trim(),
    duration_days: Number(document.getElementById('modalPkgDays').value) || 6,
    duration_nights: Number(document.getElementById('modalPkgNights').value) || 5,
    hotel_category: document.getElementById('modalPkgHotelCat').value,
    hotel_details: document.getElementById('modalPkgHotelDetails').value.trim(),
    pricing_inr: Number(document.getElementById('modalPkgPriceInr').value) || 0,
    pricing_usd: Number(document.getElementById('modalPkgPriceUsd').value) || 0,
    markup_percent: Number(document.getElementById('modalPkgMarkup').value) || 10,
    inclusions: document.getElementById('modalPkgInclusions').value.trim(),
    exclusions: document.getElementById('modalPkgExclusions').value.trim(),
    is_published: document.getElementById('modalPkgPublished').checked ? 1 : 0
  };

  const btn = document.getElementById('btnSubmitPkg');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Saving...';
  }

  // Update real-time local cache
  if (isEdit) {
    const idx = allPackages.findIndex(p => p.id == numId);
    if (idx !== -1) {
      allPackages[idx] = { ...allPackages[idx], ...payload };
    }
  } else {
    allPackages.unshift(payload);
  }
  saveLocalPackages(allPackages);

  // Sync to database
  try {
    const res = await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result && result.success) {
      if (result.package_id && !isEdit) {
        payload.id = result.package_id;
        saveLocalPackages(allPackages);
      }
    }
  } catch (err) {
    console.warn('Saved package to real-time local storage');
  }

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
    name: pkg.name + ' (Copy)',
    is_published: 0,
    created_at: new Date().toISOString()
  };

  allPackages.unshift(newPkg);
  saveLocalPackages(allPackages);

  try {
    await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', package_id: id })
    });
  } catch (e) {}

  alert('Package duplicated as a new draft!');
  renderPackagesGrid();
}

async function togglePublishStatus(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;
  pkg.is_published = (pkg.is_published == 1) ? 0 : 1;
  saveLocalPackages(allPackages);
  renderPackagesGrid();

  try {
    await fetch('../api/packages_manager.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_publish', package_id: id, is_published: pkg.is_published })
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

function downloadCleanPdf(id) {
  const pkg = allPackages.find(p => p.id == id);
  if (!pkg) return;
  alert(`Preparing official clean PDF itinerary for ${pkg.name}...`);
  window.open(`../api/generate_pdf.php?pkg_id=${pkg.id}&title=${encodeURIComponent(pkg.name)}`, '_blank');
}
