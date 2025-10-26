// Main application code
class FestivalTimeline {
  constructor() {
    this.festivals = [];
    this.timelineContent = document.getElementById("timeline-content");
    this.loading = document.getElementById("loading");
    this.filterContainer = document.getElementById("filter-container");
    this.filterContainerMobile = document.getElementById("filter-container-mobile");

    // Create manager instances and store them globally for reuse in SPA mode
    this.favoritesManager = new FavoritesManager();
    this.filterManager = new FilterManager();
    this.bandsFilterManager = new BandsFilterManager();
    this.bandManager = new BandManager();

    // Store globally so map view can reuse them
    window.sharedFavoritesManager = this.favoritesManager;
    window.sharedFilterManager = this.filterManager;
    window.sharedBandsFilterManager = this.bandsFilterManager;
    window.sharedBandManager = this.bandManager;

    this.allBands = [];
    this.init();
  }

  async init() {
    this.showLoading(true);
    try {
      await this.bandManager.loadBands();
      await this.loadFestivals();
      this.sortFestivalsByDate();
      this.extractAllBands();
      this.createFilterButton();
      this.createBandsFilter();
      // Pre-load the festival card template once
      await FestivalCard.loadTemplate();
      await this.renderTimeline();
      await this.bandManager.init();
    } catch (error) {
      console.error("Error initializing timeline:", error);
      this.showError("Failed to load festival data. Please try again later.");
    } finally {
      this.showLoading(false);
    }
  }

