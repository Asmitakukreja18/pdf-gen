/**
 * docx-generator.js — Editable Microsoft Word Document (.docx) Generator
 * Generates a fully formatted, editable Microsoft Word document matching
 * the exact 12-section Let's Explore DMC quotation structure.
 */

const DOCXGenerator = (() => {

  /**
   * Main entry point to generate and download DOCX
   */
  function generate() {
    showToast('Preparing your editable DOCX quotation...', 'info');

    // Recalculate totals first
    recalculateQuotationPricing();

    if (typeof docx !== 'undefined') {
      try {
        generateWithDocxLibrary();
        return;
      } catch (err) {
        console.warn('docx.js generation error, falling back to Word XML/HTML document:', err);
      }
    }

    // High-fidelity Word HTML document format (.doc opens natively in MS Word as fully editable)
    generateWordDocumentBlob();
  }

  /**
   * High-fidelity Word Document Generation (Compatible with all versions of Microsoft Word)
   */
  function generateWordDocumentBlob() {
    const d = QuotationData;
    const dest = (d.trip.destination || 'Holiday').toUpperCase();
    const destCountry = d.trip.country ? `${d.trip.destination}, ${d.trip.country}` : (d.trip.destination || '—');
    const monthYear = (d.trip.travelDate || 'Upcoming').toUpperCase();
    const prepDate = d.meta?.preparedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const paxSummary = d.trip.travellers || '2 Adults';
    const sharingType = d.landArrangement.sharing || 'Twin Share';
    const hotelName = d.landArrangement.hotel || 'Leading Category Hotel';
    const nightsCount = d.landArrangement.nights || '4';
    const landDates = d.landArrangement.dates || d.trip.travelDate || '—';

    const origin = d.flights.origin || 'DEL';
    const destCode = d.flights.destination || 'DPS';
    const cabin = d.flights.cabinClass || 'Economy';
    const routeSummary = d.flights.routeSummary || `${d.client.pickupFrom || 'Delhi'} – ${d.trip.destination || 'Bali'} – ${d.client.pickupFrom || 'Delhi'}`;

    const onward = d.flights.onward || {};
    const ret = d.flights.return || {};

    const fPrice = formatCurrencyINR(d.pricing.flights);
    const lPrice = formatCurrencyINR(d.pricing.landPackage);
    const tPrice = formatCurrencyINR(d.pricing.total);

    const inclusionsText = d.landArrangement.inclusions && d.landArrangement.inclusions.length > 0
      ? d.landArrangement.inclusions.join(' • ')
      : `${nightsCount} nights accommodation on ${sharingType.toLowerCase()} • Private car • English-speaking driver • Parking • Entrance fees • Sightseeing as per programme above`;

    const noteText = d.landArrangement.note || CONFIG.DEFAULT_ACCOMMODATION_NOTE;

    const wordHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${dest} Holiday Quotation — ${d.client.name}</title>
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
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1E293B; line-height: 1.35; margin: 20px; }
          h1 { color: #0F2C59; font-size: 18pt; margin: 0 0 4px 0; font-weight: bold; }
          h2 { color: #1E3A8A; font-size: 13pt; margin: 0 0 4px 0; }
          .section-title { background: #0F2C59; color: #FFFFFF; font-size: 10pt; font-weight: bold; padding: 4px 8px; margin-top: 14px; margin-bottom: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10pt; }
          th { background: #F1F5F9; color: #0F2C59; font-weight: bold; border: 1px solid #CBD5E1; padding: 5px 8px; text-align: left; }
          td { border: 1px solid #CBD5E1; padding: 5px 8px; vertical-align: top; }
          .label { font-weight: bold; color: #475569; width: 140px; background: #F8FAFC; }
          .total-row { background: #E2E8F0; font-weight: bold; color: #0F2C59; font-size: 11pt; }
          .note-box { font-size: 9pt; color: #64748B; font-style: italic; margin-top: 4px; }
          .inclusions-box { font-size: 9.5pt; color: #334155; padding: 6px; background: #F8FAFC; border: 1px solid #CBD5E1; margin-top: 6px; }
          .contact-box { background: #F8FAFC; border: 1px solid #CBD5E1; padding: 8px; text-align: center; margin-top: 12px; }
          .footer-box { border-top: 1.5px solid #0F2C59; padding-top: 6px; font-size: 8.5pt; color: #64748B; text-align: center; margin-top: 12px; }
        </style>
      </head>
      <body>

        <!-- 1. HEADER -->
        <table style="border:none; margin-bottom:12px;">
          <tr style="border:none;">
            <td style="border:none; width:50%;">
              <h1>LET'S EXPLORE DMC</h1>
              <div style="font-size:9pt; color:#64748B;">${CONFIG.COMPANY.tagline}</div>
            </td>
            <td style="border:none; width:50%; text-align:right;">
              <h1>${dest} HOLIDAY QUOTATION</h1>
              <div style="font-size:10pt; font-weight:bold; color:#1E3A8A;">Flights + Land Package | ${monthYear}</div>
              <div style="font-size:9pt; color:#64748B;">Prepared by Let's Explore DMC · ${prepDate}</div>
            </td>
          </tr>
        </table>

        <!-- 2. CLIENT DETAILS -->
        <div class="section-title">CLIENT DETAILS</div>
        <table>
          <tr>
            <td class="label">Client Name</td>
            <td><strong>${d.client.name || 'Not provided'}</strong></td>
            <td class="label">Contact Number</td>
            <td>${d.client.contact || 'Not provided'}</td>
          </tr>
          <tr>
            <td class="label">Destination</td>
            <td>${destCountry}</td>
            <td class="label">Travel Date</td>
            <td>${d.trip.travelDate || 'Not provided'}</td>
          </tr>
          <tr>
            <td class="label">Duration</td>
            <td>${d.trip.duration || 'Not provided'}</td>
            <td class="label">Travellers</td>
            <td>${d.trip.travellers || 'Not provided'}</td>
          </tr>
          <tr>
            <td class="label">Pickup From</td>
            <td>${d.client.pickupFrom || 'Not provided'}</td>
            <td class="label">Client Details</td>
            <td>${d.client.details || d.client.contact || 'Not provided'}</td>
          </tr>
        </table>

        <!-- 3. FLIGHT DETAILS -->
        <div class="section-title">FLIGHT DETAILS · ${origin} ⇄ ${destCode} · ${cabin}</div>
        <table>
          <tr>
            <th style="width:20%;">FLIGHT</th>
            <th style="width:35%;">ROUTE</th>
            <th style="width:30%;">TIMINGS (LOCAL)</th>
            <th style="width:15%;">DURATION</th>
          </tr>
          <!-- ONWARD -->
          <tr>
            <td>
              <div style="font-size:8pt; font-weight:bold; color:#1E40AF;">ONWARD</div>
              <strong>${onward.airline || 'IndiGo'}</strong><br>
              <span style="color:#64748B;">${onward.flightNumber || 'Not provided'}</span>
            </td>
            <td>
              <strong>${onward.route || `${origin} → ${destCode}`}</strong><br>
              <span style="font-size:8.5pt; color:#64748B;">Baggage: ${onward.baggage || '7 kg cabin + 20 kg check-in'}</span>
            </td>
            <td>
              <strong>Dep:</strong> ${onward.departure || '—'}<br>
              <strong>Arr:</strong> ${onward.arrival || '—'}
            </td>
            <td>
              <strong>${onward.duration || '—'}</strong>
            </td>
          </tr>
          <!-- RETURN -->
          <tr>
            <td>
              <div style="font-size:8pt; font-weight:bold; color:#166534;">RETURN</div>
              <strong>${ret.airline || onward.airline || 'IndiGo'}</strong><br>
              <span style="color:#64748B;">${ret.flightNumber || 'Not provided'}</span>
            </td>
            <td>
              <strong>${ret.route || `${destCode} → ${origin}`}</strong><br>
              <span style="font-size:8.5pt; color:#64748B;">Baggage: ${ret.baggage || onward.baggage || '7 kg cabin + 20 kg check-in'}</span>
            </td>
            <td>
              <strong>Dep:</strong> ${ret.departure || '—'}<br>
              <strong>Arr:</strong> ${ret.arrival || '—'}
            </td>
            <td>
              <strong>${ret.duration || '—'}</strong>
            </td>
          </tr>
        </table>

        <!-- 4. LAND ARRANGEMENT -->
        <div class="section-title">LAND ARRANGEMENT · ${nightsCount} Nights at ${hotelName} (${sharingType}) · ${landDates}</div>
        <table>
          ${(d.landArrangement.itinerary || []).map(item => `
            <tr>
              <td style="width:90px; font-weight:bold; color:#0F2C59; background:#F8FAFC;">${item.day}</td>
              <td>${item.activity}</td>
            </tr>
          `).join('')}
        </table>

        <!-- 5. INCLUSIONS & 6. NOTE -->
        <div class="inclusions-box">
          <strong>Inclusions:</strong> ${inclusionsText}
        </div>
        <div class="note-box">
          <strong>Note:</strong> ${noteText}
        </div>

        <!-- 7. PRICE SUMMARY -->
        <div class="section-title" style="margin-top:14px;">PRICE SUMMARY · ${paxSummary}</div>
        <table>
          <tr>
            <td>Flights (${routeSummary}, ${cabin}, taxes incl.)</td>
            <td style="text-align:right; font-weight:bold; width:150px;">${fPrice}</td>
          </tr>
          <tr>
            <td>Land package + accommodation (${nightsCount}N, ${sharingType.toLowerCase()})</td>
            <td style="text-align:right; font-weight:bold; width:150px;">${lPrice}</td>
          </tr>
          <tr class="total-row">
            <td><strong>TOTAL PACKAGE COST (${paxSummary})</strong></td>
            <td style="text-align:right; font-weight:bold; width:150px; font-size:12pt; color:#0F2C59;">${tPrice}</td>
          </tr>
        </table>

        <!-- 8. DYNAMIC FARE NOTE -->
        <div class="note-box" style="margin-bottom:12px;">
          ${CONFIG.DYNAMIC_FARE_NOTE}
        </div>

        <!-- 9. THANK YOU / CONTACT -->
        <div class="contact-box">
          <div style="font-weight:bold; color:#0F2C59; font-size:11pt; margin-bottom:4px;">${CONFIG.THANK_YOU_TITLE}</div>
          <div style="font-size:9.5pt;">
            ${CONFIG.SUPPORT_LABEL} <strong>${d.contact.person || CONFIG.COMPANY.defaultContactPerson}</strong> |
            ☎ ${d.contact.phone || CONFIG.COMPANY.phone1} |
            ✉ ${d.contact.email || CONFIG.COMPANY.email} |
            🌐 ${d.contact.website || CONFIG.COMPANY.website}
          </div>
        </div>

        <!-- 10. GLOBAL DESKS -->
        <div class="section-title" style="margin-top:14px;">OUR GLOBAL DESKS</div>
        <table>
          <tr>
            <th style="width:33%;">${CONFIG.GLOBAL_DESKS[0].title}</th>
            <th style="width:33%;">${CONFIG.GLOBAL_DESKS[1].title}</th>
            <th style="width:34%;">${CONFIG.GLOBAL_DESKS[2].title}</th>
          </tr>
          <tr>
            <td style="font-size:8.5pt;">
              <strong>${CONFIG.GLOBAL_DESKS[0].company}</strong><br>
              ${CONFIG.GLOBAL_DESKS[0].address}<br>
              ✉ ${CONFIG.GLOBAL_DESKS[0].email}
            </td>
            <td style="font-size:8.5pt;">
              <strong>${CONFIG.GLOBAL_DESKS[1].contact}</strong><br>
              ${CONFIG.GLOBAL_DESKS[1].company}<br>
              ${CONFIG.GLOBAL_DESKS[1].address}<br>
              ☎ ${CONFIG.GLOBAL_DESKS[1].phone}<br>
              ✉ ${CONFIG.GLOBAL_DESKS[1].email}
            </td>
            <td style="font-size:8.5pt;">
              <strong>${CONFIG.GLOBAL_DESKS[2].contact}</strong><br>
              ☎ ${CONFIG.GLOBAL_DESKS[2].phones[0]}<br>
              ☎ ${CONFIG.GLOBAL_DESKS[2].phones[1]}<br>
              🌐 ${CONFIG.GLOBAL_DESKS[2].website}<br>
              Instagram: ${CONFIG.GLOBAL_DESKS[2].instagram}
            </td>
          </tr>
        </table>

        <!-- 11. OTHER OFFICES -->
        <div class="section-title" style="background:#1E3A8A;">OUR OTHER OFFICES</div>
        <div style="padding:6px; font-size:8.5pt; color:#475569; border:1px solid #CBD5E1; background:#F8FAFC; line-height:1.45;">
          ${CONFIG.OTHER_OFFICES.join(' · ')}
        </div>

        <!-- 12. FINAL FOOTER -->
        <div class="footer-box">
          <strong>${CONFIG.COMPANY.brandTitle}</strong> ·
          ☎ ${CONFIG.COMPANY.phone1} ·
          ☎ ${CONFIG.COMPANY.phone2} ·
          🌐 ${CONFIG.COMPANY.website} ·
          Instagram: ${CONFIG.COMPANY.instagram}
        </div>

      </body>
      </html>
    `;

    // Download as .doc (Native Word format)
    const blob = new Blob(['\ufeff', wordHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${(d.trip.destination || 'Holiday').toLowerCase()}_quotation_${(d.client.name || 'client').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.doc`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`DOCX quotation "${filename}" downloaded successfully!`, 'success');
  }

  /**
   * Native .docx generator using docx.js library when available
   */
  function generateWithDocxLibrary() {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, ShadingType, BorderStyle } = docx;
    const d = QuotationData;
    const dest = (d.trip.destination || 'Holiday').toUpperCase();
    const fPrice = formatCurrencyINR(d.pricing.flights);
    const lPrice = formatCurrencyINR(d.pricing.landPackage);
    const tPrice = formatCurrencyINR(d.pricing.total);

    const doc = new Document({
      title: `${dest} Holiday Quotation — ${d.client.name}`,
      description: `Official Quotation by Let's Explore DMC`,
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 21, color: '1E293B' }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({ text: "LET'S EXPLORE DMC", bold: true, size: 30, color: '0F2C59' }),
              new TextRun({ text: `\t${dest} HOLIDAY QUOTATION`, bold: true, size: 26, color: '0F2C59' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: CONFIG.COMPANY.tagline, size: 18, color: '64748B' }),
              new TextRun({ text: `\tFlights + Land Package | ${(d.trip.travelDate || '').toUpperCase()}`, bold: true, size: 20, color: '1E3A8A' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Prepared by Let's Explore DMC · ${d.meta?.preparedDate || ''}`, size: 16, color: '64748B' })
            ]
          }),
          new Paragraph({ text: '' }),

          // Section 2: Client Details
          createSectionHeading('CLIENT DETAILS'),
          createClientTable(docx, d),
          new Paragraph({ text: '' }),

          // Section 3: Flight Details
          createSectionHeading(`FLIGHT DETAILS · ${d.flights.origin || 'DEL'} ⇄ ${d.flights.destination || 'DPS'} · ${d.flights.cabinClass || 'Economy'}`),
          createFlightTable(docx, d),
          new Paragraph({ text: '' }),

          // Section 4: Land Arrangement
          createSectionHeading(`LAND ARRANGEMENT · ${d.landArrangement.nights} Nights at ${d.landArrangement.hotel} (${d.landArrangement.sharing}) · ${d.landArrangement.dates}`),
          ...createItineraryParagraphs(docx, d),
          new Paragraph({ text: '' }),

          // Inclusions & Notes
          new Paragraph({
            children: [
              new TextRun({ text: 'Inclusions: ', bold: true, color: '0F2C59' }),
              new TextRun({ text: (d.landArrangement.inclusions || []).join(' • ') })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Note: ', bold: true, italics: true, color: '64748B' }),
              new TextRun({ text: d.landArrangement.note || CONFIG.DEFAULT_ACCOMMODATION_NOTE, italics: true, color: '64748B' })
            ]
          }),
          new Paragraph({ text: '' }),

          // Section 7: Price Summary
          createSectionHeading(`PRICE SUMMARY · ${d.trip.travellers || '2 Adults'}`),
          createPriceTable(docx, d, fPrice, lPrice, tPrice),
          new Paragraph({
            children: [new TextRun({ text: CONFIG.DYNAMIC_FARE_NOTE, size: 16, italics: true, color: '64748B' })]
          }),
          new Paragraph({ text: '' }),

          // Section 9: Thank You / Contact
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: CONFIG.THANK_YOU_TITLE, bold: true, size: 22, color: '0F2C59' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${CONFIG.SUPPORT_LABEL} ${d.contact.person} | ☎ ${d.contact.phone} | ✉ ${d.contact.email} | 🌐 ${d.contact.website}`, size: 18 })
            ]
          }),
          new Paragraph({ text: '' }),

          // Section 10: Global Desks
          createSectionHeading('OUR GLOBAL DESKS'),
          createGlobalDesksTable(docx),
          new Paragraph({ text: '' }),

          // Section 11: Other Offices
          createSectionHeading('OUR OTHER OFFICES'),
          new Paragraph({
            children: [new TextRun({ text: CONFIG.OTHER_OFFICES.join(' · '), size: 16, color: '475569' })]
          }),
          new Paragraph({ text: '' }),

          // Section 12: Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${CONFIG.COMPANY.brandTitle} · ☎ ${CONFIG.COMPANY.phone1} · ☎ ${CONFIG.COMPANY.phone2} · 🌐 ${CONFIG.COMPANY.website} · Instagram: ${CONFIG.COMPANY.instagram}`, size: 16, color: '64748B' })
            ]
          })
        ]
      }]
    });

    Packer.toBlob(doc).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `${(d.trip.destination || 'holiday').toLowerCase()}_quotation_${(d.client.name || 'client').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.docx`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Editable DOCX "${filename}" generated!`, 'success');
    }).catch(err => {
      console.warn('Native DOCX error, falling back to Word blob:', err);
      generateWordDocumentBlob();
    });
  }

  // Helpers for docx.js native structures
  function createSectionHeading(text) {
    const { Paragraph, TextRun, ShadingType } = docx;
    return new Paragraph({
      shading: { fill: '0F2C59', type: ShadingType.CLEAR },
      children: [
        new TextRun({ text: ` ${text.toUpperCase()} `, bold: true, color: 'FFFFFF', size: 19 })
      ]
    });
  }

  function createClientTable(docx, d) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType } = docx;
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell('Client Name', true, 20), cell(d.client.name || '—', false, 30),
            cell('Contact Number', true, 20), cell(d.client.contact || '—', false, 30)
          ]
        }),
        new TableRow({
          children: [
            cell('Destination', true, 20), cell(`${d.trip.destination || ''}, ${d.trip.country || ''}`, false, 30),
            cell('Travel Date', true, 20), cell(d.trip.travelDate || '—', false, 30)
          ]
        }),
        new TableRow({
          children: [
            cell('Duration', true, 20), cell(d.trip.duration || '—', false, 30),
            cell('Travellers', true, 20), cell(d.trip.travellers || '—', false, 30)
          ]
        }),
        new TableRow({
          children: [
            cell('Pickup From', true, 20), cell(d.client.pickupFrom || '—', false, 30),
            cell('Client Details', true, 20), cell(d.client.details || d.client.contact || '—', false, 30)
          ]
        })
      ]
    });
  }

  function createFlightTable(docx, d) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType } = docx;
    const o = d.flights.onward || {};
    const r = d.flights.return || {};

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell('FLIGHT', true, 20, 'F1F5F9'),
            cell('ROUTE', true, 35, 'F1F5F9'),
            cell('TIMINGS (LOCAL)', true, 30, 'F1F5F9'),
            cell('DURATION', true, 15, 'F1F5F9')
          ]
        }),
        new TableRow({
          children: [
            cell(`[ONWARD]\n${o.airline || 'IndiGo'}\n${o.flightNumber || ''}`, false, 20),
            cell(`${o.route || ''}\nBaggage: ${o.baggage || ''}`, false, 35),
            cell(`Dep: ${o.departure || '—'}\nArr: ${o.arrival || '—'}`, false, 30),
            cell(o.duration || '—', false, 15)
          ]
        }),
        new TableRow({
          children: [
            cell(`[RETURN]\n${r.airline || o.airline || 'IndiGo'}\n${r.flightNumber || ''}`, false, 20),
            cell(`${r.route || ''}\nBaggage: ${r.baggage || o.baggage || ''}`, false, 35),
            cell(`Dep: ${r.departure || '—'}\nArr: ${r.arrival || '—'}`, false, 30),
            cell(r.duration || '—', false, 15)
          ]
        })
      ]
    });
  }

  function createItineraryParagraphs(docx, d) {
    const { Paragraph, TextRun } = docx;
    return (d.landArrangement.itinerary || []).map(item => new Paragraph({
      children: [
        new TextRun({ text: `${item.day}: `, bold: true, color: '0F2C59' }),
        new TextRun({ text: item.activity })
      ]
    }));
  }

  function createPriceTable(docx, d, fPrice, lPrice, tPrice) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType } = docx;
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell(`Flights (${d.flights.routeSummary || ''}, ${d.flights.cabinClass || 'Economy'}, taxes incl.)`, false, 75),
            cell(fPrice, true, 25)
          ]
        }),
        new TableRow({
          children: [
            cell(`Land package + accommodation (${d.landArrangement.nights}N, ${(d.landArrangement.sharing || '').toLowerCase()})`, false, 75),
            cell(lPrice, true, 25)
          ]
        }),
        new TableRow({
          children: [
            cell(`TOTAL PACKAGE COST (${d.trip.travellers || '2 Adults'})`, true, 75, 'E2E8F0'),
            cell(tPrice, true, 25, 'E2E8F0')
          ]
        })
      ]
    });
  }

  function createGlobalDesksTable(docx) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType } = docx;
    const g = CONFIG.GLOBAL_DESKS;
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell(g[0].title, true, 33, 'F1F5F9'),
            cell(g[1].title, true, 33, 'F1F5F9'),
            cell(g[2].title, true, 34, 'F1F5F9')
          ]
        }),
        new TableRow({
          children: [
            cell(`${g[0].company}\n${g[0].address}\n${g[0].email}`, false, 33),
            cell(`${g[1].contact}\n${g[1].company}\n${g[1].address}\n☎ ${g[1].phone}\n✉ ${g[1].email}`, false, 33),
            cell(`${g[2].contact}\n☎ ${g[2].phones[0]}\n☎ ${g[2].phones[1]}\n${g[2].website}\nInstagram: ${g[2].instagram}`, false, 34)
          ]
        })
      ]
    });
  }

  function cell(text, isBold = false, widthPercent = 25, bgHex = null) {
    const { TableCell, Paragraph, TextRun, WidthType, ShadingType } = docx;
    const lines = text.split('\n');
    const paras = lines.map(l => new Paragraph({
      children: [new TextRun({ text: l, bold: isBold })]
    }));

    const cellOptions = {
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      children: paras
    };
    if (bgHex) {
      cellOptions.shading = { fill: bgHex, type: ShadingType.CLEAR };
    }
    return new TableCell(cellOptions);
  }

  return {
    generate
  };

})();
