// Festival Map Application
class FestivalMap {
    constructor() {
        this.festivals = [];
        this.map = null;
        this.markers = [];
        this.infoWindow = null;
        this.modal = document.getElementById('festival-modal');
        this.modalContent = document.getElementById('modal-festival-card');
        this.loading = document.getElementById('loading');
        this.filterContainer = document.getElementById('filter-container');
        this.favoritesManager = new FavoritesManager();
        this.filterManager = new FilterManager();
        this.bandsFilterManager = new BandsFilterManager();
        this.allBands = [];
        
        this.init();
    }

    async init() {
        this.showLoading(true);
        try {
            await this.loadFestivals();
            this.extractAllBands();
            this.createFilterControls();
            this.setupModalEventListeners();
            this.initializeMap();
        } catch (error) {
            console.error('Error initializing map:', error);
            this.showError('Failed to load festival data. Please try again later.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadFestivals() {
        try {
            const response = await fetch('db.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.festivals = data.festivals;
        } catch (error) {
            console.error('Error loading festivals:', error);
            throw error;
        }
    }

    extractAllBands() {
        const bandsSet = new Set();
        this.festivals.forEach(festival => {
            festival.bands.forEach(band => bandsSet.add(band));
        });
        this.allBands = Array.from(bandsSet).sort();
    }

    createFilterControls() {
        // Create favorites filter button
        const filterButton = UIUtils.createFilterButton(this.filterManager.isFilterEnabled());
        
        UIUtils.addFilterButtonEventListeners(filterButton, () => {
            const newState = this.filterManager.toggleFilter();
            UIUtils.updateFilterButton(filterButton, newState);
            this.applyFilters();
            
            const message = newState 
                ? 'Showing favorites only' 
                : 'Showing all festivals';
            UIUtils.showNotification(message, 'info');
        });
        
        this.filterContainer.appendChild(filterButton);

        // Create bands filter
        const selectedBands = this.bandsFilterManager.getSelectedBands();
        const bandsFilter = UIUtils.createBandsFilter(this.allBands, selectedBands);
        
        UIUtils.addBandsFilterEventListeners(bandsFilter, {
            onBandToggle: (bandName, isSelected) => {
                if (isSelected) {
                    this.bandsFilterManager.addBand(bandName);
                } else {
                    this.bandsFilterManager.removeBand(bandName);
                }
                this.updateBandsFilter();
                this.applyFilters();
            },
            onClearAll: () => {
                this.bandsFilterManager.clearAllBands();
                this.updateBandsFilter();
                this.applyFilters();
                UIUtils.showNotification('All band filters cleared', 'info');
            },
            onSearch: (searchTerm) => {
                this.updateBandsFilter();
            },
            onDropdownOpen: () => {
                this.updateBandsFilter();
            }
        });
        
        this.filterContainer.appendChild(bandsFilter);
        this.bandsFilterElement = bandsFilter;
    }

    updateBandsFilter() {
        if (this.bandsFilterElement) {
            const selectedBands = this.bandsFilterManager.getSelectedBands();
            UIUtils.updateBandsFilter(this.bandsFilterElement, this.allBands, selectedBands);
        }
    }

    initializeMap() {
        // Initialize Leaflet map centered on Europe
        this.map = L.map('festival-map').setView([52.5200, 13.4050], 5);

        // Add dark theme tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);
        
        this.createMarkers();
        this.fitMapToMarkers();
        this.applyFilters();
    }

    createMarkers() {
        this.festivals.forEach((festival, index) => {
            const coordinates = festival.coordinates;
            if (!coordinates) {
                console.warn(`No coordinates found for ${festival.name} at ${festival.location}`);
                return;
            }

            // Create custom icon using the metal-fests favicon
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<img src="img/metal-fests.png" alt="${festival.name}" style="width: 24px; height: 24px; border-radius: 50%;">`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });

            const marker = L.marker([coordinates.lat, coordinates.lng], {
                icon: customIcon,
                title: festival.name
            }).addTo(this.map);

            // Store festival data with marker
            marker.festivalData = festival;
            marker.festivalIndex = index;

            // Create popup for hover effect
            marker.bindPopup(`<div style="font-weight: bold; color: #333;">${festival.name}</div>`, {
                closeButton: false,
                autoClose: true,
                closeOnEscapeKey: true
            });

            // Add click listener to marker
            marker.on('click', () => {
                this.showFestivalModal(festival);
            });

            // Add hover effects
            marker.on('mouseover', (e) => {
                e.target.openPopup();
            });

            marker.on('mouseout', (e) => {
                e.target.closePopup();
            });

            this.markers.push(marker);
        });
    }

    fitMapToMarkers() {
        if (this.markers.length === 0) {
            return;
        }

        // Create a group with all markers to calculate bounds
        const group = new L.featureGroup(this.markers);
        
        // Fit the map to show all markers with some padding
        this.map.fitBounds(group.getBounds(), {
            padding: [20, 20], // Add 20px padding on all sides
            maxZoom: 6 // Don't zoom in too much for better overview
        });
    }

    applyFilters() {
        const isFavoritesFilterActive = this.filterManager.isFilterEnabled();
        const selectedBands = this.bandsFilterManager.getSelectedBands();
        const isBandsFilterActive = selectedBands.length > 0;

        this.markers.forEach(marker => {
            const festival = marker.festivalData;
            let shouldShow = true;

            // Apply favorites filter
            if (isFavoritesFilterActive) {
                const isFavorite = this.favoritesManager.isFavorite(festival.name);
                if (!isFavorite) {
                    shouldShow = false;
                }
            }

            // Apply bands filter
            if (isBandsFilterActive && shouldShow) {
                const festivalHasSelectedBands = festival.bands.some(band => 
                    selectedBands.includes(band)
                );
                if (!festivalHasSelectedBands) {
                    shouldShow = false;
                }
            }

            // Show/hide marker by adding/removing from map
            if (shouldShow) {
                if (!this.map.hasLayer(marker)) {
                    marker.addTo(this.map);
                }
            } else {
                if (this.map.hasLayer(marker)) {
                    this.map.removeLayer(marker);
                }
            }
        });

        // Re-center map to show only visible markers
        this.fitMapToVisibleMarkers();
    }

    fitMapToVisibleMarkers() {
        // Get only visible markers
        const visibleMarkers = this.markers.filter(marker => this.map.hasLayer(marker));
        
        if (visibleMarkers.length === 0) {
            return;
        }

        // Create a group with visible markers to calculate bounds
        const group = new L.featureGroup(visibleMarkers);
        
        // Fit the map to show visible markers with padding
        this.map.fitBounds(group.getBounds(), {
            padding: [20, 20],
            maxZoom: 8 // Allow closer zoom when fewer markers are visible
        });
    }

    showFestivalModal(festival) {
        // Create festival card content
        const cardHTML = this.createFestivalCardHTML(festival);
        this.modalContent.innerHTML = cardHTML;

        // Add favorite functionality to the modal card
        this.addFavoriteFeatureToModal(festival);

        // Show modal
        this.modal.style.display = 'flex';
        
        // Add keyboard navigation
        document.addEventListener('keydown', this.handleModalKeydown.bind(this));
    }

    createFestivalCardHTML(festival) {
        const startDate = new Date(festival.dates.start);
        const endDate = new Date(festival.dates.end);
        const formattedDates = this.formatDateRange(startDate, endDate);
        const isFavorite = this.favoritesManager.isFavorite(festival.name);
        const selectedBands = this.bandsFilterManager.getSelectedBands();

        return `
            <div class="festival-card">
                <div class="festival-header">
                    <img src="${festival.poster}" alt="${festival.name} Poster" class="festival-poster" 
                         onerror="this.src='img/placeholder.jpg'">
                    <div class="favorite-container"></div>
                </div>
                <h2 class="festival-name">${festival.name}</h2>
                <div class="festival-dates">${formattedDates}</div>
                <div class="festival-location">${festival.location}</div>
                <div class="festival-bands">
                    <h4>Featured Bands:</h4>
                    <div class="bands-list">
                        ${festival.bands.map(band => `<span class="band-tag">${band}</span>`).join('')}
                    </div>
                </div>
                <div class="festival-info">
                    <div class="ticket-price">From €${festival.ticketPrice}</div>
                    <a href="${festival.website}" target="_blank" rel="noopener noreferrer" class="festival-website">
                        Visit Website
                    </a>
                </div>
            </div>
        `;
    }

    addFavoriteFeatureToModal(festival) {
        const favoriteContainer = this.modalContent.querySelector('.favorite-container');
        const isFavorite = this.favoritesManager.isFavorite(festival.name);
        
        // Create star icon
        const starIcon = UIUtils.createStarIcon(isFavorite);
        
        // Add event listeners
        UIUtils.addStarEventListeners(starIcon, () => {
            const newStatus = this.favoritesManager.toggleFavorite(festival.name);
            UIUtils.updateStarIcon(starIcon, newStatus);
            
            // Refresh filters to reflect changes
            this.applyFilters();
            
            // Show notification
            const message = newStatus 
                ? `${festival.name} added to favorites` 
                : `${festival.name} removed from favorites`;
            UIUtils.showNotification(message, 'success');
        });
        
        favoriteContainer.appendChild(starIcon);
        
        // Apply band highlighting if bands filter is active
        const selectedBands = this.bandsFilterManager.getSelectedBands();
        if (selectedBands.length > 0) {
            const bandsList = this.modalContent.querySelector('.bands-list');
            if (bandsList) {
                UIUtils.highlightSelectedBands(bandsList, selectedBands);
            }
        }
    }

    setupModalEventListeners() {
        // Close modal when clicking close button
        const closeButton = this.modal.querySelector('.modal-close');
        closeButton.addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside content
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
    }

    handleModalKeydown(e) {
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }

    formatDateRange(startDate, endDate) {
        const options = { month: 'short', day: 'numeric' };
        
        if (startDate.getTime() === endDate.getTime()) {
            return startDate.toLocaleDateString('en-US', options);
        } else if (startDate.getMonth() === endDate.getMonth()) {
            return `${startDate.toLocaleDateString('en-US', { day: 'numeric' })}-${endDate.toLocaleDateString('en-US', options)}`;
        } else {
            return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
        }
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        document.getElementById('festival-map').innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: #ff4444;">
                <div>
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.festivalMapInstance = new FestivalMap();
});

// Export for global access
window.FestivalMap = FestivalMap;