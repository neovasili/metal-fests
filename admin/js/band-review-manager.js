// Band Review Manager - Handles loading and displaying non-reviewed bands

class BandReviewManager {
  constructor() {
    this.bands = [];
    this.filteredBands = [];
    this.sortOrder = "asc"; // 'asc' or 'desc'
    this.currentBandIndex = -1;
    this.onBandSelect = null; // Callback when a band is selected
    this.onBandRemoved = null; // Callback when a band is removed from the list
  }

  /**
   * Initialize the manager
   */
  async init() {
    await this.loadBands();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const sortToggle = document.getElementById("sortToggle");
    if (sortToggle) {
      sortToggle.addEventListener("click", () => this.toggleSortOrder());
    }
  }

  /**
   * Load all bands from the database
   */
  async loadBands() {
    try {
      const response = await fetch("/db.json");
      const data = await response.json();

      // Filter only non-reviewed bands
      this.bands = data.bands.filter((band) => band.reviewed === false || band.reviewed === undefined);

      this.sortBands();
      this.renderList();
      this.updateCount();

      return this.bands;
    } catch (error) {
      console.error("Error loading bands:", error);
      return [];
    }
  }

  /**
   * Sort bands by name
   */
  sortBands() {
    this.filteredBands = [...this.bands].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      if (this.sortOrder === "asc") {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  }

  /**
   * Toggle sort order between ascending and descending
   */
  toggleSortOrder() {
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
    this.sortBands();
    this.renderList();
    this.updateSortLabel();
  }

  /**
   * Update the sort label in the UI
   */
  updateSortLabel() {
    const sortLabel = document.getElementById("sortLabel");
    if (sortLabel) {
      sortLabel.textContent = this.sortOrder === "asc" ? "A-Z" : "Z-A";
    }
  }

  /**
   * Update the band count in the UI
   */
  updateCount() {
    const countElement = document.getElementById("band-count");
    if (countElement) {
      countElement.textContent = this.filteredBands.length;
    }

    // Also update tab count
    const tabCountElement = document.getElementById("review-count");
    if (tabCountElement) {
      tabCountElement.textContent = this.filteredBands.length;
    }
  }

  /**
   * Render the bands list
   */
  renderList() {
    const listContent = document.getElementById("bandsList");
    if (!listContent) return;

    // Show placeholder if no bands
    if (this.filteredBands.length === 0) {
      listContent.innerHTML = `
        <div class="list-placeholder">
          <p>🎉 No bands to review!</p>
        </div>
      `;
      return;
    }

    // Render band items
    listContent.innerHTML = this.filteredBands.map((band, index) => this.renderBandItem(band, index)).join("");

    // Add click handlers
    this.attachEventListeners();
  }

  /**
   * Render a single band item
   */
  renderBandItem(band, index) {
    const genres = band.genres || [];
    const genreTags = genres.map((genre) => `<span class="genre-tag">${genre}</span>`).join("");

    const isActive = index === this.currentBandIndex ? "active" : "";

    return `
      <div class="band-item ${isActive}" data-index="${index}">
        <div class="band-item-header">
          <h3 class="band-item-name">${band.name}</h3>
        </div>
        <p class="band-item-country">${band.country || "Unknown"}</p>
        <div class="band-item-genres">
          ${genreTags || '<span class="genre-tag">No genres</span>'}
        </div>
      </div>
    `;
  }

  /**
   * Attach click event listeners to band items
   */
  attachEventListeners() {
    const bandItems = document.querySelectorAll(".band-item");
    bandItems.forEach((item) => {
      item.addEventListener("click", () => {
        const index = parseInt(item.getAttribute("data-index"));
        this.selectBand(index);
      });
    });
  }

  /**
   * Select a band by index
   */
  selectBand(index) {
    if (index < 0 || index >= this.filteredBands.length) return;

    this.currentBandIndex = index;
    this.updateActiveItem();

    // Trigger callback
    if (this.onBandSelect) {
      this.onBandSelect(this.filteredBands[index], index);
    }
  }

  /**
   * Update the active item in the list
   */
  updateActiveItem() {
    const bandItems = document.querySelectorAll(".band-item");
    bandItems.forEach((item, index) => {
      if (index === this.currentBandIndex) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  /**
   * Get the current selected band
   */
  getCurrentBand() {
    if (this.currentBandIndex >= 0 && this.currentBandIndex < this.filteredBands.length) {
      return this.filteredBands[this.currentBandIndex];
    }
    return null;
  }

  /**
   * Navigate to the previous band
   */
  navigatePrevious() {
    if (this.currentBandIndex > 0) {
      this.selectBand(this.currentBandIndex - 1);
      return true;
    }
    return false;
  }

  /**
   * Navigate to the next band
   */
  navigateNext() {
    if (this.currentBandIndex < this.filteredBands.length - 1) {
      this.selectBand(this.currentBandIndex + 1);
      return true;
    }
    return false;
  }

  /**
   * Check if can navigate to previous band
   */
  canNavigatePrevious() {
    return this.currentBandIndex > 0;
  }

  /**
   * Check if can navigate to next band
   */
  canNavigateNext() {
    return this.currentBandIndex < this.filteredBands.length - 1;
  }

  /**
   * Remove a band from the list (when marked as reviewed)
   */
  removeBand(bandKey) {
    const index = this.filteredBands.findIndex((b) => b.key === bandKey);
    if (index === -1) return;

    // Remove from both arrays
    this.filteredBands.splice(index, 1);
    this.bands = this.bands.filter((b) => b.key !== bandKey);

    // Adjust current index if needed
    if (this.currentBandIndex >= this.filteredBands.length) {
      this.currentBandIndex = this.filteredBands.length - 1;
    }

    // Re-render list
    this.renderList();
    this.updateCount();

    // Trigger callback
    if (this.onBandRemoved) {
      this.onBandRemoved();
    }

    // Select another band if available
    if (this.filteredBands.length > 0 && this.currentBandIndex >= 0) {
      this.selectBand(this.currentBandIndex);
    }
  }

  /**
   * Get band by key
   */
  getBandByKey(key) {
    return this.filteredBands.find((b) => b.key === key);
  }
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.BandReviewManager = BandReviewManager;
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = BandReviewManager;
}
