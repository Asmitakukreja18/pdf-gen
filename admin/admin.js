/**
 * Let's Explore DMC — Admin Portal JavaScript Controller
 */

// State
let currentUser = null;
let categoriesList = [];
let documentsList = [];
let activeCategoryId = '';
let selectedUploadFile = null;

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
        if (!data.success || !data.user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = data.user;
        document.getElementById('adminUsername').textContent = currentUser.username || 'Admin';
        document.getElementById('userInitial').textContent = (currentUser.username || 'A').charAt(0).toUpperCase();
    } catch (err) {
        window.location.href = 'login.html';
    }
}

/**
 * 2. Event Listeners Initialization
 */
function initEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch('../api/logout.php');
            window.location.href = 'login.html';
        } catch (e) {
            window.location.href = 'login.html';
        }
    });

    // Search with debounce
    let debounceTimer;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            loadDocuments(e.target.value.trim());
        }, 300);
    });

    // Modals open/close
    const uploadModal = document.getElementById('uploadModal');
    const viewerModal = document.getElementById('viewerModal');
    const commentsModal = document.getElementById('commentsModal');
    const categoryModal = document.getElementById('categoryModal');

    document.getElementById('openUploadModalBtn').addEventListener('click', () => {
        resetUploadForm();
        uploadModal.classList.add('active');
    });

    document.getElementById('closeUploadModalBtn').addEventListener('click', () => {
        uploadModal.classList.remove('active');
    });

    document.getElementById('closeViewerModalBtn').addEventListener('click', () => {
        viewerModal.classList.remove('active');
        document.getElementById('pdfViewerFrame').src = '';
    });

    document.getElementById('closeCommentsModalBtn').addEventListener('click', () => {
        commentsModal.classList.remove('active');
    });

    document.getElementById('manageCategoriesBtn').addEventListener('click', () => {
        categoryModal.classList.add('active');
        renderCategoryManagerList();
    });

    document.getElementById('closeCategoryModalBtn').addEventListener('click', () => {
        categoryModal.classList.remove('active');
    });

    // Close on backdrop click
    [uploadModal, viewerModal, commentsModal, categoryModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // Drag and Drop Upload
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('pdfFileInput');

    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileSelection(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
    });

    document.getElementById('removeFileBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        selectedUploadFile = null;
        fileInput.value = '';
        document.getElementById('fileSelectedPill').style.display = 'none';
        document.getElementById('dropzone').style.display = 'block';
    });

    // Upload Form Submit
    document.getElementById('uploadForm').addEventListener('submit', handleUploadSubmit);

    // Comments Form Submit
    document.getElementById('addCommentForm').addEventListener('submit', handleCommentSubmit);

    // New Category Form Submit
    document.getElementById('newCategoryForm').addEventListener('submit', handleCategorySubmit);
}

/**
 * 3. File Selection Handler
 */
function handleFileSelection(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please select a valid PDF file.', 'error');
        return;
    }
    if (file.size > 25 * 1024 * 1024) {
        showToast('File size exceeds 25 MB limit.', 'error');
        return;
    }

    selectedUploadFile = file;
    document.getElementById('selectedFileName').textContent = `${file.name} (${formatBytes(file.size)})`;
    document.getElementById('fileSelectedPill').style.display = 'flex';
    document.getElementById('dropzone').style.display = 'none';

    // Auto-fill title if empty
    const titleInput = document.getElementById('uploadTitle');
    if (!titleInput.value) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');
        titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
}

function resetUploadForm() {
    selectedUploadFile = null;
    document.getElementById('uploadForm').reset();
    document.getElementById('replaceDocId').value = '';
    document.getElementById('fileSelectedPill').style.display = 'none';
    document.getElementById('dropzone').style.display = 'block';
    document.getElementById('uploadModalTitle').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Upload PDF to cPanel Storage</span>';
    document.getElementById('uploadBtnText').textContent = 'Upload & Save to Database';
}

/**
 * 4. Load Categories
 */
