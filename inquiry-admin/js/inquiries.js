/**
 * Let's Explore DMC — Inquiries Management Controller
 */

let allInquiries = [];

document.addEventListener('DOMContentLoaded', async () => {
    await fetchInquiries();
    initInquiriesEvents();
});

function initInquiriesEvents() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Filters & Search
    let searchTimer;
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(fetchInquiries, 300);
    });

    document.getElementById('statusFilter').addEventListener('change', fetchInquiries);
    document.getElementById('sourceFilter').addEventListener('change', fetchInquiries);

    // Add Lead Modal
    const modal = document.getElementById('addLeadModal');
    document.getElementById('openAddLeadBtn').addEventListener('click', () => {
        document.getElementById('addLeadForm').reset();
        modal.classList.add('active');
    });

    document.getElementById('closeAddLeadBtn').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    document.getElementById('addLeadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('leadName').value.trim(),
            phone: document.getElementById('leadPhone').value.trim(),
            email: document.getElementById('leadEmail').value.trim(),
            source: document.getElementById('leadSource').value,
            destination: document.getElementById('leadDestination').value.trim(),
            message: document.getElementById('leadMessage').value.trim(),
            status: 'New'
        };

        try {
            const res = await fetch('api/add_inquiry.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast('Inquiry recorded!', 'success');
                modal.classList.remove('active');
                await fetchInquiries();
            } else {
                showToast(data.error || 'Failed', 'error');
            }
        } catch (err) {
            showToast('Network error', 'error');
        }
    });

    // Notes Modal
    const notesModal = document.getElementById('notesModal');
    document.getElementById('closeNotesModalBtn').addEventListener('click', () => {
        notesModal.classList.remove('active');
    });

    document.getElementById('notesForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('notesLeadId').value;
        const notes = document.getElementById('notesContent').value.trim();

        try {
            const res = await fetch('api/update_inquiry.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, notes })
            });
            const d = await res.json();
            if (d.success) {
                showToast('Notes saved successfully', 'success');
                notesModal.classList.remove('active');
                await fetchInquiries();
            } else {
                showToast(d.error || 'Failed', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        }
    });
}

async function fetchInquiries() {
    const search = document.getElementById('searchInput').value.trim();
    const status = document.getElementById('statusFilter').value;
    const source = document.getElementById('sourceFilter').value;

    let url = 'api/get_inquiries.php?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (status && status !== 'all') url += `status=${encodeURIComponent(status)}&`;
    if (source && source !== 'all') url += `source=${encodeURIComponent(source)}&`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
            allInquiries = data.inquiries || [];
            renderInquiriesTable(allInquiries);
        }
    } catch (e) {
        console.error('Fetch inquiries error:', e);
    }
}

