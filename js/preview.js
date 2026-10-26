/**
 * preview.js — Master Quotation Document Preview & Renderer
 * Rebuilt based directly on the official Reference Quotation PDF.
 * Implements:
 * - Cover / Package Header (Large "PACKAGE TOUR", duration, destinations, pax)
 * - "Day-wise Itinerary & Pricing" with PAX, AMOUNT (INR), AMOUNT (USD) columns
 * - Day cards with variable activities, transfers, sightseeing, leisure
 * - Special Notes / Personal Expense tags
 * - Hotel blocks (Hotel : Name (Dates) + room/meal plan)
 * - Dynamic Custom Sections (Inclusions, Exclusions, Important Notes, etc.)
 * - Price Summary table with dual-currency breakdown & auto totals
 * - Contact Us section with dynamic office management
 * - Multi-template styling (Classic DMC, Modern Luxury, Minimal Professional)
 * - CSS variables driven by editable theme settings
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

    // Generate HTML for the master quotation
    container.innerHTML = buildQuotationHTML(QuotationData, false);
  }

  /**
   * Builds the complete quotation HTML document string.
   * Shared by both the screen preview and the print/PDF generator for 100% parity.
   * @param {Object} data - QuotationData instance
   * @param {boolean} isForPrint - Flag if rendering inside standalone print window
   */
  function buildQuotationHTML(data = QuotationData, isForPrint = false) {
    const d = data;
    const pkg = d.package || {};
    const days = d.days || [];
    const summary = d.summary || { items: [], totalINR: 0, totalUSD: 0 };
    const offices = d.offices || [];
    const customSections = d.customSections || [];
    const customFields = d.customFields || [];
    const footer = d.footerSettings || {
      companyName: "Let's Explore DMC",
      phones: '+91 80075 86881 | +91 95459 55966',
      website: 'www.letsexploredmc.com',
      instagram: '@lets_exploredmc'
    };
    const theme = d.themeSettings || {
      template: 'classic',
      primaryColor: '#0F2C59',
      secondaryColor: '#1E3A8A',
      accentColor: '#2563EB',
      textColor: '#1E293B',
      mutedColor: '#64748B',
      borderColor: '#CBD5E1',
      tableHeaderBg: '#0F2C59',
      tableHeaderText: '#FFFFFF'
    };

    const templateClass = `template-${theme.template || 'classic'}`;

    // CSS variables dynamically generated from theme settings
    const dynamicThemeStyles = `
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

    return `
      <div class="dmc-quotation-doc ${templateClass} ${isForPrint ? 'is-print-mode' : ''}" style="${dynamicThemeStyles}">

        <!-- ============================================================
             1. COVER / PACKAGE HEADER (DIRECT REFERENCE MATCH)
             ============================================================ -->
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
              <div class="meta-item"><span class="meta-label">Quote Ref:</span> <strong>${pkg.quoteRef || 'LE-DMC-QUOT'}</strong></div>
              <div class="meta-item"><span class="meta-label">Date:</span> <strong>${pkg.preparedDate || '—'}</strong></div>
              <div class="meta-item"><span class="meta-label">Rate Ref:</span> <strong>1 USD = ${pkg.usdToInrRate || 87.5} INR</strong></div>
            </div>
          </div>

          <div class="dmc-banner-box">
            <div class="dmc-banner-content">
              <h1 class="dmc-main-title">${escapeHTML(pkg.title || 'PACKAGE TOUR')}</h1>
              <div class="dmc-duration-tag">${escapeHTML(pkg.duration || 'Custom Itinerary')}</div>
              <div class="dmc-destinations">${escapeHTML(pkg.destinations || 'Destinations on request')}</div>
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
            ${pkg.pickupFrom ? `<div class="client-bar-item"><span class="c-label">Pickup:</span> ${escapeHTML(pkg.pickupFrom)}</div>` : ''}
          </div>` : ''}

          <!-- Optional Custom Fields Bar (Visa, Insurance, etc.) -->
          ${customFields && customFields.length > 0 ? `
          <div class="dmc-custom-fields-bar">
            ${customFields.map(f => `
              <div class="dmc-custom-field-pill">
                <span class="cf-key">${escapeHTML(f.key)}:</span>
                <span class="cf-val">${escapeHTML(f.value)}</span>
              </div>
            `).join('')}
          </div>` : ''}
        </header>

        <!-- ============================================================
             2. DAY-WISE ITINERARY & PRICING (CORE REFERENCE STRUCTURE)
             ============================================================ -->
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
            ${days.length === 0 ? `
              <div class="dmc-empty-state">No days added yet. Click "+ Add Day" in the editor to build your itinerary.</div>
            ` : days.map(day => renderDayCardHTML(day, pkg)).join('')}
          </div>
        </section>

        <!-- ============================================================
             3. DYNAMIC CUSTOM SECTIONS (INCLUSIONS, EXCLUSIONS, NOTES)
             ============================================================ -->
        ${customSections.filter(sec => sec.items && sec.items.length > 0).map(sec => `
          <section class="dmc-section dmc-custom-section">
            <div class="dmc-section-header">
              <span>${escapeHTML(sec.title)}</span>
            </div>
            <div class="dmc-custom-section-content">
              ${sec.type === 'list' || Array.isArray(sec.items) ? `
                <ul class="dmc-bullet-list">
                  ${sec.items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
                </ul>
              ` : `
                <p class="dmc-custom-text">${escapeHTML(sec.content || '')}</p>
              `}
            </div>
          </section>
        `).join('')}

        <!-- ============================================================
             4. PRICE SUMMARY (DIRECT REFERENCE MATCH)
             ============================================================ -->
        <section class="dmc-section dmc-summary-section">
          <div class="dmc-section-header">
            <span>PRICE SUMMARY</span>
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
              ${summary.items && summary.items.length > 0 ? summary.items.map(item => `
                <tr class="dmc-summary-row">
                  <td class="col-sum-desc">• ${escapeHTML(item.name)}</td>
                  <td class="col-sum-inr">${item.amountINR ? formatCurrencyINR(item.amountINR) : '—'}</td>
                  <td class="col-sum-usd">${item.amountUSD ? formatCurrencyUSD(item.amountUSD) : '—'}</td>
                </tr>
              `).join('') : `
                <tr class="dmc-summary-row">
                  <td class="col-sum-desc">• Land Package & Accommodation</td>
                  <td class="col-sum-inr">${formatCurrencyINR(summary.totalINR)}</td>
                  <td class="col-sum-usd">${formatCurrencyUSD(summary.totalUSD)}</td>
                </tr>
              `}
              <tr class="dmc-total-row">
                <td class="col-sum-desc"><strong>FINAL PACKAGE COST</strong></td>
                <td class="col-sum-inr"><strong>${formatCurrencyINR(summary.totalINR)}</strong></td>
                <td class="col-sum-usd"><strong>${formatCurrencyUSD(summary.totalUSD)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="dmc-summary-disclaimer">
            * All prices calculated for <strong>${pkg.paxCount || 2} Pax</strong> based on current exchange rates and tariff availability. Airfares and taxes are dynamic until confirmed ticketing.
          </div>
        </section>

        <!-- ============================================================
             5. CONTACT US & GLOBAL OPERATIONS (DIRECT REFERENCE MATCH)
             ============================================================ -->
        <section class="dmc-section dmc-contact-section">
          <div class="dmc-section-header">
            <span>CONTACT US</span>
          </div>

          <div class="dmc-quick-contact-bar">
            <div class="qc-item">
              <span class="qc-label">PHONE:</span>
              <span class="qc-val">${escapeHTML(footer.phones || '+91 80075 86881')}</span>
            </div>
            <div class="qc-item">
              <span class="qc-label">WEBSITE:</span>
              <a href="http://${(footer.website || 'www.letsexploredmc.com').replace(/^https?:\/\//, '')}" target="_blank" class="qc-val qc-link">
                ${escapeHTML(footer.website || 'www.letsexploredmc.com')}
              </a>
            </div>
            <div class="qc-item">
              <span class="qc-label">INSTAGRAM:</span>
              <span class="qc-val">${escapeHTML(footer.instagram || '@lets_exploredmc')}</span>
            </div>
          </div>

          <!-- Dynamic Office Cards Grid -->
          <div class="dmc-offices-grid">
            ${offices.map(office => `
              <div class="dmc-office-card">
                <div class="office-header-bar">
                  <span class="office-name">${escapeHTML(office.name)}</span>
                  ${office.country ? `<span class="office-country-tag">${escapeHTML(office.country)}</span>` : ''}
                </div>
                <div class="office-body">
                  ${office.company ? `<div class="office-partner">${escapeHTML(office.company)}</div>` : ''}
                  ${office.contactPerson ? `
                    <div class="office-person">
                      <strong>${escapeHTML(office.contactPerson)}</strong>
                      ${office.designation ? `<span class="office-designation">(${escapeHTML(office.designation)})</span>` : ''}
                    </div>` : ''}
                  ${office.address ? `<div class="office-address">${escapeHTML(office.address)}</div>` : ''}
                  ${office.phone ? `<div class="office-contact-row"><span>📞</span> ${escapeHTML(office.phone)}</div>` : ''}
                  ${office.email ? `<div class="office-contact-row"><span>✉️</span> ${escapeHTML(office.email)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Other Offices Network Footnote -->
          ${d.otherOfficesList && d.otherOfficesList.length > 0 ? `
          <div class="dmc-other-offices-box">
            <span class="o-label">OTHER GLOBAL BRANCH & PARTNER DESKS:</span>
            <span class="o-list">${d.otherOfficesList.join(' • ')}</span>
          </div>` : ''}
        </section>

        <!-- ============================================================
             6. REPEATING PAGE FOOTER (PRINT & PREVIEW)
             ============================================================ -->
        <footer class="dmc-doc-footer">
          <div class="footer-inner">
            <span class="f-brand">${escapeHTML(footer.companyName || "Let's Explore DMC")}</span>
            <span class="f-dot">|</span>
            <span class="f-phones">${escapeHTML(footer.phones)}</span>
            <span class="f-dot">|</span>
            <span class="f-web">${escapeHTML(footer.website)}</span>
            <span class="f-dot">|</span>
            <span class="f-insta">${escapeHTML(footer.instagram)}</span>
            <span class="f-dot">|</span>
            <span class="f-page">Official DMC Quotation</span>
          </div>
        </footer>

      </div>
    `;
  }

  /**
   * Renders an individual Day Card in the exact Reference PDF format
   */
  function renderDayCardHTML(day, pkg) {
    const items = day.items || [];
    const hasHotel = day.hotel && day.hotel.name && day.hotel.name.trim() !== '';

    return `
      <div class="dmc-day-card">
        <!-- Day Heading Bar -->
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

        <!-- Activities / Items Table -->
        <div class="dmc-day-items-table">
          ${items.map(item => `
            <div class="dmc-item-row ${item.tag ? 'has-tag' : ''}">
              <div class="item-desc-col">
                <div class="item-title-line">
                  <span class="item-bullet">•</span>
                  <span class="item-name">${escapeHTML(item.title)}</span>
                  ${item.tag ? renderTagBadge(item.tag) : ''}
                </div>
                ${item.subtitle ? `
                  <div class="item-subtitle">${escapeHTML(item.subtitle)}</div>
                ` : ''}
              </div>
              <div class="item-pax-col">
                ${item.pax ? `<span class="col-val">${item.pax}</span>` : '<span class="col-val">—</span>'}
              </div>
              <div class="item-inr-col">
                ${item.amountINR ? `<span class="col-val">${formatCurrencyINR(item.amountINR)}</span>` : '<span class="col-val">—</span>'}
              </div>
              <div class="item-usd-col">
                ${item.amountUSD ? `<span class="col-val">${formatCurrencyUSD(item.amountUSD)}</span>` : '<span class="col-val">—</span>'}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Optional Hotel Information Block -->
        ${hasHotel ? `
        <div class="dmc-hotel-row">
          <div class="hotel-info-left">
            <div class="hotel-name-line">
              <span class="hotel-label">Hotel :</span>
              <strong class="hotel-title">${escapeHTML(day.hotel.name)}</strong>
              ${day.hotel.dates ? `<span class="hotel-stay-dates">(${escapeHTML(day.hotel.dates)})</span>` : ''}
            </div>
            ${(day.hotel.roomType || day.hotel.mealPlan || day.hotel.notes) ? `
            <div class="hotel-sub-details">
              ${day.hotel.roomType ? `<span class="hotel-pill">🛏️ ${escapeHTML(day.hotel.roomType)}</span>` : ''}
              ${day.hotel.mealPlan ? `<span class="hotel-pill">☕ ${escapeHTML(day.hotel.mealPlan)}</span>` : ''}
              ${day.hotel.notes ? `<span class="hotel-note-text">${escapeHTML(day.hotel.notes)}</span>` : ''}
            </div>` : ''}
          </div>
          <div class="hotel-pricing-right">
            ${day.hotel.amountINR ? `<div class="hotel-inr">${formatCurrencyINR(day.hotel.amountINR)}</div>` : ''}
            ${day.hotel.amountUSD ? `<div class="hotel-usd">${formatCurrencyUSD(day.hotel.amountUSD)}</div>` : ''}
          </div>
        </div>` : ''}

        <!-- Special Notes / Leisure Note -->
        ${day.dayNotes ? `
        <div class="dmc-day-footnote">
          <span class="fn-icon">ℹ️</span>
          <span class="fn-text">${escapeHTML(day.dayNotes)}</span>
        </div>` : ''}
      </div>
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
