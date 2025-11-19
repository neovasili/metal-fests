// Search Filter Manager - handles search text state and localStorage operations
class SearchFilterManager {
  constructor() {
    this.storageKey = "metalFestsSearchFilter";
    this.searchText = this.loadSearchText();
  }

  /**
   * Load search text from localStorage
   * @returns {string} Search text
   */
  loadSearchText() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored || "";
    } catch (error) {
      console.error("Error loading search text from localStorage:", error);
      return "";
    }
  }

  /**
   * Save search text to localStorage
   */
  saveSearchText() {
    try {
      localStorage.setItem(this.storageKey, this.searchText);
    } catch (error) {
      console.error("Error saving search text to localStorage:", error);
    }
  }

  /**
   * Set search text
   * @param {string} text - Search text
   */
  setSearchText(text) {
    this.searchText = text;
    this.saveSearchText();
  }

  /**
   * Get current search text
   * @returns {string} Search text
   */
  getSearchText() {
    return this.searchText;
  }

  /**
   * Clear search text
   */
  clearSearchText() {
    this.searchText = "";
    this.saveSearchText();
  }

  /**
   * Check if search is active
   * @returns {boolean} True if search text is not empty
   */
  isSearchActive() {
    return this.searchText.trim().length > 0;
  }
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = SearchFilterManager;
}
