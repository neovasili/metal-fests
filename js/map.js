// Festival Map Application
class FestivalMap {
  constructor(festivals, favoritesManager, filterManager, bandsFilterManager, bandManager) {
    this.festivals = festivals;
    this.map = null;
    this.markers = [];
    this.modal = document.getElementById("festival-modal");
    this.modalContent = document.getElementById("modal-festival-card");

    // Use shared managers from timeline
    this.favoritesManager = favoritesManager;
    this.filterManager = filterManager;
    this.bandsFilterManager = bandsFilterManager;
    this.bandManager = bandManager;
  }

  async init() {
    try {
      this.setupModalEventListeners();
      this.initializeMap();
    } catch (error) {
      console.error("Error initializing map:", error);
      this.showError("Failed to load festival data. Please try again later.");
    }
  }

  // Public method to update map when filters change
  updateFilters() {
    if (this.map) {
      this.applyFilters();
    }
  }

  initializeMap() {
    // Initialize Leaflet map centered on Europe
    this.map = L.map("festival-map").setView([52.52, 13.405], 5);

    // Add dark theme tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
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
        className: "custom-marker",
        html: `<img src="img/metal-fests.png"
          alt="${festival.name}"
          style="width: 24px;
          height: 24px;
          border-radius: 50%;">`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
      });

      const marker = L.marker([coordinates.lat, coordinates.lng], {
        icon: customIcon,
        title: festival.name,
      }).addTo(this.map);

      // Store festival data with marker
      marker.festivalData = festival;
      marker.festivalIndex = index;

      // Create popup for hover effect
      marker.bindPopup(`<div style="font-weight: bold; color: #333;">${festival.name}</div>`, {
        closeButton: false,
        autoClose: true,
        closeOnEscapeKey: true,
      });

      // Add click listener to marker
      marker.on("click", () => {
        this.showFestivalModal(festival);
      });

      // Add hover effects
      marker.on("mouseover", (e) => {
        e.target.openPopup();
      });

      marker.on("mouseout", (e) => {
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
      maxZoom: 6, // Don't zoom in too much for better overview
    });
  }

  applyFilters() {
    const isFavoritesFilterActive = this.filterManager.isFilterEnabled();
    const selectedBands = this.bandsFilterManager.getSelectedBands();
    const isBandsFilterActive = selectedBands.length > 0;

    this.markers.forEach((marker) => {
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
        const festivalHasSelectedBands = festival.bands.some((bandRef) => selectedBands.includes(bandRef.name));
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
    const visibleMarkers = this.markers.filter((marker) => this.map.hasLayer(marker));

    if (visibleMarkers.length === 0) {
      return;
    }

    // Create a group with visible markers to calculate bounds
    const group = new L.featureGroup(visibleMarkers);

    // Fit the map to show visible markers with padding
    this.map.fitBounds(group.getBounds(), {
      padding: [20, 20],
      maxZoom: 8, // Allow closer zoom when fewer markers are visible
    });
  }

  async showFestivalModal(festival) {
    // Clear previous content
    this.modalContent.innerHTML = "";

    // Render festival card using the component
    const card = await FestivalCard.render(festival, {
      bandManager: this.bandManager,
      favoritesManager: this.favoritesManager,
      wrapInDiv: false, // Don't wrap, we want the card directly
    });

    // Listen for favorite toggle events to refresh filters
    card.addEventListener("favoriteToggled", () => {
      this.applyFilters();
    });

    // Apply band highlighting if bands filter is active
    const selectedBands = this.bandsFilterManager.getSelectedBands();
    if (selectedBands.length > 0) {
      const bandsList = card.querySelector(".bands-list");
      if (bandsList) {
        UIUtils.highlightSelectedBands(bandsList, selectedBands);
      }
    }

    // Add card to modal
    this.modalContent.appendChild(card);

    // Show modal
    this.modal.style.display = "flex";

    // Add keyboard navigation
    document.addEventListener("keydown", this.handleModalKeydown.bind(this));
  }

  setupModalEventListeners() {
    // Close modal when clicking close button
    const closeButton = this.modal.querySelector(".modal-close");
    closeButton.addEventListener("click", () => {
      this.closeModal();
    });

    // Close modal when clicking outside content
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
  }

  closeModal() {
    this.modal.style.display = "none";
    document.removeEventListener("keydown", this.handleModalKeydown.bind(this));
  }

  handleModalKeydown(e) {
    if (e.key === "Escape") {
      this.closeModal();
    }
  }

  showLoading(show) {
    this.loading.style.display = show ? "block" : "none";
  }

  showError(message) {
    document.getElementById("festival-map").innerHTML = `
            <div style="display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: #ff4444;">
                <div>
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            </div>
        `;
  }
}

// Expose initialization function for SPA mode
// Called by the timeline script when switching to map view
window.initializeMap = function (festivals, favoritesManager, filterManager, bandsFilterManager, bandManager) {
  if (!window.festivalMapInstance) {
    window.festivalMapInstance = new FestivalMap(
      festivals,
      favoritesManager,
      filterManager,
      bandsFilterManager,
      bandManager,
    );
    window.festivalMapInstance.init();
  }
};

// Export for global access
window.FestivalMap = FestivalMap;
