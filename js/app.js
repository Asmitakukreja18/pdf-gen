/**
 * app.js — Main Application Controller for Let's Explore DMC Quotation Engine
 * Coordinates:
 * - Studio navigation (Builder + Live Preview)
 * - Dynamic Day-wise Itinerary & Pricing Editor
 * - Dynamic Hotel Blocks & Tag badges
 * - Dynamic Price Summary & Auto-calculated Dual Currency
 * - Dynamic Office Management & Custom Sections
 * - Visual Templates & Color Theme Customization
 * - Live Real-Time Document Synchronization
 * - AI Natural Language Extraction
 * - Multi-Page PDF & DOCX Generation
 */

const App = (() => {

  let currentSection = 'generator';
  let previewZoomScale = 1.0;

  /**
   * Initialize Application
   */
  function init() {
    setupNavigation();
    setupDocTypeSuite();
    setupBuilderTabs();
    setupZoomControls();
    setupSamplePickers();
    setupAIExtractor();
    setupPackageInputs();
    setupThemeControls();
    setupExportButtons();
    setupDatabaseButtons();
    setupApiKeyModal();

    // Load initial 12-Day Thailand Reference Master Sample
    loadSampleDataset('reference');
    populateStudioFromData();

    // Pre-fill AI prompt box with Thailand reference for instant testing
    const rawBox = document.getElementById('aiRawInput');
    if (rawBox && !rawBox.value) {
      rawBox.value = SAMPLE_PROMPTS.thailand;
    }

    // Initialize Chatbot if user visits chat
    if (typeof Chatbot !== 'undefined') {
      Chatbot.init();
    }
  }

  /**
   * Section Navigation (Studio vs Full Preview vs Chat)
   */
  function showSection(name) {
    const sections = {
      generator: document.getElementById('sectionGenerator'),
      preview: document.getElementById('sectionPreview'),
      chat: document.getElementById('sectionChat')
    };

    Object.values(sections).forEach(s => { if (s) s.style.display = 'none'; });
    document.querySelectorAll('.header-nav .nav-link').forEach(l => l.classList.remove('active'));

    if (name === 'generator') {
      if (sections.generator) sections.generator.style.display = 'block';
      document.getElementById('navGenerator')?.classList.add('active');
      updateLivePreviews();
    } else if (name === 'preview') {
      if (sections.preview) sections.preview.style.display = 'block';
      document.getElementById('navPreview')?.classList.add('active');
      Preview.render();
    } else if (name === 'chat') {
      if (sections.chat) sections.chat.style.display = 'flex';
      document.getElementById('navChat')?.classList.add('active');
    }

    currentSection = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupNavigation() {
    document.querySelectorAll('.header-nav .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sec = link.dataset.section;
        if (sec) showSection(sec);
      });
    });

    safe('btnBackToEditor', () => showSection('generator'));
    safe('btnPreviewStudio', () => showSection('preview'));
  }

  /**
   * Document Format Suite Switcher (Itinerary, Quotation, Hotel Costing, Summary, Confirmation, Invoice, Custom)
   */
  function setupDocTypeSuite() {
    document.querySelectorAll('.doc-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const docType = pill.dataset.doctype;
        switchDocType(docType);
      });
    });
  }

  function switchDocType(docType) {
    if (!docType) return;
    QuotationData.activeDocType = docType;

    // Update active pill
    document.querySelectorAll('.doc-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.doctype === docType);
    });

    // Auto-navigate to relevant editor tab for user convenience
    const tabMap = {
      'itinerary': 'tabDays',
      'quotation': 'tabSummary',
      'hotel_costing': 'tabHotels',
      'summary': 'tabSummary',
      'confirmation': 'tabConfirmation',
      'invoice': 'tabInvoice',
      'custom': 'tabCustomBuilder'
    };

    const targetTab = tabMap[docType];
    if (targetTab) {
      document.querySelectorAll('.b-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === targetTab));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === targetTab));
    }

    if (typeof DOCUMENT_TYPES !== 'undefined' && DOCUMENT_TYPES[docType]) {
      const meta = DOCUMENT_TYPES[docType];
      showToast(`Switched format: ${meta.name} (${meta.badge})`, 'info');
    }

    updateLivePreviews();
  }

  /**
   * Builder Tab Switcher (Package, Days, Summary, Offices, Sections, Theme, AI)
   */
  function setupBuilderTabs() {
    document.querySelectorAll('.b-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;
        document.querySelectorAll('.b-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  /**
   * Live Preview Zoom Controls
   */
  function setupZoomControls() {
    document.querySelectorAll('.btn-zoom').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-zoom').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scale = parseFloat(btn.dataset.scale) || 1.0;
        previewZoomScale = scale;
        const frame = document.getElementById('previewLiveFrame');
        if (frame) {
          frame.style.transform = `scale(${scale})`;
        }
      });
    });
  }

  /**
   * Sample Loaders (12D Thailand Reference, Dubai, Kashmir)
   */
  function setupSamplePickers() {
    const toggleBtn = document.getElementById('btnHeaderSampleToggle');
    const dropdown = document.getElementById('sampleDropdown');

    if (toggleBtn && dropdown) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#samplePickerWrap')) {
          dropdown.style.display = 'none';
        }
      });

      dropdown.querySelectorAll('.sample-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          const sampleKey = opt.dataset.sample;
          dropdown.style.display = 'none';
          loadSampleDestination(sampleKey);
        });
      });
    }

    safe('btnResetToDefault', () => {
      loadSampleDestination('reference');
    });

    safe('btnResetStudio', () => {
      loadSampleDestination('reference');
      showToast('Reset to 12-Day Master Reference Quotation.', 'info');
    });
  }

  function loadSampleDestination(key) {
    loadSampleDataset(key);
    populateStudioFromData();
    const rawBox = document.getElementById('aiRawInput');
    if (rawBox && SAMPLE_PROMPTS[key]) {
      rawBox.value = SAMPLE_PROMPTS[key];
    }
    showToast(`Loaded ${QuotationData.package.destinations || 'Quotation'} successfully!`, 'success');
  }

  /**
   * Populate All Studio Inputs from QuotationData
   */
  function populateStudioFromData() {
    const d = QuotationData;
    const pkg = d.package || {};

    // Package fields
    val('bPkgTitle', pkg.title || 'PACKAGE TOUR');
    val('bPkgDuration', pkg.duration || '');
    val('bPkgDestinations', pkg.destinations || '');
    val('bPkgTravellers', pkg.travellers || '');
    val('bPkgPaxCount', pkg.paxCount || 2);
    val('bPkgQuoteRef', pkg.quoteRef || '');
    val('bPkgPrepDate', pkg.preparedDate || '');
    val('bPkgClientName', pkg.clientName || '');
    val('bPkgClientContact', pkg.clientContact || '');
    val('bPkgPickup', pkg.pickupFrom || '');
    val('bPkgExchangeRate', pkg.usdToInrRate || 87.5);

    // Global Footer Contacts
    const ftr = d.footerSettings || {};
    val('bFooterPhones', ftr.phones || '');
    val('bFooterWebsite', ftr.website || '');
    val('bFooterInstagram', ftr.instagram || '');

    // Inclusions & Exclusions
    const inclSec = (d.customSections || []).find(s => s.id === 'inclusions');
    if (inclSec) val('bInclusionsText', (inclSec.items || []).join('\n'));

    const exclSec = (d.customSections || []).find(s => s.id === 'exclusions');
    if (exclSec) val('bExclusionsText', (exclSec.items || []).join('\n'));

    const notesSec = (d.customSections || []).find(s => s.id === 'important_notes');
    if (notesSec) val('bImportantNotesText', (notesSec.items || []).join('\n'));

    // Theme Controls
    const theme = d.themeSettings || {};
    val('bThemeTemplate', theme.template || 'classic');
    val('bThemePreset', theme.preset || 'classic-blue');
    val('bColPrimary', theme.primaryColor || '#0F2C59');
    val('bColSecondary', theme.secondaryColor || '#1E3A8A');
    val('bColAccent', theme.accentColor || '#2563EB');
    val('bColTableBg', theme.tableHeaderBg || '#0F2C59');
    val('bColText', theme.textColor || '#1E293B');
    val('bColBorder', theme.borderColor || '#CBD5E1');

    // Dynamic Lists
    renderDaysEditor();
    renderHotelsEditor();
    renderSummaryEditor();
    renderOfficesEditor();
    renderCustomFields();
    renderCustomDocEditor();

    // Multi-format tab fields
    populateInvoiceFields();
    populateConfirmationFields();
    populateCustomDocFields();

    // Sync active format pill to match QuotationData.activeDocType
    const activeDoc = d.activeDocType || 'quotation';
    document.querySelectorAll('.doc-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.doctype === activeDoc);
    });

    // Update Totals and Live View
    updateLiveTotalsDisplay();
    updateLivePreviews();
  }

  /**
   * Package Inputs Sync Listeners
   */
  function setupPackageInputs() {
    const pkgIds = [
      'bPkgTitle', 'bPkgDuration', 'bPkgDestinations', 'bPkgTravellers',
      'bPkgPaxCount', 'bPkgQuoteRef', 'bPkgPrepDate', 'bPkgClientName',
      'bPkgClientContact', 'bPkgPickup', 'bPkgExchangeRate'
    ];

    pkgIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          syncPackageData();
          updateLiveTotalsDisplay();
          updateLivePreviews();
        });
      }
    });

    ['bFooterPhones', 'bFooterWebsite', 'bFooterInstagram'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          if (!QuotationData.footerSettings) QuotationData.footerSettings = {};
          QuotationData.footerSettings.phones = get('bFooterPhones');
          QuotationData.footerSettings.website = get('bFooterWebsite');
          QuotationData.footerSettings.instagram = get('bFooterInstagram');
          updateLivePreviews();
        });
      }
    });

    ['bInclusionsText', 'bExclusionsText', 'bImportantNotesText'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          syncCustomSections();
          updateLivePreviews();
        });
      }
    });

    safe('btnAddDayTop', addNewDay);
    safe('btnAddDayBottom', addNewDay);
    safe('btnAddSummaryItem', addNewSummaryItem);
    safe('btnAddOfficeBtn', addNewOffice);
    safe('btnAddCustomFieldBtn', addNewCustomField);
    safe('btnAddHotelBtn', addNewHotel);
    safe('btnAddCustomSecBtn', addNewCustomSection);

    // Invoice input listeners
    const invIds = ['bInvNumber', 'bInvDate', 'bInvDueDate', 'bInvBillTo', 'bInvTaxRate', 'bInvBankName', 'bInvAccNo', 'bInvIfsc', 'bInvUpi', 'bInvSignatory'];
    invIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          syncInvoiceData();
          updateLivePreviews();
        });
      }
    });

    // Confirmation input listeners
    const confIds = ['bConfBookingRef', 'bConfLeadPax', 'bConfContact', 'bConfEmergency', 'bConfInstructions'];
    confIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          syncConfirmationData();
          updateLivePreviews();
        });
      }
    });

    // Custom Document Title listener
    const custTitle = document.getElementById('bCustomDocTitle');
    if (custTitle) {
      custTitle.addEventListener('input', () => {
        if (!QuotationData.customDocument) QuotationData.customDocument = { title: '', sections: [] };
        QuotationData.customDocument.title = custTitle.value;
        updateLivePreviews();
      });
    }

    // Quick Markup & Surcharges
    safe('btnApplyHotelMarkup', () => {
      const pct = parseFloat(get('quickMarkupHotelPct')) || 10;
      applyMarkupAdjustments({ hotelPercent: pct });
      renderSummaryEditor();
      renderDaysEditor();
      renderHotelsEditor();
      updateLiveTotalsDisplay();
      updateLivePreviews();
    });

    safe('btnApplyActivityUSD', () => {
      const usd = parseFloat(get('quickMarkupActivityUSD')) || 20;
      applyMarkupAdjustments({ activityUSD: usd });
      renderSummaryEditor();
      renderDaysEditor();
      renderHotelsEditor();
      updateLiveTotalsDisplay();
      updateLivePreviews();
    });

    safe('btnApplyCombinedMarkup', () => {
      const pct = parseFloat(get('quickMarkupHotelPct')) || 10;
      const usd = parseFloat(get('quickMarkupActivityUSD')) || 20;
      applyMarkupAdjustments({ hotelPercent: pct, activityUSD: usd });
      renderSummaryEditor();
      renderDaysEditor();
      renderHotelsEditor();
      updateLiveTotalsDisplay();
      updateLivePreviews();
    });
  }

  function syncPackageData() {
    const pkg = QuotationData.package;
    pkg.title = get('bPkgTitle');
    pkg.duration = get('bPkgDuration');
    pkg.destinations = get('bPkgDestinations');
    pkg.travellers = get('bPkgTravellers');
    pkg.paxCount = parseInt(get('bPkgPaxCount'), 10) || 2;
    pkg.quoteRef = get('bPkgQuoteRef');
    pkg.preparedDate = get('bPkgPrepDate');
    pkg.clientName = get('bPkgClientName');
    pkg.clientContact = get('bPkgClientContact');
    pkg.pickupFrom = get('bPkgPickup');
    pkg.usdToInrRate = parseFloat(get('bPkgExchangeRate')) || 87.5;

    recalculateQuotationPricing();
  }

  function parseLines(id) {
    return (get(id) || '').split('\n').map(s => s.trim()).filter(Boolean);
  }

  function syncCustomSections() {
    let incl = QuotationData.customSections.find(s => s.id === 'inclusions');
    if (!incl) {
      incl = { id: 'inclusions', title: 'Package Inclusions', type: 'list', items: [] };
      QuotationData.customSections.push(incl);
    }
    incl.items = parseLines('bInclusionsText');

    let excl = QuotationData.customSections.find(s => s.id === 'exclusions');
    if (!excl) {
      excl = { id: 'exclusions', title: 'Package Exclusions', type: 'list', items: [] };
      QuotationData.customSections.push(excl);
    }
    excl.items = parseLines('bExclusionsText');

    let notes = QuotationData.customSections.find(s => s.id === 'important_notes');
    if (!notes) {
      notes = { id: 'important_notes', title: 'Important Quotation Notes', type: 'list', items: [] };
      QuotationData.customSections.push(notes);
    }
    notes.items = parseLines('bImportantNotesText');
  }

  function populateInvoiceFields() {
    const inv = QuotationData.invoice || {};
    val('bInvNumber', inv.number || 'LE-INV-2027-112');
    val('bInvDate', inv.date || '02 Jan 2027');
    val('bInvDueDate', inv.dueDate || '13 Jan 2027');
    val('bInvBillTo', inv.billTo || QuotationData.package.clientName || 'Package for 2 pax');
    val('bInvTaxRate', inv.taxRate !== undefined ? inv.taxRate : 5);
    val('bInvBankName', inv.bankName || 'HDFC Bank Ltd');
    val('bInvAccNo', inv.accountNumber || '50200088991122');
    val('bInvIfsc', inv.ifsc || 'HDFC0001234');
    val('bInvUpi', inv.upi || 'letsexplore@hdfcbank');
    val('bInvSignatory', inv.signatory || "Let's Explore DMC Authorized Signatory");
  }

  function syncInvoiceData() {
    if (!QuotationData.invoice) QuotationData.invoice = {};
    const inv = QuotationData.invoice;
    inv.number = get('bInvNumber');
    inv.date = get('bInvDate');
    inv.dueDate = get('bInvDueDate');
    inv.billTo = get('bInvBillTo');
    inv.taxRate = parseFloat(get('bInvTaxRate')) || 0;
    inv.bankName = get('bInvBankName');
    inv.accountNumber = get('bInvAccNo');
    inv.ifsc = get('bInvIfsc');
    inv.upi = get('bInvUpi');
    inv.signatory = get('bInvSignatory');
  }

  function populateConfirmationFields() {
    const conf = QuotationData.confirmation || {};
    val('bConfBookingRef', conf.bookingRef || 'CONF-LE-THAI-8891');
    val('bConfLeadPax', conf.leadPax || QuotationData.package.clientName || 'Package for 2 pax');
    val('bConfContact', conf.contactPhone || QuotationData.package.clientContact || '+91 80075 86881');
    val('bConfEmergency', conf.emergencyContact || '+66 818311204 (Mr. Jumphol Vongchun)');
    val('bConfInstructions', (conf.instructions || []).join('\n'));
  }

  function syncConfirmationData() {
    if (!QuotationData.confirmation) QuotationData.confirmation = {};
    const conf = QuotationData.confirmation;
    conf.bookingRef = get('bConfBookingRef');
    conf.leadPax = get('bConfLeadPax');
    conf.contactPhone = get('bConfContact');
    conf.emergencyContact = get('bConfEmergency');
    conf.instructions = parseLines('bConfInstructions');
  }

  function populateCustomDocFields() {
    const cust = QuotationData.customDocument || {};
    val('bCustomDocTitle', cust.title || 'VIP Travel Dossier & Custom Quotation');
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * DYNAMIC DAY-WISE ITINERARY EDITOR
   * ─────────────────────────────────────────────────────────────
   */
  function renderDaysEditor() {
    const container = document.getElementById('daysEditorContainer');
    if (!container) return;

    const days = QuotationData.days || [];
    const countBadge = document.getElementById('countDaysBadge');
    if (countBadge) countBadge.textContent = days.length;

    container.innerHTML = '';

    days.forEach((day, dIdx) => {
      const box = document.createElement('div');
      box.className = 'day-edit-box';
      box.dataset.dayIndex = dIdx;

      const hasHotel = day.hotel && day.hotel.name;

      box.innerHTML = `
        <div class="day-edit-header">
          <div class="day-badge-wrap">
            <span class="day-num-tag">DAY ${day.dayNumber}</span>
            <input type="text" class="form-input day-date-input" style="width: 100px;" placeholder="e.g. 2 Jan" value="${escapeVal(day.date)}" />
            <input type="text" class="form-input day-title-input" style="flex: 1;" placeholder="Day Title (e.g. Arrival in Krabi)" value="${escapeVal(day.title)}" />
          </div>
          <button class="btn-icon btn-del-day" title="Delete Day ${day.dayNumber}" style="color: #DC2626;">🗑️</button>
        </div>

        <!-- Activities / Items List -->
        <div class="day-act-items-container" data-day-index="${dIdx}">
          <!-- Rendered items -->
        </div>

        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="btn btn-xs btn-subtle btn-add-act" data-day-index="${dIdx}">
            + Add Activity / Transfer
          </button>
          <button class="btn btn-xs btn-outline btn-toggle-hotel" data-day-index="${dIdx}">
            🏨 ${hasHotel ? 'Edit Hotel Stay' : '+ Add Hotel Stay'}
          </button>
        </div>

        <!-- Hotel Stay Editor Block -->
        <div class="hotel-edit-box" id="hotelBox_${dIdx}" style="${hasHotel ? 'display:block' : 'display:none'}">
          <div class="hotel-edit-title">
            <span>🏨 Accommodation Block</span>
            <button class="btn-icon btn-remove-hotel" data-day-index="${dIdx}" title="Remove Hotel from this day" style="font-size:11px;">✕ Remove</button>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Hotel Name</label>
              <input type="text" class="form-input h-name-input" placeholder="e.g. Krabi Resort" value="${escapeVal(day.hotel?.name || '')}" />
            </div>
            <div class="form-group">
              <label>Stay Dates</label>
              <input type="text" class="form-input h-dates-input" placeholder="e.g. 2 Jan to 6 Jan" value="${escapeVal(day.hotel?.dates || '')}" />
            </div>
            <div class="form-group">
              <label>Room Category</label>
              <input type="text" class="form-input h-room-input" placeholder="e.g. Deluxe Pool View Room" value="${escapeVal(day.hotel?.roomType || '')}" />
            </div>
            <div class="form-group">
              <label>Meal Plan</label>
              <input type="text" class="form-input h-meal-input" placeholder="e.g. Daily Buffet Breakfast" value="${escapeVal(day.hotel?.mealPlan || '')}" />
            </div>
            <div class="form-group full-width" style="grid-column: span 2;">
              <label>Hotel Note / Perks</label>
              <input type="text" class="form-input h-notes-input" placeholder="e.g. Complimentary Wi-Fi & welcome drink" value="${escapeVal(day.hotel?.notes || '')}" />
            </div>
          </div>
        </div>

        <!-- Special Day Notes -->
        <div class="day-notes-box">
          <input type="text" class="form-input day-footnote-input" placeholder="Special Note (e.g. meals not included / Day @ Leisure)" value="${escapeVal(day.dayNotes || '')}" />
        </div>
      `;

      container.appendChild(box);

      // Render activities for this day
      renderDayActivities(box.querySelector('.day-act-items-container'), day, dIdx);
      attachDayEventListeners(box, dIdx);
    });
  }

  function renderDayActivities(container, day, dIdx) {
    container.innerHTML = '';
    const items = day.items || [];

    items.forEach((item, aIdx) => {
      const actBox = document.createElement('div');
      actBox.className = 'act-item-box';
      actBox.innerHTML = `
        <div class="act-grid-row-1">
          <input type="text" class="form-input act-title-input" placeholder="Activity / Transfer Name" value="${escapeVal(item.title)}" />
          <input type="text" class="form-input act-sub-input" placeholder="Details (e.g. Adult · 81.00 × 2)" value="${escapeVal(item.subtitle || '')}" />
          <button class="btn-icon btn-del-act" data-day-index="${dIdx}" data-act-index="${aIdx}" title="Delete Activity">✕</button>
        </div>
        <div class="act-grid-row-2">
          <div>
            <label style="font-size:10px; color:#64748B;">Pax</label>
            <input type="number" class="form-input act-pax-input" placeholder="2" value="${item.pax || 2}" />
          </div>
          <div>
            <label style="font-size:10px; color:#64748B;">Amount (USD)</label>
            <input type="number" class="form-input act-usd-input" step="0.5" placeholder="0" value="${item.amountUSD || 0}" />
          </div>
          <div>
            <label style="font-size:10px; color:#64748B;">Amount (INR)</label>
            <input type="number" class="form-input act-inr-input" placeholder="0" value="${item.amountINR || 0}" />
          </div>
          <div>
            <label style="font-size:10px; color:#64748B;">Tag / Special Badge</label>
            <select class="form-input act-tag-select">
              <option value="">None</option>
              <option value="Day @ Leisure" ${item.tag === 'Day @ Leisure' ? 'selected' : ''}>Day @ Leisure</option>
              <option value="meals not included" ${item.tag === 'meals not included' ? 'selected' : ''}>meals not included</option>
              <option value="Personal Expense" ${item.tag === 'Personal Expense' ? 'selected' : ''}>Personal Expense</option>
              <option value="National Park Fee Included" ${item.tag === 'National Park Fee Included' ? 'selected' : ''}>National Park Fee Included</option>
            </select>
          </div>
        </div>
      `;

      container.appendChild(actBox);

      // Attach item event listeners
      const tInp = actBox.querySelector('.act-title-input');
      const sInp = actBox.querySelector('.act-sub-input');
      const pInp = actBox.querySelector('.act-pax-input');
      const uInp = actBox.querySelector('.act-usd-input');
      const iInp = actBox.querySelector('.act-inr-input');
      const tagSel = actBox.querySelector('.act-tag-select');
      const delBtn = actBox.querySelector('.btn-del-act');

      const syncItem = () => {
        item.title = tInp.value;
        item.subtitle = sInp.value;
        item.pax = parseInt(pInp.value, 10) || 2;
        item.amountUSD = parseFloat(uInp.value) || 0;

        // Auto-convert to INR if INR wasn't manually typed differently
        const rate = QuotationData.package.usdToInrRate || 87.5;
        if (document.activeElement === uInp) {
          item.amountINR = Math.round(item.amountUSD * rate);
          iInp.value = item.amountINR;
        } else {
          item.amountINR = parseFloat(iInp.value) || 0;
        }

        item.tag = tagSel.value;
        updateLivePreviews();
      };

      [tInp, sInp, pInp, uInp, iInp].forEach(el => el.addEventListener('input', syncItem));
      tagSel.addEventListener('change', syncItem);

      delBtn.addEventListener('click', () => {
        day.items.splice(aIdx, 1);
        renderDayActivities(container, day, dIdx);
        updateLivePreviews();
      });
    });
  }

  function attachDayEventListeners(box, dIdx) {
    const day = QuotationData.days[dIdx];
    const dateInp = box.querySelector('.day-date-input');
    const titleInp = box.querySelector('.day-title-input');
    const fnInp = box.querySelector('.day-footnote-input');
    const delDayBtn = box.querySelector('.btn-del-day');
    const addActBtn = box.querySelector('.btn-add-act');
    const toggleHotelBtn = box.querySelector('.btn-toggle-hotel');
    const removeHotelBtn = box.querySelector('.btn-remove-hotel');
    const hotelBox = box.querySelector('.hotel-edit-box');

    // Day level inputs
    dateInp.addEventListener('input', () => {
      day.date = dateInp.value;
      updateLivePreviews();
    });

    titleInp.addEventListener('input', () => {
      day.title = titleInp.value;
      updateLivePreviews();
    });

    fnInp.addEventListener('input', () => {
      day.dayNotes = fnInp.value;
      updateLivePreviews();
    });

    // Delete day
    delDayBtn.addEventListener('click', () => {
      QuotationData.days.splice(dIdx, 1);
      // Renumber
      QuotationData.days.forEach((d, i) => { d.dayNumber = i + 1; });
      renderDaysEditor();
      updateLivePreviews();
    });

    // Add activity
    addActBtn.addEventListener('click', () => {
      if (!day.items) day.items = [];
      day.items.push({
        title: 'New Sightseeing / Excursion',
        subtitle: `Adult · 30.00 × ${QuotationData.package.paxCount || 2}`,
        category: 'Sightseeing',
        pax: QuotationData.package.paxCount || 2,
        unitPrice: 30,
        amountUSD: 30 * (QuotationData.package.paxCount || 2),
        amountINR: Math.round(30 * (QuotationData.package.paxCount || 2) * (QuotationData.package.usdToInrRate || 87.5)),
        tag: ''
      });
      renderDayActivities(box.querySelector('.day-act-items-container'), day, dIdx);
      updateLivePreviews();
    });

    // Hotel block toggle & fields
    toggleHotelBtn.addEventListener('click', () => {
      if (hotelBox.style.display === 'none') {
        hotelBox.style.display = 'block';
        if (!day.hotel) {
          day.hotel = {
            name: 'Leading Category Resort',
            dates: day.date || '',
            roomType: 'Deluxe Room',
            mealPlan: 'Daily Buffet Breakfast',
            notes: ''
          };
          box.querySelector('.h-name-input').value = day.hotel.name;
          box.querySelector('.h-dates-input').value = day.hotel.dates;
          box.querySelector('.h-room-input').value = day.hotel.roomType;
          box.querySelector('.h-meal-input').value = day.hotel.mealPlan;
        }
      } else {
        hotelBox.style.display = 'none';
      }
      updateLivePreviews();
    });

    removeHotelBtn.addEventListener('click', () => {
      day.hotel = null;
      hotelBox.style.display = 'none';
      toggleHotelBtn.textContent = '🏨 + Add Hotel Stay';
      updateLivePreviews();
    });

    // Hotel inputs sync
    const hnInp = box.querySelector('.h-name-input');
    const hdInp = box.querySelector('.h-dates-input');
    const hrInp = box.querySelector('.h-room-input');
    const hmInp = box.querySelector('.h-meal-input');
    const hntInp = box.querySelector('.h-notes-input');

    const syncHotel = () => {
      if (!day.hotel) day.hotel = {};
      day.hotel.name = hnInp.value;
      day.hotel.dates = hdInp.value;
      day.hotel.roomType = hrInp.value;
      day.hotel.mealPlan = hmInp.value;
      day.hotel.notes = hntInp.value;
      updateLivePreviews();
    };

    [hnInp, hdInp, hrInp, hmInp, hntInp].forEach(el => el.addEventListener('input', syncHotel));
  }

  function addNewDay() {
    const days = QuotationData.days;
    const nextNum = days.length + 1;
    days.push({
      dayNumber: nextNum,
      date: `Day ${nextNum}`,
      title: 'Itinerary Sightseeing & Activities',
      items: [
        {
          title: 'Curated Sightseeing Excursion',
          subtitle: `Guided excursion with AC transfers · Adult · 40.00 × ${QuotationData.package.paxCount || 2}`,
          category: 'Sightseeing',
          pax: QuotationData.package.paxCount || 2,
          unitPrice: 40,
          amountUSD: 40 * (QuotationData.package.paxCount || 2),
          amountINR: Math.round(40 * (QuotationData.package.paxCount || 2) * (QuotationData.package.usdToInrRate || 87.5)),
          tag: ''
        }
      ],
      hotel: null,
      dayNotes: ''
    });
    renderDaysEditor();
    updateLivePreviews();
    showToast(`Added Day ${nextNum} to itinerary.`, 'info');
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * DYNAMIC PRICE SUMMARY EDITOR
   * ─────────────────────────────────────────────────────────────
   */
  function renderSummaryEditor() {
    const container = document.getElementById('summaryRowsContainer');
    if (!container) return;

    const summary = QuotationData.summary || { items: [] };
    const items = summary.items || [];
    container.innerHTML = '';

    items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'summary-edit-row';
      row.innerHTML = `
        <input type="text" class="form-input s-name-input" placeholder="Cost Component (e.g. Hotel Costing)" value="${escapeVal(item.name)}" />
        <input type="number" class="form-input s-usd-input" step="1" placeholder="USD $" value="${item.amountUSD || 0}" />
        <input type="number" class="form-input s-inr-input" placeholder="INR ₹" value="${item.amountINR || 0}" />
        <button class="btn-icon btn-del-summary" title="Remove Row">✕</button>
      `;

      container.appendChild(row);

      const nInp = row.querySelector('.s-name-input');
      const uInp = row.querySelector('.s-usd-input');
      const iInp = row.querySelector('.s-inr-input');
      const delBtn = row.querySelector('.btn-del-summary');

      const syncSum = () => {
        item.name = nInp.value;
        item.amountUSD = parseFloat(uInp.value) || 0;
        const rate = QuotationData.package.usdToInrRate || 87.5;
        if (document.activeElement === uInp) {
          item.amountINR = Math.round(item.amountUSD * rate);
          iInp.value = item.amountINR;
        } else {
          item.amountINR = parseFloat(iInp.value) || 0;
        }
        recalculateQuotationPricing();
        updateLiveTotalsDisplay();
        updateLivePreviews();
      };

      [nInp, uInp, iInp].forEach(el => el.addEventListener('input', syncSum));

      delBtn.addEventListener('click', () => {
        items.splice(idx, 1);
        recalculateQuotationPricing();
        renderSummaryEditor();
        updateLiveTotalsDisplay();
        updateLivePreviews();
      });
    });
  }

  function addNewSummaryItem() {
    if (!QuotationData.summary) QuotationData.summary = { items: [] };
    QuotationData.summary.items.push({
      name: 'Additional Service / Charge',
      amountUSD: 100,
      amountINR: Math.round(100 * (QuotationData.package.usdToInrRate || 87.5))
    });
    recalculateQuotationPricing();
    renderSummaryEditor();
    updateLiveTotalsDisplay();
    updateLivePreviews();
  }

  function updateLiveTotalsDisplay() {
    recalculateQuotationPricing();
    const inrEl = document.getElementById('studioTotalInr');
    const usdEl = document.getElementById('studioTotalUsd');
    if (inrEl) inrEl.textContent = formatCurrencyINR(QuotationData.summary.totalINR);
    if (usdEl) usdEl.textContent = `(${formatCurrencyUSD(QuotationData.summary.totalUSD)})`;
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * DYNAMIC OFFICES EDITOR
   * ─────────────────────────────────────────────────────────────
   */
  function renderOfficesEditor() {
    const container = document.getElementById('officesListContainer');
    if (!container) return;

    const offices = QuotationData.offices || [];
    container.innerHTML = '';

    offices.forEach((office, idx) => {
      const card = document.createElement('div');
      card.className = 'office-edit-card';
      card.innerHTML = `
        <div class="office-card-header">
          <span class="office-title-text">${office.name || 'Office Desk'}</span>
          <button class="btn-icon btn-del-office" title="Remove Office" style="color:#DC2626; font-size:11px;">🗑️ Delete</button>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Office / Desk Name</label>
            <input type="text" class="form-input o-name-inp" placeholder="e.g. THAILAND OFFICE" value="${escapeVal(office.name)}" />
          </div>
          <div class="form-group">
            <label>Country</label>
            <input type="text" class="form-input o-country-inp" placeholder="e.g. Thailand" value="${escapeVal(office.country || '')}" />
          </div>
          <div class="form-group full-width" style="grid-column: span 2;">
            <label>Operating Partner / Company</label>
            <input type="text" class="form-input o-company-inp" placeholder="e.g. Operated by One Trip · Co-partners by Let's Explore DMC" value="${escapeVal(office.company || '')}" />
          </div>
          <div class="form-group">
            <label>Contact Person</label>
            <input type="text" class="form-input o-person-inp" placeholder="e.g. Mr. Jumphol Vongchun" value="${escapeVal(office.contactPerson || '')}" />
          </div>
          <div class="form-group">
            <label>Designation</label>
            <input type="text" class="form-input o-desig-inp" placeholder="e.g. Sales & Mktg Director" value="${escapeVal(office.designation || '')}" />
          </div>
          <div class="form-group full-width" style="grid-column: span 2;">
            <label>Full Address</label>
            <input type="text" class="form-input o-addr-inp" placeholder="229/63 Thesaban 4 Road, Saraburi..." value="${escapeVal(office.address || '')}" />
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="text" class="form-input o-phone-inp" placeholder="+66 818311204" value="${escapeVal(office.phone || '')}" />
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="text" class="form-input o-email-inp" placeholder="thailand@letsexploredmc.com" value="${escapeVal(office.email || '')}" />
          </div>
        </div>
      `;

      container.appendChild(card);

      const nInp = card.querySelector('.o-name-inp');
      const cInp = card.querySelector('.o-country-inp');
      const coInp = card.querySelector('.o-company-inp');
      const pInp = card.querySelector('.o-person-inp');
      const dInp = card.querySelector('.o-desig-inp');
      const aInp = card.querySelector('.o-addr-inp');
      const phInp = card.querySelector('.o-phone-inp');
      const emInp = card.querySelector('.o-email-inp');
      const delBtn = card.querySelector('.btn-del-office');

      const syncOff = () => {
        office.name = nInp.value;
        office.country = cInp.value;
        office.company = coInp.value;
        office.contactPerson = pInp.value;
        office.designation = dInp.value;
        office.address = aInp.value;
        office.phone = phInp.value;
        office.email = emInp.value;
        card.querySelector('.office-title-text').textContent = office.name || 'Office Desk';
        updateLivePreviews();
      };

      [nInp, cInp, coInp, pInp, dInp, aInp, phInp, emInp].forEach(el => el.addEventListener('input', syncOff));

      delBtn.addEventListener('click', () => {
        offices.splice(idx, 1);
        renderOfficesEditor();
        updateLivePreviews();
      });
    });
  }

  function addNewOffice() {
    if (!QuotationData.offices) QuotationData.offices = [];
    QuotationData.offices.push({
      id: 'office-' + Date.now(),
      name: 'NEW REGIONAL DESK',
      country: 'Global',
      city: '',
      company: 'Let\'s Explore DMC Network Partner',
      contactPerson: 'Ground Representative',
      designation: 'Operations Desk',
      address: 'City Operations Center',
      phone: '+91 80075 86881',
      email: 'info@letsexploredmc.com'
    });
    renderOfficesEditor();
    updateLivePreviews();
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * CUSTOM KEY-VALUE FIELDS EDITOR
   * ─────────────────────────────────────────────────────────────
   */
  function renderCustomFields() {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;

    const fields = QuotationData.customFields || [];
    container.innerHTML = '';

    fields.forEach((field, idx) => {
      const row = document.createElement('div');
      row.className = 'custom-field-row';
      row.innerHTML = `
        <input type="text" class="form-input cf-key-input" placeholder="Field Name (e.g. Visa)" value="${escapeVal(field.key)}" />
        <input type="text" class="form-input cf-val-input" placeholder="Field Value (e.g. On Arrival Included)" value="${escapeVal(field.value)}" />
        <button class="btn-icon btn-del-cf" title="Remove Field">✕</button>
      `;

      container.appendChild(row);

      const kInp = row.querySelector('.cf-key-input');
      const vInp = row.querySelector('.cf-val-input');
      const delBtn = row.querySelector('.btn-del-cf');

      const syncField = () => {
        field.key = kInp.value;
        field.value = vInp.value;
        updateLivePreviews();
      };

      kInp.addEventListener('input', syncField);
      vInp.addEventListener('input', syncField);

      delBtn.addEventListener('click', () => {
        fields.splice(idx, 1);
        renderCustomFields();
        updateLivePreviews();
      });
    });
  }

  function addNewCustomField() {
    if (!QuotationData.customFields) QuotationData.customFields = [];
    QuotationData.customFields.push({ key: 'Special Remark', value: 'Details here' });
    renderCustomFields();
    updateLivePreviews();
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * DYNAMIC HOTEL PROPERTIES & COMPARISON EDITOR
   * ─────────────────────────────────────────────────────────────
   */
  function renderHotelsEditor() {
    const container = document.getElementById('hotelsEditorContainer');
    if (!container) return;

    const hotels = QuotationData.hotels || [];
    const countBadge = document.getElementById('countHotelsBadge');
    if (countBadge) countBadge.textContent = hotels.length;

    container.innerHTML = '';

    if (hotels.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:20px; color:#64748B; background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:6px;">
          No hotel properties added yet. Click "+ Add Hotel" above to configure accommodations.
        </div>
      `;
      return;
    }

    hotels.forEach((hotel, hIdx) => {
      const card = document.createElement('div');
      card.className = 'hotel-edit-card';
      card.style.cssText = 'background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; padding:14px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);';
      
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#0F2C59; color:#FFFFFF; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px;">HOTEL ${hIdx + 1}</span>
            <strong style="color:#0F2C59; font-size:13.5px;" class="h-title-text">${hotel.name || 'New Hotel'}</strong>
            <span style="font-size:11px; color:#64748B;">(${hotel.city || 'Destination'})</span>
          </div>
          <button class="btn-icon btn-del-hotel" title="Remove Hotel" style="color:#DC2626; font-size:12px; font-weight:600; cursor:pointer; background:none; border:none;">🗑️ Delete</button>
        </div>

        <div class="form-grid-3" style="gap:10px; margin-bottom:10px;">
          <div class="form-group" style="grid-column: span 2;">
            <label style="font-size:11px;">Hotel Property Name</label>
            <input type="text" class="form-input form-input-sm h-name-inp" value="${escapeVal(hotel.name)}" placeholder="e.g. Sunset Beach Resort" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">City / Area</label>
            <input type="text" class="form-input form-input-sm h-city-inp" value="${escapeVal(hotel.city)}" placeholder="e.g. Phuket" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Check-In Date</label>
            <input type="text" class="form-input form-input-sm h-checkin-inp" value="${escapeVal(hotel.checkIn)}" placeholder="e.g. 08 Jan 2027" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Check-Out Date</label>
            <input type="text" class="form-input form-input-sm h-checkout-inp" value="${escapeVal(hotel.checkOut)}" placeholder="e.g. 10 Jan 2027" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Nights</label>
            <input type="number" class="form-input form-input-sm h-nights-inp" value="${hotel.nights || 1}" min="1" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Room Category</label>
            <input type="text" class="form-input form-input-sm h-room-inp" value="${escapeVal(hotel.roomType)}" placeholder="e.g. Superior Room Sea View" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Number of Rooms</label>
            <input type="number" class="form-input form-input-sm h-rooms-inp" value="${hotel.rooms || 1}" min="1" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Meal Plan</label>
            <input type="text" class="form-input form-input-sm h-meal-inp" value="${escapeVal(hotel.mealPlan)}" placeholder="e.g. Bed & Breakfast (CP)" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Cancellation Policy</label>
            <input type="text" class="form-input form-input-sm h-cancel-inp" value="${escapeVal(hotel.cancellation)}" placeholder="e.g. Free cancellation until 48 hrs" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Cost INR (₹)</label>
            <input type="number" class="form-input form-input-sm h-inr-inp" value="${hotel.amountInr || 0}" />
          </div>
          <div class="form-group">
            <label style="font-size:11px;">Cost USD ($)</label>
            <input type="number" step="0.01" class="form-input form-input-sm h-usd-inp" value="${hotel.amountUsd || 0}" />
          </div>
        </div>

        <!-- 3-Tier Tariff Comparison for Hotel Costing Format -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:8px 10px; margin-top:8px;">
          <span style="font-size:10.5px; font-weight:700; color:#1E3A8A; text-transform:uppercase; letter-spacing:0.5px;">Hotel Costing Document — 3-Tier Comparison Options</span>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:6px;">
            <div class="form-group" style="margin-bottom:0;">
              <label style="font-size:10px; color:#166534;">Option 1: Free Cancellation (₹)</label>
              <input type="number" class="form-input form-input-sm h-opt1-inp" value="${hotel.option1Price || hotel.amountInr || 0}" />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label style="font-size:10px; color:#991B1B;">Option 2: Non-Refundable (₹)</label>
              <input type="number" class="form-input form-input-sm h-opt2-inp" value="${hotel.option2Price || Math.round((hotel.amountInr || 0) * 0.9)}" />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label style="font-size:10px; color:#854D0E;">Option 3: Partial Refund (₹)</label>
              <input type="number" class="form-input form-input-sm h-opt3-inp" value="${hotel.option3Price || Math.round((hotel.amountInr || 0) * 0.95)}" />
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);

      const nameInp = card.querySelector('.h-name-inp');
      const cityInp = card.querySelector('.h-city-inp');
      const cinInp = card.querySelector('.h-checkin-inp');
      const coutInp = card.querySelector('.h-checkout-inp');
      const nInp = card.querySelector('.h-nights-inp');
      const rInp = card.querySelector('.h-room-inp');
      const roomsInp = card.querySelector('.h-rooms-inp');
      const mInp = card.querySelector('.h-meal-inp');
      const canInp = card.querySelector('.h-cancel-inp');
      const inrInp = card.querySelector('.h-inr-inp');
      const usdInp = card.querySelector('.h-usd-inp');
      const opt1Inp = card.querySelector('.h-opt1-inp');
      const opt2Inp = card.querySelector('.h-opt2-inp');
      const opt3Inp = card.querySelector('.h-opt3-inp');
      const delBtn = card.querySelector('.btn-del-hotel');

      const syncHotel = () => {
        hotel.name = nameInp.value;
        hotel.city = cityInp.value;
        hotel.checkIn = cinInp.value;
        hotel.checkOut = coutInp.value;
        hotel.nights = parseInt(nInp.value, 10) || 1;
        hotel.roomType = rInp.value;
        hotel.rooms = parseInt(roomsInp.value, 10) || 1;
        hotel.mealPlan = mInp.value;
        hotel.cancellation = canInp.value;
        hotel.amountInr = parseFloat(inrInp.value) || 0;
        hotel.amountUsd = parseFloat(usdInp.value) || 0;
        hotel.option1Price = parseFloat(opt1Inp.value) || hotel.amountInr;
        hotel.option2Price = parseFloat(opt2Inp.value) || 0;
        hotel.option3Price = parseFloat(opt3Inp.value) || 0;
        
        card.querySelector('.h-title-text').textContent = hotel.name || 'New Hotel';
        updateLivePreviews();
      };

      [nameInp, cityInp, cinInp, coutInp, nInp, rInp, roomsInp, mInp, canInp, inrInp, usdInp, opt1Inp, opt2Inp, opt3Inp].forEach(el => {
        el.addEventListener('input', syncHotel);
      });

      delBtn.addEventListener('click', () => {
        hotels.splice(hIdx, 1);
        renderHotelsEditor();
        updateLivePreviews();
      });
    });
  }

  function addNewHotel() {
    if (!QuotationData.hotels) QuotationData.hotels = [];
    QuotationData.hotels.push({
      id: 'hotel-' + Date.now(),
      name: 'New Luxury Resort & Spa',
      city: QuotationData.package.destinations ? QuotationData.package.destinations.split('+')[0].trim() : 'Destination',
      checkIn: '02 Jan 2027',
      checkOut: '05 Jan 2027',
      nights: 3,
      roomType: 'Deluxe Room',
      rooms: 1,
      mealPlan: 'Bed & Breakfast (CP)',
      cancellation: 'Free cancellation until 48 hrs prior',
      refundability: 'Refundable',
      amountInr: 25000,
      amountUsd: 285.71,
      option1Price: 25000,
      option2Price: 22500,
      option3Price: 23750,
      notes: 'Welcome drink and complimentary Wi-Fi'
    });
    renderHotelsEditor();
    updateLivePreviews();
    showToast('Added new hotel property.', 'success');
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * CUSTOM MODULAR DOCUMENT BUILDER EDITOR
   * ─────────────────────────────────────────────────────────────
   */
  function renderCustomDocEditor() {
    const container = document.getElementById('customDocSectionsContainer');
    if (!container) return;

    if (!QuotationData.customDocument) {
      QuotationData.customDocument = {
        title: 'VIP Travel Dossier & Custom Quotation',
        sections: []
      };
    }

    const doc = QuotationData.customDocument;
    const sections = doc.sections || [];
    container.innerHTML = '';

    if (sections.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:20px; color:#64748B; background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:6px;">
          No sections added to this custom document yet. Use the dropdown and "+ Add Section" above to construct your layout!
        </div>
      `;
      return;
    }

    sections.forEach((sec, sIdx) => {
      const card = document.createElement('div');
      card.className = 'custom-sec-edit-card';
      card.style.cssText = 'background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; padding:12px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.04);';

      const typeLabels = {
        text: '📝 Text Block',
        hotel: '🏨 Hotel Table',
        activity: '✦ Activities List',
        pricing: '💰 Pricing Schedule',
        notes: '📌 Important Notes',
        office: '🏢 Global Offices',
        signature: '✍️ Signature Box'
      };

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#2563EB; color:#FFF; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">${typeLabels[sec.type] || sec.type}</span>
            <input type="text" class="form-input form-input-sm sec-title-inp" value="${escapeVal(sec.title)}" placeholder="Section Title" style="font-weight:600; width:220px;" />
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button class="btn btn-xs btn-outline btn-sec-up" ${sIdx === 0 ? 'disabled style="opacity:0.4;"' : ''} title="Move Up">▲</button>
            <button class="btn btn-xs btn-outline btn-sec-down" ${sIdx === sections.length - 1 ? 'disabled style="opacity:0.4;"' : ''} title="Move Down">▼</button>
            <button class="btn-icon btn-del-sec" style="color:#DC2626; font-size:12px; cursor:pointer; background:none; border:none;" title="Delete Section">🗑️</button>
          </div>
        </div>

        ${sec.type === 'text' || sec.type === 'notes' ? `
          <textarea class="form-input form-input-sm sec-content-inp" rows="3" placeholder="Enter paragraph content or bullet lines (one per line)...">${escapeVal(sec.content || '')}</textarea>
        ` : `
          <div style="font-size:11px; color:#475569; background:#F1F5F9; padding:6px 10px; border-radius:4px;">
            ⚡ Dynamically renders synced data from your central package (${sec.type.toUpperCase()}). You can optionally add custom footnotes below:
            <textarea class="form-input form-input-sm sec-content-inp" rows="2" style="margin-top:6px;" placeholder="Optional notes or remarks for this section...">${escapeVal(sec.content || '')}</textarea>
          </div>
        `}
      `;

      container.appendChild(card);

      const titleInp = card.querySelector('.sec-title-inp');
      const contentInp = card.querySelector('.sec-content-inp');
      const upBtn = card.querySelector('.btn-sec-up');
      const downBtn = card.querySelector('.btn-sec-down');
      const delBtn = card.querySelector('.btn-del-sec');

      titleInp.addEventListener('input', () => {
        sec.title = titleInp.value;
        updateLivePreviews();
      });

      if (contentInp) {
        contentInp.addEventListener('input', () => {
          sec.content = contentInp.value;
          updateLivePreviews();
        });
      }

      if (upBtn && sIdx > 0) {
        upBtn.addEventListener('click', () => {
          const temp = sections[sIdx];
          sections[sIdx] = sections[sIdx - 1];
          sections[sIdx - 1] = temp;
          renderCustomDocEditor();
          updateLivePreviews();
        });
      }

      if (downBtn && sIdx < sections.length - 1) {
        downBtn.addEventListener('click', () => {
          const temp = sections[sIdx];
          sections[sIdx] = sections[sIdx + 1];
          sections[sIdx + 1] = temp;
          renderCustomDocEditor();
          updateLivePreviews();
        });
      }

      delBtn.addEventListener('click', () => {
        sections.splice(sIdx, 1);
        renderCustomDocEditor();
        updateLivePreviews();
      });
    });
  }

  function addNewCustomSection() {
    if (!QuotationData.customDocument) QuotationData.customDocument = { title: 'VIP Travel Dossier', sections: [] };
    const typeSel = document.getElementById('selectNewCustomSecType');
    const type = typeSel ? typeSel.value : 'text';

    const defaultNames = {
      text: 'Special Guidelines & Overview',
      hotel: 'Accommodation & Stay Summary',
      activity: 'Curated Sightseeing Schedule',
      pricing: 'Commercial Price Breakdown',
      notes: 'Important Terms & Conditions',
      office: 'Global Concierge & Network Desks',
      signature: 'Authorization & Sign-Off'
    };

    QuotationData.customDocument.sections.push({
      id: 'sec-' + Date.now(),
      type: type,
      title: defaultNames[type] || 'Custom Section',
      content: type === 'text' || type === 'notes' ? 'Enter detailed information or instructions here.' : ''
    });

    renderCustomDocEditor();
    updateLivePreviews();
    showToast(`Added ${defaultNames[type]} section to Custom Document.`, 'success');
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * THEME & TEMPLATE CONTROLLERS
   * ─────────────────────────────────────────────────────────────
   */
  function setupThemeControls() {
    const tplSel = document.getElementById('bThemeTemplate');
    if (tplSel) {
      tplSel.addEventListener('change', () => {
        if (!QuotationData.themeSettings) QuotationData.themeSettings = {};
        QuotationData.themeSettings.template = tplSel.value;
        updateLivePreviews();
      });
    }

    const preSel = document.getElementById('bThemePreset');
    if (preSel) {
      preSel.addEventListener('change', () => {
        const presetKey = preSel.value;
        if (THEME_PRESETS[presetKey]) {
          const p = THEME_PRESETS[presetKey];
          Object.assign(QuotationData.themeSettings, p);
          QuotationData.themeSettings.preset = presetKey;

          val('bColPrimary', p.primaryColor);
          val('bColSecondary', p.secondaryColor);
          val('bColAccent', p.accentColor);
          val('bColTableBg', p.tableHeaderBg);
          val('bColText', p.textColor);
          val('bColBorder', p.borderColor);

          updateLivePreviews();
        }
      });
    }

    const colorMap = [
      { id: 'bColPrimary', key: 'primaryColor' },
      { id: 'bColSecondary', key: 'secondaryColor' },
      { id: 'bColAccent', key: 'accentColor' },
      { id: 'bColTableBg', key: 'tableHeaderBg' },
      { id: 'bColText', key: 'textColor' },
      { id: 'bColBorder', key: 'borderColor' }
    ];

    colorMap.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          if (!QuotationData.themeSettings) QuotationData.themeSettings = {};
          QuotationData.themeSettings[key] = el.value;
          updateLivePreviews();
        });
      }
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * LIVE REAL-TIME PREVIEW SYNCHRONIZATION
   * ─────────────────────────────────────────────────────────────
   */
  function updateLivePreviews() {
    const html = Preview.buildQuotationHTML(QuotationData, false);

    // 1. Right side Studio panel
    const liveContainer = document.getElementById('previewDocumentLive');
    if (liveContainer) liveContainer.innerHTML = html;

    // 2. Full-page dedicated preview section
    const fullContainer = document.getElementById('previewDocument');
    if (fullContainer) fullContainer.innerHTML = html;
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * AI EXTRACTION EXECUTION
   * ─────────────────────────────────────────────────────────────
   */
  function setupAIExtractor() {
    const btn = document.getElementById('btnExtractAI');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const rawBox = document.getElementById('aiRawInput');
      const text = rawBox ? rawBox.value.trim() : '';

      if (!text) {
        showToast('Please enter enquiry details or rough notes to extract.', 'warning');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Parsing Notes...`;

      const stepper = document.getElementById('extractionSteps');
      if (stepper) stepper.style.display = 'block';

      const setStep = (num, state) => {
        const el = document.getElementById(`parseStep${num}`);
        if (!el) return;
        if (state === 'active') {
          el.className = 'step-item active';
          el.querySelector('.step-icon').textContent = '⏳';
        } else if (state === 'done') {
          el.className = 'step-item done';
          el.querySelector('.step-icon').textContent = '✓';
        }
      };

      setStep(1, 'active');
      await sleep(200);
      setStep(1, 'done');
      setStep(2, 'active');
      await sleep(200);
      setStep(2, 'done');
      setStep(3, 'active');
      await sleep(200);
      setStep(3, 'done');
      setStep(4, 'active');

      try {
        const extracted = await AIParser.parseText(text, QuotationData);

        // Populate QuotationData from extracted result
        if (extracted.package) {
          Object.assign(QuotationData.package, extracted.package);
        } else {
          // Heuristic mapping if parsed by fallback
          if (extracted.trip) {
            QuotationData.package.destinations = extracted.trip.destination || QuotationData.package.destinations;
            QuotationData.package.duration = extracted.trip.duration || QuotationData.package.duration;
            QuotationData.package.travellers = extracted.trip.travellers || QuotationData.package.travellers;
          }
          if (extracted.client) {
            QuotationData.package.clientName = extracted.client.name || QuotationData.package.clientName;
            QuotationData.package.clientContact = extracted.client.contact || QuotationData.package.clientContact;
            QuotationData.package.pickupFrom = extracted.client.pickupFrom || QuotationData.package.pickupFrom;
          }
        }

        if (extracted.days && extracted.days.length > 0) {
          QuotationData.days = extracted.days;
        }

        if (extracted.hotels && extracted.hotels.length > 0) {
          QuotationData.hotels = extracted.hotels;
        }

        if (extracted.summary && extracted.summary.items) {
          QuotationData.summary = extracted.summary;
        }

        recalculateQuotationPricing();
        populateStudioFromData();

        setStep(4, 'done');
        await sleep(250);

        showToast('Extracted successfully into the Master Reference structure!', 'success');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Error extracting quotation details.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span>Extract & Populate Quotation</span>
        `;
      }
    });

    safe('btnClearInput', () => {
      const rawBox = document.getElementById('aiRawInput');
      if (rawBox) rawBox.value = '';
    });

    // Quick Prompt Chips
    document.querySelectorAll('.btn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const promptKey = chip.dataset.prompt;
        const rawBox = document.getElementById('aiRawInput');
        if (rawBox && SAMPLE_PROMPTS[promptKey]) {
          rawBox.value = SAMPLE_PROMPTS[promptKey];
          showToast(`Loaded ${chip.textContent.trim()} prompt. Click 'Extract' to apply!`, 'info');
        }
      });
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * EXPORT & GENERATION HANDLERS
   * ─────────────────────────────────────────────────────────────
   */
  function setupExportButtons() {
    // Generate PDF buttons
    const triggerPDF = () => {
      try {
        syncPackageData();
        syncCustomSections();
        syncInvoiceData();
        syncConfirmationData();
        if (typeof DBManager !== 'undefined') {
          try { DBManager.saveQuotation(); } catch (e) { console.warn('DB autosave notice:', e); }
        }
        PDFGenerator.generate();
      } catch (err) {
        console.error('PDF generation error:', err);
        showToast('PDF error: ' + (err.message || err), 'error');
      }
    };

    safe('btnGeneratePDF', triggerPDF);
    safe('btnDirectPDFStudio', triggerPDF);
    safe('btnQuickPDF', triggerPDF);

    // DOCX buttons
    const triggerDOCX = () => {
      try {
        syncPackageData();
        syncCustomSections();
        syncInvoiceData();
        syncConfirmationData();
        if (typeof DBManager !== 'undefined') {
          try { DBManager.saveQuotation(); } catch (e) { console.warn('DB autosave notice:', e); }
        }
        DOCXGenerator.generate();
      } catch (err) {
        console.error('DOCX generation error:', err);
        showToast('DOCX error: ' + (err.message || err), 'error');
      }
    };

    safe('btnGenerateDOCX', triggerDOCX);
    safe('btnDirectDOCXStudio', triggerDOCX);
  }

  /**
   * Database Modal & History Handlers
   */
  function setupDatabaseButtons() {
    safe('btnOpenDbHistory', () => {
      if (typeof DBManager !== 'undefined') DBManager.openModal();
    });
    safe('btnCloseDbModal', () => {
      if (typeof DBManager !== 'undefined') DBManager.closeModal();
    });
    safe('btnRefreshDbHistory', () => {
      if (typeof DBManager !== 'undefined') DBManager.refreshHistory();
    });

    const triggerSave = () => {
      try {
        syncPackageData();
        syncCustomSections();
        syncInvoiceData();
        syncConfirmationData();
        if (typeof DBManager !== 'undefined') DBManager.saveQuotation();
      } catch (err) {
        console.error('Save error:', err);
        showToast('Save error: ' + err.message, 'error');
      }
    };

    safe('btnSaveToDbStudio', triggerSave);
    safe('btnSaveToDbPreview', triggerSave);
  }

  /**
   * Free Google Gemini 2.0 AI Setup Modal & Key Management
   */
  function setupApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    const inputKey = document.getElementById('inputGeminiApiKey');
    const statusText = document.getElementById('keyStatusText');
    const statusDisplay = document.getElementById('keyStatusDisplay');
    const engineLabel = document.getElementById('aiEngineLabel');
    const btnLabel = document.getElementById('btnApiKeyLabel');
    const aiKeyBanner = document.getElementById('aiKeyBanner');
    const statusPill = document.getElementById('aiStatusPill');

    function updateKeyUIState() {
      const activeKey = CONFIG.GEMINI_API_KEY;
      const isConnected = !!(activeKey && activeKey !== 'YOUR_GEMINI_API_KEY_HERE');

      if (isConnected) {
        if (inputKey && !inputKey.value) inputKey.value = activeKey;
        if (statusText) statusText.textContent = 'Active & Connected to Gemini 2.0 Flash';
        if (statusDisplay) {
          statusDisplay.className = 'key-status-indicator connected';
        }
        if (engineLabel) engineLabel.textContent = 'Gemini 2.0 Flash (Connected)';
        if (btnLabel) btnLabel.textContent = 'AI Key: Active ✓';
        if (aiKeyBanner) aiKeyBanner.className = 'ai-key-banner active-gemini';
        if (statusPill) {
          statusPill.innerHTML = `<span class="status-dot" style="background:#16A34A;"></span><span class="status-text">Gemini 2.0 Connected</span>`;
        }
      } else {
        if (statusText) statusText.textContent = 'Offline Heuristic Parser (API Key Not Configured)';
        if (statusDisplay) {
          statusDisplay.className = 'key-status-indicator';
        }
        if (engineLabel) engineLabel.textContent = 'Offline Heuristic Parser';
        if (btnLabel) btnLabel.textContent = 'Free AI Setup';
        if (aiKeyBanner) aiKeyBanner.className = 'ai-key-banner';
        if (statusPill) {
          statusPill.innerHTML = `<span class="status-dot"></span><span class="status-text">Studio Engine Ready</span>`;
        }
      }
    }

    const openModal = () => {
      if (modal) modal.style.display = 'flex';
      const activeKey = CONFIG.GEMINI_API_KEY;
      if (inputKey && activeKey) inputKey.value = activeKey;
      updateKeyUIState();
    };

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    safe('btnOpenApiKeyModal', openModal);
    safe('btnQuickKeySetup', openModal);
    safe('btnCloseApiKeyModal', closeModal);

    // Click outside to close
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Eye toggle for password visibility
    const toggleVisBtn = document.getElementById('btnToggleKeyVis');
    if (toggleVisBtn && inputKey) {
      toggleVisBtn.addEventListener('click', () => {
        if (inputKey.type === 'password') {
          inputKey.type = 'text';
          toggleVisBtn.textContent = '🔒';
        } else {
          inputKey.type = 'password';
          toggleVisBtn.textContent = '👁️';
        }
      });
    }

    // Test Key button
    safe('btnTestApiKey', async () => {
      const keyVal = inputKey ? inputKey.value.trim() : '';
      if (!keyVal) {
        showToast('Please enter an API Key to test.', 'warning');
        return;
      }
      const testBtn = document.getElementById('btnTestApiKey');
      const origText = testBtn.innerHTML;
      testBtn.disabled = true;
      testBtn.innerHTML = 'Testing...';

      try {
        if (typeof AIParser !== 'undefined' && typeof AIParser.testApiKey === 'function') {
          await AIParser.testApiKey(keyVal);
        } else {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyVal}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'OK' }] }] })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }
        if (statusText) statusText.textContent = 'Success! Gemini 2.0 Flash is responding.';
        if (statusDisplay) statusDisplay.className = 'key-status-indicator connected';
        showToast('Connection verified successfully! Click Save to apply.', 'success');
      } catch (err) {
        console.error(err);
        if (statusText) statusText.textContent = 'Connection failed: ' + (err.message || 'Invalid Key');
        if (statusDisplay) statusDisplay.className = 'key-status-indicator error';
        showToast('Error: ' + (err.message || 'Invalid API Key'), 'error');
      } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = origText;
      }
    });

    // Save Key button
    safe('btnSaveApiKey', () => {
      const keyVal = inputKey ? inputKey.value.trim() : '';
      if (!keyVal) {
        showToast('Please enter your Gemini API key.', 'warning');
        return;
      }
      CONFIG.GEMINI_API_KEY = keyVal;
      updateKeyUIState();
      closeModal();
      showToast('Gemini 2.0 Flash API activated successfully!', 'success');
    });

    // Clear Key button
    safe('btnClearApiKey', () => {
      localStorage.removeItem('dmc_gemini_api_key');
      CONFIG.GEMINI_API_KEY = '';
      if (inputKey) inputKey.value = '';
      updateKeyUIState();
      showToast('API Key disconnected. Running in offline rule mode.', 'info');
    });

    // Initial check
    updateKeyUIState();
  }

  /**
   * Helpers
   */
  function val(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = (value !== undefined && value !== null) ? value : '';
  }

  function get(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function safe(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeVal(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/"/g, '&quot;');
  }

  return {
    init,
    showSection,
    switchDocType,
    renderDaysEditor,
    renderHotelsEditor,
    renderSummaryEditor,
    renderOfficesEditor,
    renderCustomFields,
    renderCustomDocEditor,
    updateLivePreviews
  };

})();

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
