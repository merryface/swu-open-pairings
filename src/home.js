/**
 * Home page logic for SWU Holonet Open
 * Displays saved pairings and admin actions
 */

(function() {
  const Home = {
    async init() {
      console.log('[Home] Initializing');
      
      // Update auth status
      const statusEl = document.getElementById('auth-status');
      if (statusEl && window.SWU?.Auth) {
        statusEl.textContent = window.SWU.Auth.isAuthenticated() ? 'logged on' : 'logged off';
      }

      // Show/hide admin actions
      const adminActions = document.getElementById('admin-actions');
      if (adminActions && window.SWU?.Auth) {
        adminActions.hidden = !window.SWU.Auth.isAuthenticated();
      }

      // Load pairings
      await this.loadPairings();
    },

    async loadPairings() {
      const pairingsList = document.getElementById('pairings-list');
      if (!pairingsList) return;

      try {
        const url = window.SWU?.Auth?.apiUrl('/api/pairings/summary') || 'http://127.0.0.1:3000/api/pairings/summary';
        console.log('[Home] Fetching from:', url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch pairings: ${response.status}`);

        const data = await response.json();
        console.log('[Home] API Response:', data);
        
        const pairings = data.data || data || [];
        console.log('[Home] Extracted pairings:', pairings);

        if (!Array.isArray(pairings) || pairings.length === 0) {
          pairingsList.innerHTML = '<p style="color: var(--muted);">No saved pairings yet.</p>';
          return;
        }

        // Sort by creation date, newest first
        pairings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        console.log('[Home] Sorted pairings:', pairings);

        // Create buttons for each pairing
        pairingsList.innerHTML = pairings.map(pairing => `
          <a href="pairings.html?id=${pairing.id}" class="pairing-link-btn">
            <span class="pairing-title">${window.SWU.Display.escapeHtml(pairing.name)}</span>
            <span class="pairing-meta">${pairing.is_published ? '✓ Published' : 'Draft'}</span>
          </a>
        `).join('');

      } catch (error) {
        console.error('[Home] Error loading pairings:', error);
        pairingsList.innerHTML = '<p style="color: #ff6b6b;">Error loading pairings.</p>';
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Home.init());
  } else {
    Home.init();
  }

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.Home = Home;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Home;
  }
})();
