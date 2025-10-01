// UI Utilities - handles DOM interactions and UI state management
class UIUtils {
    /**
     * Create a star icon element for favorites
     * @param {boolean} isFavorite - Whether the star should be filled
     * @returns {HTMLElement} Star icon element
     */
    static createStarIcon(isFavorite = false) {
        const starIcon = document.createElement('div');
        starIcon.className = `star-icon ${isFavorite ? 'favorite' : ''}`;
        starIcon.innerHTML = isFavorite ? '★' : '☆';
        starIcon.setAttribute('role', 'button');
        starIcon.setAttribute('tabindex', '0');
        starIcon.setAttribute('aria-label', isFavorite ? 'Remove from favorites' : 'Add to favorites');
        starIcon.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
        
        return starIcon;
    }

    /**
     * Update star icon appearance based on favorite status
     * @param {HTMLElement} starIcon - The star icon element
     * @param {boolean} isFavorite - Whether it should be favorited
     */
    static updateStarIcon(starIcon, isFavorite) {
        if (isFavorite) {
            starIcon.classList.add('favorite');
            starIcon.innerHTML = '★';
            starIcon.setAttribute('aria-label', 'Remove from favorites');
            starIcon.title = 'Remove from favorites';
        } else {
            starIcon.classList.remove('favorite');
            starIcon.innerHTML = '☆';
            starIcon.setAttribute('aria-label', 'Add to favorites');
            starIcon.title = 'Add to favorites';
        }
    }

    /**
     * Add click and keyboard event listeners to star icon
     * @param {HTMLElement} starIcon - The star icon element
     * @param {Function} callback - Callback function to execute on interaction
     */
    static addStarEventListeners(starIcon, callback) {
        // Click event
        starIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            callback();
        });

        // Keyboard event (Enter and Space)
        starIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                callback();
            }
        });

        // Add hover effects
        starIcon.addEventListener('mouseenter', () => {
            starIcon.style.transform = 'scale(1.2)';
        });

        starIcon.addEventListener('mouseleave', () => {
            starIcon.style.transform = 'scale(1)';
        });
    }

    /**
     * Show a temporary notification to the user
     * @param {string} message - Message to display
     * @param {string} type - Type of notification ('success', 'info', 'error')
     */
    static showNotification(message, type = 'info') {
        // Remove existing notification if any
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    /**
     * Create a filter button for showing/hiding favorites
     * @param {boolean} isActive - Whether the filter is currently active
     * @returns {HTMLElement} Filter button element
     */
    static createFilterButton(isActive = false) {
        const filterButton = document.createElement('button');
        filterButton.className = `filter-button ${isActive ? 'active' : ''}`;
        filterButton.innerHTML = `
            <span class="filter-icon">★</span>
            <span class="filter-text">Favorites Only</span>
        `;
        filterButton.setAttribute('aria-label', isActive ? 'Show all festivals' : 'Show favorites only');
        filterButton.title = isActive ? 'Show all festivals' : 'Show favorites only';
        
        return filterButton;
    }

    /**
     * Update filter button appearance based on state
     * @param {HTMLElement} filterButton - The filter button element
     * @param {boolean} isActive - Whether the filter is active
     */
    static updateFilterButton(filterButton, isActive) {
        if (isActive) {
            filterButton.classList.add('active');
            filterButton.setAttribute('aria-label', 'Show all festivals');
            filterButton.title = 'Show all festivals';
        } else {
            filterButton.classList.remove('active');
            filterButton.setAttribute('aria-label', 'Show favorites only');
            filterButton.title = 'Show favorites only';
        }
    }

    /**
     * Add event listeners to filter button
     * @param {HTMLElement} filterButton - The filter button element
     * @param {Function} callback - Callback function to execute on interaction
     */
    static addFilterButtonEventListeners(filterButton, callback) {
        // Click event
        filterButton.addEventListener('click', (e) => {
            e.preventDefault();
            callback();
        });

        // Keyboard event (Enter and Space)
        filterButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                callback();
            }
        });
    }
}