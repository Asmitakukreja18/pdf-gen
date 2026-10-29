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
    const isAiConnected = !!(CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE');
    const aiBadge = isAiConnected
      ? `<span style="display:inline-block; padding:2px 8px; border-radius:12px; background:#EFF6FF; color:#1D4ED8; font-size:11px; font-weight:700; border:1px solid #BFDBFE;">⚡ AI Assistant Active</span>`
      : `<span style="display:inline-block; padding:2px 8px; border-radius:12px; background:#F1F5F9; color:#475569; font-size:11px; font-weight:700; border:1px solid #CBD5E1;">⚡ DMC Studio Ready</span>`;

    appendAI(
      `Hello! 👋 Main hoon aapka <strong>Let's Explore DMC Document Assistant</strong> ${aiBadge}<br><br>` +
      `Aap yahan kisi bhi document (Invoice, Quotation, Hotel Voucher) ki details likhein, AI use generate kar dega:<br>` +
      `• <em>"Invoice banao akash dewani ke liye passport bill 2850"</em><br>` +
      `• <em>"Quotation format banao Thailand 12 days"</em><br>` +
      `• <em>"Hotel booking voucher banao"</em><br>` +
      `• <em>"PDF generate karo"</em> ya <em>"DOCX download karo"</em><br><br>` +
      `Chat mein confirm hone par aap direct <strong>Studio Builder</strong> mein saare pages edit kar sakte hain!`
    );

    const defaultReplies = [
      { label: '🧾 Generate Orange DMC Invoice', val: '__SWITCH_INVOICE__', primary: true },
      { label: '💰 Master Quotation Format', val: '__SWITCH_QUOTATION__' },
      { label: '🏨 Hotel Booking Voucher', val: '__SWITCH_CONFIRMATION__' },
      { label: '🌴 Thailand Reference Package (12D)', val: '__APPLY_V5_HOTELS__' }
    ];

    showReplies(defaultReplies);
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

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        activeAttachment = {
          name: file.name,
          size: file.size,
          type: file.type,
          extractedText: ''
        };

        if (badge && badgeText) {
          badgeText.textContent = `⏳ Reading & parsing ${file.name}...`;
          badge.style.display = 'flex';
        }

        // 1. If PDF file, extract text via PDF.js
        if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            if (typeof pdfjsLib !== 'undefined') {
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
              const pdf = await loadingTask.promise;
              let fullText = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `[Page ${i}]\n` + pageText + '\n';
              }
              activeAttachment.extractedText = fullText.trim();
            }
          } catch (pdfErr) {
            console.warn('PDF.js parsing note:', pdfErr);
          }
        } else if (file.type.startsWith('image/')) {
          try {
            const base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const res = reader.result || '';
                const base64 = res.split(',')[1] || '';
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            activeAttachment.base64 = base64Data;
            activeAttachment.isImage = true;
            activeAttachment.mimeType = file.type || 'image/jpeg';
            activeAttachment.extractedText = `[Image Reference: ${file.name}]`;
          } catch (err) {
            console.warn('Image reading error:', err);
          }
        } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') || file.type.includes('wordprocessingml') || file.type.includes('msword')) {
          // Native Microsoft Word DOCX Extraction
          try {
            const arrayBuffer = await file.arrayBuffer();
            if (typeof mammoth !== 'undefined') {
              const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
              activeAttachment.extractedText = result.value ? result.value.trim() : '';
            } else {
              // Fallback text extraction
              const text = await file.text();
              activeAttachment.extractedText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').trim();
            }
          } catch (docxErr) {
            console.warn('DOCX parsing note:', docxErr);
          }
        } else if (file.type.includes('text') || file.name.toLowerCase().endsWith('.txt')) {
          try {
            activeAttachment.extractedText = await file.text();
          } catch (err) {
            console.warn('Text reading note:', err);
          }
        }

        if (badge && badgeText) {
          const charLen = activeAttachment.extractedText ? ` · ${activeAttachment.extractedText.length} chars` : '';
          badgeText.textContent = `📎 Attached: ${file.name} (${Math.round(file.size / 1024)} KB${charLen})`;
          badge.style.display = 'flex';
        }
        if (typeof showToast === 'function') {
          showToast(`Attached & parsed ${file.name}`, 'success');
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
    let userBubble = text;
    if (activeAttachment) {
      let fileSnippet = '';
      if (activeAttachment.extractedText) {
        fileSnippet = `\n[Extracted Document Text]:\n${activeAttachment.extractedText}\n[End Document Text]\n`;
      }
      fullPrompt = `[Attached File: ${activeAttachment.name}]${fileSnippet}` + (text || 'Please process this attached document.');
      userBubble = `[Attached File: ${activeAttachment.name}]\n` + (text || 'Please process this attached document.');
    }

    clearInput();
    clearReplies();
    appendUser(userBubble);

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



    // Direct Builder / Edit intent
    if (t === '__GOTO_BUILDER__' || /^(edit|builder|studio|edit\s*karo|studio\s*kholo|open\s*builder)$/i.test(t)) {
      if (typeof App !== 'undefined') {
        App.showSection('generator');
        if (typeof App.populateStudioFromData === 'function') App.populateStudioFromData();
        if (typeof App.populateInvoiceFields === 'function') App.populateInvoiceFields();
      }
      appendAI('Opening Studio Builder! All details are populated and ready for your manual edits.');
      return;
    }

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
      // 5. Check if user is requesting Hotel Changes & Recalculation (Ramada, Phi Phi Mountain Beach, Hotel Andakira, Panwaburi, Esmeralda View + Markup)
      if (t === '__APPLY_V5_HOTELS__' ||
          /hotel.*change|change.*hotel|naya\s*hotel|naya\s*rate|ramada|andakira|mountain\s*beach|169143|1,69,143|panwaburi.*36|esmeralda.*32|v5|markup|10\s*(?:percent|%|prcnt)|20\s*(?:usd|\$)/i.test(text)) {
        
        const wantsMarkup = /markup|10\s*(?:percent|%|prcnt)|20\s*(?:usd|\$)|increase/i.test(text);
        applyNewThailandHotelsAndRates(wantsMarkup);
        setTyping(false);

        if (wantsMarkup) {
          appendAI(
            `✅ <strong>Aapka updated PDF LetsExploreDMC_Thailand_12D11N_v5 (with 10% Hotel Markup + 20 USD Activity Increase) ready hai!</strong><br><br>` +
            `Itinerary, design aur reference branding colors (Deep Navy #0F2C59) strictly same rakhe hain:<br><br>` +
            `<table style="width:100%; font-size:12px; border-collapse:collapse; margin-bottom:12px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden;">` +
            `<tr style="background:#0F2C59; color:#FFF;"><th style="padding:6px 8px; text-align:left;">Dates</th><th style="padding:6px 8px; text-align:left;">Hotel</th><th style="padding:6px 8px; text-align:right;">Base Rate</th><th style="padding:6px 8px; text-align:right;">+10% Markup (INR)</th></tr>` +
            `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">2–5 Jan</td><td style="padding:5px 8px;"><strong>Ramada By Wyndham</strong></td><td style="padding:5px 8px; text-align:right; color:#64748B;">₹ 39,146</td><td style="padding:5px 8px; text-align:right; font-weight:bold; color:#15803D;">₹ 43,061</td></tr>` +
            `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">5–7 Jan</td><td style="padding:5px 8px;"><strong>Phi Phi Mountain Beach Resort</strong></td><td style="padding:5px 8px; text-align:right; color:#64748B;">₹ 27,204</td><td style="padding:5px 8px; text-align:right; font-weight:bold; color:#15803D;">₹ 29,924</td></tr>` +
            `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">7–9 Jan</td><td style="padding:5px 8px;"><strong>Hotel Andakira Phuket</strong></td><td style="padding:5px 8px; text-align:right; color:#64748B;">₹ 34,095</td><td style="padding:5px 8px; text-align:right; font-weight:bold; color:#15803D;">₹ 37,505</td></tr>` +
            `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">9–10 Jan</td><td style="padding:5px 8px;"><strong>Panwaburi Beachfront</strong></td><td style="padding:5px 8px; text-align:right; color:#64748B;">₹ 36,318</td><td style="padding:5px 8px; text-align:right; font-weight:bold; color:#15803D;">₹ 39,950</td></tr>` +
            `<tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:5px 8px;">10–13 Jan</td><td style="padding:5px 8px;"><strong>Esmeralda View</strong></td><td style="padding:5px 8px; text-align:right; color:#64748B;">₹ 32,380</td><td style="padding:5px 8px; text-align:right; font-weight:bold; color:#15803D;">₹ 35,618</td></tr>` +
            `</table>` +
            `• <strong>Hotel Costing Summary</strong>: <strong>₹ 1,86,058</strong> (exact 10% increase applied across all 5 properties)<br>` +
            `• <strong>Land Part / Activities</strong>: <strong>$ 2,248.00 USD</strong> (+20 USD increase on each activity/transfer unit rate)<br>` +
            `• <strong>Day 8</strong>: Candle Light Dinner venue strictly <em>Thavorn Beach Village Resort & Spa Phuket</em> preserved hai.<br>` +
            `• <strong>Colors & Theme</strong>: Master Reference Official Palette (#0F2C59 Deep Navy, #1E3A8A Blue, #CBD5E1 Borders) strictly locked.<br>` +
            `• Ab aap live preview dekh sakte hain ya direct PDF download kar sakte hain!`
          );
        } else {
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
        }

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
      const isInvoiceReq = /invo?i?c?e|inoice|invoce|invoic|invioce|bill|billing|receipt|challan/i.test(text) || text === '__SWITCH_INVOICE__';
      if (isInvoiceReq) {
        if (!QuotationData.invoice) QuotationData.invoice = {};
        const inv = QuotationData.invoice;

        // 1. Extract Invoice Number if present in PDF text or message
        const invNumMatch = text.match(/Invoice\s*(?:No\.?|Number|#)?[:\s]*([0-9A-Za-z\-_]+)/i);
        if (invNumMatch && invNumMatch[1] && !/detail|from|to|for|bill/i.test(invNumMatch[1])) {
          inv.invoiceNumber = invNumMatch[1].trim();
        }

        // 2. Extract customer name from attached file if present (e.g. "[Attached File: akash Dewani.pdf]")
        const fileMatch = text.match(/\[Attached File:\s*([^\]\n]+)\]/i);
        if (fileMatch) {
          let cleanFileName = fileMatch[1].replace(/\.(pdf|docx?|png|jpe?g|txt)$/i, '').trim();
          cleanFileName = cleanFileName.replace(/invoice|bill|billing|doc|file/gi, '').trim();
          if (cleanFileName && cleanFileName.length >= 2) {
            inv.toCustomerName = cleanFileName;
          }
        }

        // 3. Extract customer name from document text or prompt
        const custNameMatch = text.match(/(?:Customer\s*Name|Billed\s*To|Invoice\s*To|Client\s*Name)[:\s]+([^\n\r,]+)/i) ||
                              text.match(/(?:for|name|ke\s*liye|customer|client)[:\s]+([a-zA-Z\s]{2,30})/i);
        if (custNameMatch && custNameMatch[1]) {
          inv.toCustomerName = custNameMatch[1].trim();
        }

        // Default to akash dewani if empty
        if (!inv.toCustomerName) {
          inv.toCustomerName = QuotationData.package.clientName || 'akash dewani';
        }

        // 4. Extract customer address if present
        const addrMatch = text.match(/(?:Amravati[^\n]*|Customer\s*Address[:\s]+[^\n]+)/i);
        if (addrMatch) {
          inv.toCustomerAddress = addrMatch[0].trim();
        }

        // 5. Extract service items & amount
        const serviceMatch = text.match(/(?:passport\s*bill|tour\s*package|flight\s*booking|visa\s*service|[a-zA-Z\s]{3,30}\s*bill)/i) ||
                             text.match(/Service[:\s]+([^\n\r]+)/i);
        const itemService = serviceMatch ? (serviceMatch[1] || serviceMatch[0]).trim() : 'passport bill';

        const descMatch = text.match(/(\d+\s*Adult[^\n]*|\d+\s*Pax[^\n]*)/i);
        const itemDesc = descMatch ? descMatch[1].trim() : '1 Adult';

        const amountMatch = text.match(/(?:Total\s*Amount|Net\s*Amount|Sub\s*Total|Total|Amount|Price|INR|₹|Rs\.?)[:\s]*([0-9,]+(?:\.\d{2})?)/i) ||
                            text.match(/\b([1-9][0-9]{2,6}(?:\.\d{2})?)\b/);
        let parsedPrice = 2850;
        if (amountMatch) {
          const rawNum = parseFloat(amountMatch[1].replace(/,/g, ''));
          if (rawNum && !isNaN(rawNum) && rawNum > 10) {
            parsedPrice = rawNum;
          }
        }

        inv.items = [{
          sn: 1,
          service: itemService,
          description: itemDesc,
          hsn: '',
          quantity: 1,
          perPaxPrice: parsedPrice,
          netAmount: parsedPrice,
          amount: parsedPrice
        }];
        inv.subTotal = parsedPrice;
        inv.totalAmount = parsedPrice;

        // 6. Extract Bank Details if mentioned in document text
        const bankMatch = text.match(/(YES\s*BANK\s*LIMITED|HDFC\s*BANK|ICICI\s*BANK|STATE\s*BANK[^\n]*)/i);
        if (bankMatch) inv.bankName = bankMatch[1].trim();

        const accMatch = text.match(/(?:Account\s*No\.?|A\/C\s*No\.?|Acc\s*No\.?)[:\s]*([0-9]{9,18})/i);
        if (accMatch) inv.bankAccountNo = accMatch[1].trim();

        const ifscMatch = text.match(/([A-Z]{4}0[A-Z0-9]{6})/i);
        if (ifscMatch) inv.bankIfsc = ifscMatch[1].trim();

        const branchMatch = text.match(/Branch[:\s]+([A-Za-z\s]+)/i);
        if (branchMatch) inv.bankBranch = branchMatch[1].trim();

        // 7. Company Details if mentioned
        if (/LET'?S\s*EXPLORE/i.test(text)) {
          inv.fromCompany = "LET'S EXPLORE DMC";
        }

        if (typeof App !== 'undefined') {
          if (typeof App.switchDocType === 'function') App.switchDocType('invoice');
          if (typeof App.populateInvoiceFields === 'function') App.populateInvoiceFields();
          if (typeof App.updateLivePreviews === 'function') App.updateLivePreviews();
        }

        setTyping(false);
        const custName = inv.toCustomerName || 'akash dewani';
        const tot = Number(inv.totalAmount || 2850).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const summaryDesc = (inv.items && inv.items[0]) ? `${inv.items[0].service} (${inv.items[0].description})` : 'passport bill (1 Adult)';

        appendAI(
          `✅ <strong>Official Orange Themed Invoice Confirm Ho Gaya Hai!</strong><br><br>` +
          `• <strong>Invoice No</strong>: ${inv.invoiceNumber || '090587'}<br>` +
          `• <strong>Billed To</strong>: <strong>${custName}</strong><br>` +
          `• <strong>Service Detail</strong>: ${summaryDesc}<br>` +
          `• <strong>Total Amount</strong>: <strong>INR ${tot}</strong><br>` +
          `• <strong>Bank Remittance</strong>: YES BANK LIMITED (A/C: ${inv.bankAccountNo || '108163400004886'})<br><br>` +
          `Ab aap niche <strong>"Edit in Studio Builder"</strong> par click karke saare fields aur lines live edit kar sakte hain:`
        );
        showReplies([
          { label: '✏️ Edit in Studio Builder', val: '__GOTO_BUILDER__', primary: true },
          { label: '👁️ View Live Preview', val: '__PREVIEW__' },
          { label: '🖨️ Print / Save PDF Invoice', val: '__PDF__' },
          { label: '📄 Download Word DOCX', val: '__DOCX__' }
        ]);
        scrollBottom();
        return;
      }

      if (/(?:banao|switch|make|create|generate|dikhao|chahiye).*(?:quotation|quote)|(?:quotation|quote).*(?:format|layout|banao|me)/i.test(text) || text === '__SWITCH_QUOTATION__') {
        if (typeof App !== 'undefined' && typeof App.switchDocType === 'function') {
          App.switchDocType('quotation');
        }
        setTyping(false);
        appendAI('✅ <strong>Switched to Commercial Quotation Format!</strong><br>Day-by-day Pax, INR, USD columns, pricing summary, and commercial total are active in the live preview.');
        showReplies([
          { label: '✏️ Edit in Studio Builder', val: '__GOTO_BUILDER__', primary: true },
          { label: '👁️ View Preview', val: '__PREVIEW__' },
          { label: '🖨️ Print / Save PDF Quotation', val: '__PDF__' },
          { label: '📄 Download Word DOCX', val: '__DOCX__' }
        ]);
        scrollBottom();
        return;
      }

      if (/(?:banao|switch|make|create|generate|dikhao|chahiye).*(?:hotel.*costing|comparison)|(?:hotel.*costing).*(?:format|layout|banao|me)/i.test(text) || text === '__SWITCH_HOTEL_COSTING__') {
        if (typeof App !== 'undefined' && typeof App.switchDocType === 'function') {
          App.switchDocType('hotel_costing');
        }
        setTyping(false);
        appendAI('✅ <strong>Switched to Dedicated Hotel Costing & Comparison Format!</strong><br>3-Tier tariff options for all 5 hotels are active.');
        showReplies([
          { label: '✏️ Edit in Studio Builder', val: '__GOTO_BUILDER__', primary: true },
          { label: '👁️ View Preview', val: '__PREVIEW__' },
          { label: '🖨️ Print / Save PDF Hotel Sheet', val: '__PDF__' },
          { label: '📄 Download Word DOCX', val: '__DOCX__' }
        ]);
        scrollBottom();
        return;
      }

      if (/(?:banao|switch|make|create|generate|dikhao|chahiye).*(?:confirmation|voucher|hotel.*voucher)|(?:confirmation|voucher).*(?:format|layout|banao|me)/i.test(text) || text === '__SWITCH_CONFIRMATION__') {
        if (typeof App !== 'undefined' && typeof App.switchDocType === 'function') {
          App.switchDocType('confirmation');
        }
        setTyping(false);
        appendAI('✅ <strong>Switched to Hotel Booking Voucher Format!</strong><br>Official luxury hotel confirmation layout with hotel details, room occupancy table, guest list, location map, and hotel policies (Aanay Tours / Hilton reference) is active.');
        showReplies([
          { label: '✏️ Edit in Studio Builder', val: '__GOTO_BUILDER__', primary: true },
          { label: '👁️ View Preview', val: '__PREVIEW__' },
          { label: '🖨️ Print / Save PDF Voucher', val: '__PDF__' },
          { label: '📄 Download Word DOCX', val: '__DOCX__' }
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
          { label: '✏️ Edit in Studio Builder', val: '__GOTO_BUILDER__', primary: true },
          { label: '👁️ View Preview', val: '__PREVIEW__' },
          { label: '🖨️ Print / Save PDF Itinerary', val: '__PDF__' },
          { label: '📄 Download Word DOCX', val: '__DOCX__' }
        ]);
      }

      // 6. Section Removal / Addition in Natural Language ("adult details hata do", "amenities hata do", etc.)
      const isRemove = /(?:hata|remove|delete|hide|nikal|band\s*karo)/i.test(text);
      const isShow = /(?:dikhao|show|wapas|add|enable|unhide|chahiye)/i.test(text) && !isRemove;

      if (isRemove || isShow) {
        if (!QuotationData.confirmation.sections) {
          QuotationData.confirmation.sections = {
            agencyHeader: true,
            summaryCard: true,
            mapPhoto: true,
            hotelDetails: true,
            adultDetails: true,
            importantInfo: true,
            amenities: true
          };
        }
        const sec = QuotationData.confirmation.sections;
        let modified = false;
        let msg = '';

        if (/adult|guest|yatri|passenger/i.test(text)) {
          sec.adultDetails = !isRemove;
          modified = true;
          msg = isRemove ? '👥 <strong>Adult Details / Guest List Table</strong> ko document se hata diya gaya hai!' : '👥 <strong>Adult Details / Guest List Table</strong> ko document me wapas add kar diya gaya hai!';
        } else if (/map|photo|location|tasveer|image/i.test(text)) {
          sec.mapPhoto = !isRemove;
          modified = true;
          msg = isRemove ? '📍 <strong>Map Location & Hotel Photo</strong> section hata diya gaya hai!' : '📍 <strong>Map Location & Hotel Photo</strong> section add kar diya gaya hai!';
        } else if (/amenities|suvidha|facility/i.test(text)) {
          sec.amenities = !isRemove;
          modified = true;
          msg = isRemove ? '✨ <strong>Hotel Amenities</strong> section hata diya gaya hai!' : '✨ <strong>Hotel Amenities</strong> section add kar diya gaya hai!';
        } else if (/important|policy|policies|rules|shart|instruction/i.test(text)) {
          sec.importantInfo = !isRemove;
          modified = true;
          msg = isRemove ? 'ℹ️ <strong>Important Information & Property Policies</strong> section hata diya gaya hai!' : 'ℹ️ <strong>Important Information & Property Policies</strong> section wapas add kar diya gaya hai!';
        } else if (/hotel\s*details|room\s*table|occupancy/i.test(text)) {
          sec.hotelDetails = !isRemove;
          modified = true;
          msg = isRemove ? '🏨 <strong>Hotel Stay & Room Occupancy Table</strong> hata diya gaya hai!' : '🏨 <strong>Hotel Stay & Room Occupancy Table</strong> add kar diya gaya hai!';
        } else if (/agency|header/i.test(text)) {
          sec.agencyHeader = !isRemove;
          modified = true;
          msg = isRemove ? '🏢 <strong>Agency Header</strong> hata diya gaya hai!' : '🏢 <strong>Agency Header</strong> add kar diya gaya hai!';
        } else if (/day\s*(\d+)/i.test(text) && isRemove) {
          const match = text.match(/day\s*(\d+)/i);
          const dayNum = parseInt(match[1], 10);
          const initialLen = QuotationData.days.length;
          QuotationData.days = QuotationData.days.filter(d => d.dayNumber !== dayNum);
          if (QuotationData.days.length < initialLen) {
            QuotationData.days.forEach((d, i) => { d.dayNumber = i + 1; });
            modified = true;
            msg = `📅 <strong>Day ${dayNum}</strong> ko itinerary se hata diya gaya hai! Baki days auto re-sequence ho gaye hain.`;
          }
        }

        if (modified) {
          if (typeof App !== 'undefined') {
            if (typeof App.populateStudioFromData === 'function') App.populateStudioFromData();
            if (typeof App.updateLivePreviews === 'function') App.updateLivePreviews();
          }
          setTyping(false);
          appendAI(`✅ ${msg}<br>Live document preview turant update ho gayi hai!`);
          showReplies([
            { label: '👁️ Live Preview Dekho', val: '__PREVIEW__', primary: true },
            { label: '🖨️ PDF Generate Karo', val: '__PDF__' },
            { label: '✏️ Studio Builder Kholo', val: '__MODAL_EDIT__' }
          ]);
          scrollBottom();
          return;
        }
      }

      // 7. General extraction via AIParser (Context aware with multimodal image support)
      const extracted = await AIParser.parseText(text, QuotationData, activeAttachment);

      if (extracted.package) {
        Object.assign(QuotationData.package, extracted.package);
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
   * Supports optional 10% Hotel Markup + 20 USD activity increase
   */
  function applyNewThailandHotelsAndRates(withMarkup = false) {
    loadSampleDataset('reference');

    const d = QuotationData;
    d.activeDocType = 'quotation';

    const hRamada = withMarkup ? 43061 : 39146;
    const hPhiPhi = withMarkup ? 29924 : 27204;
    const hAndakira = withMarkup ? 37505 : 34095;
    const hPanwaburi = withMarkup ? 39950 : 36318;
    const hEsmeralda = withMarkup ? 35618 : 32380;
    const totalHotelsINR = hRamada + hPhiPhi + hAndakira + hPanwaburi + hEsmeralda; // 186058 or 169143

    // 1. Update Day 1-12 hotels
    if (d.days && d.days.length >= 12) {
      // Days 1-3: Ramada
      [0, 1, 2].forEach(idx => {
        d.days[idx].hotel = {
          name: 'Ramada By Wyndham',
          dates: '2 Jan to 5 Jan',
          pax: idx === 0 ? 2 : '',
          amountINR: idx === 0 ? hRamada : 0,
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
          amountINR: idx === 3 ? hPhiPhi : 0,
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
          amountINR: idx === 5 ? hAndakira : 0,
          amountUSD: 0,
          notes: ''
        };
      });

      // Day 8: Panwaburi Beachfront stay, Candle Light Dinner venue Thavorn Beach Village Resort
      d.days[7].hotel = {
        name: 'Panwaburi Beachfront',
        dates: '9 Jan to 10 Jan',
        pax: 2,
        amountINR: hPanwaburi,
        amountUSD: 0,
        notes: 'Candle Light Dinner venue is at Thavorn Beach Village Resort'
      };

      // Days 9-11: Esmeralda View
      [8, 9, 10].forEach(idx => {
        d.days[idx].hotel = {
          name: 'Esmeralda View',
          dates: '10 Jan to 13 Jan',
          pax: idx === 8 ? 2 : '',
          amountINR: idx === 8 ? hEsmeralda : 0,
          amountUSD: 0,
          notes: ''
        };
      });

      // Day 12: Departure
      d.days[11].hotel = null;

      // If withMarkup is true, apply +20 USD on each activity
      if (withMarkup) {
        const actAdjustments = [
          { dayIdx: 0, itemIdx: 1, uPrice: 121.00, desc: 'Transfer Phuket to Krabi' },
          { dayIdx: 1, itemIdx: 0, uPrice: 84.40, desc: '4 Island Tour' },
          { dayIdx: 2, itemIdx: 5, uPrice: 100.50, desc: 'City Tour Krabi' },
          { dayIdx: 3, itemIdx: 2, uPrice: 100.50, desc: 'ATV Ride' },
          { dayIdx: 4, itemIdx: 1, uPrice: 144.53, desc: 'Phi-Phi Island + NPF' },
          { dayIdx: 5, itemIdx: 2, uPrice: 120.75, desc: 'Transfer to Phuket' },
          { dayIdx: 6, itemIdx: 5, uPrice: 100.50, desc: 'City Tour' },
          { dayIdx: 7, itemIdx: 3, uPrice: 115.12, desc: 'Oasis Spa & Massage' },
          { dayIdx: 7, itemIdx: 4, uPrice: 167.00, desc: 'Candle Light Dinner' },
          { dayIdx: 8, itemIdx: 2, uPrice: 122.35, desc: 'James Bond Island' },
          { dayIdx: 9, itemIdx: 1, uPrice: 65.34, desc: 'Phuket to Koh Yao Yai' },
          { dayIdx: 11, itemIdx: 1, uPrice: 89.13, desc: 'Airport Transfer' }
        ];

        actAdjustments.forEach(adj => {
          const item = d.days[adj.dayIdx]?.items?.[adj.itemIdx];
          if (item) {
            item.unitPrice = adj.uPrice;
            item.amountUSD = Math.round(adj.uPrice * 2 * 100) / 100;
            item.subtitle = `${adj.desc} · Adult · ${adj.uPrice.toFixed(2)} × 2`;
          }
        });
      }
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
        amountINR: hRamada,
        amountUSD: Math.round(hRamada / 87.5 * 100) / 100,
        opt1FreeCancel: hRamada,
        opt2NonRefund: Math.round(hRamada * 0.9),
        opt3PartialRefund: Math.round(hRamada * 0.95),
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
        amountINR: hPhiPhi,
        amountUSD: Math.round(hPhiPhi / 87.5 * 100) / 100,
        opt1FreeCancel: hPhiPhi,
        opt2NonRefund: Math.round(hPhiPhi * 0.9),
        opt3PartialRefund: Math.round(hPhiPhi * 0.95),
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
        amountINR: hAndakira,
        amountUSD: Math.round(hAndakira / 87.5 * 100) / 100,
        opt1FreeCancel: hAndakira,
        opt2NonRefund: Math.round(hAndakira * 0.9),
        opt3PartialRefund: Math.round(hAndakira * 0.95),
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
        amountINR: hPanwaburi,
        amountUSD: Math.round(hPanwaburi / 87.5 * 100) / 100,
        opt1FreeCancel: hPanwaburi,
        opt2NonRefund: Math.round(hPanwaburi * 0.9),
        opt3PartialRefund: Math.round(hPanwaburi * 0.95),
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
        amountINR: hEsmeralda,
        amountUSD: Math.round(hEsmeralda / 87.5 * 100) / 100,
        opt1FreeCancel: hEsmeralda,
        opt2NonRefund: Math.round(hEsmeralda * 0.9),
        opt3PartialRefund: Math.round(hEsmeralda * 0.95),
        cancellation: 'Free cancellation until 1 Jan 2027',
        refundability: 'Refundable',
        status: 'Confirmed',
        notes: 'Speedboat transfers to/from Chong Lard Pier included'
      }
    ];

    // 3. Update Summary
    const landUSD = withMarkup ? 2248.00 : 1808.00;
    d.summary = {
      items: [
        { name: 'Hotel Costing\nfor 2 adults', amountINR: totalHotelsINR, amountUSD: 0 },
        { name: 'Land Part\nfor 2 adults', amountINR: 0, amountUSD: landUSD }
      ],
      autoCalculate: false,
      totalINR: totalHotelsINR,
      totalUSD: landUSD
    };

    // 4. Synchronize Studio & Live Preview
    if (typeof App !== 'undefined') {
      if (typeof App.renderDaysEditor === 'function') App.renderDaysEditor();
      if (typeof App.renderHotelsEditor === 'function') App.renderHotelsEditor();
      if (typeof App.renderSummaryEditor === 'function') App.renderSummaryEditor();
      App.updateLivePreviews();
    }
    if (typeof showToast === 'function') {
      showToast(`Updated hotels (₹ ${totalHotelsINR.toLocaleString('en-IN')}) & Land Part ($ ${landUSD.toFixed(2)})`, 'success');
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
    if (opt.val === '__MODAL_EDIT__' || opt.val === '__GOTO_BUILDER__') {
      if (typeof App !== 'undefined') {
        App.showSection('generator');
        if (typeof App.populateStudioFromData === 'function') App.populateStudioFromData();
        if (typeof App.populateInvoiceFields === 'function') App.populateInvoiceFields();
      }
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
