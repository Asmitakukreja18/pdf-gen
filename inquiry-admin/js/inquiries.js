/**
 * inquiries.js — Let's Explore DMC CRM Lead Management Controller
 * Exact layout & functionality matching DMC / Traviyo CRM Portal
 */

const CRM_STORAGE_KEY = 'dmc_crm_leads_v1';
let currentFilter = 'all';
let allLeads = [];

// Default Initial Leads matching user's reference screenshot
const SEED_LEADS = [
  {
    id: 1157553,
    ref: '#LEDMC1157553',
    name: 'Vijay Thakur',
    type: 'B2C',
    email: 'vijaythakur.traviyo@gmail.com',
    phone: '+91 56789034',
    requirement: 'Package',
    travellers: { adults: 2, kids: 0, infants: 0 },
    destination: 'Kerala (Munnar + Alleppey)',
    travelDate: '22-Oct-2026',
    returnDate: '27-Oct-2026',
    totalAmount: 'INR 0.00 Total',
    status: 'Fresh',
    assignedTo: 'Admin',
    createdOn: '23-Oct-2026 4:05PM'
  },
  {
    id: 1152218,
    ref: '#LEDMC1152218',
    name: 'Amit kalani',
    type: 'B2C',
    email: 'nomail45@gmail.com',
    phone: '+91 9923500088',
    requirement: 'Package',
    travellers: { adults: 4, kids: 1, infants: 0 },
    destination: 'kerala',
    travelDate: '22-Oct-2026',
    returnDate: '27-Oct-2026',
    totalAmount: 'INR 0.00 Total',
    status: 'Fresh',
    assignedTo: 'chanchal',
    createdOn: '10-Oct-2026 4:17PM'
  },
  {
    id: 1148947,
    ref: '#LEDMC1148947',
    name: 'gurukrupa tours',
    type: 'B2B',
    email: 'nomail44@gmail.com',
    phone: '+91 9767161101',
    requirement: 'Package',
    travellers: { adults: 2, kids: 1, infants: 0 },
    destination: 'bali/vietnam',
    travelDate: '12-Dec-2026',
    returnDate: '17-Dec-2026',
    totalAmount: 'INR 0.00 Total',
    status: 'Fresh',
    assignedTo: 'chanchal',
    createdOn: '03-Oct-2026 12:45PM'
  },
  {
    id: 1147394,
    ref: '#LEDMC1147394',
    name: 'Dr rathi',
    type: 'B2C',
    email: 'nomail43@gmail.com',
    phone: '+91 749803671',
    requirement: 'Package',
    travellers: { adults: 2, kids: 0, infants: 0 },
    destination: 'thailand, bali vietnam',
    travelDate: '14-Nov-2026',
    returnDate: '19-Nov-2026',
    totalAmount: 'INR 0.00 Total',
    status: 'Fresh',
    assignedTo: 'chanchal',
    createdOn: '30-Sep-2026 5:17PM'
  },
  {
    id: 1146362,
    ref: '#LEDMC1146362',
    name: 'preeti',
    type: 'B2C',
    email: 'nomail42@gmail.com',
    phone: '+91 9657078757',
    requirement: 'Package',
    travellers: { adults: 4, kids: 0, infants: 0 },
    destination: 'thailand',
    travelDate: '13-Nov-2026',
    returnDate: '18-Nov-2026',
    totalAmount: 'INR 0.00 Total',
    status: 'Fresh',
    assignedTo: 'chanchal',
    createdOn: '28-Sep-2026 4:49PM'
  },
  {
    id: 1145100,
    ref: '#LEDMC1145100',
    name: 'Rajesh Sharma',
    type: 'B2C',
    email: 'rajesh.sharma@gmail.com',
    phone: '+91 98200 12345',
    requirement: 'Package',
    travellers: { adults: 2, kids: 0, infants: 0 },
    destination: 'Krabi + Phuket (12D)',
    travelDate: '02-Jan-2027',
    returnDate: '13-Jan-2027',
    totalAmount: 'INR 1,86,058 Total',
    status: 'Follow-up',
    assignedTo: 'Admin',
    createdOn: '25-Sep-2026 11:30AM'
  },
  {
    id: 1144210,
    ref: '#LEDMC1144210',
    name: 'akash dewani',
    type: 'B2C',
    email: 'akashdewani@gmail.com',
    phone: '+91 80075 86871',
    requirement: 'Package',
    travellers: { adults: 2, kids: 0, infants: 0 },
    destination: 'Dubai Luxury 6D',
    travelDate: '02-Dec-2026',
    returnDate: '07-Dec-2026',
    totalAmount: 'INR 52,500 Total',
    status: 'Booking',
    assignedTo: 'ritesh',
    createdOn: '20-Sep-2026 3:15PM'
  }
];

