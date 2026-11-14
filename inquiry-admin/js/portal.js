hahiy/**
 * portal.js — Master SaaS Portal Layout, Role Controller & Security Enforcer
 * Let's Explore DMC Luxury ERP Portal
 * 
 * STRICT ROLE SEPARATION:
 * - ADMIN (Sir / Owner): Oversight, Revenue KPIs, Employee Tracking, CMS, Settings.
 *   Admin NEVER times out. Admin NEVER enters operational queues like normal staff.
 * - STAFF / SUB-USERS (Kashish, Asmita, Chanchal): Daily operations,
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
        document.querySelector('.mobile-menu-trigger'),
        document.querySelector('.sidebar-toggle-btn')
      ];

      // Create backdrop overlay if not present
      var backdrop = document.getElementById('portalSidebarBackdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'portalSidebarBackdrop';
        backdrop.className = 'portal-sidebar-backdrop';
        document.body.appendChild(backdrop);
      }

      function toggleMobileDrawer(open) {
        if (!sidebar) return;
        var isOpen = typeof open === 'boolean' ? open : !sidebar.classList.contains('mobile-open');
        if (isOpen) {
          sidebar.classList.add('mobile-open', 'open', 'active');
          if (backdrop) backdrop.classList.add('active');
          document.body.style.overflow = 'hidden';
        } else {
          sidebar.classList.remove('mobile-open', 'open', 'active');
          if (backdrop) backdrop.classList.remove('active');
          document.body.style.overflow = '';
        }
      }

      triggers.forEach(function (btn) {
        if (!btn) return;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (window.innerWidth <= 992) {
            toggleMobileDrawer();
          } else {
            if (sidebar) {
              sidebar.classList.toggle('collapsed');
              try {
                localStorage.setItem('dmc_sidebar_collapsed', sidebar.classList.contains('collapsed'));
              } catch (err) { }
            }
          }
        });
      });

      // Close on backdrop tap
      if (backdrop) {
        backdrop.addEventListener('click', function (e) {
          e.preventDefault();
          toggleMobileDrawer(false);
        });
      }

      // Add mobile close 'X' button to sidebar header if not present
      if (sidebar) {
        var header = sidebar.querySelector('.sidebar-header');
        if (header && !header.querySelector('.sidebar-close-btn')) {
          var closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'sidebar-close-btn';
          closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
          closeBtn.title = 'Close Navigation Menu';
          closeBtn.setAttribute('aria-label', 'Close Navigation Menu');
          closeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileDrawer(false);
          });
          header.appendChild(closeBtn);
        }

        // Close drawer when any navigation link inside sidebar is tapped on mobile
        var navLinks = sidebar.querySelectorAll('.nav-link, .sidebar-brand, .sidebar-logout-wrap a');
        navLinks.forEach(function (link) {
          link.addEventListener('click', function () {
            if (window.innerWidth <= 992) {
              toggleMobileDrawer(false);
            }
          });
        });
      }

      // Close mobile drawer on ESC key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar && (sidebar.classList.contains('mobile-open') || sidebar.classList.contains('open'))) {
          toggleMobileDrawer(false);
        }
      });

      // Automatically safeguard any bare tables in main content
      try {
        var tables = document.querySelectorAll('.portal-main table, .portal-content table, .content-body table');
        tables.forEach(function (tbl) {
          var parent = tbl.parentElement;
          if (parent && !parent.classList.contains('table-responsive') && !parent.classList.contains('table-container') && !parent.style.overflowX) {
            var wrap = document.createElement('div');
            wrap.className = 'table-responsive';
            wrap.style.cssText = 'width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom:12px; border-radius:10px;';
            parent.insertBefore(wrap, tbl);
            wrap.appendChild(tbl);
          }
        });
      } catch (err) { }

      // Restore desktop collapsed state
      try {
        if (sidebar && window.innerWidth > 992 && localStorage.getItem('dmc_sidebar_collapsed') === 'true') {
          sidebar.classList.add('collapsed');
        }
      } catch (e) { }
    }

    function initPortalTheme() {
      // Inject mobile overlay styles if not present
      if (!document.getElementById('portal-mobile-overrides')) {
        var style = document.createElement('style');
        style.id = 'portal-mobile-overrides';
        style.textContent = `
        /* Mobile Backdrop */
        .portal-sidebar-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 9998;
          opacity: 0;
          transition: opacity 0.28s ease;
          pointer-events: none;
        }
        .portal-sidebar-backdrop.active {
          display: block;
          opacity: 1;
          pointer-events: auto;
        }

        /* Sidebar Close Button */
        .sidebar-close-btn {
          display: none;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
        }

        @media (max-width: 992px) {
          .sidebar-close-btn {
            display: inline-flex !important;
          }
          .portal-wrapper,
          .portal-layout {
            display: block !important;
            width: 100% !important;
            max-width: 100vw !important;
            min-height: 100vh !important;
            overflow-x: hidden !important;
          }
          .portal-sidebar {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: -290px !important;
            width: 275px !important;
            max-width: 85vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
            background: #0F172A !important;
            transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            box-shadow: none !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .portal-sidebar.mobile-open,
          .portal-sidebar.open,
          .portal-sidebar.active {
            left: 0 !important;
            box-shadow: 0 0 50px rgba(0,0,0,0.6) !important;
          }
          .portal-main {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
            min-width: 0 !important;
          }
          .mobile-menu-trigger,
          .sidebar-toggle-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 40px !important;
            height: 40px !important;
            border-radius: 9px !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }

        /* Responsive Tables for zero distortion on mobile */
        @media (max-width: 768px) {
          .table-responsive,
          .table-container,
          .portal-table-wrapper,
          .portal-table-wrap,
          div[style*="overflow-x:auto"],
          div[style*="overflow-x: auto"] {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            border-radius: 10px !important;
            margin-bottom: 12px !important;
            display: block !important;
          }
          .portal-table,
          .custom-table,
          .activity-table,
          #leadsTable,
          #invoicesTable,
          #customersTable,
          #suppliersTable,
          #tripsTable,
          div[style*="overflow-x:auto"] > table,
          div[style*="overflow-x: auto"] > table {
            min-width: 660px !important;
            width: 100% !important;
          }
          .portal-table th,
          .portal-table td,
          .custom-table th,
          .custom-table td,
          .activity-table th,
          .activity-table td {
            white-space: nowrap !important;
            padding: 10px 12px !important;
            font-size: 12px !important;
          }
        }
      `;
        document.head.appendChild(style);
      }
    }

  })();
