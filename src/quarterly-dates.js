/**
 * Quarterly/Monthly pairing date utility
 */

(function() {
  const QuarterlyDates = {
    /**
     * Get current quarter and monthly number
     * Returns { quarter: 1-4, monthly: 1-3, quarterStart: Date, monthlyStart: Date }
     */
    getCurrent() {
      const today = new Date();
      const month = today.getMonth() + 1; // 1-12
      const day = today.getDate();

      // Quarter boundaries: March 15, June 15, Sept 15, Dec 15
      let quarter, quarterStartMonth;
      
      if (month < 3 || (month === 3 && day < 15)) {
        quarter = 4; // Previous year Q4
        quarterStartMonth = 12;
      } else if (month < 6 || (month === 6 && day < 15)) {
        quarter = 1;
        quarterStartMonth = 3;
      } else if (month < 9 || (month === 9 && day < 15)) {
        quarter = 2;
        quarterStartMonth = 6;
      } else if (month < 12 || (month === 12 && day < 15)) {
        quarter = 3;
        quarterStartMonth = 9;
      } else {
        quarter = 4;
        quarterStartMonth = 12;
      }

      // Calculate which monthly we're in (1, 2, or 3)
      const quarterStartDay = 15;
      const quarterStart = new Date(today.getFullYear(), quarterStartMonth - 1, quarterStartDay);
      
      // If we haven't reached this quarter's start yet, use last year's
      if (today < quarterStart && (month < 3 || (month === 3 && day < 15))) {
        quarterStart.setFullYear(today.getFullYear() - 1);
      }

      // Find which monthly (each lasts ~30 days from quarter start)
      const daysIntoQuarter = Math.floor((today - quarterStart) / (1000 * 60 * 60 * 24));
      let monthly;
      
      if (daysIntoQuarter < 30) {
        monthly = 1;
      } else if (daysIntoQuarter < 60) {
        monthly = 2;
      } else {
        monthly = 3;
      }

      return {
        quarter,
        monthly,
        quarterStart,
      };
    },

    /**
     * Get next pairing title in sequence
     */
    getNextTitle() {
      const current = this.getCurrent();
      let nextQuarter = current.quarter;
      let nextMonthly = current.monthly + 1;

      // Wrap to next quarter if at monthly 3
      if (nextMonthly > 3) {
        nextMonthly = 1;
        nextQuarter = nextQuarter === 4 ? 1 : nextQuarter + 1;
      }

      return `Quarter ${nextQuarter} - Monthly ${nextMonthly}`;
    },

    /**
     * Get default title for new pairings page
     */
    getDefaultTitle() {
      return this.getNextTitle();
    }
  };

  // Expose to global scope
  if (typeof window !== 'undefined') {
    if (!window.SWU) window.SWU = {};
    window.SWU.QuarterlyDates = QuarterlyDates;
  }

  // For Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuarterlyDates;
  }
})();
