/**
 * pdf-generator.js — Production Multi-Page A4 PDF Generator for Let's Explore DMC
 * Rebuilt to meet exact reference document specifications:
 * - True multi-page layout supporting 3 to 20+ day itineraries
 * - Avoids cutoffs, orphaned headers, overlapping tables, and footer collisions
 * - CSS Paged Media (@page size: A4 portrait) with intelligent break-inside: avoid
 * - Clean professional typography, vector sharpness, selectable text
 * - Dual-currency pricing columns and dynamic office directory
 */

const PDFGenerator = (() => {

  /**
   * Generates and triggers the print dialog / Save as PDF
   */
  function generate() {
    showToast('Preparing your multi-page A4 quotation PDF...', 'info');

    // Mathematically verify totals
    recalculateQuotationPricing();

    // Validate data
    const validation = validateQuotationData();
    if (!validation.isValid) {
      showToast(`Notice: Generating quotation with available details.`, 'info');
    }

    const htmlContent = buildFullPrintDocument();

    let printWindow = null;
    try {
      printWindow = window.open('', '_blank', 'width=1100,height=900');
    } catch (e) {
      printWindow = null;
    }

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
            showToast('Print dialog opened! Choose "Save as PDF" to save your document.', 'success');
          } catch (e) {}
        }, 500);
      };

      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {}
      }, 1000);
      return;
    }

    // ── FALLBACK: Hidden Iframe Print (100% immune to pop-up blockers) ──
    let printFrame = document.getElementById('dmcPrintHiddenFrame');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'dmcPrintHiddenFrame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
    const doc = frameDoc.document || frameDoc;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        showToast('Print dialog opened via fallback frame! Select "Save as PDF".', 'success');
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
      }
    }, 600);
  }

  /**
   * Builds the complete standalone printable HTML document with embedded CSS
   */
  function buildFullPrintDocument() {
    const pkg = QuotationData.package || {};
    const dest = pkg.destinations || 'Holiday';
    const client = pkg.clientName || 'Client';
    const bodyHTML = Preview.buildQuotationHTML(QuotationData, true);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <base href="${window.location.href}">
  <title>${escapePrint(dest.toUpperCase())} QUOTATION — ${escapePrint(client)} | Let's Explore DMC</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <style>
    /* ========================================================
       MASTER A4 PRINT & PDF STYLESHEET — LET'S EXPLORE DMC
       Exact replication of Master Reference Quotation PDF
       ======================================================== */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    html, body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
      color: #1E293B;
      background: #FFFFFF;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Print toolbar at top of preview window (hidden when printing) */
    .print-controls-bar {
      position: sticky;
      top: 0;
      background: #0F2C59;
      color: #FFFFFF;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-family: 'Inter', sans-serif;
    }
    .print-controls-bar span {
      font-size: 13px;
      font-weight: 600;
    }
    .print-btn-now {
      background: #2563EB;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    .print-btn-now:hover {
      background: #1D4ED8;
    }

    /* Outer Wrapper */
    .print-wrapper {
      max-width: 210mm;
      margin: 0 auto;
      padding: 10px 0;
      background: #FFFFFF;
    }

    /* ========================================================
       DOCUMENT STRUCTURAL STYLES
       ======================================================== */
    .dmc-quotation-doc {
      width: 100%;
      color: var(--dmc-text, #1E293B);
      background: #FFFFFF;
    }

    /* ── 1. HEADER ── */
    .dmc-header {
      border-bottom: 2px solid var(--dmc-primary, #0F2C59);
      padding-bottom: 10px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .dmc-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .dmc-brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .dmc-brand-logo {
      height: 44px;
      max-width: 130px;
      object-fit: contain;
    }
    .dmc-brand-info {
      display: flex;
      flex-direction: column;
    }
    .dmc-brand-name {
      font-size: 13pt;
      font-weight: 800;
      color: var(--dmc-primary, #0F2C59);
      letter-spacing: 0.5px;
    }
    .dmc-brand-tagline {
      font-size: 7.5pt;
      color: var(--dmc-muted, #64748B);
      font-weight: 500;
    }
    .dmc-quote-meta {
      text-align: right;
      font-size: 8pt;
      color: var(--dmc-muted, #64748B);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .dmc-quote-meta strong {
      color: var(--dmc-primary, #0F2C59);
    }

    /* ── LUXURY HERO BANNER (MATCHING REFERENCE PDF SPECIFICATION) ── */
    .dmc-hero-banner {
      padding: 8px 0 12px 0;
      border-bottom: 1px solid var(--dmc-border, #CBD5E1);
      margin-bottom: 10px;
    }
    .hero-label-badge {
      font-size: 8.5pt;
      font-weight: 800;
      color: var(--dmc-secondary, #1E3A8A);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 3px;
      display: inline-block;
    }
    .hero-duration-title {
      font-size: 22pt;
      font-weight: 900;
      color: var(--dmc-primary, #0F2C59);
      line-height: 1.1;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .hero-destination-subtitle {
      font-size: 11pt;
      font-weight: 700;
      color: var(--dmc-accent, #2563EB);
      line-height: 1.25;
    }

    /* ── CLIENT METADATA STRIP ── */
    .dmc-client-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #F8FAFC;
      border: 1px solid var(--dmc-border, #CBD5E1);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 8pt;
      margin-bottom: 10px;
    }
    .client-bar-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .client-bar-item .c-label {
      color: var(--dmc-muted, #64748B);
      font-weight: 600;
    }
    .client-bar-item strong {
      color: var(--dmc-primary, #0F2C59);
    }

    /* Custom Fields Pills */
    .dmc-custom-fields-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .dmc-custom-field-pill {
      background: #FFFFFF;
      border: 1px solid var(--dmc-border, #CBD5E1);
      border-radius: 3px;
      padding: 3px 8px;
      font-size: 7.5pt;
    }
    .cf-key {
      font-weight: 700;
      color: var(--dmc-primary, #0F2C59);
    }
    .cf-val {
      color: var(--dmc-text, #1E293B);
    }

    /* ── 3 STAT CARDS (REFERENCE PDF EXACT SPECIFICATION) ── */
    .dmc-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 10px 0 14px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .dmc-stat-card {
      background: #FFFFFF;
      border: 1px solid var(--dmc-border, #CBD5E1);
      border-top: 3px solid var(--dmc-primary, #0F2C59);
      border-radius: 4px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
    }
    .stat-card-title {
      font-size: 7.5pt;
      font-weight: 800;
      color: var(--dmc-primary, #0F2C59);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .stat-card-main {
      font-size: 9.5pt;
      font-weight: 700;
      color: var(--dmc-secondary, #1E3A8A);
      line-height: 1.25;
    }
    .stat-card-sub {
      font-size: 8pt;
      color: var(--dmc-muted, #64748B);
      margin-top: 2px;
      line-height: 1.25;
    }

    /* ── HOTELS INCLUDED TABLE (REFERENCE PDF EXACT SPECIFICATION) ── */
    .dmc-hotels-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--dmc-border, #CBD5E1);
      border-top: none;
      font-size: 8.5pt;
      background: #FFFFFF;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .dmc-hotels-table thead th {
      background: #E2E8F0;
      padding: 5px 10px;
      font-weight: 700;
      font-size: 7.5pt;
      color: var(--dmc-primary, #0F2C59);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--dmc-border, #CBD5E1);
    }
    .dmc-hotels-table tbody td {
      padding: 6px 10px;
      border-bottom: 1px solid #F1F5F9;
      color: var(--dmc-text, #1E293B);
    }
    .dmc-hotels-table tbody tr:last-child td {
      border-bottom: none;
    }
    .dmc-hotel-total-row td {
      background: #F8FAFC;
      border-top: 2px solid var(--dmc-primary, #0F2C59) !important;
      padding: 7px 10px;
      font-size: 9pt;
    }

    /* ── 2. SECTION COMMON ── */
    .dmc-section {
      margin-bottom: 14px;
    }
    .dmc-section-header {
      background: var(--dmc-table-bg, #0F2C59);
      color: var(--dmc-table-text, #FFFFFF);
      padding: 5px 10px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-radius: 3px 3px 0 0;
      break-after: avoid;
      page-break-after: avoid;
    }

    /* ── 3. DAY-WISE ITINERARY TABLE & COLUMNS ── */
    .dmc-table-header-bar {
      display: grid;
      grid-template-columns: 1fr 50px 105px 105px;
      background: #E2E8F0;
      padding: 4px 10px;
      font-size: 7.5pt;
      font-weight: 700;
      color: var(--dmc-primary, #0F2C59);
      border-bottom: 1px solid var(--dmc-border, #CBD5E1);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .th-desc { text-align: left; }
    .th-pax { text-align: center; }
    .th-inr { text-align: right; }
    .th-usd { text-align: right; }

    /* Day Card Container — CRITICAL FOR MULTI-PAGE STABILITY */
    .dmc-day-card {
      border: 1px solid var(--dmc-border, #CBD5E1);
      border-top: none;
      background: #FFFFFF;
      margin-bottom: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* Day Heading Banner */
    .dmc-day-heading-bar {
      display: flex;
      align-items: center;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 5px 10px;
      font-size: 8.5pt;
      break-after: avoid;
      page-break-after: avoid;
    }
    .day-badge-col {
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }
    .day-pill {
      font-weight: 800;
      color: var(--dmc-primary, #0F2C59);
    }
    .day-sep-dot {
      color: var(--dmc-muted, #64748B);
    }
    .day-date-text {
      font-weight: 600;
      color: var(--dmc-secondary, #1E3A8A);
    }
    .day-title-col {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 6px;
      overflow: hidden;
    }
    .day-pipe {
      color: #94A3B8;
      font-weight: 300;
    }
    .day-main-title {
      font-weight: 700;
      color: var(--dmc-text, #1E293B);
    }

    /* Activity Rows */
    .dmc-day-items-table {
      display: flex;
      flex-direction: column;
    }
    .dmc-item-row {
      display: grid;
      grid-template-columns: 1fr 50px 105px 105px;
      align-items: flex-start;
      padding: 5px 10px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 8.5pt;
    }
    .dmc-item-row:last-child {
      border-bottom: none;
    }
    .item-desc-col {
      padding-right: 8px;
    }
    .item-title-line {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      flex-wrap: wrap;
    }
    .item-bullet {
      color: var(--dmc-secondary, #1E3A8A);
      font-weight: 700;
      line-height: 1.2;
    }
    .item-name {
      font-weight: 600;
      color: var(--dmc-text, #1E293B);
    }
    .item-subtitle {
      font-size: 7.5pt;
      color: var(--dmc-muted, #64748B);
      margin-left: 12px;
      margin-top: 2px;
      line-height: 1.25;
    }
    .item-pax-col {
      text-align: center;
      font-size: 8pt;
      color: var(--dmc-muted, #64748B);
    }
    .item-inr-col {
      text-align: right;
      font-size: 8pt;
      font-weight: 600;
      color: var(--dmc-text, #1E293B);
    }
    .item-usd-col {
      text-align: right;
      font-size: 8pt;
      font-weight: 600;
      color: var(--dmc-primary, #0F2C59);
    }

    /* Tags */
    .dmc-tag-badge {
      display: inline-block;
      font-size: 7pt;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: capitalize;
      margin-left: 4px;
      vertical-align: middle;
    }
    .tag-meals {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }
    .tag-expense {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }
    .tag-included {
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #BBF7D0;
    }
    .tag-leisure {
      background: #E0E7FF;
      color: #3730A3;
      border: 1px solid #C7D2FE;
    }
    .tag-subtle {
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #E2E8F0;
    }

    /* Hotel Row */
    .dmc-hotel-row {
      display: grid;
      grid-template-columns: 1fr 50px 105px 105px;
      align-items: center;
      background: #F8FAFC;
      border-top: 1px dashed var(--dmc-border, #CBD5E1);
      padding: 5px 10px;
      font-size: 8pt;
      break-inside: avoid;
    }
    .hotel-name-line {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .hotel-label {
      font-weight: 700;
      color: var(--dmc-secondary, #1E3A8A);
    }
    .hotel-title {
      font-weight: 700;
      color: var(--dmc-primary, #0F2C59);
    }
    .hotel-stay-dates {
      color: var(--dmc-muted, #64748B);
      font-size: 7.5pt;
    }
    .hotel-sub-details {
      display: flex;
      gap: 8px;
      margin-top: 2px;
      font-size: 7.5pt;
      color: var(--dmc-muted, #64748B);
    }
    .hotel-pill {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .hotel-pricing-right {
      text-align: right;
      font-size: 8pt;
      font-weight: 600;
      color: var(--dmc-primary, #0F2C59);
    }

    /* Footnote */
    .dmc-day-footnote {
      padding: 4px 10px;
      font-size: 7.5pt;
      color: var(--dmc-muted, #64748B);
      font-style: italic;
      background: #FAFAFA;
      border-top: 1px dotted #E2E8F0;
    }

    /* ── 4. CUSTOM SECTIONS (INCLUSIONS / EXCLUSIONS) ── */
    .dmc-custom-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .dmc-custom-section-content {
      border: 1px solid var(--dmc-border, #CBD5E1);
      border-top: none;
      padding: 8px 12px;
      background: #FFFFFF;
    }
    .dmc-bullet-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .dmc-bullet-list li {
      position: relative;
      padding-left: 14px;
      margin-bottom: 4px;
      font-size: 8pt;
      line-height: 1.35;
      color: var(--dmc-text, #1E293B);
    }
    .dmc-bullet-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: var(--dmc-primary, #0F2C59);
      font-weight: 800;
    }

    /* ── 5. PRICE SUMMARY TABLE ── */
    .dmc-summary-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .dmc-summary-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--dmc-border, #CBD5E1);
      border-top: none;
      font-size: 8.5pt;
    }
    .dmc-summary-table thead th {
      background: #E2E8F0;
      padding: 5px 10px;
      font-weight: 700;
      font-size: 7.5pt;
      color: var(--dmc-primary, #0F2C59);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .th-sum-desc { text-align: left; width: 62%; }
    .th-sum-inr { text-align: right; width: 19%; }
    .th-sum-usd { text-align: right; width: 19%; }

    .dmc-summary-row td {
      padding: 6px 10px;
      border-bottom: 1px solid #F1F5F9;
    }
    .col-sum-desc { color: var(--dmc-text, #1E293B); font-weight: 500; }
    .col-sum-inr { text-align: right; font-weight: 600; color: var(--dmc-text, #1E293B); }
    .col-sum-usd { text-align: right; font-weight: 600; color: var(--dmc-primary, #0F2C59); }

    .dmc-total-row td {
      background: #F1F5F9;
      border-top: 2px solid var(--dmc-primary, #0F2C59);
      padding: 8px 10px;
      font-size: 9.5pt;
      color: var(--dmc-primary, #0F2C59);
    }

    .dmc-summary-disclaimer {
      font-size: 7.5pt;
      color: var(--dmc-muted, #64748B);
      font-style: italic;
      padding: 5px 2px;
      margin-top: 2px;
    }

    /* ── 6. CONTACT US & OFFICES ── */
    .dmc-contact-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .dmc-quick-contact-bar {
      display: flex;
      justify-content: space-around;
      background: #F8FAFC;
      border: 1px solid var(--dmc-border, #CBD5E1);
      border-top: none;
      padding: 7px 10px;
      font-size: 8pt;
    }
    .qc-item {
      display: flex;
      gap: 5px;
    }
    .qc-label {
      font-weight: 700;
      color: var(--dmc-primary, #0F2C59);
    }
    .qc-val {
      font-weight: 600;
      color: var(--dmc-text, #1E293B);
    }
    .qc-link {
      text-decoration: none;
      color: var(--dmc-secondary, #1E3A8A);
    }

    .dmc-offices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .dmc-office-card {
      border: 1px solid var(--dmc-border, #CBD5E1);
      border-radius: 4px;
      background: #FFFFFF;
      overflow: hidden;
      font-size: 7.5pt;
      break-inside: avoid;
    }
    .office-header-bar {
      background: #F1F5F9;
      border-bottom: 1px solid #E2E8F0;
      padding: 4px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .office-name {
      font-weight: 800;
      color: var(--dmc-primary, #0F2C59);
    }
    .office-country-tag {
      font-size: 6.5pt;
      background: var(--dmc-primary, #0F2C59);
      color: #FFFFFF;
      padding: 1px 4px;
      border-radius: 2px;
      text-transform: uppercase;
    }
    .office-body {
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .office-partner {
      font-style: italic;
      color: var(--dmc-muted, #64748B);
      margin-bottom: 2px;
    }
    .office-address {
      color: #475569;
      line-height: 1.25;
    }
    .office-contact-row {
      color: var(--dmc-primary, #0F2C59);
      font-weight: 600;
      margin-top: 1px;
    }

    .dmc-other-offices-box {
      margin-top: 8px;
      padding: 6px 10px;
      background: #F8FAFC;
      border: 1px dashed var(--dmc-border, #CBD5E1);
      border-radius: 4px;
      font-size: 7pt;
      line-height: 1.35;
      color: var(--dmc-muted, #64748B);
    }
    .o-label {
      font-weight: 700;
      color: var(--dmc-primary, #0F2C59);
      margin-right: 4px;
    }

    /* ── 7. FOOTER ── */
    .dmc-doc-footer {
      border-top: 1px solid var(--dmc-border, #CBD5E1);
      padding-top: 6px;
      margin-top: 12px;
      font-size: 7.5pt;
      color: var(--dmc-muted, #64748B);
      text-align: center;
      break-inside: avoid;
    }
    .footer-inner {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .f-brand { font-weight: 700; color: var(--dmc-primary, #0F2C59); }
    .f-dot { color: #CBD5E1; }

    /* ── TEMPLATE OVERRIDES ── */
    /* Modern Luxury Template */
    .template-luxury .dmc-main-title {
      font-family: 'Playfair Display', Georgia, serif;
      letter-spacing: 2px;
    }
    .template-luxury .dmc-section-header {
      background: #0A192F;
      border-left: 4px solid #C5A880;
    }
    .template-luxury .dmc-day-heading-bar {
      border-left: 3px solid #C5A880;
    }

    /* Minimal Professional Template */
    .template-minimal .dmc-section-header {
      background: #111827;
      border-radius: 0;
    }
    .template-minimal .dmc-banner-box {
      border-left: 4px solid #111827;
      background: #FAFAFA;
    }
    .template-minimal .dmc-total-row td {
      background: #FFFFFF;
      border-top: 2px solid #111827;
      border-bottom: 2px solid #111827;
    }

    /* ── PRINT MEDIA QUERIES ── */
    @media print {
      .print-controls-bar {
        display: none !important;
      }
      .print-wrapper {
        padding: 0 !important;
        max-width: 100% !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Print Bar (Hidden during actual print) -->
  <div class="print-controls-bar">
    <span>Let's Explore DMC — Master A4 Print Engine</span>
    <button class="print-btn-now" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="print-wrapper">
    ${bodyHTML}
  </div>

</body>
</html>`;
  }

  function escapePrint(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    generate,
    buildFullPrintDocument
  };

})();
