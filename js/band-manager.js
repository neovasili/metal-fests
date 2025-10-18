// Band Manager - handles band modal display and routing
class BandManager {
  constructor() {
    this.bands = [];
    this.currentBand = null;
    this.modalOverlay = null;
    this.isStandalone = false;
  }

  async loadBands() {
    try {
      const response = await fetch("/db.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.bands = data.bands || [];
      return this.bands;
    } catch (error) {
      console.error("Error loading bands:", error);
      return [];
    }
  }

  getBandByKey(key) {
    return this.bands.find((band) => band.key === key);
  }

  getBandByName(name) {
    // Normalize the name for comparison
    const normalizedName = name.toLowerCase().trim();
    return this.bands.find((band) => band.name.toLowerCase() === normalizedName);
  }

  hasCompleteInfo(bandName) {
    const band = this.getBandByName(bandName);
    if (!band) return false;

    // Check if band has all required fields
    return (
      band.key &&
      band.name &&
      band.description &&
      band.logo &&
      band.headlineImage &&
      band.website &&
      band.spotify &&
      band.genres &&
      band.genres.length > 0 &&
      band.members &&
      band.members.length > 0
    );
  }

  createModal() {
    // Remove existing modal if any
    if (this.modalOverlay) {
      this.modalOverlay.remove();
    }

    this.modalOverlay = document.createElement("div");
    this.modalOverlay.className = "band-modal-overlay";
    this.modalOverlay.innerHTML = `
      <div class="band-modal">
        <button class="band-modal-close" aria-label="Close band details">×</button>
        <div class="band-modal-header">
          <img src="" alt="" class="band-modal-logo">
          <h2 class="band-modal-name"></h2>
          <p class="band-modal-country"></p>
        </div>
        <div class="band-modal-content">
          <img src="" alt="" class="band-modal-headline-image">
          <div class="band-modal-section">
            <h3>About</h3>
            <p class="band-modal-description"></p>
          </div>
          <div class="band-modal-section">
            <h3>Genres</h3>
            <div class="band-modal-genres"></div>
          </div>
          <div class="band-modal-section">
            <h3>Members</h3>
            <div class="band-modal-members"></div>
          </div>
        </div>
        <div class="band-modal-actions">
          <a href="" target="_blank" rel="noopener noreferrer" class="band-modal-button">
            <svg viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm-1 5v10h2V7h-2zm0-3v2h2V4h-2z"/>
            </svg>
            Official Website
          </a>
          <a href="" target="_blank" rel="noopener noreferrer" class="band-modal-button">
            <svg viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Listen on Spotify
          </a>
        </div>
      </div>
    `;

    // Add event listeners
    const closeButton = this.modalOverlay.querySelector(".band-modal-close");
    closeButton.addEventListener("click", () => this.closeModal());

    // Close modal when clicking outside
    this.modalOverlay.addEventListener("click", (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    // Close modal on ESC key
    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        this.closeModal();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);

    document.body.appendChild(this.modalOverlay);
  }

  populateModal(band) {
    if (!this.modalOverlay) return;

    // Update header
    const logo = this.modalOverlay.querySelector(".band-modal-logo");
    logo.src = band.logo;
    logo.alt = `${band.name} Logo`;

    const name = this.modalOverlay.querySelector(".band-modal-name");
    name.textContent = band.name;

    const country = this.modalOverlay.querySelector(".band-modal-country");
    country.textContent = band.country;

    // Update headline image
    const headlineImage = this.modalOverlay.querySelector(".band-modal-headline-image");
    headlineImage.src = band.headlineImage;
    headlineImage.alt = `${band.name} Band Photo`;

    // Update description
    const description = this.modalOverlay.querySelector(".band-modal-description");
    description.textContent = band.description;

    // Update genres
    const genresContainer = this.modalOverlay.querySelector(".band-modal-genres");
    genresContainer.innerHTML = band.genres
      .map((genre) => `<span class="band-modal-genre-tag">${genre}</span>`)
      .join("");

    // Update members
    const membersContainer = this.modalOverlay.querySelector(".band-modal-members");
    membersContainer.innerHTML = band.members
      .map(
        (member) => `
      <div class="band-modal-member">
        <div class="band-modal-member-name">${member.name}</div>
        <div class="band-modal-member-role">${member.role}</div>
      </div>
    `,
      )
      .join("");

    // Update action buttons
    const buttons = this.modalOverlay.querySelectorAll(".band-modal-button");
    buttons[0].href = band.website;
    buttons[1].href = band.spotify;
  }

  showBand(bandKey, isStandalone = false) {
    this.isStandalone = isStandalone;
    const band = this.getBandByKey(bandKey);

    if (!band) {
      console.error(`Band not found: ${bandKey}`);
      return false;
    }

    this.currentBand = band;
    this.createModal();
    this.populateModal(band);

    // Show modal with animation
    requestAnimationFrame(() => {
      this.modalOverlay.classList.add("active");
    });

    // Update URL if not standalone
    if (!isStandalone && window.history) {
      const newUrl = `/bands/${bandKey}`;
      window.history.pushState({ band: bandKey }, "", newUrl);
    }

    return true;
  }

  closeModal() {
    if (!this.modalOverlay) return;

    this.modalOverlay.classList.remove("active");

    setTimeout(() => {
      if (this.modalOverlay) {
        this.modalOverlay.remove();
        this.modalOverlay = null;
      }
    }, 300);

    this.currentBand = null;

    // Update URL back to previous page if not standalone
    if (!this.isStandalone && window.history) {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/bands/")) {
        window.history.back();
      }
    }
  }

  // Create standalone band page
  createStandalonePage(bandKey) {
    const band = this.getBandByKey(bandKey);

    if (!band) {
      // Show 404 error
      document.body.innerHTML = `
        <header class="header">
          <div class="header-content">
            <div class="header-left">
              <h1>Metal Festivals 2026</h1>
            </div>
          </div>
        </header>
        <main class="standalone-band-page">
          <div style="text-align: center; padding: 4rem; color: #ff4444;">
            <h2>Band Not Found</h2>
            <p>The band you're looking for doesn't exist in our database.</p>
            <a href="/" style="color: #ff6b00; text-decoration: underline;">Return to Timeline</a>
          </div>
        </main>
        <footer>
          <p>Made with ❤️ by <em>Camaradas del Metal Candente</em> @ 2025</p>
        </footer>
      `;
      return;
    }

    // Create standalone page structure
    document.body.className = "standalone-band-page";

    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = "";
      main.className = "standalone-band-page";

      this.createModal();
      this.populateModal(band);
      this.modalOverlay.classList.add("active");

      main.appendChild(this.modalOverlay);
    }
  }

  // Initialize band manager
  async init() {
    await this.loadBands();

    // Check if we're on a band page
    const path = window.location.pathname;
    const bandMatch = path.match(/^\/bands\/([a-z0-9-]+)$/);

    if (bandMatch) {
      const bandKey = bandMatch[1];
      this.createStandalonePage(bandKey);
    }

    // Handle popstate for browser back/forward buttons
    window.addEventListener("popstate", (e) => {
      if (e.state && e.state.band) {
        this.showBand(e.state.band, false);
      } else if (this.currentBand && !this.isStandalone) {
        this.closeModal();
      }
    });
  }
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.BandManager = BandManager;
}
