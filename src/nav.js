/**
 * Navigation component for SWU Holonet Open
 * Handles showing/hiding menu based on authentication status
 */

(function() {
  const Nav = {
    // Initialize navigation
    init() {
      console.log('[Nav] Initializing');
      const menuToggle = document.getElementById('menu-toggle');
      const menuPanel = document.getElementById('menu-panel');

      console.log('[Nav] Elements found:', { menuToggle: !!menuToggle, menuPanel: !!menuPanel });

      if (!menuToggle || !menuPanel) {
        console.error('[Nav] Menu elements not found');
        return;
      }

      // Toggle menu on button click
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[Nav] Burger clicked');
        const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', !isOpen);
        menuPanel.hidden = isOpen;
        console.log('[Nav] Menu toggled to:', !isOpen);
      });

      // Close menu when clicking a link
      const menuItems = menuPanel.querySelectorAll('a, button');
      menuItems.forEach(item => {
        item.addEventListener('click', () => {
          menuToggle.setAttribute('aria-expanded', 'false');
          menuPanel.hidden = true;
        });
      });

      // Hide menu if clicking outside
      document.addEventListener('click', (e) => {
        if (!menuPanel.contains(e.target) && !menuToggle.contains(e.target)) {
          menuToggle.setAttribute('aria-expanded', 'false');
          menuPanel.hidden = true;
        }
      });

      // Setup logout button
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          if (window.SWU?.Auth?.logout) {
            window.SWU.Auth.logout();
          }
        });
      }

      // Update menu visibility based on auth status
      this.updateMenuItems();
    },

    // Update menu items based on authentication
    updateMenuItems() {
      const menuPanel = document.getElementById('menu-panel');
      if (!menuPanel) return;

      const isAuthenticated = window.SWU?.Auth?.isAuthenticated() || false;
      const adminItems = menuPanel.querySelectorAll('[data-admin-only]');
      const publicItems = menuPanel.querySelectorAll('[data-public]');
      const loggedOffItems = menuPanel.querySelectorAll('[data-logged-off]');

      adminItems.forEach(item => {
        item.hidden = !isAuthenticated;
      });

      publicItems.forEach(item => {
        item.hidden = false;
      });

      loggedOffItems.forEach(item => {
        item.hidden = isAuthenticated;
      });

      // Update logout button visibility
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.hidden = !isAuthenticated;
      }
    },

    // Call this when auth state changes
    onAuthStateChange() {
      this.updateMenuItems();
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    console.log('[Nav] DOM still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Nav] DOMContentLoaded fired, calling init');
      Nav.init();
    });
  } else {
    console.log('[Nav] DOM already loaded, calling init immediately');
    Nav.init();
  }

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.Nav = Nav;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Nav;
  }
})();
