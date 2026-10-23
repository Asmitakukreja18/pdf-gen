/**
 * rates.js — Rate Management Module
 * Handles service pricing table, calculations, and rate source management.
 * AI does NOT touch prices. Only business logic here.
 */

const RateManager = (() => {

  // ─── Default Company Rate Templates ─────────────────────
  const COMPANY_RATES = {
    'Dubai': [
      { name: 'Hotel', description: '5 Star Hotel - Deluxe Room', unitRate: 12000 },
      { name: 'Airport Transfer', description: 'Private Airport Transfer (Return)', unitRate: 5000 },
      { name: 'Dubai City Tour', description: 'Half Day Dubai City Tour', unitRate: 2500 },
      { name: 'Desert Safari', description: 'Evening Desert Safari with BBQ Dinner', unitRate: 3500 },
      { name: 'Burj Khalifa', description: 'Burj Khalifa Ticket - 124th Floor', unitRate: 2000 },
      { name: 'Dhow Cruise', description: 'Dhow Cruise Dinner', unitRate: 2200 }
    ],
    'Bali': [
      { name: 'Hotel', description: '4 Star Hotel - Deluxe Room', unitRate: 8000 },
      { name: 'Airport Transfer', description: 'Private Airport Transfer (Return)', unitRate: 3000 },
      { name: 'Bali City Tour', description: 'Full Day Bali Highlights Tour', unitRate: 2000 },
      { name: 'Temple Tour', description: 'Bali Temple & Rice Terrace Tour', unitRate: 2500 },
      { name: 'Water Sports', description: 'Water Sports Package', unitRate: 3000 }
    ],
    'Singapore': [
      { name: 'Hotel', description: '4 Star Hotel - Deluxe Room', unitRate: 11000 },
      { name: 'Airport Transfer', description: 'Private Airport Transfer (Return)', unitRate: 4500 },
      { name: 'City Tour', description: 'Singapore City Tour', unitRate: 2000 },
      { name: 'Gardens by the Bay', description: 'Gardens by the Bay + Flower Dome', unitRate: 2500 },
      { name: 'Universal Studios', description: 'Universal Studios Singapore', unitRate: 5500 },
      { name: 'Sentosa Island', description: 'Sentosa Island Day Tour', unitRate: 2000 }
    ],
    'default': [
      { name: 'Hotel', description: 'Hotel accommodation per night', unitRate: 8000 },
      { name: 'Airport Transfer', description: 'Private Airport Transfer (Return)', unitRate: 4000 },
      { name: 'City Tour', description: 'City Sightseeing Tour', unitRate: 2500 },
      { name: 'Activity', description: 'Activity / Experience', unitRate: 3000 }
    ]
  };

  // ─── Initialize Rate Table ───────────────────────────────
  function init() {
    buildServiceRows();
    setupEventListeners();
    recalculate();
  }

  // ─── Build Service Rows from TravelData ─────────────────
  function buildServiceRows() {
    const dest = TravelData.destination || 'default';
    const companyRates = COMPANY_RATES[dest] || COMPANY_RATES['default'];
    
    // If services already exist (from previous visit), don't reset
    if (TravelData.services.length > 0) {
      renderRateTable();
      return;
    }

    // Build initial services from package details
    const services = [];

    // Hotel
    if (TravelData.hotelCategory) {
      const hotelRate = companyRates.find(r => r.name === 'Hotel');
      const multiplier = { '5 Star': 1.5, '4 Star': 1.2, '3 Star': 1.0, 'Budget': 0.7 }[TravelData.hotelCategory] || 1;
      services.push({
        id: generateId(),
        name: 'Hotel',
        description: `${TravelData.hotelCategory} Hotel - ${TravelData.mealPlan || 'Room Only'}`,
        source: 'company',
        unitRate: Math.round((hotelRate?.unitRate || 8000) * multiplier),
        qty: TravelData.nights || 1,
        total: 0
      });
    }

    // Transfers
    if (TravelData.transfers && TravelData.transfers !== 'None') {
      const xferRate = companyRates.find(r => r.name === 'Airport Transfer');
      services.push({
        id: generateId(),
        name: 'Airport Transfer',
        description: `${TravelData.transfers} Airport Transfer (Return)`,
        source: 'company',
        unitRate: xferRate?.unitRate || 4000,
        qty: 1,
        total: 0
      });
    }

    // Sightseeing
    TravelData.sightseeing.forEach(sight => {
      const match = companyRates.find(r => r.name.toLowerCase().includes(sight.split(' ')[0].toLowerCase()));
      services.push({
        id: generateId(),
        name: sight,
        description: sight,
        source: 'company',
        unitRate: match?.unitRate || 2500,
        qty: 1,
        total: 0
      });
    });

    // Activities
    TravelData.activities.forEach(act => {
      const match = companyRates.find(r => r.name.toLowerCase().includes(act.split(' ')[0].toLowerCase()));
      services.push({
        id: generateId(),
        name: act,
        description: act,
        source: 'company',
        unitRate: match?.unitRate || 3000,
        qty: 1,
        total: 0
      });
    });

    // Flights
    if (TravelData.flights === 'Included') {
      services.push({
        id: generateId(),
        name: 'International Airfare',
        description: `Return Flights - ${TravelData.departureCity || 'Origin'} to ${TravelData.destination || 'Destination'}`,
        source: 'own',
        unitRate: 0,
        qty: parseInt(TravelData.adults) || 1,
        total: 0
      });
    }

    TravelData.services = services;
    renderRateTable();
  }

  // ─── Render Rate Table ───────────────────────────────────
  function renderRateTable() {
    const tbody = document.getElementById('rateTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    TravelData.services.forEach(service => {
      tbody.appendChild(createServiceRow(service));
    });
    recalculate();
  }

  // ─── Create a Service Row ────────────────────────────────
  function createServiceRow(service) {
    const tr = document.createElement('tr');
    tr.dataset.id = service.id;
    tr.innerHTML = `
      <td>
        <input type="text" class="svc-name" value="${escHtml(service.name)}" placeholder="Service name" />
      </td>
      <td>
        <input type="text" class="svc-desc" value="${escHtml(service.description)}" placeholder="Description" />
      </td>
      <td>
        <select class="svc-source">
          <option value="company" ${service.source==='company'?'selected':''}>Company</option>
          <option value="own" ${service.source==='own'?'selected':''}>Own</option>
        </select>
      </td>
      <td>
        <input type="number" class="svc-rate" value="${service.unitRate}" min="0" placeholder="0" />
      </td>
      <td>
        <input type="number" class="svc-qty" value="${service.qty}" min="1" placeholder="1" style="width:60px" />
      </td>
      <td class="svc-total-cell" style="font-weight:600;color:var(--primary-dark)">
        ${formatINR(service.unitRate * service.qty)}
      </td>
      <td>
        <button class="btn-icon btn-delete-row" title="Remove service" data-id="${service.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </td>
    `;

    // Row event listeners
    tr.querySelector('.svc-name').addEventListener('input', e => { service.name = e.target.value; });
    tr.querySelector('.svc-desc').addEventListener('input', e => { service.description = e.target.value; });
    tr.querySelector('.svc-source').addEventListener('change', e => {
      service.source = e.target.value;
      updateSourceBadge(tr, e.target.value);
    });
    tr.querySelector('.svc-rate').addEventListener('input', e => {
      service.unitRate = parseFloat(e.target.value) || 0;
      updateRowTotal(tr, service);
      recalculate();
    });
    tr.querySelector('.svc-qty').addEventListener('input', e => {
      service.qty = parseInt(e.target.value) || 1;
      updateRowTotal(tr, service);
      recalculate();
    });
    tr.querySelector('.btn-delete-row').addEventListener('click', () => {
      TravelData.services = TravelData.services.filter(s => s.id !== service.id);
      tr.remove();
      recalculate();
    });

    return tr;
  }

  // ─── Update Row Total Display ────────────────────────────
  function updateRowTotal(tr, service) {
    service.total = service.unitRate * service.qty;
    const cell = tr.querySelector('.svc-total-cell');
    if (cell) cell.textContent = formatINR(service.total);
  }

  // ─── Update Source Badge ─────────────────────────────────
  function updateSourceBadge(tr, source) {
    // Could add visual indicator for source change
  }

  // ─── Recalculate Totals ──────────────────────────────────
  function recalculate() {
    // Update service totals from DOM
    const rows = document.querySelectorAll('#rateTableBody tr');
    rows.forEach(tr => {
      const id = tr.dataset.id;
      const service = TravelData.services.find(s => s.id === id);
      if (!service) return;
      service.name        = tr.querySelector('.svc-name')?.value || service.name;
      service.description = tr.querySelector('.svc-desc')?.value || service.description;
      service.source      = tr.querySelector('.svc-source')?.value || service.source;
      service.unitRate    = parseFloat(tr.querySelector('.svc-rate')?.value) || 0;
      service.qty         = parseInt(tr.querySelector('.svc-qty')?.value) || 1;
      service.total       = service.unitRate * service.qty;
      const cell = tr.querySelector('.svc-total-cell');
      if (cell) cell.textContent = formatINR(service.total);
    });

    const subtotal = TravelData.services.reduce((sum, s) => sum + (s.unitRate * s.qty), 0);
    const taxPct   = parseFloat(document.getElementById('rateTax')?.value) || 0;
    const taxAmt   = Math.round(subtotal * taxPct / 100);
    const grand    = subtotal + taxAmt;

    TravelData.subtotal   = subtotal;
    TravelData.taxPercent = taxPct;
    TravelData.taxAmount  = taxAmt;
    TravelData.grandTotal = grand;

    const subtotalEl = document.getElementById('rateSubtotal');
    const grandEl    = document.getElementById('rateGrandTotal');
    if (subtotalEl) subtotalEl.textContent = formatINR(subtotal);
    if (grandEl)    grandEl.textContent    = formatINR(grand);
  }

  // ─── Add New Service Row ─────────────────────────────────
  function addServiceRow() {
    const newService = {
      id: generateId(),
      name: '',
      description: '',
      source: document.querySelector('input[name="rateSource"]:checked')?.value || 'own',
      unitRate: 0,
      qty: 1,
      total: 0
    };
    TravelData.services.push(newService);
    const tbody = document.getElementById('rateTableBody');
    if (tbody) tbody.appendChild(createServiceRow(newService));
    recalculate();
    // Focus the name input of new row
    setTimeout(() => {
      const lastRow = tbody?.lastElementChild;
      lastRow?.querySelector('.svc-name')?.focus();
    }, 50);
  }

  // ─── Setup Event Listeners ───────────────────────────────
  function setupEventListeners() {
    // Rate source radio buttons
    document.querySelectorAll('input[name="rateSource"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        TravelData.rateSource = e.target.value;
        document.querySelectorAll('.rate-option-card').forEach(c => c.classList.remove('active'));
        e.target.closest('.rate-option-card')?.classList.add('active');
        
        // If switching to company rates, suggest rebuild
        if (e.target.value === 'company') {
          showToast('Tip: Company rates are pre-filled based on destination.', 'info');
        }
      });
    });

    // Tax field
    const taxInput = document.getElementById('rateTax');
    if (taxInput) taxInput.addEventListener('input', recalculate);

    // Add service button
    const addBtn = document.getElementById('btnAddService');
    if (addBtn) addBtn.addEventListener('click', addServiceRow);
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, recalculate, addServiceRow };

})();
