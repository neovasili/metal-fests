// UI Utilities - handles DOM interactions and UI state management
class UIUtils {
  /**
   * Create a star icon element for favorites
   * @param {boolean} isFavorite - Whether the star should be filled
   * @returns {HTMLElement} Star icon element
   */
  static createStarIcon(isFavorite = false) {
    const starIcon = document.createElement("div");
    starIcon.className = `star-icon ${isFavorite ? "favorite" : ""}`;
    starIcon.innerHTML = isFavorite ? "★" : "☆";
    starIcon.setAttribute("role", "button");
    starIcon.setAttribute("tabindex", "0");
    starIcon.setAttribute("aria-label", isFavorite ? "Remove from favorites" : "Add to favorites");
    starIcon.title = isFavorite ? "Remove from favorites" : "Add to favorites";

    return starIcon;
  }

  /**
   * Update star icon appearance based on favorite status
   * @param {HTMLElement} starIcon - The star icon element
   * @param {boolean} isFavorite - Whether it should be favorited
   */
  static updateStarIcon(starIcon, isFavorite) {
    if (isFavorite) {
      starIcon.classList.add("favorite");
      starIcon.innerHTML = "★";
      starIcon.setAttribute("aria-label", "Remove from favorites");
      starIcon.title = "Remove from favorites";
    } else {
      starIcon.classList.remove("favorite");
      starIcon.innerHTML = "☆";
      starIcon.setAttribute("aria-label", "Add to favorites");
      starIcon.title = "Add to favorites";
    }
  }