async function loadCategories() {
    try {
        const res = await fetch('../api/categories.php');
        const data = await res.json();
        if (data.success && data.categories) {
            categoriesList = data.categories;
            renderCategoryPills();
            populateCategorySelect();
            document.getElementById('statTotalCategories').textContent = categoriesList.length;
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function renderCategoryPills() {
    const bar = document.getElementById('categoryFilterBar');
    bar.innerHTML = `<button class="cat-pill ${activeCategoryId === '' ? 'active' : ''}" data-category-id="">All Documents</button>`;

    categoriesList.forEach(cat => {
        const pill = document.createElement('button');
        pill.className = `cat-pill ${activeCategoryId == cat.id ? 'active' : ''}`;
        pill.dataset.categoryId = cat.id;
        pill.textContent = `${cat.name} (${cat.document_count || 0})`;
        pill.addEventListener('click', () => {
            activeCategoryId = cat.id;
            document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            loadDocuments();
        });
        bar.appendChild(pill);
    });

    bar.querySelector('[data-category-id=""]').addEventListener('click', (e) => {
        activeCategoryId = '';
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        loadDocuments();
    });
}

function populateCategorySelect() {
    const select = document.getElementById('uploadCategory');
    select.innerHTML = '<option value="">Select a category / topic...</option>';
    categoriesList.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });
}

/**
 * 5. Load Documents
 */
async function loadDocuments(searchTerm = '') {
    const grid = document.getElementById('documentsGrid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:28px; color:var(--gold);"></i></div>';

    let url = '../api/documents.php?';
    if (activeCategoryId) url += `category_id=${encodeURIComponent(activeCategoryId)}&`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
            documentsList = data.documents || [];
            renderDocumentsGrid(documentsList);
            updateMetrics(documentsList);
        } else {
            grid.innerHTML = `<div class="empty-state"><h3>Failed to load documents</h3><p>${data.error || 'Server error'}</p></div>`;
        }
    } catch (err) {
        grid.innerHTML = '<div class="empty-state"><h3>Connection Error</h3><p>Could not connect to cPanel API.</p></div>';
    }
}

function renderDocumentsGrid(docs) {
    const grid = document.getElementById('documentsGrid');
    grid.innerHTML = '';

    if (docs.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-file-circle-question empty-icon"></i>
                <h3>No PDF Documents Found</h3>
                <p>Upload a new PDF or generate a travel quotation to store your first document here.</p>
                <button class="btn-primary" onclick="document.getElementById('openUploadModalBtn').click()" style="margin: 0 auto;">
                    <i class="fa-solid fa-cloud-arrow-up"></i> Upload PDF Now
                </button>
            </div>
        `;
        return;
    }

    docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        const fileUrl = '../' + doc.file_path;
        const uploadDate = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        card.innerHTML = `
            <div>
                <div class="doc-top">
                    <div class="doc-badge-group">
                        <span class="doc-cat-tag">${escapeHtml(doc.category_name || 'General')}</span>
                        <span class="doc-size-tag">${formatBytes(doc.file_size)}</span>
                    </div>
                    <div class="action-btn-group">
                        <button class="btn-icon-action comments" title="View & Add Internal Notes" data-id="${doc.id}" data-title="${escapeHtml(doc.title)}">
                            <i class="fa-solid fa-comments"></i>
                            <span style="font-size:10px; margin-left:3px; font-weight:700;">${doc.comment_count || 0}</span>
                        </button>
                        <button class="btn-icon-action delete" title="Delete Document" data-id="${doc.id}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>

                <h4 class="doc-title">${escapeHtml(doc.title)}</h4>
                <p class="doc-desc">${escapeHtml(doc.description || 'No additional description provided.')}</p>
            </div>

            <div>
                <div class="doc-meta">
                    <span><i class="fa-solid fa-calendar-days"></i> ${uploadDate}</span>
                    <span><i class="fa-solid fa-user-tie"></i> ${escapeHtml(doc.uploader_username || 'Admin')}</span>
                </div>

                <div class="doc-actions">
                    <button class="btn-view-pill preview-btn" data-url="${fileUrl}" data-title="${escapeHtml(doc.title)}">
                        <i class="fa-solid fa-eye"></i> View PDF
                    </button>
                    <div class="action-btn-group">
                        <a href="${fileUrl}" download="${escapeHtml(doc.file_name)}" class="btn-icon-action download" title="Download PDF File">
                            <i class="fa-solid fa-download"></i>
                        </a>
                        <button class="btn-icon-action replace-btn" title="Replace PDF File" data-id="${doc.id}" data-title="${escapeHtml(doc.title)}" data-cat="${doc.category_id || ''}" data-desc="${escapeHtml(doc.description || '')}">
                            <i class="fa-solid fa-arrows-rotate"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Card action listeners
        card.querySelector('.preview-btn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            openPdfViewer(btn.dataset.url, btn.dataset.title);
        });

        card.querySelector('.comments').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            openCommentsModal(btn.dataset.id, btn.dataset.title);
        });

        card.querySelector('.replace-btn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            openReplaceModal(btn.dataset.id, btn.dataset.title, btn.dataset.cat, btn.dataset.desc);
        });

        card.querySelector('.delete').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            confirmDelete(btn.dataset.id);
        });

        grid.appendChild(card);
    });
}

