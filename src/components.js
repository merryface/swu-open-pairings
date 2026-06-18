/**
 * Reusable HTML Components
 * Injects shared UI components (header, nav) to reduce duplication
 */

(function() {
  const Components = {
    /**
     * Inject the shared header with navigation menu
     * Inserts at the beginning of .container
     */
    injectHeader() {
      const container = document.querySelector('.container');
      if (!container) {
        console.warn('[Components] Container not found');
        return;
      }

      // Check if header already injected (avoid duplicates)
      if (container.querySelector('.top-actions')) {
        console.log('[Components] Header already present, skipping injection');
        return;
      }

      const headerHTML = `
        <!-- Shared Header Component -->
        <div class="top-actions">
          <button id="menu-toggle" class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-panel" aria-label="Open menu">
            ☰
          </button>
          <button id="logout-btn" class="reset-btn" type="button" hidden style="margin-left: auto;">Log Out</button>
        </div>

        <nav id="menu-panel" class="menu-panel" hidden>
          <a href="index.html" class="menu-item" data-public>Home</a>
          <a href="admin-pairings.html" class="menu-item" data-admin-only hidden>New Pairings</a>
          <a href="login.html" class="menu-item" data-logged-off hidden>Log In</a>
        </nav>
      `;

      // Create a temporary container to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = headerHTML.trim();

      // Insert all elements at the start of container
      while (temp.firstChild) {
        container.insertBefore(temp.firstChild, container.firstChild);
      }

      console.log('[Components] Header injected successfully');
    }
  };

  // Auto-inject on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Components.injectHeader();
    });
  } else {
    // DOM already loaded
    Components.injectHeader();
  }

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.Components = Components;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Components;
  }
})();
