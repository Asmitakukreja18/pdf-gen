/**
 * pdf-generator.js — Production A4 PDF Generator for Let's Explore DMC
 * Generates an exact print-ready A4 document matching the master quotation reference.
 */

const PDFGenerator = (() => {

  /**
   * Generates and triggers the print dialog / Save as PDF
   */
  function generate() {
    showToast('Preparing your professional A4 quotation PDF...', 'info');

    // Mathematically verify totals
    recalculateQuotationPricing();

    // Validate data and check for missing fields
    const validation = validateQuotationData();
    if (!validation.isValid) {
      showToast(`Warning: Missing ${validation.missingFields.join(', ')}. Generating with available data.`, 'warning');
    }

    const htmlContent = buildFullPrintDocument();

    const printWindow = window.open('', '_blank', 'width=1000,height=850');
    if (!printWindow) {
      showToast('Pop-up was blocked. Please allow pop-ups for this page to download PDF.', 'error');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        showToast('PDF print dialog opened! Choose "Save as PDF" to save the quotation.', 'success');
      }, 600);
    };
  }

  /**
   * Assembles the complete standalone printable HTML document with embedded CSS
   */
  function buildFullPrintDocument() {
    const dest = QuotationData.trip.destination || 'Holiday';
    const client = QuotationData.client.name || 'Client';
    const bodyHTML = Preview.buildQuotationHTML(QuotationData, true);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <base href="${window.location.href}">
  <title>${dest.toUpperCase()} HOLIDAY QUOTATION — ${client} | Let's Explore DMC</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* ========================================================
       MASTER A4 PRINT STYLESHEET — LET'S EXPLORE DMC
       Exact replication of Reference Bali Quotation PDF
       ======================================================== */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
    }

    html, body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.35;
      color: #1E293B;
      background: #FFFFFF;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .quotation-page {
      max-width: 210mm;
      margin: 0 auto;
      background: #FFFFFF;
      color: #1E293B;
    }

    /* ── 1. HEADER ── */
    .q-header {
      border-bottom: 2px solid #0F2C59;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .q-brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .q-logo-col {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .q-logo-img {
      max-height: 48px;
      max-width: 140px;
      object-fit: contain;
    }
    .q-brand-meta {
      display: flex;
      flex-direction: column;
    }
    .q-company-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0F2C59;
      letter-spacing: 0.5px;
    }
    .q-company-tagline {
      font-size: 8pt;
      color: #64748B;
      font-weight: 500;
    }
    .q-title-col {
      text-align: right;
    }
    .q-main-title {
      font-size: 14pt;
      font-weight: 800;
      color: #0F2C59;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .q-subtitle {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1E3A8A;
      margin-top: 2px;
    }
    .q-prepared-by {
      font-size: 8pt;
      color: #64748B;
      margin-top: 2px;
    }

    /* ── SECTION COMMONS ── */
    .q-section {
      margin-bottom: 9px;
      page-break-inside: avoid;
    }
    .q-section-header {
      background: #0F2C59;
      color: #FFFFFF;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.6px;
      padding: 4px 8px;
      border-radius: 3px 3px 0 0;
      text-transform: uppercase;
    }

    /* ── 2. CLIENT DETAILS ── */
    .q-client-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      border: 1px solid #CBD5E1;
      border-top: none;
      background: #FFFFFF;
    }
    .q-client-item {
      display: flex;
      padding: 4px 8px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 8.5pt;
    }
    .q-client-item:nth-child(odd) {
      border-right: 1px solid #E2E8F0;
    }
    .q-client-label {
      width: 120px;
      flex-shrink: 0;
      font-weight: 600;
      color: #475569;
    }
    .q-client-val {
      flex: 1;
      color: #0F172A;
    }

    /* ── 3. FLIGHT DETAILS ── */
    .q-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      border: 1px solid #CBD5E1;
      border-top: none;
    }
    .q-table th {
      background: #F1F5F9;
      color: #0F2C59;
      font-weight: 700;
      text-align: left;
      padding: 4px 8px;
      border-bottom: 1px solid #CBD5E1;
      font-size: 8pt;
      letter-spacing: 0.4px;
    }
    .q-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
    }
    .q-badge-onward, .q-badge-return {
      display: inline-block;
      font-size: 7pt;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      margin-bottom: 2px;
      letter-spacing: 0.3px;
    }
    .q-badge-onward {
      background: #EFF6FF;
      color: #1E40AF;
      border: 1px solid #BFDBFE;
    }
    .q-badge-return {
      background: #F0FDF4;
      color: #166534;
      border: 1px solid #BBF7D0;
    }
    .q-flight-airline {
      color: #0F172A;
    }
    .q-flight-num {
      color: #475569;
      font-weight: 600;
      font-size: 8pt;
    }
    .q-route-text {
      font-weight: 600;
      color: #0F172A;
    }
    .q-baggage-note {
      font-size: 7.5pt;
      color: #64748B;
      margin-top: 2px;
    }
    .q-timing-item {
      font-size: 8pt;
      color: #334155;
    }
    .q-flight-dur {
      font-weight: 600;
      color: #334155;
      font-size: 8pt;
    }

    /* ── 4. LAND ARRANGEMENT & ITINERARY ── */
    .q-land-section {
      border: 1px solid #CBD5E1;
      border-top: none;
      background: #FFFFFF;
    }
    .q-itinerary-list {
      padding: 4px 8px;
    }
    .q-itinerary-row {
      display: flex;
      align-items: baseline;
      padding: 2.5px 0;
      border-bottom: 1px dashed #F1F5F9;
      font-size: 8.5pt;
    }
    .q-day-badge {
      font-weight: 700;
      color: #0F2C59;
      width: 65px;
      flex-shrink: 0;
    }
    .q-day-activity {
      color: #1E293B;
      flex: 1;
    }

    /* ── 5. INCLUSIONS & 6. NOTE ── */
    .q-inclusions-box {
      background: #F8FAFC;
      padding: 5px 8px;
      font-size: 8pt;
      color: #334155;
      border-top: 1px solid #E2E8F0;
      line-height: 1.4;
    }
    .q-note-box {
      padding: 4px 8px;
      font-size: 7.5pt;
      color: #64748B;
      font-style: italic;
      border-top: 1px solid #F1F5F9;
    }

    /* ── 7. PRICE SUMMARY ── */
    .q-pricing-table {
      margin-bottom: 0;
    }
    .q-price-desc {
      font-size: 8.5pt;
      color: #1E293B;
    }
    .q-price-amount {
      width: 140px;
      text-align: right;
      font-weight: 700;
      font-size: 9pt;
      color: #0F2C59;
    }
    .q-total-row {
      background: #F1F5F9;
      border-top: 2px solid #0F2C59;
      border-bottom: 2px solid #0F2C59;
    }
    .q-total-row .q-price-desc {
      font-weight: 800;
      color: #0F2C59;
      font-size: 9pt;
    }
    .q-total-row .q-price-amount {
      font-weight: 800;
      color: #0F2C59;
      font-size: 10pt;
    }

    /* ── 8. DYNAMIC FARE NOTE ── */
    .q-dynamic-fare-note {
      font-size: 7.5pt;
      color: #64748B;
      padding: 3px 8px;
      font-style: italic;
    }

    /* ── 9. THANK YOU / CONTACT ── */
    .q-contact-bar {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      padding: 6px 10px;
      margin-bottom: 9px;
      text-align: center;
      page-break-inside: avoid;
    }
    .q-thankyou-title {
      font-weight: 700;
      color: #0F2C59;
      font-size: 9pt;
      margin-bottom: 3px;
    }
    .q-support-row {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 8pt;
      color: #334155;
    }
    .q-support-sep {
      color: #CBD5E1;
    }

    /* ── 10. GLOBAL DESKS ── */
    .q-desks-section {
      border: 1px solid #CBD5E1;
      border-top: none;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .q-desks-header {
      background: #0F2C59;
      color: #FFFFFF;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 3px 8px;
    }
    .q-desks-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      background: #FFFFFF;
    }
    .q-desk-card {
      padding: 6px 8px;
      font-size: 7.5pt;
      line-height: 1.35;
      border-right: 1px solid #E2E8F0;
    }
    .q-desk-card:last-child {
      border-right: none;
    }
    .q-desk-title {
      font-weight: 700;
      color: #0F2C59;
      margin-bottom: 2px;
      font-size: 7.5pt;
    }
    .q-desk-contact-person {
      font-weight: 600;
      color: #334155;
    }
    .q-desk-company {
      font-weight: 500;
      color: #475569;
    }
    .q-desk-address {
      color: #64748B;
      font-size: 7pt;
    }
    .q-desk-contact a {
      color: #1D4ED8;
      text-decoration: none;
    }

    /* ── 11. OTHER OFFICES ── */
    .q-other-offices-section {
      border: 1px solid #CBD5E1;
      border-top: none;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .q-other-header {
      background: #1E3A8A;
      color: #FFFFFF;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 2.5px 8px;
    }
    .q-offices-list {
      padding: 4px 8px;
      font-size: 7pt;
      color: #475569;
      line-height: 1.45;
      text-align: justify;
      background: #F8FAFC;
    }

    /* ── 12. FINAL FOOTER ── */
    .q-footer {
      border-top: 1.5px solid #0F2C59;
      padding-top: 5px;
      text-align: center;
      font-size: 7.5pt;
      color: #64748B;
      page-break-inside: avoid;
    }
    .q-footer-inner {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .q-foot-sep {
      color: #CBD5E1;
    }
    .q-footer a {
      color: #1D4ED8;
      text-decoration: none;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .quotation-page {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  ${bodyHTML}
</body>
</html>`;
  }

  return {
    generate,
    buildFullPrintDocument
  };

})();
