// Error Page JavaScript

// Check if this is actually a band route that should be handled
async function checkAndHandleBandRoute() {
  const path = window.location.pathname;
  const bandRoutePattern = /^\/bands\/([a-z0-9-]+)$/;
  const bandMatch = path.match(bandRoutePattern);

  if (bandMatch) {
    const bandKey = bandMatch[1];

    // Initialize BandManager and try to load the band
    const bandManager = new BandManager();
    await bandManager.loadBands();

    const band = bandManager.getBandByKey(bandKey);

    if ((band && band.reviewed === true) || (band && bandManager.isLocalHost())) {
      // Band exists and is reviewed! Hide error content and show band page
      hideErrorContent();
      renderBandPage(band, bandManager);
      return true;
    }
  }

  return false;
}

function hideErrorContent() {
  const errorContainer = document.querySelector(".error-container");
  if (errorContainer) {
    errorContainer.style.display = "none";
  }
}

function renderBandPage(band, bandManager) {
  // Update page title
  document.title = `${band.name} - Metal Festivals 2026`;

  // Create a container for the band page
  const main = document.createElement("main");
  main.className = "standalone-band-page";

  // Use BandManager's shared HTML generation method
  main.innerHTML = bandManager.generateBandHTML(band, true);

  // Insert after header
  const header = document.querySelector("header");
  if (header) {
    header.after(main);
  }
}

function goBack() {
  // Try to go back in history, otherwise go to home
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "/";
  }
}

// Check for band routes when the page loads
document.addEventListener("DOMContentLoaded", async () => {
  await checkAndHandleBandRoute();
});
