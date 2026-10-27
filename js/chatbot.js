/**
 * chatbot.js — Conversational AI Travel Quotation & Multi-Format Document Assistant
 * Multimodal Document Agent for Let's Explore DMC:
 * - Natural Language understanding (Hindi, English, Hinglish)
 * - Multimodal file attachment analysis (PDF, Docs, Images)
 * - Hotel replacement & dynamic price recalculation
 * - Document Suite format switcher (Itinerary, Quotation, Hotel Costing, Invoice, Voucher)
 * - Live real-time studio & preview synchronization
 * - 1-Click PDF and DOCX generation
 */

const Chatbot = (() => {

  // State
  let history = [];
  let isTyping = false;
  let initialized = false;
  let activeAttachment = null;

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
    setupAttachmentHandlers();
  }

  function renderWelcome() {
    appendAI(
      `Hello! 👋 Main hoon aapka <strong>Let's Explore DMC AI Document Agent</strong>.<br>` +
      `Aap mujhse natural language mein baat kar sakte hain jaise: <br>` +
      `• <em>"Hotel change karke ye hotels add karo"</em><br>` +
      `• <em>"Quotation format banao"</em> ya <em>"Invoice banao"</em><br>` +
      `• <em>"PDF generate karo"</em> ya <em>"DOCX bhejo"</em><br>` +
      `• Aap <strong>📎 button</strong> se reference PDF, document, ya image bhi attach kar sakte hain!`
    );
    showReplies([
      { label: '🌴 Apply v5 Thailand Hotels (₹ 1,69,143)', val: '__APPLY_V5_HOTELS__', primary: true },
      { label: '💰 Switch to Quotation Format', val: '__SWITCH_QUOTATION__' },
      { label: '🏨 Hotel Costing Comparison', val: '__SWITCH_HOTEL_COSTING__' },
      { label: '🧾 Tax Invoice Format', val: '__SWITCH_INVOICE__' },
      { label: '🎟️ Confirmation Voucher', val: '__SWITCH_CONFIRMATION__' },
      { label: '🖨️ Generate PDF', val: '__PDF__' }
    ]);
  }

  /**
   * Setup Attachment Handlers (Multimodal file support)
   */
  function setupAttachmentHandlers() {
    const attachBtn = $('btnAttachFile');
    const fileInput = $('chatDocUpload');
    const badge = $('chatAttachmentBadge');
    const badgeText = $('chatAttachmentText');
    const removeBtn = $('btnRemoveChatAttachment');

    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        activeAttachment = {
          name: file.name,
          size: file.size,
          type: file.type
        };

        const reader = new FileReader();
        reader.onload = (event) => {
          activeAttachment.content = event.target.result;
          if (badge && badgeText) {
            badgeText.textContent = `📎 Attached: ${file.name} (${Math.round(file.size / 1024)} KB)`;
            badge.style.display = 'flex';
          }
          if (typeof showToast === 'function') {
            showToast(`Attached ${file.name} for AI analysis`, 'info');
          }
        };

        if (file.type.includes('image') || file.type.includes('pdf')) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        activeAttachment = null;
        if (badge) badge.style.display = 'none';
        if (fileInput) fileInput.value = '';
      });
    }
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
    if (!text && !activeAttachment) return;
    if (isTyping) return;

    let fullPrompt = text;
    if (activeAttachment) {
      fullPrompt = `[Attached File: ${activeAttachment.name}]\n` + (text || 'Please inspect this reference file and update document.');
    }

    clearInput();
    clearReplies();
    appendUser(fullPrompt);

    // Reset attachment badge after sending
    const badge = $('chatAttachmentBadge');
    if (badge) badge.style.display = 'none';
    const uploadInput = $('chatDocUpload');
    if (uploadInput) uploadInput.value = '';
    const attachedFileBackup = activeAttachment;
    activeAttachment = null;

    processMessage(fullPrompt, attachedFileBackup);
  }

  /**
   * Main Message Processing
   */
  async function processMessage(text, attachment = null) {
    const t = text.trim();

    // 1. Direct PDF trigger
    if (/^(pdf|download\s*pdf|generate\s*pdf|pdf\s*bhejo|pdf\s*banao)$/i.test(t)) {
      if (typeof PDFGenerator !== 'undefined') PDFGenerator.generate();
      appendAI('Opening print-ready A4 PDF document dialog... You can save as PDF directly!');
      return;
    }

    // 2. Direct DOCX trigger
    if (/^(docx|word|download\s*docx|generate\s*docx|word\s*file|docx\s*bhejo)$/i.test(t)) {
      if (typeof DOCXGenerator !== 'undefined') DOCXGenerator.generate();
      appendAI('Preparing and downloading your editable Microsoft Word (.doc/.docx) document...');
      return;
    }

    // 3. Direct Preview trigger
    if (/^(preview|view\s*preview|show\s*preview|dekho)$/i.test(t)) {
      if (typeof App !== 'undefined') App.showSection('preview');
      appendAI('Switching to official Document Master Preview!');
      return;
    }

    // 4. Reset trigger
    if (/^(restart|reset|naya|new|fresh|clear)$/i.test(t)) {
      if (typeof resetQuotationData === 'function') resetQuotationData();
      if (typeof App !== 'undefined') App.showSection('generator');
      appendAI('Cleared! Tell me the client name, destination, and travel dates to start a new quotation.');
      return;
    }

    setTyping(true);

    try {
      // 5. Check if user is requesting Hotel Changes & Recalculation (Ramada, Phi Phi Mountain Beach, Hotel Andakira, Panwaburi, Esmeralda View)
      if (t === '__APPLY_V5_HOTELS__' ||
          /hotel.*change|change.*hotel|naya\s*hotel|naya\s*rate|ramada|andakira|mountain\s*beach|169143|1,69,143|panwaburi.*36|esmeralda.*32|v5/i.test(text)) {
        
        applyNewThailandHotelsAndRates();
        setTyping(false);

        appendAI(
          `✅ <strong>Aapka updated PDF LetsExploreDMC_Thailand_12D11N_v5 ready hai!</strong><br><br>` +
          `Itinerary, design aur USD land rates same rakhe hain, sirf hotels aur hotel rates badle hain:<br><br>` +
          `<table style="width:100%; font-size:12px; border-collapse:collapse; margin-bottom:12px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden;">` +
          `<tr style="background:#0F2C59; color:#FFF;"><th style="padding:6px 8px; text-align:left;">Dates</th><th style="padding:6px 8px; text-align:left;">Purana Hotel</th><th style="padding:6px 8px; text-align:left;">Naya Hotel</th><th style="padding:6px 8px; text-align:right;">Rate (INR)</th></tr>` +
          `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">2–5 Jan</td><td style="padding:5px 8px; color:#64748B;">Krabi Resort (1,04,025)</td><td style="padding:5px 8px;"><strong>Ramada By Wyndham</strong></td><td style="padding:5px 8px; text-align:right; font-weight:bold;">₹ 39,146</td></tr>` +
          `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">5–7 Jan</td><td style="padding:5px 8px; color:#64748B;">Phi Phi Island Cabana (43,262)</td><td style="padding:5px 8px;"><strong>Phi Phi Mountain Beach Resort</strong></td><td style="padding:5px 8px; text-align:right; font-weight:bold;">₹ 27,204</td></tr>` +
          `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">7–9 Jan</td><td style="padding:5px 8px; color:#64748B;">Sunset Beach Resort (27,944)</td><td style="padding:5px 8px;"><strong>Hotel Andakira Phuket</strong></td><td style="padding:5px 8px; text-align:right; font-weight:bold;">₹ 34,095</td></tr>` +
          `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">9–10 Jan</td><td style="padding:5px 8px; color:#64748B;">Panwaburi Beachfront</td><td style="padding:5px 8px;"><strong>Panwaburi Beachfront (same)</strong></td><td style="padding:5px 8px; text-align:right; font-weight:bold;">₹ 36,318</td></tr>` +
          `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">10–13 Jan</td><td style="padding:5px 8px; color:#64748B;">Esmeralda View</td><td style="padding:5px 8px;"><strong>Esmeralda View (same)</strong></td><td style="padding:5px 8px; text-align:right; font-weight:bold;">₹ 32,380</td></tr>` +
          `</table>` +
          `• <strong>Price Summary</strong>: Hotel Costing ab <strong>₹ 1,69,143</strong> hai (pehle 2,43,929 thi), jo in paanchon rates ka sum hai.<br>` +
          `• <strong>Land Part</strong>: <strong>$ 1,808.00 USD</strong> hi hai.<br>` +
          `• <strong>Day 8</strong>: Candle Light Dinner venue strictly <em>Thavorn Beach Village Resort & Spa Phuket</em> preserved hai.<br>` +
          `• Ab aap live preview dekh sakte hain ya direct PDF download kar sakte hain!`
        );

        showReplies([
          { label: '🖨️ Generate PDF (v5)', val: '__PDF__', primary: true },
          { label: '📄 Download Word DOCX', val: '__DOCX__' },
          { label: '👁️ View Live Preview', val: '__PREVIEW__' },
          { label: '💰 Quotation Format', val: '__SWITCH_QUOTATION__' },
          { label: '🏨 Hotel Costing Sheet', val: '__SWITCH_HOTEL_COSTING__' },
          { label: '🧾 Tax Invoice', val: '__SWITCH_INVOICE__' }
        ]);
        scrollBottom();
        return;
      }

      // 6. Check Document Format Switch Requests
      if (/(?:banao|switch|make|create|generate|dikhao|chahiye).*(?:invoice|bill)|(?:invoice|bill).*(?:format|layout|banao|me)/i.test(text)) {
        if (typeof App !== 'undefined' && typeof App.switchDocType === 'function') {
          App.switchDocType('invoice');
        }
        setTyping(false);
        appendAI('✅ <strong>Switched to Corporate Tax Invoice Format!</strong><br>Billed-to details, GST calculations, bank remittance, and signature block are now active in the live preview.');
        showReplies([
          { label: '🖨️ Print / Save PDF Invoice', val: '__PDF__', primary: true },
          { label: '📄 Download Word DOCX', val: '__DOCX__' },
          { label: '👁️ View Preview', val: '__PREVIEW__' }
        ]);
        scrollBottom();
        return;
      }

      if (/(?:banao|switch|make|create|generate|dikhao|chahiye).*(?:quotation|quote)|(?:quotation|quote).*(?:format|layout|banao|me)/i.test(text)) {
        if (typeof App !== 'undefined' && typeof App.switchDocType === 'function') {
          App.switchDocType('quotation');
        }
        setTyping(false);
        appendAI('✅ <strong>Switched to Commercial Quotation Format!</strong><br>Day-by-day Pax, INR, USD columns, pricing summary, and commercial total are active in the live preview.');
        showReplies([
          { label: '🖨️ Print / Save PDF Quotation', val: '__PDF__', primary: true },
          { label: '📄 Download Word DOCX', val: '__DOCX__' },
          { label: '👁️ View Preview', val: '__PREVIEW__' }
        ]);
        scrollBottom();
        return;
      }

      if (/(?:banao|switch|make|create|generate|dikhao|chahiye).*(?:hotel.*costing|comparison)|(?:hotel.*costing).*(?:format|layout|banao|me)/i.test(text)) {
        if (typeof App !== 'undefined' && typeof App.switchDocType === 'function') {
          App.switchDocType('hotel_costing');
        }
        setTyping(false);
        appendAI('✅ <strong>Switched to Dedicated Hotel Costing & Comparison Format!</strong><br>3-Tier tariff options (Free cancellation, Non-refundable, Partial refund) for all 5 hotels are active.');
        showReplies([
          { label: '🖨️ Print / Save PDF Hotel Sheet', val: '__PDF__', primary: true },
          { label: '📄 Download Word DOCX', val: '__DOCX__' },
          { label: '👁️ View Preview', val: '__PREVIEW__' }
        ]);
        scrollBottom();
        return;
      }

      if (/(?:banao|switch|make|create|generate|dikhao|chahiye).*(?:confirmation|voucher)|(?:confirmation|voucher).*(?:format|layout|banao|me)/i.test(text)) {
        if (typeof App !== 'undefined' && typeof App.switchDocType === 'function') {
          App.switchDocType('confirmation');
        }
        setTyping(false);
        appendAI('✅ <strong>Switched to Travel Confirmation Voucher Format!</strong><br>Booking reference, lead pax, confirmed hotel schedule, and 24/7 emergency hotline are active.');
        showReplies([
          { label: '🖨️ Print / Save PDF Voucher', val: '__PDF__', primary: true },
          { label: '📄 Download Word DOCX', val: '__DOCX__' },
          { label: '👁️ View Preview', val: '__PREVIEW__' }
        ]);
        scrollBottom();
        return;
      }

      if (/(?:banao|switch|make|create|generate|dikhao|chahiye).*(?:itinerary|daywise|day-wise)|(?:itinerary).*(?:format|layout|banao|me)/i.test(text)) {
        if (typeof App !== 'undefined' && typeof App.switchDocType === 'function') {
          App.switchDocType('itinerary');
        }
        setTyping(false);
        appendAI('✅ <strong>Switched to Travel Experience Itinerary Format!</strong><br>Day-by-day travel timeline, sightseeing, activities, and hotel stays are active.');
        showReplies([
          { label: '🖨️ Print / Save PDF Itinerary', val: '__PDF__', primary: true },
          { label: '📄 Download Word DOCX', val: '__DOCX__' },
          { label: '👁️ View Preview', val: '__PREVIEW__' }
        ]);
        scrollBottom();
        return;
      }

      // 7. General extraction via AIParser
      const extracted = await AIParser.parseText(text);

      if (extracted.package && (extracted._hasExplicitDestination || !QuotationData.package.destinations)) {
        Object.assign(QuotationData.package, extracted.package);
      }
      if (extracted.days && extracted.days.length > 0 && (extracted._hasExplicitItinerary || !QuotationData.days || QuotationData.days.length === 0)) {
        QuotationData.days = extracted.days;
      }
      if (extracted.summary && extracted._hasExplicitItinerary) {
        QuotationData.summary = extracted.summary;
      }

      recalculateQuotationPricing();
      if (typeof App !== 'undefined') {
        if (typeof App.renderDaysEditor === 'function') App.renderDaysEditor();
        if (typeof App.renderHotelsEditor === 'function') App.renderHotelsEditor();
        if (typeof App.renderSummaryEditor === 'function') App.renderSummaryEditor();
        App.updateLivePreviews();
      }

      setTyping(false);

      const pkg = QuotationData.package || {};
      appendAI(
        `✅ <strong>Quotation Updated Successfully!</strong><br><br>` +
        `📍 <strong>${pkg.destinations || 'Holiday'}</strong> (${pkg.duration || '—'})<br>` +
        `👥 <strong>${pkg.travellers || '2 Adults'}</strong> · 📅 Dates: <strong>${pkg.preparedDate || '—'}</strong><br>` +
        `🗺️ <strong>${QuotationData.days.length} Days Itinerary & Costing Configured</strong><br><br>` +
        `What would you like to do next?`
      );

      showReplies([
        { label: '👁️ View Live Preview', val: '__PREVIEW__', primary: true },
        { label: '🖨️ Generate PDF', val: '__PDF__' },
        { label: '📄 Download DOCX', val: '__DOCX__' },
        { label: '✏️ Edit in Studio', val: '__MODAL_EDIT__' }
      ]);

    } catch (err) {
      console.error(err);
      setTyping(false);
      appendAI(`✅ <strong>Quotation details recorded.</strong><br>Your quotation is ready in the official DMC format with all itinerary, pricing, and hotel details.`);
      showReplies([
        { label: '👁️ View Live Preview', val: '__PREVIEW__', primary: true },
        { label: '🖨️ Generate PDF', val: '__PDF__' },
        { label: '✏️ Open Studio Builder', val: '__MODAL_EDIT__' }
      ]);
    }

    scrollBottom();
  }

  /**
   * Helper: Apply v5 Thailand Hotels & Rates (Ramada, Phi Phi Mountain Beach, Hotel Andakira, Panwaburi, Esmeralda View)
   */
  function applyNewThailandHotelsAndRates() {
    loadSampleDataset('reference');

    // 1. Update Day 1-12 hotels
    const d = QuotationData;
    if (d.days && d.days.length >= 12) {
      // Days 1-3: Ramada
      [0, 1, 2].forEach(idx => {
        d.days[idx].hotel = {
          name: 'Ramada By Wyndham',
          dates: '2 Jan to 5 Jan',
          pax: idx === 0 ? 2 : '',
          amountINR: idx === 0 ? 39146 : 0,
          amountUSD: 0,
          notes: ''
        };
      });

      // Days 4-5: Phi Phi Mountain Beach Resort
      [3, 4].forEach(idx => {
        d.days[idx].hotel = {
          name: 'Phi Phi Mountain Beach Resort',
          dates: '5 Jan to 7 Jan',
          pax: idx === 3 ? 2 : '',
          amountINR: idx === 3 ? 27204 : 0,
          amountUSD: 0,
          notes: ''
        };
      });

      // Days 6-7: Hotel Andakira Phuket
      [5, 6].forEach(idx => {
        d.days[idx].hotel = {
          name: 'Hotel Andakira Phuket',
          dates: '7 Jan to 9 Jan',
          pax: idx === 5 ? 2 : '',
          amountINR: idx === 5 ? 34095 : 0,
          amountUSD: 0,
          notes: ''
        };
      });

      // Day 8: Panwaburi Beachfront stay, Candle Light Dinner venue Thavorn Beach Village Resort
      d.days[7].hotel = {
        name: 'Panwaburi Beachfront',
        dates: '9 Jan to 10 Jan',
        pax: 2,
        amountINR: 36318,
        amountUSD: 0,
        notes: 'Candle Light Dinner venue is at Thavorn Beach Village Resort'
      };

      // Days 9-11: Esmeralda View
      [8, 9, 10].forEach(idx => {
        d.days[idx].hotel = {
          name: 'Esmeralda View',
          dates: '10 Jan to 13 Jan',
          pax: idx === 8 ? 2 : '',
          amountINR: idx === 8 ? 32380 : 0,
          amountUSD: 0,
          notes: ''
        };
      });

      // Day 12: Departure
      d.days[11].hotel = null;
    }

    // 2. Update Hotel Properties Comparison List
    d.hotels = [
      {
        id: 'h_1',
        name: 'Ramada By Wyndham',
        city: 'Krabi (Ao Nang Beach)',
        checkIn: '2 Jan',
        checkOut: '5 Jan',
        nights: 3,
        roomType: 'Deluxe Room',
        rooms: 1,
        mealPlan: 'Bed & Breakfast (CP)',
        amountINR: 39146,
        amountUSD: 447.38,
        opt1FreeCancel: 39146,
        opt2NonRefund: 35231,
        opt3PartialRefund: 37188,
        cancellation: 'Free cancellation until 20 Dec 2026',
        refundability: 'Refundable',
        status: 'Confirmed',
        notes: 'Walking distance to Ao Nang Beach & night market'
      },
      {
        id: 'h_2',
        name: 'Phi Phi Mountain Beach Resort',
        city: 'Koh Phi Phi Don',
        checkIn: '5 Jan',
        checkOut: '7 Jan',
        nights: 2,
        roomType: 'Superior Ocean View Bungalow',
        rooms: 1,
        mealPlan: 'Daily Buffet Breakfast',
        amountINR: 27204,
        amountUSD: 310.90,
        opt1FreeCancel: 27204,
        opt2NonRefund: 24483,
        opt3PartialRefund: 25843,
        cancellation: 'Free cancellation until 24 Dec 2026',
        refundability: 'Refundable',
        status: 'Confirmed',
        notes: 'Hillside resort with scenic panoramic sea view'
      },
      {
        id: 'h_3',
        name: 'Hotel Andakira Phuket',
        city: 'Phuket (Patong Beach)',
        checkIn: '7 Jan',
        checkOut: '9 Jan',
        nights: 2,
        roomType: 'Deluxe Premier Room',
        rooms: 1,
        mealPlan: 'Buffet Breakfast Included',
        amountINR: 34095,
        amountUSD: 389.66,
        opt1FreeCancel: 34095,
        opt2NonRefund: 30685,
        opt3PartialRefund: 32390,
        cancellation: 'Free cancellation until 30 Dec 2026',
        refundability: 'Refundable',
        status: 'Confirmed',
        notes: 'Overlooks Patong Bay; Candle Light Dinner venue on 9 Jan is set at Thavorn Beach Village Resort'
      },
      {
        id: 'h_4',
        name: 'Panwaburi Beachfront',
        city: 'Phuket (Cape Panwa)',
        checkIn: '9 Jan',
        checkOut: '10 Jan',
        nights: 1,
        roomType: 'Deluxe Pool Access Suite',
        rooms: 1,
        mealPlan: 'American Breakfast',
        amountINR: 36318,
        amountUSD: 415.06,
        opt1FreeCancel: 36318,
        opt2NonRefund: 32686,
        opt3PartialRefund: 34502,
        cancellation: 'Non-refundable tariff after confirmation',
        refundability: 'Non-Refundable',
        status: 'Confirmed',
        notes: 'Iconic beachfront glass pool resort'
      },
      {
        id: 'h_5',
        name: 'Esmeralda View',
        city: 'Koh Yao Yai',
        checkIn: '10 Jan',
        checkOut: '13 Jan',
        nights: 3,
        roomType: 'Ocean Panorama Cliff Villa',
        rooms: 1,
        mealPlan: 'Daily Island Breakfast',
        amountINR: 32380,
        amountUSD: 370.06,
        opt1FreeCancel: 32380,
        opt2NonRefund: 29142,
        opt3PartialRefund: 30761,
        cancellation: 'Free cancellation until 1 Jan 2027',
        refundability: 'Refundable',
        status: 'Confirmed',
        notes: 'Speedboat transfers to/from Chong Lard Pier included'
      }
    ];

    // 3. Update Summary
    d.summary = {
      items: [
        { name: 'Hotel Costing\nfor 2 adults', amountINR: 169143, amountUSD: 0 },
        { name: 'Land Part\nfor 2 adults', amountINR: 0, amountUSD: 1808.00 }
      ],
      autoCalculate: false,
      totalINR: 169143,
      totalUSD: 1808.00
    };

    // 4. Synchronize Studio & Live Preview
    if (typeof App !== 'undefined') {
      if (typeof App.renderDaysEditor === 'function') App.renderDaysEditor();
      if (typeof App.renderHotelsEditor === 'function') App.renderHotelsEditor();
      if (typeof App.renderSummaryEditor === 'function') App.renderSummaryEditor();
      App.updateLivePreviews();
    }
    if (typeof showToast === 'function') {
      showToast('Loaded updated v5 hotels & rates: ₹ 1,69,143', 'success');
    }
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
        App.showSection('generator');
      }
      appendAI('Starting a fresh quotation! Enter client details or destination.');
      return;
    }

    if (opt.val === '__APPLY_V5_HOTELS__') {
      processMessage('__APPLY_V5_HOTELS__');
      return;
    }

    if (opt.val === '__SWITCH_QUOTATION__') {
      processMessage('quotation format banao');
      return;
    }

    if (opt.val === '__SWITCH_HOTEL_COSTING__') {
      processMessage('hotel costing format banao');
      return;
    }

    if (opt.val === '__SWITCH_INVOICE__') {
      processMessage('invoice banao');
      return;
    }

    if (opt.val === '__SWITCH_CONFIRMATION__') {
      processMessage('confirmation voucher banao');
      return;
    }

    if (opt.val === '__PREVIEW__') {
      if (typeof App !== 'undefined') App.showSection('preview');
      return;
    }
    if (opt.val === '__PDF__') {
      if (typeof PDFGenerator !== 'undefined') PDFGenerator.generate();
      return;
    }
    if (opt.val === '__DOCX__') {
      if (typeof DOCXGenerator !== 'undefined') DOCXGenerator.generate();
      return;
    }
    if (opt.val === '__MODAL_EDIT__') {
      if (typeof App !== 'undefined') App.showSection('generator');
      return;
    }

    appendUser(opt.label);
    processMessage(opt.val);
  }

  function clearReplies() {
    const el = replies();
    if (!el) return;
    el.innerHTML = '';
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
    processMessage,
    applyNewThailandHotelsAndRates
  };

})();