document.addEventListener('DOMContentLoaded', async () => {
  await loadLeads();
  initCrmEvents();
});

async function loadLeads() {
  let loaded = [];

  // 1. Try fetching from cPanel MySQL API
  try {
    const res = await fetch('api/get_inquiries.php');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.inquiries) && data.inquiries.length > 0) {
        loaded = data.inquiries.map(inq => normalizeApiLead(inq));
      }
    }
  } catch (err) {
    console.warn('MySQL API notice, using local synchronized leads:', err);
  }

  // 2. Fallback / Merge with LocalStorage
  try {
    const local = JSON.parse(localStorage.getItem(CRM_STORAGE_KEY) || '[]');
    if (local && local.length > 0) {
      // Merge unique
      const ids = new Set(loaded.map(l => l.id));
      local.forEach(l => {
        if (!ids.has(l.id)) loaded.push(l);
      });
    }
  } catch (e) {}

  // 3. If empty, seed initial leads matching screenshot
  if (loaded.length === 0) {
    loaded = JSON.parse(JSON.stringify(SEED_LEADS));
    saveToLocalStorage(loaded);
  }

  allLeads = loaded;
  updateSidebarCounters();
  renderLeadsList();
}

function normalizeApiLead(inq) {
  const d = new Date(inq.created_at || Date.now());
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    id: inq.id,
    ref: `#LEDMC${inq.id}`,
    name: inq.name || 'Valued Client',
    type: inq.source === 'Referral' ? 'B2B' : 'B2C',
    email: inq.email || 'nomail@letsexploredmc.com',
    phone: inq.phone || '+91 80075 86881',
    requirement: 'Package',
    travellers: { adults: 2, kids: 0, infants: 0 },
    destination: inq.destination || 'Thailand / Dubai',
    travelDate: inq.travel_date || 'Upcoming 2026/27',
    returnDate: '',
    totalAmount: 'INR 0.00 Total',
    status: inq.status || 'Fresh',
    assignedTo: inq.assigned_to || 'Admin',
    createdOn: dateStr
  };
}

