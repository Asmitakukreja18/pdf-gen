/**
 * preview.js — Multi-Format Document Renderer for Let's Explore DMC
 * Supports 7 distinct professional document formats while maintaining consistent brand identity:
 * 1. ITINERARY: Day-by-day travel experience, transfers, sightseeing, leisure, meals & hotels.
 * 2. QUOTATION: Pricing-focused structured service table, itemized costs, discounts & totals.
 * 3. HOTEL COSTING: Dedicated hotel comparison with room types, meal plans, and tariff options.
 * 4. PACKAGE SUMMARY: Compact executive overview, cost breakdown, inclusions & exclusions.
 * 5. TRAVEL CONFIRMATION: Official booking voucher with confirmed hotels, tours, emergency contacts.
 * 6. INVOICE / BILLING: Corporate Tax Invoice with Bill To, GST, bank details, and authorization.
 * 7. CUSTOM DOCUMENT: User-assembled dynamic sections (Text, Table, Hotel, Activity, Terms, etc.)
 */

const Preview = (() => {

  /**
   * Main render function called by UI to update the live preview
   */
  function render(data = QuotationData, targetContainer = null) {
    const container = targetContainer || document.getElementById('previewDocument') || document.getElementById('documentContent') || document.getElementById('previewDocumentLive');
    if (!container) return;

    try {
      recalculateQuotationPricing();
    } catch (e) { }

    // Generate HTML for the active document type
    const docData = data || QuotationData;
    container.innerHTML = buildQuotationHTML(docData, false);
  }

  /**
   * Builds the complete HTML document string based on activeDocType.
   * Shared by both the screen preview and the print/PDF generator for 100% parity.
   * @param {Object} data - QuotationData instance
   * @param {boolean} isForPrint - Flag if rendering inside standalone print window
   */
  function buildQuotationHTML(data = QuotationData, isForPrint = false) {
    const docType = data.activeDocType || 'quotation';
    const pkg = data.package || {};

    if (docType === 'villa_nautica_dining' || docType === 'dining_menu' || pkg.isVillaNauticaDining || data.diningPackages) {
      return renderDiningMenuDocument(data, isForPrint);
    }

    if (docType === 'rajasthan_land_package' || pkg.isRajasthanFormat || (pkg.destinations && pkg.destinations.toLowerCase().includes('phuket') && (pkg.ratePerAdultUSD || pkg.destinations.toLowerCase().includes('krabi')))) {
      return renderRajasthanLandPackageDocument(data, isForPrint);
    }

    switch (docType) {
      case 'dining_menu':
      case 'villa_nautica_dining':
        return renderDiningMenuDocument(data, isForPrint);
      case 'itinerary':
        return renderItineraryDocument(data, isForPrint);
      case 'hotel_costing':
        return renderHotelCostingDocument(data, isForPrint);
      case 'summary':
        return renderPackageSummaryDocument(data, isForPrint);
      case 'confirmation':
        return renderTravelConfirmationDocument(data, isForPrint);
      case 'invoice':
        return renderInvoiceDocument(data, isForPrint);
      case 'custom':
        return renderCustomDocument(data, isForPrint);
      case 'quotation':
      default:
        return renderQuotationDocument(data, isForPrint);
    }
  }

  /**
   * Generates shared dynamic CSS theme variables
   */
  function getThemeStyles(theme = {}) {
    return `
      --dmc-primary: ${theme.primaryColor || '#0F2C59'};
      --dmc-secondary: ${theme.secondaryColor || '#1E3A8A'};
      --dmc-accent: ${theme.accentColor || '#2563EB'};
      --dmc-text: ${theme.textColor || '#1E293B'};
      --dmc-muted: ${theme.mutedColor || '#64748B'};
      --dmc-border: ${theme.borderColor || '#CBD5E1'};
      --dmc-table-bg: ${theme.tableHeaderBg || '#0F2C59'};
      --dmc-table-text: ${theme.tableHeaderText || '#FFFFFF'};
      --dmc-bg-light: #F8FAFC;
    `;
  }

  /**
   * Shared continuous page footer matching reference PDF
   */
  function renderContinuousFooter(footer = {}, compOverride = null) {
    const comp = compOverride || (footer && footer.company) || ((typeof QuotationData !== 'undefined' && QuotationData.company) ? QuotationData.company : {});
    const compName = comp.name || footer.companyName || "Let's Explore DMC";
    const isAanay = /aanay/i.test(compName);

    if (isAanay) {
      const compPhone = comp.phone || footer.phones || '+91 7708123187';
      return `
        <footer class="dmc-footer aanay-footer">
          <div class="dmc-footer-content">
            <span class="footer-company">${escapeHTML(compName)}</span>
            <span class="footer-sep">|</span>
            <span class="footer-phone">${escapeHTML(compPhone)}</span>
            <span class="footer-sep">|</span>
            <span class="footer-page-num">Official Quotation Document</span>
          </div>
        </footer>
      `;
    }

    const compPhone = comp.phone || footer.phones || '+91 80075 86881 | +91 95459 55966';
    const compWeb = comp.website || footer.website || (comp.isWhitelabel ? '' : 'www.letsexploredmc.com');
    const compSocial = comp.social || footer.instagram || (comp.isWhitelabel ? '' : '@lets_exploredmc');

    return `
      <footer class="dmc-footer">
        <div class="dmc-footer-content">
          <span class="footer-company">${escapeHTML(compName)}</span>
          ${compPhone ? `<span class="footer-sep">|</span><span class="footer-phone">${escapeHTML(compPhone)}</span>` : ''}
          ${compWeb ? `<span class="footer-sep">|</span><span class="footer-web">${escapeHTML(compWeb)}</span>` : ''}
          ${compSocial ? `<span class="footer-sep">|</span><span class="footer-social">${escapeHTML(compSocial)}</span>` : ''}
          <span class="footer-sep">|</span>
          <span class="footer-page-num">Official Travel Document</span>
        </div>
      </footer>
    `;
  }

  /**
   * Helper: Check if package is a domestic Indian itinerary
   */
  function isDomesticTrip(pkg = {}) {
    const text = ((pkg.country || '') + ' ' + (pkg.destination || '') + ' ' + (pkg.destinations || '') + ' ' + (pkg.title || '') + ' ' + (pkg.packageTitle || '')).toLowerCase();
    const domesticKeywords = ['india', 'kerala', 'munnar', 'thekkady', 'alleppey', 'goa', 'rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'kashmir', 'srinagar', 'gulmarg', 'leh', 'ladakh', 'himachal', 'manali', 'shimla', 'uttarakhand', 'rishikesh', 'haridwar', 'andaman', 'port blair', 'havelock', 'golden triangle', 'agra', 'delhi', 'varanasi', 'ujjain'];
    return domesticKeywords.some(kw => text.includes(kw));
  }

  /**
   * Helper: Get appropriate default pickup hub based on destination
   */
  function getDefaultPickupHub(pkg = {}) {
    const text = ((pkg.country || '') + ' ' + (pkg.destination || '') + ' ' + (pkg.destinations || '') + ' ' + (pkg.title || '') + ' ' + (pkg.packageTitle || '')).toLowerCase();
    const isThaiDest = /thailand|phuket|krabi|bangkok|pattaya|samui/i.test(text);
    if (pkg.pickupFrom && (!/phuket|krabi/i.test(pkg.pickupFrom) || isThaiDest)) {
      return pkg.pickupFrom;
    }
    if (text.includes('turkey') || text.includes('istanbul')) return 'Istanbul New Airport (IST) / Sabiha Gökçen (SAW)';
    if (text.includes('cappadocia')) return 'Kayseri (ASR) / Nevşehir (NAV) Airport';
    if (text.includes('switzerland') || text.includes('zurich')) return 'Zurich Airport (ZRH) / Train Station';
    if (text.includes('kerala') || text.includes('munnar') || text.includes('alleppey')) return 'Cochin International Airport (COK) / Railway Station';
    if (text.includes('goa')) return 'Goa Dabolim / Mopa Airport';
    if (text.includes('kashmir') || text.includes('srinagar')) return 'Srinagar International Airport (SXR)';
    if (text.includes('rajasthan') || text.includes('jaipur')) return 'Jaipur Airport / Railway Station';
    if (text.includes('andaman')) return 'Port Blair Airport (IXZ)';
    if (text.includes('bali')) return 'Ngurah Rai Airport (DPS), Bali';
    if (text.includes('dubai') || text.includes('uae')) return 'Dubai International Airport (DXB)';
    if (text.includes('singapore')) return 'Changi Airport Singapore (SIN)';
    if (text.includes('maldives')) return 'Velana International Airport, Malé (MLE)';
    if (text.includes('vietnam') || text.includes('hanoi')) return 'Noi Bai International Airport (HAN), Hanoi';
    if (text.includes('da nang')) return 'Da Nang International Airport (DAD)';
    if (text.includes('japan') || text.includes('tokyo')) return 'Tokyo Haneda (HND) / Narita (NRT) Airport';
    if (text.includes('united kingdom') || text.includes('london')) return 'London Heathrow Airport (LHR)';
    if (text.includes('france') || text.includes('paris')) return 'Paris Charles de Gaulle Airport (CDG)';
    if (text.includes('thailand') || text.includes('phuket') || text.includes('krabi') || text.includes('bangkok') || text.includes('pattaya')) return 'Phuket / Krabi Airport';
    if (text.includes('india')) return 'Local Airport / Railway Station';
    return pkg.pickupFrom || 'Destination International Airport';
  }

  /**
   * Shared Brand Header for official documents
   */
  function renderBrandHeader(pkg = {}, docTypeLabel = 'PACKAGE TOUR', quoteRef = '', compOverride = null) {
    const comp = compOverride || pkg.company || ((typeof QuotationData !== 'undefined' && QuotationData.company) ? QuotationData.company : {});
    const brandName = comp.name || "LET'S EXPLORE DMC";
    const isAanay = /aanay/i.test(brandName);

    const isDomestic = isDomesticTrip(pkg);
    const showForex = !isDomestic && (pkg.currency === 'USD' || pkg.showForex || (pkg.usdToInrRate && pkg.currency !== 'INR'));
    const pickupHub = getDefaultPickupHub(pkg);

    let brandDisplayHTML = '';
    if (isAanay) {
      brandDisplayHTML = `
        <div class="dmc-brand-box aanay-brand-box">
          <div style="line-height:1.0;">
            <div style="font-size:26px; font-weight:900; color:#0F2C59; letter-spacing:-0.5px;">Aanay</div>
            <div style="font-size:26px; font-weight:900; color:#F97316; letter-spacing:-0.5px;">Tours</div>
          </div>
        </div>
      `;
    } else {
      const brandTagline = comp.tagline || (comp.isWhitelabel ? '' : "Your Destination Management Specialist");
      const brandLogo = comp.logo || "images/logo.png";
      const showLogo = !comp.isWhitelabel || brandLogo !== 'images/logo.png';
      brandDisplayHTML = `
        <div class="dmc-brand-box">
          ${showLogo ? `<img src="${escapeHTML(brandLogo)}" alt="${escapeHTML(brandName)}" class="dmc-brand-logo" onerror="this.style.display='none'" />` : ''}
          <div class="dmc-brand-info">
            <span class="dmc-brand-name">${escapeHTML(brandName)}</span>
            ${brandTagline ? `<span class="dmc-brand-tagline">${escapeHTML(brandTagline)}</span>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <header class="dmc-header ${isAanay ? 'aanay-header' : ''}">
        <div class="dmc-header-top">
          ${brandDisplayHTML}
          <div class="dmc-quote-meta">
            ${isAanay ? `
              <div style="font-size:11px; font-weight:800; color:#0F2C59;">Aanay Tours</div>
              <div style="font-size:10.5px; color:#64748B;">Contact: <strong>${escapeHTML(comp.phone || '+91 7708123187')}</strong></div>
            ` : `
              <div class="meta-item"><span class="meta-label">Document Ref:</span> <strong>${escapeHTML(quoteRef || pkg.quoteRef || 'LE-DMC-REF')}</strong></div>
              <div class="meta-item"><span class="meta-label">Date:</span> <strong>${escapeHTML(pkg.preparedDate || '—')}</strong></div>
              ${showForex ? `<div class="meta-item"><span class="meta-label">Forex Ref:</span> <strong>1 USD = ${pkg.usdToInrRate || 87.5} INR</strong></div>` : ''}
            `}
          </div>
        </div>

        <div class="dmc-hero-banner">
          <div class="hero-label-badge" style="${isAanay ? 'color:#F97316; font-weight:800;' : ''}">${escapeHTML(docTypeLabel)}</div>
          <h1 class="hero-duration-title">${escapeHTML(pkg.duration || 'Bespoke Tour Package')}</h1>
          <div class="hero-destination-subtitle">${escapeHTML(pkg.destinations || pkg.destination || 'Bespoke Travel Package')}</div>
        </div>

        ${(pkg.clientName || pkg.clientContact || pickupHub) ? `
        <div class="dmc-client-bar">
          ${pkg.clientName ? `<div class="client-bar-item"><span class="c-label">Prepared For:</span> <strong>${escapeHTML(pkg.clientName)}</strong></div>` : ''}
          ${pkg.clientContact ? `<div class="client-bar-item"><span class="c-label">Contact:</span> <strong>${escapeHTML(pkg.clientContact)}</strong></div>` : ''}
          ${pickupHub ? `<div class="client-bar-item"><span class="c-label">Pickup Hub:</span> <strong>${escapeHTML(pickupHub)}</strong></div>` : ''}
        </div>` : ''}
      </header>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. FORMAT: TRAVEL ITINERARY (EXPERIENCE & DAY-FOCUSED)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderItineraryDocument(data, isForPrint) {
    const pkg = data.package || {};
    const days = data.days || [];
    const customSections = data.customSections || [];
    const offices = data.offices || [];
    const footer = data.footerSettings || {};
    const comp = data.company || pkg.company || ((typeof QuotationData !== 'undefined' && QuotationData.company) ? QuotationData.company : {});
    const themeStyles = getThemeStyles(data.themeSettings);

    return `
      <div class="dmc-quotation-doc doc-itinerary-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, 'PACKAGE ITINERARY', pkg.quoteRef, comp)}

        <!-- 3 Stat Cards Matching Reference PDF -->
        <div class="dmc-stats-grid">
          <div class="dmc-stat-card">
            <span class="stat-card-title">DURATION</span>
            <div class="stat-card-main">${escapeHTML(pkg.duration || (days.length ? `${days.length} Days` : 'Custom Duration'))}</div>
            <div class="stat-card-sub">${escapeHTML(pkg.startDate && pkg.endDate ? `${pkg.startDate} to ${pkg.endDate}` : (pkg.preparedDate || 'Flexible Travel Dates'))}</div>
          </div>
          <div class="dmc-stat-card">
            <span class="stat-card-title">DESTINATIONS</span>
            <div class="stat-card-main">${escapeHTML(pkg.destinations || pkg.destination || 'Custom Destination')}</div>
            ${(pkg.country && !/thailand/i.test(pkg.country) || (pkg.destinations && /thailand|phuket|krabi|bangkok|pattaya/i.test(pkg.destinations))) ? `<div class="stat-card-sub">${escapeHTML(pkg.country)}</div>` : ''}
          </div>
          <div class="dmc-stat-card">
            <span class="stat-card-title">TRAVELLERS</span>
            <div class="stat-card-main">${escapeHTML(pkg.travellers || '2 Adults')}</div>
            <div class="stat-card-sub">Package for ${pkg.paxCount || 2} pax</div>
          </div>
        </div>

        <!-- Day-by-Day Experience Timeline -->
        <section class="dmc-section itinerary-experience-section">
          <div class="dmc-section-header">
            <span>Day-wise Itinerary & Experiences</span>
          </div>

          <div class="itinerary-days-container">
            ${days.length === 0 ? `
              <div class="dmc-empty-state">No days added yet. Use the Studio Builder on the left to add your itinerary days.</div>
            ` : days.map((day, idx) => `
              <div class="itinerary-day-card" id="itin-day-${idx + 1}">
                <div class="itin-day-header">
                  <div class="itin-day-badge">DAY ${day.dayNumber || idx + 1}</div>
                  <div class="itin-date-badge">${escapeHTML(day.date || '')}</div>
                  <h3 class="itin-day-title">${escapeHTML(day.title || 'Day Programme')}</h3>
                </div>

                <div class="itin-day-body">
                  <!-- Activities & Excursions -->
                  <div class="itin-activities-list">
                    ${(day.items || []).map(item => `
                      <div class="itin-act-row">
                        <span class="itin-bullet">✦</span>
                        <div class="itin-act-info">
                          <span class="itin-act-name">${escapeHTML(item.title)}</span>
                          ${item.tag ? renderTagBadge(item.tag) : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Hotel / Accommodation Stay -->
                  ${day.hotel && day.hotel.name ? `
                  <div class="itin-hotel-box">
                    <span class="itin-hotel-icon">🏨</span>
                    <div class="itin-hotel-info">
                      <span class="itin-hotel-label">Accommodation:</span>
                      <strong class="itin-hotel-name">${escapeHTML(day.hotel.name)}</strong>
                      ${day.hotel.dates ? `<span class="itin-hotel-dates">(Stay: ${escapeHTML(day.hotel.dates)})</span>` : ''}
                      ${day.hotel.roomType ? `<span class="itin-hotel-pill">🛏️ ${escapeHTML(day.hotel.roomType)}</span>` : ''}
                      ${day.hotel.mealPlan ? `<span class="itin-hotel-pill">☕ ${escapeHTML(day.hotel.mealPlan)}</span>` : ''}
                    </div>
                  </div>` : ''}

                  <!-- Day Notes / Tips -->
                  ${day.dayNotes ? `
                  <div class="itin-day-note">
                    <span class="itin-note-icon">💡</span>
                    <span>${escapeHTML(day.dayNotes)}</span>
                  </div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Inclusions & Guidelines -->
        ${customSections.filter(sec => sec.items && sec.items.length > 0).map(sec => `
          <section class="dmc-section dmc-custom-section">
            <div class="dmc-section-header"><span>${escapeHTML(sec.title)}</span></div>
            <div class="dmc-custom-section-content">
              <ul class="dmc-bullet-list">
                ${sec.items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
              </ul>
            </div>
          </section>
        `).join('')}

        <!-- Global Desks & Contact -->
        ${renderOfficesSection(offices)}

        ${renderContinuousFooter(footer, comp)}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. FORMAT: COSTING QUOTATION (PRICE & SERVICE FOCUSED)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderQuotationDocument(data, isForPrint) {
    const pkg = data.package || {};
    const days = data.days || [];
    const summary = data.summary || { items: [], totalINR: 0, totalUSD: 0 };
    const offices = data.offices || [];
    const footer = data.footerSettings || {};
    const comp = data.company || pkg.company || ((typeof QuotationData !== 'undefined' && QuotationData.company) ? QuotationData.company : {});
    const isAanay = /aanay/i.test(comp.name || pkg.company?.name || '');
    const themeStyles = getThemeStyles(data.themeSettings);

    const isDomestic = isDomesticTrip(pkg);
    const isEur = pkg.currency === 'EUR' || (data.pricing && data.pricing.currency === 'EUR');
    const foreignCurrHeader = isEur ? 'AMOUNT (EUR €)' : 'AMOUNT (USD)';
    const showUsdColumn = !isDomestic && (pkg.currency === 'USD' || isEur || pkg.showUsdColumn || (summary.totalUSD > 0 && !pkg.hideUsd && pkg.currency !== 'INR'));

    return `
      <div class="dmc-quotation-doc doc-quotation-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, pkg.title || 'PACKAGE TOUR', pkg.quoteRef, comp)}

        <!-- 3 Stat Cards Matching Reference PDF -->
        <div class="dmc-stats-grid">
          <div class="dmc-stat-card">
            <span class="stat-card-title">DURATION</span>
            <div class="stat-card-main">${escapeHTML(pkg.duration || (days.length ? `${days.length} Days` : 'Custom Duration'))}</div>
            <div class="stat-card-sub">${escapeHTML(pkg.startDate && pkg.endDate ? `${pkg.startDate} to ${pkg.endDate}` : (pkg.preparedDate || 'Flexible Travel Dates'))}</div>
          </div>
          <div class="dmc-stat-card">
            <span class="stat-card-title">DESTINATIONS</span>
            <div class="stat-card-main">${escapeHTML(pkg.destinations || pkg.destination || 'Custom Destination')}</div>
            ${(pkg.country && !/thailand/i.test(pkg.country) || (pkg.destinations && /thailand|phuket|krabi|bangkok|pattaya/i.test(pkg.destinations))) ? `<div class="stat-card-sub">${escapeHTML(pkg.country)}</div>` : ''}
          </div>
          <div class="dmc-stat-card">
            <span class="stat-card-title">TRAVELLERS</span>
            <div class="stat-card-main">${escapeHTML(pkg.travellers || '2 Adults')}</div>
            <div class="stat-card-sub">Package for ${pkg.paxCount || 2} pax</div>
          </div>
        </div>

        <!-- Day-Wise Services & Costing Table (3 or 4 Column based on Currency) -->
        <section class="dmc-section dmc-itinerary-section">
          <div class="dmc-section-header">
            <span>Day-wise Itinerary & Pricing</span>
          </div>

          <div class="dmc-table-header-bar ${!showUsdColumn ? 'no-usd-col' : ''}">
            <div class="th-desc">DAY-WISE ITINERARY & SERVICE DETAILS</div>
            <div class="th-pax">PAX</div>
            <div class="th-inr">AMOUNT (INR)</div>
            ${showUsdColumn ? `<div class="th-usd">${foreignCurrHeader}</div>` : ''}
          </div>

          <div class="dmc-days-list">
            ${days.map((day, idx) => renderDayPricingCardHTML(day, showUsdColumn, idx)).join('')}
          </div>
        </section>

        <!-- Hotels Included Section (Direct Reference PDF Match) -->
        ${data.hotels && data.hotels.length > 0 ? `
        <section class="dmc-section dmc-hotels-section">
          <div class="dmc-section-header">
            <span>Hotels Included & Accommodation Summary</span>
          </div>
          <table class="dmc-hotels-table">
            <thead>
              <tr>
                <th style="width: 16%;">CITY</th>
                <th style="width: 30%;">HOTEL / RESORT</th>
                <th style="width: 18%;">STAY DATES</th>
                <th style="width: 16%;">ROOM TYPE</th>
                <th style="width: 8%; text-align: center;">PAX</th>
                <th style="width: 12%; text-align: right;">TARIFF (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${data.hotels.map(h => `
                <tr>
                  <td><strong>${escapeHTML(h.city || pkg.destinations || pkg.destination || 'Destination')}</strong></td>
                  <td><strong>${escapeHTML(h.name)}</strong></td>
                  <td>${escapeHTML(h.checkIn || '')} to ${escapeHTML(h.checkOut || '')}</td>
                  <td>${escapeHTML(h.roomType || 'Deluxe Room')}</td>
                  <td style="text-align: center;">${h.pax || 2}</td>
                  <td style="text-align: right; font-weight: 700; color: var(--dmc-primary, #0F2C59);">
                    ${h.amountINR ? formatCurrencyINR(h.amountINR) : 'Included'}
                  </td>
                </tr>
              `).join('')}
              <tr class="dmc-hotel-total-row">
                <td colspan="5" style="text-align: right; font-weight: 700;">TOTAL HOTEL COSTING:</td>
                <td style="text-align: right; font-weight: 800; color: var(--dmc-primary, #0F2C59);">
                  ${formatCurrencyINR(data.hotels.reduce((s, h) => s + (Number(h.amountINR) || 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </section>` : ''}

        <!-- Dynamic Custom Sections (Inclusions, Exclusions, Notes) -->
        ${(data.customSections || []).filter(sec => sec.items && sec.items.length > 0).map(sec => `
          <section class="dmc-section dmc-custom-section">
            <div class="dmc-section-header">
              <span>${escapeHTML(sec.title)}</span>
            </div>
            <div class="dmc-custom-section-content">
              <ul class="dmc-bullet-list">
                ${sec.items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
              </ul>
            </div>
          </section>
        `).join('')}

        <!-- Commercial Tariffs & Room Rates Table -->
        ${(pkg.pricingRows && Array.isArray(pkg.pricingRows) && pkg.pricingRows.length > 0) ? `
        <section class="dmc-section dmc-pricing-rows-section" style="margin-top:14px;">
          <div class="dmc-section-header">
            <span>COMMERCIAL TARIFFS & ROOM RATES</span>
          </div>
          <table class="dmc-summary-table">
            <thead>
              <tr>
                <th class="th-sum-desc">OCCUPANCY / ROOM TYPE</th>
                <th class="th-sum-inr" style="text-align:right;">RATE (${isEur ? 'EUR €' : (pkg.currency === 'INR' ? 'INR ₹' : 'USD $')})</th>
              </tr>
            </thead>
            <tbody>
              ${pkg.pricingRows.map(row => `
                <tr class="dmc-summary-row">
                  <td class="col-sum-desc">• ${escapeHTML(row.description)}</td>
                  <td class="col-sum-inr" style="text-align:right; font-weight:800; color:#0F2C59;">
                    ${row.isFoc ? '<span style="color:#059669;">Free of Charge (FOC)</span>' : (`${isEur ? '€ ' : (pkg.currency === 'INR' ? '₹ ' : '$ ')}` + Number(row.rate || row.rateUSD || row.rateDouble || 0).toFixed(2))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>` : ''}

        <!-- Final Price Summary Table -->
        <section class="dmc-section dmc-summary-section">
          <div class="dmc-section-header">
            <span>PACKAGE PRICE SUMMARY</span>
          </div>

          <table class="dmc-summary-table">
            <thead>
              <tr>
                <th class="th-sum-desc">PACKAGE SUMMARY</th>
                <th class="th-sum-inr" style="${!showUsdColumn ? 'text-align:right;' : ''}">AMOUNT (INR)</th>
                ${showUsdColumn ? `<th class="th-sum-usd">${foreignCurrHeader}</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${(summary.items || []).map(item => `
                <tr class="dmc-summary-row">
                  <td class="col-sum-desc">• ${escapeHTML(item.name)}</td>
                  <td class="col-sum-inr" style="${!showUsdColumn ? 'text-align:right;' : ''}">${item.amountINR ? formatCurrencyINR(item.amountINR) : '—'}</td>
                  ${showUsdColumn ? `<td class="col-sum-usd">${(item.amountUSD || item.amountEUR) ? (isEur ? ('€ ' + Number(item.amountEUR || item.amountUSD).toFixed(2)) : formatCurrencyUSD(item.amountUSD)) : '—'}</td>` : ''}
                </tr>
              `).join('')}
              <tr class="dmc-total-row">
                <td class="col-sum-desc"><strong>FINAL PACKAGE COST (${escapeHTML(pkg.travellers || '2 Adults')})</strong></td>
                <td class="col-sum-inr" style="${!showUsdColumn ? 'text-align:right;' : ''}"><strong>${formatCurrencyINR(summary.totalINR)}</strong></td>
                ${showUsdColumn ? `<td class="col-sum-usd"><strong>${isEur ? ('€ ' + Number(summary.totalEUR || summary.totalUSD).toFixed(2)) : formatCurrencyUSD(summary.totalUSD)}</strong></td>` : ''}
              </tr>
            </tbody>
          </table>

          <div class="dmc-summary-disclaimer">
            * All prices computed for <strong>${escapeHTML(pkg.travellers || '2 Adults')}</strong>. Airfares, resort tariffs, and government taxes remain dynamic until confirmed booking.
          </div>
        </section>

        <!-- Contact Section or Global Desks -->
        ${isAanay ? `
          <section class="dmc-section aanay-contact-section" style="margin-top:20px; border-top:2px solid #0F2C59; padding-top:14px;">
            <h3 style="font-size:14px; font-weight:800; color:#0F2C59; margin-bottom:10px;">Contact Us</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:4px; padding:12px 18px;">
              <div>
                <span style="font-size:10px; font-weight:700; color:#64748B; text-transform:uppercase;">COMPANY</span><br>
                <strong style="font-size:14px; color:#0F2C59;">${escapeHTML(comp.name || 'Aanay Tours')}</strong><br>
                <span style="font-size:11px; color:#64748B;">${escapeHTML(comp.address || 'Sahakar Nagar Opp New Cotton Market, Amravati, Maharashtra, India, 444603')}</span>
              </div>
              <div>
                <span style="font-size:10px; font-weight:700; color:#64748B; text-transform:uppercase;">PHONE & EMAIL</span><br>
                <strong style="font-size:14px; color:#0F2C59;">${escapeHTML(comp.phone || '+91 7708123187 | +91 8007586871')}</strong><br>
                <span style="font-size:11px; color:#64748B;">${escapeHTML(comp.email || 'Infoattdmc@gmail.com')}</span>
              </div>
            </div>
          </section>
        ` : renderOfficesSection(offices)}

        ${renderContinuousFooter(footer, comp)}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. FORMAT: HOTEL COSTING & COMPARISON (HOTEL-FOCUSED)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderHotelCostingDocument(data, isForPrint) {
    const pkg = data.package || {};
    const hotels = data.hotels || [];
    const footer = data.footerSettings || {};
    const offices = data.offices || [];
    const comp = data.company || pkg.company || ((typeof QuotationData !== 'undefined' && QuotationData.company) ? QuotationData.company : {});
    const themeStyles = getThemeStyles(data.themeSettings);

    const totalINR = hotels.reduce((sum, h) => sum + (Number(h.amountINR) || 0), 0);
    const totalUSD = hotels.reduce((sum, h) => sum + (Number(h.amountUSD) || 0), 0);

    return `
      <div class="dmc-quotation-doc doc-hotel-costing-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, 'HOTEL COSTING & COMPARISON', pkg.quoteRef, comp)}

        <!-- Hotel Overview Parameter Strip -->
        <div class="hotel-overview-strip">
          <div class="h-param"><strong>Destination:</strong> ${escapeHTML(pkg.destinations || pkg.destination || 'Bespoke Destination')}</div>
          <div class="h-param"><strong>Travel Dates:</strong> ${escapeHTML(pkg.preparedDate || 'Flexible Travel Dates')}</div>
          <div class="h-param"><strong>Occupancy:</strong> ${escapeHTML(pkg.travellers || '2 Adults')} (1 Room / Double Sharing)</div>
          <div class="h-param"><strong>Total Properties:</strong> ${hotels.length} Properties</div>
        </div>

        <section class="dmc-section hotel-comparison-section">
          <div class="dmc-section-header">
            <span>Hotel-wise Property & Tariff Breakdown</span>
          </div>

          <div class="hotel-cards-grid">
            ${hotels.length === 0 ? `
              <div class="dmc-empty-state">No hotels configured. Use the Hotels Editor tab in the Studio to add properties.</div>
            ` : hotels.map((h, idx) => `
              <div class="hotel-comparison-card">
                <div class="h-card-top">
                  <div class="h-title-group">
                    <span class="h-number">0${idx + 1}</span>
                    <div>
                      <h3 class="h-resort-name">${escapeHTML(h.name)}</h3>
                      <span class="h-resort-city">📍 ${escapeHTML(h.city || pkg.destinations || pkg.destination || 'Destination')}</span>
                    </div>
                  </div>
                  <div class="h-stay-badge">
                    <span>${escapeHTML(h.checkIn || '—')} – ${escapeHTML(h.checkOut || '—')}</span>
                    <strong>${h.nights || 1} Night${h.nights > 1 ? 's' : ''}</strong>
                  </div>
                </div>

                <div class="h-specs-grid">
                  <div class="h-spec-item"><span class="spec-label">Room Category:</span> <strong>${escapeHTML(h.roomType || 'Standard Deluxe')}</strong></div>
                  <div class="h-spec-item"><span class="spec-label">Meal Plan:</span> <strong>${escapeHTML(h.mealPlan || 'Buffet Breakfast (CP)')}</strong></div>
                  <div class="h-spec-item"><span class="spec-label">Booking Status:</span> <span class="h-status-confirmed">${escapeHTML(h.status || 'Available')}</span></div>
                  <div class="h-spec-item"><span class="spec-label">Cancellation Policy:</span> <span>${escapeHTML(h.cancellation || 'As per tariff rule')}</span></div>
                </div>

                <!-- Tariff Options Matrix -->
                <div class="h-options-matrix">
                  <div class="h-opt-box opt-primary">
                    <div class="opt-name">OPTION 1 · FREE CANCELLATION</div>
                    <div class="opt-price">${h.opt1FreeCancel ? formatCurrencyINR(h.opt1FreeCancel) : formatCurrencyINR(h.amountINR)}</div>
                    <div class="opt-desc">Full flexibility until deadline</div>
                  </div>

                  <div class="h-opt-box opt-saver">
                    <div class="opt-name">OPTION 2 · NON-REFUNDABLE</div>
                    <div class="opt-price">${h.opt2NonRefund ? formatCurrencyINR(h.opt2NonRefund) : 'Tariff on req'}</div>
                    <div class="opt-desc">Best promotional saver rate</div>
                  </div>

                  <div class="h-opt-box opt-flexi">
                    <div class="opt-name">OPTION 3 · PARTIAL REFUND</div>
                    <div class="opt-price">${h.opt3PartialRefund ? formatCurrencyINR(h.opt3PartialRefund) : 'Tariff on req'}</div>
                    <div class="opt-desc">Moderate cancellation window</div>
                  </div>
                </div>

                ${h.notes ? `<div class="h-special-note">📌 <em>${escapeHTML(h.notes)}</em></div>` : ''}
              </div>
            `).join('')}
          </div>

          <!-- Total Hotel Cost Summary -->
          <div class="hotel-grand-cost-card">
            <div class="h-cost-label">TOTAL HOTEL ACCOMMODATION COST (${escapeHTML(pkg.travellers || '2 Adults')})</div>
            <div class="h-cost-total">${formatCurrencyINR(totalINR || data.summary?.totalINR || 285980)}</div>
            <div class="h-cost-sub">${totalUSD > 0 ? `approx. ${formatCurrencyUSD(totalUSD)}` : `Computed across all ${hotels.length} resort stays`}</div>
          </div>
        </section>

        <!-- Terms & Global Desks -->
        ${renderOfficesSection(offices)}

        ${renderContinuousFooter(footer, comp)}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. FORMAT: PACKAGE SUMMARY (COMPACT OVERVIEW)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderPackageSummaryDocument(data, isForPrint) {
    const pkg = data.package || {};
    const summary = data.summary || { items: [], totalINR: 0, totalUSD: 0 };
    const customSections = data.customSections || [];
    const footer = data.footerSettings || {};
    const offices = data.offices || [];
    const comp = data.company || pkg.company || ((typeof QuotationData !== 'undefined' && QuotationData.company) ? QuotationData.company : {});
    const themeStyles = getThemeStyles(data.themeSettings);

    const isDomestic = isDomesticTrip(pkg);
    const showUsdColumn = !isDomestic && (pkg.currency === 'USD' || pkg.showUsdColumn || (summary.totalUSD > 0 && !pkg.hideUsd && pkg.currency !== 'INR'));

    return `
      <div class="dmc-quotation-doc doc-summary-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, 'PACKAGE EXECUTIVE SUMMARY', pkg.quoteRef, comp)}

        <!-- Executive Trip Overview Grid -->
        <section class="dmc-section summary-overview-section">
          <div class="dmc-section-header"><span>Trip Overview</span></div>
          <div class="summary-overview-grid">
            <div class="so-cell"><span class="so-label">Destination</span><strong class="so-val">${escapeHTML(pkg.destinations || pkg.destination || 'Bespoke Package')}</strong></div>
            <div class="so-cell"><span class="so-label">Duration</span><strong class="so-val">${escapeHTML(pkg.duration || 'Custom Plan')}</strong></div>
            <div class="so-cell"><span class="so-label">Travel Dates</span><strong class="so-val">${escapeHTML(pkg.preparedDate || 'Flexible Travel Dates')}</strong></div>
            <div class="so-cell"><span class="so-label">Travellers</span><strong class="so-val">${escapeHTML(pkg.travellers || '2 Adults')}</strong></div>
            <div class="so-cell"><span class="so-label">Prepared For</span><strong class="so-val">${escapeHTML(pkg.clientName || 'Valued Partner')}</strong></div>
            ${showUsdColumn ? `
            <div class="so-cell"><span class="so-label">Forex Benchmark</span><strong class="so-val">1 USD = ₹ ${pkg.usdToInrRate || 87.5}</strong></div>
            ` : `
            <div class="so-cell"><span class="so-label">Pickup Hub</span><strong class="so-val">${escapeHTML(getDefaultPickupHub(pkg))}</strong></div>
            `}
          </div>
        </section>

        <!-- Consolidated Cost Breakdown -->
        <section class="dmc-section summary-cost-section">
          <div class="dmc-section-header"><span>Financial Cost Breakdown</span></div>
          <table class="dmc-summary-table">
            <thead>
              <tr>
                <th class="th-sum-desc">COMPONENT / SERVICE CATEGORY</th>
                <th class="th-sum-inr" style="${!showUsdColumn ? 'text-align:right;' : ''}">AMOUNT (INR)</th>
                ${showUsdColumn ? `<th class="th-sum-usd">AMOUNT (USD)</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${(summary.items || []).map(item => `
                <tr class="dmc-summary-row">
                  <td class="col-sum-desc">• ${escapeHTML(item.name)}</td>
                  <td class="col-sum-inr" style="${!showUsdColumn ? 'text-align:right;' : ''}">${item.amountINR ? formatCurrencyINR(item.amountINR) : '—'}</td>
                  ${showUsdColumn ? `<td class="col-sum-usd">${item.amountUSD ? formatCurrencyUSD(item.amountUSD) : '—'}</td>` : ''}
                </tr>
              `).join('')}
              <tr class="dmc-total-row">
                <td class="col-sum-desc"><strong>TOTAL PACKAGE COST</strong></td>
                <td class="col-sum-inr" style="${!showUsdColumn ? 'text-align:right;' : ''}"><strong>${formatCurrencyINR(summary.totalINR)}</strong></td>
                ${showUsdColumn ? `<td class="col-sum-usd"><strong>${formatCurrencyUSD(summary.totalUSD)}</strong></td>` : ''}
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Inclusions & Exclusions Two-Column Layout -->
        <div class="summary-inclusions-grid">
          ${customSections.filter(sec => sec.items && sec.items.length > 0).map(sec => `
            <div class="summary-section-box">
              <h4 class="sum-sec-title">${escapeHTML(sec.title)}</h4>
              <ul class="dmc-bullet-list">
                ${sec.items.map(it => `<li>${escapeHTML(it)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>

        <!-- Global Desks & Contact -->
        ${renderOfficesSection(offices)}

        ${renderContinuousFooter(footer, comp)}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. FORMAT: TRAVEL CONFIRMATION VOUCHER (BOOKING-FOCUSED)
  // ═══════════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. FORMAT: HOTEL BOOKING VOUCHER (REFERENCE AANAY TOURS / HILTON FORMAT)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderTravelConfirmationDocument(data, isForPrint) {
    const pkg = data.package || {};
    const conf = data.confirmation || {};
    const sec = conf.sections || {};
    const themeStyles = getThemeStyles(data.themeSettings);

    const roomsList = (conf.rooms && conf.rooms.length > 0) ? conf.rooms : (
      (data.hotels && data.hotels.length > 0) ? data.hotels.map(h => ({
        roomType: h.roomType || 'Standard Room',
        roomOccupancy: h.occupancy || (pkg.travellers || '2 Adults'),
        mealPlan: h.mealPlan || 'Daily Buffet Breakfast',
        noOfRooms: h.noOfRooms || 1,
        extraBed: h.extraBed || 0,
        noOfAdult: pkg.adultCount || 2,
        noOfChild: pkg.childCount || 0,
        noOfInfant: 0,
        extraMattress: 0
      })) : [
        {
          roomType: 'Deluxe double room',
          roomOccupancy: pkg.travellers || '2 Adults',
          mealPlan: 'Breakfast',
          noOfRooms: 1,
          extraBed: 0,
          noOfAdult: 2,
          noOfChild: 0,
          noOfInfant: 0,
          extraMattress: 0
        }
      ]
    );

    const adultsList = (conf.adults && conf.adults.length > 0) ? conf.adults : [
      {
        name: conf.guestName || conf.leadPassenger || pkg.clientName || 'Valued Guest',
        email: conf.guestEmail || conf.agencyEmail || (data.company && data.company.email) || 'info@letsexploredmc.com',
        mobile: conf.guestMobile || conf.contact || (data.company && data.company.phone) || '+91 80075 86871'
      }
    ];

    const starCount = Math.max(1, Math.min(5, parseInt(conf.starRating || 5, 10)));
    const starsHtml = '★'.repeat(starCount);

    return `
      <div class="dmc-quotation-doc doc-confirmation-mode hotel-voucher-doc ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        
        <!-- 1. Agency Header (Right-Aligned) -->
        ${sec.agencyHeader !== false ? `
          <header class="hv-agency-header">
            <div class="hv-agency-brand">
              <h1 class="hv-agency-name">${escapeHTML(conf.agencyName || (data.company && data.company.name) || "Let's Explore DMC")}</h1>
              <div class="hv-agency-meta">
                <div>Contact Person : <span>${escapeHTML(conf.contactPerson || (data.company && data.company.contactPerson) || 'Travel Specialist')}</span></div>
                <div>Mobile No : <span>${escapeHTML(conf.agencyMobile || (data.company && data.company.phone) || '+91 80075 86871')}</span></div>
                <div>Email : <span>${escapeHTML(conf.agencyEmail || (data.company && data.company.email) || 'info@letsexploredmc.com')}</span></div>
              </div>
            </div>
          </header>
        ` : ''}

        <!-- 2. Hotel Summary Highlight Box -->
        ${sec.summaryCard !== false ? `
          <div class="hv-summary-card">
            <div class="hv-grid-2">
              <div class="hv-cell-left">
                <div class="hv-hotel-name-row">
                  <span class="hv-hotel-name">${escapeHTML(conf.hotelName || (data.hotels && data.hotels[0] && data.hotels[0].name) || ((pkg.destinations || pkg.destination || 'Luxury') + ' Hotel'))}</span>
                  <span class="hv-stars">${starsHtml}</span>
                </div>
                <div class="hv-meta-line">Ref No. : <strong>${escapeHTML(conf.refNo || pkg.quoteRef || 'LE-VOUCHER-9842')}</strong></div>
                <div class="hv-meta-line">Confirmation No. : <strong>${escapeHTML(conf.confirmationNo || (data.hotels && data.hotels[0] && (data.hotels[0].confirmationNo || data.hotels[0].bookingId)) || 'CONF-882914')}</strong></div>
              </div>
              <div class="hv-cell-right">
                <div class="hv-meta-line">Email Id : <strong>${escapeHTML(conf.hotelEmail || (data.company && data.company.email) || 'reservations@hotel.com')}</strong></div>
                <div class="hv-meta-line">Mobile No : <strong>${escapeHTML(conf.hotelMobile || (data.company && data.company.phone) || '+91 80075 86871')}</strong></div>
                <div class="hv-meta-line">City Name : <strong>${escapeHTML(conf.cityName || (data.hotels && data.hotels[0] && data.hotels[0].city) || pkg.destination || 'Destination')}</strong></div>
              </div>
            </div>

            <div class="hv-divider-h"></div>

            <div class="hv-grid-2">
              <div class="hv-cell-left">
                <div class="hv-meta-line">Guest Name : <strong>${escapeHTML(conf.guestName || conf.leadPassenger || pkg.clientName || 'Valued Guest')}</strong></div>
                <div class="hv-meta-line">Guest Email Id : <strong>${escapeHTML(conf.guestEmail || (data.company && data.company.email) || 'info@letsexploredmc.com')}</strong></div>
              </div>
              <div class="hv-cell-right">
                <div class="hv-meta-line">Hotel Type : <strong>${escapeHTML(conf.hotelType || 'Luxury Resort')}</strong></div>
                <div class="hv-meta-line">Guest Mobile No. : <strong>${escapeHTML(conf.guestMobile || (data.company && data.company.phone) || '+91 80075 86871')}</strong></div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 3. How to Get Here & Hotel Photo Banner -->
        ${sec.mapPhoto !== false ? `
          <div class="hv-map-photo-row">
            <div class="hv-map-box">
              <div class="hv-map-header">📍 How to get here</div>
              <div class="hv-map-body">
                <div class="hv-map-loc-label">Location :</div>
                <div class="hv-map-loc-val">${escapeHTML(conf.location || (data.hotels && data.hotels[0] && data.hotels[0].address) || pkg.destinations || 'Destination')}</div>
                <a href="${escapeHTML(conf.mapsUrl || ('https://maps.google.com/?q=' + encodeURIComponent(conf.hotelName || (data.hotels && data.hotels[0] && data.hotels[0].name) || 'Hotel')))}" 
                   target="_blank" class="hv-maps-btn">Open in Google Maps</a>
              </div>
            </div>
            <div class="hv-photo-box">
              <img src="${escapeHTML(conf.hotelPhoto || (data.hotels && data.hotels[0] && data.hotels[0].photo) || (data.extractedAssets && data.extractedAssets.find(a => !a.is_logo && a.web_path)?.web_path) || 'images/hotel-hilton.jpg')}" 
                   alt="${escapeHTML(conf.hotelName || 'Hotel')}" 
                   class="hv-hotel-photo" 
                   onerror="this.src='images/hotel-hilton.jpg'" />
            </div>
          </div>
        ` : ''}

        <!-- 4. Hotel Details & Room Occupancy Table -->
        ${sec.hotelDetails !== false ? `
          <div class="hv-section">
            <div class="hv-banner">Hotel Details</div>
            
            <div class="hv-date-strip">
              <span class="hv-date-lbl">Check in and Check out date</span>
              <span class="hv-date-val">From: <strong>${escapeHTML(conf.checkInDateTime || conf.checkIn || (data.hotels && data.hotels[0] && data.hotels[0].checkIn) || 'Day 1')}</strong> &nbsp;&nbsp; To: <strong>${escapeHTML(conf.checkOutDateTime || conf.checkOut || (data.hotels && data.hotels[0] && data.hotels[0].checkOut) || 'Day 3')}</strong></span>
            </div>

            <table class="hv-table">
              <thead>
                <tr>
                  <th>Room Type</th>
                  <th>Room Occupancy</th>
                  <th>Meal Plan</th>
                  <th>No. Of Rooms</th>
                  <th>Extra Bed</th>
                  <th>No. Of Adult</th>
                  <th>No. Of Child</th>
                  <th>No. Of Infant</th>
                  <th>Extra Mattress</th>
                </tr>
              </thead>
              <tbody>
                ${roomsList.map(r => `
                  <tr>
                    <td><strong>${escapeHTML(r.roomType || 'Deluxe double room')}</strong></td>
                    <td>${escapeHTML(r.roomOccupancy || 'double sharing + extra bed')}</td>
                    <td>${escapeHTML(r.mealPlan || 'Breakfast')}</td>
                    <td style="text-align:center;">${escapeHTML(String(r.noOfRooms ?? 1))}</td>
                    <td style="text-align:center;">${escapeHTML(String(r.extraBed ?? 0))}</td>
                    <td style="text-align:center;">${escapeHTML(String(r.noOfAdult ?? 2))}</td>
                    <td style="text-align:center;">${escapeHTML(String(r.noOfChild ?? 0))}</td>
                    <td style="text-align:center;">${escapeHTML(String(r.noOfInfant ?? 0))}</td>
                    <td style="text-align:center;">${escapeHTML(String(r.extraMattress ?? 0))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- 5. Adult Details Table -->
        ${sec.adultDetails !== false ? `
          <div class="hv-section">
            <div class="hv-banner">Adult Details</div>
            <table class="hv-table">
              <thead>
                <tr>
                  <th style="width:33%;">Name</th>
                  <th style="width:34%;">Email</th>
                  <th style="width:33%;">Mobile</th>
                </tr>
              </thead>
              <tbody>
                ${adultsList.map(a => `
                  <tr>
                    <td><strong>${escapeHTML(a.name || 'pratik sangani')}</strong></td>
                    <td>${escapeHTML(a.email || 'Infoattdmc@gmail.com')}</td>
                    <td>${escapeHTML(a.mobile || '7709123187')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- 6. Important Information & Policies -->
        ${sec.importantInfo !== false ? `
          <div class="hv-section">
            <div class="hv-banner">IMPORTANT INFORMATION</div>
            <div class="hv-info-box">
              ${conf.perksInfo ? `<p class="hv-info-p">${escapeHTML(conf.perksInfo)}</p>` : ''}
              ${conf.passportNotice ? `<p class="hv-info-p"><strong>${escapeHTML(conf.passportNotice)}</strong></p>` : ''}
              
              ${conf.idProofPolicy ? `
                <div class="hv-info-subheading">ID Proof Related</div>
                <p class="hv-info-p">${escapeHTML(conf.idProofPolicy)}</p>
              ` : ''}

              ${conf.mustRead ? `
                <div class="hv-info-subheading">Must read</div>
                <p class="hv-info-p">${escapeHTML(conf.mustRead)}</p>
              ` : ''}

              ${conf.optionalFees ? `<p class="hv-info-p">${escapeHTML(conf.optionalFees)}</p>` : ''}
              
              ${conf.stayPolicies ? `<p class="hv-info-p">${escapeHTML(conf.stayPolicies).replace(/\n/g, '<br>')}</p>` : ''}

              ${conf.petPolicy ? `
                <div class="hv-info-subheading">Pet(s) Related</div>
                <p class="hv-info-p">${escapeHTML(conf.petPolicy).replace(/\n/g, '<br>')}</p>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- 7. Hotel Amenities -->
        ${sec.amenities !== false && conf.amenities ? `
          <div class="hv-section">
            <div class="hv-banner">HOTEL AMENITIES</div>
            <div class="hv-amenities-box">
              ${conf.amenities.transfers ? `
                <div class="hv-amenities-group">
                  <div class="hv-amenities-title">Transfers and Connectivity</div>
                  <div class="hv-amenities-text">${escapeHTML(conf.amenities.transfers)}</div>
                </div>
              ` : ''}
              ${conf.amenities.entertainment ? `
                <div class="hv-amenities-group">
                  <div class="hv-amenities-title">Entertainment</div>
                  <div class="hv-amenities-text">${escapeHTML(conf.amenities.entertainment)}</div>
                </div>
              ` : ''}
              ${conf.amenities.foodDrinks ? `
                <div class="hv-amenities-group">
                  <div class="hv-amenities-title">Food and Drinks</div>
                  <div class="hv-amenities-text">${escapeHTML(conf.amenities.foodDrinks)}</div>
                </div>
              ` : ''}
              ${conf.amenities.roomAmenities ? `
                <div class="hv-amenities-group">
                  <div class="hv-amenities-title">Room Amenities</div>
                  <div class="hv-amenities-text">${escapeHTML(conf.amenities.roomAmenities)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. FORMAT: TAX INVOICE / BILLING (BILLING-FOCUSED)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderInvoiceDocument(data, isForPrint) {
    const pkg = data.package || {};
    const inv = data.invoice || {};
    const themeStyles = getThemeStyles(data.themeSettings);

    const fmtNum = (val) => {
      const n = parseFloat(val);
      if (isNaN(n)) return '0.00';
      return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const defaultPackageAmount = parseFloat(pkg.totalCostINR || (data.pricing && data.pricing.grandTotal) || (data.pricing && data.pricing.ratePerAdultINR && pkg.paxCount ? data.pricing.ratePerAdultINR * pkg.paxCount : 0) || (pkg.totalCostUSD ? pkg.totalCostUSD * 87.5 : 50000));
    const defaultTaxable = Math.round((defaultPackageAmount / 1.05) * 100) / 100;

    const items = (inv.items && inv.items.length > 0) ? inv.items : [
      {
        sn: 1,
        service: `Land Arrangement & Tour Package (${pkg.destinations || pkg.destination || 'International Tour'})`,
        description: `${pkg.duration || 'Custom Tour'} · ${pkg.travellers || '1 Person'}`,
        hsn: '998555',
        quantity: pkg.paxCount || 1,
        perPaxPrice: pkg.ratePerAdultINR || Math.round(defaultTaxable / (pkg.paxCount || 1)),
        netAmount: defaultTaxable,
        amount: defaultTaxable
      }
    ];

    let calcSubtotal = 0;
    items.forEach(it => {
      const amt = parseFloat(it.amount || it.netAmount || 0);
      calcSubtotal += isNaN(amt) ? 0 : amt;
    });

    const subTotal = inv.subTotal !== undefined ? inv.subTotal : (inv.subtotal !== undefined ? inv.subtotal : calcSubtotal);
    const totalAmount = inv.totalAmount !== undefined ? inv.totalAmount : (inv.grandTotal !== undefined ? inv.grandTotal : (inv.subTotal ? Math.round(inv.subTotal * 1.05 * 100) / 100 : defaultPackageAmount));
    const invLogo = inv.logo || (data.company && data.company.logo) || pkg.extractedLogo || 'images/logo.png';

    return `
      <div class="dmc-quotation-doc doc-invoice-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        <!-- Top Header: Logo on left, Word "Invoice" on right -->
        <div class="inv-orange-header">
          <div class="inv-logo-box">
            <img src="${escapeHTML(invLogo)}" alt="${escapeHTML(data.company?.name || "Let's Explore DMC")}" class="inv-logo-img" onerror="this.src='images/logo.png'" />
          </div>
          <div class="inv-top-right">
            <h1 class="inv-word-title">Invoice</h1>
            <div class="inv-no-line">Invoice No: <strong>${escapeHTML(inv.invoiceNumber || '090587')}</strong></div>
          </div>
        </div>

        <!-- Orange Horizontal Divider Strip with bold text INVOICE -->
        <div class="inv-orange-bar-wrap">
          <div class="inv-orange-bar-left"></div>
          <div class="inv-orange-bar-text">INVOICE</div>
          <div class="inv-orange-bar-right"></div>
        </div>

        <!-- Invoice From and Invoice To Grid -->
        <div class="inv-parties-grid">
          <div class="inv-party-col">
            <h4>Invoice From:</h4>
            <div><strong>Company:</strong> ${escapeHTML(inv.fromCompany || inv.fromCompanyName || data.company?.name || "LET'S EXPLORE DMC")}</div>
            <div><strong>Email:</strong> ${escapeHTML(inv.fromEmail || data.company?.email || "letsexploredmc@gmail.com")}</div>
            <div><strong>Mobile No:</strong> ${escapeHTML(inv.fromMobile || inv.fromPhone || data.company?.phone || "8007586871")}</div>
            <div><strong>Address:</strong> ${escapeHTML(inv.fromAddress || data.company?.address || "Sahakar Nagar Opp New Cotton Market,Inside Shiv Krupa Residence,Amravati, Maharashtra, India, 444603").replace(/\n/g, '<br>')}</div>
            <div><strong>GST:</strong> ${escapeHTML(inv.fromGst || data.company?.gst || "27BVYPT1131M1ZT")}</div>
          </div>
          <div class="inv-party-col inv-party-to">
            <h4>Invoice To:</h4>
            <div><strong>Customer Name:</strong> ${escapeHTML(inv.toCustomerName || pkg.clientName || 'Valued Client')}</div>
            <div>${escapeHTML(inv.toCustomerAddress || pkg.clientAddress || 'Amravati, Maharashtra, India, 444603').replace(/\n/g, '<br>')}</div>
            ${(inv.toCustomerMobile || pkg.clientContact) ? `<div><strong>Mobile No:</strong> ${escapeHTML(inv.toCustomerMobile || pkg.clientContact)}</div>` : ''}
            ${(inv.toCustomerEmail || pkg.clientEmail) ? `<div><strong>Email:</strong> ${escapeHTML(inv.toCustomerEmail || pkg.clientEmail)}</div>` : ''}
          </div>
        </div>

        <!-- Invoice Detail Table -->
        <div class="inv-section-box">
          <div class="inv-sec-title">Invoice Detail</div>
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width:36px; text-align:center;">S/N</th>
                <th>Service</th>
                <th>Description</th>
                <th style="width:85px; text-align:center;">HSN No.</th>
                <th style="width:65px; text-align:center;">Quantity</th>
                <th style="width:110px; text-align:right;">Per Pax Price</th>
                <th style="width:110px; text-align:right;">Net Amount</th>
                <th style="width:115px; text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr>
                  <td style="text-align:center;">${escapeHTML(String(it.sn || (idx + 1)))}</td>
                  <td><strong>${escapeHTML(it.service || 'Service Item')}</strong></td>
                  <td>${escapeHTML(it.description || '')}</td>
                  <td style="text-align:center;">${escapeHTML(it.hsn || '')}</td>
                  <td style="text-align:center;">${escapeHTML(String(it.quantity || 1))}</td>
                  <td style="text-align:right;">INR ${fmtNum(it.perPaxPrice)}</td>
                  <td style="text-align:right;">INR ${fmtNum(it.netAmount)}</td>
                  <td style="text-align:right; font-weight:700;">INR ${fmtNum(it.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totals & Authorized Signature Block -->
        <div class="inv-totals-sig-grid">
          <div class="inv-sig-box">
            <div class="inv-sig-label">${escapeHTML(inv.authorizedSignatory || 'Authorized Signature')}</div>
            <div class="inv-sig-dots"></div>
          </div>
          <div class="inv-totals-box">
            <div class="inv-subtotal-row">
              <span>Sub Total / Taxable Amount</span>
              <strong>INR ${fmtNum(subTotal)}</strong>
            </div>
            ${inv.cgst ? `
              <div class="inv-subtotal-row" style="font-size:8pt; color:#64748B;">
                <span>CGST (2.5%)</span>
                <strong>INR ${fmtNum(inv.cgst)}</strong>
              </div>
            ` : ''}
            ${inv.sgst ? `
              <div class="inv-subtotal-row" style="font-size:8pt; color:#64748B;">
                <span>SGST (2.5%)</span>
                <strong>INR ${fmtNum(inv.sgst)}</strong>
              </div>
            ` : ''}
            <div class="inv-total-row">
              <span>Total Amount Payable</span>
              <strong>INR ${fmtNum(totalAmount)}</strong>
            </div>
          </div>
        </div>
              <strong>INR ${fmtNum(subTotal)}</strong>
            </div>
            <div class="inv-total-row">
              <span>Total Amount</span>
              <strong>INR ${fmtNum(totalAmount)}</strong>
            </div>
          </div>
        </div>

        <!-- Important Notes -->
        <div class="inv-section-box">
          <div class="inv-sec-title">Important Notes</div>
          <div style="padding:10px 12px; font-size:7.8pt; line-height:1.45; color:#334155; min-height:36px;">
            ${inv.importantNotes ? escapeHTML(inv.importantNotes).replace(/\n/g, '<br>') : ''}
          </div>
        </div>

        <!-- Bank Details -->
        <div class="inv-section-box">
          <div class="inv-sec-title">Bank Details</div>
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width:65px;">Qr Code</th>
                <th>Account Holder Name</th>
                <th>Bank Name</th>
                <th>Account No.</th>
                <th>IFSC Code</th>
                <th>Swift Code</th>
                <th>IBAN</th>
                <th>Branch</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center; color:#94A3B8;">—</td>
                <td><strong>${escapeHTML(inv.bankAccountHolder || "LETS EXPLORE DMC")}</strong></td>
                <td>${escapeHTML(inv.bankName || "YES BANK LIMITED")}</td>
                <td><strong>${escapeHTML(inv.bankAccountNo || "108163400004886")}</strong></td>
                <td>${escapeHTML(inv.bankIfsc || "YESB0001081")}</td>
                <td>${escapeHTML(inv.bankSwift || "")}</td>
                <td>${escapeHTML(inv.bankIban || "")}</td>
                <td>${escapeHTML(inv.bankBranch || "AMRAVATI")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Orange Footer Divider -->
        <div class="inv-orange-divider"></div>

        <!-- Company Address Line -->
        <div class="inv-footer-line">
          ${escapeHTML(inv.footerLine || "LET'S EXPLORE DMC| Sahakar Nagar Opp New Cotton Market,Inside Shiv Krupa Residence,Amravati Amravati, Maharashtra, India, 444603 | letsexploredmc@gmail.com| 8007586871")}
        </div>

        <!-- System Generated Disclaimer -->
        <div class="inv-disclaimer">
          ${escapeHTML(inv.disclaimer || "This Is a System-Generated Invoice; No Stamp Is Required.")}
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. FORMAT: CUSTOM MODULAR DOCUMENT (USER-ASSEMBLED)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderCustomDocument(data, isForPrint) {
    const pkg = data.package || {};
    const customDoc = data.customDocument || { title: 'Tailored Client Dossier', sections: [] };
    const hotels = data.hotels || [];
    const days = data.days || [];
    const summary = data.summary || { items: [], totalINR: 0, totalUSD: 0 };
    const offices = data.offices || [];
    const footer = data.footerSettings || {};
    const comp = data.company || pkg.company || ((typeof QuotationData !== 'undefined' && QuotationData.company) ? QuotationData.company : {});
    const themeStyles = getThemeStyles(data.themeSettings);

    return `
      <div class="dmc-quotation-doc doc-custom-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, customDoc.title || 'CUSTOM TRAVEL DOCUMENT', pkg.quoteRef, comp)}

        <!-- Dynamic Modular Section Loop -->
        <div class="custom-sections-flow">
          ${(customDoc.sections || []).length === 0 ? `
            <div class="dmc-empty-state">No sections added yet. Click "+ Add Section" in the Studio Custom Builder tab to construct your document.</div>
          ` : (customDoc.sections || []).map((sec, idx) => `
            <section class="dmc-section custom-sec-block" id="csec-${sec.id || idx}">
              <div class="dmc-section-header"><span>${escapeHTML(sec.title || 'Section')}</span></div>
              <div class="custom-sec-body">
                ${renderCustomSectionBody(sec, { pkg, hotels, days, summary, offices })}
              </div>
            </section>
          `).join('')}
        </div>

        ${renderContinuousFooter(footer, comp)}
      </div>
    `;
  }

  /**
   * Helper to render dynamic custom section content based on type
   */
  function renderCustomSectionBody(sec, context) {
    switch (sec.type) {
      case 'text':
        return `<p class="custom-rich-text">${escapeHTML(sec.content || '')}</p>`;
      case 'hotel':
        return `
          <div class="custom-hotels-table-box">
            <table class="voucher-table">
              <thead><tr><th>HOTEL</th><th>DATES</th><th>ROOM</th><th>TARIFF</th></tr></thead>
              <tbody>
                ${(context.hotels || []).map(h => `
                  <tr>
                    <td><strong>${escapeHTML(h.name)}</strong> (${escapeHTML(h.city || '')})</td>
                    <td>${escapeHTML(h.checkIn || '')} to ${escapeHTML(h.checkOut || '')}</td>
                    <td>${escapeHTML(h.roomType || 'Deluxe')}</td>
                    <td>${formatCurrencyINR(h.amountINR)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      case 'activity':
        return `
          <div class="custom-activities-box">
            ${(context.days || []).slice(0, 5).map((d, idx) => `
              <div style="margin-bottom:8px;">
                <strong>Day ${d.dayNumber || d.day || (idx + 1)}: ${escapeHTML(d.title)}</strong>
                <div style="font-size:12px; color:#475569;">${(d.items || []).map(i => i.title).join(' • ')}</div>
              </div>
            `).join('')}
          </div>
        `;
      case 'pricing':
        return `
          <table class="dmc-summary-table">
            <thead><tr><th>SUMMARY</th><th>INR</th><th>USD</th></tr></thead>
            <tbody>
              ${(context.summary?.items || []).map(i => `
                <tr><td>• ${escapeHTML(i.name)}</td><td>${formatCurrencyINR(i.amountINR)}</td><td>${formatCurrencyUSD(i.amountUSD)}</td></tr>
              `).join('')}
              <tr class="dmc-total-row"><td><strong>TOTAL</strong></td><td><strong>${formatCurrencyINR(context.summary?.totalINR)}</strong></td><td><strong>${formatCurrencyUSD(context.summary?.totalUSD)}</strong></td></tr>
            </tbody>
          </table>
        `;
      case 'office':
        return renderOfficesSection(context.offices || []);
      case 'signature':
        return `
          <div style="display:flex; justify-content:space-between; margin-top:20px; padding:15px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:6px;">
            <div><span>Prepared By:</span><br><strong>Let's Explore DMC Desk</strong></div>
            <div style="text-align:right;"><div style="width:140px; border-bottom:1px solid #1E293B; margin-bottom:4px;"></div><strong>Authorized Signature</strong></div>
          </div>
        `;
      case 'notes':
      default:
        return `<ul class="dmc-bullet-list"><li>All services reserved according to Let's Explore DMC master agreement.</li><li>Passports must carry at least 6 months validity from departure date.</li></ul>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SHARED RENDERING HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Day Pricing Card for Quotation format (4-column grid or 3-column when USD hidden)
   */
  function renderDayPricingCardHTML(day, showUsdColumn = true, idx = 0) {
    const rawNum = day.dayNumber != null ? day.dayNumber : (day.day != null ? day.day : null);
    const dayNum = (rawNum != null && String(rawNum).toLowerCase() !== 'undefined' && String(rawNum).trim() !== '') ? rawNum : (idx + 1);
    const items = day.items || [];
    const hasHotel = day.hotel && day.hotel.name && day.hotel.name.trim() !== '';

    return `
      <div class="dmc-day-card" id="day-card-${dayNum}">
        <div class="dmc-day-heading-bar">
          <div class="day-badge-col">
            <span class="day-pill">DAY ${dayNum}</span>
            <span class="day-sep-dot">·</span>
            <span class="day-date-text">${escapeHTML(day.date || '')}</span>
          </div>
          <div class="day-title-col">
            <span class="day-pipe">|</span>
            <span class="day-main-title">${escapeHTML(day.title || 'Itinerary Schedule')}</span>
          </div>
        </div>

        <div class="dmc-day-items-table">
          ${items.map(item => `
            <div class="dmc-item-row ${item.tag ? 'has-tag' : ''} ${!showUsdColumn ? 'no-usd-col' : ''}">
              <div class="item-desc-col">
                <div class="item-title-line">
                  <span class="item-bullet">•</span>
                  <span class="item-name">${escapeHTML(item.title)}</span>
                  ${item.tag ? renderTagBadge(item.tag) : ''}
                </div>
                ${item.subtitle ? `<div class="item-subtitle">${escapeHTML(item.subtitle)}</div>` : ''}
              </div>
              <div class="item-pax-col">${item.pax ? `<span class="col-val">${escapeHTML(item.pax)}</span>` : '<span class="col-val">—</span>'}</div>
              <div class="item-inr-col" style="${!showUsdColumn ? 'text-align:right;' : ''}">${item.amountINR ? `<span class="col-val">${formatCurrencyINR(item.amountINR)}</span>` : '<span class="col-val">—</span>'}</div>
              ${showUsdColumn ? `<div class="item-usd-col">${item.amountUSD ? `<span class="col-val">${formatCurrencyUSD(item.amountUSD)}</span>` : '<span class="col-val">—</span>'}</div>` : ''}
            </div>
          `).join('')}
        </div>

        ${hasHotel ? `
        <div class="dmc-hotel-row ${day.hotel.amountINR ? 'has-price' : ''} ${!showUsdColumn ? 'no-usd-col' : ''}">
          <div class="item-desc-col">
            <div class="hotel-name-line">
              <span class="hotel-label">Hotel :</span>
              <strong class="hotel-title">${escapeHTML(day.hotel.name)}</strong>
              ${day.hotel.dates ? `<span class="hotel-stay-dates">( ${escapeHTML(day.hotel.dates)} )</span>` : ''}
            </div>
            ${(day.hotel.roomType || day.hotel.mealPlan || day.hotel.notes) ? `
            <div class="hotel-sub-details">
              ${day.hotel.roomType ? `<span class="hotel-pill">🛏️ ${escapeHTML(day.hotel.roomType)}</span>` : ''}
              ${day.hotel.mealPlan ? `<span class="hotel-pill">☕ ${escapeHTML(day.hotel.mealPlan)}</span>` : ''}
              ${day.hotel.notes ? `<span class="hotel-note-text">${escapeHTML(day.hotel.notes)}</span>` : ''}
            </div>` : ''}
          </div>
          <div class="item-pax-col">${day.hotel.amountINR ? `<span class="col-val">${day.hotel.pax || 2}</span>` : ''}</div>
          <div class="item-inr-col" style="${!showUsdColumn ? 'text-align:right;' : ''}">${day.hotel.amountINR ? `<span class="col-val">${formatCurrencyINR(day.hotel.amountINR)}</span>` : ''}</div>
          ${showUsdColumn ? `<div class="item-usd-col">${day.hotel.amountUSD ? `<span class="col-val">${formatCurrencyUSD(day.hotel.amountUSD)}</span>` : ''}</div>` : ''}
        </div>` : ''}

        ${day.dayNotes ? `
        <div class="dmc-day-footnote">
          <span class="fn-icon">ℹ️</span>
          <span class="fn-text">${escapeHTML(day.dayNotes)}</span>
        </div>` : ''}
      </div>
    `;
  }

  /**
   * Offices & Global Desks Section
   */
  function renderOfficesSection(offices = []) {
    return `
      <section class="dmc-section dmc-offices-section">
        <div class="dmc-section-header"><span>Global Desks & Worldwide Support</span></div>
        <div class="dmc-offices-grid">
          ${offices.map(off => `
            <div class="dmc-office-card">
              <h4 class="office-name">${escapeHTML(off.name)}</h4>
              ${off.company ? `<div class="office-company">${escapeHTML(off.company)}</div>` : ''}
              ${off.contactPerson ? `<div class="office-person">${escapeHTML(off.contactPerson)}</div>` : ''}
              ${off.phone ? `<div class="office-phone">☎ ${escapeHTML(off.phone)}</div>` : ''}
              ${off.email ? `<div class="office-email">✉ ${escapeHTML(off.email)}</div>` : ''}
              ${off.address ? `<div class="office-address">📍 ${escapeHTML(off.address)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  /**
   * Subtle tag badge renderer matching the reference
   */
  function renderTagBadge(tag) {
    if (!tag) return '';
    let badgeClass = 'tag-subtle';
    const lower = tag.toLowerCase();

    if (lower.includes('meals not included')) badgeClass = 'tag-meals';
    else if (lower.includes('personal expense')) badgeClass = 'tag-expense';
    else if (lower.includes('national park') || lower.includes('included')) badgeClass = 'tag-included';
    else if (lower.includes('leisure') || lower.includes('free time')) badgeClass = 'tag-leisure';

    return `<span class="dmc-tag-badge ${badgeClass}">${escapeHTML(tag)}</span>`;
  }

  /**
   * Escape HTML to prevent injection and rendering bugs
   */
  function escapeHTML(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 8. FORMAT: RAJASTHAN LAND PACKAGE QUOTATION (Match Screenshot 5)
   * High-fidelity A4 document matching Let's Explore DMC Land Package standards:
   * - 4-color top accent stripe
   * - Brand logo & "CAPTURING YOUR DREAMS" + "LAND PACKAGE QUOTATION" subtitle
   * - 4-column Check-in / Check-out / Duration / Travellers metadata box
   * - Package Pricing USD table with Per Adult and Total Package Cost
   * - Hotel Details with blue header bars for Phuket & Krabi
   * - Transportation table with day-wise transfers & tours
   * - Package Inclusions bullet list
   */
  function renderRajasthanLandPackageDocument(data, isForPrint) {
    const pkg = data.package || {};
    const comp = data.company || {};
    const brandName = comp.name || "Let's Explore DMC";
    const brandTagline = comp.tagline || "Capturing Your Dreams";
    const brandLogo = comp.logo || "images/logo.png";
    const footer = data.footerSettings || {};

    const checkIn = pkg.checkIn || pkg.startDate || '10 Dec 2026';
    const checkOut = pkg.checkOut || pkg.endDate || '15 Dec 2026';
    const duration = pkg.duration || '5 Nights / 6 Days';
    const travellers = pkg.travellers || '2 Adults';
    const title = pkg.title || pkg.destinations || 'Phuket + Krabi';
    const subTitle = pkg.subtitle || `${duration} · Hotels + Private Transfers + Tours`;

    const hasDecoration = !!(pkg.withDecoration || pkg.decorationIncluded || (pkg.pricingNote && pkg.pricingNote.toLowerCase().includes('decoration')));
    const isEur = pkg.currency === 'EUR' || (data.pricing && data.pricing.currency === 'EUR');
    const currSym = isEur ? '€' : (pkg.currency === 'INR' ? '₹' : '$');
    const currHeader = isEur ? 'RATE (EUR €)' : (pkg.currency === 'INR' ? 'RATE (INR ₹)' : 'RATE (USD $)');
    const ratePerAdult = Number(pkg.ratePerAdultUSD || (pkg.pricing_usd ? pkg.pricing_usd : (data.pricing?.perPersonUSD || (data.pricing?.perPerson && (pkg.currency === 'USD' || data.pricing?.currency === 'USD' || isEur) ? data.pricing.perPerson : 0))) || 632.88);
    const totalCostUSD = Number(pkg.totalCostUSD || (data.pricing?.grandTotalUSD ? data.pricing.grandTotalUSD : (data.pricing?.grandTotal ? data.pricing.grandTotal : (ratePerAdult * 2))));
    const pricingDesc = pkg.pricingDescription || `Per Adult - Twin / double sharing, hotels + private transfers + tours + meals as mentioned${hasDecoration ? ' <strong>(with decoration)</strong>' : ''}`;

    return `
      <div class="dmc-quotation-doc doc-rajasthan-land-package ${isForPrint ? 'is-print-mode' : ''}" style="background:#FFFFFF; font-family:'Inter', -apple-system, sans-serif; color:#1E293B; line-height:1.5; width:100%; min-height:1123px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
        <!-- Top Colored Stripe (Green, Yellow, Blue, Red) -->
        <div style="height:5px; width:100%; display:flex;">
          <div style="flex:1; background:#4CAF50;"></div>
          <div style="flex:1; background:#FFC107;"></div>
          <div style="flex:1; background:#2196F3;"></div>
          <div style="flex:1; background:#F44336;"></div>
        </div>

        <!-- Document Header matching Screenshot 5 -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:18px 20px 12px 20px; border-bottom:1px solid #F1F5F9; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
            <img src="${escapeHTML(brandLogo)}" alt="${escapeHTML(brandName)}" style="height:48px; object-fit:contain;" onerror="this.src='images/logo.png'" />
            <div>
              <div style="font-size:15px; font-weight:800; color:#0F2C59; letter-spacing:-0.2px;">${escapeHTML(brandName)}</div>
              <div style="font-size:10px; font-weight:700; color:#E67E22; letter-spacing:0.8px; text-transform:uppercase;">${escapeHTML(brandTagline)}</div>
            </div>
          </div>
          <div style="text-align:right; flex:1; min-width:220px; word-break:break-word;">
            <div style="color:#E67E22; font-size:11px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase;">LAND PACKAGE QUOTATION</div>
            <div style="color:#0F2C59; font-size:clamp(16px, 2.2vw, 22px); font-weight:800; line-height:1.2; margin:2px 0 2px 0;">${escapeHTML(title)}</div>
            <div style="color:#64748B; font-size:11.5px; font-weight:600;">${escapeHTML(subTitle)}</div>
          </div>
        </div>

        <!-- 4-Column Metadata Table -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:1px; background:#CBD5E1; margin:12px 18px; border:1px solid #CBD5E1; border-radius:5px; overflow:hidden;">
          <div style="background:#F8FAFC; padding:7px 9px;">
            <div style="font-size:9px; font-weight:700; color:#64748B; text-transform:uppercase;">CHECK-IN</div>
            <div style="font-size:11.5px; font-weight:700; color:#0F2C59;">${escapeHTML(checkIn)}</div>
          </div>
          <div style="background:#F8FAFC; padding:7px 9px;">
            <div style="font-size:9px; font-weight:700; color:#64748B; text-transform:uppercase;">CHECK-OUT</div>
            <div style="font-size:11.5px; font-weight:700; color:#0F2C59;">${escapeHTML(checkOut)}</div>
          </div>
          <div style="background:#F8FAFC; padding:7px 9px;">
            <div style="font-size:9px; font-weight:700; color:#64748B; text-transform:uppercase;">DURATION</div>
            <div style="font-size:11.5px; font-weight:700; color:#0F2C59;">${escapeHTML(duration)}</div>
          </div>
          <div style="background:#F8FAFC; padding:7px 9px;">
            <div style="font-size:9px; font-weight:700; color:#64748B; text-transform:uppercase;">TRAVELLERS</div>
            <div style="font-size:11.5px; font-weight:700; color:#0F2C59;">${escapeHTML(travellers)}</div>
          </div>
        </div>

        <!-- Package Pricing Section -->
        <div style="margin:14px 18px;">
          <h3 style="font-size:13.5px; font-weight:800; color:#0F2C59; margin-bottom:6px;">Package Pricing</h3>
          <table style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid #CBD5E1; border-radius:4px; overflow:hidden; table-layout:auto;">
            <thead>
              <tr style="background:#0F2C59; color:#FFFFFF;">
                <th style="padding:8px 12px; text-align:left; font-size:11px; font-weight:700; letter-spacing:0.5px;">DESCRIPTION</th>
                <th style="padding:8px 12px; text-align:right; font-size:11px; font-weight:800; width:135px; min-width:110px; white-space:nowrap; background:#0B2244;">${currHeader}</th>
              </tr>
            </thead>
            <tbody>
              ${(pkg.pricingRows && Array.isArray(pkg.pricingRows) && pkg.pricingRows.length > 0) ? `
                ${pkg.pricingRows.map(row => `
                  <tr style="border-bottom:1px solid #E2E8F0; background:#FFF;">
                    <td style="padding:10px 12px; color:#334155; line-height:1.4;">
                      ${escapeHTML(row.description)}${hasDecoration ? ' <strong>(with decoration)</strong>' : ''}
                    </td>
                    <td style="padding:10px 12px; text-align:right; font-weight:800; color:#0F2C59; font-size:13px; white-space:nowrap;">
                      ${row.isFoc ? '<span style="color:#059669; font-weight:800;">Free of Charge (FOC)</span>' : (`${currSym} ` + Number(row.rateUSD || row.rate || 0).toFixed(2))}
                    </td>
                  </tr>
                `).join('')}
              ` : `
                <tr style="border-bottom:1px solid #E2E8F0; background:#FFF;">
                  <td style="padding:10px 12px; color:#334155; line-height:1.4;">${pricingDesc}</td>
                  <td style="padding:10px 12px; text-align:right; font-weight:800; color:#0F2C59; font-size:13px; white-space:nowrap;">${currSym} ${Number(ratePerAdult).toFixed(2)}</td>
                </tr>
                ${pkg.ratePerChildUSD ? `
                  <tr style="border-bottom:1px solid #E2E8F0; background:#FFF;">
                    <td style="padding:10px 12px; color:#334155; line-height:1.4;">${pkg.childPricingDescription || 'Per Child (4Y) - Transfers & Tours with Insurance'}</td>
                    <td style="padding:10px 12px; text-align:right; font-weight:800; color:#0F2C59; font-size:13px; white-space:nowrap;">${currSym} ${Number(pkg.ratePerChildUSD).toFixed(2)}</td>
                  </tr>
                ` : ''}
                ${pkg.hasInfantFoc ? `
                  <tr style="border-bottom:1px solid #E2E8F0; background:#FFF;">
                    <td style="padding:10px 12px; color:#334155; line-height:1.4;">Infant (Under 2 Years) - Free of Charge (FOC)</td>
                    <td style="padding:10px 12px; text-align:right; font-weight:800; color:#059669; font-size:13px; white-space:nowrap;">Free (FOC)</td>
                  </tr>
                ` : ''}
              `}
              <tr style="background:#F8FAFC; font-weight:800; border-top:2px solid #CBD5E1;">
                <td style="padding:10px 12px; color:#0F2C59; font-size:12.5px;">TOTAL PACKAGE COST</td>
                <td style="padding:10px 12px; text-align:right; color:#059669; font-size:14.5px; font-weight:900; white-space:nowrap;">${currSym} ${Number(totalCostUSD).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div style="font-size:10px; color:#94A3B8; font-style:italic; margin-top:4px;">Domestic / international air fare is not included. Expressway toll and parking fees are not included.</div>
        </div>

        <!-- Hotel Details Section -->
        <div style="margin:14px 18px;">
          <h3 style="font-size:13.5px; font-weight:800; color:#0F2C59; margin-bottom:8px;">Hotel Details</h3>
          ${(data.hotels && Array.isArray(data.hotels) && data.hotels.length > 0) ? `
            ${data.hotels.map((h, hIdx) => `
              <div style="border:1px solid #CBD5E1; border-radius:4px; margin-bottom:8px; overflow:hidden;">
                <div style="background:#0F2C59; color:#FFF; padding:6px 12px; font-size:11.5px; font-weight:700; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                  <span>${escapeHTML((h.nightsText || `${h.nights || 2} Nights – ${h.city || 'Phuket'}`).replace(/&ndash;/g, '–'))}</span>
                  <span>${escapeHTML(h.checkIn ? `Check-in: ${h.checkIn}` : `Stay Dates: ${h.dates || 'As per voucher'}`)}</span>
                </div>
                <div style="padding:10px 12px; background:#FFF;">
                  <div style="font-weight:700; color:#0F2C59; font-size:13px;">${escapeHTML(h.name)}</div>
                  <div style="font-size:11.5px; color:#64748B; margin-top:2px;">
                    ${escapeHTML((h.roomType || h.mealPlan || h.notes || 'Accommodation arranged as per voucher').replace(/&ndash;/g, '–'))}
                  </div>
                </div>
              </div>
            `).join('')}
          ` : `
            <!-- Fallback standard hotels -->
            <div style="border:1px solid #CBD5E1; border-radius:4px; margin-bottom:8px; overflow:hidden;">
              <div style="background:#0F2C59; color:#FFF; padding:6px 12px; font-size:11.5px; font-weight:700; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                <span>1st, 2nd &amp; 3rd Nights – Phuket</span>
                <span>Check-in: 10 Dec 2026</span>
              </div>
              <div style="padding:10px 12px; background:#FFF;">
                <div style="font-weight:700; color:#0F2C59; font-size:13px;">Ashlee Plaza Hotel, Phuket</div>
                <div style="font-size:11.5px; color:#64748B; margin-top:2px;">Breakfast + Buffet Dinner &bull; 1 Superior Room (2 Adults)</div>
              </div>
            </div>
            <div style="border:1px solid #CBD5E1; border-radius:4px; overflow:hidden;">
              <div style="background:#0F2C59; color:#FFF; padding:6px 12px; font-size:11.5px; font-weight:700; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                <span>4th &amp; 5th Nights – Krabi (Ao Nang)</span>
                <span>Check-in: 13 Dec 2026</span>
              </div>
              <div style="padding:10px 12px; background:#FFF;">
                <div style="font-weight:700; color:#0F2C59; font-size:13px;">GLOW Ao Nang Krabi</div>
                <div style="font-size:11.5px; color:#64748B; margin-top:2px;">Breakfast + Buffet Dinner &bull; 1 Superior Room (2 Adults)</div>
              </div>
            </div>
          `}
        </div>

        <!-- Transportation Section -->
        <div style="margin:14px 18px;">
          <h3 style="font-size:13.5px; font-weight:800; color:#0F2C59; margin-bottom:8px;">Transportation – Private car &amp; boat transfers as per itinerary</h3>
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; border:1px solid #CBD5E1; border-radius:4px; overflow:hidden;">
            <tbody>
              ${(pkg.transferRows && Array.isArray(pkg.transferRows) && pkg.transferRows.length > 0) ? `
                ${pkg.transferRows.map((t, idx) => `
                  <tr style="border-bottom:1px solid #E2E8F0; background:${idx % 2 === 0 ? '#FFF' : '#F8FAFC'};">
                    <td style="padding:8px 12px; font-weight:700; color:#0F2C59; width:145px; white-space:nowrap;">${escapeHTML((t.leg || `Leg ${idx + 1}`).replace(/&ndash;/g, '–'))}</td>
                    <td style="padding:8px 12px; color:#334155;">${escapeHTML(t.description.replace(/&ndash;/g, '–'))}</td>
                  </tr>
                `).join('')}
              ` : (data.days && Array.isArray(data.days) && data.days.length > 0 && data.days.some(d => d.items && d.items.length > 0)) ? `
                ${data.days.map((d, idx) => `
                  <tr style="border-bottom:1px solid #E2E8F0; background:${idx % 2 === 0 ? '#FFF' : '#F8FAFC'};">
                    <td style="padding:8px 12px; font-weight:700; color:#0F2C59; width:145px; white-space:nowrap;">Day ${d.dayNumber || idx + 1} – ${escapeHTML((d.date || '').replace(/&ndash;/g, '–'))}</td>
                    <td style="padding:8px 12px; color:#334155;">${escapeHTML((d.title + (d.items && d.items.length ? ': ' + d.items.map(it => it.title).join('; ') : '')).replace(/&ndash;/g, '–'))}</td>
                  </tr>
                `).join('')}
              ` : `
                <tr style="border-bottom:1px solid #E2E8F0; background:#FFF;">
                  <td style="padding:8px 12px; font-weight:700; color:#0F2C59; width:135px; white-space:nowrap;">Day 1 – Thu, 10 Dec</td>
                  <td style="padding:8px 12px; color:#334155;">Phuket Airport to Ashlee Plaza Hotel – Private transfer</td>
                </tr>
                <tr style="border-bottom:1px solid #E2E8F0; background:#F8FAFC;">
                  <td style="padding:8px 12px; font-weight:700; color:#0F2C59; white-space:nowrap;">Day 2 – Fri, 11 Dec</td>
                  <td style="padding:8px 12px; color:#334155;">Phi Phi Island + Khai Island + Pileh + Maya Bay by Speedboat (lunch + NPF included)</td>
                </tr>
                <tr style="border-bottom:1px solid #E2E8F0; background:#FFF;">
                  <td style="padding:8px 12px; font-weight:700; color:#0F2C59; white-space:nowrap;">Day 3 – Sat, 12 Dec</td>
                  <td style="padding:8px 12px; color:#334155;">James Bond Island tour by Big Boat (lunch + NPF included)</td>
                </tr>
                <tr style="border-bottom:1px solid #E2E8F0; background:#F8FAFC;">
                  <td style="padding:8px 12px; font-weight:700; color:#0F2C59; white-space:nowrap;">Day 4 – Sun, 13 Dec</td>
                  <td style="padding:8px 12px; color:#334155;">Phuket to Krabi (Ashlee Plaza to GLOW Ao Nang) by car + Krabi City tour</td>
                </tr>
                <tr style="border-bottom:1px solid #E2E8F0; background:#FFF;">
                  <td style="padding:8px 12px; font-weight:700; color:#0F2C59; white-space:nowrap;">Day 5 – Mon, 14 Dec</td>
                  <td style="padding:8px 12px; color:#334155;">4 Island Tour by Long Tail Boat (lunch + NPF included)</td>
                </tr>
                <tr style="background:#F8FAFC;">
                  <td style="padding:8px 12px; font-weight:700; color:#0F2C59; white-space:nowrap;">Day 6 – Tue, 15 Dec</td>
                  <td style="padding:8px 12px; color:#334155;">GLOW Ao Nang Krabi to Phuket Airport – Private transfer</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- Package Inclusions Section -->
        <div style="margin:14px 18px 20px 18px;">
          <h3 style="font-size:13.5px; font-weight:800; color:#0F2C59; margin-bottom:8px;">Package Inclusions</h3>
          <ul style="margin:0; padding-left:18px; font-size:11.5px; color:#334155; line-height:1.65;">
            <li>Private transfers by car as specified in the itinerary</li>
            <li>Accommodation in Superior rooms (twin / double sharing) as mentioned</li>
            <li>Daily breakfast at the hotel; buffet dinner on Days 1–5; buffet lunch on Day 6 (departure)</li>
            <li>Lunch on all sea tour days (Day 2, Day 3 and Day 5)</li>
            <li>Sea tours as per itinerary: Phi Phi / Khai / Pileh / Maya Bay speedboat tour, James Bond Island big boat tour, 4 Island tour</li>
            <li>Krabi City Tour by car (6 hrs)</li>
            <li>All entrance fees and National Park Fee (NPF) for the tours mentioned</li>
          </ul>
        </div>

        ${renderContinuousFooter(footer, comp)}
      </div>
    `;
  }

  /**
   * 8. FORMAT: VILLA NAUTICA PARADISE ISLAND — SPECIAL DINING EXPERIENCES & CANDLE LIGHT MENUS
   * Luxury beachfront dining brochure with itemized course menus, doubled tariffs, and decoration included.
   */
  function renderDiningMenuDocument(data, isForPrint) {
    const pkg = data.package || {};
    const comp = data.company || {};
    const brandName = comp.name || "Let's Explore DMC";
    const brandTagline = comp.tagline || "Your Destination Management Specialist";
    const brandLogo = comp.logo || "images/logo.png";
    const footer = data.footerSettings || {};

    const packages = [
      {
        id: 'cld',
        title: 'CANDLE LIGHT DINNER AT THE BEACH',
        subtitle: 'Romantic Sunset Oceanfront Dining Under Canopy',
        originalRate: '$200++',
        doubledRate: '$400++',
        decoration: 'Included',
        rateUSD: 400,
        rateINR: 35000,
        courses: [
          { name: 'Appetizer (Amuse-Bouche)', desc: 'Smoked Salmon mille feuille OR Prosciutto di Parma & sweet melon' },
          { name: 'Second Course', desc: 'Beef Carpaccio, Rockette & Shaved Parmesan' },
          { name: 'Palate Cleanser', desc: 'Lime Sorbet with a hint of Beetle Nut' },
          { name: 'Main Course', desc: 'Grilled Lobster with Lemon & Herb butter, Mixed green salad' },
          { name: 'Dessert', desc: 'Mango & Passion fruit Parfait' }
        ]
      },
      {
        id: 'digin',
        title: 'DIG-IN DINNER BY THE BEACH',
        subtitle: 'Exclusive Dug-In Beach Sand Lounge with Ambient Lanterns',
        originalRate: '$244++',
        doubledRate: '$488++',
        decoration: 'Included',
        rateUSD: 488,
        rateINR: 42700,
        courses: [
          { name: 'Selection One', desc: 'Appetizer: Mixed Salad | Soup: Boston Seafood Chowder | Main Course: Islander Seafood Platter | Dessert: Imperial Cheesecake' },
          { name: 'Selection Two', desc: 'Appetizer: Smoked Chicken Breast Delight | Soup: Hot & Sour Soup | Main Course: Cantonese Style Steamed Salmon | Dessert: Chinese Pancake' }
        ]
      },
      {
        id: 'seafood',
        title: 'SEAFOOD LUNCH — ADVENTURE ON THE SEA',
        subtitle: 'Lagoon In-Water Dining Experience with Parasol & Butler Service',
        originalRate: 'From $128++ to $161++',
        doubledRate: '$256++ to $322++',
        decoration: 'Included',
        rateUSD: 322,
        rateINR: 28175,
        courses: [
          { name: 'Selection One ($322++ with decoration / was $161++)', desc: 'Appetizer: Mixed green salad with grilled marinated prawn & mussel | Soup: Cream of vegetables | Main: Paradise seafood platter (Grilled lobster, red snapper, prawn tempura, calamari) | Dessert: Lost pear in paradise' },
          { name: 'Selection Two ($256++ with decoration / was $128++)', desc: 'Appetizer: Paradise prawn cocktail | Soup: Creamy leek & potato | Main: Traditional mixed grill (Beef fillet, lamb chop, chicken leg, lamb skewer) | Dessert: Fresh tropical fruits with lime sherbet' },
          { name: 'Selection Three ($288++ with decoration / was $144++)', desc: 'Appetizer: Louvi crab cake | Soup: Asian Bouillabaisse | Main: Surf & Turf (Beef tenderloin + lobster tail with basil mashed potato) | Dessert: Trio of sweet (Crème brûlée tart & pistachio ice cream)' }
        ]
      },
      {
        id: 'veg',
        title: 'VEGETARIAN CANDLE LIGHT DINNER',
        subtitle: 'Exquisite Gourmet Plant-Based 4-Course Candlelight Menu',
        originalRate: '$170++',
        doubledRate: '$340++',
        decoration: 'Included',
        rateUSD: 340,
        rateINR: 29750,
        courses: [
          { name: 'Appetizer', desc: 'Duo of vegetable spring roll & cream cheese olive bruschetta' },
          { name: 'Soup', desc: 'Cream of young asparagus soup with herb oil & roasted pimento' },
          { name: 'Main Course', desc: 'Assorted Vegetarian Combo (Mexican vegetable quesadilla, pasta vegetariana, Indian stuffed vegetable rotti, oriental stir fry vegetables) served with steamed rice & Caesar Salad' },
          { name: 'Dessert', desc: 'Tropical fresh fruit platter' }
        ]
      },
      {
        id: 'oriental',
        title: 'ORIENTAL NIGHT EXPERIENCE',
        subtitle: 'Bedouin Style Arabian Beach Cabana with Shisha & Ambient Lights',
        originalRate: '$244++',
        doubledRate: '$488++',
        decoration: 'Included',
        rateUSD: 488,
        rateINR: 42700,
        courses: [
          { name: 'Selection One (Arabian Night Mixed Grill)', desc: 'Oriental cold & hot mezza | Shourbot adddas soup | Mixed grilled: Samaka Hana, Arabic daiai alfaham, Rubian Machous, Bahmia bil laham | Maha labia & Umm Ali' },
          { name: 'Selection Two (Oriental Kebab & Seafood)', desc: 'Oriental cold & hot mezza | Shourbot adddas soup | Oriental mixed Kebab: Sayadiah, Iraqi baked chicken tepsi, Robeyan Nashif, Fasolia bil laham | Kataif Asferi with Pistachio ice cream & Umm Ali' }
        ]
      },
      {
        id: 'bbq',
        title: 'PRIVATE BBQ ON THE BEACH',
        subtitle: 'Live Beach Grill Station with Dedicated Private Chef & Butler',
        originalRate: '$184++',
        doubledRate: '$368++',
        decoration: 'Included',
        rateUSD: 368,
        rateINR: 32200,
        courses: [
          { name: 'Selection 1 (Seafood BBQ)', desc: 'Appetizer: Salad & Bread | Soup: Tomato or French Onion | Main: BBQ Prawns, Fish & Lobster, Potato & Vegetables, Steamed Rice | Dessert: Sweets & Fruits' },
          { name: 'Selection 2 (Steak & Mussel)', desc: 'Appetizer: Salad & Bread | Pasta: Napolitan Tonno or Peperoncino | Main: BBQ Steak, Mussel & Scampi | Dessert: Sweets & Fruits' },
          { name: 'Selection 3 (Chicken & Lamb)', desc: 'Appetizer: Salad & Bread | Pasta: Seafood, Cheese or Veg Risotto | Main: BBQ Chicken, Lamb Saute\' & Lobster | Dessert: Sweets & Fruits' },
          { name: 'Selection 4 (Mixed Meat Grill)', desc: 'Appetizer: Salad & Bread | Soup: Asparagus or Tom Yam | Main: BBQ Steak, Chicken Drumsticks, Sausages & Lamb Kebab | Dessert: Sweets & Fruits' }
        ]
      },
      {
        id: 'crows',
        title: 'CROW\'S NEST — OVER THE OCEAN DINNER',
        subtitle: 'Elevated Starlit Tower Dining with 360° Panoramic Lagoon Views',
        originalRate: '$198++',
        doubledRate: '$396++',
        decoration: 'Included',
        rateUSD: 396,
        rateINR: 34650,
        courses: [
          { name: 'Menu Option I (Seafood & Lobster)', desc: 'Appetizer: Roma Tomatoes & Marinated Mozzarella | Soup: Seafood Miso Soup & Tuna Maki Roll | Main: Surf & Turf OR Lobster Thermidor | Dessert: Classic Tiramisu OR Lemon Cheesecake' },
          { name: 'Menu Option II (Indian Royal Cuisine)', desc: 'Appetizer: Papadam, Pickle, Mint Chutney, Masala Buttermilk, Tandoori Chicken Salad | Soup: Cream of Tomato Soup with Cream Cheese | Main: Paneer Butter Masala, Jeera Aloo, Tarka Dal, Roti, Raita, Samosa, Jeera Rice OR Chicken Curry & Lamb Korma | Dessert: Sampler Platter (Warm gulab jamun, saffron kheer & mango halwa)' }
        ]
      }
    ];

    return `
      <div class="dmc-quotation-doc doc-villa-nautica-dining ${isForPrint ? 'is-print-mode' : ''}" style="background:#FFFFFF; font-family:'Inter', -apple-system, sans-serif; color:#1E293B; line-height:1.5; width:100%; min-height:1123px; box-sizing:border-box; padding:0;">
        <!-- Top Luxury Brand Stripe -->
        <div style="height:6px; width:100%; background:linear-gradient(90deg, #0F2C59 0%, #1E3A8A 35%, #D97706 70%, #F59E0B 100%);"></div>

        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:24px 30px 16px 30px; border-bottom:1px solid #E2E8F0; background:#FAFAFA;">
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="${escapeHTML(brandLogo)}" alt="${escapeHTML(brandName)}" style="height:58px; object-fit:contain;" onerror="this.src='images/logo.png'" />
            <div>
              <div style="font-size:18px; font-weight:800; color:#0F2C59; letter-spacing:-0.2px;">${escapeHTML(brandName)}</div>
              <div style="font-size:11px; font-weight:700; color:#D97706; letter-spacing:0.8px; text-transform:uppercase;">${escapeHTML(brandTagline)}</div>
              <div style="font-size:11px; color:#64748B; margin-top:2px;"><i class="fa-solid fa-phone" style="font-size:10px;"></i> +91 80075 86881 | bookings@letsexploredmc.com</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="color:#D97706; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase;">RESORT DINING QUOTATION</div>
            <div style="color:#0F2C59; font-size:24px; font-weight:900; line-height:1.2; margin:2px 0;">VILLA NAUTICA</div>
            <div style="color:#64748B; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Paradise Island · Maldives</div>
          </div>
        </div>

        <!-- Title Banner with Decoration Badge -->
        <div style="background:linear-gradient(135deg, #0F2C59 0%, #1E3A8A 100%); color:#FFFFFF; padding:18px 30px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <h1 style="margin:0; font-size:20px; font-weight:800; letter-spacing:-0.2px;">CANDLE LIGHT & SPECIAL BEACH DINING EXPERIENCES</h1>
            <p style="margin:3px 0 0 0; font-size:12px; color:#FDE68A;">Official Tariff & Multi-Course Menu Brochure · Rates Doubled as Instructed</p>
          </div>
          <div style="background:#D97706; color:#FFFFFF; font-weight:800; font-size:12px; padding:6px 14px; border-radius:20px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
            <i class="fa-solid fa-wand-magic-sparkles"></i> WITH DECORATION INCLUDED
          </div>
        </div>

        <!-- Key Resort Metadata Table -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1px; background:#CBD5E1; margin:16px 30px; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden;">
          <div style="background:#F8FAFC; padding:10px 14px;">
            <div style="font-size:10px; font-weight:700; color:#64748B; text-transform:uppercase;">RESORT PROPERTY</div>
            <div style="font-size:13px; font-weight:800; color:#0F2C59; margin-top:2px;">Villa Nautica, Maldives</div>
          </div>
          <div style="background:#F8FAFC; padding:10px 14px;">
            <div style="font-size:10px; font-weight:700; color:#64748B; text-transform:uppercase;">PRICING BASIS</div>
            <div style="font-size:13px; font-weight:800; color:#0F2C59; margin-top:2px;">Per Couple (2 Adults)</div>
          </div>
          <div style="background:#F8FAFC; padding:10px 14px;">
            <div style="font-size:10px; font-weight:700; color:#64748B; text-transform:uppercase;">DECORATION STATUS</div>
            <div style="font-size:13px; font-weight:800; color:#059669; margin-top:2px;"><i class="fa-solid fa-check"></i> Fully Included</div>
          </div>
          <div style="background:#F8FAFC; padding:10px 14px;">
            <div style="font-size:10px; font-weight:700; color:#64748B; text-transform:uppercase;">TAXES & SERVICE</div>
            <div style="font-size:13px; font-weight:800; color:#0F2C59; margin-top:2px;">++ (10% SC & 17% TGST)</div>
          </div>
        </div>

        <!-- Master Rates Summary Table -->
        <div style="margin:16px 30px;">
          <div style="font-size:14px; font-weight:800; color:#0F2C59; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-list-check" style="color:#D97706;"></i> Dining Experiences & Tariffs Summary (With Decoration)
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden;">
            <thead>
              <tr style="background:#0F2C59; color:#FFFFFF; text-align:left;">
                <th style="padding:9px 12px; font-weight:700;">DINING EXPERIENCE / MENU</th>
                <th style="padding:9px 12px; font-weight:700; text-align:center;">SUPPLIER BASE</th>
                <th style="padding:9px 12px; font-weight:700; text-align:center; background:#1E3A8A;">DOUBLED RATE (USD++)</th>
                <th style="padding:9px 12px; font-weight:700; text-align:center;">APPROX (INR)</th>
                <th style="padding:9px 12px; font-weight:700; text-align:center;">DECORATION</th>
              </tr>
            </thead>
            <tbody>
              ${packages.map((pkgItem, pIdx) => `
                <tr style="background:${pIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; border-bottom:1px solid #E2E8F0;">
                  <td style="padding:9px 12px; font-weight:700; color:#0F2C59;">
                    ${escapeHTML(pkgItem.title)}
                    <div style="font-size:10.5px; font-weight:500; color:#64748B;">${escapeHTML(pkgItem.subtitle)}</div>
                  </td>
                  <td style="padding:9px 12px; text-align:center; color:#94A3B8; text-decoration:line-through;">${escapeHTML(pkgItem.originalRate)}</td>
                  <td style="padding:9px 12px; text-align:center; font-weight:800; color:#059669; font-size:13px; background:#F0FDF4;">
                    ${escapeHTML(pkgItem.doubledRate)}
                    <span style="display:block; font-size:9.5px; color:#059669; font-weight:700;">per couple with decoration</span>
                  </td>
                  <td style="padding:9px 12px; text-align:center; font-weight:700; color:#1E293B;">₹ ${pkgItem.rateINR.toLocaleString()}</td>
                  <td style="padding:9px 12px; text-align:center; font-weight:700; color:#D97706;">
                    <span style="background:#FEF3C7; padding:3px 8px; border-radius:4px; font-size:10px;"><i class="fa-solid fa-wand-magic-sparkles"></i> with decoration</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Detailed Menu Cards for Every Experience -->
        <div style="margin:20px 30px;">
          <div style="font-size:14px; font-weight:800; color:#0F2C59; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-utensils" style="color:#D97706;"></i> Detailed Multi-Course Menus & Inclusions
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap:14px;">
            ${packages.map(pkgItem => `
              <div style="border:1px solid #CBD5E1; border-radius:8px; overflow:hidden; background:#FFFFFF; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="background:#0F2C59; color:#FFFFFF; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-size:12px; font-weight:800; letter-spacing:0.3px;">${escapeHTML(pkgItem.title)}</div>
                    <div style="font-size:10px; color:#FDE68A;">${escapeHTML(pkgItem.subtitle)}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:14px; font-weight:900; color:#FBBF24;">${escapeHTML(pkgItem.doubledRate)}</div>
                    <div style="font-size:9px; color:#E2E8F0; font-weight:700;">with decoration</div>
                  </div>
                </div>
                <div style="padding:12px 14px; font-size:11px; line-height:1.55; color:#334155;">
                  ${pkgItem.courses.map(c => `
                    <div style="margin-bottom:6px; padding-bottom:6px; border-bottom:1px dashed #E2E8F0;">
                      <strong style="color:#0F2C59; display:block;">• ${escapeHTML(c.name)}:</strong>
                      <span style="color:#475569;">${escapeHTML(c.desc)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Decoration Guarantee & Important Terms -->
        <div style="margin:20px 30px; background:#F8FAFC; border:1px solid #CBD5E1; border-left:4px solid #D97706; border-radius:6px; padding:14px 18px;">
          <h4 style="margin:0 0 6px 0; font-size:12.5px; font-weight:800; color:#0F2C59;">
            <i class="fa-solid fa-circle-check" style="color:#059669;"></i> Romantic Decoration & Dining Terms
          </h4>
          <ul style="margin:0; padding-left:18px; font-size:11px; color:#475569; line-height:1.65;">
            <li><strong>Decoration Inclusions:</strong> Private beachfront tent/canopy, floral centerpiece and table runner, candlelit path, ambient lanterns, personalized welcome board, and dedicated private server.</li>
            <li><strong>Taxes:</strong> All rates are in USD and subject to 10% Service Charge & 17% Tourism Goods and Services Tax (TGST) (++).</li>
            <li><strong>Confirmation & Scheduling:</strong> Experience must be booked at least 24 hours in advance through Let's Explore DMC or Island Host. Beach setups are weather permitting and may be shifted to covered luxury pavilions during rain.</li>
          </ul>
        </div>

        ${renderContinuousFooter(footer, comp)}
      </div>
    `;
  }

  return {
    render,
    buildQuotationHTML,
    renderRajasthanLandPackageDocument,
    renderDiningMenuDocument
  };

})();

if (typeof window !== 'undefined') {
  window.Preview = Preview;
}
