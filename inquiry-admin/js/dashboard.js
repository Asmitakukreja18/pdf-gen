/**
 * Let's Explore DMC — Inquiry Admin Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
    initDashboardEvents();
});

function initDashboardEvents() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Add Lead Modal
    const modal = document.getElementById('addLeadModal');
    const openBtn = document.getElementById('openAddLeadBtn');
    const closeBtn = document.getElementById('closeAddLeadBtn');

    openBtn.addEventListener('click', () => {
        document.getElementById('addLeadForm').reset();
        modal.classList.add('active');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Save Lead Form Submit
    document.getElementById('addLeadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveLeadBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

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
                showToast('Inquiry recorded successfully!', 'success');
                modal.classList.remove('active');
                await loadDashboardData();
            } else {
                showToast(data.error || 'Failed to record inquiry.', 'error');
            }
        } catch (err) {
            showToast('Network error saving inquiry', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Inquiry to Database';
        }
    });
}

async function loadDashboardData() {
    try {
        const res = await fetch('api/get_inquiries.php?limit=8');
        const data = await res.json();

        if (data.success) {
            // Update Stats
            const stats = data.stats || {};
            document.getElementById('statTotal').textContent = stats.total || 0;
            document.getElementById('statNew').textContent = stats.new || 0;
            document.getElementById('statFollowup').textContent = stats.followup || 0;
            document.getElementById('statConverted').textContent = stats.converted || 0;

            // Update Source Chips
            const chipsRow = document.getElementById('sourceChipsRow');
            chipsRow.innerHTML = '';
            (data.sources || []).forEach(s => {
                const chip = document.createElement('span');
                chip.style.cssText = 'padding:6px 14px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:99px; font-size:12.5px;';
                chip.innerHTML = `<i class="fa-solid fa-circle" style="font-size:7px; color:var(--gold); margin-right:6px;"></i> ${s.source}: <strong style="color:#ffffff;">${s.count}</strong>`;
                chipsRow.appendChild(chip);
            });

            // Render Recent Inquiries Table
            renderRecentTable(data.inquiries || []);
        }
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

function renderRecentTable(inquiries) {
    const tbody = document.getElementById('recentInquiriesTableBody');
    tbody.innerHTML = '';

    if (inquiries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No inquiries logged yet. Click "Add New Inquiry" to create one.</td></tr>';
        return;
    }

    inquiries.forEach(inq => {
        const tr = document.createElement('tr');
        const timeAgo = formatTimeAgo(inq.created_at);
        const sourceIcon = getSourceIcon(inq.source);

        tr.innerHTML = `
            <td>
                <strong>${escapeHtml(inq.name)}</strong>
                ${inq.email ? `<br><small style="color:var(--text-muted);">${escapeHtml(inq.email)}</small>` : ''}
            </td>
            <td>
                <a href="tel:${escapeHtml(inq.phone)}" style="color:#38bdf8; text-decoration:none;">
                    <i class="fa-solid fa-phone" style="font-size:11px;"></i> ${escapeHtml(inq.phone)}
                </a>
            </td>
            <td>
                <span class="source-badge ${escapeHtml(inq.source)}">
                    ${sourceIcon} ${escapeHtml(inq.source)}
                </span>
            </td>
            <td>
                <strong style="color:#ffffff;">${escapeHtml(inq.destination || 'Custom Itinerary')}</strong>
            </td>
            <td>
                <span class="status-tag ${inq.status}">${inq.status}</span>
            </td>
            <td style="color:var(--text-muted); font-size:12.5px;">${timeAgo}</td>
            <td>
                <div class="table-btn-group">
                    <a href="../index.html?client=${encodeURIComponent(inq.name)}&dest=${encodeURIComponent(inq.destination || '')}" class="btn-tbl quote" title="Generate Travel Quote / Invoice in Studio">
                        <i class="fa-solid fa-file-invoice"></i>
                    </a>
                    <a href="inquiries.html" class="btn-tbl" title="View Full Details">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
            </td>
        `;
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

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
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
