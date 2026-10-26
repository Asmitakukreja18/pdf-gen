/**
 * docx-generator.js — Production Microsoft Word Document (.doc / .docx) Generator
 * Supports all 7 Let's Explore DMC document formats:
 * - Itinerary (.doc/.docx)
 * - Quotation (.doc/.docx)
 * - Hotel Costing (.doc/.docx)
 * - Package Summary (.doc/.docx)
 * - Travel Confirmation (.doc/.docx)
 * - Tax Invoice (.doc/.docx)
 * - Custom Document (.doc/.docx)
 *
 * Generates an editable Microsoft Word document that opens natively in MS Word,
 * Google Docs, and LibreOffice with full formatting, tables, colors, and headers.
 */

const DOCXGenerator = (() => {

  /**
   * Main entry point to generate and download Word Document
   */
  function generate() {
    try {
      showToast('Preparing your editable Microsoft Word document...', 'info');

      // Verify and recalculate totals first
      if (typeof recalculateQuotationPricing === 'function') {
        recalculateQuotationPricing();
      }

      const docType = QuotationData.activeDocType || 'itinerary';
      const pkg = QuotationData.package || {};
      const destSanitized = (pkg.destinations || 'Holiday').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
      const filename = `Lets_Explore_DMC_${docType.toUpperCase()}_${destSanitized}.doc`;

      // Build complete Word HTML payload with Office XML namespaces
      const wordHTML = buildWordHTMLDocument(QuotationData);

      // Create Blob with Word MIME type
      const blob = new Blob(['\ufeff' + wordHTML], {
        type: 'application/msword;charset=utf-8'
      });

      // Browser download trigger
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast(`Word document "${filename}" downloaded successfully!`, 'success');

    } catch (err) {
      console.error('Word export error:', err);
      showToast(`Could not generate Word file: ${err.message}`, 'error');
    }
  }

  /**
   * Builds the complete Word document structure with embedded styles and Office metadata
   */
  function buildWordHTMLDocument(data = QuotationData) {
    const pkg = data.package || {};
    const footer = data.footerSettings || {};
    const bodyContent = Preview.buildQuotationHTML(data, true);

    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${escapeHTML(pkg.title || 'Let\'s Explore DMC')} — ${escapeHTML(pkg.destinations || '')}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 portrait;
            margin: 1.5cm 1.5cm 1.5cm 1.5cm;
            mso-page-orientation: portrait;
          }
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 10.5pt;
            color: #1E293B;
            line-height: 1.35;
            margin: 0;
            padding: 0;
          }
          h1, h2, h3, h4, h5 {
            color: #0F2C59;
            font-family: 'Calibri', 'Arial', sans-serif;
            margin-top: 8px;
            margin-bottom: 4px;
          }
          .dmc-header {
            border-bottom: 2px solid #0F2C59;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .dmc-brand-name {
            font-size: 16pt;
            font-weight: bold;
            color: #0F2C59;
          }
          .dmc-brand-tagline {
            font-size: 9pt;
            color: #64748B;
          }
          .dmc-main-title {
            font-size: 18pt;
            font-weight: bold;
            color: #0F2C59;
            margin: 6px 0 2px 0;
          }
          .dmc-duration-tag {
            font-size: 11pt;
            font-weight: bold;
            color: #1E3A8A;
          }
          .dmc-destinations {
            font-size: 13pt;
            font-weight: bold;
            color: #0F2C59;
            margin: 4px 0;
          }
          .dmc-section-header {
            background: #0F2C59;
            color: #FFFFFF;
            font-size: 11pt;
            font-weight: bold;
            padding: 5px 10px;
            margin-top: 14px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10pt;
          }
          th {
            background: #F1F5F9;
            color: #0F2C59;
            font-weight: bold;
            border: 1px solid #CBD5E1;
            padding: 5px 8px;
            text-align: left;
          }
          td {
            border: 1px solid #CBD5E1;
            padding: 5px 8px;
            vertical-align: top;
          }
          .dmc-total-row, .grand-total-row {
            background: #E2E8F0;
            font-weight: bold;
            color: #0F2C59;
          }
          .dmc-day-card {
            border: 1px solid #CBD5E1;
            padding: 8px;
            margin-bottom: 10px;
            background: #FFFFFF;
          }
          .dmc-day-title-row {
            font-weight: bold;
            color: #0F2C59;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .dmc-footer {
            border-top: 1.5px solid #0F2C59;
            padding-top: 8px;
            margin-top: 20px;
            font-size: 8.5pt;
            color: #64748B;
            text-align: center;
          }
          ul { margin-top: 4px; margin-bottom: 8px; padding-left: 20px; }
          li { margin-bottom: 3px; }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
      </html>
    `;
  }

  function escapeHTML(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    generate,
    buildWordHTMLDocument
  };

})();
