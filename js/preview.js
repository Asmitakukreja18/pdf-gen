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
  function render() {
    const container = document.getElementById('previewDocument');
    if (!container) return;

    // Recalculate totals first
    recalculateQuotationPricing();

    // Generate HTML for the active document type
    container.innerHTML = buildQuotationHTML(QuotationData, false);
  }

  /**
   * Builds the complete HTML document string based on activeDocType.
   * Shared by both the screen preview and the print/PDF generator for 100% parity.
   * @param {Object} data - QuotationData instance
   * @param {boolean} isForPrint - Flag if rendering inside standalone print window
   */
  function buildQuotationHTML(data = QuotationData, isForPrint = false) {
    const docType = data.activeDocType || 'quotation';

    switch (docType) {
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
  function renderContinuousFooter(footer = {}) {
    return `
      <footer class="dmc-footer">
        <div class="dmc-footer-content">
          <span class="footer-company">${escapeHTML(footer.companyName || "Let's Explore DMC")}</span>
          <span class="footer-sep">|</span>
          <span class="footer-phone">${escapeHTML(footer.phones || '+91 80075 86881 | +91 95459 55966')}</span>
          <span class="footer-sep">|</span>
          <span class="footer-web">${escapeHTML(footer.website || 'www.letsexploredmc.com')}</span>
          <span class="footer-sep">|</span>
          <span class="footer-social">${escapeHTML(footer.instagram || '@lets_exploredmc')}</span>
          <span class="footer-sep">|</span>
          <span class="footer-page-num">Official Travel Document</span>
        </div>
      </footer>
    `;
  }

  /**
   * Shared Brand Header for official documents
   */
  function renderBrandHeader(pkg = {}, docTypeLabel = 'PACKAGE TOUR', quoteRef = '') {
    return `
      <header class="dmc-header">
        <div class="dmc-header-top">
          <div class="dmc-brand-box">
            <img src="images/logo.png" alt="Let's Explore DMC" class="dmc-brand-logo" onerror="this.style.display='none'" />
            <div class="dmc-brand-info">
              <span class="dmc-brand-name">LET'S EXPLORE DMC</span>
              <span class="dmc-brand-tagline">Your Destination Management Specialist</span>
            </div>
          </div>
          <div class="dmc-quote-meta">
            <div class="meta-item"><span class="meta-label">Document Ref:</span> <strong>${escapeHTML(quoteRef || pkg.quoteRef || 'LE-DMC-REF')}</strong></div>
            <div class="meta-item"><span class="meta-label">Date:</span> <strong>${escapeHTML(pkg.preparedDate || '—')}</strong></div>
            <div class="meta-item"><span class="meta-label">Forex Ref:</span> <strong>1 USD = ${pkg.usdToInrRate || 87.5} INR</strong></div>
          </div>
        </div>

        <div class="dmc-banner-box">
          <div class="dmc-banner-content">
            <h1 class="dmc-main-title">${escapeHTML(docTypeLabel)}</h1>
            <div class="dmc-duration-tag">${escapeHTML(pkg.duration || 'Bespoke Journey')}</div>
            <div class="dmc-destinations">${escapeHTML(pkg.destinations || 'Global Destination')}</div>
            <div class="dmc-travellers-line">
              <span class="pax-badge">${escapeHTML(pkg.travellers || '2 Adults')}</span>
              <span class="pax-sep">•</span>
              <span class="pax-desc">Package for ${pkg.paxCount || 2} pax</span>
            </div>
          </div>
        </div>

        ${(pkg.clientName || pkg.clientContact || pkg.pickupFrom) ? `
        <div class="dmc-client-bar">
          ${pkg.clientName ? `<div class="client-bar-item"><span class="c-label">Prepared For:</span> <strong>${escapeHTML(pkg.clientName)}</strong></div>` : ''}
          ${pkg.clientContact ? `<div class="client-bar-item"><span class="c-label">Contact:</span> ${escapeHTML(pkg.clientContact)}</div>` : ''}
          ${pkg.pickupFrom ? `<div class="client-bar-item"><span class="c-label">Pickup Hub:</span> ${escapeHTML(pkg.pickupFrom)}</div>` : ''}
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
    const themeStyles = getThemeStyles(data.themeSettings);

    return `
      <div class="dmc-quotation-doc doc-itinerary-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, 'PACKAGE ITINERARY', pkg.quoteRef)}

        <!-- Trip Highlights Bar -->
        <div class="itinerary-highlights-bar">
          <div class="hl-item"><span class="hl-icon">🗓️</span> <strong>Duration:</strong> ${escapeHTML(pkg.duration || '12 Days / 11 Nights')}</div>
          <div class="hl-item"><span class="hl-icon">📍</span> <strong>Route:</strong> ${escapeHTML(pkg.destinations || 'Thailand')}</div>
          <div class="hl-item"><span class="hl-icon">👥</span> <strong>Travellers:</strong> ${escapeHTML(pkg.travellers || '2 Adults')}</div>
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
              <div class="itinerary-day-card" id="itin-day-${idx+1}">
                <div class="itin-day-header">
                  <div class="itin-day-badge">DAY ${day.dayNumber || idx+1}</div>
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

        ${renderContinuousFooter(footer)}
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
    const themeStyles = getThemeStyles(data.themeSettings);

    return `
      <div class="dmc-quotation-doc doc-quotation-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, pkg.title || 'PACKAGE TOUR', pkg.quoteRef)}

        <!-- 3 Stat Cards Matching Reference PDF -->
        <div class="dmc-stats-grid">
          <div class="dmc-stat-card">
            <span class="stat-card-title">DURATION</span>
            <div class="stat-card-main">${escapeHTML(pkg.duration || '12 Days / 11 Nights')}</div>
            <div class="stat-card-sub">${escapeHTML(pkg.startDate && pkg.endDate ? `${pkg.startDate} to ${pkg.endDate}` : 'Day 1 to Day 12 (2 Jan to 13 Jan)')}</div>
          </div>
          <div class="dmc-stat-card">
            <span class="stat-card-title">DESTINATIONS</span>
            <div class="stat-card-main">${escapeHTML(pkg.destinations || 'Krabi · Phuket + Koh Yao Yai')}</div>
            <div class="stat-card-sub">${escapeHTML(pkg.country || 'Thailand')}</div>
          </div>
          <div class="dmc-stat-card">
            <span class="stat-card-title">TRAVELLERS</span>
            <div class="stat-card-main">${escapeHTML(pkg.travellers || '2 Adults')}</div>
            <div class="stat-card-sub">Package for ${pkg.paxCount || 2} pax</div>
          </div>
        </div>

        <!-- 4-Column Day-Wise Services & Costing Table (Reference PDF Standard) -->
        <section class="dmc-section dmc-itinerary-section">
          <div class="dmc-section-header">
            <span>Day-wise Itinerary & Pricing</span>
          </div>

          <div class="dmc-table-header-bar">
            <div class="th-desc">DAY-WISE ITINERARY & SERVICE DETAILS</div>
            <div class="th-pax">PAX</div>
            <div class="th-inr">AMOUNT (INR)</div>
            <div class="th-usd">AMOUNT (USD)</div>
          </div>

          <div class="dmc-days-list">
            ${days.map(day => renderDayPricingCardHTML(day)).join('')}
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
                  <td><strong>${escapeHTML(h.city || 'Thailand')}</strong></td>
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

        <!-- Final Price Summary Table -->
        <section class="dmc-section dmc-summary-section">
          <div class="dmc-section-header">
            <span>PACKAGE PRICE SUMMARY</span>
          </div>

          <table class="dmc-summary-table">
            <thead>
              <tr>
                <th class="th-sum-desc">PACKAGE SUMMARY</th>
                <th class="th-sum-inr">AMOUNT (INR)</th>
                <th class="th-sum-usd">AMOUNT (USD)</th>
              </tr>
            </thead>
            <tbody>
              ${(summary.items || []).map(item => `
                <tr class="dmc-summary-row">
                  <td class="col-sum-desc">• ${escapeHTML(item.name)}</td>
                  <td class="col-sum-inr">${item.amountINR ? formatCurrencyINR(item.amountINR) : '—'}</td>
                  <td class="col-sum-usd">${item.amountUSD ? formatCurrencyUSD(item.amountUSD) : '—'}</td>
                </tr>
              `).join('')}
              <tr class="dmc-total-row">
                <td class="col-sum-desc"><strong>FINAL PACKAGE COST (${escapeHTML(pkg.travellers || '2 Adults')})</strong></td>
                <td class="col-sum-inr"><strong>${formatCurrencyINR(summary.totalINR)}</strong></td>
                <td class="col-sum-usd"><strong>${formatCurrencyUSD(summary.totalUSD)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="dmc-summary-disclaimer">
            * All prices computed for <strong>${escapeHTML(pkg.travellers || '2 Adults')}</strong>. Airfares, resort tariffs, and government taxes remain dynamic until confirmed booking.
          </div>
        </section>

        <!-- Global Desks & Contact Directory -->
        ${renderOfficesSection(offices)}

        ${renderContinuousFooter(footer)}
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
    const themeStyles = getThemeStyles(data.themeSettings);

    const totalINR = hotels.reduce((sum, h) => sum + (Number(h.amountINR) || 0), 0);
    const totalUSD = hotels.reduce((sum, h) => sum + (Number(h.amountUSD) || 0), 0);

    return `
      <div class="dmc-quotation-doc doc-hotel-costing-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, 'HOTEL COSTING & COMPARISON', pkg.quoteRef)}

        <!-- Hotel Overview Parameter Strip -->
        <div class="hotel-overview-strip">
          <div class="h-param"><strong>Destination:</strong> ${escapeHTML(pkg.destinations || 'Thailand')}</div>
          <div class="h-param"><strong>Travel Dates:</strong> ${escapeHTML(pkg.preparedDate || '2 Jan to 13 Jan')}</div>
          <div class="h-param"><strong>Occupancy:</strong> ${escapeHTML(pkg.travellers || '2 Adults')} (1 Room / Double Sharing)</div>
          <div class="h-param"><strong>Total Properties:</strong> ${hotels.length} Luxury Resorts</div>
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
                    <span class="h-number">0${idx+1}</span>
                    <div>
                      <h3 class="h-resort-name">${escapeHTML(h.name)}</h3>
                      <span class="h-resort-city">📍 ${escapeHTML(h.city || 'Thailand')}</span>
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

        ${renderContinuousFooter(footer)}
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
    const themeStyles = getThemeStyles(data.themeSettings);

    return `
      <div class="dmc-quotation-doc doc-summary-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, 'PACKAGE EXECUTIVE SUMMARY', pkg.quoteRef)}

        <!-- Executive Trip Overview Grid -->
        <section class="dmc-section summary-overview-section">
          <div class="dmc-section-header"><span>Trip Overview</span></div>
          <div class="summary-overview-grid">
            <div class="so-cell"><span class="so-label">Destination</span><strong class="so-val">${escapeHTML(pkg.destinations || 'Thailand')}</strong></div>
            <div class="so-cell"><span class="so-label">Duration</span><strong class="so-val">${escapeHTML(pkg.duration || '12 Days / 11 Nights')}</strong></div>
            <div class="so-cell"><span class="so-label">Travel Dates</span><strong class="so-val">${escapeHTML(pkg.preparedDate || '2 Jan to 13 Jan')}</strong></div>
            <div class="so-cell"><span class="so-label">Travellers</span><strong class="so-val">${escapeHTML(pkg.travellers || '2 Adults')}</strong></div>
            <div class="so-cell"><span class="so-label">Prepared For</span><strong class="so-val">${escapeHTML(pkg.clientName || 'Valued Partner')}</strong></div>
            <div class="so-cell"><span class="so-label">Forex Benchmark</span><strong class="so-val">1 USD = ₹ ${pkg.usdToInrRate || 87.5}</strong></div>
          </div>
        </section>

        <!-- Consolidated Cost Breakdown -->
        <section class="dmc-section summary-cost-section">
          <div class="dmc-section-header"><span>Financial Cost Breakdown</span></div>
          <table class="dmc-summary-table">
            <thead>
              <tr>
                <th class="th-sum-desc">COMPONENT / SERVICE CATEGORY</th>
                <th class="th-sum-inr">AMOUNT (INR)</th>
                <th class="th-sum-usd">AMOUNT (USD)</th>
              </tr>
            </thead>
            <tbody>
              ${(summary.items || []).map(item => `
                <tr class="dmc-summary-row">
                  <td class="col-sum-desc">• ${escapeHTML(item.name)}</td>
                  <td class="col-sum-inr">${item.amountINR ? formatCurrencyINR(item.amountINR) : '—'}</td>
                  <td class="col-sum-usd">${item.amountUSD ? formatCurrencyUSD(item.amountUSD) : '—'}</td>
                </tr>
              `).join('')}
              <tr class="dmc-total-row">
                <td class="col-sum-desc"><strong>TOTAL PACKAGE COST</strong></td>
                <td class="col-sum-inr"><strong>${formatCurrencyINR(summary.totalINR)}</strong></td>
                <td class="col-sum-usd"><strong>${formatCurrencyUSD(summary.totalUSD)}</strong></td>
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

        ${renderContinuousFooter(footer)}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. FORMAT: TRAVEL CONFIRMATION VOUCHER (BOOKING-FOCUSED)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderTravelConfirmationDocument(data, isForPrint) {
    const pkg = data.package || {};
    const conf = data.confirmation || {};
    const hotels = data.hotels || [];
    const days = data.days || [];
    const footer = data.footerSettings || {};
    const offices = data.offices || [];
    const themeStyles = getThemeStyles(data.themeSettings);

    return `
      <div class="dmc-quotation-doc doc-confirmation-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        <!-- Official Voucher Header -->
        <header class="dmc-header voucher-header">
          <div class="dmc-header-top">
            <div class="dmc-brand-box">
              <img src="images/logo.png" alt="Let's Explore DMC" class="dmc-brand-logo" onerror="this.style.display='none'" />
              <div class="dmc-brand-info">
                <span class="dmc-brand-name">LET'S EXPLORE DMC</span>
                <span class="dmc-brand-tagline">Official Destination Management Voucher</span>
              </div>
            </div>
            <div class="voucher-status-badge">
              <span class="v-confirmed-text">BOOKING CONFIRMED</span>
              <span class="v-ref">Voucher #${escapeHTML(conf.bookingRef || 'CONF-LE-8891')}</span>
            </div>
          </div>

          <div class="voucher-title-banner">
            <h2>OFFICIAL TRAVEL CONFIRMATION VOUCHER</h2>
            <p>Please present this voucher along with valid government photo identification upon arrival.</p>
          </div>
        </header>

        <!-- Guest & Booking Summary -->
        <section class="dmc-section voucher-guest-section">
          <div class="dmc-section-header"><span>Guest & Reservation Details</span></div>
          <div class="voucher-details-grid">
            <div class="v-cell"><span class="v-lbl">Lead Traveller:</span> <strong>${escapeHTML(conf.leadPassenger || pkg.clientName || 'Package for 2 pax')}</strong></div>
            <div class="v-cell"><span class="v-lbl">Total Passengers:</span> <strong>${escapeHTML(pkg.travellers || '2 Adults')}</strong></div>
            <div class="v-cell"><span class="v-lbl">Destination:</span> <strong>${escapeHTML(pkg.destinations || 'Thailand')}</strong></div>
            <div class="v-cell"><span class="v-lbl">Travel Dates:</span> <strong>${escapeHTML(pkg.preparedDate || '2 Jan to 13 Jan')}</strong></div>
            <div class="v-cell"><span class="v-lbl">Primary Contact:</span> <strong>${escapeHTML(conf.contact || pkg.clientContact || '+91 80075 86881')}</strong></div>
            <div class="v-cell"><span class="v-lbl">24/7 Hotline:</span> <strong>${escapeHTML(conf.emergencyContact || '+66 818311204')}</strong></div>
          </div>
        </section>

        <!-- Confirmed Hotel Accommodations -->
        <section class="dmc-section voucher-hotel-section">
          <div class="dmc-section-header"><span>Confirmed Hotel Stays</span></div>
          <table class="voucher-table">
            <thead>
              <tr>
                <th>HOTEL / RESORT</th>
                <th>CITY / LOCATION</th>
                <th>CHECK-IN</th>
                <th>CHECK-OUT</th>
                <th>ROOM & MEAL PLAN</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${hotels.map(h => `
                <tr>
                  <td><strong>${escapeHTML(h.name)}</strong></td>
                  <td>${escapeHTML(h.city || 'Thailand')}</td>
                  <td>${escapeHTML(h.checkIn || '—')}</td>
                  <td>${escapeHTML(h.checkOut || '—')}</td>
                  <td>${escapeHTML(h.roomType || 'Deluxe')} · ${escapeHTML(h.mealPlan || 'CP')}</td>
                  <td><span class="badge-v-confirmed">CONFIRMED</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>

        <!-- Confirmed Tours & Inter-Island Transfers -->
        <section class="dmc-section voucher-services-section">
          <div class="dmc-section-header"><span>Confirmed Excursions & Transfer Schedule</span></div>
          <div class="voucher-services-list">
            ${days.map(d => `
              <div class="v-day-row">
                <div class="v-day-meta">
                  <strong>DAY ${d.dayNumber}</strong>
                  <span>${escapeHTML(d.date || '')}</span>
                </div>
                <div class="v-day-desc">
                  <strong>${escapeHTML(d.title)}</strong>
                  <div class="v-day-items">
                    ${(d.items || []).map(it => `<span>• ${escapeHTML(it.title)}</span>`).join(' ')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Important Instructions & Checklist -->
        <section class="dmc-section voucher-instructions-section">
          <div class="dmc-section-header"><span>Essential Travel Guidelines & On-Ground Protocol</span></div>
          <ul class="dmc-bullet-list">
            ${(conf.instructions || []).map(ins => `<li>${escapeHTML(ins)}</li>`).join('')}
          </ul>
        </section>

        ${renderOfficesSection(offices)}

        ${renderContinuousFooter(footer)}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. FORMAT: TAX INVOICE / BILLING (BILLING-FOCUSED)
  // ═══════════════════════════════════════════════════════════════════════════════
  function renderInvoiceDocument(data, isForPrint) {
    const pkg = data.package || {};
    const inv = data.invoice || {};
    const summary = data.summary || { totalINR: 285980, totalUSD: 2262.24 };
    const footer = data.footerSettings || {};
    const themeStyles = getThemeStyles(data.themeSettings);

    const subtotal = summary.totalINR || 285980;
    const taxRate = inv.taxRate || 5;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const grandTotal = subtotal + taxAmount;

    return `
      <div class="dmc-quotation-doc doc-invoice-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        <!-- Corporate Tax Invoice Header -->
        <header class="invoice-header">
          <div class="inv-header-top">
            <div class="inv-brand-box">
              <img src="images/logo.png" alt="Let's Explore DMC" class="dmc-brand-logo" onerror="this.style.display='none'" />
              <div class="dmc-brand-info">
                <span class="dmc-brand-name">LET'S EXPLORE DMC PVT LTD</span>
                <span class="dmc-brand-tagline">Destination Management Company · Global Desks</span>
                <span class="inv-tax-no">GSTIN / Reg No: 27AABCL8891Q1Z8</span>
              </div>
            </div>
            <div class="inv-title-box">
              <h1 class="inv-word">TAX INVOICE</h1>
              <div class="inv-meta-grid">
                <div><span class="im-lbl">Invoice #:</span> <strong>${escapeHTML(inv.invoiceNumber || 'LE-INV-2027-112')}</strong></div>
                <div><span class="im-lbl">Invoice Date:</span> <strong>${escapeHTML(inv.invoiceDate || '2 Jan 2027')}</strong></div>
                <div><span class="im-lbl">Due Date:</span> <strong>${escapeHTML(inv.dueDate || '13 Jan 2027')}</strong></div>
              </div>
            </div>
          </div>

          <!-- Bill To Strip -->
          <div class="inv-bill-to-strip">
            <div class="bill-to-box">
              <span class="bt-title">BILLED TO:</span>
              <div class="bt-content">
                <strong>${escapeHTML(pkg.clientName || 'Package for 2 pax')}</strong><br>
                <span>${escapeHTML(pkg.clientContact || '+91 80075 86881')}</span><br>
                <span>${escapeHTML(pkg.clientEmail || 'info@letsexploredmc.com')}</span>
              </div>
            </div>
            <div class="trip-ref-box">
              <span class="bt-title">PACKAGE PARTICULARS:</span>
              <div class="bt-content">
                <strong>${escapeHTML(pkg.destinations || 'Krabi + Phuket + Koh Yao Yai, Thailand')}</strong><br>
                <span>Duration: ${escapeHTML(pkg.duration || '12 Days / 11 Nights')} · Travellers: ${escapeHTML(pkg.travellers || '2 Adults')}</span><br>
                <span>Travel Dates: ${escapeHTML(pkg.preparedDate || '2 Jan to 13 Jan')}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Itemized Tax Invoice Table -->
        <section class="invoice-table-section">
          <table class="inv-items-table">
            <thead>
              <tr>
                <th style="width:40px;">S.NO</th>
                <th>DESCRIPTION OF SERVICE</th>
                <th style="width:70px; text-align:center;">PAX</th>
                <th style="width:140px; text-align:right;">RATE</th>
                <th style="width:140px; text-align:right;">AMOUNT (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center;">1</td>
                <td>
                  <strong>Hotel Costing & Luxury Accommodations</strong><br>
                  <small>11 Nights across Krabi Resort, Phi Phi Island, Panwaburi Queen, Sunset Beach Resort & Esmeralda View</small>
                </td>
                <td style="text-align:center;">2</td>
                <td style="text-align:right;">₹ 1,42,990 / pax</td>
                <td style="text-align:right; font-weight:bold;">₹ 2,85,980</td>
              </tr>
              <tr>
                <td style="text-align:center;">2</td>
                <td>
                  <strong>On-ground Land Package, Speedboats & Excursions</strong><br>
                  <small>Private airport minivans, 4 Islands longtail, ATV ride, Phi Phi speedboat, James Bond tour & Candle Light Dinner</small>
                </td>
                <td style="text-align:center;">2</td>
                <td style="text-align:right;">$ 1,131.12 / pax</td>
                <td style="text-align:right; font-weight:bold;">$ 2,262.24</td>
              </tr>
            </tbody>
          </table>

          <!-- Financial Calculation Matrix -->
          <div class="inv-calc-container">
            <div class="inv-bank-box">
              <h4>BANK REMITTANCE & PAYMENT DETAILS</h4>
              <div class="bank-details-grid">
                <div><span>Beneficiary Name:</span> <strong>${escapeHTML(inv.accountName || "Let's Explore DMC Pvt Ltd")}</strong></div>
                <div><span>Bank Name:</span> <strong>${escapeHTML(inv.bankName || 'HDFC Bank Ltd')}</strong></div>
                <div><span>Account Number:</span> <strong>${escapeHTML(inv.accountNumber || '50200088991122')}</strong></div>
                <div><span>IFSC Code:</span> <strong>${escapeHTML(inv.ifsc || 'HDFC0001234')}</strong></div>
                <div><span>UPI ID:</span> <strong>${escapeHTML(inv.upi || 'letsexplore@hdfcbank')}</strong></div>
              </div>
            </div>

            <div class="inv-totals-box">
              <div class="inv-tot-row"><span>Subtotal (INR):</span> <strong>${formatCurrencyINR(subtotal)}</strong></div>
              <div class="inv-tot-row"><span>GST / Taxes (${taxRate}%):</span> <strong>${formatCurrencyINR(taxAmount)}</strong></div>
              <div class="inv-tot-row grand-total-row"><span>TOTAL PAYABLE:</span> <strong>${formatCurrencyINR(grandTotal)}</strong></div>
              <div class="inv-in-words">Amount in words: Indian Rupees Three Lakh Twenty-Seven Only</div>
            </div>
          </div>
        </section>

        <!-- Terms & Signatory Authorization -->
        <div class="inv-bottom-section">
          <div class="inv-terms">
            <h5>TERMS & CONDITIONS:</h5>
            <p>${escapeHTML(inv.terms || 'Full payment is due prior to travel departure. Cheques/Drafts subject to realization.')}</p>
          </div>
          <div class="inv-sign-box">
            <div class="sign-line"></div>
            <strong>${escapeHTML(inv.authorizedSignatory || 'Authorized Signatory')}</strong>
            <span>Let's Explore DMC Pvt Ltd</span>
          </div>
        </div>

        ${renderContinuousFooter(footer)}
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
    const themeStyles = getThemeStyles(data.themeSettings);

    return `
      <div class="dmc-quotation-doc doc-custom-mode ${isForPrint ? 'is-print-mode' : ''}" style="${themeStyles}">
        ${renderBrandHeader(pkg, customDoc.title || 'CUSTOM TRAVEL DOCUMENT', pkg.quoteRef)}

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

        ${renderContinuousFooter(footer)}
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
            ${(context.days || []).slice(0, 5).map(d => `
              <div style="margin-bottom:8px;">
                <strong>Day ${d.dayNumber}: ${escapeHTML(d.title)}</strong>
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
   * Day Pricing Card for Quotation format (4-column grid)
   */
  function renderDayPricingCardHTML(day) {
    const items = day.items || [];
    const hasHotel = day.hotel && day.hotel.name && day.hotel.name.trim() !== '';

    return `
      <div class="dmc-day-card" id="day-card-${day.dayNumber}">
        <div class="dmc-day-heading-bar">
          <div class="day-badge-col">
            <span class="day-pill">DAY ${day.dayNumber}</span>
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
            <div class="dmc-item-row ${item.tag ? 'has-tag' : ''}">
              <div class="item-desc-col">
                <div class="item-title-line">
                  <span class="item-bullet">•</span>
                  <span class="item-name">${escapeHTML(item.title)}</span>
                  ${item.tag ? renderTagBadge(item.tag) : ''}
                </div>
                ${item.subtitle ? `<div class="item-subtitle">${escapeHTML(item.subtitle)}</div>` : ''}
              </div>
              <div class="item-pax-col">${item.pax ? `<span class="col-val">${escapeHTML(item.pax)}</span>` : '<span class="col-val">—</span>'}</div>
              <div class="item-inr-col">${item.amountINR ? `<span class="col-val">${formatCurrencyINR(item.amountINR)}</span>` : '<span class="col-val">—</span>'}</div>
              <div class="item-usd-col">${item.amountUSD ? `<span class="col-val">${formatCurrencyUSD(item.amountUSD)}</span>` : '<span class="col-val">—</span>'}</div>
            </div>
          `).join('')}
        </div>

        ${hasHotel ? `
        <div class="dmc-hotel-row ${day.hotel.amountINR ? 'has-price' : ''}">
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
          <div class="item-inr-col">${day.hotel.amountINR ? `<span class="col-val">${formatCurrencyINR(day.hotel.amountINR)}</span>` : ''}</div>
          <div class="item-usd-col">${day.hotel.amountUSD ? `<span class="col-val">${formatCurrencyUSD(day.hotel.amountUSD)}</span>` : ''}</div>
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

  return {
    render,
    buildQuotationHTML
  };

})();
