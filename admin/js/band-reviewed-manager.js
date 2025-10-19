// Band Reviewed Manager - Handles loading and displaying reviewed bands for editing

class BandReviewedManager {
  constructor() {
    this.bands = [];
    this.filteredBands = [];
    this.sortOrder = "asc"; // 'asc' or 'desc'
    this.currentBandIndex = -1;
    this.onBandSelect = null; // Callback when a band is selected
    this.onBandRemoved = null; // Callback when a band is removed from the list
  }

  /**
   * Load all reviewed bands from the database
   */
  async loadBands() {
    try {
      const response = await fetch("/db.json");
      const data = await response.json();

      // Filter only reviewed bands
      this.bands = data.bands.filter((band) => band.reviewed === true);

      this.sortBands();
      this.renderList();
      this.updateCount();

      return this.bands;
    } catch (error) {
      console.error("Error loading reviewed bands:", error);
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
    const sortLabel = document.getElementById("sortLabelReviewed");
    if (sortLabel) {
      sortLabel.textContent = this.sortOrder === "asc" ? "A-Z" : "Z-A";
    }
  }

  /**
   * Update the band count in the UI
   */
  updateCount() {
    const countElement = document.getElementById("reviewed-band-count");
    if (countElement) {
      countElement.textContent = this.filteredBands.length;
    }

    // Also update tab count
    const tabCountElement = document.getElementById("reviewed-count");
    if (tabCountElement) {
      tabCountElement.textContent = this.filteredBands.length;
    }
  }

  /**
   * Render the bands list
   */
  renderList() {
    const listContent = document.getElementById("bandsListReviewed");
    if (!listContent) return;

    // Show placeholder if no bands
    if (this.filteredBands.length === 0) {
      listContent.innerHTML = `
        <div class="list-placeholder">
          <p>🎸 No reviewed bands yet!</p>
        </div>
      `;
      return;
    }

    // Render band items
    listContent.innerHTML = this.filteredBands.map((band, index) => this.renderBandItem(band, index)).join("");

    // Attach click listeners to band items
    this.attachEventListeners();

    // Update active item
    this.updateActiveItem();
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
          ${genreTags}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to band items
   */
  attachEventListeners() {
    const bandItems = document.querySelectorAll("#bandsListReviewed .band-item");
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
    const bandItems = document.querySelectorAll("#bandsListReviewed .band-item");
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
   * Refresh the list (reload from database)
   */
  async refresh() {
    await this.loadBands();
  }

  /**
   * Remove a band from the list (when unmarked as reviewed)
   */
  removeBand(bandKey) {
    const bandIndex = this.filteredBands.findIndex((band) => band.key === bandKey);
    if (bandIndex === -1) return;

    this.filteredBands.splice(bandIndex, 1);
    this.bands = this.bands.filter((band) => band.key !== bandKey);

    // Update current index if needed
    if (this.currentBandIndex >= this.filteredBands.length) {
      this.currentBandIndex = this.filteredBands.length - 1;
    }

    this.renderList();
    this.updateCount();

    // Trigger callback
    if (this.onBandRemoved) {
      this.onBandRemoved(bandKey);
    }
  }
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.BandReviewedManager = BandReviewedManager;
}
