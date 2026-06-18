if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    if (window.SWU?.Nav?.init) {
      window.SWU.Nav.init();
    }
    
    // Initialize UI
    if (window.SWU?.UI?.initApp) {
      window.SWU.UI.initApp();
    }
  });
}
