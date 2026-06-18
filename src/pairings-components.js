/**
 * Pairings Display Component Factory
 * Creates reusable components for displaying pairings results
 */

(function() {
  const PairingsComponents = {
    /**
     * Create a results container with header
     * @param {string} id - Container ID
     * @param {string} title - Optional title/heading
     * @returns {HTMLElement} Results section element
     */
    createResultsContainer(id = 'results', title = null) {
      const section = document.createElement('section');
      section.id = id;
      section.className = 'results';
      section.setAttribute('role', 'region');
      section.setAttribute('aria-live', 'polite');
      section.setAttribute('aria-label', 'Pairings results');
      section.setAttribute('tabindex', '-1');

      if (title) {
        const heading = document.createElement('h2');
        heading.textContent = title;
        heading.style.marginBottom = '12px';
        section.appendChild(heading);
      }

      return section;
    },

    /**
     * Create a filter row (label + select dropdown)
     * @param {string} selectId - ID for the select element
     * @param {Array} players - Array of player names
     * @returns {HTMLElement} Filter row container
     */
    createFilterRow(selectId = 'player-filter', players = []) {
      const row = document.createElement('div');
      row.className = 'filter-row';

      const label = document.createElement('label');
      label.className = 'input-label';
      label.setAttribute('for', selectId);
      label.textContent = 'Filter pairings';

      const select = document.createElement('select');
      select.id = selectId;
      select.className = 'player-filter-select';
      select.disabled = players.length === 0;

      // Add "All players" option
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'All players';
      select.appendChild(allOption);

      // Add player options
      players.forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        select.appendChild(option);
      });

      row.appendChild(label);
      row.appendChild(select);

      return row;
    },

    /**
     * Create a round container with title and matches list
     * @param {string} roundTitle - Title for the round (e.g., "Round 1")
     * @returns {Object} { container, title, matchesList }
     */
    createRoundContainer(roundTitle = 'Round 1') {
      const container = document.createElement('div');
      container.className = 'round-container';

      const title = document.createElement('h3');
      title.className = 'round-title';
      title.textContent = roundTitle;

      const matchesList = document.createElement('ul');
      matchesList.className = 'matches-list';

      container.appendChild(title);
      container.appendChild(matchesList);

      return { container, title, matchesList };
    },

    /**
     * Create a match item (list item for a single match)
     * @param {string} html - HTML content for the match
     * @param {string} id - Optional ID for the match item
     * @returns {HTMLElement} Match list item
     */
    createMatchItem(html = '', id = null) {
      const item = document.createElement('li');
      item.className = 'match-item';
      item.innerHTML = html;
      if (id) item.id = id;
      return item;
    },

    /**
     * Create a plain text output container
     * @param {string} id - Container ID
     * @param {string} initialText - Initial text content
     * @returns {HTMLElement} Pre element for plain text
     */
    createPlainTextOutput(id = 'plainOut', initialText = '') {
      const pre = document.createElement('pre');
      pre.id = id;
      pre.className = 'plain-output';
      pre.setAttribute('aria-label', 'Plain pairings output');
      pre.setAttribute('aria-live', 'polite');
      pre.textContent = initialText;
      return pre;
    },

    /**
     * Create a pairings section with results + plain text output
     * @param {Object} options - { resultsId, plainTextId, title }
     * @returns {Object} { resultsContainer, plainTextContainer }
     */
    createPairingsDisplay(options = {}) {
      const { resultsId = 'results', plainTextId = 'plainOut', title = null } = options;

      const resultsContainer = this.createResultsContainer(resultsId, title);
      const plainTextContainer = this.createPlainTextOutput(plainTextId);

      return { resultsContainer, plainTextContainer };
    },
  };

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.PairingsComponents = PairingsComponents;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PairingsComponents;
  }
})();