  /**
   * Add click and keyboard event listeners to star icon
   * @param {HTMLElement} starIcon - The star icon element
   * @param {Function} callback - Callback function to execute on interaction
   */
  static addStarEventListeners(starIcon, callback) {
    // Click event
    starIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      callback();
    });

    // Keyboard event (Enter and Space)
    starIcon.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        callback();
      }
    });

    // Add hover effects
    starIcon.addEventListener("mouseenter", () => {
      starIcon.style.transform = "scale(1.2)";
    });

    starIcon.addEventListener("mouseleave", () => {
      starIcon.style.transform = "scale(1)";
    });
  }

  /**
   * Show a temporary notification to the user
   * @param {string} message - Message to display
   * @param {string} type - Type of notification ('success', 'info', 'error')
   */
  static showNotification(message, type = "info") {
    // Remove existing notification if any
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = "0";
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
    const container = document.createElement("div");
    container.className = "filter-container";

    const filterButton = document.createElement("button");
    filterButton.className = `filter-button ${isActive ? "active" : ""}`;
    filterButton.innerHTML = `
            <span class="filter-icon">★</span>
            <span class="filter-text">Favorites</span>
        `;
    filterButton.setAttribute("aria-label", isActive ? "Show all festivals" : "Show favorites only");
    filterButton.title = isActive ? "Show all festivals" : "Show favorites only";

    container.appendChild(filterButton);

    return container;
  }

  /**
   * Update filter button appearance based on state
   * @param {HTMLElement} filterButtonContainer - The filter button container element
   * @param {boolean} isActive - Whether the filter is active
   */
  static updateFilterButton(filterButtonContainer, isActive) {
    // Find the actual button element within the container
    const filterButton = filterButtonContainer.querySelector(".filter-button");

    if (!filterButton) return;

    if (isActive) {
      filterButton.classList.add("active");
      filterButton.setAttribute("aria-label", "Show all festivals");
      filterButton.title = "Show all festivals";
    } else {
      filterButton.classList.remove("active");
      filterButton.setAttribute("aria-label", "Show favorites only");
      filterButton.title = "Show favorites only";
    }
  }

  /**
   * Add event listeners to filter button
   * @param {HTMLElement} filterButtonContainer - The filter button container element
   * @param {Function} callback - Callback function to execute on interaction
   */
  static addFilterButtonEventListeners(filterButtonContainer, callback) {
    // Find the actual button element within the container
    const filterButton = filterButtonContainer.querySelector(".filter-button");

    if (!filterButton) return;

    // Click event
    filterButton.addEventListener("click", (e) => {
      e.preventDefault();
      callback();
    });

    // Keyboard event (Enter and Space)
    filterButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        callback();
      }
    });
  }

  /**
   * Create a multi-selection bands filter dropdown
   * @param {Array} allBands - Array of all available band names
   * @param {Array} selectedBands - Array of currently selected band names
   * @returns {HTMLElement} Bands filter container element
   */
  static createBandsFilter(allBands, selectedBands = []) {
    const container = document.createElement("div");
    container.className = "filter-container";

    // Create toggle button
    const toggleButton = document.createElement("button");
    toggleButton.className = "bands-filter-toggle";
    toggleButton.innerHTML = `
            <span class="bands-filter-icon">🎸</span>
            <span class="bands-filter-text">Bands</span>
            <span class="bands-filter-count">${selectedBands.length > 0 ? selectedBands.length : ""}</span>
        `;
    toggleButton.setAttribute("aria-label", `Filter by bands (${selectedBands.length} selected)`);
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.title =
      selectedBands.length > 0 ? `Filter by bands (${selectedBands.length} selected)` : "Filter by bands";

    // Create dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "bands-filter-dropdown";
    dropdown.style.display = "none";

    // Create clear all button
    const clearAllButton = document.createElement("button");
    clearAllButton.className = "bands-filter-clear-all";
    clearAllButton.innerHTML = "🗑️ Clear All";
    clearAllButton.title = "Clear all selected bands";
    dropdown.appendChild(clearAllButton);

    // Create search input
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "bands-filter-search";
    searchInput.placeholder = "Search bands...";
    dropdown.appendChild(searchInput);

    // Create bands list
    const bandsList = document.createElement("div");
    bandsList.className = "bands-filter-list";
    dropdown.appendChild(bandsList);

    container.appendChild(toggleButton);
    container.appendChild(dropdown);

    return container;
  }

  /**
   * Update bands filter display
   * @param {HTMLElement} container - The bands filter container
   * @param {Array} allBands - Array of all available band names
   * @param {Array} selectedBands - Array of currently selected band names
   */
  static updateBandsFilter(container, allBands, selectedBands) {
    const toggleButton = container.querySelector(".bands-filter-toggle");
    const countSpan = toggleButton.querySelector(".bands-filter-count");
    if (countSpan) {
      countSpan.textContent = selectedBands.length > 0 ? selectedBands.length : "";
    }
    toggleButton.title =
      selectedBands.length > 0 ? `Filter by bands (${selectedBands.length} selected)` : "Filter by bands";
    toggleButton.setAttribute("aria-label", `Filter by bands (${selectedBands.length} selected)`);

    const bandsList = container.querySelector(".bands-filter-list");
    const searchInput = container.querySelector(".bands-filter-search");
    const searchTerm = searchInput.value.toLowerCase();

    // Separate selected and unselected bands
    const unselectedBands = allBands.filter((band) => !selectedBands.includes(band));

    // Filter unselected bands based on search
    const filteredUnselectedBands = unselectedBands.filter((band) => band.toLowerCase().includes(searchTerm));

    bandsList.innerHTML = "";

    // Add selected bands section (always visible)
    if (selectedBands.length > 0) {
      const selectedSection = document.createElement("div");
      selectedSection.className = "bands-filter-selected-section";

      const sectionHeader = document.createElement("div");
      sectionHeader.className = "bands-filter-section-header";
      sectionHeader.textContent = `Selected Bands (${selectedBands.length})`;
      selectedSection.appendChild(sectionHeader);

      selectedBands.forEach((band) => {
        const bandItem = document.createElement("label");
        bandItem.className = "bands-filter-item selected";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = band;
        checkbox.checked = true;

        const bandName = document.createElement("span");
        bandName.textContent = band;
        bandName.title = band; // Tooltip for full name

        bandItem.appendChild(checkbox);
        bandItem.appendChild(bandName);
        selectedSection.appendChild(bandItem);
      });

      bandsList.appendChild(selectedSection);
    }

    // Add unselected bands that match the search
    filteredUnselectedBands.forEach((band) => {
      const bandItem = document.createElement("label");
      bandItem.className = "bands-filter-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = band;
      checkbox.checked = false;

      const bandName = document.createElement("span");
      bandName.textContent = band;
      bandName.title = band; // Tooltip for full name

      bandItem.appendChild(checkbox);
      bandItem.appendChild(bandName);
      bandsList.appendChild(bandItem);
    });
  }

  /**
   * Add event listeners to bands filter
   * @param {HTMLElement} container - The bands filter container
   * @param {Object} callbacks - Object with callback functions
   */
  static addBandsFilterEventListeners(container, callbacks) {
    const toggleButton = container.querySelector(".bands-filter-toggle");
    const dropdown = container.querySelector(".bands-filter-dropdown");
    const clearAllButton = container.querySelector(".bands-filter-clear-all");
    const searchInput = container.querySelector(".bands-filter-search");
    const bandsList = container.querySelector(".bands-filter-list");

    // Toggle dropdown
    toggleButton.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = dropdown.style.display !== "none";
      dropdown.style.display = isOpen ? "none" : "block";
      toggleButton.setAttribute("aria-expanded", !isOpen);

      // Update the bands list when opening the dropdown
      if (!isOpen && callbacks.onDropdownOpen) {
        callbacks.onDropdownOpen();
      }
    });

    // Clear all bands
    clearAllButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (callbacks.onClearAll) {
        callbacks.onClearAll();
      }
    });

    // Search input
    searchInput.addEventListener("input", (e) => {
      if (callbacks.onSearch) {
        callbacks.onSearch(e.target.value);
      }
    });

    // Band selection
    bandsList.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        const bandName = e.target.value;
        const isSelected = e.target.checked;
        if (callbacks.onBandToggle) {
          callbacks.onBandToggle(bandName, isSelected);
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        dropdown.style.display = "none";
        toggleButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  /**
   * Highlight selected bands in a band list
   * @param {HTMLElement} bandsList - The bands list container
   * @param {Array} selectedBands - Array of selected band names
   */
  static highlightSelectedBands(bandsList, selectedBands) {
    const bandTags = bandsList.querySelectorAll(".band-tag");
    bandTags.forEach((tag) => {
      const bandName = tag.textContent;
      if (selectedBands.includes(bandName)) {
        tag.classList.add("highlighted");
      } else {
        tag.classList.remove("highlighted");
      }
    });
  }

  /**
   * Create search filter input
   * @param {string} initialValue - Initial search text value
   * @returns {HTMLElement} Search filter container
   */
  static createSearchFilter(initialValue = "") {
    const container = document.createElement("div");
    container.className = "filter-container search-filter-container";

    const searchWrapper = document.createElement("div");
    searchWrapper.className = "search-filter-wrapper";

    const searchIcon = document.createElement("span");
    searchIcon.className = "search-filter-icon";
    searchIcon.innerHTML = "🔍";
    searchIcon.setAttribute("aria-hidden", "true");

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "search-filter-input";
    searchInput.placeholder = "Search festivals...";
    searchInput.value = initialValue;
    searchInput.setAttribute("aria-label", "Search festivals by name, location, bands, or genres");

    const clearButton = document.createElement("button");
    clearButton.className = "search-filter-clear";
    clearButton.innerHTML = "✕";
    clearButton.title = "Clear search";
    clearButton.setAttribute("aria-label", "Clear search");
    clearButton.style.display = initialValue ? "block" : "none";

    searchWrapper.appendChild(searchIcon);
    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(clearButton);
    container.appendChild(searchWrapper);

    return container;
  }

  /**
   * Add event listeners to search filter
   * @param {HTMLElement} container - The search filter container
   * @param {Object} callbacks - Object with callback functions (onSearch, onClear)
   */
  static addSearchFilterEventListeners(container, callbacks) {
    const searchInput = container.querySelector(".search-filter-input");
    const clearButton = container.querySelector(".search-filter-clear");
    let searchTimeout = null;

    // Handle input with debounce
    searchInput.addEventListener("input", (e) => {
      const value = e.target.value;

      // Show/hide clear button
      clearButton.style.display = value ? "block" : "none";

      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set new timeout for search
      searchTimeout = setTimeout(() => {
        if (callbacks.onSearch) {
          callbacks.onSearch(value);
        }
      }, 500);
    });

    // Handle clear button
    clearButton.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.value = "";
      clearButton.style.display = "none";
      searchInput.focus();

      if (callbacks.onClear) {
        callbacks.onClear();
      }
    });

    // Handle Enter key
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        if (callbacks.onSearch) {
          callbacks.onSearch(searchInput.value);
        }
      }
    });
  }
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = UIUtils;
}
