/**
 * app.js — Main Application Controller for Let's Explore DMC Quotation Engine
 * Coordinates AI input extraction, structured form synchronization, live preview,
 * mathematical calculations, and PDF / DOCX generation.
 */

const App = (() => {

  let currentSection = 'generator';

  /**
   * Initialize App
   */
  function init() {
    setupNavigation();
    setupDemoButtons();
    setupAIExtractor();
    setupFormInputs();
    setupItineraryManager();
    setupExportButtons();

    // Load initial sample data (Dubai by default for clean fresh look)
    loadSampleDataset('dubai');
    populateFormFromData();
    updateLivePriceDisplay();

    // Pre-fill raw text box with Dubai sample for instant demo
    const rawBox = document.getElementById('aiRawInput');
    if (rawBox && !rawBox.value) {
      rawBox.value = SAMPLE_PROMPTS.dubai;
    }

    // Initialize Chatbot if user visits chat
    Chatbot.init();
  }

  /**
   * Section Navigation
   */
  function showSection(name) {
    const sections = {
      generator: document.getElementById('sectionGenerator'),
      preview: document.getElementById('sectionPreview'),
      chat: document.getElementById('sectionChat')
    };

    // Hide all
    Object.values(sections).forEach(s => { if (s) s.style.display = 'none'; });

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    if (name === 'generator') {
      sections.generator.style.display = 'block';
      document.getElementById('navGenerator')?.classList.add('active');
    } else if (name === 'preview') {
      sections.preview.style.display = 'block';
      document.getElementById('navPreview')?.classList.add('active');
      Preview.render();
    } else if (name === 'chat') {
      sections.chat.style.display = 'flex';
      document.getElementById('navChat')?.classList.add('active');
    }

    currentSection = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sec = link.dataset.section;
        if (sec) showSection(sec);
      });
    });

    safe('btnDirectPreview', () => showSection('preview'));
    safe('btnGoToPreviewMain', () => showSection('preview'));
    safe('btnBackToEditor', () => showSection('generator'));
  }

  /**
   * Demo & Sample Load Handlers (Multi-Destination + Unstructured Notes)
   */
  function setupDemoButtons() {
    // Header Sample Dropdown Toggle
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

    // Quick Prompt Chips inside AI Panel
    document.querySelectorAll('.btn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const promptKey = chip.dataset.prompt;
        const rawBox = document.getElementById('aiRawInput');
        if (rawBox && SAMPLE_PROMPTS[promptKey]) {
          rawBox.value = SAMPLE_PROMPTS[promptKey];
          showToast(`Loaded ${chip.textContent.trim()} prompt. Click 'Extract' to generate!`, 'info');
        }
      });
    });

    // Reset Form button
    safe('btnResetToBaliDemo', () => {
      loadSampleDataset('dubai');
      populateFormFromData();
      updateLivePriceDisplay();
      const rawBox = document.getElementById('aiRawInput');
      if (rawBox) rawBox.value = SAMPLE_PROMPTS.dubai;
      showToast('Form reset to default sample package.', 'info');
    });

    safe('btnClearInput', () => {
      const rawBox = document.getElementById('aiRawInput');
      if (rawBox) rawBox.value = '';
    });
  }

  function loadSampleDestination(key) {
    loadSampleDataset(key);
    populateFormFromData();
    updateLivePriceDisplay();

    const rawBox = document.getElementById('aiRawInput');
    if (rawBox && SAMPLE_PROMPTS[key]) {
      rawBox.value = SAMPLE_PROMPTS[key];
    }

    const titleMap = {
      dubai: 'Dubai Luxury Quotation',
      thailand: 'Thailand Escape Quotation',
      kashmir: 'Kashmir Valley Quotation',
      bali: 'Bali Holiday Quotation'
    };
    showToast(`Loaded ${titleMap[key] || 'Quotation'} successfully!`, 'success');
  }

  /**
   * AI Extraction Execution & Stepper Animation
   */
  function setupAIExtractor() {
    const btn = document.getElementById('btnExtractAI');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const rawBox = document.getElementById('aiRawInput');
      const text = rawBox ? rawBox.value.trim() : '';

      if (!text) {
        showToast('Please enter travel enquiry text to extract.', 'warning');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Extracting Details...`;

      // Show Stepper Animation
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
      await sleep(250);
      setStep(1, 'done');
      setStep(2, 'active');
      await sleep(250);
      setStep(2, 'done');
      setStep(3, 'active');
      await sleep(250);
      setStep(3, 'done');
      setStep(4, 'active');

      try {
        const extracted = await AIParser.parseText(text);

        // Apply extracted data to QuotationData
        Object.assign(QuotationData.client, extracted.client);
        Object.assign(QuotationData.trip, extracted.trip);
        Object.assign(QuotationData.flights, extracted.flights);
        Object.assign(QuotationData.landArrangement, extracted.landArrangement);
        Object.assign(QuotationData.pricing, extracted.pricing);
        if (extracted.contact) Object.assign(QuotationData.contact, extracted.contact);

        recalculateQuotationPricing();
        populateFormFromData();
        updateLivePriceDisplay();

        setStep(4, 'done');
        await sleep(300);

        // Check Validation
        const val = validateQuotationData();
        const alertBox = document.getElementById('validationAlertBox');
        if (alertBox) {
          if (!val.isValid) {
            alertBox.style.display = 'flex';
            document.getElementById('alertTitle').textContent = `Incomplete Details (${val.missingFields.length} missing)`;
            document.getElementById('alertDesc').textContent = `Missing: ${val.missingFields.join(', ')}. AI did not invent data. You may complete it in the editor.`;
          } else {
            alertBox.style.display = 'none';
          }
        }

        showToast('AI successfully extracted data into locked quotation structure!', 'success');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Error parsing text. Please review input.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span>Extract & Populate Quotation</span>
        `;
      }
    });
  }

  /**
   * Populate Form from QuotationData
   */
  function populateFormFromData() {
    const d = QuotationData;
    val('fClientName', d.client.name);
    val('fClientContact', d.client.contact);
    val('fDestination', d.trip.destination);
    val('fCountry', d.trip.country);
    val('fTravelDate', d.trip.travelDate);
    val('fDuration', d.trip.duration);
    val('fTravellers', d.trip.travellers);
    val('fPickupFrom', d.client.pickupFrom);

    // Onward
    val('fOnwardFlight', `${d.flights.onward.airline || ''} ${d.flights.onward.flightNumber || ''}`.trim());
    val('fOnwardRoute', d.flights.onward.route);
    val('fOnwardDep', d.flights.onward.departure);
    val('fOnwardArr', d.flights.onward.arrival);
    val('fOnwardDur', d.flights.onward.duration);
    val('fOnwardBaggage', d.flights.onward.baggage);

    // Return
    val('fReturnFlight', `${d.flights.return.airline || ''} ${d.flights.return.flightNumber || ''}`.trim());
    val('fReturnRoute', d.flights.return.route);
    val('fReturnDep', d.flights.return.departure);
    val('fReturnArr', d.flights.return.arrival);
    val('fReturnDur', d.flights.return.duration);
    val('fReturnBaggage', d.flights.return.baggage);

    // Land
    val('fHotelName', d.landArrangement.hotel);
    val('fHotelNights', d.landArrangement.nights);
    val('fHotelSharing', d.landArrangement.sharing);
    val('fInclusions', (d.landArrangement.inclusions || []).join(' • '));
    val('fNote', d.landArrangement.note);

    // Pricing
    val('fPriceFlights', d.pricing.flights);
    val('fPriceLand', d.pricing.landPackage);

    renderItineraryInputs();
  }

  /**
   * Form Input Sync Listeners
   */
  function setupFormInputs() {
    const sync = () => {
      QuotationData.client.name = get('fClientName');
      QuotationData.client.contact = get('fClientContact');
      QuotationData.client.details = get('fClientContact');
      QuotationData.trip.destination = get('fDestination');
      QuotationData.trip.country = get('fCountry');
      QuotationData.trip.travelDate = get('fTravelDate');
      QuotationData.trip.duration = get('fDuration');
      QuotationData.trip.travellers = get('fTravellers');
      QuotationData.client.pickupFrom = get('fPickupFrom');

      // Flights
      const onwFull = get('fOnwardFlight');
      const onwParts = onwFull.split(' ');
      QuotationData.flights.onward.airline = onwParts[0] || 'IndiGo';
      QuotationData.flights.onward.flightNumber = onwParts.slice(1).join(' ') || '';
      QuotationData.flights.onward.route = get('fOnwardRoute');
      QuotationData.flights.onward.departure = get('fOnwardDep');
      QuotationData.flights.onward.arrival = get('fOnwardArr');
      QuotationData.flights.onward.duration = get('fOnwardDur');
      QuotationData.flights.onward.baggage = get('fOnwardBaggage');

      const retFull = get('fReturnFlight');
      const retParts = retFull.split(' ');
      QuotationData.flights.return.airline = retParts[0] || QuotationData.flights.onward.airline || 'IndiGo';
      QuotationData.flights.return.flightNumber = retParts.slice(1).join(' ') || '';
      QuotationData.flights.return.route = get('fReturnRoute');
      QuotationData.flights.return.departure = get('fReturnDep');
      QuotationData.flights.return.arrival = get('fReturnArr');
      QuotationData.flights.return.duration = get('fReturnDur');
      QuotationData.flights.return.baggage = get('fReturnBaggage');

      // Land
      QuotationData.landArrangement.hotel = get('fHotelName');
      QuotationData.landArrangement.nights = get('fHotelNights');
      QuotationData.landArrangement.sharing = get('fHotelSharing');
      QuotationData.landArrangement.note = get('fNote');

      const inclRaw = get('fInclusions');
      QuotationData.landArrangement.inclusions = inclRaw.split(/[•,\n]/).map(s => s.trim()).filter(Boolean);

      // Pricing
      QuotationData.pricing.flights = Math.max(0, parseInt(get('fPriceFlights'), 10) || 0);
      QuotationData.pricing.landPackage = Math.max(0, parseInt(get('fPriceLand'), 10) || 0);
      recalculateQuotationPricing();
      updateLivePriceDisplay();
    };

    const inputIds = [
      'fClientName', 'fClientContact', 'fDestination', 'fCountry', 'fTravelDate',
      'fDuration', 'fTravellers', 'fPickupFrom', 'fOnwardFlight', 'fOnwardRoute',
      'fOnwardDep', 'fOnwardArr', 'fOnwardDur', 'fOnwardBaggage', 'fReturnFlight',
      'fReturnRoute', 'fReturnDep', 'fReturnArr', 'fReturnDur', 'fReturnBaggage',
      'fHotelName', 'fHotelNights', 'fHotelSharing', 'fInclusions', 'fNote',
      'fPriceFlights', 'fPriceLand'
    ];

    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', sync);
    });
  }

  /**
   * Update Live Price Card Display
   */
  function updateLivePriceDisplay() {
    recalculateQuotationPricing();
    const f = formatCurrencyINR(QuotationData.pricing.flights);
    const l = formatCurrencyINR(QuotationData.pricing.landPackage);
    const t = formatCurrencyINR(QuotationData.pricing.total);

    const df = document.getElementById('dispFlightCost');
    const dl = document.getElementById('dispLandCost');
    const dt = document.getElementById('dispTotalCost');

    if (df) df.textContent = f;
    if (dl) dl.textContent = l;
    if (dt) dt.textContent = t;
  }

  /**
   * Dynamic Itinerary List Manager
   */
  function setupItineraryManager() {
    safe('btnAddItineraryDay', () => {
      const list = QuotationData.landArrangement.itinerary || [];
      const nextDayNum = list.length + 1;
      list.push({
        day: `Day ${nextDayNum}`,
        activity: 'Leisure and sightseeing as per programme'
      });
      renderItineraryInputs();
    });
  }

  function renderItineraryInputs() {
    const container = document.getElementById('itineraryInputsList');
    if (!container) return;

    const list = QuotationData.landArrangement.itinerary || [];
    container.innerHTML = '';

    list.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'itinerary-input-row';
      row.innerHTML = `
        <span class="day-tag">${item.day}</span>
        <input type="text" class="form-input itinerary-act-input" value="${item.activity}" data-index="${index}" />
        <button class="btn-icon btn-delete-day" data-index="${index}" title="Remove Day">✕</button>
      `;
      container.appendChild(row);
    });

    // Add input listeners
    container.querySelectorAll('.itinerary-act-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (QuotationData.landArrangement.itinerary[idx]) {
          QuotationData.landArrangement.itinerary[idx].activity = e.target.value;
        }
      });
    });

    // Add delete listeners
    container.querySelectorAll('.btn-delete-day').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        QuotationData.landArrangement.itinerary.splice(idx, 1);
        // Renumber days
        QuotationData.landArrangement.itinerary.forEach((it, i) => {
          it.day = `Day ${i + 1}`;
        });
        renderItineraryInputs();
      });
    });
  }

  /**
   * Export Handlers
   */
  function setupExportButtons() {
    safe('btnGeneratePDF', () => PDFGenerator.generate());
    safe('btnDirectPDF', () => PDFGenerator.generate());

    safe('btnGenerateDOCX', () => DOCXGenerator.generate());
    safe('btnDirectDOCX', () => DOCXGenerator.generate());
  }

  // Helpers
  function val(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
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
    return new Promise(res => setTimeout(res, ms));
  }

  return {
    init,
    showSection,
    populateFormFromData,
    updateLivePriceDisplay,
    updateSidebar: () => {},
    setProgress: () => {},
    openEditModal: () => showSection('generator'),
    showSidebarActions: () => {}
  };

})();

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-dot"></span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
