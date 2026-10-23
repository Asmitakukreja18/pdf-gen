/**
 * preview.js — Master Quotation Document Preview Renderer
 * Renders the locked, pixel-perfect 12-section Let's Explore DMC quotation.
 * Master Design Reference: Bali Holiday Quotation PDF.
 */

const Preview = (() => {

  /**
   * Main render function called when entering Preview section
   */
  function render() {
    const container = document.getElementById('previewDocument');
    if (!container) return;

    // Recalculate totals first
    recalculateQuotationPricing();

    // Generate HTML for the master quotation
    container.innerHTML = buildQuotationHTML(QuotationData);
  }

  /**
   * Builds the complete 12-section quotation HTML.
   * Can be used by both the browser preview and the PDF generator for 100% parity.
   */
  function buildQuotationHTML(data, isForPrint = false) {
    const d = data || QuotationData;
    const destUpper = (d.trip.destination || 'HOLIDAY').toUpperCase();
    const destCountry = d.trip.country ? `${d.trip.destination}, ${d.trip.country}` : (d.trip.destination || '—');
    const monthYear = (d.trip.travelDate || 'UPCOMING').toUpperCase();
    const prepDate = d.meta?.preparedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const paxSummary = d.trip.travellers || '2 Adults';
    const sharingType = d.landArrangement.sharing || 'Twin Share';
    const hotelName = d.landArrangement.hotel || 'Leading Category Hotel';
    const nightsCount = d.landArrangement.nights || '4';
    const landDates = d.landArrangement.dates || d.trip.travelDate || '—';

    // Inclusions line
    const inclusionsText = d.landArrangement.inclusions && d.landArrangement.inclusions.length > 0
      ? d.landArrangement.inclusions.join(' • ')
      : `${nightsCount} nights accommodation on ${sharingType.toLowerCase()} • Private car • English-speaking driver • Parking • Entrance fees • Sightseeing as per programme above`;

    // Notes
    const noteText = d.landArrangement.note || CONFIG.DEFAULT_ACCOMMODATION_NOTE;

    // Pricing
    const fPrice = formatCurrencyINR(d.pricing.flights);
    const lPrice = formatCurrencyINR(d.pricing.landPackage);
    const tPrice = formatCurrencyINR(d.pricing.total);

    // Flight table data
    const origin = d.flights.origin || 'DEL';
    const destCode = d.flights.destination || 'DPS';
    const cabin = d.flights.cabinClass || 'Economy';
    const routeSummary = d.flights.routeSummary || `${d.client.pickupFrom || 'Delhi'} – ${d.trip.destination || 'Bali'} – ${d.client.pickupFrom || 'Delhi'}`;

    const onward = d.flights.onward || {};
    const ret = d.flights.return || {};

    return `
      <div class="quotation-page ${isForPrint ? 'printable' : ''}">

        <!-- 1. QUOTATION HEADER -->
        <header class="q-header">
          <div class="q-brand-row">
            <div class="q-logo-col">
              <img src="${CONFIG.COMPANY.logo}" alt="${CONFIG.COMPANY.name}" class="q-logo-img" />
              <div class="q-brand-meta">
                <span class="q-company-title">${CONFIG.COMPANY.name}</span>
                <span class="q-company-tagline">${CONFIG.COMPANY.tagline}</span>
              </div>
            </div>
            <div class="q-title-col">
              <h1 class="q-main-title">${destUpper} HOLIDAY QUOTATION</h1>
              <div class="q-subtitle">Flights + Land Package | ${monthYear}</div>
              <div class="q-prepared-by">Prepared by Let's Explore DMC · ${prepDate}</div>
            </div>
          </div>
        </header>

        <!-- 2. CLIENT DETAILS -->
        <section class="q-section q-client-section">
          <div class="q-section-header">CLIENT DETAILS</div>
          <div class="q-client-grid">
            <div class="q-client-item">
              <span class="q-client-label">Client Name</span>
              <span class="q-client-val"><strong>${d.client.name || 'Not provided'}</strong></span>
            </div>
            <div class="q-client-item">
              <span class="q-client-label">Contact Number</span>
              <span class="q-client-val">${d.client.contact || 'Not provided'}</span>
            </div>
            <div class="q-client-item">
              <span class="q-client-label">Destination</span>
              <span class="q-client-val">${destCountry}</span>
            </div>
            <div class="q-client-item">
              <span class="q-client-label">Travel Date</span>
              <span class="q-client-val">${d.trip.travelDate || 'Not provided'}</span>
            </div>
            <div class="q-client-item">
              <span class="q-client-label">Duration</span>
              <span class="q-client-val">${d.trip.duration || 'Not provided'}</span>
            </div>
            <div class="q-client-item">
              <span class="q-client-label">Travellers</span>
              <span class="q-client-val">${d.trip.travellers || 'Not provided'}</span>
            </div>
            <div class="q-client-item">
              <span class="q-client-label">Pickup From</span>
              <span class="q-client-val">${d.client.pickupFrom || 'Not provided'}</span>
            </div>
            <div class="q-client-item">
              <span class="q-client-label">Client Details</span>
              <span class="q-client-val">${d.client.details || d.client.contact || 'Not provided'}</span>
            </div>
          </div>
        </section>

        <!-- 3. FLIGHT DETAILS -->
        <section class="q-section q-flight-section">
          <div class="q-section-header">FLIGHT DETAILS · ${origin} ⇄ ${destCode} · ${cabin}</div>
          <table class="q-table q-flight-table">
            <thead>
              <tr>
                <th style="width:20%">FLIGHT</th>
                <th style="width:34%">ROUTE</th>
                <th style="width:30%">TIMINGS (LOCAL)</th>
                <th style="width:16%">DURATION</th>
              </tr>
            </thead>
            <tbody>
              <!-- ONWARD FLIGHT -->
              <tr class="q-flight-row">
                <td>
                  <div class="q-badge-onward">ONWARD</div>
                  <div class="q-flight-airline"><strong>${onward.airline || 'IndiGo'}</strong></div>
                  <div class="q-flight-num">${onward.flightNumber || 'Not provided'}</div>
                </td>
                <td>
                  <div class="q-route-text">${onward.route || `${origin} → ${destCode}`}</div>
                  <div class="q-baggage-note">Baggage: ${onward.baggage || '7 kg cabin + 20 kg check-in'}</div>
                </td>
                <td>
                  <div class="q-timing-item"><strong>Dep:</strong> ${onward.departure || '—'}</div>
                  <div class="q-timing-item"><strong>Arr:</strong> ${onward.arrival || '—'}</div>
                </td>
                <td>
                  <div class="q-flight-dur">${onward.duration || '—'}</div>
                </td>
              </tr>
              <!-- RETURN FLIGHT -->
              <tr class="q-flight-row">
                <td>
                  <div class="q-badge-return">RETURN</div>
                  <div class="q-flight-airline"><strong>${ret.airline || onward.airline || 'IndiGo'}</strong></div>
                  <div class="q-flight-num">${ret.flightNumber || 'Not provided'}</div>
                </td>
                <td>
                  <div class="q-route-text">${ret.route || `${destCode} → ${origin}`}</div>
                  <div class="q-baggage-note">Baggage: ${ret.baggage || onward.baggage || '7 kg cabin + 20 kg check-in'}</div>
                </td>
                <td>
                  <div class="q-timing-item"><strong>Dep:</strong> ${ret.departure || '—'}</div>
                  <div class="q-timing-item"><strong>Arr:</strong> ${ret.arrival || '—'}</div>
                </td>
                <td>
                  <div class="q-flight-dur">${ret.duration || '—'}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 4. LAND ARRANGEMENT & DAY-WISE ITINERARY -->
        <section class="q-section q-land-section">
          <div class="q-section-header">LAND ARRANGEMENT · ${nightsCount} Nights at ${hotelName} (${sharingType}) · ${landDates}</div>
          <div class="q-itinerary-list">
            ${(d.landArrangement.itinerary || []).map(item => `
              <div class="q-itinerary-row">
                <span class="q-day-badge">${item.day}</span>
                <span class="q-day-activity">${item.activity}</span>
              </div>
            `).join('')}
          </div>

          <!-- 5. INCLUSIONS -->
          <div class="q-inclusions-box">
            <strong>Inclusions:</strong> ${inclusionsText}
          </div>

          <!-- 6. NOTE -->
          <div class="q-note-box">
            <strong>Note:</strong> ${noteText}
          </div>
        </section>

        <!-- 7. PRICE SUMMARY -->
        <section class="q-section q-pricing-section">
          <div class="q-section-header">PRICE SUMMARY · ${paxSummary}</div>
          <table class="q-table q-pricing-table">
            <tbody>
              <tr>
                <td class="q-price-desc">Flights (${routeSummary}, ${cabin}, taxes incl.)</td>
                <td class="q-price-amount">${fPrice}</td>
              </tr>
              <tr>
                <td class="q-price-desc">Land package + accommodation (${nightsCount}N, ${sharingType.toLowerCase()})</td>
                <td class="q-price-amount">${lPrice}</td>
              </tr>
              <tr class="q-total-row">
                <td class="q-price-desc"><strong>TOTAL PACKAGE COST (${paxSummary})</strong></td>
                <td class="q-price-amount"><strong>${tPrice}</strong></td>
              </tr>
            </tbody>
          </table>

          <!-- 8. IMPORTANT PRICE / DYNAMIC FARE NOTE -->
          <div class="q-dynamic-fare-note">
            ${CONFIG.DYNAMIC_FARE_NOTE}
          </div>
        </section>

        <!-- 9. THANK YOU / CONTACT -->
        <section class="q-contact-bar">
          <div class="q-thankyou-title">${CONFIG.THANK_YOU_TITLE}</div>
          <div class="q-support-row">
            <span class="q-support-label">${CONFIG.SUPPORT_LABEL}</span>
            <span class="q-support-item"><strong>${d.contact.person || CONFIG.COMPANY.defaultContactPerson}</strong></span>
            <span class="q-support-sep">·</span>
            <span class="q-support-item">☎ ${d.contact.phone || CONFIG.COMPANY.phone1}</span>
            <span class="q-support-sep">·</span>
            <span class="q-support-item">✉ ${d.contact.email || CONFIG.COMPANY.email}</span>
            <span class="q-support-sep">·</span>
            <span class="q-support-item">🌐 ${d.contact.website || CONFIG.COMPANY.website}</span>
          </div>
        </section>

        <!-- 10. OUR GLOBAL DESKS -->
        <section class="q-section q-desks-section">
          <div class="q-desks-header">OUR GLOBAL DESKS</div>
          <div class="q-desks-grid">
            <div class="q-desk-card">
              <div class="q-desk-title">${CONFIG.GLOBAL_DESKS[0].title}</div>
              <div class="q-desk-company">${CONFIG.GLOBAL_DESKS[0].company}</div>
              <div class="q-desk-address">${CONFIG.GLOBAL_DESKS[0].address}</div>
              <div class="q-desk-contact"><a href="mailto:${CONFIG.GLOBAL_DESKS[0].email}">${CONFIG.GLOBAL_DESKS[0].email}</a></div>
            </div>
            <div class="q-desk-card">
              <div class="q-desk-title">${CONFIG.GLOBAL_DESKS[1].title}</div>
              <div class="q-desk-contact-person">${CONFIG.GLOBAL_DESKS[1].contact}</div>
              <div class="q-desk-company">${CONFIG.GLOBAL_DESKS[1].company}</div>
              <div class="q-desk-address">${CONFIG.GLOBAL_DESKS[1].address}</div>
              <div class="q-desk-contact">☎ ${CONFIG.GLOBAL_DESKS[1].phone} · <a href="mailto:${CONFIG.GLOBAL_DESKS[1].email}">${CONFIG.GLOBAL_DESKS[1].email}</a></div>
            </div>
            <div class="q-desk-card">
              <div class="q-desk-title">${CONFIG.GLOBAL_DESKS[2].title}</div>
              <div class="q-desk-contact-person">${CONFIG.GLOBAL_DESKS[2].contact}</div>
              <div class="q-desk-contact">☎ ${CONFIG.GLOBAL_DESKS[2].phones[0]}</div>
              <div class="q-desk-contact">☎ ${CONFIG.GLOBAL_DESKS[2].phones[1]}</div>
              <div class="q-desk-contact"><a href="${CONFIG.COMPANY.websiteUrl}" target="_blank">${CONFIG.GLOBAL_DESKS[2].website}</a></div>
              <div class="q-desk-contact">Instagram: ${CONFIG.GLOBAL_DESKS[2].instagram}</div>
            </div>
          </div>
        </section>

        <!-- 11. OUR OTHER OFFICES -->
        <section class="q-section q-other-offices-section">
          <div class="q-other-header">OUR OTHER OFFICES</div>
          <div class="q-offices-list">
            ${CONFIG.OTHER_OFFICES.join(' · ')}
          </div>
        </section>

        <!-- 12. FINAL FOOTER -->
        <footer class="q-footer">
          <div class="q-footer-inner">
            <span><strong>${CONFIG.COMPANY.brandTitle}</strong></span>
            <span class="q-foot-sep">·</span>
            <span>☎ ${CONFIG.COMPANY.phone1}</span>
            <span class="q-foot-sep">·</span>
            <span>☎ ${CONFIG.COMPANY.phone2}</span>
            <span class="q-foot-sep">·</span>
            <span><a href="${CONFIG.COMPANY.websiteUrl}" target="_blank">${CONFIG.COMPANY.website}</a></span>
            <span class="q-foot-sep">·</span>
            <span>Instagram: ${CONFIG.COMPANY.instagram}</span>
          </div>
        </footer>

      </div>
    `;
  }

  return {
    render,
    buildQuotationHTML
  };

})();
