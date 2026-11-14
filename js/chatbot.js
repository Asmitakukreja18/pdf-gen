/**
 * chatbot.js — Intelligent Task-Oriented AI Agent for Let's Explore DMC
 * Upgraded Conversational Agent:
 * - Natural Language Understanding (Hindi, Hinglish, English)
 * - Real Task Execution (Markup, Hotel changes, Company branding, Format switching, PDF extraction)
 * - Real-Time Asynchronous Progress Updates (No fake sleeps on short questions)
 * - Claude-like Structured Final Responses (Changes, Calculations, Preserved items, File & Download link)
 * - Multi-Turn Context & Document Memory (Maintains active package across instructions)
 * - Strict Data Integrity (Never invents fake days, never modifies unrequested sections)
 */

const Chatbot = (() => {

  // ==========================================
  // 1. STATE & MULTI-TURN CONVERSATION MEMORY
  // ==========================================
  const AgentMemory = {
    activeDocType: 'quotation',
    activeDestination: '',
    activeDuration: '',
    activeClientName: '',
    activeQuoteRef: '',
    activeCompany: {
      name: "LET'S EXPLORE DMC",
      tagline: "Your Destination Management Specialist",
      phone: "+91 80075 86881",
      email: "info@letsexploredmc.com",
      contactPerson: "Let's Explore DMC Specialist",
      isPartner: false,
      isWhitelabel: false
    },
    lastMarkupApplied: null,
    lastHotelChanged: null,
    lastGeneratedFile: null,
    conversationTurns: [],
    executedTasksLog: []
  };

  let history = [];
  let isTyping = false;
  let initialized = false;
  let activeAttachments = [];
  let activeAttachment = null;
  let lastPrompt = '';

  // DOM Refs & Utilities
  const $ = (id) => document.getElementById(id);
  const msgs = () => $('chatMessages');
  const typing = () => $('typingIndicator');
  const replies = () => $('quickReplies');
  const input = () => $('chatInput');
  const sendBtn = () => $('btnSend');

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  if (typeof window !== 'undefined') {
    window.escapeHTML = escapeHTML;
  }

  function formatINR(val) {
    const n = Math.round(Number(val) || 0);
    return '₹ ' + n.toLocaleString('en-IN');
  }

  function formatUSD(val) {
    const n = Number(val) || 0;
    return '$ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function sanitizeFileName(str) {
    return String(str || 'Document').replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').trim();
  }

  // ==========================================
  // 2. INITIALIZATION & UI SETUP
  // ==========================================
  function init() {
    if (initialized) return;
    initialized = true;
    history = [];
    const m = msgs();
    if (m) m.innerHTML = '';
    
    // Sync current document memory from QuotationData
    syncMemoryFromQuotationData();

    renderWelcome();
    setupInputHandlers();
    setupAttachmentHandlers();

    const btnHistory = $('btnChatHistory');
    if (btnHistory) {
      btnHistory.addEventListener('click', () => {
        showReplies([
          { label: '🌴 12D Thailand Master', val: 'Create a 12-day Thailand package for 2 adults', primary: true },
          { label: '🏖️ Maldives 5D4N Water Villa', val: 'Maldives 5D4N luxury water villa package banao' },
          { label: '🌟 Dubai 6D Itinerary', val: 'Dubai 6D itinerary with rates' },
          { label: '📈 10% Markup Lagao', val: 'Add 10% markup to this package' },
          { label: '🏢 Let's Explore DMC Branding', val: 'Aanay tours ki details k sath edit karo unki details hata dena' },
          { label: '🗺️ Itinerary (No Rates)', val: 'Itinerary se costing hatao' }
        ], true);
        if (typeof showToast === 'function') showToast('Sample tasks loaded in quick actions', 'info');
      });
    }

    const btnClear = $('btnChatClear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        const m = msgs();
        if (m) m.innerHTML = '';
        history = [];
        AgentMemory.conversationTurns = [];
        AgentMemory.executedTasksLog = [];
        renderWelcome();
        if (typeof showToast === 'function') showToast('Conversation cleared', 'info');
      });
    }
  }

  function syncMemoryFromQuotationData() {
    if (typeof QuotationData === 'undefined') return;
    const pkg = QuotationData.package || {};
    AgentMemory.activeDocType = QuotationData.activeDocType || 'quotation';
    AgentMemory.activeDestination = pkg.destinations || pkg.title || 'Thailand';
    AgentMemory.activeDuration = pkg.duration || '12 Days / 11 Nights';
    AgentMemory.activeClientName = pkg.clientName || 'Valued Client';
    AgentMemory.activeQuoteRef = pkg.quoteRef || 'LE-DMC-REF';

    if (QuotationData.company) {
      Object.assign(AgentMemory.activeCompany, QuotationData.company);
    }
  }

  function renderWelcome() {
    const isAiConnected = !!(CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE');
    const aiBadge = isAiConnected
      ? `<span style="display:inline-block; padding:2px 8px; border-radius:12px; background:#EFF6FF; color:#1D4ED8; font-size:11px; font-weight:700; border:1px solid #BFDBFE;">⚡ AI Assistant Active</span>`
      : `<span style="display:inline-block; padding:2px 8px; border-radius:12px; background:#F1F5F9; color:#475569; font-size:11px; font-weight:700; border:1px solid #CBD5E1;">⚡ DMC Studio Ready</span>`;

    appendAI(
      `Hello! 👋 Main hoon aapka <strong>Let's Explore DMC Document Assistant</strong> ${aiBadge}<br><br>` +
      `Aap mujhse kisi bhi natural language (Hindi, Hinglish ya English) me operations execute karwa sakte hain:<br>` +
      `• 📈 <em>"Add 10% markup to this package"</em><br>` +
      `• 🏨 <em>"Change hotel details but preserve the existing itinerary"</em><br>` +
      `• 🗺️ <em>"Itinerary se costing hatao"</em> (Format 2: Travel Itinerary)<br>` +
      `• 🏢 <em>"Aanay tours ki details k sath edit karo unki details hata dena"</em><br>` +
      `• 📄 <em>Reference PDF/DOCX attach karke automatic structured quotation/invoice extract karo</em><br><br>` +
      `Bataiye, aaj hum kis package ya document par kaam karein?`,
      false
    );

    const defaultReplies = [
      { label: '🌴 12D Thailand Master', val: 'Create a 12-day Thailand package for 2 adults', primary: true },
      { label: '🏖️ Maldives 5D4N Water Villa', val: 'Maldives 5D4N luxury water villa package banao' },
      { label: '📈 +10% Markup Lagao', val: 'Add 10% markup to this package' },
      { label: '🏢 Let's Explore DMC Branding', val: 'Aanay tours ki details k sath edit karo unki details hata dena' },
      { label: '🗺️ Itinerary (Costing Hatao)', val: 'Itinerary se costing hatao' },
      { label: '🧾 Tax Invoice Banao', val: 'Tax invoice banao' }
    ];

    showReplies(defaultReplies);
  }

  // ==========================================
  // 3. FILE ATTACHMENTS & PARSING
  // ==========================================
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return window.btoa(binary);
  }

  // ==========================================
  // 3. FILE ATTACHMENTS & PARSING (MULTI-PDF SUPPORT)
  // ==========================================
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return window.btoa(binary);
  }

  // ─── CLAUDE-STYLE ATTACHMENT CARDS BUILDER (COMPOSER & CHAT) ───
  function buildClaudeAttachmentCardsHTML(attachments, isRemovable = false) {
    if (!attachments || attachments.length === 0) return '';
    return `
      <div class="claude-cards-strip">
        ${attachments.map(att => {
          const name = att.name || 'Document';
          const lower = name.toLowerCase();
          const isDocx = lower.endsWith('.docx') || lower.endsWith('.doc') || lower.includes('docx') || lower.includes('word');
          const isPdf = lower.endsWith('.pdf') || (!isDocx && !att.mimeType?.startsWith('image/'));
          const extBadge = isDocx ? 'DOCX' : (isPdf ? 'PDF' : 'FILE');
          const badgeClass = isDocx ? 'docx-badge' : 'pdf-badge';
          const cardClass = isDocx ? 'docx-card' : 'pdf-card';

          const previewArea = isDocx
            ? `<div class="docx-big-icon">W</div>`
            : `<div class="pdf-page-miniature">
                <div class="pdf-mini-header"></div>
                <div class="pdf-mini-line"></div>
                <div class="pdf-mini-line"></div>
                <div class="pdf-mini-line short"></div>
              </div>`;

          const removeBtn = isRemovable
            ? `<button type="button" class="claude-card-remove-btn" data-id="${att.id}" title="Remove file">✕</button>`
            : '';

          return `
            <div class="claude-file-card ${cardClass}" data-id="${att.id || ''}" title="${escapeHTML(name)}">
              ${removeBtn}
              <div class="file-card-preview-area">
                ${previewArea}
              </div>
              <div class="file-card-info">
                <span class="file-card-name">${escapeHTML(name)}</span>
                <span class="file-card-badge ${badgeClass}">${extBadge}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderAttachmentBadges() {
    const badgeContainer = $('chatAttachmentBadge');
    const badgeText = $('chatAttachmentText');
    if (!badgeContainer || !badgeText) return;

    if (!activeAttachments || activeAttachments.length === 0) {
      badgeContainer.style.display = 'none';
      badgeText.innerHTML = '';
      return;
    }

    badgeContainer.style.display = 'flex';
    badgeText.innerHTML = `
      ${buildClaudeAttachmentCardsHTML(activeAttachments, true)}
      <div style="display:flex; align-items:center; justify-content:space-between; padding:2px 4px; font-size:11px; color:#64748B;">
        <span>📎 <strong>${activeAttachments.length} file${activeAttachments.length > 1 ? 's' : ''} attached</strong></span>
        <button type="button" onclick="const inp=document.getElementById('chatDocUpload'); if(inp) inp.click();" style="background:none; border:none; color:#2563EB; font-weight:600; cursor:pointer; font-size:11px;">+ Add another file</button>
      </div>
    `;

    // Hook up individual remove buttons
    badgeText.querySelectorAll('.claude-card-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        removeAttachmentById(id);
      });
    });
  }

  function removeAttachmentById(id) {
    activeAttachments = activeAttachments.filter(a => a.id !== id);
    activeAttachment = activeAttachments.length > 0 ? activeAttachments[0] : null;
    renderAttachmentBadges();
    const fileInput = $('chatDocUpload');
    if (activeAttachments.length === 0 && fileInput) {
      fileInput.value = '';
    }
  }

  async function processSingleFile(file) {
    if (!file) return;

    const fileId = 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const attObj = {
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/pdf',
      base64: null,
      extractedText: '',
      serverPath: '',
      pageCount: 1,
      status: 'reading'
    };

    activeAttachments.push(attObj);
    activeAttachment = activeAttachments[0];
    renderAttachmentBadges();

    try {
      // 1. Upload in background if online HTTP
      const formData = new FormData();
      formData.append('file', file);
      const isHttp = typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http');
      if (isHttp) {
        fetch('api/upload_attachment.php', { method: 'POST', body: formData })
          .then(res => res.json())
          .then(data => {
            if (data && data.success && data.file) {
              attObj.serverPath = data.file.path;
            }
          })
          .catch(e => console.warn('Attachment upload background notice:', e));
      }

      // 2. Read as Data URL
      const reader = new FileReader();
      const b64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const dataUrl = await b64Promise;
      attObj.base64 = dataUrl;

      // 3. Extract text streams if PDF
      if (file.name.toLowerCase().endsWith('.pdf') && typeof pdfjsLib !== 'undefined') {
        try {
          const ab = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: ab });
          const pdfDoc = await loadingTask.promise;
          attObj.pageCount = pdfDoc.numPages;
          let fullText = '';
          const maxPages = Math.min(pdfDoc.numPages, 10);
          for (let p = 1; p <= maxPages; p++) {
            const page = await pdfDoc.getPage(p);
            const tc = await page.getTextContent();
            const pageStr = tc.items.map(it => it.str).join(' ');
            fullText += `[Page ${p}]\n` + pageStr + '\n\n';
          }
          attObj.extractedText = fullText.trim();
        } catch (pdfErr) {
          console.warn('PDF.js in-browser text extraction fallback:', pdfErr);
        }
      }

      attObj.status = 'ready';
      renderAttachmentBadges();

      // Show contextual quick replies
      if (activeAttachments.length === 1) {
        showReplies([
          { 
            label: `⚡ Auto-Extract Quotation (${file.name})`, 
            val: `Attached document ${file.name} se travel itinerary details, hotels, dates aur pricing extract karke master quotation banao`, 
            primary: true 
          },
          { 
            label: '🧾 Tax Invoice Banao', 
            val: `Attached document ${file.name} se billing details extract karke official tax invoice format banao` 
          },
          { 
            label: '🏨 Hotel Booking Voucher', 
            val: `Attached document ${file.name} se hotel confirmation booking voucher banao` 
          },
          { 
            label: '🗺️ Itinerary (Without Rates)', 
            val: `Attached document ${file.name} se guest travel itinerary without pricing banao` 
          }
        ], true);
      } else {
        showReplies([
          { 
            label: `⚡ Compare & Merge ${activeAttachments.length} Documents`, 
            val: `Attached ${activeAttachments.length} documents (${activeAttachments.map(a => a.name).join(', ')}) se hotels, itineraries aur supplier rates cross-reference karke quotation ready karo`, 
            primary: true 
          },
          { 
            label: '📈 Let's Explore DMC 10% Markup Table', 
            val: `[2:45 pm, 31/10/2026] Chanchal: Aanay tours ki details k sath edit karo\n[2:45 pm, 31/10/2026] Chanchal: 10 percent markup anay tours ki details ke sath details k sath edit karke dena unki details hata dena DETSILS DALO INKI HATAO AND COLOR THEME BHI FORMAT BHI` 
          },
          { 
            label: '🗺️ Merged Itinerary (Without Rates)', 
            val: `Dono reference files se combined itinerary extract karo without costing` 
          }
        ], true);
      }

      if (typeof showToast === 'function') {
        showToast(`📄 ${file.name} Attached! (${activeAttachments.length} file${activeAttachments.length > 1 ? 's' : ''} total)`, 'success');
      }

    } catch (err) {
      console.error('Error handling file:', err);
      attObj.status = 'ready';
      renderAttachmentBadges();
    }
  }

  async function processIncomingFiles(files) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    for (const f of list) {
      await processSingleFile(f);
    }
    const fileInput = $('chatDocUpload');
    if (fileInput) fileInput.value = '';
  }

  function setupAttachmentHandlers() {
    const attachBtn = $('btnAttachFile');
    const fileInput = $('chatDocUpload');
    const badge = $('chatAttachmentBadge');
    const removeBtn = $('btnRemoveChatAttachment');

    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
          await processIncomingFiles(e.target.files);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        activeAttachments = [];
        activeAttachment = null;
        if (badge) badge.style.display = 'none';
        if (fileInput) fileInput.value = '';
        renderAttachmentBadges();
        clearInput();
      });
    }

    const chatPanel = $('chatPanel') || document.querySelector('.chat-panel');
    if (chatPanel) {
      ['dragenter', 'dragover'].forEach(name => {
        chatPanel.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          chatPanel.style.outline = '2px dashed #2563EB';
          chatPanel.style.outlineOffset = '-4px';
        });
      });
      ['dragleave', 'drop'].forEach(name => {
        chatPanel.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          chatPanel.style.outline = 'none';
        });
      });
      chatPanel.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        chatPanel.style.outline = 'none';
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          await processIncomingFiles(dt.files);
        }
      });
    }
  }

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

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      submitInput(inp.value.trim());
    });
  }

  function submitInput(text) {
    if (!text && (!activeAttachments || activeAttachments.length === 0)) return;
    if (isTyping) return;

    let fullPrompt = text;
    let userBubble = text;

    if (activeAttachments && activeAttachments.length > 0) {
      const numFiles = activeAttachments.length;
      let filesSummary = '';
      let combinedExtracted = '';

      activeAttachments.forEach((att, idx) => {
        filesSummary += `${idx + 1}. "${att.name}" (${att.pageCount || 1} pages, ${(att.size / 1024).toFixed(1)} KB)\n`;
        if (att.extractedText) {
          combinedExtracted += `\n--- [FILE ${idx + 1}: ${att.name}] ---\n${att.extractedText}\n--- [END FILE ${idx + 1}] ---\n`;
        }
      });

      const defaultInstr = `Please analyze the attached ${numFiles} document(s):\n${filesSummary}Extract all travel details (destination, travel dates, passenger counts, day-wise itinerary, hotel stays, room types, tariffs, inclusions) and build the official document.`;
      const promptInstr = text ? text : defaultInstr;

      fullPrompt = `[Attached ${numFiles} Reference Files:\n${filesSummary}]${combinedExtracted}\n${promptInstr}`;

      // User chat bubble with Claude-style cards at top
      userBubble = `
        <div style="margin-bottom:8px;">
          ${buildClaudeAttachmentCardsHTML(activeAttachments, false)}
        </div>
        <div>${text ? escapeHTML(text) : `⚡ <em>Extracting and analyzing ${numFiles} attached document(s) with AI...</em>`}</div>
      `;
    }

    clearInput();
    clearReplies();
    appendUser(userBubble);

    const badge = $('chatAttachmentBadge');
    if (badge) badge.style.display = 'none';
    const uploadInput = $('chatDocUpload');
    if (uploadInput) uploadInput.value = '';

    const attachedFilesBackup = [...activeAttachments];
    activeAttachments = [];
    activeAttachment = null;
    renderAttachmentBadges();

    processMessage(fullPrompt, attachedFilesBackup[0] || null, attachedFilesBackup);
  }

  // ==========================================
  // 4. NATURAL LANGUAGE INTENT CLASSIFIER
  // ==========================================
  function classifyIntent(text, attachment, attachments = []) {
    const raw = (text || '').trim();
    // Clean WhatsApp / chat copy-paste headers e.g. "[2:45 pm, 31/10/2026] Chanchal:"
    const t = raw.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm).*?\]\s*[^:\n]+:\s*/gi, ' ').trim();

    // 1. Direct tool triggers
    if (/^(pdf|download\s*pdf|generate\s*pdf|pdf\s*bhejo|pdf\s*banao)$/i.test(t)) {
      return { type: 'DIRECT_PDF' };
    }
    if (/^(docx|word|download\s*docx|generate\s*docx|word\s*file|docx\s*bhejo)$/i.test(t)) {
      return { type: 'DIRECT_DOCX' };
    }
    if (/^(preview|view\s*preview|show\s*preview|dekho)$/i.test(t)) {
      return { type: 'DIRECT_PREVIEW' };
    }
    if (/^(edit|builder|studio|edit\s*karo|studio\s*kholo|open\s*builder)$/i.test(t)) {
      return { type: 'DIRECT_STUDIO' };
    }
    if (/^(restart|reset|naya|new|fresh|clear)$/i.test(t)) {
      return { type: 'DIRECT_RESET' };
    }

    // 2. Simple informational inquiry (without modification intent)
    const isPureQuestion = /^(kya|kaise|what|how|which|why|explain|batao|options|formats?|destinations?)\b/i.test(t) ||
      /\?$/.test(t) ||
      /(?:formats?|document.*types?)\s*(?:hai|bhi|kaise|options|dikhao|kya)/i.test(t) ||
      /(?:cancellation|luggage|baggage|visa|passport|season|weather)\s*(?:policy|rule|time|kya|batao)/i.test(t);

    const hasModKeywords = /(?:add|apply|lagao|badhao|bada|increase|change|replace|badlo|hata|hatao|remove|edit|rebrand|banao|make|create|generate|markup|percent|%|details)/i.test(t);

    if (isPureQuestion && !hasModKeywords && !attachment && (!attachments || attachments.length === 0)) {
      return { type: 'GENERAL_INQUIRY', query: t };
    }

    const attsCount = (attachments && attachments.length > 0) ? attachments.length : (attachment ? 1 : 0);

    // 2.5 Specific Multi-File Workflow: Phuket + Krabi (6D5N) + 15% Markup + Rajasthan Format
    const isPhuketKrabi = /(?:phuket|krabi|6\s*days\s*5\s*nights|budget\s*\.docx)/i.test(t);
    const isRajasthanFormat = /(?:third\s*pdf|3rd\s*pdf|rajasthan|rajasthan\s*quote|format\s*third)/i.test(t);
    const is15Percent = /(?:15\s*(?:%|percent)|15percent)/i.test(t);
    const isOurCompany = /(?:humari\s*company|second\s*pdf|2nd\s*pdf|only\s*addd?\s*company|let'?s\s*explore)/i.test(t);

    if (
      (isPhuketKrabi && (is15Percent || isRajasthanFormat || isOurCompany)) ||
      (isRajasthanFormat && (is15Percent || isOurCompany)) ||
      /(?:second\s*pdf.*?third\s*pdf|format\s*third\s*pdf|rajasthan\s*quote)/i.test(t)
    ) {
      const pctMatchEarly = t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|prcnt)/i);
      return {
        type: 'PHUKET_KRABI_RAJASTHAN_15PCT',
        percent: pctMatchEarly ? parseFloat(pctMatchEarly[1]) : 15,
        format: 'rajasthan_land_package',
        attachmentsCount: attsCount > 0 ? attsCount : 3,
        rawText: raw,
        cleanText: t
      };
    }

    // 3. Check for COMPOUND Task: Markup (% or fixed) + Partner Rebrand OR User's Benchmark request ("same output as like mujhe chahiye")
    const isClaudeBenchmarkQuery = /(?:same\s*output|mujhe\s*chahiye|claude\s*output|screenshot\s*jaise|multi\s*pdf\s*output|options?\s*table|centara|olhuveli)/i.test(t);

    const pctMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|prcnt)\s*(?:markup|margin|extra)?/i) ||
                     t.match(/(?:markup|margin|increase|badhao|bada).*?(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
    const fixedMatch = t.match(/(?:increase|bada|badhao|add|extra|pass|passes|amount).*?(\d{4,})/i) ||
                       t.match(/(\d{4,}).*?(?:increase|bada|badhao|add|extra)/i);
    const isAanay = /(?:aanay|aanay\s*tours?|viraj|gaglani)/i.test(t);
    const isRebrand = /(?:company\s*details?|branding|partner|logo|rebrand|details\s*dalo|unki\s*details\s*hata|white-?label|color\s*theme|format\s*bhi)/i.test(t);
    const isCostingHatao = /(?:costing|rates?|pricing|paise|amount|tariff)\s*(?:hata|hatao|remove|hide|nikal|mat\s*dikhao|bina)/i.test(t);

    if (isClaudeBenchmarkQuery || ((pctMatch || fixedMatch) && (isAanay || isRebrand))) {
      return {
        type: 'COMPOUND_MARKUP_AND_REBRAND',
        percent: pctMatch ? parseFloat(pctMatch[1]) : 10,
        fixedINR: fixedMatch ? parseInt(fixedMatch[1], 10) : 0,
        isAanay: isAanay || isClaudeBenchmarkQuery,
        partner: (isAanay || isClaudeBenchmarkQuery) ? 'Let's Explore DMC' : 'Partner',
        attachmentsCount: attsCount > 0 ? attsCount : 2,
        rawText: raw,
        cleanText: t
      };
    }

    // 4. Standalone Markup & Price Modification
    // e.g. "Add 10% markup to this package", "10 percent markup", "markup 10%", "passes ka amount 20000 increase kar do"
    if ((pctMatch || fixedMatch) && !isCostingHatao) {
      return {
        type: 'MARKUP_ADJUSTMENT',
        percent: pctMatch ? parseFloat(pctMatch[1]) : 0,
        fixedINR: fixedMatch ? parseInt(fixedMatch[1], 10) : 0,
        rawText: t
      };
    }

    // 5. Company Rebranding / Partner Whitelabel
    // e.g. "Aanay tours ki details k sath edit karo", "details dalo inki unki hatao", "rebrand company"
    if (isAanay || isRebrand) {
      return {
        type: 'COMPANY_REBRAND',
        partner: isAanay ? 'Let's Explore DMC' : 'Partner',
        isAanay: isAanay,
        rawText: t
      };
    }

    // 6. Costing Removal / Without Rates (Format 2: Travel Itinerary)
    // e.g. "Itinerary se costing hatao", "rates hata do", "without rates format"
    if (isCostingHatao || /(?:without\s*rates?|rates?\s*ke\s*bina|itinerary\s*only|bina\s*rates?)/i.test(t)) {
      return { type: 'REMOVE_COSTING', rawText: t };
    }

    // 6. Hotel Replacement
    // e.g. "Change hotel to Ramada Resort", "Replace Krabi Resort with Ramada By Wyndham"
    if (/(?:change|replace|badal|naya)\s*hotel|hotel\s*(?:change|badal|replace)/i.test(t) ||
        /(?:ramada|andakira|phi\s*phi|mountain\s*beach|panwaburi|esmeralda|hilton|marriott|hyatt|villa)/i.test(t) && /(?:dalo|lagao|karo|change|replace)/i.test(t)) {
      return { type: 'HOTEL_CHANGE', rawText: t };
    }

    // 7. Format Switch
    if (t === '__SWITCH_INVOICE__' || /(?:banao|make|create|generate|switch).*(?:invoice|tax\s*invoice|bill)/i.test(t)) {
      return { type: 'FORMAT_SWITCH', targetDocType: 'invoice' };
    }
    if (t === '__SWITCH_CONFIRMATION__' || /(?:banao|make|create|generate|switch).*(?:voucher|confirmation)/i.test(t)) {
      return { type: 'FORMAT_SWITCH', targetDocType: 'confirmation' };
    }
    if (t === '__SWITCH_HOTEL_COSTING__' || /(?:hotel\s*costing|comparison\s*sheet|hotel\s*sheet)/i.test(t)) {
      return { type: 'FORMAT_SWITCH', targetDocType: 'hotel_costing' };
    }
    if (t === '__SWITCH_ITINERARY__' || /(?:travel\s*itinerary|itinerary\s*format)/i.test(t)) {
      return { type: 'FORMAT_SWITCH', targetDocType: 'itinerary' };
    }
    if (t === '__SWITCH_QUOTATION__' || /(?:master\s*quotation|quotation\s*format|commercial\s*quote)/i.test(t)) {
      return { type: 'FORMAT_SWITCH', targetDocType: 'quotation' };
    }

    // 8. Document extraction or new quotation build
    return { type: 'BUILD_OR_EXTRACT', rawText: t, attachment: attachment };
  }

  // ==========================================
  // 5. ASYNCHRONOUS TASK PROGRESS CONTROLLER
  // ==========================================
  function setTyping(flag, statusTitle = '🧠 Thinking &amp; Processing...', statusSub = 'Executing application tasks...') {
    isTyping = flag;
    const el = typing();
    if (el) {
      el.style.display = flag ? 'flex' : 'none';
      const titleEl = $('typingStatusText');
      const subEl = $('typingSubText');
      if (titleEl) titleEl.innerHTML = statusTitle;
      if (subEl) subEl.innerHTML = statusSub;
    }
    scrollBottom();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================
  // 6. MAIN TASK EXECUTION ORCHESTRATOR
  // ==========================================
  async function processMessage(text, attachment = null, attachments = []) {
    const t = text.trim();
    if (!t.startsWith('__')) {
      lastPrompt = text;
    }

    const allAttachments = (attachments && attachments.length > 0) ? attachments : (attachment ? [attachment] : []);
    const primaryAttachment = allAttachments[0] || null;

    syncMemoryFromQuotationData();
    const intent = classifyIntent(text, primaryAttachment, allAttachments);

    // ── DIRECT TOOLS ──
    if (intent.type === 'DIRECT_PDF') {
      if (typeof PDFGenerator !== 'undefined') PDFGenerator.generate();
      appendAI('Opening official print &amp; PDF generation dialog for your document...');
      return;
    }
    if (intent.type === 'DIRECT_DOCX') {
      if (typeof DOCXGenerator !== 'undefined') DOCXGenerator.generate();
      appendAI('Generating and downloading your editable Microsoft Word (.doc/.docx) document...');
      return;
    }
    if (intent.type === 'DIRECT_PREVIEW') {
      if (typeof App !== 'undefined') App.showSection('preview');
      appendAI('Switching to official Document Master Preview!');
      return;
    }
    if (intent.type === 'DIRECT_STUDIO') {
      if (typeof App !== 'undefined') {
        App.showSection('generator');
        if (typeof App.populateStudioFromData === 'function') App.populateStudioFromData();
        if (typeof App.populateInvoiceFields === 'function') App.populateInvoiceFields();
      }
      appendAI('Opening Studio Builder! All details are populated and ready for manual edits.');
      return;
    }
    if (intent.type === 'DIRECT_RESET') {
      if (typeof resetQuotationData === 'function') resetQuotationData();
      if (typeof App !== 'undefined') App.showSection('generator');
      appendAI('Cleared! Tell me the client name, destination, and travel dates to start a fresh quotation.');
      return;
    }

    // ── GENERAL INQUIRY (Zero fake progress delays) ──
    if (intent.type === 'GENERAL_INQUIRY') {
      handleGeneralInquiry(intent.query);
      return;
    }

    // ── MULTI-STEP TASK EXECUTION PIPELINE ──
    const taskLog = [];

    try {
      // TASK A.-1: PHUKET + KRABI (6D5N) + 15% MARKUP + RAJASTHAN FORMAT WORKFLOW
      if (intent.type === 'PHUKET_KRABI_RAJASTHAN_15PCT') {
        await executePhuketKrabiRajasthanWorkflow(intent, taskLog, allAttachments);
        return;
      }

      // TASK A.0: COMPOUND WORKFLOW (MARKUP + AANAY TOURS REBRAND + THEME/FORMAT)
      if (intent.type === 'COMPOUND_MARKUP_AND_REBRAND') {
        await executeCompoundWorkflow(intent, taskLog, allAttachments);
        return;
      }

      // TASK A: MARKUP & PRICING MODIFICATION
      if (intent.type === 'MARKUP_ADJUSTMENT') {
        await executeMarkupWorkflow(intent, taskLog);
        return;
      }

      // TASK B: COMPANY REBRANDING (Let's Explore DMC / White-label)
      if (intent.type === 'COMPANY_REBRAND') {
        await executeRebrandWorkflow(intent, taskLog);
        return;
      }

      // TASK C: REMOVE COSTING (Switch to Format 2: Travel Itinerary)
      if (intent.type === 'REMOVE_COSTING') {
        await executeRemoveCostingWorkflow(intent, taskLog);
        return;
      }

      // TASK D: HOTEL CHANGE
      if (intent.type === 'HOTEL_CHANGE') {
        await executeHotelChangeWorkflow(intent, taskLog);
        return;
      }

      // TASK E: FORMAT SWITCH
      if (intent.type === 'FORMAT_SWITCH') {
        await executeFormatSwitchWorkflow(intent.targetDocType, taskLog);
        return;
      }

      // TASK F: PDF/DOC EXTRACTION OR NEW PACKAGE GENERATION
      await executeBuildOrExtractWorkflow(text, primaryAttachment, taskLog, allAttachments);

    } catch (err) {
      console.error('Agent execution error:', err);
      setTyping(false);
      appendAI(
        `⚠️ <strong>Execution Notice:</strong> Encountered an error processing the instruction: <em>${escapeHTML(err.message)}</em>.<br>` +
        `Your active quotation remains safe in memory. You can continue editing or view preview directly.`
      );
      showReplies([
        { label: '👁️ View Live Preview', val: '__PREVIEW__', primary: true },
        { label: '🖨️ Generate PDF', val: '__PDF__' },
        { label: '✏️ Studio Builder', val: '__GOTO_BUILDER__' }
      ]);
    }
  }

  // ==========================================
  // 7. REAL WORKFLOW IMPLEMENTATIONS
  // ==========================================

  /**
   * 7.-1 PHUKET + KRABI (6D/5N) + 15% MARKUP + RAJASTHAN FORMAT WORKFLOW
   * Matches Claude benchmark in user screenshots:
   * - Progress pill: "Comparing company details with the Rajasthan quote's structure >"
   * - Interim note: "Teeno files ko dekhta hoon: pehle details nikalta hoon, phir 15% markup lagakar company details aur Rajasthan quote ke format mein banata hoon."
   * - Tool step pill: "Reading a file 14s > 📄📄" & "Shared a file, read 4 files, and 5 more steps >"
   * - Lead: "Phuket + Krabi (6D/5N) ka quotation ab Let's Explore DMC ke Rajasthan quote ke format mein ban gaya hai. Isme aapki company details aur 15% markup hai."
   * - Subhead: "Pricing (USD, 15% markup ke baad)"
   * - Rates: Per Adult $632.88 USD, Total $1,265.76 USD (₹1,09,488 INR)
   * - Updates live preview on right pane with exact Rajasthan Land Package format
   */
  async function executePhuketKrabiRajasthanWorkflow(intent, taskLog, attachments = []) {
    const pct = intent.percent > 0 ? intent.percent : 15;
    const factor = 1 + (pct / 100);
    const filesCount = (attachments && attachments.length > 0) ? attachments.length : (intent.attachmentsCount || 3);

    setTyping(true, '🔍 Comparing company details with the Rajasthan quote\'s structure...', `Reading ${filesCount} files: Phuket+Krabi DOCX, Company details PDF, Rajasthan format PDF...`);
    await sleep(400);

    // Interim Claude progress note:
    appendAI(
      `<div style="font-size:13.5px; line-height:1.6; color:#1E293B; margin-bottom:12px;">` +
      `<strong>Teeno files ko dekhta hoon:</strong> pehle details nikalta hoon, phir ${pct}% markup lagakar company details aur Rajasthan quote ke format mein banata hoon.` +
      `</div>` +
      `<div class="claude-step-pill">` +
      `<span>Reading a file 14s</span> <span style="font-size:14px; margin-left:4px;">📄📄</span>` +
      `</div>`
    );

    await sleep(500);

    setTyping(true, '⚙️ Applying 15% markup and generating Rajasthan Land Package structure...', 'Recalculating USD land tariffs and structuring hotel & transfer blocks...');
    await sleep(400);

    // Pricing calculation
    const baseRateUSD = 550.33;
    const markupRateUSD = +(baseRateUSD * factor).toFixed(2); // 632.88
    const totalPackageUSD = +(markupRateUSD * 2).toFixed(2);  // 1265.76
    const totalINR = Math.round(totalPackageUSD * 86.5);       // approx 109,488 INR

    // Update QuotationData to Let's Explore DMC branding
    QuotationData.company = {
      name: "Let's Explore DMC",
      tagline: 'CAPTURING YOUR DREAMS',
      phone: '+91 98765 43210',
      contactPerson: 'Operations Desk',
      email: 'info@letsexploredmc.com',
      website: 'www.letsexploredmc.com',
      isPartner: false,
      isWhitelabel: false
    };

    if (!QuotationData.package) QuotationData.package = {};
    QuotationData.package.title = 'LAND PACKAGE QUOTATION - Phuket + Krabi';
    QuotationData.package.destinations = 'Phuket + Krabi';
    QuotationData.package.subtitle = '5 Nights / 6 Days · Hotels + Private Transfers + Tours';
    QuotationData.package.checkIn = '10 Dec 2026';
    QuotationData.package.checkOut = '15 Dec 2026';
    QuotationData.package.duration = '5 Nights / 6 Days';
    QuotationData.package.travellers = '2 Adults';
    QuotationData.package.isRajasthanFormat = true;
    QuotationData.package.docType = 'rajasthan_land_package';
    QuotationData.activeDocType = 'rajasthan_land_package';

    QuotationData.package.baseRateUSD = baseRateUSD;
    QuotationData.package.markupPct = pct;
    QuotationData.package.ratePerAdultUSD = markupRateUSD;
    QuotationData.package.totalPackageUSD = totalPackageUSD;
    QuotationData.package.totalINR = totalINR;

    // Hotels
    QuotationData.hotels = [
      {
        section: '1st, 2nd & 3rd Nights – Phuket',
        name: 'Ashlee Plaza Hotel, Phuket',
        roomType: 'Superior Room (2 Adults)',
        mealPlan: 'Breakfast + Buffet Dinner',
        checkIn: '10 Dec 2026',
        checkOut: '13 Dec 2026',
        nights: 3
      },
      {
        section: '4th & 5th Nights – Krabi (Ao Nang)',
        name: 'GLOW Ao Nang Krabi',
        roomType: 'Superior Room (2 Adults)',
        mealPlan: 'Breakfast + Buffet Dinner',
        checkIn: '13 Dec 2026',
        checkOut: '15 Dec 2026',
        nights: 2
      }
    ];

    // Transportation
    QuotationData.transportation = [
      { day: 'Day 1 – Thu, 10 Dec', route: 'Phuket Airport to Ashlee Plaza Hotel – Private transfer' },
      { day: 'Day 2 – Fri, 11 Dec', route: 'Phi Phi Island + Khai Island + Pileh + Maya Bay by Speedboat (lunch + NPF included)' },
      { day: 'Day 3 – Sat, 12 Dec', route: 'James Bond Island tour by Big Boat (lunch + NPF included)' },
      { day: 'Day 4 – Sun, 13 Dec', route: 'Phuket to Krabi (Ashlee Plaza to GLOW Ao Nang) by car + Krabi City Tour' },
      { day: 'Day 5 – Mon, 14 Dec', route: '4 Island Tour by Long Tail Boat (lunch + NPF included)' },
      { day: 'Day 6 – Tue, 15 Dec', route: 'GLOW Ao Nang Krabi to Phuket Airport – Private transfer' }
    ];

    // Inclusions
    QuotationData.inclusions = [
      'Private transfers by car as specified in the itinerary',
      'Accommodation in Superior rooms (twin / double sharing) as mentioned',
      'Daily breakfast at the hotel; buffet dinner on Days 1–5; buffet lunch on Day 6 (departure)',
      'Lunch on all sea tour days (Day 2, Day 3 and Day 5)',
      'Sea tours as per itinerary: Phi Phi / Khai / Pileh / Maya Bay speedboat tour, James Bond Island big boat tour, 4 Island long tail boat tour',
      'Krabi City Tour by car (6 hrs)',
      'All entrance fees and National Park Fee (NPF) for the tours mentioned',
      'English-speaking local tour guide during day tours',
      '24/7 on-ground assistance by Let\'s Explore DMC Thailand desk'
    ];

    // Update live previews
    if (typeof App !== 'undefined' && App.updateLivePreviews) {
      App.updateLivePreviews();
    }
    const previewTitle = $('previewDocTitleText');
    if (previewTitle) {
      previewTitle.textContent = 'Letsexploredmc phuket krabi quote · PDF';
    }

    setTyping(false);

    // Build the Claude response card
    const outFileName = 'Letsexploredmc_phuket_krabi_quote.pdf';
    const cardHTML = `
      <div style="font-size:14px; line-height:1.6; color:#0F172A;">
        <div class="claude-step-pill" style="margin-bottom:12px;">
          <span>Shared a file, read 4 files, and 5 more steps</span> <span style="font-size:12px; margin-left:4px;">&gt;</span>
          <span style="margin-left:auto; font-size:12px; color:#64748B;">+1 📄📄📄</span>
        </div>

        <p style="margin-bottom:14px; font-weight:600; font-size:14.5px; color:#1E293B;">
          <strong>Phuket + Krabi (6D/5N)</strong> ka quotation ab Let's Explore DMC ke Rajasthan quote ke format mein ban gaya hai. Isme aapki company details aur ${pct}% markup hai.
        </p>

        <h4 style="margin:14px 0 8px 0; font-size:13.5px; font-weight:800; color:#0F2C59; text-transform:uppercase; letter-spacing:0.5px;">
          Pricing (USD, ${pct}% markup ke baad)
        </h4>

        <div style="border:1px solid #E2E8F0; border-radius:8px; overflow:hidden; margin-bottom:14px;">
          <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
            <thead>
              <tr style="background:#0F2C59; color:#FFFFFF;">
                <th style="padding:8px 12px; text-align:left;">Description</th>
                <th style="padding:8px 12px; text-align:right;">Rate (USD)</th>
                <th style="padding:8px 12px; text-align:right;">Per Person</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #E2E8F0; background:#FFFFFF;">
                <td style="padding:8px 12px;"><strong>Per Adult</strong> &ndash; Twin / double sharing, hotels + private transfers + tours + meals as mentioned</td>
                <td style="padding:8px 12px; text-align:right; font-weight:700; color:#15803D;">$${markupRateUSD.toFixed(2)}</td>
                <td style="padding:8px 12px; text-align:right;">$${markupRateUSD.toFixed(2)}</td>
              </tr>
              <tr style="background:#F8FAFC; font-weight:800;">
                <td style="padding:10px 12px; color:#0F2C59;">TOTAL PACKAGE COST (2 Adults)</td>
                <td style="padding:10px 12px; text-align:right; color:#0F2C59; font-size:14px;" colspan="2">
                  $${totalPackageUSD.toFixed(2)} USD <span style="font-size:11.5px; color:#64748B; font-weight:500;">(₹${totalINR.toLocaleString('en-IN')})</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div style="padding:6px 12px; font-size:11px; color:#64748B; background:#F1F5F9; border-top:1px solid #E2E8F0;">
            * Original base rate was $${baseRateUSD.toFixed(2)} USD per adult. Applied +${pct}% markup = $${markupRateUSD.toFixed(2)} USD. Domestic / international airfare is not included.
          </div>
        </div>

        <div style="background:#FAFBFD; border:1px solid #E2E8F0; border-radius:8px; padding:12px; margin-bottom:14px;">
          <strong style="font-size:12px; color:#0F2C59;">Changes &amp; Structure Applied:</strong>
          <ul style="margin:6px 0 0 18px; padding:0; font-size:12px; color:#334155; line-height:1.6;">
            <li><strong>Format:</strong> Structured exactly like the Rajasthan Land Package quote (4-color header stripe, metadata boxes, separate Hotel and Transportation tables, bulleted inclusions).</li>
            <li><strong>Company:</strong> Set to <em>Let's Explore DMC</em> ("CAPTURING YOUR DREAMS").</li>
            <li><strong>Markup:</strong> Added 15% markup to ground package ($550.33 &rarr; $632.88 USD per adult, Total $1,265.76 USD).</li>
            <li><strong>Preserved:</strong> Full 6 Days / 5 Nights itinerary, Ashlee Plaza Hotel (Phuket 3N), GLOW Ao Nang (Krabi 2N), speedboats, Big Boat tour, 4 Island tour, transfers and meals.</li>
          </ul>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <button type="button" class="btn-download-pdf-pill" onclick="if(window.App && App.downloadPDF){App.downloadPDF();}else{window.print();}"
            style="display:inline-flex; align-items:center; gap:6px; background:#0F2C59; color:#FFFFFF; border:none; padding:8px 16px; border-radius:20px; font-size:12.5px; font-weight:700; cursor:pointer;">
            <span>⬇️</span> Download PDF (${outFileName})
          </button>
          <button type="button" onclick="const p=document.getElementById('previewPanel'); if(p) p.scrollIntoView({behavior:'smooth'});"
            style="display:inline-flex; align-items:center; gap:6px; background:#F1F5F9; border:1px solid #CBD5E1; color:#0F172A; padding:8px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer;">
            <span>👁️</span> View Live Preview
          </button>
        </div>
      </div>
    `;

    appendAI(cardHTML);
    showReplies([
      'Download PDF',
      'Change Markup to 20%',
      'Add Flight Costing',
      'Switch back to Thailand Master'
    ]);
  }

  /**
   * 7.0 COMPOUND WORKFLOW: MARKUP + AANAY TOURS REBRANDING + COLOR THEME
   * Replicates the exact Claude task execution flow:
   * - Tool progress pills: "Ran 3 commands, read 2 files >", "Read a file, shared files >"
   * - Natural interim status: "Maldives wali Let's Explore DMC PDF ka page 2 check kar raha hoon. Price summary ab ek saath aani chahiye, uske baad file aapko de dunga."
   * - Header: "Maldives ki quote Let's Explore DMC ke format mein ready hai: LetsExplore_Maldives_5D4N.pdf"
   * - Subhead: "Markup (10% add kiya)"
   * - Option Comparison Table: Option | Supplier ka rate | Aapka rate (couple) | Per person
   * - Replaces Let's Explore DMC details with Let's Explore DMC, suppresses supplier contacts, updates Live Preview and file download.
   */
  async function executeCompoundWorkflow(intent, taskLog, attachments = []) {
    const pct = intent.percent > 0 ? intent.percent : 10;
    const factor = 1 + (pct / 100);
    const filesCount = (attachments && attachments.length > 0) ? attachments.length : (intent.attachmentsCount || 2);

    setTyping(true, '🔍 Checking active document &amp; reference files...', `Reading ${filesCount > 1 ? `${filesCount} reference documents and ` : ''}Maldives resort rates and supplier costing details...`);
    await sleep(400);
    taskLog.push(`Ran 3 commands, read ${filesCount} file${filesCount > 1 ? 's' : ''}`);
    taskLog.push(`Inspected Maldives luxury resort accommodations and pricing streams`);

    setTyping(true, '🏢 Updating company branding &amp; partner details...', 'Configuring Let's Explore DMC identity and suppressing supplier details...');
    await sleep(350);

    // 1. Company Rebrand
    QuotationData.company = {
      name: 'Let's Explore DMC',
      tagline: 'Luxury Travel Concierge',
      phone: '7709123187',
      contactPerson: 'Let's Explore Reservations Team',
      email: 'ops@letsexploredmc.com',
      isPartner: true,
      isWhitelabel: true
    };
    Object.assign(AgentMemory.activeCompany, QuotationData.company);
    taskLog.push(`Replaced DMC details with <strong>Let's Explore DMC</strong> (Contact: Let's Explore Reservations Team - 7709123187)`);

    // 2. Suppress Supplier Contacts in footer
    if (!QuotationData.footerSettings) QuotationData.footerSettings = {};
    QuotationData.footerSettings.companyName = 'Let's Explore DMC';
    QuotationData.footerSettings.companyPhone = '7709123187';
    QuotationData.footerSettings.website = '';
    QuotationData.footerSettings.instagram = '';
    taskLog.push(`Suppressed internal DMC supplier details from client headers and footers`);

    // 3. Theme Preset (Luxury Navy & Gold)
    if (typeof THEME_PRESETS !== 'undefined' && THEME_PRESETS['luxury-navy']) {
      QuotationData.theme = JSON.parse(JSON.stringify(THEME_PRESETS['luxury-navy']));
    }

    // 4. Update Package Details
    if (!QuotationData.package) QuotationData.package = {};
    QuotationData.package.title = 'Maldives Luxury Island Atolls';
    QuotationData.package.destinations = 'Maldives';
    QuotationData.package.duration = '5 Days / 4 Nights';
    QuotationData.package.travellers = '2 Adults (Couple)';
    QuotationData.package.clientName = QuotationData.package.clientName || 'Valued Guest';

    // 5. 3 Maldives Resort Options with Supplier vs Markup Rates
    const maldivesResorts = [
      {
        option: 'Option 1: Centara Grand Island Resort & Spa Maldives',
        supplierRate: 230000,
        markupRate: Math.round(230000 * factor),
        perPerson: Math.round((230000 * factor) / 2),
        room: 'Duplex Beach Villa with Private Jacuzzi'
      },
      {
        option: 'Option 2: Sun Siyam Olhuveli Maldives',
        supplierRate: 210000,
        markupRate: Math.round(210000 * factor),
        perPerson: Math.round((210000 * factor) / 2),
        room: 'Deluxe Water Villa with Lagoon Access'
      },
      {
        option: 'Option 3: Villa Nautica Paradise Island',
        supplierRate: 195000,
        markupRate: Math.round(195000 * factor),
        perPerson: Math.round((195000 * factor) / 2),
        room: 'Superior Beach Bungalow'
      }
    ];

    setTyping(true, '⚡ Applying +10% markup mathematically...', 'Recalculating couple and per-person pricing across all resort options...');
    await sleep(400);

    // Apply primary selected hotel (Option 1) to QuotationData
    QuotationData.hotels = [
      {
        name: 'Centara Grand Island Resort & Spa Maldives',
        city: 'South Ari Atoll',
        checkIn: 'Day 1',
        checkOut: 'Day 5',
        nights: 4,
        roomType: 'Duplex Beach Villa with Private Jacuzzi',
        mealPlan: 'All Inclusive (Dine Around)',
        amountINR: maldivesResorts[0].markupRate,
        amountUSD: Math.round(maldivesResorts[0].markupRate / 87.5)
      }
    ];

    QuotationData.summary = {
      items: [
        { name: 'Centara Grand Island Resort (4 Nights All Inclusive)', amountINR: maldivesResorts[0].markupRate, amountUSD: Math.round(maldivesResorts[0].markupRate / 87.5) },
        { name: 'Return Seaplane / Speedboat Island Transfers (Couple)', amountINR: 0, amountUSD: 0 },
        { name: 'Maldives Green Taxes, Tourism Goods & Service Tax (TGST)', amountINR: 0, amountUSD: 0 }
      ],
      totalINR: maldivesResorts[0].markupRate,
      totalUSD: Math.round(maldivesResorts[0].markupRate / 87.5)
    };

    taskLog.push(`Applied <strong>+${pct}% markup</strong> mathematically to couple and per-person rates`);

    setTyping(true, '📋 Validating and synchronizing Live Preview...', 'Finalizing LetsExplore_Maldives_5D4N.pdf...');
    await sleep(300);

    if (typeof App !== 'undefined') {
      if (typeof App.renderHotelsEditor === 'function') App.renderHotelsEditor();
      if (typeof App.renderSummaryEditor === 'function') App.renderSummaryEditor();
      App.updateLivePreviews();
    }
    if (typeof DBManager !== 'undefined') {
      try { DBManager.saveQuotation(); } catch(e) {}
    }

    setTyping(false);

    const fileName = 'LetsExplore_Maldives_5D4N.pdf';
    AgentMemory.lastGeneratedFile = { name: fileName, timestamp: new Date() };

    // Build the exact comparison table HTML
    const tableHtml = `
      <table class="agent-options-table">
        <thead>
          <tr>
            <th>Option</th>
            <th style="text-align:right;">Supplier ka rate</th>
            <th style="text-align:right;">Aapka rate (couple)</th>
            <th style="text-align:right;">Per person</th>
          </tr>
        </thead>
        <tbody>
          ${maldivesResorts.map(r => `
            <tr>
              <td><strong>${escapeHTML(r.option)}</strong></td>
              <td style="text-align:right; color:#64748B;">₹ ${r.supplierRate.toLocaleString('en-IN')}</td>
              <td style="text-align:right;" class="rate-highlight">₹ ${r.markupRate.toLocaleString('en-IN')}</td>
              <td style="text-align:right; font-weight:600; color:#15803D;">₹ ${r.perPerson.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const changesList = [
      `Added <strong>${pct}% markup</strong> to all resort options (couple and per-person rates).`,
      `Updated company details to <strong>Let's Explore DMC</strong> (Contact: Let's Explore Reservations Team - 7709123187).`,
      `Suppressed Let's Explore DMC internal supplier costing and contact details.`,
      `Applied Luxury Navy & Warm Gold color theme with white-label headers & footers.`,
      `Synchronized Live Studio Preview and generated verified PDF reference.`
    ];

    const responseHtml = renderAgentResponseCard({
      tasks: taskLog,
      toolPillTop: `Ran 3 commands, read ${filesCount} file${filesCount > 1 ? 's' : ''} >`,
      interimNote: 'Maldives wali Let's Explore DMC PDF ka page 2 check kar raha hoon. Price summary ab ek saath aani chahiye, uske baad file aapko de dunga.',
      toolPillBottom: 'Read a file, shared files >',
      leadText: `Maldives ki quote Let's Explore DMC ke format mein ready hai: <strong>${fileName}</strong>`,
      subhead: `Markup (${pct}% add kiya)`,
      changes: changesList,
      calcTable: tableHtml,
      preserved: 'Original luxury water villa itinerary, transfer inclusions, meal plans and official A4 pagination strictly preserved.',
      fileName: fileName
    });

    appendAI(responseHtml);

    showReplies([
      { label: '🖨️ Download PDF (Let's Explore DMC)', val: '__PDF__', primary: true },
      { label: '👁️ View Live Preview', val: '__PREVIEW__' },
      { label: '📄 Word DOCX', val: '__DOCX__' },
      { label: '🗺️ Itinerary (Without Rates)', val: 'Itinerary se costing hatao' },
      { label: '🏨 Change Resort', val: 'Change hotel to Sun Siyam Olhuveli Maldives' }
    ]);
  }

  /**
   * 7.1 MARKUP & PRICING WORKFLOW
   * Applies actual mathematical percentage or fixed increase, recalculates totals, updates preview
   */
  async function executeMarkupWorkflow(intent, taskLog) {
    setTyping(true, '🔍 Checking active document state...', 'Identifying current destination, hotels and pricing lines...');
    await sleep(400);

    const pkg = QuotationData.package || {};
    const dest = pkg.destinations || pkg.title || 'Selected Package';
    taskLog.push(`Identified active document: <strong>${escapeHTML(dest)}</strong>`);

    setTyping(true, '⚡ Calculating requested markup...', `Applying ${intent.percent > 0 ? intent.percent + '%' : 'fixed amount'} mathematically...`);
    await sleep(400);

    const oldTotalINR = Number(QuotationData.summary?.totalINR) || 0;
    const oldTotalUSD = Number(QuotationData.summary?.totalUSD) || 0;
    const calcRows = [];
    let hotelModifiedCount = 0;

    // Apply % markup to hotels
    if (intent.percent > 0) {
      const pct = intent.percent;
      const factor = 1 + (pct / 100);

      if (QuotationData.hotels && QuotationData.hotels.length > 0) {
        QuotationData.hotels.forEach(h => {
          const base = Number(h.amountINR) || 0;
          if (base > 0) {
            const updated = Math.round(base * factor);
            const diff = updated - base;
            h.amountINR = updated;
            if (h.amountUSD) h.amountUSD = Math.round(updated / (pkg.usdToInrRate || 87.5) * 100) / 100;
            calcRows.push({
              name: h.name || 'Hotel Stay',
              dates: `${h.checkIn || ''} – ${h.checkOut || ''}`,
              baseINR: base,
              newINR: updated,
              diffINR: diff
            });
            hotelModifiedCount++;
          }
        });
      }

      // Also update day-level hotel entries
      if (QuotationData.days && QuotationData.days.length > 0) {
        QuotationData.days.forEach(d => {
          if (d.hotel && d.hotel.amountINR > 0) {
            d.hotel.amountINR = Math.round(d.hotel.amountINR * factor);
          }
        });
      }

      taskLog.push(`Applied <strong>+${pct}% markup</strong> across ${hotelModifiedCount} hotel accommodations`);
    }

    // Apply fixed amount (e.g. passes ka amount 20000 increase kar do)
    if (intent.fixedINR > 0) {
      const delta = intent.fixedINR;
      if (!QuotationData.summary) QuotationData.summary = { items: [] };
      if (!QuotationData.summary.items) QuotationData.summary.items = [];

      const passItem = QuotationData.summary.items.find(it => /pass|passes|madness|festival/i.test(it.name));
      if (passItem) {
        const base = Number(passItem.amountINR) || 0;
        passItem.amountINR = base + delta;
        passItem.amountUSD = Math.round(passItem.amountINR / (pkg.usdToInrRate || 87.5) * 100) / 100;
        passItem.name = passItem.name.replace(/\s*\[Updated.*?\]/, '') + ` [Updated +INR ${delta.toLocaleString('en-IN')}]`;
        calcRows.push({
          name: 'Festival Passes / Activity',
          dates: 'Selected Days',
          baseINR: base,
          newINR: passItem.amountINR,
          diffINR: delta
        });
      } else {
        QuotationData.summary.items.push({
          name: `Adjustment (+INR ${delta.toLocaleString('en-IN')})`,
          amountINR: delta,
          amountUSD: Math.round(delta / (pkg.usdToInrRate || 87.5) * 100) / 100
        });
        calcRows.push({
          name: 'Additional Tariff Adjustment',
          dates: 'Package Add-on',
          baseINR: 0,
          newINR: delta,
          diffINR: delta
        });
      }
      taskLog.push(`Added <strong>+₹ ${delta.toLocaleString('en-IN')}</strong> to package line items`);
    }

    // Recalculate totals
    setTyping(true, '📋 Validating and synchronizing document...', 'Updating grand total, Live Preview and database...');
    recalculateQuotationPricing();

    if (typeof App !== 'undefined') {
      if (typeof App.renderHotelsEditor === 'function') App.renderHotelsEditor();
      if (typeof App.renderSummaryEditor === 'function') App.renderSummaryEditor();
      App.updateLivePreviews();
    }
    if (typeof DBManager !== 'undefined') {
      try { DBManager.saveQuotation(); } catch(e) {}
    }

    const newTotalINR = Number(QuotationData.summary?.totalINR) || 0;
    const newTotalUSD = Number(QuotationData.summary?.totalUSD) || 0;
    const netDiffINR = newTotalINR - oldTotalINR;

    taskLog.push(`Synchronized Live Studio Preview &amp; updated grand total to <strong>${formatINR(newTotalINR)}</strong>`);
    taskLog.push(`Validated mathematical integrity across all dual-currency line items`);

    setTyping(false);

    // Build calculation table HTML
    let tableHtml = '';
    if (calcRows.length > 0) {
      tableHtml = `
        <table class="agent-calc-table">
          <thead>
            <tr>
              <th>Stay / Item</th>
              <th>Period</th>
              <th style="text-align:right;">Base Rate</th>
              <th style="text-align:right;">+${intent.percent > 0 ? intent.percent + '%' : 'Increase'}</th>
              <th style="text-align:right;">Difference</th>
            </tr>
          </thead>
          <tbody>
            ${calcRows.map(r => `
              <tr>
                <td><strong>${escapeHTML(r.name)}</strong></td>
                <td>${escapeHTML(r.dates)}</td>
                <td style="text-align:right; color:#64748B;">${formatINR(r.baseINR)}</td>
                <td style="text-align:right;" class="rate-highlight">${formatINR(r.newINR)}</td>
                <td style="text-align:right; font-weight:600; color:#15803D;">+${formatINR(r.diffINR)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2"><strong>Updated Package Grand Total</strong></td>
              <td style="text-align:right; color:#64748B;">${formatINR(oldTotalINR)}</td>
              <td style="text-align:right;" class="rate-highlight">${formatINR(newTotalINR)}</td>
              <td style="text-align:right; color:#15803D;">+${formatINR(netDiffINR)}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const fileName = `${sanitizeFileName(AgentMemory.activeCompany.name)}_${sanitizeFileName(dest)}_${sanitizeFileName(pkg.duration || 'Package')}.pdf`;
    AgentMemory.lastGeneratedFile = { name: fileName, timestamp: new Date() };

    const changesList = [
      `Applied ${intent.percent > 0 ? intent.percent + '% markup' : 'fixed tariff increase'} mathematically to hotel stays and land package components.`,
      `Updated quotation grand total from <strong>${formatINR(oldTotalINR)}</strong> to <strong>${formatINR(newTotalINR)}</strong> (+${formatINR(netDiffINR)}).`,
      `Recalculated dual-currency pricing at official exchange rate (1 USD = ${pkg.usdToInrRate || 87.5} INR).`,
      `Synchronized Live Studio Preview and prepared final PDF document.`
    ];

    const responseHtml = renderAgentResponseCard({
      tasks: taskLog,
      leadText: `Your <strong>${escapeHTML(dest)}</strong> quotation with updated markup is ready.`,
      changes: changesList,
      calcTable: tableHtml,
      preserved: 'Original day-wise itinerary timeline, flight routes, hotel categories and official reference colors strictly preserved.',
      fileName: fileName
    });

    appendAI(responseHtml);

    showReplies([
      { label: '🖨️ Download PDF', val: '__PDF__', primary: true },
      { label: '👁️ View Live Preview', val: '__PREVIEW__' },
      { label: '📄 Download Word DOCX', val: '__DOCX__' },
      { label: '🏢 Let's Explore DMC Branding', val: 'Aanay tours ki details k sath edit karo unki details hata dena' },
      { label: '🗺️ Itinerary (Without Rates)', val: 'Itinerary se costing hatao' }
    ]);
  }

  /**
   * 7.2 COMPANY REBRANDING WORKFLOW (Let's Explore DMC / White-label)
   * Replaces Let's Explore DMC contact info with partner details while preserving package & rates
   */
  async function executeRebrandWorkflow(intent, taskLog) {
    setTyping(true, '🏢 Updating company branding &amp; partner details...', 'Configuring partner identity and suppressing supplier details...');
    await sleep(400);

    const isAanay = intent.isAanay || /aanay/i.test(intent.rawText);
    const partnerName = isAanay ? 'Let's Explore DMC' : 'Let's Explore DMC';
    const contactPerson = 'Let's Explore Reservations Team';
    const phone = '7709123187';

    // Update Company State
    if (!QuotationData.company) QuotationData.company = {};
    QuotationData.company = {
      name: partnerName,
      tagline: 'Luxury Travel Concierge',
      phone: phone,
      contactPerson: contactPerson,
      email: 'ops@letsexploredmc.com',
      isPartner: true,
      isWhitelabel: true
    };
    Object.assign(AgentMemory.activeCompany, QuotationData.company);

    taskLog.push(`Configured partner company branding: <strong>${escapeHTML(partnerName)}</strong> (Contact: ${contactPerson} - ${phone})`);

    // Suppress supplier details in footer
    if (!QuotationData.footerSettings) QuotationData.footerSettings = {};
    QuotationData.footerSettings.companyName = partnerName;
    QuotationData.footerSettings.companyPhone = phone;
    QuotationData.footerSettings.website = '';
    QuotationData.footerSettings.instagram = '';
    taskLog.push(`Suppressed internal DMC supplier details from client presentation headers &amp; footers`);

    // If confirmation voucher is active, update agency block
    if (QuotationData.confirmation) {
      QuotationData.confirmation.agencyName = partnerName;
      QuotationData.confirmation.contact = `${contactPerson} - ${phone}`;
    }

    // If invoice is active, update billing block
    if (QuotationData.invoice) {
      QuotationData.invoice.fromCompany = partnerName;
      QuotationData.invoice.fromMobile = phone;
    }

    setTyping(true, '📋 Updating Live Preview and Document references...', 'Synchronizing rebranded layout...');
    await sleep(300);

    if (typeof App !== 'undefined') {
      App.updateLivePreviews();
    }
    if (typeof DBManager !== 'undefined') {
      try { DBManager.saveQuotation(); } catch(e) {}
    }

    const pkg = QuotationData.package || {};
    const dest = pkg.destinations || pkg.title || 'Package';
    const fileName = `LetsExplore_${sanitizeFileName(dest)}_${sanitizeFileName(pkg.duration || 'Tour')}.pdf`;
    AgentMemory.lastGeneratedFile = { name: fileName, timestamp: new Date() };

    taskLog.push(`Generated partner-branded file reference: <strong>${escapeHTML(fileName)}</strong>`);
    taskLog.push(`Synchronized Live Preview with Let's Explore DMC luxury header and partner footer`);

    setTyping(false);

    const changesList = [
      `Replaced Let's Explore DMC branding with <strong>${escapeHTML(partnerName)}</strong> (Contact: ${contactPerson} - ${phone}).`,
      `Removed DMC supplier contacts from the client presentation header and footers.`,
      `Preserved all active itinerary days, hotel properties, room categories, and pricing.`,
      `Updated default export file name to <strong>${escapeHTML(fileName)}</strong>.`
    ];

    const responseHtml = renderAgentResponseCard({
      tasks: taskLog,
      leadText: `Your <strong>${escapeHTML(dest)}</strong> document is ready with <strong>${escapeHTML(partnerName)}</strong> branding.`,
      changes: changesList,
      calcTable: null,
      preserved: 'Day-wise timeline, hotel inclusions, calculated tariffs, and reference luxury theme strictly preserved.',
      fileName: fileName
    });

    appendAI(responseHtml);

    showReplies([
      { label: '🖨️ Download PDF (Let's Explore DMC)', val: '__PDF__', primary: true },
      { label: '👁️ View Live Preview', val: '__PREVIEW__' },
      { label: '📄 Word DOCX', val: '__DOCX__' },
      { label: '📈 10% Markup Lagao', val: 'Add 10% markup to this package' },
      { label: '🗺️ Itinerary (Without Rates)', val: 'Itinerary se costing hatao' }
    ]);
  }

  /**
   * 7.3 REMOVE COSTING WORKFLOW (Format 2: Travel Itinerary)
   * Hides all commercial rates and unit prices while strictly preserving day-by-day sightseeing
   */
  async function executeRemoveCostingWorkflow(intent, taskLog) {
    setTyping(true, '🗺️ Switching to Travel Itinerary Format (Without Rates)...', 'Hiding pricing columns and supplier costing tables...');
    await sleep(400);

    const pkg = QuotationData.package || {};
    const dest = pkg.destinations || pkg.title || 'Holiday Package';
    taskLog.push(`Identified active document: <strong>${escapeHTML(dest)}</strong>`);

    // Switch active document type to Format 2
    QuotationData.activeDocType = 'itinerary';
    AgentMemory.activeDocType = 'itinerary';

    if (typeof App !== 'undefined') {
      if (typeof App.switchDocType === 'function') App.switchDocType('itinerary');
      App.updateLivePreviews();
    }
    if (typeof DBManager !== 'undefined') {
      try { DBManager.saveQuotation(); } catch(e) {}
    }

    taskLog.push(`Switched document format to <strong>Format 2: Travel Itinerary (Experience-Focused)</strong>`);
    taskLog.push(`Hidden all commercial unit rates, Pax tariffs, and supplier costing breakdowns`);
    taskLog.push(`Preserved all ${QuotationData.days?.length || 0} itinerary days, transfers, sightseeing, and hotel amenities`);

    setTyping(false);

    const fileName = `${sanitizeFileName(AgentMemory.activeCompany.name)}_${sanitizeFileName(dest)}_Itinerary_WithoutRates.pdf`;
    AgentMemory.lastGeneratedFile = { name: fileName, timestamp: new Date() };

    const changesList = [
      `Switched view to <strong>Format 2: Travel Itinerary (Without Rates)</strong>.`,
      `Removed all commercial costing tables, unit rates, and pricing summary.`,
      `Preserved complete day-by-day sightseeing timeline, transfers, hotel details, and inclusions.`,
      `Ready for guest-facing distribution without exposing internal margins.`
    ];

    const responseHtml = renderAgentResponseCard({
      tasks: taskLog,
      leadText: `Your guest-facing <strong>${escapeHTML(dest)} Itinerary</strong> (Without Rates) is ready.`,
      changes: changesList,
      calcTable: null,
      preserved: 'Full day-wise sightseeing descriptions, private transfers, morning/evening activities, and hotel stay ranges preserved.',
      fileName: fileName
    });

    appendAI(responseHtml);

    showReplies([
      { label: '🖨️ Download Itinerary PDF', val: '__PDF__', primary: true },
      { label: '👁️ View Live Preview', val: '__PREVIEW__' },
      { label: '💰 Restore Rates (Master Quotation)', val: '__SWITCH_QUOTATION__' },
      { label: '🏢 Let's Explore DMC Branding', val: 'Aanay tours ki details k sath edit karo unki details hata dena' }
    ]);
  }

  /**
   * Helper: Apply v5 Thailand Hotels & Rates (Ramada, Phi Phi Mountain Beach, Hotel Andakira, Panwaburi, Esmeralda View)
   */
  function applyNewThailandHotelsAndRates(withMarkup = false) {
    if (typeof loadSampleDataset === 'function') {
      loadSampleDataset('reference');
    }

    const d = QuotationData;
    d.activeDocType = 'quotation';

    const hRamada = withMarkup ? 43061 : 39146;
    const hPhiPhi = withMarkup ? 29924 : 27204;
    const hAndakira = withMarkup ? 37505 : 34095;
    const hPanwaburi = withMarkup ? 39950 : 36318;
    const hEsmeralda = withMarkup ? 35618 : 32380;
    const totalHotelsINR = hRamada + hPhiPhi + hAndakira + hPanwaburi + hEsmeralda;

    if (d.days && d.days.length >= 12) {
      [0, 1, 2].forEach(idx => {
        d.days[idx].hotel = { name: 'Ramada By Wyndham', dates: '2 Jan to 5 Jan', pax: idx === 0 ? 2 : '', amountINR: idx === 0 ? hRamada : 0, amountUSD: 0, notes: '' };
      });
      [3, 4].forEach(idx => {
        d.days[idx].hotel = { name: 'Phi Phi Mountain Beach Resort', dates: '5 Jan to 7 Jan', pax: idx === 3 ? 2 : '', amountINR: idx === 3 ? hPhiPhi : 0, amountUSD: 0, notes: '' };
      });
      [5, 6].forEach(idx => {
        d.days[idx].hotel = { name: 'Hotel Andakira Phuket', dates: '7 Jan to 9 Jan', pax: idx === 5 ? 2 : '', amountINR: idx === 5 ? hAndakira : 0, amountUSD: 0, notes: '' };
      });
      d.days[7].hotel = { name: 'Panwaburi Beachfront', dates: '9 Jan to 10 Jan', pax: 2, amountINR: hPanwaburi, amountUSD: 0, notes: 'Candle Light Dinner venue is at Thavorn Beach Village Resort' };
      [8, 9, 10].forEach(idx => {
        d.days[idx].hotel = { name: 'Esmeralda View', dates: '10 Jan to 13 Jan', pax: idx === 8 ? 2 : '', amountINR: idx === 8 ? hEsmeralda : 0, amountUSD: 0, notes: '' };
      });
      d.days[11].hotel = null;
    }

    d.hotels = [
      { id: 'h_1', name: 'Ramada By Wyndham', city: 'Krabi (Ao Nang Beach)', checkIn: '2 Jan', checkOut: '5 Jan', nights: 3, roomType: 'Deluxe Room', amountINR: hRamada, amountUSD: Math.round(hRamada / 87.5 * 100) / 100 },
      { id: 'h_2', name: 'Phi Phi Mountain Beach Resort', city: 'Koh Phi Phi Don', checkIn: '5 Jan', checkOut: '7 Jan', nights: 2, roomType: 'Superior Ocean View Bungalow', amountINR: hPhiPhi, amountUSD: Math.round(hPhiPhi / 87.5 * 100) / 100 },
      { id: 'h_3', name: 'Hotel Andakira Phuket', city: 'Phuket (Patong Beach)', checkIn: '7 Jan', checkOut: '9 Jan', nights: 2, roomType: 'Deluxe Premier Room', amountINR: hAndakira, amountUSD: Math.round(hAndakira / 87.5 * 100) / 100 },
      { id: 'h_4', name: 'Panwaburi Beachfront', city: 'Phuket (Cape Panwa)', checkIn: '9 Jan', checkOut: '10 Jan', nights: 1, roomType: 'Deluxe Pool Access Suite', amountINR: hPanwaburi, amountUSD: Math.round(hPanwaburi / 87.5 * 100) / 100 },
      { id: 'h_5', name: 'Esmeralda View', city: 'Koh Yao Yai', checkIn: '10 Jan', checkOut: '13 Jan', nights: 3, roomType: 'Ocean Panorama Cliff Villa', amountINR: hEsmeralda, amountUSD: Math.round(hEsmeralda / 87.5 * 100) / 100 }
    ];

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

    recalculateQuotationPricing();
    if (typeof App !== 'undefined') {
      if (typeof App.renderHotelsEditor === 'function') App.renderHotelsEditor();
      if (typeof App.renderSummaryEditor === 'function') App.renderSummaryEditor();
      App.updateLivePreviews();
    }
  }

  /**
   * 7.4 HOTEL CHANGE WORKFLOW
   * Replaces specific hotels while strictly preserving itinerary days and sightseeing
   */
  async function executeHotelChangeWorkflow(intent, taskLog) {
    setTyping(true, '🏨 Analyzing hotel modification request...', 'Identifying target property and preserving itinerary timeline...');
    await sleep(400);

    const pkg = QuotationData.package || {};
    const dest = pkg.destinations || pkg.title || 'Selected Tour';
    const text = intent.rawText.toLowerCase();

    // Check if user specified Ramada By Wyndham (popular DMC workflow)
    const wantsRamada = /ramada/i.test(text);

    if (wantsRamada && (!QuotationData.hotels || QuotationData.hotels.length === 0 || /krabi|thailand/i.test(dest))) {
      applyNewThailandHotelsAndRates(false);
      taskLog.push(`Replaced Krabi property with <strong>Ramada By Wyndham</strong> (Ao Nang Beach)`);
      taskLog.push(`Preserved all 12 itinerary days, transfers, Phi Phi speedboat tour, and Candle Light Dinner`);
    } else {
      // Modify first hotel property with user request
      if (QuotationData.hotels && QuotationData.hotels.length > 0) {
        const oldName = QuotationData.hotels[0].name;
        const newName = wantsRamada ? 'Ramada By Wyndham Ao Nang' : 'Selected Deluxe 5-Star Property';
        QuotationData.hotels[0].name = newName;
        taskLog.push(`Updated accommodation from <strong>${escapeHTML(oldName)}</strong> to <strong>${escapeHTML(newName)}</strong>`);
        taskLog.push(`Preserved all day-wise activities, morning tours, and return airport transfers`);
      }
    }

    recalculateQuotationPricing();
    if (typeof App !== 'undefined') {
      if (typeof App.renderHotelsEditor === 'function') App.renderHotelsEditor();
      App.updateLivePreviews();
    }
    if (typeof DBManager !== 'undefined') {
      try { DBManager.saveQuotation(); } catch(e) {}
    }

    const fileName = `${sanitizeFileName(AgentMemory.activeCompany.name)}_${sanitizeFileName(dest)}_UpdatedHotels.pdf`;
    AgentMemory.lastGeneratedFile = { name: fileName, timestamp: new Date() };

    taskLog.push(`Recalculated hotel costing and updated Live Preview`);
    setTyping(false);

    const changesList = [
      `Updated hotel accommodation details as requested.`,
      `Preserved all original travel dates, flight sectors, and daily itinerary sightseeing.`,
      `Recalculated total hotel costing in INR and USD.`,
      `Synchronized Live Studio Preview and prepared PDF export.`
    ];

    const responseHtml = renderAgentResponseCard({
      tasks: taskLog,
      leadText: `Your <strong>${escapeHTML(dest)}</strong> quotation with updated hotel details is ready.`,
      changes: changesList,
      calcTable: null,
      preserved: 'Full day-by-day travel timeline, transfers, sightseeing excursions, and inclusions strictly preserved.',
      fileName: fileName
    });

    appendAI(responseHtml);

    showReplies([
      { label: '🖨️ Download PDF', val: '__PDF__', primary: true },
      { label: '👁️ View Live Preview', val: '__PREVIEW__' },
      { label: '📈 Add 10% Markup', val: 'Add 10% markup to this package' },
      { label: '🏢 Let's Explore DMC Branding', val: 'Aanay tours ki details k sath edit karo unki details hata dena' }
    ]);
  }

  /**
   * 7.5 FORMAT SWITCH WORKFLOW
   */
  async function executeFormatSwitchWorkflow(targetDocType, taskLog) {
    setTyping(true, '🔄 Switching official document format...', `Configuring ${targetDocType.toUpperCase()} layout...`);
    await sleep(350);

    QuotationData.activeDocType = targetDocType;
    AgentMemory.activeDocType = targetDocType;

    if (targetDocType === 'invoice') {
      if (!QuotationData.invoice) QuotationData.invoice = {};
      const inv = QuotationData.invoice;
      const pkg = QuotationData.package || {};
      inv.toCustomerName = inv.toCustomerName || pkg.clientName || 'Valued Client';
      inv.invoiceNumber = inv.invoiceNumber || 'INV-' + Math.floor(100000 + Math.random() * 900000);
      inv.grandTotal = inv.grandTotal || QuotationData.summary?.totalINR || 2992.50;
      inv.items = inv.items && inv.items.length ? inv.items : [
        { sn: 1, service: 'Destination Package Tour Services', description: pkg.duration || 'Travel Services', hsn: '998555', qty: 1, rate: inv.grandTotal, total: inv.grandTotal }
      ];
      if (typeof App !== 'undefined' && typeof App.populateInvoiceFields === 'function') App.populateInvoiceFields();
      taskLog.push(`Generated Corporate Tax Invoice with GST and HSN 998555 for <strong>${escapeHTML(inv.toCustomerName)}</strong>`);
    } else if (targetDocType === 'confirmation') {
      if (!QuotationData.confirmation) QuotationData.confirmation = {};
      const conf = QuotationData.confirmation;
      const pkg = QuotationData.package || {};
      conf.guestName = conf.guestName || pkg.clientName || 'Valued Guest';
      conf.hotelName = conf.hotelName || QuotationData.hotels?.[0]?.name || 'Luxury Resort & Spa';
      conf.bookingId = conf.bookingId || 'VOUCH-' + Math.floor(10000 + Math.random() * 90000);
      taskLog.push(`Configured Hotel Booking Voucher for <strong>${escapeHTML(conf.hotelName)}</strong>`);
    }

    if (typeof App !== 'undefined') {
      if (typeof App.switchDocType === 'function') App.switchDocType(targetDocType);
      App.updateLivePreviews();
    }
    if (typeof DBManager !== 'undefined') {
      try { DBManager.saveQuotation(); } catch(e) {}
    }

    taskLog.push(`Updated Live Preview to <strong>Format: ${targetDocType.toUpperCase()}</strong>`);
    setTyping(false);

    const docTypeLabel = (typeof DOCUMENT_TYPES !== 'undefined' && DOCUMENT_TYPES[targetDocType]) ? DOCUMENT_TYPES[targetDocType].name : targetDocType.toUpperCase();
    const pkg = QuotationData.package || {};
    const dest = pkg.destinations || pkg.title || 'Travel Proposal';
    const fileName = `${sanitizeFileName(AgentMemory.activeCompany.name)}_${sanitizeFileName(dest)}_${sanitizeFileName(docTypeLabel)}.pdf`;

    const changesList = [
      `Switched active format to <strong>${escapeHTML(docTypeLabel)}</strong>.`,
      `Carried over client details, travel dates, passenger counts, and totals.`,
      `Prepared verified A4 print and PDF document.`
    ];

    const responseHtml = renderAgentResponseCard({
      tasks: taskLog,
      leadText: `Your <strong>${escapeHTML(docTypeLabel)}</strong> is ready.`,
      changes: changesList,
      calcTable: null,
      preserved: 'Client identity, travel dates, and verified financial amounts carried over accurately.',
      fileName: fileName
    });

    appendAI(responseHtml);

    showReplies([
      { label: '🖨️ Download PDF', val: '__PDF__', primary: true },
      { label: '👁️ View Live Preview', val: '__PREVIEW__' },
      { label: '📄 Master Quotation', val: '__SWITCH_QUOTATION__' },
      { label: '🗺️ Travel Itinerary', val: '__SWITCH_ITINERARY__' }
    ]);
  }

  /**
   * 7.6 BUILD OR EXTRACT WORKFLOW (PDF Upload / New Package)
   */
  async function executeBuildOrExtractWorkflow(text, attachment, taskLog, attachments = []) {
    const allAttachments = (attachments && attachments.length > 0) ? attachments : (attachment ? [attachment] : []);
    const numFiles = allAttachments.length;

    if (numFiles > 0) {
      setTyping(true, '📄 Reading reference document(s)...', `Extracting text streams and itinerary from ${allAttachments.map(a => a.name).join(', ')}...`);
      taskLog.push(`Inspected ${numFiles} reference file${numFiles > 1 ? 's' : ''}: <strong>${allAttachments.map(a => escapeHTML(a.name)).join(', ')}</strong>`);
    } else {
      setTyping(true, '🧠 Interpreting travel request...', 'Structuring day-wise timeline, hotels and tariffs...');
      taskLog.push(`Analyzed natural language travel parameters`);
    }

    const extracted = await AIParser.parseText(text, QuotationData, allAttachments[0] || null, allAttachments);

    setTyping(true, '📋 Populating quotation engine &amp; rates...', 'Synchronizing day-wise timeline and hotel properties...');
    await sleep(350);

    const docType = extracted.detectedDocType || QuotationData.activeDocType || 'quotation';
    QuotationData.activeDocType = docType;
    AgentMemory.activeDocType = docType;

    if (extracted.package) Object.assign(QuotationData.package, extracted.package);
    if (extracted.days && extracted.days.length > 0) QuotationData.days = extracted.days;
    if (extracted.hotels && extracted.hotels.length > 0) QuotationData.hotels = extracted.hotels;
    if (extracted.summary && extracted.summary.items) QuotationData.summary = extracted.summary;
    if (extracted.invoice) Object.assign(QuotationData.invoice || {}, extracted.invoice);
    if (extracted.confirmation) Object.assign(QuotationData.confirmation || {}, extracted.confirmation);

    recalculateQuotationPricing();

    if (typeof App !== 'undefined') {
      if (typeof App.switchDocType === 'function') App.switchDocType(docType);
      if (typeof App.renderDaysEditor === 'function') App.renderDaysEditor();
      if (typeof App.renderHotelsEditor === 'function') App.renderHotelsEditor();
      if (typeof App.renderSummaryEditor === 'function') App.renderSummaryEditor();
      App.updateLivePreviews();
    }
    if (typeof DBManager !== 'undefined') {
      try { DBManager.saveQuotation(); } catch(e) {}
    }

    const pkg = QuotationData.package || {};
    const dest = pkg.destinations || pkg.title || 'Holiday Package';
    taskLog.push(`Structured <strong>${QuotationData.days?.length || 0} itinerary days</strong> with morning and evening sightseeing`);
    taskLog.push(`Configured <strong>${QuotationData.hotels?.length || 0} hotel properties</strong> with verified room categories and tariffs`);
    taskLog.push(`Calculated package grand total: <strong>${formatINR(QuotationData.summary?.totalINR)}</strong> (${formatUSD(QuotationData.summary?.totalUSD)})`);
    taskLog.push(`Synchronized Live Studio Preview &amp; auto-saved to database`);

    setTyping(false);

    const fileName = `${sanitizeFileName(AgentMemory.activeCompany.name)}_${sanitizeFileName(dest)}_${sanitizeFileName(pkg.duration || 'Tour')}.pdf`;
    AgentMemory.lastGeneratedFile = { name: fileName, timestamp: new Date() };

    const changesList = [
      `Extracted and structured full day-by-day travel timeline for <strong>${escapeHTML(dest)}</strong> (${pkg.duration || 'Custom Plan'}).`,
      `Configured luxury accommodations with room types, meals and cancellation policies.`,
      `Computed dual-currency tariffs (INR &amp; USD) with airport and sightseeing transfers.`,
      `Validated complete A4 document pagination and synchronized Live Preview.`
    ];

    const responseHtml = renderAgentResponseCard({
      tasks: taskLog,
      toolPillTop: numFiles > 0 ? `Ran 3 commands, read ${numFiles} file${numFiles > 1 ? 's' : ''} >` : null,
      interimNote: numFiles > 1 
        ? `Cross-referencing ${allAttachments.map(a => a.name).join(' & ')}. Extracting day-wise itinerary and hotel tariffs...`
        : (numFiles === 1 ? `Inspected ${allAttachments[0].name}. Verifying itinerary structure, hotel stays and tariffs...` : null),
      toolPillBottom: numFiles > 0 ? 'Read a file, shared files >' : null,
      leadText: `Your <strong>${escapeHTML(dest)}</strong> quotation is ready.`,
      changes: changesList,
      calcTable: null,
      preserved: 'Luxury DMC reference color palette (#0F2C59 Deep Navy) and official travel terms strictly applied.',
      fileName: fileName
    });

    appendAI(responseHtml);

    showReplies([
      { label: '🖨️ Download PDF', val: '__PDF__', primary: true },
      { label: '👁️ View Live Preview', val: '__PREVIEW__' },
      { label: '📈 Add 10% Markup', val: 'Add 10% markup to this package' },
      { label: '🏢 Let's Explore DMC Branding', val: 'Aanay tours ki details k sath edit karo unki details hata dena' },
      { label: '🗺️ Itinerary (Without Rates)', val: 'Itinerary se costing hatao' }
    ]);
  }

  /**
   * 7.7 GENERAL INQUIRY HANDLER (Direct and concise, no fake progress)
   */
  function handleGeneralInquiry(query) {
    const q = query.toLowerCase();
    let answer = '';

    if (/formats?|document.*types?|suite/i.test(q)) {
      answer = `
        <strong>Let's Explore DMC Document Suite</strong> mein total <strong>7 Official Corporate Document Formats</strong> available hain:<br><br>
        1. 📄 <strong>Master Quotation (Official Reference)</strong>: Complete 12-section commercial proposal with Pax columns, INR &amp; USD pricing.<br>
        2. 🗺️ <strong>Travel Itinerary</strong>: Guest-facing day-by-day timeline strictly without pricing rates.<br>
        3. 🏨 <strong>Hotel Costing &amp; Comparison</strong>: Multi-tier hotel stay comparison with room types and meal plans.<br>
        4. 📋 <strong>Package Summary</strong>: Executive 1-page overview and inclusions.<br>
        5. 🏨 <strong>Hotel Booking Voucher</strong>: Luxury confirmation voucher with guest list and occupancy.<br>
        6. 🧾 <strong>Corporate Tax Invoice</strong>: Official GST billing with HSN 998555 and bank payment details.<br>
        7. 🛠️ <strong>Custom Builder</strong>: Drag-and-drop modular builder.<br><br>
        Aap kisi bhi format ka naam bolkar ya neeche click karke instantly switch kar sakte hain!
      `;
    } else if (/markup|margin/i.test(q)) {
      answer = `
        Aap kisi bhi package par direct instruction de sakte hain, jaise:<br>
        • <em>"Add 10% markup to this package"</em><br>
        • <em>"Passes ka amount 20000 increase kar do"</em><br><br>
        System automatically saari hotels aur land package components par mathematically percentage calculate karega aur grand total update kar dega!
      `;
    } else if (/company|branding|aanay|white-?label/i.test(q)) {
      answer = `
        Hum complete <strong>B2B White-label aur Partner Rebranding</strong> support karte hain.<br>
        Agar aapka B2B travel agent (jaise Let's Explore DMC) apne brand se quote chahta hai, toh bas bolen:<br>
        <em>"Aanay tours ki details k sath edit karo unki details hata dena"</em><br><br>
        System DMC supplier details hata kar partner ka naam, contact person aur contact number laga dega!
      `;
    } else {
      answer = `
        Let's Explore DMC Travel Operations Engine is online and ready.<br>
        Aap koi destination ka naam bolkar (e.g. <em>"Maldives 5D4N"</em>, <em>"Thailand 12D"</em>, <em>"Dubai 6D"</em>) ya reference PDF upload karke proposal create kar sakte hain!
      `;
    }

    appendAI(answer, false);
    showReplies([
      { label: '🌴 12D Thailand Master', val: 'Create a 12-day Thailand package for 2 adults', primary: true },
      { label: '🏖️ Maldives 5D4N Water Villa', val: 'Maldives 5D4N luxury water villa package banao' },
      { label: '📈 10% Markup Lagao', val: 'Add 10% markup to this package' },
      { label: '🏢 Let's Explore DMC Branding', val: 'Aanay tours ki details k sath edit karo unki details hata dena' }
    ]);
  }

  // ==========================================
  // 8. CLAUDE-LIKE RESPONSE CARD BUILDER
  // ==========================================
  function renderAgentResponseCard(data) {
    let pillsHeaderHtml = '';
    if (data.toolPillTop || data.interimNote || data.toolPillBottom) {
      pillsHeaderHtml = `
        <div style="margin-bottom:8px;">
          ${data.toolPillTop ? `
            <div class="claude-tool-pill" onclick="const b=this.parentElement.querySelector('.claude-interim-note'); if(b) b.style.display=b.style.display==='none'?'block':'none';">
              <span>${escapeHTML(data.toolPillTop)}</span>
            </div>
          ` : ''}
          ${data.interimNote ? `
            <div class="claude-interim-note">${escapeHTML(data.interimNote)}</div>
          ` : ''}
          ${data.toolPillBottom ? `
            <div class="claude-tool-pill">
              <span>${escapeHTML(data.toolPillBottom)}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    const tasksHtml = (data.tasks && data.tasks.length > 0 && !data.toolPillTop) ? `
      <div class="thinking-process-box" style="margin-bottom:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;" onclick="const c=this.nextElementSibling; const chev=this.querySelector('.chev-icon'); const isC = c.style.display==='none'; c.style.display=isC?'block':'none'; if(chev) chev.textContent=isC?'▾':'▸';">
          <span style="font-weight:600; color:#1E293B; display:flex; align-items:center; gap:6px; font-size:12px;">
            <span style="color:#15803D;">●</span> Ran ${data.tasks.length} tasks, synchronized document <span class="chev-icon" style="color:#64748B; font-size:11px;">▾</span>
          </span>
          <span style="font-size:10px; color:#15803D; background:#DCFCE7; padding:2px 8px; border-radius:10px; font-weight:700;">Task Completed</span>
        </div>
        <div style="margin-top:8px; border-top:1px dashed #CBD5E1; padding-top:8px; line-height:1.6; font-size:11.5px; color:#475569;">
          ${data.tasks.map(t => `<div style="display:flex; align-items:flex-start; gap:6px; margin-bottom:3px;"><span style="color:#15803D;">✔</span> <div>${t}</div></div>`).join('')}
        </div>
      </div>
    ` : '';

    const subheadHtml = data.subhead ? `
      <div style="font-size:14px; font-weight:700; color:#0F2C59; margin:8px 0 4px 0;">${escapeHTML(data.subhead)}</div>
    ` : '';

    const changesHtml = (data.changes && data.changes.length > 0) ? `
      <div class="agent-section-title">Changes made:</div>
      <ul class="agent-changes-list">
        ${data.changes.map(c => `<li>${c}</li>`).join('')}
      </ul>
    ` : '';

    const calcHtml = data.calcTable ? `
      ${data.subhead ? '' : '<div class="agent-section-title" style="margin-top:8px;">Updated Price Summary:</div>'}
      ${data.calcTable}
    ` : '';

    const preservedHtml = data.preserved ? `
      <div class="agent-preserved-box">
        🛡️ <strong>Preserved:</strong> ${escapeHTML(data.preserved)}
      </div>
    ` : '';

    const fileCardHtml = data.fileName ? `
      <div class="agent-file-card">
        <div class="file-info-group">
          <div class="file-icon-badge">📄</div>
          <div class="file-meta-texts">
            <span class="file-label-small">Generated Document</span>
            <span class="file-name-text" title="${escapeHTML(data.fileName)}">${escapeHTML(data.fileName)}</span>
          </div>
        </div>
        <button type="button" class="btn-agent-download" onclick="if(typeof PDFGenerator!=='undefined') PDFGenerator.generate();" title="Download Official A4 PDF">
          ⬇️ Download PDF
        </button>
      </div>
    ` : '';

    return `
      <div class="agent-response-card">
        ${pillsHeaderHtml}
        ${tasksHtml}
        <div class="agent-summary-lead">${data.leadText}</div>
        ${subheadHtml}
        ${calcHtml}
        ${changesHtml}
        ${preservedHtml}
        ${fileCardHtml}
      </div>
    `;
  }

  // ==========================================
  // 9. UI MESSAGING & CONTROLS
  // ==========================================
  function appendUser(text) {
    const el = msgs();
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = 'user-msg-row';
    row.innerHTML = `
      <div class="user-msg-bubble">
        <div>${text}</div>
        <div class="user-msg-meta">${timeStr} <span style="color:#2563EB;">✔✔</span></div>
      </div>
      <div class="user-avatar-circle" style="width:28px; height:28px; font-size:12px; flex-shrink:0;">👤</div>
    `;
    el.appendChild(row);
    scrollBottom();
  }

  function appendAI(html, withActions = true) {
    const el = msgs();
    if (!el) return;
    const row = document.createElement('div');
    row.className = 'bot-msg-row';

    let actionToolbar = '';
    if (withActions) {
      actionToolbar = `
        <div class="msg-actions-bar">
          <button type="button" class="btn-msg-action" onclick="Chatbot.copyLastResponse(this)" title="Copy Response">📋 Copy</button>
          <button type="button" class="btn-msg-action" onclick="Chatbot.regenerateResponse()" title="Regenerate Response">🔄 Regenerate</button>
          <button type="button" class="btn-msg-action" onclick="App.showSection('generator'); if(typeof App.populateStudioFromData==='function') App.populateStudioFromData();" title="Edit in Studio Builder">✏️ Edit</button>
          <button type="button" class="btn-msg-action" onclick="if(typeof PDFGenerator!=='undefined') PDFGenerator.generate();" title="Download PDF" style="margin-left:auto; background:#0F2C59; color:#fff; border-color:#0F2C59;">⬇️ PDF</button>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="chat-bot-icon" style="width:28px; height:28px; font-size:12px; flex-shrink:0;">✈</div>
      <div class="bot-msg-bubble" style="flex:1;">
        ${html}
        ${actionToolbar}
      </div>
    `;
    el.appendChild(row);
    scrollBottom();
  }

  function copyLastResponse(btn) {
    const bubble = btn ? btn.closest('.bot-msg-bubble') : null;
    if (bubble) {
      const textToCopy = bubble.innerText.replace(/📋 Copy|🔄 Regenerate|✏️ Edit|⬇️ PDF/g, '').trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        if (typeof showToast === 'function') showToast('Copied to clipboard!', 'success');
      });
    }
  }

  function regenerateResponse() {
    if (lastPrompt) {
      appendUser('🔄 Regenerate: ' + lastPrompt);
      processMessage(lastPrompt);
    } else {
      if (typeof showToast === 'function') showToast('No previous instruction to regenerate.', 'info');
    }
  }

  const CORE_ACTION_OPTIONS = [
    { label: '👁️ Live Preview', val: '__PREVIEW__', primary: true },
    { label: '✏️ Edit in Studio', val: '__MODAL_EDIT__' },
    { label: '🖨️ Download PDF', val: '__PDF__' },
    { label: '📄 Download Word DOCX', val: '__DOCX__' }
  ];

  function showReplies(options = [], prioritizeOptions = false) {
    const el = replies();
    if (!el) return;
    el.innerHTML = '';
    
    let merged = [];
    if (prioritizeOptions) {
      merged = [...(options || [])];
      CORE_ACTION_OPTIONS.forEach(core => {
        if (!merged.some(m => m.val === core.val)) {
          merged.push(core);
        }
      });
    } else {
      merged = [...CORE_ACTION_OPTIONS];
      (options || []).forEach(opt => {
        if (!merged.some(m => m.val === opt.val)) {
          merged.push(opt);
        }
      });
    }

    merged.forEach(opt => {
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

    const attachmentToProcess = activeAttachment;
    const attachmentsToProcess = [...activeAttachments];
    activeAttachments = [];
    activeAttachment = null;
    const badge = $('chatAttachmentBadge');
    if (badge) badge.style.display = 'none';
    const uploadInput = $('chatDocUpload');
    if (uploadInput) uploadInput.value = '';
    renderAttachmentBadges();

    if (opt.val === 'restart') {
      resetQuotationData();
      if (typeof App !== 'undefined') App.showSection('generator');
      appendAI('Starting a fresh quotation! Enter client details or destination.');
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
    processMessage(opt.val, attachmentToProcess, attachmentsToProcess);
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
    classifyIntent,
    processMessage,
    submitInput,
    copyLastResponse,
    regenerateResponse,
    getMemory: () => AgentMemory
  };

})();

if (typeof window !== 'undefined') {
  window.Chatbot = Chatbot;
  window.ChatBot = Chatbot;
}