/**
 * 6. Update Stats
 */
function updateMetrics(docs) {
    document.getElementById('statTotalDocs').textContent = docs.length;
    
    let totalBytes = 0;
    let totalComments = 0;
    docs.forEach(d => {
        totalBytes += parseInt(d.file_size || 0, 10);
        totalComments += parseInt(d.comment_count || 0, 10);
    });

    document.getElementById('statTotalStorage').textContent = formatBytes(totalBytes);
    document.getElementById('statTotalComments').textContent = totalComments;
}

/**
 * 7. Upload PDF Handler
 */
async function handleUploadSubmit(e) {
    e.preventDefault();
    const replaceId = document.getElementById('replaceDocId').value;

    if (!selectedUploadFile && !replaceId) {
        showToast('Please select a PDF file to upload.', 'error');
        return;
    }

    const title = document.getElementById('uploadTitle').value.trim();
    const categoryId = document.getElementById('uploadCategory').value;
    const description = document.getElementById('uploadDescription').value.trim();

    const submitBtn = document.getElementById('submitUploadBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Uploading to Server...';

    const formData = new FormData();
    if (selectedUploadFile) {
        formData.append('pdf_file', selectedUploadFile);
    }
    formData.append('title', title);
    formData.append('category_id', categoryId);
    formData.append('description', description);
    if (replaceId) formData.append('replace_id', replaceId);

    try {
        const res = await fetch('../api/upload.php', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message || 'PDF saved successfully!', 'success');
            document.getElementById('uploadModal').classList.remove('active');
            await loadCategories();
            await loadDocuments();
        } else {
            showToast(data.error || 'Upload failed.', 'error');
        }
    } catch (err) {
        showToast('Network error while uploading PDF.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span id="uploadBtnText">Upload & Save to Database</span>';
    }
}

/**
 * 8. Replace Modal
 */
function openReplaceModal(id, title, catId, desc) {
    resetUploadForm();
    document.getElementById('replaceDocId').value = id;
    document.getElementById('uploadTitle').value = title;
    document.getElementById('uploadCategory').value = catId;
    document.getElementById('uploadDescription').value = desc;
    document.getElementById('uploadModalTitle').innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> <span>Replace PDF: ${escapeHtml(title)}</span>`;
    document.getElementById('uploadBtnText').textContent = 'Confirm File Replacement';
    document.getElementById('uploadModal').classList.add('active');
}

/**
 * 9. PDF Viewer Modal
 */
function openPdfViewer(url, title) {
    document.getElementById('viewerTitle').innerHTML = `<i class="fa-solid fa-file-pdf"></i> <span>${escapeHtml(title)}</span>`;
    document.getElementById('viewerDownloadBtn').href = url;
    document.getElementById('viewerDownloadBtn').download = title.replace(/\s+/g, '_') + '.pdf';
    document.getElementById('pdfViewerFrame').src = url;
    document.getElementById('viewerModal').classList.add('active');
}

/**
 * 10. Comments & Notes
 */
async function openCommentsModal(docId, title) {
    document.getElementById('commentDocId').value = docId;
    document.getElementById('commentsModalDocTitle').textContent = `Remarks & Notes: ${title}`;
    document.getElementById('commentsThread').innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin" style="color:var(--gold);"></i></div>';
    document.getElementById('commentsModal').classList.add('active');

    try {
        const res = await fetch(`../api/comments.php?document_id=${docId}`);
        const data = await res.json();
        const thread = document.getElementById('commentsThread');

        if (data.success && data.comments && data.comments.length > 0) {
            thread.innerHTML = '';
            data.comments.forEach(cm => {
                const bubble = document.createElement('div');
                bubble.className = 'comment-bubble';
                const dateStr = new Date(cm.created_at).toLocaleString();
                bubble.innerHTML = `
                    <div class="comment-bubble-header">
                        <span class="comment-author"><i class="fa-solid fa-user-circle"></i> ${escapeHtml(cm.username || 'Admin')}</span>
                        <span class="comment-date">${dateStr}</span>
                    </div>
                    <div class="comment-body">${escapeHtml(cm.comment)}</div>
                `;
                thread.appendChild(bubble);
            });
        } else {
            thread.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">No internal remarks posted yet for this document.</p>';
        }
    } catch (err) {
        document.getElementById('commentsThread').innerHTML = '<p style="color:#f87171; text-align:center;">Failed to load comments.</p>';
    }
}

async function handleCommentSubmit(e) {
    e.preventDefault();
    const docId = document.getElementById('commentDocId').value;
    const commentInput = document.getElementById('newCommentInput');
    const comment = commentInput.value.trim();

    if (!comment) return;

    try {
        const res = await fetch('../api/comments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_id: docId, comment })
        });
        const data = await res.json();

        if (data.success) {
            commentInput.value = '';
            showToast('Comment added!', 'success');
            await openCommentsModal(docId, document.getElementById('commentsModalDocTitle').textContent.replace('Remarks & Notes: ', ''));
            loadDocuments();
        } else {
            showToast(data.error || 'Failed to post comment', 'error');
        }
    } catch (err) {
        showToast('Network error posting comment', 'error');
    }
}

/**
 * 11. Delete Document
 */
async function confirmDelete(id) {
    if (!confirm('Are you sure you want to permanently delete this PDF document? This will remove the file from cPanel storage and database.')) {
        return;
    }

    try {
        const res = await fetch('../api/delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Document deleted permanently.', 'success');
            await loadCategories();
            await loadDocuments();
        } else {
            showToast(data.error || 'Delete failed', 'error');
        }
    } catch (err) {
        showToast('Error communicating with server.', 'error');
    }
}

/**
 * 12. Category Management
 */
function renderCategoryManagerList() {
    const list = document.getElementById('categoryManagerList');
    list.innerHTML = '';
    categoriesList.forEach(cat => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.04); border-radius:8px;';
        item.innerHTML = `
            <div>
                <strong style="color:#ffffff; font-size:13.5px;">${escapeHtml(cat.name)}</strong>
                <span style="color:var(--text-muted); font-size:12px; margin-left:6px;">(${cat.document_count || 0} PDFs)</span>
            </div>
            <button class="btn-icon-action delete" style="width:28px; height:28px; font-size:11px;" title="Delete Category" data-cat-id="${cat.id}">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        item.querySelector('.delete').addEventListener('click', async () => {
            if (!confirm(`Delete category "${cat.name}"? Documents in this category will remain safe as General.`)) return;
            try {
                const res = await fetch(`../api/categories.php?id=${cat.id}`, { method: 'DELETE' });
                const d = await res.json();
                if (d.success) {
                    showToast('Category deleted', 'success');
                    await loadCategories();
                    renderCategoryManagerList();
                } else {
                    showToast(d.error || 'Failed', 'error');
                }
            } catch (e) {
                showToast('Network error', 'error');
            }
        });

        list.appendChild(item);
    });
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('newCatName').value.trim();
    const desc = document.getElementById('newCatDesc').value.trim();

    try {
        const res = await fetch('../api/categories.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Category created!', 'success');
            document.getElementById('newCategoryForm').reset();
            await loadCategories();
            renderCategoryManagerList();
        } else {
            showToast(data.error || 'Failed to create category', 'error');
        }
    } catch (err) {
        showToast('Error communicating with server', 'error');
    }
}

/**
 * 13. Toast Notification Helper
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/**
 * Utilities
 */
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
