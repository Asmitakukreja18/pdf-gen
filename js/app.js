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
    setupBuilderTabs();
    setupZoomControls();
    setupSamplePickers();
    setupAIExtractor();
    setupPackageInputs();
    setupThemeControls();
    setupExportButtons();
    setupDatabaseButtons();

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
    renderSummaryEditor();
    renderOfficesEditor();
    renderCustomFields();

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

  function syncCustomSections() {
    const parseLines = (id) => (get(id) || '').split('\n').map(s => s.trim()).filter(Boolean);

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
        const extracted = await AIParser.parseText(text);

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
      syncPackageData();
      syncCustomSections();
      if (typeof DBManager !== 'undefined') DBManager.saveQuotation();
      PDFGenerator.generate();
    };

    safe('btnGeneratePDF', triggerPDF);
    safe('btnDirectPDFStudio', triggerPDF);
    safe('btnQuickPDF', triggerPDF);

    // DOCX buttons
    const triggerDOCX = () => {
      syncPackageData();
      syncCustomSections();
      if (typeof DBManager !== 'undefined') DBManager.saveQuotation();
      DOCXGenerator.generate();
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
      syncPackageData();
      syncCustomSections();
      if (typeof DBManager !== 'undefined') DBManager.saveQuotation();
    };

    safe('btnSaveToDbStudio', triggerSave);
    safe('btnSaveToDbPreview', triggerSave);
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
    renderDaysEditor,
    renderSummaryEditor,
    renderOfficesEditor,
    renderCustomFields,
    updateLivePreviews
  };

})();

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
