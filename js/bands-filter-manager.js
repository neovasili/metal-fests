// Bands Filter Manager - handles band selection state and localStorage operations
class BandsFilterManager {
    constructor() {
        this.storageKey = 'metalFestsBandsFilter';
        this.selectedBands = this.loadSelectedBands();
    }

    /**
     * Load selected bands from localStorage
     * @returns {Set} Set of selected band names
     */
    loadSelectedBands() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return new Set(stored ? JSON.parse(stored) : []);
        } catch (error) {
            console.error('Error loading selected bands from localStorage:', error);
            return new Set();
        }
    }

    /**
     * Save selected bands to localStorage
     */
    saveSelectedBands() {
        try {
            const bandsArray = Array.from(this.selectedBands);
            localStorage.setItem(this.storageKey, JSON.stringify(bandsArray));
        } catch (error) {
            console.error('Error saving selected bands to localStorage:', error);
        }
    }

    /**
     * Toggle band selection
     * @param {string} bandName - Name of the band
     * @returns {boolean} New selection status
     */
    toggleBand(bandName) {
        if (this.selectedBands.has(bandName)) {
            this.selectedBands.delete(bandName);
        } else {
            this.selectedBands.add(bandName);
        }
        this.saveSelectedBands();
        return this.selectedBands.has(bandName);
    }

    /**
     * Add band to selection
     * @param {string} bandName - Name of the band
     */
    addBand(bandName) {
        this.selectedBands.add(bandName);
        this.saveSelectedBands();
    }

    /**
     * Remove band from selection
     * @param {string} bandName - Name of the band
     */
    removeBand(bandName) {
        this.selectedBands.delete(bandName);
        this.saveSelectedBands();
    }

    /**
     * Check if a band is selected
     * @param {string} bandName - Name of the band
     * @returns {boolean} True if band is selected
     */
    isBandSelected(bandName) {
        return this.selectedBands.has(bandName);
    }

    /**
     * Get all selected band names
     * @returns {Array} Array of selected band names
     */
    getSelectedBands() {
        return Array.from(this.selectedBands);
    }

    /**
     * Clear all selected bands
     */
    clearAllBands() {
        this.selectedBands.clear();
        this.saveSelectedBands();
    }

    /**
     * Get count of selected bands
     * @returns {number} Number of selected bands
     */
    getSelectedBandsCount() {
        return this.selectedBands.size;
    }

    /**
     * Check if any bands are selected
     * @returns {boolean} True if any bands are selected
     */
    hasSelectedBands() {
        return this.selectedBands.size > 0;
    }

    /**
     * Set multiple bands at once
     * @param {Array} bands - Array of band names to select
     */
    setSelectedBands(bands) {
        this.selectedBands = new Set(bands);
        this.saveSelectedBands();
    }
}