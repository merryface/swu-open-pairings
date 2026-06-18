/**
 * Admin Pairings module
 * Handles saving new pairings and participant swapping
 */

(function() {
  const AdminPairings = {
    swappedMatches: new Map(), // Track swaps: "round-idx:match-idx" -> {player1, player2}

    async init() {
      // Check authentication
      if (!window.SWU?.Auth?.isAuthenticated?.()) {
        window.location.href = 'login.html';
        return;
      }

      this.setupSaveButton();
      this.setupManualButton();
      this.setupResultsObserver();
    },

    setupResultsObserver() {
      // Watch for changes to results section and setup swapping on new pairings
      const resultsEl = document.getElementById('results');
      if (!resultsEl) return;

      // Setup initial listeners
      this.setupParticipantSwapping();

      // Watch for DOM changes (when new pairings are generated)
      const observer = new MutationObserver(() => {
        this.setupParticipantSwapping();
      });

      observer.observe(resultsEl, {
        childList: true,
        subtree: true,
      });
    },

    setupParticipantSwapping() {
      const resultsEl = document.getElementById('results');
      if (!resultsEl) return;

      // Remove old listeners and re-attach
      const matchItems = resultsEl.querySelectorAll('.match-item');
      
      matchItems.forEach((item) => {
        // Skip if already has listener (check for data attribute)
        if (item.dataset.swapListenerAttached === 'true') return;

        item.addEventListener('click', (e) => {
          // Only respond to clicks on player names (text nodes or spans containing names)
          const clickedEl = e.target;
          if (!clickedEl || clickedEl.classList?.contains('swap-dropdown')) return;

          this.showPlayerDropdown(item);
        });

        item.dataset.swapListenerAttached = 'true';
      });
    },

    showPlayerDropdown(matchItem) {
      // Close any existing dropdowns
      document.querySelectorAll('.swap-dropdown').forEach(d => d.remove());

      const matchText = matchItem.textContent;
      const isBye = matchText.includes(': BYE');
      const [player1, player2] = matchText.includes('vs') 
        ? matchText.split(/\s+vs\s+/i).map(p => p.trim())
        : [matchText.replace(/:\s*BYE$/i, '').trim(), ''];

      // Get all unique players from the entire pairing
      const resultsEl = document.getElementById('results');
      const allMatchItems = resultsEl.querySelectorAll('.match-item');
      const allPlayers = new Set();

      allMatchItems.forEach((item) => {
        const text = item.textContent;
        if (text.includes('vs')) {
          text.split(/\s+vs\s+/i).forEach(p => allPlayers.add(p.trim()));
        } else if (!text.includes(': BYE')) {
          // Don't add the "BYE" text itself
          const playerName = text.replace(/:\s*BYE$/i, '').trim();
          if (playerName && playerName !== 'BYE') {
            allPlayers.add(playerName);
          }
        }
      });

      // Create dropdown
      const dropdown = document.createElement('div');
      dropdown.className = 'swap-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        background: var(--bg);
        border: 1px solid var(--accent);
        border-radius: 4px;
        z-index: 1000;
        min-width: 150px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      `;

      // Sort players and create options
      const sortedPlayers = Array.from(allPlayers).sort();
      
      sortedPlayers.forEach((player) => {
        // Don't allow swapping with same player or BYE
        if (player === player1 || player === 'BYE') return;

        const option = document.createElement('div');
        option.textContent = `Swap with ${player}`;
        option.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          color: var(--muted);
          border-bottom: 1px solid rgba(255,232,31,0.1);
          transition: background-color 0.2s;
        `;

        option.addEventListener('mouseenter', () => {
          option.style.backgroundColor = 'rgba(255,232,31,0.2)';
        });

        option.addEventListener('mouseleave', () => {
          option.style.backgroundColor = 'transparent';
        });

        option.addEventListener('click', () => {
          this.swapPlayers(matchItem, player1, player);
          dropdown.remove();
        });

        dropdown.appendChild(option);
      });

      // Position dropdown near the match item
      document.body.appendChild(dropdown);
      const rect = matchItem.getBoundingClientRect();
      dropdown.style.left = (rect.left + window.scrollX) + 'px';
      dropdown.style.top = (rect.bottom + window.scrollY + 4) + 'px';

      // Close on outside click
      const closeListener = (e) => {
        if (!dropdown.contains(e.target) && !matchItem.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeListener);
        }
      };

      document.addEventListener('click', closeListener);
    },

    swapPlayers(matchItem, currentPlayer, newPlayer) {
      // Find all match items and swap the player globally
      const resultsEl = document.getElementById('results');
      const allMatchItems = resultsEl.querySelectorAll('.match-item');

      let foundCurrentSwap = false;
      let foundNewSwap = false;

      allMatchItems.forEach((item) => {
        const text = item.textContent;

        // Find match containing currentPlayer
        if (!foundCurrentSwap && text.includes(currentPlayer)) {
          const parts = text.includes('vs')
            ? text.split(/\s+vs\s+/i).map(p => p.trim())
            : [text.trim(), ''];

          if (parts[0] === currentPlayer) {
            foundCurrentSwap = true;
            // Update to newPlayer
            item.textContent = newPlayer + ' vs ' + parts[1];
          } else if (parts[1] === currentPlayer) {
            foundCurrentSwap = true;
            item.textContent = parts[0] + ' vs ' + newPlayer;
          }
        }

        // Find match containing newPlayer and swap back
        if (foundCurrentSwap && !foundNewSwap && text.includes(newPlayer)) {
          const parts = text.includes('vs')
            ? text.split(/\s+vs\s+/i).map(p => p.trim())
            : [text.trim(), ''];

          if (parts[0] === newPlayer && parts[0] !== matchItem.textContent.split(/\s+vs\s+/i)[0]) {
            foundNewSwap = true;
            item.textContent = currentPlayer + ' vs ' + parts[1];
          } else if (parts[1] === newPlayer && parts[1] !== matchItem.textContent.split(/\s+vs\s+/i)[1]) {
            foundNewSwap = true;
            item.textContent = parts[0] + ' vs ' + currentPlayer;
          }
        }
      });

      // Update plain text output if it exists
      this.updatePlainOutput();
    },

    updatePlainOutput() {
      // Regenerate plain text output after swaps
      const plainOut = document.getElementById('plainOut');
      if (!plainOut) return;

      const resultsEl = document.getElementById('results');
      const roundBoxes = resultsEl.querySelectorAll('.round-box');
      let output = '';

      roundBoxes.forEach((roundBox) => {
        const roundTitle = roundBox.querySelector('.round-title')?.textContent || '';
        output += roundTitle + '\n';

        const matchItems = roundBox.querySelectorAll('.match-item');
        matchItems.forEach((item) => {
          output += item.textContent + '\n';
        });

        output += '\n';
      });

      plainOut.textContent = output;
    },

    setupSaveButton() {
      const saveBtn = document.getElementById('save');
      const saveTopBtn = document.getElementById('save-top');
      const statusEl = document.getElementById('save-status');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.handleSave());
      }

      if (saveTopBtn) {
        saveTopBtn.addEventListener('click', () => this.handleSave());
      }
    },

    setupManualButton() {
      const manualBtn = document.getElementById('manual');
      const manualPanel = document.getElementById('manualPairingsPanel');
      const manualClose = document.getElementById('manual-pairings-close');
      const manualLoad = document.getElementById('manual-pairings-load');

      if (manualBtn) {
        manualBtn.addEventListener('click', () => {
          if (manualPanel) {
            manualPanel.hidden = false;
          }
        });
      }

      if (manualClose) {
        manualClose.addEventListener('click', () => {
          if (manualPanel) {
            manualPanel.hidden = true;
          }
        });
      }

      // Close on backdrop click
      if (manualPanel) {
        manualPanel.addEventListener('click', (e) => {
          if (e.target === manualPanel) {
            manualPanel.hidden = true;
          }
        });
      }

      if (manualLoad) {
        manualLoad.addEventListener('click', () => this.handleManualLoad());
      }
    },

    handleManualLoad() {
      const manualInput = document.getElementById('manual-pairings-input');
      const errorEl = document.getElementById('manual-pairings-error');
      
      if (!manualInput?.value.trim()) {
        errorEl.textContent = 'Please paste pairings text';
        errorEl.hidden = false;
        return;
      }

      try {
        errorEl.hidden = true;
        
        // Call the manual pairings parser from UI.js
        if (window.SWU?.UI?.parseManualPairings) {
          window.SWU.UI.parseManualPairings(manualInput.value);
          
          // Close the panel
          const manualPanel = document.getElementById('manualPairingsPanel');
          if (manualPanel) {
            manualPanel.hidden = true;
          }
          
          manualInput.value = '';
        }
      } catch (error) {
        errorEl.textContent = `Error: ${error.message}`;
        errorEl.hidden = false;
      }
    },

    async handleSave() {
      const titleInput = document.getElementById('pairing-title');
      const resultsEl = document.getElementById('results');
      const statusEl = document.getElementById('save-status');

      if (!titleInput?.value.trim()) {
        statusEl.textContent = 'Error: Please enter a title';
        statusEl.hidden = false;
        return;
      }

      // Extract pairing data from the rendered results
      const pairingData = this.extractPairingData();

      if (!pairingData.rounds || pairingData.rounds.length === 0) {
        statusEl.textContent = 'Error: No pairings generated. Please generate pairings first.';
        statusEl.hidden = false;
        return;
      }

      // Add name (API expects "name", not "title")
      pairingData.name = titleInput.value.trim();
      pairingData.winner_selections = [];
      pairingData.is_published = true;

      try {
        statusEl.textContent = 'Saving...';
        statusEl.hidden = false;

        const url = window.SWU?.Auth?.apiUrl('/api/pairings') || 'http://127.0.0.1:3000/api/pairings';

        const response = await window.SWU.Auth.authFetch(url, {
          method: 'POST',
          body: JSON.stringify(pairingData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Save failed');
        }
        statusEl.textContent = 'Pairings saved successfully!';
        statusEl.style.color = 'var(--accent)';

        // Redirect to the pairing after a short delay
        setTimeout(() => {
          if (result.data?.id) {
            window.location.href = `pairings.html?id=${result.data.id}`;
          } else {
            window.location.href = 'index.html';
          }
        }, 1000);

      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = '#ff6b6b';
        statusEl.hidden = false;
      }
    },

    extractPairingData() {
      // Get the pairings data directly from UI module instead of parsing HTML
      let pairings = null;
      
      // Try UI module first - this is populated when Generate is clicked
      if (window.SWU?.UI?.getCurrentPairings) {
        pairings = window.SWU.UI.getCurrentPairings();
      }
      
      // No fallback to localStorage - admin-pairings starts fresh each time
      if (!pairings) {
        return { rounds: [] };
      }

      // Convert to API format
      const rounds = [];
      
      pairings.forEach((round, roundIdx) => {
        const matches = [];
        
        round.matches?.forEach(match => {
          // Handle both UI format (player1/player2) and API format (home/away)
          const home = (match.home || match.player1 || '').trim();
          const isBye = match.bye === true;
          
          // For bye matches, away is empty; for regular matches, use player2/away
          const away = isBye ? '' : (match.away || match.player2 || '').trim();
          
          matches.push({
            home,
            away,
          });
        });

        rounds.push({
          round: roundIdx + 1,
          matches,
        });
      });

      return { rounds };
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminPairings.init());
  } else {
    AdminPairings.init();
  }

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.AdminPairings = AdminPairings;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPairings;
  }
})();
