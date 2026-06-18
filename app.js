if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (window.SWU?.UI?.initApp) {
      window.SWU.UI.initApp();
    }
  });
}
