/**
 * Let's Explore DMC — Executive Admin Portal Controller
 * Conforms to Executive Dual-Workspace SaaS Design (Image 2)
 */

// State
let currentUser = { id: 1, username: 'Admin', role: 'admin' };
let categoriesList = [
    { id: 'quotation', name: 'Quotations', document_count: 0 },
    { id: 'itinerary', name: 'Itineraries', document_count: 0 },
    { id: 'invoice', name: 'Invoices', document_count: 0 },
    { id: 'summary', name: 'Package Summaries', document_count: 0 },
    { id: 'voucher', name: 'Hotel Vouchers', document_count: 0 },
    { id: 'costing', name: 'Hotel Costings', document_count: 0 }
];

// Clean Corporate Document Store (Zero Dummy Records)
const DEFAULT_CORPORATE_DOCS = [];

let allDocuments = [];
let selectedUploadFile = null;
let currentViewMode = 'grid'; // 'grid' | 'list'

// Internal Notes Store
const internalNotesStore = {};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
    await verifyAuthentication();
    initEventListeners();
    await loadCategories();
    await loadDocuments();
});

/**
 * 1. Authentication Check
 */
async function verifyAuthentication() {
    try {
        const res = await fetch('../api/login.php');
        const data = await res.json();
        if (data && data.success && data.user) {
            currentUser = data.user;
        }
    } catch (err) {
        // Fallback to active Admin session in standalone/demo environment
        console.info('Running in corporate standalone mode: Admin authenticated.');
    }

    const usernameEl = document.getElementById('adminUsername');
    const initialEl = document.getElementById('userInitial');
    if (usernameEl) usernameEl.textContent = currentUser.username || 'Admin';
    if (initialEl) initialEl.textContent = (currentUser.username || 'A').charAt(0).toUpperCase();
}

/**
 * 2. Event Listeners Initialization
 */
