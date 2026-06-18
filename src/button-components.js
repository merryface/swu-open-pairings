/**
 * Button Component Factory
 * Creates reusable button elements with consistent styling and patterns
 */

(function() {
  const ButtonComponents = {
    /**
     * Button style presets matching CSS classes
     */
    STYLES: {
      PRIMARY: 'generate-btn',     // Yellow/accent color for primary actions
      SECONDARY: 'reset-btn',      // Light/muted for secondary actions
      DANGER: 'reset-btn',         // Same as secondary but semantically "danger"
      ACCENT: 'export-btn',        // Cyan/accent-2 for export/special actions
    },

    /**
     * Create a button element
     * @param {string} id - Element ID
     * @param {string} text - Button text
     * @param {Object} options - { style: 'PRIMARY'|'SECONDARY'|'ACCENT', onclick, type, className, disabled, etc. }
     * @returns {HTMLElement} Button element
     */
    createButton(id, text, options = {}) {
      const {
        style = 'PRIMARY',
        onclick = null,
        type = 'button',
        className = '',
        disabled = false,
        ariaLabel = text,
        ...attrs
      } = options;

      const button = document.createElement('button');
      button.id = id;
      button.type = type;
      button.textContent = text;
      button.disabled = disabled;

      // Apply style class
      const styleClass = this.STYLES[style] || this.STYLES.PRIMARY;
      button.className = `${styleClass} ${className}`.trim();

      // Set aria-label
      if (ariaLabel) {
        button.setAttribute('aria-label', ariaLabel);
      }

      // Apply click handler if provided
      if (onclick && typeof onclick === 'function') {
        button.addEventListener('click', onclick);
      }

      // Apply any additional attributes
      Object.entries(attrs).forEach(([key, val]) => {
        button.setAttribute(key, val);
      });

      return button;
    },

    /**
     * Create an admin actions button group (Update/Delete)
     * @param {Object} actions - { update: { id, onclick }, delete: { id, onclick } }
     * @returns {HTMLElement} Container div with buttons
     */
    createAdminActionsGroup(actions = {}) {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.gap = '12px';
      container.style.marginBottom = '28px';
      container.id = 'admin-actions';
      container.hidden = true;

      if (actions.update) {
        const updateBtn = this.createButton(
          actions.update.id,
          'Update',
          {
            style: 'PRIMARY',
            onclick: actions.update.onclick,
          }
        );
        container.appendChild(updateBtn);
      }

      if (actions.delete) {
        const deleteBtn = this.createButton(
          actions.delete.id,
          'Delete',
          {
            style: 'SECONDARY',
            onclick: actions.delete.onclick,
          }
        );
        container.appendChild(deleteBtn);
      }

      return container;
    },

    /**
     * Create a group of action buttons (Generate/Reset/Export pattern)
     * @param {Array} buttons - Array of { id, text, style, onclick }
     * @param {Object} containerOptions - { className, style, id }
     * @returns {HTMLElement} Container div with buttons
     */
    createButtonGroup(buttons = [], containerOptions = {}) {
      const {
        className = 'controls',
        style = {},
        id = '',
      } = containerOptions;

      const container = document.createElement('div');
      container.className = className;
      if (id) container.id = id;

      Object.entries(style).forEach(([key, val]) => {
        container.style[key] = val;
      });

      buttons.forEach(btnConfig => {
        const button = this.createButton(
          btnConfig.id,
          btnConfig.text,
          {
            style: btnConfig.style || 'PRIMARY',
            onclick: btnConfig.onclick,
            ...btnConfig.options,
          }
        );
        container.appendChild(button);
      });

      return container;
    },
  };

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.ButtonComponents = ButtonComponents;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ButtonComponents;
  }
})();
