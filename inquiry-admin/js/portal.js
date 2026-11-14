/**
 * portal.js — Master SaaS Portal Layout, Role Controller & Security Enforcer
 * Let's Explore DMC Luxury ERP Portal
 * 
 * STRICT ROLE SEPARATION:
 * - ADMIN: Complete visibility & management (Dashboard, Analytics, CMS, Staff Tracking, Settings, + all operational modules).
 * - STAFF (Asmita, Kashish, Chanchal): Pure operational desk (My Workspace, Leads, Customers, AI Studio, Packages, Trips, Suppliers, Invoices, Documents).
 *   Staff is strictly forbidden from Admin Dashboard, Staff Tracking, CMS, Analytics, and Settings.
 */

(function () {
  'use strict';

  // 1. Immediate page access control before DOM finishes rendering
  enforcePageAccessRules();

  // Expose global mobile sidebar toggle so ANY button or inline onclick works instantly
  window.toggleDmcMobileSidebar = function (open) {
    var sidebar = document.getElementById('portalSidebar') || document.querySelector('.portal-sidebar');
    var backdrop = document.getElementById('portalSidebarBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'portalSidebarBackdrop';
      backdrop.className = 'portal-sidebar-backdrop';
      backdrop.addEventListener('click', function (e) {
        e.preventDefault();
        window.toggleDmcMobileSidebar(false);
      });
      document.body.appendChild(backdrop);
    }
    if (!sidebar) return;
    var isOpen = typeof open === 'boolean' ? open : !sidebar.classList.contains('mobile-open');
    if (isOpen) {
      sidebar.classList.add('mobile-open', 'open', 'active');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.remove('mobile-open', 'open', 'active');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  function bootPortal() {
    initPortalTheme();
    syncUserIdentity();
    highlightActiveSidebarLink();
    initSidebarControls();
    syncPublicSiteLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPortal);
  } else {
    bootPortal();
  }

  /**
   * Automatically normalizes all Public Site links to official live URL
   */
  function syncPublicSiteLinks() {
    try {
      var links = document.querySelectorAll('a[href*="website/index.html"], a[title*="Public Website"], a[title*="Public Site"]');
      links.forEach(function (a) {
        a.setAttribute('href', 'https://letsexploredmc.com/');
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
    } catch(e) {}
  }

  /**
   * Sanitizes user session and blocks Staff from accessing Admin pages
   */
  function enforcePageAccessRules() {
    var storedUser = null;
    try {
      var raw = localStorage.getItem('dmc_user');
      if (raw) storedUser = JSON.parse(raw);
    } catch (e) {
      storedUser = null;
    }

    var params = new URLSearchParams(window.location.search);
    var urlRole = (params.get('role') || '').toLowerCase();

    // Auto-sanitize legacy or placeholder names from localStorage
    if (storedUser) {
      if (!storedUser.name || storedUser.name === 'Admin User' || storedUser.username === 'admin') {
        if (storedUser.username === 'admin' || !storedUser.username) {
          storedUser.name = "Let's Explore DMC";
          storedUser.role = "admin";
        }
      }
      if (storedUser.username === 'asmita') {
        storedUser.name = "Asmita Kukreja";
        storedUser.role = "executive";
      } else if (storedUser.username === 'kashish') {
        storedUser.name = "Kashish Adwani";
        storedUser.role = "executive";
      } else if (storedUser.username === 'chanchal') {
        storedUser.name = "Chanchal Sharma";
        storedUser.role = "executive";
      }
      try {
        localStorage.setItem('dmc_user', JSON.stringify(storedUser));
        localStorage.setItem('dmc_role', storedUser.role || 'admin');
      } catch (err) {}
    }

    var role = (urlRole || (storedUser && storedUser.role) || localStorage.getItem('dmc_role') || 'admin').toLowerCase();
    var isStaff = (role === 'staff' || role === 'user' || role === 'executive' || role === 'agent');

    // Instantly tag <html> for CSS zero-flicker visibility
    if (isStaff) {
      document.documentElement.classList.remove('is-admin');
      document.documentElement.classList.add('is-staff');
    } else {
      document.documentElement.classList.remove('is-staff');
      document.documentElement.classList.add('is-admin');
    }

    // Hard JavaScript DOM enforcement for zero sidebar leakage
    if (isStaff) {
      var hideTimer = setInterval(function() {
        var adminLinks = document.querySelectorAll('.admin-only-nav, a[href="website.html"], a[href="analytics.html"], a[href="members.html"], a[href="settings.html"]');
        adminLinks.forEach(function(el) {
          el.style.setProperty('display', 'none', 'important');
        });
        var staffLinks = document.querySelectorAll('.staff-only-nav');
        staffLinks.forEach(function(el) {
          el.style.setProperty('display', 'flex', 'important');
        });
      }, 50);
      setTimeout(function() { clearInterval(hideTimer); }, 1500);
    }

    var currentFile = window.location.pathname.split('/').pop().toLowerCase();
    if (!currentFile || currentFile === '') currentFile = 'dashboard.html';

    var adminOnlyPages = ['dashboard.html', 'members.html', 'settings.html', 'analytics.html', 'website.html'];

    // Route Guard: If Staff attempts to visit Admin-only management pages:
    if (isStaff && adminOnlyPages.indexOf(currentFile) !== -1) {
      console.warn('[Security] Staff user redirected from Admin page:', currentFile);
      window.location.replace('staff.html');
      return;
    }
  }

  /**
   * Reads authenticated user from localStorage and hydrates topbar & brand links
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
    var username = (storedUser && storedUser.username) ? storedUser.username.toLowerCase() : (isStaff ? 'asmita' : 'admin');

    var displayName = "Let's Explore DMC";
    var displayRole = "Super Administrator";
    var avatarInitials = "LE";

    if (username === 'asmita' || (storedUser && storedUser.name && storedUser.name.toLowerCase().includes('asmita'))) {
      displayName = "Asmita Kukreja";
      displayRole = "Travel Executive";
      avatarInitials = "AK";
    } else if (username === 'kashish' || (storedUser && storedUser.name && storedUser.name.toLowerCase().includes('kashish'))) {
      displayName = "Kashish Adwani";
      displayRole = "Senior Travel Specialist";
      avatarInitials = "KA";
    } else if (username === 'chanchal' || (storedUser && storedUser.name && storedUser.name.toLowerCase().includes('chanchal'))) {
      displayName = "Chanchal Sharma";
      displayRole = "Operations Executive";
      avatarInitials = "CS";
    } else if (isStaff) {
      displayName = (storedUser && storedUser.name) ? storedUser.name : "Operations Executive";
      displayRole = "Operations Desk";
      avatarInitials = displayName.split(' ').map(function(n){ return n[0]; }).join('').substring(0, 2).toUpperCase() || "ST";
    }

    // Hydrate Topbar Avatar
    var avatarEls = [
      document.getElementById('topbarAvatar'),
      document.getElementById('userAvatar')
    ];
    avatarEls.forEach(function (el) {
      if (el) el.textContent = avatarInitials;
    });

    // Hydrate Topbar User Name
    var nameEls = [
      document.getElementById('topbarUserName'),
      document.getElementById('userName'),
      document.getElementById('userNameEl')
    ];
    nameEls.forEach(function (el) {
      if (el) el.textContent = displayName;
    });

    // Hydrate Topbar User Role
    var roleEls = [
      document.getElementById('topbarUserRole'),
      document.getElementById('userRole')
    ];
    roleEls.forEach(function (el) {
      if (el) el.textContent = displayRole;
    });

    var welcomeName = document.getElementById('welcomeUserName');
    if (welcomeName) {
      welcomeName.textContent = displayName.split(' ')[0];
    }

    // Brand logo link: Admin goes to dashboard.html, Staff goes to staff.html
    var brandLink = document.getElementById('sidebarBrandLink') || document.querySelector('.sidebar-brand');
    if (brandLink) {
      brandLink.setAttribute('href', isStaff ? 'staff.html' : 'dashboard.html');
    }
  }

  /**
   * Highlights the active link in the stable sidebar without rewriting innerHTML
   */
  function highlightActiveSidebarLink() {
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

    var currentFile = window.location.pathname.split('/').pop().toLowerCase();
    if (!currentFile || currentFile === '') {
      currentFile = isStaff ? 'staff.html' : 'dashboard.html';
    }

    // Clean active states and highlight exact current route
    var links = menu.querySelectorAll('a.nav-link');
    links.forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase();
      if (href === currentFile) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * Mobile Drawer & Collapsed State Handling
   */
  function initSidebarControls() {
    var sidebar = document.getElementById('portalSidebar') || document.querySelector('.portal-sidebar');
    var triggers = [
      document.getElementById('sidebarToggleBtn'),
      document.getElementById('mobileMenuTrigger'),
      document.querySelector('.mobile-menu-trigger'),
      document.querySelector('.sidebar-toggle-btn')
    ];

    // Backdrop overlay
    var backdrop = document.getElementById('portalSidebarBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'portalSidebarBackdrop';
      backdrop.className = 'portal-sidebar-backdrop';
      backdrop.addEventListener('click', function (e) {
        e.preventDefault();
        window.toggleDmcMobileSidebar(false);
      });
      document.body.appendChild(backdrop);
    }

    triggers.forEach(function (btn) {
      if (!btn) return;
      // Add direct onclick fallback to ensure mobile touch works
      btn.onclick = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (window.innerWidth <= 992) {
          window.toggleDmcMobileSidebar();
        } else {
          if (sidebar) {
            sidebar.classList.toggle('collapsed');
            try {
              localStorage.setItem('dmc_sidebar_collapsed', sidebar.classList.contains('collapsed'));
            } catch (err) { }
          }
        }
      };
    });

    if (sidebar) {
      var header = sidebar.querySelector('.sidebar-header');
      if (header && !header.querySelector('.sidebar-close-btn')) {
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'sidebar-close-btn';
        closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        closeBtn.title = 'Close Navigation Menu';
        closeBtn.setAttribute('aria-label', 'Close Navigation Menu');
        closeBtn.onclick = function (e) {
          if (e && e.preventDefault) e.preventDefault();
          window.toggleDmcMobileSidebar(false);
        };
        header.appendChild(closeBtn);
      }

      var navLinks = sidebar.querySelectorAll('.nav-link, .sidebar-brand, .sidebar-logout-wrap a');
      navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          if (window.innerWidth <= 992) {
            window.toggleDmcMobileSidebar(false);
          }
        });
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar && (sidebar.classList.contains('mobile-open') || sidebar.classList.contains('open'))) {
        window.toggleDmcMobileSidebar(false);
      }
    });

    // Safeguard bare tables
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
    if (!document.getElementById('portal-mobile-overrides')) {
      var style = document.createElement('style');
      style.id = 'portal-mobile-overrides';
      style.textContent = `
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
