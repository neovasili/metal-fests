// Filter Manager - handles filter state and localStorage operations
class FilterManager {
    constructor() {
        this.storageKey = 'metalFestsFilterState';
        this.isFilterActive = this.loadFilterState();
    }

    /**
     * Load filter state from localStorage
     * @returns {boolean} Whether favorites filter is active
     */
    loadFilterState() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : false;
        } catch (error) {
            console.error('Error loading filter state from localStorage:', error);
            return false;
        }
    }

    /**
     * Save filter state to localStorage
     */
    saveFilterState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.isFilterActive));
        } catch (error) {
            console.error('Error saving filter state to localStorage:', error);
        }
    }

    /**
     * Toggle filter state
     * @returns {boolean} New filter state
     */
    toggleFilter() {
        this.isFilterActive = !this.isFilterActive;
        this.saveFilterState();
        return this.isFilterActive;
    }

    /**
     * Get current filter state
     * @returns {boolean} Whether favorites filter is active
     */
    isFilterEnabled() {
        return this.isFilterActive;
    }

    /**
     * Set filter state
     * @param {boolean} state - New filter state
     */
    setFilterState(state) {
        this.isFilterActive = state;
        this.saveFilterState();
    }

    /**
     * Reset filter to default state
     */
    resetFilter() {
        this.isFilterActive = false;
        this.saveFilterState();
    }
}