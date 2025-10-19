// Main Admin Script - Initializes and coordinates all admin functionality

// Global instances
let bandReviewManager;
let bandEditForm;

// Initialize the admin page
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize managers
  bandReviewManager = new BandReviewManager();
  bandEditForm = new BandEditForm();

  bandEditForm.init();

  // Set up callbacks
  bandReviewManager.onBandSelect = (band, index) => {
    bandEditForm.loadBand(band);
    updateNavigationButtons();
  };

  bandEditForm.onBandUpdated = (band) => {
    // If band is marked as reviewed, remove it from the list
    if (band.reviewed === true) {
      bandReviewManager.removeBand(band.key);

      // Load the next band if available
      const nextBand = bandReviewManager.getCurrentBand();
      if (nextBand) {
        bandEditForm.loadBand(nextBand);
      } else {
        bandEditForm.showPlaceholder();
      }
    }

    updateNavigationButtons();
  };

  // Load bands
  await bandReviewManager.loadBands();

  // Set up event listeners
  setupEventListeners();
});

/**
 * Set up event listeners for navigation and sorting
 */
function setupEventListeners() {
  // Sort toggle
  const sortToggle = document.getElementById("sortToggle");
  if (sortToggle) {
    sortToggle.addEventListener("click", () => {
      bandReviewManager.toggleSortOrder();
    });
  }

  // Navigation arrows
  const prevButton = document.getElementById("prevBand");
  const nextButton = document.getElementById("nextBand");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (bandReviewManager.navigatePrevious()) {
        updateNavigationButtons();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (bandReviewManager.navigateNext()) {
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

  if (prevButton) {
    prevButton.disabled = !bandReviewManager.canNavigatePrevious();
  }

  if (nextButton) {
    nextButton.disabled = !bandReviewManager.canNavigateNext();
  }
}
