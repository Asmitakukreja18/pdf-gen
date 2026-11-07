/**
 * portal.js — Master SaaS Portal Layout & Role Controller
 * Manages:
 * - Left Sidebar (expand/collapse & mobile drawer)
 * - Navigation Highlighting
 * - Role Context Switching (Admin full power vs Staff/Sub-user workspace)
 * - Session & User Identity synchronization
 */

document.addEventListener('DOMContentLoaded', () => {
  initRoleContext();
  initSidebar();
  initMobileDrawer();
  highlightActiveNav();
});

/**
 * Detect role from URL query param (?role=staff) or localStorage
 * and adapt the sidebar & actions accordingly.
 */
function initRoleContext() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramRole = urlParams.get('role');

  if (paramRole) {
    localStorage.setItem('dmc_role', paramRole.toLowerCase());
  }

  const role = (localStorage.getItem('dmc_role') || 'admin').toLowerCase();
  const isStaff = (role === 'staff' || role === 'user' || role === 'executive' || role === 'agent');

  // If in staff mode, configure staff sidebar
  const sidebarMenu = document.querySelector('.portal-sidebar .sidebar-menu');
  const brandLink = document.querySelector('.portal-sidebar .sidebar-brand');

  if (isStaff && sidebarMenu) {
    if (brandLink) brandLink.setAttribute('href', 'staff.html');

    const currentFile = window.location.pathname.split('/').pop() || '';
    const isAi = currentFile.includes('ai-assistant');
    const isPkg = currentFile.includes('packages');
    const isDocs = currentFile.includes('documents');

    sidebarMenu.innerHTML = `
      <a href="staff.html" class="nav-link">
        <i class="fa-solid fa-desktop"></i>
        <span>My Workspace</span>
      </a>
      <a href="staff.html#myLeadsSection" class="nav-link">
        <i class="fa-solid fa-inbox"></i>
        <span>Leads &amp; Inquiries</span>
      </a>
      <a href="ai-assistant.html?role=staff" class="nav-link ${isAi ? 'active' : ''}">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>AI Quotation Studio</span>
      </a>
      <a href="packages.html?role=staff" class="nav-link ${isPkg ? 'active' : ''}">
        <i class="fa-solid fa-box-open"></i>
        <span>Tour Packages</span>
      </a>
      <a href="documents.html?role=staff" class="nav-link ${isDocs ? 'active' : ''}">
        <i class="fa-solid fa-folder-open"></i>
        <span>Documents &amp; PDFs</span>
      </a>
    `;

    // Update user profile pill in top bar if present
    const userRoleBadge = document.getElementById('userRoleBadge');
    if (userRoleBadge) {
      userRoleBadge.textContent = 'Staff Workspace';
      userRoleBadge.className = 'status-pill status-confirmed';
    }

    const userNameEl = document.getElementById('userNameEl') || document.querySelector('.user-info .user-name');
    if (userNameEl) {
      const storedUser = JSON.parse(localStorage.getItem('dmc_user') || '{}');
      userNameEl.textContent = storedUser.name || 'Staff User';
    }

    // Hide admin-only buttons if any
    document.querySelectorAll('.admin-only, #btnPublishWeb').forEach(el => {
      el.style.display = 'none';
    });
  } else if (!isStaff && brandLink) {
    brandLink.setAttribute('href', 'dashboard.html');
  }
}

function initSidebar() {
  const sidebar = document.getElementById('portalSidebar');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  if (!sidebar || !toggleBtn) return;

  // Restore collapsed state
  const isCollapsed = localStorage.getItem('dmc_sidebar_collapsed') === 'true';
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
  }

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('dmc_sidebar_collapsed', sidebar.classList.contains('collapsed'));
  });
}

function initMobileDrawer() {
  const sidebar = document.getElementById('portalSidebar');
  const trigger = document.getElementById('mobileMenuTrigger');
  if (!sidebar || !trigger) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('mobile-open');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && e.target !== trigger) {
      sidebar.classList.remove('mobile-open');
    }
  });
}

function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.split('?')[0] === currentPath || (currentPath === '' && href === 'dashboard.html')) {
      link.classList.add('active');
    }
  });
}
