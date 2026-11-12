/**
 * portal.js — Master SaaS Portal Layout, Unified Navigation & Role Controller
 * Let's Explore DMC Luxury ERP Portal
 * 
 * Synchronizes:
 * - Left Sidebar (Admin vs Staff role awareness, highlights active page)
 * - Luxury Topbar (User Profile Pill, Public Site link, AI Studio CTA, Breadcrumb)
 * - Mobile Drawer & Collapsed States
 * - Inactivity Session Awareness
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initPortalTheme();
    syncUserIdentity();
    syncSidebarNavigation();
    initSidebarControls();
  });

  /**
   * Reads authenticated user from localStorage and hydrates topbar + sidebar
   */
  function syncUserIdentity() {
    var storedUser = null;
    try {
      var raw = localStorage.getItem('dmc_user');
      if (raw) storedUser = JSON.parse(raw);
    } catch (e) {
      storedUser = null;
    }

    var role = (storedUser && storedUser.role) || localStorage.getItem('dmc_role') || 'admin';
    role = role.toLowerCase();
    var isStaff = (role === 'staff' || role === 'user' || role === 'executive' || role === 'agent');

    // Update Avatar Initials
    var avatarEl = document.getElementById('topbarAvatar') || document.getElementById('userAvatar');
    if (avatarEl) {
      if (storedUser && storedUser.name) {
        var parts = storedUser.name.trim().split(/\s+/);
        var initials = parts.length > 1 ? (parts[0][0] + parts[1][0]) : parts[0].substring(0, 2);
        avatarEl.textContent = initials.toUpperCase();
      } else {
        avatarEl.textContent = isStaff ? 'ST' : 'AD';
      }
    }

    // Update Topbar User Name & Role
    var nameEls = [
      document.getElementById('topbarUserName'),
      document.getElementById('userName'),
      document.getElementById('userNameEl')
    ];
    nameEls.forEach(function (el) {
      if (el) {
        el.textContent = (storedUser && storedUser.name) ? storedUser.name : (isStaff ? 'Staff Executive' : 'Admin User');
      }
    });

    var roleEls = [
      document.getElementById('topbarUserRole'),
      document.getElementById('userRole')
    ];
    roleEls.forEach(function (el) {
      if (el) {
        el.textContent = isStaff ? 'Operations Desk' : 'Super Administrator';
      }
    });

    var welcomeName = document.getElementById('welcomeUserName');
    if (welcomeName) {
      welcomeName.textContent = (storedUser && storedUser.name) ? storedUser.name.split(' ')[0] : (isStaff ? 'Executive' : 'Admin');
    }

    // Adapt sidebar links according to role
    var brandLink = document.getElementById('sidebarBrandLink') || document.querySelector('.sidebar-brand');
    if (brandLink) {
      brandLink.setAttribute('href', isStaff ? 'staff.html' : 'dashboard.html');
    }

    var dashNav = document.getElementById('navItemDashboard') || document.querySelector('.sidebar-menu a[href*="dashboard.html"]');
    if (dashNav && isStaff) {
      dashNav.setAttribute('href', 'staff.html');
      var span = dashNav.querySelector('span');
      if (span) span.textContent = 'My Workspace';
      var icon = dashNav.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-desktop';
    }

    // Hide or show admin-only navigation
    var adminOnlyNavs = document.querySelectorAll('.admin-only-nav, #navItemStaffMgmt, #navItemSettings');
    adminOnlyNavs.forEach(function (el) {
      el.style.display = isStaff ? 'none' : 'flex';
    });
  }

  /**
   * Ensures all required operational items are present and sets active class
   */
  function syncSidebarNavigation() {
    var menu = document.querySelector('.portal-sidebar .sidebar-menu') || document.querySelector('.sidebar-nav');
    if (!menu) return;

    var currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

    // Normalize nav links to include both nav-link and nav-link-item classes
    var links = menu.querySelectorAll('a');
    links.forEach(function (a) {
      if (!a.classList.contains('nav-link')) a.classList.add('nav-link');
      if (!a.classList.contains('nav-link-item')) a.classList.add('nav-link-item');

      var href = a.getAttribute('href') || '';
      var cleanHref = href.split('?')[0].split('#')[0];

      // Highlight active link
      if (cleanHref === currentPath || (currentPath === '' && cleanHref === 'dashboard.html')) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  /**
   * Mobile Toggle & Collapsed State Handling
   */
  function initSidebarControls() {
    var sidebar = document.getElementById('portalSidebar') || document.querySelector('.portal-sidebar');
    var triggers = [
      document.getElementById('sidebarToggleBtn'),
      document.getElementById('mobileMenuTrigger'),
      document.querySelector('.mobile-menu-trigger')
    ];

    triggers.forEach(function (btn) {
      if (!btn || !sidebar) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (window.innerWidth <= 992) {
          sidebar.classList.toggle('mobile-open');
        } else {
          sidebar.classList.toggle('collapsed');
          try {
            localStorage.setItem('dmc_sidebar_collapsed', sidebar.classList.contains('collapsed'));
          } catch (err) {}
        }
      });
    });

    // Close mobile drawer on outside click
    document.addEventListener('click', function (e) {
      if (!sidebar) return;
      if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target)) {
        var clickedTrigger = triggers.some(function (btn) { return btn && btn.contains(e.target); });
        if (!clickedTrigger) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Restore collapsed state on desktop
    try {
      if (sidebar && window.innerWidth > 992 && localStorage.getItem('dmc_sidebar_collapsed') === 'true') {
        sidebar.classList.add('collapsed');
      }
    } catch (e) {}
  }

  function initPortalTheme() {
    // Inject mobile overlay styles if not present
    if (!document.getElementById('portal-mobile-overrides')) {
      var style = document.createElement('style');
      style.id = 'portal-mobile-overrides';
      style.textContent = `
        @media (max-width: 992px) {
          .portal-sidebar {
            position: fixed !important;
            top: 0; bottom: 0; left: -280px;
            width: 260px !important;
            z-index: 9999 !important;
            transition: left 0.3s ease !important;
          }
          .portal-sidebar.mobile-open {
            left: 0 !important;
            box-shadow: 0 0 40px rgba(0,0,0,0.5) !important;
          }
          .portal-main {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .mobile-menu-trigger {
            display: inline-flex !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

})();