function renderInquiriesTable(inquiries) {
    const tbody = document.getElementById('inquiriesTableBody');
    tbody.innerHTML = '';

    if (inquiries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted);">No inquiries found matching the filters.</td></tr>';
        return;
    }

    inquiries.forEach(inq => {
        const tr = document.createElement('tr');
        const sourceIcon = getSourceIcon(inq.source);
        const dateStr = new Date(inq.created_at).toLocaleDateString() + ' ' + new Date(inq.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        tr.innerHTML = `
            <td style="color:var(--text-muted); font-size:12px;">#${inq.id}</td>
            <td>
                <strong>${escapeHtml(inq.name)}</strong>
                ${inq.message ? `<br><small style="color:var(--text-sub); display:inline-block; max-width:220px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">"${escapeHtml(inq.message)}"</small>` : ''}
            </td>
            <td>
                <a href="tel:${escapeHtml(inq.phone)}" style="color:#38bdf8; text-decoration:none; font-weight:600;">
                    <i class="fa-solid fa-phone" style="font-size:11px;"></i> ${escapeHtml(inq.phone)}
                </a>
                ${inq.email ? `<br><small style="color:var(--text-muted);">${escapeHtml(inq.email)}</small>` : ''}
            </td>
            <td>
                <span class="source-badge ${escapeHtml(inq.source)}">
                    ${sourceIcon} ${escapeHtml(inq.source)}
                </span>
            </td>
            <td>
                <strong style="color:#ffffff;">${escapeHtml(inq.destination || 'Custom Tour')}</strong>
            </td>
            <td>
                <select class="filter-select inline-status-select" data-id="${inq.id}" style="height:32px; font-size:12px; padding:0 10px;">
                    <option value="New" ${inq.status === 'New' ? 'selected' : ''}>New</option>
                    <option value="Contacted" ${inq.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="Follow-up" ${inq.status === 'Follow-up' ? 'selected' : ''}>Follow-up</option>
                    <option value="Converted" ${inq.status === 'Converted' ? 'selected' : ''}>Converted</option>
                    <option value="Lost" ${inq.status === 'Lost' ? 'selected' : ''}>Lost</option>
                </select>
            </td>
            <td>
                <button class="btn-tbl edit-notes-btn" style="width:auto; padding:0 8px; gap:4px; font-size:11.5px;" data-id="${inq.id}" data-name="${escapeHtml(inq.name)}" data-notes="${escapeHtml(inq.notes || '')}">
                    <i class="fa-solid fa-pen-to-square"></i> ${inq.notes ? 'View/Edit' : 'Add Note'}
                </button>
            </td>
            <td style="font-size:12px; color:var(--text-muted); white-space:nowrap;">${dateStr}</td>
            <td>
                <div class="table-btn-group">
                    <a href="../index.html?client=${encodeURIComponent(inq.name)}&dest=${encodeURIComponent(inq.destination || '')}" class="btn-tbl quote" title="Generate Quotation / Invoice for this Client">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </a>
                    <button class="btn-tbl delete delete-inquiry-btn" data-id="${inq.id}" title="Delete Inquiry">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        // Inline Status Change
        tr.querySelector('.inline-status-select').addEventListener('change', async (e) => {
            const newStatus = e.target.value;
            try {
                const res = await fetch('api/update_inquiry.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: inq.id, status: newStatus })
                });
                const d = await res.json();
                if (d.success) {
                    showToast(`Status updated to "${newStatus}"`, 'success');
                } else {
                    showToast(d.error || 'Failed', 'error');
                }
            } catch (err) {
                showToast('Network error', 'error');
            }
        });

        // Notes click
        tr.querySelector('.edit-notes-btn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            document.getElementById('notesLeadId').value = btn.dataset.id;
            document.getElementById('notesCustomerName').textContent = `Internal Remarks for ${btn.dataset.name}`;
            document.getElementById('notesContent').value = btn.dataset.notes || '';
            document.getElementById('notesModal').classList.add('active');
        });

        // Delete click
        tr.querySelector('.delete-inquiry-btn').addEventListener('click', async (e) => {
            if (!confirm(`Permanently delete inquiry #${inq.id} (${inq.name})?`)) return;
            try {
                const res = await fetch('api/delete_inquiry.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: inq.id })
                });
                const d = await res.json();
                if (d.success) {
                    showToast('Inquiry deleted.', 'success');
                    fetchInquiries();
                } else {
                    showToast(d.error || 'Failed', 'error');
                }
            } catch (err) {
                showToast('Network error', 'error');
            }
        });

        tbody.appendChild(tr);
    });
}

function getSourceIcon(source) {
    switch (source) {
        case 'Instagram': return '<i class="fa-brands fa-instagram" style="color:#e1306c;"></i>';
        case 'WhatsApp': return '<i class="fa-brands fa-whatsapp" style="color:#25d366;"></i>';
        case 'Facebook': return '<i class="fa-brands fa-facebook" style="color:#1877f2;"></i>';
        default: return '<i class="fa-solid fa-globe" style="color:var(--gold);"></i>';
    }
}

function showToast(message, type = 'info') {
    const wrap = document.getElementById('toastWrap');
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}