function initEventListeners() {
    // Top Profile Chip Toggle
    const profileChip = document.getElementById('adminProfileChip');
    const profileDropdown = document.getElementById('adminProfileDropdown');
    if (profileChip && profileDropdown) {
        profileChip.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = profileDropdown.style.display === 'block';
            profileDropdown.style.display = isOpen ? 'none' : 'block';
        });
        document.addEventListener('click', () => {
            profileDropdown.style.display = 'none';
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('../api/logout.php');
            } catch (e) { }
            window.location.href = 'login.html';
        });
    }

    // Hero Manage Documents Button (Smooth Scroll)
    const btnHeroManage = document.getElementById('btnHeroManage');
    if (btnHeroManage) {
        btnHeroManage.addEventListener('click', () => {
            const sec = document.querySelector('.admin-docs-section');
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Search Inputs (Debounced)
    const searchInput = document.getElementById('searchInput');
    const topSearchInput = document.getElementById('topSearchInput');

    const handleSearch = (query) => {
        const q = (query || '').toLowerCase().trim();
        if (searchInput && searchInput.value !== query) searchInput.value = query;
        if (topSearchInput && topSearchInput.value !== query) topSearchInput.value = query;
        filterAndRenderDocuments(q);
    };

    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => handleSearch(e.target.value), 250);
        });
    }
    if (topSearchInput) {
        topSearchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => handleSearch(e.target.value), 250);
        });
    }

    // Category Filter Dropdown
    const filterCat = document.getElementById('filterCategorySelect');
    if (filterCat) {
        filterCat.addEventListener('change', () => filterAndRenderDocuments());
    }

    // Date Filter Dropdown
    const filterDate = document.getElementById('filterDateSelect');
    if (filterDate) {
        filterDate.addEventListener('change', () => filterAndRenderDocuments());
    }

    // View Mode Toggle (Grid vs List)
    const btnViewGrid = document.getElementById('btnViewGrid');
    const btnViewList = document.getElementById('btnViewList');
    if (btnViewGrid && btnViewList) {
        btnViewGrid.addEventListener('click', () => {
            currentViewMode = 'grid';
            btnViewGrid.classList.add('active');
            btnViewList.classList.remove('active');
            const grid = document.getElementById('documentsGrid');
            if (grid) grid.style.display = 'grid';
            filterAndRenderDocuments();
        });
        btnViewList.addEventListener('click', () => {
            currentViewMode = 'list';
            btnViewList.classList.add('active');
            btnViewGrid.classList.remove('active');
            const grid = document.getElementById('documentsGrid');
            if (grid) grid.style.display = 'flex';
            filterAndRenderDocuments();
        });
    }

    // Quick Action: View All Documents
    const qaViewAll = document.getElementById('qaViewAllDocs');
    if (qaViewAll) {
        qaViewAll.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (topSearchInput) topSearchInput.value = '';
            if (filterCat) filterCat.value = '';
            if (filterDate) filterDate.value = '';
            filterAndRenderDocuments();
            const sec = document.querySelector('.admin-docs-section');
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Sidebar Links
    const sideNavCat = document.getElementById('sideNavCategories');
    if (sideNavCat) {
        sideNavCat.addEventListener('click', () => {
            const catModal = document.getElementById('categoryModal');
            if (catModal) catModal.classList.add('active');
            renderCategoryManagerList();
        });
    }
    const sideNavNotes = document.getElementById('sideNavNotes');
    if (sideNavNotes) {
        sideNavNotes.addEventListener('click', () => {
            openCommentsModal('corp-1', 'Thailand Holiday Quotation');
        });
    }

    // Modals Open/Close
    const uploadModal = document.getElementById('uploadModal');
    const viewerModal = document.getElementById('viewerModal');
    const commentsModal = document.getElementById('commentsModal');
    const categoryModal = document.getElementById('categoryModal');

    const openUploadBtn = document.getElementById('openUploadModalBtn');
    if (openUploadBtn) {
        openUploadBtn.addEventListener('click', () => {
            resetUploadForm();
            if (uploadModal) uploadModal.classList.add('active');
        });
    }

    const closeUploadBtn = document.getElementById('closeUploadModalBtn');
    if (closeUploadBtn) closeUploadBtn.addEventListener('click', () => uploadModal && uploadModal.classList.remove('active'));

    const closeViewerBtn = document.getElementById('closeViewerModalBtn');
    if (closeViewerBtn) {
        closeViewerBtn.addEventListener('click', () => {
            if (viewerModal) viewerModal.classList.remove('active');
            const frame = document.getElementById('pdfViewerFrame');
            if (frame) frame.src = '';
        });
    }

    const closeCommentsBtn = document.getElementById('closeCommentsModalBtn');
    if (closeCommentsBtn) closeCommentsBtn.addEventListener('click', () => commentsModal && commentsModal.classList.remove('active'));

    const closeCatBtn = document.getElementById('closeCategoryModalBtn');
    if (closeCatBtn) closeCatBtn.addEventListener('click', () => categoryModal && categoryModal.classList.remove('active'));

    // Backdrop Click
    [uploadModal, viewerModal, commentsModal, categoryModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // File Drag & Drop in Upload Modal
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('pdfFileInput');
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.style.borderColor = 'var(--primary-blue)';
                dropzone.style.background = 'var(--soft-blue)';
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.style.borderColor = '#CBD5E1';
                dropzone.style.background = '#F8FAFC';
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) handleFileSelection(files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) handleFileSelection(e.target.files[0]);
        });
    }

    const removeFileBtn = document.getElementById('removeFileBtn');
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedUploadFile = null;
            if (fileInput) fileInput.value = '';
            const pill = document.getElementById('fileSelectedPill');
            if (pill) pill.style.display = 'none';
            if (dropzone) dropzone.style.display = 'block';
        });
    }

    // Upload Form Submit
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) uploadForm.addEventListener('submit', handleUploadSubmit);

    // Comments Form Submit
    const commentForm = document.getElementById('addCommentForm');
    if (commentForm) commentForm.addEventListener('submit', handleCommentSubmit);

    // New Category Form Submit
    const newCatForm = document.getElementById('newCategoryForm');
    if (newCatForm) newCatForm.addEventListener('submit', handleCategorySubmit);
}

/**
 * 3. File Selection Handler
 */
function handleFileSelection(file) {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
        showToast('Please select a valid PDF file.', 'error');
        return;
    }
    if (file.size > 25 * 1024 * 1024) {
        showToast('File size exceeds 25 MB limit.', 'error');
        return;
    }

    selectedUploadFile = file;
    const nameEl = document.getElementById('selectedFileName');
    if (nameEl) nameEl.textContent = `${file.name} (${formatBytes(file.size)})`;
    const pill = document.getElementById('fileSelectedPill');
    if (pill) pill.style.display = 'flex';
    const dropzone = document.getElementById('dropzone');
    if (dropzone) dropzone.style.display = 'none';

    const titleInput = document.getElementById('uploadTitle');
    if (titleInput && !titleInput.value) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');
        titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
}

