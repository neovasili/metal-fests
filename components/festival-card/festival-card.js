/**
 * FestivalCard Component
 * A reusable component for rendering festival cards in both timeline and map views
 */

class FestivalCard {
  /**
   * HTML template for the festival card
   * @private
   */
  static template = null;

  /**
   * Load the HTML template
   * Fetches the template from the server once and caches it for reuse
   * @returns {Promise<string>} The HTML template string
   */
  static async loadTemplate() {
    if (!this.template) {
      const response = await fetch("components/festival-card/festival-card.html");
      const html = await response.text();
      // Parse the HTML document and extract just the .festival-card element
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const cardElement = doc.querySelector(".festival-card");
      this.template = cardElement ? cardElement.outerHTML : html;
    }
    return this.template;
  }

  /**
   * Check if the template is already loaded
   * @returns {boolean} True if template is cached
   */
  static isTemplateLoaded() {
    return this.template !== null;
  }

  /**
   * Format a date range for display
   * @param {Date} startDate - The start date
   * @param {Date} endDate - The end date
   * @returns {string} The formatted date range
   */
  static formatDateRange(startDate, endDate) {
    const options = { month: "short", day: "numeric" };

    if (startDate.getTime() === endDate.getTime()) {
      return startDate.toLocaleDateString("en-US", options);
    } else if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.toLocaleDateString("en-US", { month: "short" })} ${startDate.getDate()}-${endDate.getDate()}`;
    } else {
      return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
    }
  }

  /**
   * Create band tags HTML with clickable links for bands with complete info
   * @param {Array<string>} bands - Array of band names
   * @param {Object} bandManager - Band manager instance
   * @returns {string} HTML string for band tags
   */
  static createBandTagsHTML(bands, bandManager) {
    if (bands.length === 0) {
      return '<span class="band-tag">Coming soon...</span>';
    }

    return bands
      .map((band) => {
        const hasCompleteInfo = bandManager.hasCompleteInfo(band);
        const bandData = bandManager.getBandByName(band);
        const clickableClass = hasCompleteInfo ? " clickable" : "";
        const dataKey = hasCompleteInfo && bandData ? ` data-band-key="${bandData.key}"` : "";
        return `<span class="band-tag${clickableClass}"${dataKey}>${band}</span>`;
      })
      .join("");
  }

  /**
   * Render a festival card
   * @param {Object} festival - Festival data object
   * @param {Object} options - Rendering options
   * @param {Object} options.bandManager - Band manager instance
   * @param {Object} options.favoritesManager - Favorites manager instance
   * @param {boolean} [options.wrapInDiv=false] - Whether to wrap in an outer div (for map view)
   * @returns {Promise<HTMLElement>} The rendered card element
   */
  static async render(festival, options = {}) {
    const { bandManager, favoritesManager, wrapInDiv = false } = options;

    // Load template
    const template = await this.loadTemplate();

    // Format dates
    const startDate = new Date(festival.dates.start);
    const endDate = new Date(festival.dates.end);
    const formattedDates = this.formatDateRange(startDate, endDate);

    // Create band tags HTML
    const bandTagsHTML = this.createBandTagsHTML(festival.bands, bandManager);

    const festivalPrice = festival.ticketPrice ? `From ${festival.ticketPrice}€` : "Price not available";

    // Replace template placeholders
    const html = template
      .replace(/\{\{poster\}\}/g, festival.poster)
      .replace(/\{\{name\}\}/g, festival.name)
      .replace(/\{\{dates\}\}/g, formattedDates)
      .replace(/\{\{location\}\}/g, festival.location)
      .replace(/\{\{bands\}\}/g, bandTagsHTML)
      .replace(/\{\{ticketPrice\}\}/g, festivalPrice)
      .replace(/\{\{website\}\}/g, festival.website);

    // Create element from HTML
    const container = document.createElement("div");
    container.innerHTML = html.trim();
    const card = container.firstChild;

    // Wrap in div for map view if requested
    if (wrapInDiv) {
      const wrapper = document.createElement("div");
      wrapper.appendChild(card);
      // For map view, return the wrapper with the card inside
      // Add favorite and band handlers to the card before wrapping
      if (favoritesManager) {
        this.addFavoriteFeature(card, festival, favoritesManager);
      }
      if (bandManager) {
        this.addBandClickHandlers(card, bandManager);
      }
      return wrapper;
    }

    // Add favorite feature
    if (favoritesManager) {
      this.addFavoriteFeature(card, festival, favoritesManager);
    }

    // Add click handlers for clickable band tags
    if (bandManager) {
      this.addBandClickHandlers(card, bandManager);
    }

    return card;
  }

  /**
   * Add favorite star functionality to a card
   * @param {HTMLElement} card - The card element
   * @param {Object} festival - Festival data
   * @param {Object} favoritesManager - Favorites manager instance
   */
  static addFavoriteFeature(card, festival, favoritesManager) {
    const favoriteContainer = card.querySelector(".favorite-container");
    if (!favoriteContainer) return;

    const isFavorite = favoritesManager.isFavorite(festival.name);

    // Create star icon
    const starIcon = UIUtils.createStarIcon(isFavorite);

    // Add event listeners
    UIUtils.addStarEventListeners(starIcon, () => {
      const newStatus = favoritesManager.toggleFavorite(festival.name);
      UIUtils.updateStarIcon(starIcon, newStatus);

      // Show notification
      const message = newStatus ? `${festival.name} added to favorites` : `${festival.name} removed from favorites`;
      UIUtils.showNotification(message, "success");

      // Trigger a custom event that parent components can listen to
      card.dispatchEvent(
        new CustomEvent("favoriteToggled", {
          bubbles: true,
          detail: { festival, newStatus },
        }),
      );
    });

    favoriteContainer.appendChild(starIcon);
  }

  /**
   * Add click handlers for clickable band tags
   * @param {HTMLElement} card - The card element
   * @param {Object} bandManager - Band manager instance
   */
  static addBandClickHandlers(card, bandManager) {
    const clickableBands = card.querySelectorAll(".band-tag.clickable");
    clickableBands.forEach((bandTag) => {
      bandTag.addEventListener("click", (e) => {
        e.stopPropagation();
        const bandKey = bandTag.getAttribute("data-band-key");
        if (bandKey) {
          bandManager.showBand(bandKey, false);
        }
      });
    });
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = FestivalCard;
}
