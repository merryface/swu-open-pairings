/**
 * Pairings display module
 * Fetches and displays a specific pairing by ID
 */

(function() {
  const PairingsDisplay = {
    currentPairingId: null,
    currentPairingData: null,
    currentPlayerFilter: 'all',
    changedMatches: new Set(),

    async init() {
      console.log('[PairingsDisplay] Initializing');
      
      // Hide admin actions if not authenticated
      this.updateAdminActionsVisibility();

      // Get pairing ID from URL query params
      const urlParams = new URLSearchParams(window.location.search);
      const pairingId = urlParams.get('id');

      if (!pairingId) {
        this.showError('No pairing ID provided');
        return;
      }

      this.currentPairingId = pairingId;
      await this.loadPairing(pairingId);
      this.setupAdminButtons();
      this.setupInactivePlayersButton();
      // Ensure visibility is set correctly for admin actions
      this.updateAdminActionsVisibility();
    },

    updateAdminActionsVisibility() {
      const adminActions = document.getElementById('admin-actions');
      const adminActionsBottom = document.getElementById('admin-actions-bottom');
      const showInactiveBtn = document.getElementById('show-inactive-btn');
      const isAuth = window.SWU?.Auth?.isAuthenticated?.();
      
      if (adminActions) {
        adminActions.style.display = isAuth ? 'flex' : 'none';
      }
      if (adminActionsBottom) {
        adminActionsBottom.style.display = isAuth ? 'flex' : 'none';
      }
      if (showInactiveBtn) {
        showInactiveBtn.style.display = isAuth ? 'inline-block' : 'none';
      }
    },

    setupAdminButtons() {
      const updateBtn = document.getElementById('update-btn');
      const updateBtnBottom = document.getElementById('update-btn-bottom');
      const deleteBtn = document.getElementById('delete-btn');
      const deleteBtnBottom = document.getElementById('delete-btn-bottom');

      // Remove existing listeners by cloning
      if (updateBtn) {
        const newUpdateBtn = updateBtn.cloneNode(true);
        updateBtn.replaceWith(newUpdateBtn);
        newUpdateBtn.addEventListener('click', () => this.handleUpdate());
      }

      if (updateBtnBottom) {
        const newUpdateBtnBottom = updateBtnBottom.cloneNode(true);
        updateBtnBottom.replaceWith(newUpdateBtnBottom);
        newUpdateBtnBottom.addEventListener('click', () => this.handleUpdate());
      }

      if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.replaceWith(newDeleteBtn);
        newDeleteBtn.addEventListener('click', () => this.handleDelete());
      }

      if (deleteBtnBottom) {
        const newDeleteBtnBottom = deleteBtnBottom.cloneNode(true);
        deleteBtnBottom.replaceWith(newDeleteBtnBottom);
        newDeleteBtnBottom.addEventListener('click', () => this.handleDelete());
      }
    },

    setupInactivePlayersButton() {
      const showBtn = document.getElementById('show-inactive-btn');
      const modal = document.getElementById('inactive-modal');
      const closeBtn = document.getElementById('close-modal');

      if (showBtn) {
        showBtn.addEventListener('click', async () => {
          await this.showInactivePlayersModal();
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      }

      // Close modal when clicking outside
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.style.display = 'none';
          }
        });
      }
    },

    async getAllPlayers() {
      // Fetch all pairings to build master player list
      try {
        const url = window.SWU?.Auth?.apiUrl('/api/pairings') || 'http://127.0.0.1:3000/api/pairings';
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch pairings: ${response.status}`);
        }

        const pairings = await response.json();
        const allPlayers = new Set();
        const playersWithPlayedMatches = new Set();

        pairings.forEach(pairing => {
          if (!pairing.rounds) return;
          
          pairing.rounds.forEach(round => {
            round.matches?.forEach(match => {
              const home = (match.home || '').replace(/:\s*$/, '').trim();
              const away = (match.away || '').replace(/:\s*$/, '').trim();
              
              // Add all players to the master list
              if (home && home !== 'BYE') allPlayers.add(home);
              if (away && away !== 'BYE') allPlayers.add(away);
              
              // Track players who have played at least one match
              if (match.played === true) {
                if (home && home !== 'BYE') playersWithPlayedMatches.add(home);
                if (away && away !== 'BYE') playersWithPlayedMatches.add(away);
              }
            });
          });
        });

        return { allPlayers, playersWithPlayedMatches };
      } catch (error) {
        console.error('[PairingsDisplay] Error fetching all players:', error);
        return { allPlayers: new Set(), playersWithPlayedMatches: new Set() };
      }
    },

    getCurrentPlayers(pairing) {
      const currentPlayers = new Set();
      
      if (!pairing?.rounds) return currentPlayers;
      
      pairing.rounds.forEach(round => {
        round.matches?.forEach(match => {
          const home = (match.home || '').replace(/:\s*$/, '').trim();
          const away = (match.away || '').replace(/:\s*$/, '').trim();
          
          if (home && home !== 'BYE') currentPlayers.add(home);
          if (away && away !== 'BYE') currentPlayers.add(away);
        });
      });
      
      return currentPlayers;
    },

    getInactivePlayerState(playerName) {
      const key = `inactive_player_${playerName}`;
      return localStorage.getItem(key) === 'true';
    },

    setInactivePlayerState(playerName, checked) {
      const key = `inactive_player_${playerName}`;
      if (checked) {
        localStorage.setItem(key, 'true');
      } else {
        localStorage.removeItem(key);
      }
    },

    async showInactivePlayersModal() {
      const modal = document.getElementById('inactive-modal');
      const listContainer = document.getElementById('inactive-players-list');
      const noInactiveMsg = document.getElementById('no-inactive');
      
      if (!modal || !listContainer) return;

      // Show modal
      modal.style.display = 'block';
      
      // Get all players and players who have played matches
      const { allPlayers, playersWithPlayedMatches } = await this.getAllPlayers();
      
      // Inactive players = all players who have NEVER played a match (checkbox never ticked)
      const inactivePlayers = Array.from(allPlayers)
        .filter(player => !playersWithPlayedMatches.has(player))
        .sort();

      // Clear list
      listContainer.innerHTML = '';
      
      if (inactivePlayers.length === 0) {
        listContainer.style.display = 'none';
        noInactiveMsg.style.display = 'block';
        noInactiveMsg.textContent = 'All players have played at least one match!';
        return;
      }

      listContainer.style.display = 'block';
      noInactiveMsg.style.display = 'none';

      // Render inactive players with checkboxes
      inactivePlayers.forEach(player => {
        const item = document.createElement('div');
        item.className = 'inactive-player-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `inactive-${player}`;
        checkbox.checked = this.getInactivePlayerState(player);

        checkbox.addEventListener('change', (e) => {
          this.setInactivePlayerState(player, e.target.checked);
        });

        const label = document.createElement('label');
        label.setAttribute('for', `inactive-${player}`);
        label.textContent = player;

        item.appendChild(checkbox);
        item.appendChild(label);
        listContainer.appendChild(item);
      });
    },

    async loadPairing(pairingId) {
      const titleEl = document.getElementById('pairing-title');
      const resultsEl = document.getElementById('results');
      
      try {
        const url = window.SWU?.Auth?.apiUrl(`/api/pairings/${pairingId}`) || `http://127.0.0.1:3000/api/pairings/${pairingId}`;
        console.log('[PairingsDisplay] Fetching from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch pairing: ${response.status}`);
        }

        const data = await response.json();
        const pairing = data.data || data;

        if (!pairing) {
          throw new Error('Pairing not found');
        }

        this.currentPairingData = pairing;
        
        // Clean up player names from old data (remove colons)
        if (pairing.rounds) {
          pairing.rounds.forEach(round => {
            round.matches?.forEach(match => {
              match.home = (match.home || '').replace(/:\s*$/, '').trim();
              match.away = (match.away || '').replace(/:\s*$/, '').trim();
            });
          });
        }
        
        // Display title
        titleEl.textContent = pairing.name || 'Untitled Pairing';

        // Show/hide admin actions
        this.updateAdminActionsVisibility();

        // Display pairings
        this.displayPairings(pairing);

      } catch (error) {
        console.error('[PairingsDisplay] Error loading pairing:', error);
        this.showError(`Error loading pairing: ${error.message}`);
      }
    },

    displayPairings(pairing) {
      const resultsEl = document.getElementById('results');
      const plainOutEl = document.getElementById('plainOut');

      if (!pairing.rounds || pairing.rounds.length === 0) {
        resultsEl.innerHTML = '<p style="color: var(--muted);">No pairings data.</p>';
        return;
      }

      console.log('[PairingsDisplay] displayPairings called, filter:', this.currentPlayerFilter);

      // Apply filter
      const pairingsForUI = this.convertToUIFormat(pairing);
      console.log('[PairingsDisplay] Converted to UI format:', pairingsForUI);
      
      const filterFn = window.SWU?.UI?.filterPairings;
      console.log('[PairingsDisplay] filterPairings available?', !!filterFn);
      
      const filteredPairings = filterFn ? filterFn(pairingsForUI, this.currentPlayerFilter) : pairingsForUI;
      console.log('[PairingsDisplay] Filtered pairings:', filteredPairings);
      
      const displayRounds = this.convertFromUIFormat(filteredPairings, pairing);
      console.log('[PairingsDisplay] Converted back from UI format:', displayRounds);

      // Extract players and generate colors
      const players = window.SWU.Display.extractPlayers(displayRounds);
      const playerColors = window.SWU.Display.generatePlayerColors(players);

      console.log('[PairingsDisplay] Filtered rounds:', displayRounds);
      console.log('[PairingsDisplay] Player colors:', playerColors);

      const isAdmin = window.SWU?.Auth?.isAuthenticated() || false;
      const { html, plainText } = window.SWU.Display.renderRounds(displayRounds, playerColors, isAdmin);

      console.log('[PairingsDisplay] HTML length:', html.length);

      // Render to DOM
      resultsEl.innerHTML = html;
      plainOutEl.textContent = plainText;

      // Setup checkbox listeners for admins
      if (isAdmin) {
        this.setupCheckboxListeners();
      }

      // Populate filter dropdown
      this.updatePlayerFilter(pairing);
    },

    convertToUIFormat(pairing) {
      return pairing.rounds.map(round => ({
        round: round.round,
        matches: round.matches.map(match => ({
          ...match,
          player1: match.home,
          player2: match.away,
          bye: !match.away || match.away.trim() === '', // bye if away is empty
        }))
      }));
    },

    convertFromUIFormat(filteredPairings, originalPairing) {
      const pairingMap = {};
      originalPairing.rounds.forEach(round => {
        round.matches?.forEach(match => {
          // Store both directions to handle swapped players from filterPairings
          const key1 = `${match.home}|${match.away}`;
          const key2 = `${match.away}|${match.home}`;
          pairingMap[key1] = match;
          pairingMap[key2] = match;
        });
      });

      return filteredPairings.map(round => ({
        round: round.round,
        matches: round.matches.map(match => {
          const key = `${match.player1}|${match.player2}`;
          const original = pairingMap[key];
          return {
            ...original,
            home: match.player1,
            away: match.player2,
            bye: match.bye === true, // preserve the bye flag
          };
        })
      }));
    },

    setupCheckboxListeners() {
      const checkboxes = document.querySelectorAll('.match-played-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const matchIdx = parseInt(e.target.getAttribute('data-match-idx'));
          const roundIdx = parseInt(e.target.getAttribute('data-round-idx'));
          
          console.log('[PairingsDisplay] Match toggled:', { matchIdx, roundIdx, checked: e.target.checked });
          
          // Track changes
          if (matchIdx >= 0) {
            const matchKey = `${roundIdx}-${matchIdx}`;
            if (e.target.checked) {
              this.changedMatches.add(matchKey);
            } else {
              this.changedMatches.delete(matchKey);
            }
          }

          // Update the match data
          if (this.currentPairingData?.rounds?.[roundIdx]) {
            const round = this.currentPairingData.rounds[roundIdx];
            const match = round.matches?.[matchIdx];
            if (match) {
              match.played = e.target.checked;
              // Also clean up the player names if they have colons
              match.home = (match.home || '').replace(/:\s*$/, '').trim();
              match.away = (match.away || '').replace(/:\s*$/, '').trim();
            }
          }
        });
      });
    },

    async handleUpdate() {
      console.log('[PairingsDisplay] Update clicked');
      
      if (!this.currentPairingId || !this.currentPairingData) {
        alert('Error: Pairing data not loaded');
        return;
      }

      // Clean up the data before sending
      const cleanData = JSON.parse(JSON.stringify(this.currentPairingData));
      cleanData.rounds?.forEach(round => {
        round.matches?.forEach(match => {
          match.home = (match.home || '').replace(/:\s*$/, '').trim();
          match.away = (match.away || '').replace(/:\s*$/, '').trim();
        });
      });

      try {
        const url = window.SWU?.Auth?.apiUrl(`/api/pairings/${this.currentPairingId}`) || `http://127.0.0.1:3000/api/pairings/${this.currentPairingId}`;
        
        console.log('[PairingsDisplay] Sending update to:', url);
        console.log('[PairingsDisplay] Data:', cleanData);

        const response = await window.SWU.Auth.authFetch(url, {
          method: 'PUT',
          body: JSON.stringify(cleanData),
        });

        console.log('[PairingsDisplay] Response status:', response.status);

        let result = null;
        if (response.status !== 204) {
          result = await response.json();
        }
        
        if (!response.ok) {
          throw new Error(result?.message || 'Update failed');
        }

        console.log('[PairingsDisplay] Update successful');
        alert('Pairing updated successfully');
        this.changedMatches.clear();

      } catch (error) {
        console.error('[PairingsDisplay] Update error:', error);
        alert(`Update failed: ${error.message}`);
      }
    },

    async handleDelete() {
      console.log('[PairingsDisplay] Delete clicked');
      
      if (!this.currentPairingId) {
        alert('Error: Pairing ID not found');
        return;
      }

      // Show confirmation dialog
      const confirmed = confirm('Are you sure you want to delete this pairing? This action cannot be undone.');
      if (!confirmed) {
        console.log('[PairingsDisplay] Delete cancelled by user');
        return;
      }

      try {
        const url = window.SWU?.Auth?.apiUrl(`/api/pairings/${this.currentPairingId}`) || `http://127.0.0.1:3000/api/pairings/${this.currentPairingId}`;
        
        const response = await window.SWU.Auth.authFetch(url, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || 'Delete failed');
        }

        console.log('[PairingsDisplay] Delete successful');
        alert('Pairing deleted successfully');
        
        // Redirect to home
        window.location.href = 'index.html';

      } catch (error) {
        console.error('[PairingsDisplay] Delete error:', error);
        alert(`Delete failed: ${error.message}`);
      }
    },

    updatePlayerFilter(pairing) {
      const filterSelect = document.getElementById('player-filter');
      if (!filterSelect || !pairing.rounds) return;

      const players = new Set();
      pairing.rounds.forEach(round => {
        round.matches?.forEach(match => {
          const home = (match.home || '').replace(/:\s*$/, '').trim();
          const away = (match.away || '').replace(/:\s*$/, '').trim();
          if (home && home !== 'BYE') players.add(home);
          if (away && away !== 'BYE') players.add(away);
        });
      });

      // Clear existing options
      filterSelect.innerHTML = '<option value="all">All players</option>';

      // Add player options
      const sortedPlayers = Array.from(players).sort();
      sortedPlayers.forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        filterSelect.appendChild(option);
      });

      filterSelect.disabled = false;
      
      // Set current value
      if (sortedPlayers.includes(this.currentPlayerFilter)) {
        filterSelect.value = this.currentPlayerFilter;
      } else {
        filterSelect.value = 'all';
        this.currentPlayerFilter = 'all';
      }

      // Only add listener once on first init
      if (!this.filterListenerAttached) {
        this.filterListenerAttached = true;
        filterSelect.addEventListener('change', (e) => {
          console.log('[PairingsDisplay] Filter changed to:', e.target.value);
          this.currentPlayerFilter = e.target.value;
          this.displayPairings(this.currentPairingData);
        });
      }
    },

    showError(message) {
      const titleEl = document.getElementById('pairing-title');
      const resultsEl = document.getElementById('results');
      
      titleEl.textContent = 'Error';
      resultsEl.innerHTML = `<p style="color: #ff6b6b;">${window.SWU.Display.escapeHtml(message)}</p>`;
    },
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PairingsDisplay.init());
  } else {
    PairingsDisplay.init();
  }

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.PairingsDisplay = PairingsDisplay;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PairingsDisplay;
  }
})();