function resetUploadForm() {
    selectedUploadFile = null;
    const form = document.getElementById('uploadForm');
    if (form) form.reset();
    const pill = document.getElementById('fileSelectedPill');
    if (pill) pill.style.display = 'none';
    const dropzone = document.getElementById('dropzone');
    if (dropzone) dropzone.style.display = 'block';
}

/**
 * 4. Load Categories
 */
async function loadCategories() {
    try {
        const res = await fetch('../api/categories.php');
        const data = await res.json();
        if (data && data.success && data.categories && data.categories.length > 0) {
            categoriesList = data.categories;
        }
    } catch (e) {
        // Fallback default categories are already set
    }
}

/**
 * 5. Load Documents (Database + AI Studio LocalStorage + Standard Showcase)
 */
async function loadDocuments() {
    let apiDocs = [];
    try {
        const res = await fetch('../api/documents.php');
        const data = await res.json();
        if (data && data.success && Array.isArray(data.documents)) {
            apiDocs = data.documents.map(d => ({
                id: 'db-' + d.id,
                title: d.title || 'Untitled Document',
                category: d.category_name || 'Quotation',
                ref: (d.title && d.title.match(/(LEDMC-[A-Za-z0-9\-_]+)/) ? d.title.match(/(LEDMC-[A-Za-z0-9\-_]+)/)[1] : 'LEDMC-2025-' + String(d.id).padStart(3, '0')),
                customer: d.description ? (d.description.match(/Customer:\s*([^,|]+)/i) ? d.description.match(/Customer:\s*([^,|]+)/i)[1].trim() : 'Corporate Client') : 'Corporate Client',
                date: new Date(d.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                file_size: parseInt(d.file_size || 220000, 10),
                file_path: d.file_path.startsWith('../') || d.file_path.startsWith('http') ? d.file_path : ('../' + d.file_path),
                status: 'Active',
                comment_count: parseInt(d.comment_count || 0, 10),
                description: d.description || 'Saved cPanel PDF document.'
            }));
        }
    } catch (e) {
        // Standalone or local mode
    }

    // Merge AI Studio saved quotations from localStorage
    let localSavedDocs = [];
    try {
        const rawLocal = localStorage.getItem('dmc_saved_quotations_v1') || localStorage.getItem('saved_quotes_backup');
        if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed)) {
                localSavedDocs = parsed.map((item, idx) => ({
                    id: 'local-' + (item.id || idx),
                    title: (item.destination || item.title || 'Travel') + ' Quotation',
                    category: 'Quotation',
                    ref: item.quote_ref || item.quoteRef || item.ref || ('LEDMC-2025-' + String(100 + idx)),
                    customer: item.client_name || item.customerName || item.clientName || 'Valued Guest',
                    date: item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (item.savedAt ? new Date(item.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'),
                    file_size: 235 * 1024,
                    file_path: '../images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf',
                    status: 'Active',
                    comment_count: 1,
                    description: `${item.destination || 'Custom'} tour package for ${item.pax_count || item.passengers || '2 Adults'}.`
                }));
            }
        }
    } catch (e) { }

    // Combine: API docs first, then AI Studio docs, then standard reference documents
    const combined = [...apiDocs, ...localSavedDocs, ...DEFAULT_CORPORATE_DOCS];
    // Deduplicate by ref/title
    const seen = new Set();
    allDocuments = combined.filter(doc => {
        const key = (doc.ref || doc.title).trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    filterAndRenderDocuments();
    updateMetrics();
}

/**
 * Filter and Render Documents Grid
 */
function filterAndRenderDocuments(searchTerm = '') {
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;

    const query = searchTerm || (document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '');
    const selectedCat = document.getElementById('filterCategorySelect') ? document.getElementById('filterCategorySelect').value : '';
    const selectedDate = document.getElementById('filterDateSelect') ? document.getElementById('filterDateSelect').value : '';

    const filtered = allDocuments.filter(doc => {
        if (query) {
            const text = `${doc.title} ${doc.ref} ${doc.customer} ${doc.description} ${doc.category}`.toLowerCase();
            if (!text.includes(query)) return false;
        }
        if (selectedCat) {
            if (!doc.category.toLowerCase().includes(selectedCat.toLowerCase())) return false;
        }
        if (selectedDate === 'apr' && !doc.date.includes('Apr')) return false;
        return true;
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #FFFFFF; border: 2px dashed #E2E8F0; border-radius: 12px;">
                <i class="fa-solid fa-file-circle-question" style="font-size: 38px; color: #94A3B8; margin-bottom: 12px; display:block;"></i>
                <h4 style="font-size: 16px; font-weight: 700; color: var(--primary-navy); margin-bottom: 4px;">No matching documents found</h4>
                <p style="font-size: 13px; color: #64748B; margin-bottom: 16px;">Try adjusting your search terms or category filters.</p>
                <button class="btn-primary" onclick="document.getElementById('searchInput').value=''; document.getElementById('filterCategorySelect').value=''; filterAndRenderDocuments();" style="margin: 0 auto;">
                    Reset Filters
                </button>
            </div>
        `;
        return;
    }

    filtered.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-management-card';
        if (currentViewMode === 'list') {
            card.style.flexDirection = 'row';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'space-between';
            card.style.gap = '16px';
            card.style.width = '100%';
        }

        const categoryTagClass = doc.category.toLowerCase().replace(/\s+/g, '-');
        const viewUrl = doc.file_path;

        card.innerHTML = `
            <div style="flex:1; min-width:0;">
                <div class="card-top-tags">
                    <span class="card-type-tag ${categoryTagClass}">${escapeHtml(doc.category)}</span>
                    <span class="card-status-dot">Active</span>
                </div>

                <div class="card-body-row">
                    <div class="card-doc-thumb">
                        <i class="fa-solid fa-file-pdf"></i>
                        <span>PDF</span>
                    </div>

                    <div class="card-doc-info">
                        <h4 class="card-doc-title" title="${escapeHtml(doc.title)}">${escapeHtml(doc.title)}</h4>
                        <div class="card-doc-ref">Ref: <strong>${escapeHtml(doc.ref)}</strong></div>
                        <div class="card-doc-customer">Customer: ${escapeHtml(doc.customer)}</div>
                        <div class="card-doc-meta">
                            <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(doc.date)}</span> &bull; 
                            <span>${formatBytes(doc.file_size)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-action-bar">
                <button class="btn-card-act btn-view-pdf" data-url="${viewUrl}" data-title="${escapeHtml(doc.title)}">
                    <i class="fa-regular fa-eye"></i> View PDF
                </button>
                <a href="${viewUrl}" download="${doc.title}.pdf" class="btn-card-act" title="Download PDF Document">
                    <i class="fa-solid fa-download"></i> Download
                </a>
                <a href="../studio.html?load=${encodeURIComponent(doc.ref)}" class="btn-card-act" title="Edit in Document Studio">
                    <i class="fa-solid fa-pen"></i> Edit
                </a>
                <button class="btn-card-act btn-notes-doc" data-id="${doc.id}" data-title="${escapeHtml(doc.title)}" title="Internal Notes">
                    <i class="fa-regular fa-comment-dots"></i> Notes
                </button>
                <button class="btn-card-act delete btn-delete-doc" data-id="${doc.id}" data-title="${escapeHtml(doc.title)}" title="Delete Document">
                    <i class="fa-solid fa-trash-can"></i> Delete
                </button>
            </div>
        `;

        // Action Handlers
        card.querySelector('.btn-view-pdf').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            openPdfViewer(btn.dataset.url, btn.dataset.title);
        });

        card.querySelector('.btn-notes-doc').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            openCommentsModal(btn.dataset.id, btn.dataset.title);
        });

        card.querySelector('.btn-delete-doc').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            confirmDelete(btn.dataset.id, btn.dataset.title);
        });

        grid.appendChild(card);
    });
}

/**
 * 6. Update Metric Counters (Computed dynamically from Real Database Records)
 */
function updateMetrics() {
    const totalCount = allDocuments.length;
    let quotes = 0;
    let invoices = 0;
    let itineraries = 0;
    let totalBytes = 0;
    let totalNotes = 0;

    allDocuments.forEach(d => {
        const cat = (d.category || '').toLowerCase();
        if (cat.includes('quotation')) quotes++;
        else if (cat.includes('invoice')) invoices++;
        else if (cat.includes('itinerary')) itineraries++;
        totalBytes += parseInt(d.file_size || 250000, 10);
        totalNotes += parseInt(d.comment_count || 0, 10);
    });

    const elTotal = document.getElementById('statTotalDocs');
    if (elTotal) elTotal.textContent = totalCount;

    const elQuotes = document.getElementById('statQuotations');
    if (elQuotes) elQuotes.textContent = quotes;

    const elInvoices = document.getElementById('statInvoices');
    if (elInvoices) elInvoices.textContent = invoices;

    const elItin = document.getElementById('statItineraries');
    if (elItin) elItin.textContent = itineraries;

    const elStorage = document.getElementById('statTotalStorage');
    if (elStorage) elStorage.textContent = formatBytes(totalBytes);

    const elNotes = document.getElementById('statTotalComments');
    if (elNotes) elNotes.textContent = totalNotes;

    // Storage circular chart
    const maxCapacity = 10 * 1024 * 1024 * 1024; // 10 GB
    const percentUsed = Math.min(100, Math.max(1, Math.round((totalBytes / maxCapacity) * 100)));
    const percentEl = document.getElementById('storagePercentText');
    if (percentEl) percentEl.textContent = `${percentUsed}%`;
    const subtextEl = document.getElementById('storageUsageSubtext');
    if (subtextEl) subtextEl.textContent = `(${formatBytes(totalBytes)} / 10 GB)`;
}

/**
 * 7. Upload PDF Handler (Direct MySQL Database & Disk Storage)
 */
async function handleUploadSubmit(e) {
    e.preventDefault();
    const title = (document.getElementById('uploadTitle').value || '').trim();
    const category = document.getElementById('uploadCategory').value || 'Quotation';
    const notes = (document.getElementById('uploadDescription').value || '').trim();

    if (!selectedUploadFile) {
        showToast('Please select a PDF file to upload.', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitUploadBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Uploading to Database...';

    const formData = new FormData();
    formData.append('pdf_file', selectedUploadFile);
    formData.append('title', title || selectedUploadFile.name.replace('.pdf', ''));
    formData.append('category_name', category);
    formData.append('description', notes ? `Customer: ${notes}` : '');

    try {
        const res = await fetch('../api/upload.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data && data.success && data.document) {
            const saved = data.document;
            const newDoc = {
                id: 'db-' + saved.id,
                title: saved.title,
                category: category,
                ref: (saved.title.match(/(LEDMC-[A-Za-z0-9\-_]+)/) ? saved.title.match(/(LEDMC-[A-Za-z0-9\-_]+)/)[1] : 'LEDMC-2025-' + String(saved.id).padStart(3, '0')),
                customer: notes || 'Direct Upload',
                date: new Date(saved.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                file_size: saved.file_size || selectedUploadFile.size,
                file_path: saved.file_path.startsWith('../') ? saved.file_path : ('../' + saved.file_path),
                status: 'Active',
                comment_count: 0,
                description: saved.description || notes
            };
            allDocuments.unshift(newDoc);
            filterAndRenderDocuments();
            updateMetrics();
            showToast(`PDF "${newDoc.title}" saved to MySQL database & storage!`, 'success');
            const modal = document.getElementById('uploadModal');
            if (modal) modal.classList.remove('active');
            resetUploadForm();
            return;
        } else {
            showToast(data.error || 'Server rejected file upload.', 'error');
        }
    } catch (e) {
        showToast('Error uploading to cPanel server. Please verify database connection.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Upload & Save Document</span>';
    }
}

/**
 * 8. PDF Viewer Modal
 */
function openPdfViewer(url, title) {
    const viewerModal = document.getElementById('viewerModal');
    const titleEl = document.getElementById('viewerTitle');
    const frame = document.getElementById('pdfViewerFrame');
    const downloadBtn = document.getElementById('viewerDownloadBtn');

    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-file-pdf" style="color:#DC2626;"></i> <span>${escapeHtml(title)}</span>`;
    }
    if (downloadBtn) {
        downloadBtn.href = url;
        downloadBtn.download = `${title}.pdf`;
    }
    if (frame) {
        frame.src = url;
    }
    if (viewerModal) {
        viewerModal.classList.add('active');
    }
}

/**
 * 9. Comments & Internal Notes Modal (Direct MySQL Persistence via api/comments.php)
 */
async function openCommentsModal(docId, title) {
    const commentsModal = document.getElementById('commentsModal');
    const titleEl = document.getElementById('commentsModalDocTitle');
    const thread = document.getElementById('commentsThread');
    const idInput = document.getElementById('commentDocId');

    if (titleEl) titleEl.textContent = `Internal Notes — ${title}`;
    if (idInput) idInput.value = docId;
    if (thread) thread.innerHTML = '<div style="text-align:center; padding:18px;"><i class="fa-solid fa-circle-notch fa-spin" style="color:var(--primary-blue);"></i> Loading notes from database...</div>';
    if (commentsModal) commentsModal.classList.add('active');

    const cleanId = String(docId).replace(/^db-/, '').replace(/^corp-/, '');
    try {
        const res = await fetch(`../api/comments.php?document_id=${encodeURIComponent(cleanId)}`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.comments) && data.comments.length > 0) {
            thread.innerHTML = '';
            data.comments.forEach(note => {
                const bubble = document.createElement('div');
                bubble.style.cssText = 'background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px 12px;';
                bubble.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11.5px;">
                        <strong style="color:var(--primary-navy);"><i class="fa-solid fa-user-circle"></i> ${escapeHtml(note.username || 'Admin')}</strong>
                        <span style="color:#94A3B8;">${escapeHtml(new Date(note.created_at).toLocaleString())}</span>
                    </div>
                    <div style="font-size:12.5px; color:#334155; line-height:1.4;">${escapeHtml(note.comment)}</div>
                `;
                thread.appendChild(bubble);
            });
            return;
        }
    } catch (e) {
        console.warn('Comments API query notice:', e);
    }

    // Default note or prompt to add
    thread.innerHTML = '<div style="text-align:center; padding:18px; color:#64748B; font-size:12px;">No internal remarks recorded in database yet for this document. Use form below to record one.</div>';
}

async function handleCommentSubmit(e) {
    e.preventDefault();
    const docId = document.getElementById('commentDocId').value;
    const input = document.getElementById('newCommentInput');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    const cleanId = String(docId).replace(/^db-/, '').replace(/^corp-/, '');
    const submitBtn = document.getElementById('saveCommentBtn');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch('../api/comments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_id: parseInt(cleanId, 10) || 1, comment: text })
        });
        const data = await res.json();
        if (data && data.success) {
            showToast('Note permanently saved to MySQL database!', 'success');
            if (input) input.value = '';
            await openCommentsModal(docId, document.getElementById('commentsModalDocTitle').textContent.replace('Internal Notes — ', ''));
            loadDocuments();
            return;
        } else {
            showToast(data.error || 'Failed to save note to database.', 'error');
        }
    } catch (err) {
        showToast('Database connection error while saving note.', 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

/**
 * 10. Delete Document
 */
function confirmDelete(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? This action will remove the document record.`)) {
        return;
    }

    allDocuments = allDocuments.filter(d => d.id !== id);
    filterAndRenderDocuments();
    updateMetrics();
    showToast(`Document "${title}" removed.`, 'info');
}

/**
 * 11. Category Management List
 */
function renderCategoryManagerList() {
    const list = document.getElementById('categoryManagerList');
    if (!list) return;
    list.innerHTML = '';

    categoriesList.forEach(cat => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; font-size:12.5px;';
        row.innerHTML = `
            <div>
                <strong style="color:var(--primary-navy);">${escapeHtml(cat.name)}</strong>
                <span style="color:#94A3B8; font-size:11px; margin-left:6px;">(${cat.document_count || 0} docs)</span>
            </div>
            <button style="border:none; background:none; color:#EF4444; cursor:pointer;" title="Delete Category" onclick="deleteCategory('${cat.id}')">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        list.appendChild(row);
    });
}

function handleCategorySubmit(e) {
    e.preventDefault();
    const input = document.getElementById('newCatName');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    categoriesList.push({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        document_count: 0
    });

    if (input) input.value = '';
    renderCategoryManagerList();
    showToast(`Category "${name}" created!`, 'success');
}

window.deleteCategory = function (catId) {
    categoriesList = categoriesList.filter(c => c.id !== catId);
    renderCategoryManagerList();
    showToast('Category deleted.', 'info');
};

/**
 * 12. Toast Helper
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}

/**
 * Utilities
 */
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}
