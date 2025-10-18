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

    if (band) {
      // Band exists! Hide error content and show band page
      hideErrorContent();
      renderBandPage(band);
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

function renderBandPage(band) {
  // Update page title
  document.title = `${band.name} - Metal Festivals 2026`;

  // Create a container for the band page
  const main = document.createElement("main");
  main.className = "standalone-band-page";

  const bandHTML = `
    <div class="band-modal-overlay active">
      <div class="band-modal">
        <button class="band-modal-close" aria-label="Close band details" onclick="window.location.href='/'">×</button>
        <div class="band-modal-header">
          <img src="${band.logo}" alt="${band.name} Logo" class="band-modal-logo">
          <h2 class="band-modal-name">${band.name}</h2>
          <p class="band-modal-country">${band.country}</p>
        </div>
        <div class="band-modal-content">
          <img src="${band.headlineImage}" alt="${band.name} Band Photo" class="band-modal-headline-image">
          <div class="band-modal-section">
            <h3>About</h3>
            <p class="band-modal-description">${band.description}</p>
          </div>
          <div class="band-modal-section">
            <h3>Genres</h3>
            <div class="band-modal-genres">
              ${band.genres.map((genre) => `<span class="band-modal-genre-tag">${genre}</span>`).join("")}
            </div>
          </div>
          <div class="band-modal-section">
            <h3>Members</h3>
            <div class="band-modal-members">
              ${band.members
                .map(
                  (member) => `
                <div class="band-modal-member">
                  <div class="band-modal-member-name">${member.name}</div>
                  <div class="band-modal-member-role">${member.role}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
        <div class="band-modal-actions">
          <a href="${band.website}" target="_blank" rel="noopener noreferrer" class="band-modal-button">
            <svg viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm-1 5v10h2V7h-2zm0-3v2h2V4h-2z"/>
            </svg>
            Official Website
          </a>
          <a href="${band.spotify}" target="_blank" rel="noopener noreferrer" class="band-modal-button">
            <svg viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Listen on Spotify
          </a>
        </div>
      </div>
    </div>
  `;

  main.innerHTML = bandHTML;

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