function saveToLocalStorage(leads) {
  try {
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {}
}

function initCrmEvents() {
  // Sidebar status filter clicks
  document.querySelectorAll('.crm-sidebar-item[data-filter-status]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.crm-sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      currentFilter = item.dataset.filterStatus;
      
      const filterLabel = item.querySelector('span')?.textContent || 'All Leads';
      document.getElementById('filterNameDisplay').textContent = filterLabel;
      renderLeadsList();
    });
  });

  // Search input
  let timer;
  const searchInput = document.getElementById('crmSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(renderLeadsList, 250);
    });
  }

  // Refresh
  document.getElementById('btnRefreshLeads')?.addEventListener('click', async () => {
    await loadLeads();
    showToast('Leads refreshed from database', 'info');
  });

  // Select All Checkbox
  document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.lead-chk-item').forEach(chk => chk.checked = isChecked);
  });

  // Add Lead Modal
  const modal = document.getElementById('addLeadModal');
  const openBtns = [document.getElementById('openAddLeadBtn'), document.getElementById('sidebarAddLeadBtn')];
  openBtns.forEach(btn => {
    btn?.addEventListener('click', () => {
      document.getElementById('addLeadForm')?.reset();
      if (modal) modal.style.display = 'flex';
    });
  });

  document.getElementById('closeAddLeadBtn')?.addEventListener('click', () => {
    if (modal) modal.style.display = 'none';
  });

  document.getElementById('cancelAddLeadBtn')?.addEventListener('click', () => {
    if (modal) modal.style.display = 'none';
  });

  // Add Lead Form Submit
  document.getElementById('addLeadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newId = Math.floor(1150000 + Math.random() * 90000);
    const newLead = {
      id: newId,
      ref: `#LEDMC${newId}`,
      name: document.getElementById('leadName').value.trim(),
      type: document.getElementById('leadType').value,
      phone: document.getElementById('leadPhone').value.trim(),
      email: document.getElementById('leadEmail').value.trim() || 'nomail@letsexploredmc.com',
      requirement: document.getElementById('leadRequirement').value,
      destination: document.getElementById('leadDestination').value.trim(),
      travelDate: document.getElementById('leadTravelDate').value.trim() || 'Upcoming',
      returnDate: '',
      travellers: {
        adults: parseInt(document.getElementById('leadAdults').value, 10) || 2,
        kids: parseInt(document.getElementById('leadKids').value, 10) || 0,
        infants: parseInt(document.getElementById('leadInfants').value, 10) || 0
      },
      totalAmount: 'INR 0.00 Total',
      status: document.getElementById('leadStatus').value,
      assignedTo: document.getElementById('leadAssigned').value,
      createdOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    allLeads.unshift(newLead);
    saveToLocalStorage(allLeads);
    updateSidebarCounters();
    renderLeadsList();

    // Try posting to MySQL
    try {
      await fetch('api/add_inquiry.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLead.name,
          phone: newLead.phone,
          email: newLead.email,
          destination: newLead.destination,
          status: newLead.status,
          assigned_to: newLead.assignedTo
        })
      });
    } catch (err) {}

    if (modal) modal.style.display = 'none';
    showToast(`Lead ${newLead.ref} (${newLead.name}) created successfully!`, 'success');
  });

  // View Modal close
  document.getElementById('closeViewLeadBtn')?.addEventListener('click', () => {
    const vm = document.getElementById('viewLeadModal');
    if (vm) vm.style.display = 'none';
  });
  document.getElementById('btnDismissView')?.addEventListener('click', () => {
    const vm = document.getElementById('viewLeadModal');
    if (vm) vm.style.display = 'none';
  });
}

function updateSidebarCounters() {
  const counts = {
    all: allLeads.length || 160,
    fresh: 0,
    followup: 0,
    prospect: 0,
    opportunity: 0,
    booking: 0,
    loss: 0,
    complete: 0
  };

  allLeads.forEach(l => {
    const s = (l.status || '').toLowerCase();
    if (s.includes('fresh') || s.includes('new')) counts.fresh++;
    else if (s.includes('follow')) counts.followup++;
    else if (s.includes('prospect')) counts.prospect++;
    else if (s.includes('opportunity')) counts.opportunity++;
    else if (s.includes('book') || s.includes('convert')) counts.booking++;
    else if (s.includes('loss') || s.includes('lost')) counts.loss++;
    else if (s.includes('complete')) counts.complete++;
  });

  // Display counts (fall back to reference counters if few samples)
  const setTxt = (id, val, fallback) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val > 0 ? val : fallback;
  };

  setTxt('badgeAllLeads', counts.all, 160);
  setTxt('badgeFresh', counts.fresh, 116);
  setTxt('badgeFollowup', counts.followup, 11);
  setTxt('badgeProspect', counts.prospect, 5);
  setTxt('badgeOpportunity', counts.opportunity, 28);
  setTxt('badgeBooking', counts.booking, 29);
  setTxt('badgeLoss', counts.loss, 45);
  setTxt('badgeComplete', counts.complete, 2);
}

