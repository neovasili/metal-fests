// Favorites Manager - handles localStorage operations and favorite state management
class FavoritesManager {
    constructor() {
        this.storageKey = 'metalFestsFavorites';
        this.favorites = this.loadFavorites();
    }

    /**
     * Load favorites from localStorage
     * @returns {Set} Set of favorite festival names
     */
    loadFavorites() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return new Set(stored ? JSON.parse(stored) : []);
        } catch (error) {
            console.error('Error loading favorites from localStorage:', error);
            return new Set();
        }
    }

    /**
     * Save favorites to localStorage
     */
    saveFavorites() {
        try {
            const favoritesArray = Array.from(this.favorites);
            localStorage.setItem(this.storageKey, JSON.stringify(favoritesArray));
        } catch (error) {
            console.error('Error saving favorites to localStorage:', error);
        }
    }

    /**
     * Toggle favorite status of a festival
     * @param {string} festivalName - Name of the festival
     * @returns {boolean} New favorite status
     */
    toggleFavorite(festivalName) {
        if (this.favorites.has(festivalName)) {
            this.favorites.delete(festivalName);
        } else {
            this.favorites.add(festivalName);
        }
        this.saveFavorites();
        return this.favorites.has(festivalName);
    }

    /**
     * Check if a festival is favorited
     * @param {string} festivalName - Name of the festival
     * @returns {boolean} True if festival is favorited
     */
    isFavorite(festivalName) {
        return this.favorites.has(festivalName);
    }

    /**
     * Get all favorite festival names
     * @returns {Array} Array of favorite festival names
     */
    getFavorites() {
        return Array.from(this.favorites);
    }

    /**
     * Clear all favorites
     */
    clearFavorites() {
        this.favorites.clear();
        this.saveFavorites();
    }

    /**
     * Get count of favorites
     * @returns {number} Number of favorited festivals
     */
    getFavoriteCount() {
        return this.favorites.size;
    }
}