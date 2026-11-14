import os, re

def clean_file(path, replacements):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    orig = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned {path}")
    else:
        print(f"No changes made to {path}")

# 1. inquiry-admin/documents.html
clean_file('inquiry-admin/documents.html', [
    (
        """                allDocs = [
                    { id: 1, doc_no: 'LEDMC-DOC-001', title: 'Thailand Luxury Beach Holiday (LEDMC-2025-001)', doc_type: 'quotation', customer_name: 'Priya Sharma', destination: 'Thailand', file_path: '../images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf', file_size: '245 KB', created_at: '2025-04-15 11:30:00', status: 'Approved' },
                    { id: 2, doc_no: 'LEDMC-DOC-002', title: 'Dubai Atlantis & Desert Safari (LEDMC-2025-002)', doc_type: 'itinerary', customer_name: 'Rohan Mehta', destination: 'Dubai', file_path: '../images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf', file_size: '320 KB', created_at: '2025-04-12 16:45:00', status: 'Approved' },
                    { id: 3, doc_no: 'LEDMC-DOC-003', title: 'GST Tax Invoice (LEDMC-2025-003)', doc_type: 'invoice', customer_name: 'Akash Dewani', destination: 'Dubai Luxury 6D', file_path: '../images/pdf/akash Dewani.pdf', file_size: '180 KB', created_at: '2025-04-10 14:15:00', status: 'Approved' }
                ];""",
        """                allDocs = [];"""
    ),
    (
        "const phone = prompt('Enter customer WhatsApp phone number:', '919820011223');",
        "const phone = prompt('Enter customer WhatsApp phone number:');"
    )
])

# 2. inquiry-admin/members.html
clean_file('inquiry-admin/members.html', [
    (
        '<div style="font-size:12px; color:#475569; margin:2px 0;">Generated luxury Thailand Quotation for Dipesh Batra (LEDMC-2026-042)</div>',
        '<div style="font-size:12px; color:#475569; margin:2px 0;">Staff workstation initialized and ready for new inquiries</div>'
    ),
    (
        '<div style="font-size:12px; color:#475569; margin:2px 0;">Sent proposal link via WhatsApp to Akash Dewani</div>',
        '<div style="font-size:12px; color:#475569; margin:2px 0;">Logged in and monitored session active</div>'
    )
])

# 3. admin/admin.js
clean_file('admin/admin.js', [
    (
        """        this.recentQuotes = [
            {
                id: 'LEDMC-2025-001',
                customer: 'Priya Sharma',
                destination: 'Thailand',
                duration: '12 Days / 11 Nights',
                pax: '2 Adults',
                date: '15 Apr 2025',
                status: 'Approved',
                file_path: '../images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf',
                file_size: '245 KB'
            },
            {
                id: 'LEDMC-2025-002',
                customer: 'Rohan Mehta',
                destination: 'Dubai & Abu Dhabi',
                duration: '6 Days / 5 Nights',
                pax: '4 Adults',
                date: '12 Apr 2025',
                status: 'Approved',
                file_path: '../images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf',
                file_size: '320 KB'
            }
        ];""",
        """        this.recentQuotes = [];"""
    ),
    (
        "file_path: '../images/pdf/akash Dewani.pdf',",
        "file_path: '',"
    )
])

# 4. studio.html
clean_file('studio.html', [
    (
        "Invoice (Akash Dewani)",
        "GST Tax Invoice"
    ),
    (
        'placeholder="akash dewani"',
        'placeholder="Customer / Company Name"'
    )
])

# 5. js/data.js
clean_file('js/data.js', [
    ("toCustomerName: 'akash dewani',", "toCustomerName: 'Valued Client',"),
    ("guestName: 'akash dewani',", "guestName: 'Valued Guest',")
])

# 6. js/chatbot.js
clean_file('js/chatbot.js', [
    ("inv.toCustomerName || pkg.clientName || 'Akash Dewani'", "inv.toCustomerName || pkg.clientName || 'Valued Client'")
])

# 7. js/preview.js
clean_file('js/preview.js', [
    ("inv.toCustomerName || pkg.clientName || 'akash dewani'", "inv.toCustomerName || pkg.clientName || 'Valued Client'")
])

# 8. js/ai-parser.js
clean_file('js/ai-parser.js', [
    ('"toCustomerName": "akash dewani",', '"toCustomerName": "Valued Client",'),
    ('"guestName": "akash dewani",', '"guestName": "Valued Guest",'),
    ("akash dewani", "tax invoice")
])

# 9. Placeholders across inquiry-admin/
clean_file('inquiry-admin/invoices.html', [
    ('placeholder="e.g. Akash Dewani (Dewani Travels)"', 'placeholder="Customer / Agency Name"')
])

clean_file('inquiry-admin/customers.html', [
    ('placeholder="e.g. Akash Dewani"', 'placeholder="Customer Full Name"'),
    ('placeholder="e.g. Dewani Travels"', 'placeholder="Company / Agency Name"'),
    ('placeholder="e.g. 9820011223"', 'placeholder="Contact Phone Number"')
])

clean_file('inquiry-admin/suppliers.html', [
    ('placeholder="e.g. Desert Gate Tourism LLC"', 'placeholder="Supplier / Partner Company Name"')
])

clean_file('inquiry-admin/trips.html', [
    ('placeholder="e.g. 2 Adults, 1 Child &bull; Dewani Travels B2B"', 'placeholder="e.g. 2 Adults, 1 Child &bull; Agency Name"')
])

clean_file('website/index.html', [
    ('placeholder="e.g. Akash Dewani"', 'placeholder="Your Full Name"')
])