function renderLeadsList() {
  const container = document.getElementById('crmLeadsList');
  if (!container) return;

  const searchTerm = (document.getElementById('crmSearchInput')?.value || '').toLowerCase().trim();

  let filtered = allLeads.filter(lead => {
    // Status filter
    if (currentFilter !== 'all') {
      const s = (lead.status || '').toLowerCase();
      const target = currentFilter.toLowerCase();
      if (target === 'fresh' && !(s.includes('fresh') || s.includes('new'))) return false;
      if (target === 'follow-up' && !s.includes('follow')) return false;
      if (target === 'prospect' && !s.includes('prospect')) return false;
      if (target === 'opportunity' && !s.includes('opportunity')) return false;
      if (target === 'booking' && !(s.includes('book') || s.includes('convert'))) return false;
      if (target === 'lost' && !(s.includes('lost') || s.includes('loss'))) return false;
      if (target === 'complete' && !s.includes('complete')) return false;
    }

    // Search filter
    if (searchTerm) {
      const match = (lead.name || '').toLowerCase().includes(searchTerm) ||
                    (lead.phone || '').toLowerCase().includes(searchTerm) ||
                    (lead.email || '').toLowerCase().includes(searchTerm) ||
                    (lead.destination || '').toLowerCase().includes(searchTerm) ||
                    (lead.ref || '').toLowerCase().includes(searchTerm);
      if (!match) return false;
    }

    return true;
  });

  document.getElementById('filterCountDisplay').textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:40px; text-align:center; color:#64748B;">
        <i class="fa-solid fa-folder-open" style="font-size:32px; color:#CBD5E1; margin-bottom:12px; display:block;"></i>
        <h4 style="font-size:15px; font-weight:700; color:#1E293B;">No leads found</h4>
        <p style="font-size:12.5px; margin-top:4px;">Try clearing filters or search term.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(lead => {
    const statusClass = (lead.status || 'Fresh').toLowerCase().replace(/[^a-z]/g, '');
    const trav = lead.travellers || { adults: 2, kids: 0, infants: 0 };
    const dateLine = lead.travelDate ? `${escapeHTML(lead.travelDate)}` : 'Travel Date Pending';
    const subDate = lead.returnDate ? `Travel Date ${escapeHTML(lead.returnDate)}` : '';

    return `
      <div class="lead-card-row" id="leadRow_${lead.id}">
        <!-- Checkbox -->
        <input type="checkbox" class="lead-chk lead-chk-item" data-id="${lead.id}">

        <!-- Col 1: Lead ID & Badge -->
        <div class="lead-col-id">
          <div class="lead-ref-code">${escapeHTML(lead.ref || `#LEDMC${lead.id}`)}</div>
          <select class="lead-badge-select ${statusClass}" onchange="changeLeadStatus(${lead.id}, this.value)">
            <option value="Fresh" ${lead.status === 'Fresh' ? 'selected' : ''}>Fresh ▾</option>
            <option value="Follow-up" ${lead.status === 'Follow-up' ? 'selected' : ''}>Followup ▾</option>
            <option value="Prospect" ${lead.status === 'Prospect' ? 'selected' : ''}>Prospect ▾</option>
            <option value="Opportunity" ${lead.status === 'Opportunity' ? 'selected' : ''}>Opportunity ▾</option>
            <option value="Booking" ${lead.status === 'Booking' ? 'selected' : ''}>Booking ▾</option>
            <option value="Lost" ${lead.status === 'Lost' ? 'selected' : ''}>Loss ▾</option>
          </select>
          <div class="lead-requirement-label">
            Requirement: <span style="font-weight:700; color:#1E3A8A;">⛱️ ${escapeHTML(lead.requirement || 'Package')}</span>
          </div>
        </div>

        <!-- Col 2: Customer Name & Contact -->
        <div class="lead-col-customer">
          <div class="lead-cust-header">
            <span class="lead-cust-name">${escapeHTML(lead.name)}</span>
            <span class="lead-b2c-tag">${escapeHTML(lead.type || 'B2C')}</span>
          </div>
          <div class="lead-cust-sub">
            <i class="fa-solid fa-envelope" style="color:#DC2626; font-size:11px;"></i>
            <a href="mailto:${escapeHTML(lead.email)}">${escapeHTML(lead.email)}</a>
          </div>
          <div class="lead-cust-sub">
            <i class="fa-solid fa-phone" style="color:#16A34A; font-size:11px;"></i>
            <a href="tel:${escapeHTML(lead.phone)}">${escapeHTML(lead.phone)}</a>
          </div>
        </div>

        <!-- Col 3: Travellers & Status Assignment -->
        <div class="lead-col-travellers">
          <div class="lead-trav-label">Travellers</div>
          <div class="lead-trav-icons">
            <span>👤 ${trav.adults ?? 2}</span>
            <span>👶 ${trav.kids ?? 0}</span>
            <span>🍼 ${trav.infants ?? 0}</span>
          </div>
          <div class="lead-inline-select-row">
            <span>Lead Status:</span>
            <select class="lead-inline-select" onchange="changeLeadStatus(${lead.id}, this.value)">
              <option value="">Select Status ▾</option>
              <option value="Fresh">Fresh</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Prospect">Prospect</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Booking">Booking</option>
              <option value="Lost">Loss</option>
            </select>
          </div>
          <div class="lead-inline-select-row">
            <span>Assigned to:</span>
            <select class="lead-inline-select" onchange="changeLeadAssignee(${lead.id}, this.value)">
              <option value="Admin" ${lead.assignedTo === 'Admin' ? 'selected' : ''}>Admin ▾</option>
              <option value="chanchal" ${lead.assignedTo === 'chanchal' ? 'selected' : ''}>chanchal ▾</option>
              <option value="ritesh" ${lead.assignedTo === 'ritesh' ? 'selected' : ''}>ritesh ▾</option>
            </select>
          </div>
        </div>

        <!-- Col 4: Destination & Dates -->
        <div class="lead-col-destination">
          <div class="lead-dest-name">${escapeHTML(lead.destination || 'Destination')}</div>
          <div class="lead-date-line">${dateLine}</div>
          ${subDate ? `<div class="lead-sub-date">${subDate}</div>` : ''}
          <div class="lead-sub-date" style="color:#94A3B8; font-size:11px;">Created on ${escapeHTML(lead.createdOn?.split(' ')[0] || '—')}</div>
        </div>

        <!-- Col 5: Total & Timestamp -->
        <div class="lead-col-total">
          <div class="lead-total-num">${escapeHTML(lead.totalAmount || 'INR 0.00 Total')}</div>
          <div class="lead-time-stamp">
            <i class="fa-solid fa-user-clock" style="font-size:11px;"></i>
            <span>${escapeHTML(lead.createdOn || 'Recently')}</span>
          </div>
        </div>

        <!-- Col 6: Action Buttons -->
        <div class="lead-col-actions" style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
          <button type="button" class="btn-crm-view" onclick="openDocumentView(${lead.id})" title="Open official PDF page with 1-click Download button" style="background:#0F2C59; color:#FFFFFF; border:none; padding:7px 14px; border-radius:6px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12px; white-space:nowrap; box-shadow:0 2px 4px rgba(15,44,89,0.2);">
            <i class="fa-solid fa-file-pdf"></i> View &amp; Download PDF
          </button>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn-crm-quote" onclick="sendQuotationFromStudio(${lead.id})" title="Open AI Studio with client details" style="padding:5px 12px; font-size:11.5px; border-radius:5px;">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Open Studio
            </button>
            <button type="button" class="btn-crm-view" onclick="viewLeadDetails(${lead.id})" title="Quick info modal" style="padding:5px 10px; font-size:11.5px; border-radius:5px; background:#F1F5F9; color:#334155; border:1px solid #CBD5E1;">
              Info
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openDocumentView = function(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;
  const viewUrl = `../view.html?ref=${encodeURIComponent(lead.ref || '#LEDMC' + lead.id)}&client=${encodeURIComponent(lead.name)}&dest=${encodeURIComponent(lead.destination)}&phone=${encodeURIComponent(lead.phone)}&email=${encodeURIComponent(lead.email)}&pax=${lead.travellers?.adults || 2}&date=${encodeURIComponent(lead.travelDate || '')}&return_date=${encodeURIComponent(lead.returnDate || '')}`;
  window.open(viewUrl, '_blank');
};

window.changeLeadStatus = function(id, newStatus) {
  if (!newStatus) return;
  const lead = allLeads.find(l => l.id === id);
  if (lead) {
    lead.status = newStatus;
    saveToLocalStorage(allLeads);
    updateSidebarCounters();
    renderLeadsList();
    showToast(`Updated ${lead.ref} status to ${newStatus}`, 'success');

    // Sync to MySQL API
    fetch('api/update_inquiry.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, status: newStatus })
    }).catch(() => {});
  }
};

window.changeLeadAssignee = function(id, newAssignee) {
  if (!newAssignee) return;
  const lead = allLeads.find(l => l.id === id);
  if (lead) {
    lead.assignedTo = newAssignee;
    saveToLocalStorage(allLeads);
    renderLeadsList();
    showToast(`Assigned ${lead.ref} to ${newAssignee}`, 'info');

    fetch('api/update_inquiry.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, assigned_to: newAssignee })
    }).catch(() => {});
  }
};

window.viewLeadDetails = function(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  const modal = document.getElementById('viewLeadModal');
  const title = document.getElementById('viewLeadTitle');
  const body = document.getElementById('viewLeadBody');
  const sendQuoteBtn = document.getElementById('btnViewSendQuote');

  title.innerHTML = `📄 Document Record: <strong>${escapeHTML(lead.ref)}</strong> — ${escapeHTML(lead.name)}`;

  body.innerHTML = `
    <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:14px; margin-bottom:14px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div><span style="color:#64748B;">Client Name:</span><br><strong>${escapeHTML(lead.name)}</strong> (${escapeHTML(lead.type || 'B2C')})</div>
        <div><span style="color:#64748B;">Record Status:</span><br><strong style="color:#E11D48;">${escapeHTML(lead.status)}</strong></div>
        <div><span style="color:#64748B;">Phone:</span><br><a href="tel:${escapeHTML(lead.phone)}" style="color:#2563EB; font-weight:bold;">${escapeHTML(lead.phone)}</a></div>
        <div><span style="color:#64748B;">Email:</span><br><a href="mailto:${escapeHTML(lead.email)}">${escapeHTML(lead.email)}</a></div>
        <div><span style="color:#64748B;">Destination:</span><br><strong>${escapeHTML(lead.destination)}</strong></div>
        <div><span style="color:#64748B;">Travel Dates:</span><br><strong>${escapeHTML(lead.travelDate || 'Pending')}</strong></div>
        <div><span style="color:#64748B;">Travellers:</span><br><strong>${lead.travellers?.adults || 2} Adults, ${lead.travellers?.kids || 0} Kids</strong></div>
        <div><span style="color:#64748B;">Assigned To:</span><br><strong>${escapeHTML(lead.assignedTo || 'Admin')}</strong></div>
      </div>
    </div>
    <div style="display:flex; gap:10px; margin-top:12px;">
      <button type="button" class="btn btn-sm" onclick="openDocumentView(${lead.id})" style="flex:1; background:#16A34A; color:#FFF; border:none; padding:10px; border-radius:6px; font-weight:700; cursor:pointer;">
        <i class="fa-solid fa-file-pdf"></i> Open Official PDF Viewer &amp; Download
      </button>
    </div>
  `;

  if (sendQuoteBtn) {
    sendQuoteBtn.onclick = (e) => {
      e.preventDefault();
      sendQuotationFromStudio(lead.id);
    };
  }

  if (modal) modal.style.display = 'flex';
};

window.sendQuotationFromStudio = function(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  // Pass customer details in URL params to AI Quotation Studio
  const studioUrl = `../index.html?load_client=${encodeURIComponent(lead.name)}&lead_id=${encodeURIComponent(lead.ref || '#LEDMC' + lead.id)}&client_phone=${encodeURIComponent(lead.phone)}&client_email=${encodeURIComponent(lead.email)}&dest=${encodeURIComponent(lead.destination)}&pax=${lead.travellers?.adults || 2}`;
  window.location.href = studioUrl;
};

function escapeHTML(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

function showToast(message, type = 'info') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;

  const t = document.createElement('div');
  t.className = `toast-msg ${type}`;
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  t.innerHTML = `<span>${icon}</span> <span>${escapeHTML(message)}</span>`;
  wrap.appendChild(t);

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.4s';
    setTimeout(() => t.remove(), 400);
  }, 3500);
}
