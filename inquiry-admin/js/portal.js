/**
 * portal.js — Master SaaS Portal Layout Controller
 * Manages Left Sidebar (expand/collapse), Mobile Drawer, Breadcrumbs, Session State
 */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initMobileDrawer();
  highlightActiveNav();
});

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
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

