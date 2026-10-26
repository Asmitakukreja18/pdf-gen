/**
 * db-manager.js — Database & Storage Controller for Quotations
 * Communicates with cPanel MySQL backend (api/save_quotation.php)
 * with instant fallback to localStorage cache for offline/local resilience.
 */

const DBManager = (() => {

  const STORAGE_KEY = 'dmc_saved_quotations_v1';

  // Initial seed quotation (Rohit Sharma - Dubai) so user immediately sees past quotes
  const INITIAL_SEED = [
    {
      quote_ref: 'LEDMC-DXB-2027-0892',
      client_name: 'Rohit Sharma',
      client_phone: '9876543210',
      destination: 'Dubai, UAE',
      travel_date: 'March 2027',
      duration: '5 Days / 4 Nights',
      pax_count: '2 Adults',
      hotel_name: '4-Star Marina View Hotel',
      flight_airline: 'Emirates / IndiGo Airlines',
      flights_total: 55000,
      land_total: 48000,
      grand_total: 103000,
      status: 'Confirmed',
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      full_data: typeof DEMO_DUBAI_DATA !== 'undefined' ? JSON.parse(JSON.stringify(DEMO_DUBAI_DATA)) : null
    }
  ];

  /**
   * Get cached quotations from localStorage
   */
  function getLocalQuotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED));
        return INITIAL_SEED;
      }
      return JSON.parse(data) || [];
    } catch (e) {
      return INITIAL_SEED;
    }
  }

  /**
   * Save quotation to localStorage cache
   */
  function saveToLocal(quote) {
    try {
      const list = getLocalQuotes();
      const existingIdx = list.findIndex(q => q.quote_ref === quote.quote_ref);
      if (existingIdx >= 0) {
        list[existingIdx] = quote;
      } else {
        list.unshift(quote);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }

  /**
   * Save currently active quotation
   */
  async function saveQuotation(quoteData = null) {
    const data = quoteData || (typeof QuotationData !== 'undefined' ? QuotationData : null);
    if (!data) {
      showToast('No active quotation to save.', 'warning');
      return;
    }

    // Ensure quotation reference exists
    if (!data.quoteRef) {
      const destCode = (data.destination || 'GEN').substring(0, 3).toUpperCase();
      data.quoteRef = `LEDMC-${destCode}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const payload = {
      quoteRef: data.quoteRef,
      clientName: data.client?.name || 'Rohit Sharma',
      client: data.client,
      destination: data.destination,
      flightDetails: data.flightDetails,
      landArrangement: data.landArrangement,
      flightsTotal: data.flightsTotal || 55000,
      landTotal: data.landTotal || 48000,
      grandTotal: data.grandTotal || (data.flightsTotal + data.landTotal) || 103000,
      status: 'Confirmed'
    };

    // Save locally immediately
    const localRecord = {
      quote_ref: payload.quoteRef,
      client_name: payload.clientName,
      client_phone: payload.client?.phone || '',
      destination: payload.destination,
      travel_date: payload.client?.travelDate || '',
      duration: payload.client?.duration || '',
      pax_count: payload.client?.pax || '2 Adults',
      hotel_name: payload.landArrangement?.hotelName || '',
      flight_airline: payload.flightDetails?.airline || '',
      flights_total: payload.flightsTotal,
      land_total: payload.landTotal,
      grand_total: payload.grandTotal,
      status: 'Confirmed',
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      full_data: JSON.parse(JSON.stringify(data))
    };
    saveToLocal(localRecord);

    // Attempt backend save (cPanel MySQL / PHP)
    let backendSaved = false;
    try {
      const response = await fetch('api/save_quotation.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success) {
          backendSaved = true;
          showToast(`💾 Saved to Database! (Ref: ${payload.quoteRef})`, 'success');
        }
      }
    } catch (err) {
      // Offline or running on local dev server without PHP
      console.log('Running in local/offline mode, saved to browser database.');
    }

    if (!backendSaved) {
      showToast(`💾 Saved to Database Cache! (Ref: ${payload.quoteRef})`, 'success');
    }

    // Refresh history list if open
    renderHistoryModal();
    return payload.quoteRef;
  }

  /**
   * Fetch all quotations (from backend MySQL or local cache)
   */
  async function fetchAll() {
    try {
      const res = await fetch('api/get_quotations.php');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.quotations) && json.quotations.length > 0) {
          return json.quotations;
        }
      }
    } catch (e) {
      // Fallback
    }
    return getLocalQuotes();
  }

  /**
   * Load a quotation into the editor and preview
   */
  async function loadQuotation(quoteRef) {
    const list = await fetchAll();
    const item = list.find(q => q.quote_ref === quoteRef);
    if (!item) {
      showToast('Quotation not found.', 'warning');
      return;
    }

    let loadedData = item.full_data;
    if (typeof loadedData === 'string') {
      try { loadedData = JSON.parse(loadedData); } catch (e) {}
    }

    if (loadedData && typeof QuotationData !== 'undefined') {
      // Merge into active QuotationData
      Object.assign(QuotationData, loadedData);
      if (typeof App !== 'undefined') {
        App.populateFormFromData();
        App.updateLivePriceDisplay();
        App.showSection('preview');
      }
      closeHistoryModal();
      showToast(`Loaded ${item.client_name}'s Quotation (${item.destination})`, 'success');
    }
  }

  /**
   * Delete a quotation
   */
  async function deleteQuotation(quoteRef) {
    if (!confirm(`Are you sure you want to delete quotation ${quoteRef}?`)) return;

    // Delete locally
    const list = getLocalQuotes().filter(q => q.quote_ref !== quoteRef);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    // Delete on backend
    try {
      await fetch('api/delete_quotation.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_ref: quoteRef })
      });
    } catch (e) {}

    showToast(`Quotation ${quoteRef} deleted.`, 'info');
    renderHistoryModal();
  }

  /**
   * Render History Modal Content
   */
  async function renderHistoryModal() {
    const tableBody = document.getElementById('historyTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">Loading database records...</td></tr>`;
    const quotes = await fetchAll();

    if (!quotes || quotes.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color:#64748b;">No quotations saved yet. Click "Save to Database" to create one!</td></tr>`;
      return;
    }

    tableBody.innerHTML = quotes.map(q => {
      const priceFmt = '₹ ' + Number(q.grand_total || 0).toLocaleString('en-IN');
      const dateDisplay = (q.updated_at || '').substring(0, 16);
      return `
        <tr>
          <td><strong style="color: #1d4ed8; font-family: monospace;">${q.quote_ref || 'LEDMC-000'}</strong></td>
          <td>
            <strong>${q.client_name || 'Guest'}</strong>
            <div style="font-size: 11px; color: #64748b;">${q.client_phone || ''}</div>
          </td>
          <td>
            <span class="badge-pill badge-dest">${q.destination || 'N/A'}</span>
            <div style="font-size: 11px; color: #64748b; margin-top:2px;">${q.duration || ''} (${q.pax_count || '2 Pax'})</div>
          </td>
          <td style="font-weight: 700; color: #047857;">${priceFmt}</td>
          <td style="font-size: 12px; color: #64748b;">${dateDisplay}</td>
          <td>
            <div class="db-action-btns">
              <button class="btn-db-load" onclick="DBManager.loadQuotation('${q.quote_ref}')" title="Load into Editor">📂 Load</button>
              <button class="btn-db-del" onclick="DBManager.deleteQuotation('${q.quote_ref}')" title="Delete">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.style.display = 'flex';
      renderHistoryModal();
    }
  }

  function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.style.display = 'none';
  }

  return {
    saveQuotation,
    fetchAll,
    loadQuotation,
    deleteQuotation,
    renderHistoryModal,
    openHistoryModal,
    closeHistoryModal
  };

})();