  async loadFestivals() {
    try {
      const response = await fetch("db.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.festivals = data.festivals;

      // Store festivals globally for map view
      window.sharedFestivals = this.festivals;
    } catch (error) {
      console.error("Error loading festivals:", error);
      throw error;
    }
  }

  sortFestivalsByDate() {
    this.festivals.sort((a, b) => {
      const dateA = new Date(a.dates.start);
      const dateB = new Date(b.dates.start);
      return dateA - dateB;
    });
  }

  extractAllBands() {
    const bandsSet = new Set();
    this.festivals.forEach((festival) => {
      festival.bands.forEach((band) => bandsSet.add(band));
    });
    this.allBands = Array.from(bandsSet).sort();
  }

  createFilterButton() {
    const filterButton = UIUtils.createFilterButton(this.filterManager.isFilterEnabled());
    const filterButtonMobile = UIUtils.createFilterButton(this.filterManager.isFilterEnabled());

    const updateBothButtons = () => {
      const newState = this.filterManager.toggleFilter();
      UIUtils.updateFilterButton(filterButton, newState);
      UIUtils.updateFilterButton(filterButtonMobile, newState);
      this.applyFilter();

      // Update map if it exists
      if (window.festivalMapInstance) {
        window.festivalMapInstance.updateFilters();
      }

      const message = newState ? "Showing favorites only" : "Showing all festivals";
      UIUtils.showNotification(message, "info");
    };

    UIUtils.addFilterButtonEventListeners(filterButton, updateBothButtons);
    UIUtils.addFilterButtonEventListeners(filterButtonMobile, updateBothButtons);

    this.filterContainer.appendChild(filterButton);
    this.filterContainerMobile.appendChild(filterButtonMobile);
  }

  createBandsFilter() {
    const selectedBands = this.bandsFilterManager.getSelectedBands();
    const bandsFilter = UIUtils.createBandsFilter(this.allBands, selectedBands);
    const bandsFilterMobile = UIUtils.createBandsFilter(this.allBands, selectedBands);

    const filterCallbacks = {
      onBandToggle: (bandName, isSelected) => {
        if (isSelected) {
          this.bandsFilterManager.addBand(bandName);
        } else {
          this.bandsFilterManager.removeBand(bandName);
        }
        this.updateBandsFilter();
        this.applyFilter();

        // Update map if it exists
        if (window.festivalMapInstance) {
          window.festivalMapInstance.updateFilters();
        }
      },
      onClearAll: () => {
        this.bandsFilterManager.clearAllBands();
        this.updateBandsFilter();
        this.applyFilter();

        // Update map if it exists
        if (window.festivalMapInstance) {
          window.festivalMapInstance.updateFilters();
        }

        UIUtils.showNotification("All band filters cleared", "info");
      },
      onSearch: (searchTerm) => {
        this.updateBandsFilter();
      },
      onDropdownOpen: () => {
        this.updateBandsFilter();
      },
    };

    UIUtils.addBandsFilterEventListeners(bandsFilter, filterCallbacks);
    UIUtils.addBandsFilterEventListeners(bandsFilterMobile, filterCallbacks);

    this.filterContainer.appendChild(bandsFilter);
    this.filterContainerMobile.appendChild(bandsFilterMobile);
    this.bandsFilterElement = bandsFilter;
    this.bandsFilterElementMobile = bandsFilterMobile;
  }

  updateBandsFilter() {
    const selectedBands = this.bandsFilterManager.getSelectedBands();
    if (this.bandsFilterElement) {
      UIUtils.updateBandsFilter(this.bandsFilterElement, this.allBands, selectedBands);
    }
    if (this.bandsFilterElementMobile) {
      UIUtils.updateBandsFilter(this.bandsFilterElementMobile, this.allBands, selectedBands);
    }
  }

  applyFilter() {
    const isFavoritesFilterActive = this.filterManager.isFilterEnabled();
    const selectedBands = this.bandsFilterManager.getSelectedBands();
    const isBandsFilterActive = selectedBands.length > 0;
    const cards = this.timelineContent.querySelectorAll(".festival-card");

    cards.forEach((card) => {
      const festivalNameElement = card.querySelector(".festival-name-link") || card.querySelector(".festival-name");
      const festivalName = festivalNameElement.textContent.trim();
      const festival = this.festivals.find((f) => f.name === festivalName);

      let shouldShow = true;

      // Apply favorites filter
      if (isFavoritesFilterActive) {
        const isFavorite = this.favoritesManager.isFavorite(festivalName);
        if (!isFavorite) {
          shouldShow = false;
        }
      }

      // Apply bands filter (intersection with favorites filter)
      if (isBandsFilterActive && shouldShow) {
        const festivalHasSelectedBands = festival.bands.some((band) => selectedBands.includes(band));
        if (!festivalHasSelectedBands) {
          shouldShow = false;
        }
      }

      // Apply visual state
      if (shouldShow) {
        card.classList.remove("collapsed");
      } else {
        card.classList.add("collapsed");
      }

      // Highlight selected bands in the festival
      if (isBandsFilterActive) {
        const bandsList = card.querySelector(".bands-list");
        if (bandsList) {
          UIUtils.highlightSelectedBands(bandsList, selectedBands);
        }
      } else {
        // Remove highlights when no bands are selected
        const bandsList = card.querySelector(".bands-list");
        if (bandsList) {
          UIUtils.highlightSelectedBands(bandsList, []);
        }
      }
    });
  }

  async renderTimeline() {
    this.timelineContent.innerHTML = "";
    let currentMonth = "";

    for (let index = 0; index < this.festivals.length; index++) {
      const festival = this.festivals[index];
      const festivalDate = new Date(festival.dates.start);
      const monthYear = festivalDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      // Add month marker if this is a new month
      if (monthYear !== currentMonth) {
        currentMonth = monthYear;
        this.addMonthMarker(monthYear);
      }

      // Create festival card using the component
      await this.createFestivalCard(festival, index);
    }

    // Apply filter after rendering all cards
    this.applyFilter();
  }

  addMonthMarker(monthYear) {
    const monthMarker = document.createElement("div");
    monthMarker.className = "month-marker";
    monthMarker.innerHTML = `<h3>${monthYear}</h3>`;
    this.timelineContent.appendChild(monthMarker);
  }

  async createFestivalCard(festival, index) {
    const card = await FestivalCard.render(festival, {
      bandManager: this.bandManager,
      favoritesManager: this.favoritesManager,
    });

    // Listen for favorite toggle events to refresh filter
    card.addEventListener("favoriteToggled", () => {
      this.applyFilter();

      // Update map if it exists
      if (window.festivalMapInstance) {
        window.festivalMapInstance.updateFilters();
      }
    });

    this.timelineContent.appendChild(card);
  }

  showLoading(show) {
    this.loading.style.display = show ? "block" : "none";
  }

  showError(message) {
    this.timelineContent.innerHTML = `
            <div style="text-align: center; padding: 4rem; color: #ff4444;">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new FestivalTimeline();
});

// Add smooth scrolling for better user experience
document.addEventListener("scroll", () => {
  const scrolled = window.pageYOffset;
  const parallax = document.querySelector(".timeline-line");
  if (parallax) {
    const speed = scrolled * 0.1;
    parallax.style.boxShadow = `0 0 ${10 + speed}px rgba(255, 107, 0, ${0.5 + speed * 0.001})`;
  }
});

// Add click event listeners for festival cards to enhance interactivity
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("festival-card") || e.target.closest(".festival-card")) {
    const card = e.target.closest(".festival-card") || e.target;
    card.style.transform =
      card.style.transform === "translateY(-10px) scale(1.02)" ? "translateY(-5px)" : "translateY(-10px) scale(1.02)";

    setTimeout(() => {
      if (card.style.transform.includes("scale")) {
        card.style.transform = "translateY(-5px)";
      }
    }, 200);
  }
});
