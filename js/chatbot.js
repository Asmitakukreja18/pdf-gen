/**
 * chatbot.js — Conversational AI Travel Quotation Assistant
 * Integrates directly with AIParser and QuotationData.
 * Extracts trip details, gives rich instant responses, auto-verifies calculations,
 * and enables 1-click preview, PDF, and DOCX generation.
 */

const Chatbot = (() => {

  // State
  let history = [];
  let isTyping = false;
  let initialized = false;

  // DOM Refs
  const $ = (id) => document.getElementById(id);
  const msgs = () => $('chatMessages');
  const typing = () => $('typingIndicator');
  const replies = () => $('quickReplies');
  const input = () => $('chatInput');
  const sendBtn = () => $('btnSend');

  /**
   * Initialize Chatbot
   */
  function init() {
    if (initialized) return;
    initialized = true;
    history = [];
    renderWelcome();
    setupInputHandlers();
  }

  function renderWelcome() {
    appendAI(
      `Hi there! 👋 Welcome to <strong>Let's Explore DMC</strong> AI Quotation Engine.<br>` +
      `I can extract package details from natural language, WhatsApp messages, or rough notes for <strong>any destination worldwide</strong> (Dubai, Thailand, Kashmir, Bali, Singapore, etc.) and generate a locked professional 12-section quotation instantly.<br><br>` +
      `Choose a quick sample below or type/paste your enquiry details naturally!`
    );
    showReplies([
      { label: '🌟 Dubai Luxury (5D)', val: '__SAMPLE_DUBAI__', primary: true },
      { label: '🌴 Thailand Escape (6D)', val: '__SAMPLE_THAI__' },
      { label: '🏔️ Kashmir Valley (6D)', val: '__SAMPLE_KASH__' },
      { label: '🌺 Bali Holiday (5D)', val: '__SAMPLE_BALI__' },
      { label: '✍️ Messy Notes Demo', val: '__SAMPLE_MESSY__' }
    ]);
  }

  /**
   * Setup Input Handlers
   */
  function setupInputHandlers() {
    const inp = input(), btn = sendBtn();
    if (!inp || !btn) return;

    inp.addEventListener('input', () => {
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
    });

    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitInput(inp.value.trim());
      }
    });

    btn.addEventListener('click', () => submitInput(inp.value.trim()));
  }

  function submitInput(text) {
    if (!text || isTyping) return;
    clearInput();
    clearReplies();
    appendUser(text);
    processMessage(text);
  }

  /**
   * Main Message Processing
   */
  async function processMessage(text) {
    const t = text.trim();

    // Check single-action command intents
    if (/^(pdf|download\s*pdf|generate\s*pdf)$/i.test(t)) {
      PDFGenerator.generate();
      appendAI('Opening print-ready A4 PDF quotation dialog...');
      return;
    }
    if (/^(docx|word|download\s*docx|generate\s*docx)$/i.test(t)) {
      DOCXGenerator.generate();
      appendAI('Preparing and downloading your editable Word (.docx) quotation...');
      return;
    }
    if (/^(preview|view\s*preview|show\s*preview|dekho)$/i.test(t)) {
      App.showSection('preview');
      appendAI('Switching to official Quotation Preview!');
      return;
    }
    if (/^(restart|reset|naya|new|fresh|clear)$/i.test(t)) {
      resetQuotationData();
      App.showSection('generator');
      appendAI('Cleared! Tell me the client name, destination, and travel dates to start a new quotation.');
      return;
    }

    setTyping(true);

    try {
      // Use AIParser to extract structured data
      const extracted = await AIParser.parseText(text);

      // Apply to QuotationData
      Object.assign(QuotationData.client, extracted.client);
      Object.assign(QuotationData.trip, extracted.trip);
      Object.assign(QuotationData.flights, extracted.flights);
      Object.assign(QuotationData.landArrangement, extracted.landArrangement);
      Object.assign(QuotationData.pricing, extracted.pricing);
      if (extracted.contact) Object.assign(QuotationData.contact, extracted.contact);

      recalculateQuotationPricing();

      // Sync form if App functions exist
      if (typeof App !== 'undefined') {
        if (typeof App.populateFormFromData === 'function') App.populateFormFromData();
        if (typeof App.updateLivePriceDisplay === 'function') App.updateLivePriceDisplay();
      }

      setTyping(false);

      const d = QuotationData;
      const fCost = formatCurrencyINR(d.pricing.flights);
      const lCost = formatCurrencyINR(d.pricing.landPackage);
      const tCost = formatCurrencyINR(d.pricing.total);

      appendAI(
        `✅ <strong>Quotation Generated Successfully!</strong><br><br>` +
        `📍 <strong>${d.trip.destination || 'Holiday'}${d.trip.country ? ', ' + d.trip.country : ''}</strong> (${d.trip.duration || '—'})<br>` +
        `👤 Client: <strong>${d.client.name || 'Valued Guest'}</strong> (Contact: ${d.client.contact || '—'})<br>` +
        `👥 Travellers: <strong>${d.trip.travellers || '2 Adults'}</strong> · 📅 Travel Date: <strong>${d.trip.travelDate || '—'}</strong><br>` +
        `✈️ Flights: <strong>${d.flights.onward.airline || 'IndiGo'} ${d.flights.onward.flightNumber || ''}</strong> (${d.flights.origin} ⇄ ${d.flights.destination} · ${d.flights.cabinClass || 'Economy'})<br>` +
        `🏨 Hotel: <strong>${d.landArrangement.hotel || 'Leading Hotel'}</strong> (${d.landArrangement.nights} Nights, ${d.landArrangement.sharing})<br>` +
        `🗺️ Itinerary: <strong>${d.landArrangement.itinerary.length} Days Day-wise Program Arranged</strong><br>` +
        `💰 Verified Total: <strong>${tCost}</strong><br>` +
        `<span style="font-size:11.5px;color:#64748B">Flights: ${fCost} + Land Package: ${lCost}</span><br><br>` +
        `Quotation document is locked in the master 12-section DMC standard. What would you like to do?`
      );

      showReplies([
        { label: '👁️ View Quotation Preview', val: '__PREVIEW__', primary: true },
        { label: '📄 Download PDF', val: '__PDF__' },
        { label: '📝 Download DOCX', val: '__DOCX__' },
        { label: '✏️ Edit in Form', val: '__MODAL_EDIT__' },
        { label: '🔄 New Quotation', val: 'restart' }
      ]);

    } catch (err) {
      console.error(err);
      setTyping(false);
      appendAI(`I noted your message: <em>"${esc(text)}"</em>.<br><br>Could you please provide the client name, destination, and travel dates so I can generate the quotation?`);
      showReplies([
        { label: '📋 Load Reference Bali Quotation', val: '__LOAD_BALI__', primary: true },
        { label: '✏️ Open Form Editor', val: '__MODAL_EDIT__' }
      ]);
    }

    scrollBottom();
  }

  /**
   * UI Helpers
   */
  function appendUser(text) {
    const el = msgs();
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.innerHTML = esc(text).replace(/\n/g, '<br>');
    el.appendChild(div);
    scrollBottom();
  }

  function appendAI(html) {
    const el = msgs();
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.innerHTML = html;
    el.appendChild(div);
    scrollBottom();
  }

  function setTyping(flag) {
    isTyping = flag;
    const el = typing();
    if (el) el.style.display = flag ? 'flex' : 'none';
    scrollBottom();
  }

  function showReplies(options) {
    const el = replies();
    if (!el) return;
    el.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `btn-reply ${opt.primary ? 'primary' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => handleReplyClick(opt));
      el.appendChild(btn);
    });
    scrollBottom();
  }

  function handleReplyClick(opt) {
    clearReplies();
    if (opt.val === 'restart') {
      resetQuotationData();
      if (typeof App !== 'undefined') {
        if (typeof App.populateFormFromData === 'function') App.populateFormFromData();
        if (typeof App.updateLivePriceDisplay === 'function') App.updateLivePriceDisplay();
        App.showSection('generator');
      }
      appendAI('Starting a fresh quotation! Enter client details or destination.');
      return;
    }
    if (opt.val.startsWith('__SAMPLE_') || opt.val === '__LOAD_BALI__') {
      let sampleKey = 'dubai';
      if (opt.val === '__SAMPLE_THAI__') sampleKey = 'thailand';
      else if (opt.val === '__SAMPLE_KASH__') sampleKey = 'kashmir';
      else if (opt.val === '__SAMPLE_BALI__' || opt.val === '__LOAD_BALI__') sampleKey = 'bali';
      else if (opt.val === '__SAMPLE_MESSY__') {
        // Parse the messy unstructured WhatsApp text
        appendUser(opt.label);
        processMessage(SAMPLE_PROMPTS.messy);
        return;
      }

      loadSampleDataset(sampleKey);
      if (typeof App !== 'undefined') {
        if (typeof App.populateFormFromData === 'function') App.populateFormFromData();
        if (typeof App.updateLivePriceDisplay === 'function') App.updateLivePriceDisplay();
      }

      const d = QuotationData;
      const fCost = formatCurrencyINR(d.pricing.flights);
      const lCost = formatCurrencyINR(d.pricing.landPackage);
      const tCost = formatCurrencyINR(d.pricing.total);

      appendAI(
        `✅ <strong>${d.trip.destination} Quotation Loaded!</strong><br><br>` +
        `📍 <strong>${d.trip.destination}</strong> (${d.trip.duration})<br>` +
        `👤 Client: <strong>${d.client.name}</strong> (Contact: ${d.client.contact})<br>` +
        `✈️ Flights: <strong>${d.flights.onward.airline} ${d.flights.onward.flightNumber}</strong> (${d.flights.origin} ⇄ ${d.flights.destination})<br>` +
        `🏨 Hotel: <strong>${d.landArrangement.hotel}</strong> (${d.landArrangement.nights} Nights, ${d.landArrangement.sharing})<br>` +
        `💰 Total Price: <strong>${tCost}</strong> (Flights: ${fCost} + Land: ${lCost})`
      );

      showReplies([
        { label: '👁️ View Quotation Preview', val: '__PREVIEW__', primary: true },
        { label: '📄 Download PDF', val: '__PDF__' },
        { label: '📝 Download DOCX', val: '__DOCX__' },
        { label: '✏️ Edit in Form', val: '__MODAL_EDIT__' },
        { label: '🔄 New Quotation', val: 'restart' }
      ]);
      return;
    }
    if (opt.val === '__PREVIEW__') {
      App.showSection('preview');
      return;
    }
    if (opt.val === '__PDF__') {
      PDFGenerator.generate();
      return;
    }
    if (opt.val === '__DOCX__') {
      DOCXGenerator.generate();
      return;
    }
    if (opt.val === '__MODAL_EDIT__') {
      App.showSection('generator');
      return;
    }

    appendUser(opt.label);
    processMessage(opt.val);
  }

  function clearReplies() {
    const el = replies();
    if (el) el.innerHTML = '';
  }

  function clearInput() {
    const i = input();
    if (i) {
      i.value = '';
      i.style.height = 'auto';
    }
  }

  function scrollBottom() {
    const el = msgs();
    if (el) {
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 50);
    }
  }

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function reset() {
    history = [];
    initialized = false;
    const c = msgs();
    if (c) c.innerHTML = '';
    clearReplies();
    clearInput();
    init();
  }

  return {
    init,
    reset,
    processMessage
  };

})();
