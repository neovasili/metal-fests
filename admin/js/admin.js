// Main Admin Script - Initializes and coordinates all admin functionality

// Global instances
let bandReviewManager;
let bandReviewedManager;
let bandEditForm;
let activeTab = "review"; // 'review' or 'reviewed'

// Initialize the admin page
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize managers
  bandReviewManager = new BandReviewManager();
  bandReviewedManager = new BandReviewedManager();
  bandEditForm = new BandEditForm();

  bandEditForm.init();

  // Set up callbacks for review manager
  bandReviewManager.onBandSelect = (band, index) => {
    bandEditForm.loadBand(band);
    updateNavigationButtons();
  };

  bandReviewManager.onBandRemoved = (bandKey) => {
    // Band was marked as reviewed, move to reviewed tab
    bandReviewedManager.refresh();
  };

  // Set up callbacks for reviewed manager
  bandReviewedManager.onBandSelect = (band, index) => {
    bandEditForm.loadBand(band);
    updateNavigationButtons();
  };

  bandReviewedManager.onBandRemoved = (bandKey) => {
    // Band was unmarked as reviewed, move to review tab
    bandReviewManager.refresh();
  };

  // Handle band updates
  bandEditForm.onBandUpdated = (band) => {
    // If band review status changed, update lists
    if (activeTab === "review" && band.reviewed === true) {
      // Band was marked as reviewed, remove from review list
      bandReviewManager.removeBand(band.key);

      // Load the next band if available
      const nextBand = bandReviewManager.getCurrentBand();
      if (nextBand) {
        bandEditForm.loadBand(nextBand);
      } else {
        bandEditForm.showPlaceholder();
      }
    } else if (activeTab === "reviewed" && band.reviewed === false) {
      // Band was unmarked as reviewed, remove from reviewed list
      bandReviewedManager.removeBand(band.key);

      // Load the next band if available
      const nextBand = bandReviewedManager.getCurrentBand();
      if (nextBand) {
        bandEditForm.loadBand(nextBand);
      } else {
        bandEditForm.showPlaceholder();
      }
    }

    updateNavigationButtons();
  };

  // Load bands for both tabs
  await Promise.all([bandReviewManager.loadBands(), bandReviewedManager.loadBands()]);

  // Try to restore last selected tab and band from localStorage
  restoreLastSession();

  // Set up event listeners
  setupEventListeners();
});

/**
 * Restore the last active tab and selected band from localStorage
 */
function restoreLastSession() {
  // Restore active tab
  const savedTab = localStorage.getItem("adminActiveTab");
  if (savedTab && (savedTab === "review" || savedTab === "reviewed")) {
    switchTab(savedTab);
  } else {
    // Default to review tab
    switchTab("review");
  }

  // Try to restore selected band
  const savedBandKey = bandEditForm.getSelectedBandKey();

  if (savedBandKey) {
    const currentManager = activeTab === "review" ? bandReviewManager : bandReviewedManager;
    const bandIndex = currentManager.filteredBands.findIndex((band) => band.key === savedBandKey);

    if (bandIndex !== -1) {
      currentManager.selectBand(bandIndex);
      console.log(`✅ Restored selected band: ${savedBandKey}`);
    } else {
      // Band not found in current tab
      bandEditForm.clearSelectedBand();
      console.log(`⚠️  Previously selected band not found: ${savedBandKey}`);
    }
  }
}

/**
 * Switch between review and reviewed tabs
 */
function switchTab(tab) {
  if (tab !== "review" && tab !== "reviewed") return;

  activeTab = tab;
  localStorage.setItem("adminActiveTab", tab);

  // Update tab buttons
  const reviewTab = document.querySelector('[data-tab="review"]');
  const reviewedTab = document.querySelector('[data-tab="reviewed"]');

  if (reviewTab) {
    reviewTab.classList.toggle("active", tab === "review");
  }
  if (reviewedTab) {
    reviewedTab.classList.toggle("active", tab === "reviewed");
  }

  // Show/hide corresponding sections
  const reviewSection = document.getElementById("reviewTab");
  const reviewedSection = document.getElementById("reviewedTab");

  if (reviewSection) {
    reviewSection.style.display = tab === "review" ? "block" : "none";
  }
  if (reviewedSection) {
    reviewedSection.style.display = tab === "reviewed" ? "block" : "none";
  }

  // Update navigation buttons for active tab
  updateNavigationButtons();

  console.log(`Switched to ${tab} tab`);
}

/**
 * Set up event listeners for navigation, sorting, and tabs
 */
function setupEventListeners() {
  // Tab switching
  const tabButtons = document.querySelectorAll(".admin-tab");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.getAttribute("data-tab");
      switchTab(tab);
    });
  });

  // Sort toggle for review tab
  const sortToggle = document.getElementById("sortToggle");
  if (sortToggle) {
    sortToggle.addEventListener("click", () => {
      bandReviewManager.toggleSortOrder();
    });
  }

  // Sort toggle for reviewed tab
  const sortToggleReviewed = document.getElementById("sortToggleReviewed");
  if (sortToggleReviewed) {
    sortToggleReviewed.addEventListener("click", () => {
      bandReviewedManager.toggleSortOrder();
    });
  }

  // Navigation arrows
  const prevButton = document.getElementById("prevBand");
  const nextButton = document.getElementById("nextBand");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      const currentManager = activeTab === "review" ? bandReviewManager : bandReviewedManager;
      if (currentManager.navigatePrevious()) {
        updateNavigationButtons();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      const currentManager = activeTab === "review" ? bandReviewManager : bandReviewedManager;
      if (currentManager.navigateNext()) {
        updateNavigationButtons();
      }
    });
  }
}

/**
 * Update navigation button states
 */
function updateNavigationButtons() {
  const prevButton = document.getElementById("prevBand");
  const nextButton = document.getElementById("nextBand");
  const currentManager = activeTab === "review" ? bandReviewManager : bandReviewedManager;

  if (prevButton) {
    prevButton.disabled = !currentManager.canNavigatePrevious || currentManager.currentBandIndex <= 0;
  }

  if (nextButton) {
    nextButton.disabled =
      !currentManager.canNavigateNext || currentManager.currentBandIndex >= currentManager.filteredBands.length - 1;
  }
}
