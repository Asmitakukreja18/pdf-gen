/**
 * portal.js — Master SaaS Portal Layout, Role Controller & Security Enforcer
 * Let's Explore DMC Luxury ERP Portal
 * 
 * STRICT ROLE SEPARATION:
 * - ADMIN (Sir / Owner): Oversight, Revenue KPIs, Employee Tracking, CMS, Settings.
 *   Admin NEVER times out. Admin NEVER enters operational queues like normal staff.
 * - STAFF / SUB-USERS (Chanchal SU-1, Ritesh SU-2, Operations SU-3): Daily operations,
 *   leads, AI quote generation, vouchers, suppliers, trips.
 *   Staff NEVER sees Admin Dashboard, Company Revenue, Staff Tracking, or System Settings.
 *   Staff has mandatory 15-min idle lock with OTP.
 */

(function () {
  'use strict';

  // 1. IMMEDIATE PAGE-LEVEL ROLE ENFORCEMENT BEFORE DOM RENDERS
  enforcePageAccessRules();

  document.addEventListener('DOMContentLoaded', () => {
    initPortalTheme();
    syncUserIdentity();
    renderRoleSpecificSidebar();
    initSidebarControls();
  });

  /**
   * Prevents Staff from accessing Admin pages, and redirects Admin to Executive Dashboard
   */
  function enforcePageAccessRules() {
    var storedUser = null;
    try {
      var raw = localStorage.getItem('dmc_user');
      if (raw) storedUser = JSON.parse(raw);
    } catch (e) {
      storedUser = null;
    }

    var role = (storedUser && storedUser.role) || localStorage.getItem('dmc_role') || '';
    role = role.toLowerCase();
    var isStaff = (role === 'staff' || role === 'user' || role === 'executive' || role === 'agent');
    var isAdmin = (role === 'admin' || role === 'superadmin' || role === 'owner');

    var currentFile = window.location.pathname.split('/').pop().toLowerCase();
    if (!currentFile || currentFile === '') currentFile = 'index.html';

    var adminOnlyPages = ['dashboard.html', 'members.html', 'settings.html', 'analytics.html', 'website.html'];

    // If Staff attempts to visit Admin-only monitoring/settings pages:
    if (isStaff && adminOnlyPages.indexOf(currentFile) !== -1) {
      console.warn('[Security] Staff user blocked from Admin page:', currentFile);
      window.location.replace('staff.html');
      return;
    }

    // If Admin attempts to visit Staff-only operational workspace:
    if (isAdmin && currentFile === 'staff.html') {
      window.location.replace('dashboard.html');
      return;
    }
  }

  /**
   * Reads authenticated user from localStorage and hydrates topbar
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
        if (storedUser && storedUser.name) {
          el.textContent = storedUser.name;
        } else {
          el.textContent = isStaff ? 'Staff Executive' : 'Sir / Owner (Admin)';
        }
      }
    });

    var roleEls = [
      document.getElementById('topbarUserRole'),
      document.getElementById('userRole')
    ];
    roleEls.forEach(function (el) {
      if (el) {
        el.textContent = isStaff ? 'Operations Desk (Sub-User)' : 'Super Administrator (Owner)';
      }
    });

    var welcomeName = document.getElementById('welcomeUserName');
    if (welcomeName) {
      welcomeName.textContent = (storedUser && storedUser.name) ? storedUser.name.split(' ')[0] : (isStaff ? 'Executive' : 'Sir');
    }

    // Set brand link according to role
    var brandLink = document.getElementById('sidebarBrandLink') || document.querySelector('.sidebar-brand');
    if (brandLink) {
      brandLink.setAttribute('href', isStaff ? 'staff.html' : 'dashboard.html');
    }
  }

  /**
   * Renders strictly separated sidebar navigation depending on whether user is ADMIN or STAFF
   */
  function renderRoleSpecificSidebar() {
    var menu = document.querySelector('.portal-sidebar .sidebar-menu') || document.querySelector('.sidebar-nav');
    if (!menu) return;

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
    var currentPath = window.location.pathname.split('/').pop().toLowerCase() || (isStaff ? 'staff.html' : 'dashboard.html');

    if (isStaff) {
      // =========================================================================
      // STAFF OPERATIONAL SIDEBAR — DAILY WORKING ACCOUNT (NO ADMIN MONITORING)
      // =========================================================================
      menu.innerHTML = `
        <div class="nav-group-title" style="font-size:10.5px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.08em; padding:8px 16px 4px;">My Daily Desk</div>
        <a href="staff.html" class="nav-link nav-link-item ${currentPath === 'staff.html' ? 'active' : ''}">
          <i class="fa-solid fa-desktop"></i>
          <span>My Workspace</span>
        </a>
        <a href="leads.html?role=staff" class="nav-link nav-link-item ${currentPath === 'leads.html' ? 'active' : ''}">
          <i class="fa-solid fa-inbox"></i>
          <span>My Assigned Leads</span>
        </a>
        <a href="customers.html?role=staff" class="nav-link nav-link-item ${currentPath === 'customers.html' ? 'active' : ''}">
          <i class="fa-solid fa-user-group"></i>
          <span>Customers Directory</span>
        </a>
        <a href="ai-assistant.html?role=staff" class="nav-link nav-link-item ${currentPath === 'ai-assistant.html' ? 'active' : ''}">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>AI Quotation Studio</span>
        </a>

        <div class="nav-group-title" style="font-size:10.5px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.08em; padding:12px 16px 4px;">Travel Operations</div>
        <a href="packages.html?role=staff" class="nav-link nav-link-item ${currentPath === 'packages.html' ? 'active' : ''}">
          <i class="fa-solid fa-box-open"></i>
          <span>Tour Packages</span>
        </a>
        <a href="trips.html?role=staff" class="nav-link nav-link-item ${currentPath === 'trips.html' ? 'active' : ''}">
          <i class="fa-solid fa-location-dot"></i>
          <span>Running Trips</span>
        </a>
        <a href="suppliers.html?role=staff" class="nav-link nav-link-item ${currentPath === 'suppliers.html' ? 'active' : ''}">
          <i class="fa-solid fa-handshake"></i>
          <span>Suppliers Directory</span>
        </a>
        <a href="invoices.html?role=staff" class="nav-link nav-link-item ${currentPath === 'invoices.html' ? 'active' : ''}">
          <i class="fa-solid fa-file-invoice-dollar"></i>
          <span>Invoices &amp; Vouchers</span>
        </a>
        <a href="documents.html?role=staff" class="nav-link nav-link-item ${currentPath === 'documents.html' ? 'active' : ''}">
          <i class="fa-solid fa-folder-open"></i>
          <span>Documents &amp; PDFs</span>
        </a>
      `;
    } else {
      // =========================================================================
      // ADMIN / OWNER (SIR) SIDEBAR — MONITORING & BUSINESS CONTROL (NO DAILY OPS QUEUES)
      // =========================================================================
      menu.innerHTML = `
        <div class="nav-group-title" style="font-size:10.5px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.08em; padding:8px 16px 4px;">Executive Control</div>
        <a href="dashboard.html" class="nav-link nav-link-item ${currentPath === 'dashboard.html' ? 'active' : ''}">
          <i class="fa-solid fa-house"></i>
          <span>Executive Dashboard</span>
        </a>
        <a href="members.html" class="nav-link nav-link-item ${currentPath === 'members.html' ? 'active' : ''}">
          <i class="fa-solid fa-id-card-clip"></i>
          <span>Staff Tracking &amp; Logs</span>
        </a>
        <a href="analytics.html" class="nav-link nav-link-item ${currentPath === 'analytics.html' ? 'active' : ''}">
          <i class="fa-solid fa-chart-pie"></i>
          <span>Reports &amp; Analytics</span>
        </a>
        <a href="website.html" class="nav-link nav-link-item ${currentPath === 'website.html' ? 'active' : ''}">
          <i class="fa-solid fa-globe"></i>
          <span>Website CMS</span>
        </a>
        <a href="settings.html" class="nav-link nav-link-item ${currentPath === 'settings.html' ? 'active' : ''}">
          <i class="fa-solid fa-gear"></i>
          <span>System &amp; AI Settings</span>
        </a>

        <div class="nav-group-title" style="font-size:10.5px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.08em; padding:12px 16px 4px;">Business Oversight</div>
        <a href="leads.html" class="nav-link nav-link-item ${currentPath === 'leads.html' ? 'active' : ''}">
          <i class="fa-solid fa-inbox"></i>
          <span>All Leads &amp; Inquiries</span>
        </a>
        <a href="customers.html" class="nav-link nav-link-item ${currentPath === 'customers.html' ? 'active' : ''}">
          <i class="fa-solid fa-user-group"></i>
          <span>Customers &amp; Agents</span>
        </a>
        <a href="ai-assistant.html" class="nav-link nav-link-item ${currentPath === 'ai-assistant.html' ? 'active' : ''}">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>AI Quotation Studio</span>
        </a>
        <a href="packages.html" class="nav-link nav-link-item ${currentPath === 'packages.html' ? 'active' : ''}">
          <i class="fa-solid fa-box-open"></i>
          <span>Tour Packages</span>
        </a>
        <a href="trips.html" class="nav-link nav-link-item ${currentPath === 'trips.html' ? 'active' : ''}">
          <i class="fa-solid fa-location-dot"></i>
          <span>Running Trips</span>
        </a>
        <a href="suppliers.html" class="nav-link nav-link-item ${currentPath === 'suppliers.html' ? 'active' : ''}">
          <i class="fa-solid fa-handshake"></i>
          <span>Suppliers Directory</span>
        </a>
        <a href="invoices.html" class="nav-link nav-link-item ${currentPath === 'invoices.html' ? 'active' : ''}">
          <i class="fa-solid fa-file-invoice-dollar"></i>
          <span>Invoices &amp; Billing</span>
        </a>
        <a href="documents.html" class="nav-link nav-link-item ${currentPath === 'documents.html' ? 'active' : ''}">
          <i class="fa-solid fa-folder-open"></i>
          <span>Documents &amp; Proposals</span>
        </a>
      `;
    }
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
