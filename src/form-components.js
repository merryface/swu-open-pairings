/**
 * Form Component Factory
 * Creates reusable form elements (inputs, textareas, selects) with labels
 */

(function() {
  const FormComponents = {
    /**
     * Create a labeled textarea element
     * @param {string} id - Element ID
     * @param {string} label - Label text
     * @param {Object} options - Additional options (placeholder, rows, value, etc.)
     * @returns {Object} { container, textarea, label }
     */
    createTextarea(id, label, options = {}) {
      const { placeholder = '', rows = 3, value = '', ariaLabel = label, ...attrs } = options;

      const container = document.createElement('div');

      const labelEl = document.createElement('label');
      labelEl.className = 'input-label';
      labelEl.setAttribute('for', id);
      labelEl.textContent = label;

      const textarea = document.createElement('textarea');
      textarea.id = id;
      textarea.className = 'players-input';
      textarea.rows = rows;
      textarea.placeholder = placeholder;
      textarea.value = value;
      textarea.setAttribute('aria-label', ariaLabel);

      // Apply any additional attributes
      Object.entries(attrs).forEach(([key, val]) => {
        textarea.setAttribute(key, val);
      });

      container.appendChild(labelEl);
      container.appendChild(textarea);

      return { container, textarea, label: labelEl };
    },

    /**
     * Create a labeled input element
     * @param {string} id - Element ID
     * @param {string} label - Label text
     * @param {Object} options - Additional options (type, placeholder, value, etc.)
     * @returns {Object} { container, input, label }
     */
    createInput(id, label, options = {}) {
      const { type = 'text', placeholder = '', value = '', ariaLabel = label, ...attrs } = options;

      const container = document.createElement('div');

      const labelEl = document.createElement('label');
      labelEl.className = 'input-label';
      labelEl.setAttribute('for', id);
      labelEl.textContent = label;

      const input = document.createElement('input');
      input.id = id;
      input.type = type;
      input.className = 'players-input';
      input.placeholder = placeholder;
      input.value = value;
      input.setAttribute('aria-label', ariaLabel);

      // Apply any additional attributes
      Object.entries(attrs).forEach(([key, val]) => {
        input.setAttribute(key, val);
      });

      container.appendChild(labelEl);
      container.appendChild(input);

      return { container, input, label: labelEl };
    },

    /**
     * Create a labeled select dropdown
     * @param {string} id - Element ID
     * @param {string} label - Label text
     * @param {Array} options - Array of { value, label } objects
     * @param {Object} attrs - Additional attributes
     * @returns {Object} { container, select, label }
     */
    createSelect(id, label, options = [], attrs = {}) {
      const container = document.createElement('div');

      const labelEl = document.createElement('label');
      labelEl.className = 'input-label';
      labelEl.setAttribute('for', id);
      labelEl.textContent = label;

      const select = document.createElement('select');
      select.id = id;
      select.className = 'player-filter-select';
      select.setAttribute('aria-label', label);

      // Populate options
      options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        if (opt.selected) optionEl.selected = true;
        select.appendChild(optionEl);
      });

      // Apply any additional attributes
      Object.entries(attrs).forEach(([key, val]) => {
        select.setAttribute(key, val);
      });

      container.appendChild(labelEl);
      container.appendChild(select);

      return { container, select, label: labelEl };
    },

    /**
     * Create a form group (container for label + input with consistent spacing)
     * @param {string} id - Element ID
     * @param {string} type - Element type (textarea, input, select)
     * @param {string} label - Label text
     * @param {Object} options - Type-specific options
     * @returns {Object} { container, element, label }
     */
    createFormGroup(id, type, label, options = {}) {
      switch (type) {
        case 'textarea':
          return this.createTextarea(id, label, options);
        case 'input':
          return this.createInput(id, label, options);
        case 'select':
          return this.createSelect(id, label, options.selectOptions || [], options);
        default:
          console.warn(`[FormComponents] Unknown form type: ${type}`);
          return { container: null, element: null, label: null };
      }
    }
  };

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.FormComponents = FormComponents;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormComponents;
  }
})();
