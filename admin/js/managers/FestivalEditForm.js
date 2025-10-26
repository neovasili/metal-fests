class FestivalEditForm {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`FestivalEditForm container not found: ${containerId}`);
      return;
    }
    this.onSave = options.onSave || null;
    this.onCancel = options.onCancel || null;
    this.currentFestival = null;
    this.bands = [];
    this.saveTimeout = null;
    this.saveDelay = 2000; // 2 seconds for auto-save
    this.isSaving = false;
    this.urlValidationCache = new Map();
    this.urlValidationTimeouts = {};
  }

  async init() {
    await this.loadBands();
    this.setupEventListeners();
  }

  async loadBands() {
    try {
      const response = await fetch("/db.json");
      if (!response.ok) {
        throw new Error("Failed to load bands database");
      }
      const data = await response.json();
      const reviewedBands = data.bands?.filter((band) => band.reviewed) || [];
      this.bands = reviewedBands.map((band) => band.name).sort();
    } catch (error) {
      console.error("Error loading bands:", error);
    }
  }

  setupEventListeners() {
    const form = this.container.querySelector("#festivalForm");
    const cancelBtn = this.container.querySelector("#cancelBtn");
    const selectedBands = this.container.querySelector("#selectedBands");
    const bandsDropdown = this.container.querySelector("#bandsDropdown");
    const bandsSearch = this.container.querySelector("#bandsSearch");
    const bandsOptions = this.container.querySelector("#bandsOptions");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        if (this.onCancel) {
          this.onCancel();
        }
      });
    }

    // Auto-save on text inputs
    const textFields = this.container.querySelectorAll("input[data-field], textarea[data-field]");
    textFields.forEach((field) => {
      field.addEventListener("input", (e) => this.handleFieldChange(e));
    });

    // Image preview handlers
    const imageFields = this.container.querySelectorAll("input[data-preview]");
    imageFields.forEach((field) => {
      field.addEventListener("input", (e) => this.handleImagePreviewUpdate(e));
    });

    // URL validation handlers
    const websiteField = this.container.querySelector("#festivalWebsite");
    if (websiteField) {
      websiteField.addEventListener("input", (e) => {
        this.updateUrlLink("festivalWebsiteLink", e.target.value);
        this.scheduleUrlValidation(e.target.value, "festivalWebsite");
      });
    }

    if (selectedBands && bandsDropdown) {
      selectedBands.addEventListener("click", () => {
        bandsDropdown.classList.toggle("open");
      });

      document.addEventListener("click", (e) => {
        if (!selectedBands.contains(e.target) && !bandsDropdown.contains(e.target)) {
          bandsDropdown.classList.remove("open");
        }
      });
    }

    if (bandsSearch) {
      bandsSearch.addEventListener("input", (e) => {
        this.filterBands(e.target.value);
      });
    }

    if (bandsOptions) {
      bandsOptions.addEventListener("change", () => {
        this.updateSelectedBands();
        this.scheduleAutoSave();
      });
    }
  }

  filterBands(searchTerm) {
    const options = this.container.querySelectorAll(".multiselect-option");
    const term = searchTerm.toLowerCase();

    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      option.style.display = text.includes(term) ? "flex" : "none";
    });
  }

  updateSelectedBands() {
    const checkboxes = this.container.querySelectorAll('#bandsOptions input[type="checkbox"]');
    const selected = Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    const selectedContainer = this.container.querySelector("#selectedBands");
    if (!selectedContainer) return;

    if (selected.length === 0) {
      selectedContainer.innerHTML = '<span class="placeholder">Select bands...</span>';
    } else {
      selectedContainer.innerHTML = selected
        .map(
          (band) => `
        <span class="selected-tag">
          ${this.escapeHtml(band)}
          <button type="button" class="remove-tag" data-band="${this.escapeHtml(band)}">×</button>
        </span>
      `,
        )
        .join("");

      selectedContainer.querySelectorAll(".remove-tag").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const band = btn.getAttribute("data-band");
          this.unselectBand(band);
        });
      });
    }
  }

  unselectBand(band) {
    const checkbox = this.container.querySelector(`#bandsOptions input[value="${band}"]`);
    if (checkbox) {
      checkbox.checked = false;
      this.updateSelectedBands();
    }
  }

  handleFieldChange(event) {
    const field = event.target;
    const fieldName = field.getAttribute("data-field");
    if (!fieldName || !this.currentFestival) return;

    // Update the festival data based on field name
    const fieldMap = {
      name: (val) => (this.currentFestival.name = val),
      startDate: (val) => (this.currentFestival.dates.start = val),
      endDate: (val) => (this.currentFestival.dates.end = val),
      location: (val) => (this.currentFestival.location = val),
      latitude: (val) => (this.currentFestival.coordinates.lat = parseFloat(val)),
      longitude: (val) => (this.currentFestival.coordinates.lng = parseFloat(val)),
      poster: (val) => (this.currentFestival.poster = val),
      website: (val) => (this.currentFestival.website = val),
      ticketPrice: (val) => (this.currentFestival.ticketPrice = parseFloat(val)),
    };

    if (fieldMap[fieldName]) {
      fieldMap[fieldName](field.value);
      this.scheduleAutoSave();
    }
  }

  handleImagePreviewUpdate(event) {
    const field = event.target;
    const previewId = field.getAttribute("data-preview");
    const previewContainer = this.container.querySelector(`#${previewId}`);

    if (!previewContainer) return;

    const url = field.value.trim();

    if (!url) {
      previewContainer.innerHTML = '<div class="loading">No image URL provided</div>';
      return;
    }

    // Show loading state
    previewContainer.innerHTML = '<div class="loading">Loading image...</div>';

    // Create new image to test loading
    const img = new Image();
    img.onload = () => {
      previewContainer.innerHTML = `<img src="${url}" alt="Preview" />`;
    };
    img.onerror = () => {
      previewContainer.innerHTML = '<div class="error">❌ Failed to load image</div>';
    };
    img.src = url;
  }

  scheduleAutoSave() {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Set new timeout
    this.saveTimeout = setTimeout(() => {
      this.autoSave();
    }, this.saveDelay);
  }

  async autoSave() {
    if (!this.currentFestival || this.isSaving) return;

    this.isSaving = true;

    try {
      // Collect current form data
      const formData = this.collectFormData();

      // Trigger save callback with auto-save flag
      if (this.onSave) {
        await this.onSave(formData, true); // true = auto-save
      }

      // Show success notification briefly
      if (window.notificationManager) {
        window.notificationManager.show("Changes saved", "success", 1500);
      }
    } catch (error) {
      console.error("Error auto-saving festival:", error);
      // Show error notification
      if (window.notificationManager) {
        window.notificationManager.show("Failed to save changes", "error", 3000);
      }
    } finally {
      this.isSaving = false;
    }
  }

  updateUrlLink(linkId, url) {
    const link = this.container.querySelector(`#${linkId}`);
    if (!link) return;

    if (url && url.trim()) {
      link.href = url;
      link.style.pointerEvents = "auto";
      link.style.opacity = "1";
    } else {
      link.href = "#";
      link.style.pointerEvents = "none";
      link.style.opacity = "0.3";
    }
  }

  scheduleUrlValidation(url, fieldId) {
    // Clear existing timeout for this field
    if (this.urlValidationTimeouts[fieldId]) {
      clearTimeout(this.urlValidationTimeouts[fieldId]);
    }

    const inputField = this.container.querySelector(`#${fieldId}`);
    if (inputField && url && url.trim()) {
      inputField.style.borderColor = "#555";
      inputField.style.borderWidth = "1px";
      inputField.title = "";
    }

    // Schedule validation after 1.5 seconds of no typing
    this.urlValidationTimeouts[fieldId] = setTimeout(() => {
      if (url && url.trim()) {
        this.validateUrl(url, fieldId);
      }
    }, 1500);
  }

  async validateUrl(url, fieldId) {
    if (!url || !url.trim()) return;

    const inputField = this.container.querySelector(`#${fieldId}`);
    if (!inputField) return;

    // Check cache first
    if (this.urlValidationCache.has(url)) {
      const isValid = this.urlValidationCache.get(url);
      this.applyUrlValidationStyle(inputField, isValid);
      return;
    }

    // Show loading state
    inputField.style.borderColor = "#fbbf24"; // amber/yellow for loading
    inputField.style.borderWidth = "2px";
    inputField.title = "Checking URL...";

    try {
      const response = await fetch("/api/validate-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url }),
      });

      if (!response.ok) {
        throw new Error("Failed to validate URL");
      }

      const result = await response.json();

      // Cache the result
      this.urlValidationCache.set(url, result.valid);

      // Apply styling based on validation result
      this.applyUrlValidationStyle(inputField, result.valid, result.status);
    } catch (error) {
      console.error("Error validating URL:", error);
      // On error, mark as invalid but don't cache (so we can retry later)
      this.applyUrlValidationStyle(inputField, false);
    }
  }

  applyUrlValidationStyle(inputField, isValid, statusCode) {
    if (isValid) {
      inputField.style.borderColor = "#10b981"; // green
      inputField.style.borderWidth = "2px";
      const statusText = statusCode ? ` (HTTP ${statusCode})` : "";
      inputField.title = `URL is reachable ✓${statusText}`;
    } else {
      inputField.style.borderColor = "#ef4444"; // red
      inputField.style.borderWidth = "2px";
      const statusText = statusCode ? ` (HTTP ${statusCode})` : "";
      inputField.title = `URL may be unreachable or invalid ✗${statusText}`;
    }
  }

  searchGoogleImages(fieldType) {
    if (!this.currentFestival || !this.currentFestival.name) {
      alert("Please load a festival first");
      return;
    }

    const festivalName = this.currentFestival.name;
    const searchQuery = `${festivalName} festival logo`;

    const encodedQuery = encodeURIComponent(searchQuery);
    const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodedQuery}`;
    window.open(googleImagesUrl, "_blank", "noopener,noreferrer");
  }

  scrollToTop() {
    const scrollableContainer = this.container.querySelector(".form-content");
    if (scrollableContainer) {
      scrollableContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      this.container.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  handleSubmit() {
    const formData = this.collectFormData();

    if (this.validate(formData)) {
      if (this.onSave) {
        this.onSave(formData, false); // false = manual save
      }
    }
  }

  collectFormData() {
    const form = this.container.querySelector("#festivalForm");
    if (!form) return null;

    const selectedBands = Array.from(this.container.querySelectorAll("#bandsOptions input:checked")).map(
      (cb) => cb.value,
    );

    return {
      key: form.elements.key.value.trim(),
      name: form.elements.name.value.trim(),
      dates: {
        start: form.elements.startDate.value,
        end: form.elements.endDate.value,
      },
      location: form.elements.location.value.trim(),
      coordinates: {
        lat: parseFloat(form.elements.latitude.value),
        lng: parseFloat(form.elements.longitude.value),
      },
      poster: form.elements.poster.value.trim(),
      website: form.elements.website.value.trim(),
      bands: selectedBands,
      ticketPrice: parseFloat(form.elements.ticketPrice.value),
    };
  }

  generateKey(name) {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with dashes
      .replace(/[^a-z0-9-]/g, "") // Remove any character that's not alphanumeric or dash
      .replace(/-+/g, "-") // Replace multiple dashes with single dash
      .replace(/^-|-$/g, ""); // Remove leading/trailing dashes
  }

  validate(festival) {
    if (!festival.key || festival.key.length < 2) {
      window.notificationManager?.show("Festival key must be at least 2 characters", "error");
      return false;
    }

    // Validate key format (only lowercase letters, numbers, and dashes)
    const keyPattern = /^[a-z0-9-]+$/;
    if (!keyPattern.test(festival.key)) {
      window.notificationManager?.show("Festival key can only contain lowercase letters, numbers, and dashes", "error");
      return false;
    }

    if (!festival.name || festival.name.length < 2) {
      window.notificationManager?.show("Festival name must be at least 2 characters", "error");
      return false;
    }

    if (!festival.dates.start || !festival.dates.end) {
      window.notificationManager?.show("Both start and end dates are required", "error");
      return false;
    }

    if (new Date(festival.dates.start) > new Date(festival.dates.end)) {
      window.notificationManager?.show("End date must be after start date", "error");
      return false;
    }

    if (!festival.location || festival.location.length < 2) {
      window.notificationManager?.show("Location must be at least 2 characters", "error");
      return false;
    }

    if (Number.isNaN(festival.coordinates.lat) || festival.coordinates.lat < -90 || festival.coordinates.lat > 90) {
      window.notificationManager?.show("Latitude must be between -90 and 90", "error");
      return false;
    }

    if (Number.isNaN(festival.coordinates.lng) || festival.coordinates.lng < -180 || festival.coordinates.lng > 180) {
      window.notificationManager?.show("Longitude must be between -180 and 180", "error");
      return false;
    }

    if (!this.isValidUrl(festival.poster)) {
      window.notificationManager?.show("Invalid poster URL", "error");
      return false;
    }

    if (!this.isValidUrl(festival.website)) {
      window.notificationManager?.show("Invalid website URL", "error");
      return false;
    }

    if (Number.isNaN(festival.ticketPrice) || festival.ticketPrice < 0) {
      window.notificationManager?.show("Ticket price must be a positive number", "error");
      return false;
    }

    return true;
  }

  isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  loadFestival(festival) {
    this.currentFestival = festival
      ? { ...festival, dates: { ...festival.dates }, coordinates: { ...festival.coordinates } }
      : null;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    if (!this.currentFestival) {
      this.container.innerHTML = `
        <div class="form-placeholder">
          <p>👈 Select a festival from the list to start editing</p>
        </div>
      `;
      return;
    }

    const festival = this.currentFestival;

    this.container.innerHTML = `
      <div class="admin-form">
        <!-- Form Header -->
        <div class="form-header">
          <div class="form-header-title">
            <h2>Festival Details</h2>
          </div>
        </div>

        <!-- Scrollable Form Content -->
        <div class="form-content">
          <form id="festivalForm" class="festival-form">
            <div class="form-group">
              <label for="festivalKey">Festival Key*</label>
              <input
                type="text"
                id="festivalKey"
                name="key"
                value="${this.escapeHtml(festival.key || "")}"
                required
                placeholder="festival-key-example"
                data-field="key"
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and dashes allowed"
              >
              <small style="color: #666; font-size: 0.85rem; margin-top: 0.25rem; display: block;">
                Unique identifier for the festival (lowercase, numbers, and dashes only)
              </small>
            </div>

          <div class="form-group">
            <label for="festivalName">Festival Name*</label>
            <input
              type="text"
              id="festivalName"
              name="name"
              value="${this.escapeHtml(festival.name || "")}"
              required
              placeholder="Enter festival name"
              data-field="name"
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="festivalStartDate">Start Date*</label>
              <input
                type="date"
                id="festivalStartDate"
                name="startDate"
                value="${festival.dates?.start || ""}"
                required
                data-field="startDate"
              >
            </div>

            <div class="form-group">
              <label for="festivalEndDate">End Date*</label>
              <input
                type="date"
                id="festivalEndDate"
                name="endDate"
                value="${festival.dates?.end || ""}"
                required
                data-field="endDate"
              >
            </div>
          </div>

          <div class="form-group">
            <label for="festivalLocation">Location*</label>
            <input
              type="text"
              id="festivalLocation"
              name="location"
              value="${this.escapeHtml(festival.location || "")}"
              required
              placeholder="City, Country"
              data-field="location"
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="festivalLatitude">Latitude*</label>
              <input
                type="number"
                id="festivalLatitude"
                name="latitude"
                step="0.000001"
                value="${festival.coordinates?.lat || ""}"
                required
                placeholder="51.5074"
                data-field="latitude"
              >
            </div>

            <div class="form-group">
              <label for="festivalLongitude">Longitude*</label>
              <input
                type="number"
                id="festivalLongitude"
                name="longitude"
                step="0.000001"
                value="${festival.coordinates?.lng || ""}"
                required
                placeholder="-0.1278"
                data-field="longitude"
              >
            </div>
          </div>

          <div class="form-group">
            <label for="festivalPoster">Poster URL*</label>
            <div class="image-preview" id="posterPreview">
              ${this.renderImagePreview(festival.poster)}
            </div>
            <div class="url-field-container">
              <input
                type="url"
                id="festivalPoster"
                name="poster"
                value="${this.escapeHtml(festival.poster || "")}"
                required
                placeholder="https://example.com/poster.jpg"
                data-field="poster"
                data-preview="posterPreview"
              >
              <button type="button" class="btn-search-image" onclick="window.festivalEditFormInstance?.searchGoogleImages('logo')" title="Search on Google Images">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="festivalWebsite">Website*</label>
            <div class="url-field-container">
              <input
                type="url"
                id="festivalWebsite"
                name="website"
                value="${this.escapeHtml(festival.website || "")}"
                required
                placeholder="https://example.com"
                data-field="website"
              >
              <a href="${festival.website || "#"}" target="_blank" rel="noopener noreferrer" class="url-link-icon" id="festivalWebsiteLink" ${!festival.website ? 'style="pointer-events: none; opacity: 0.3;"' : ""}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                </svg>
              </a>
            </div>
          </div>

          <div class="form-group">
            <label for="festivalTicketPrice">Ticket Price (€)*</label>
            <input
              type="number"
              id="festivalTicketPrice"
              name="ticketPrice"
              step="0.01"
              min="0"
              value="${festival.ticketPrice || ""}"
              required
              placeholder="0.00"
              data-field="ticketPrice"
            >
          </div>

          <div class="form-group">
            <label for="festivalBands">Bands</label>
            <div class="multiselect-container">
              <div class="multiselect-selected" id="selectedBands">
                <span class="placeholder">Select bands...</span>
              </div>
              <div class="multiselect-dropdown" id="bandsDropdown">
                <input type="text" class="multiselect-search" id="bandsSearch" placeholder="Search bands...">
                <div class="multiselect-options" id="bandsOptions"></div>
              </div>
            </div>
          </div>

          <!-- Scroll to Top Button -->
          <div class="scroll-to-top-container">
            <button type="button" class="btn-scroll-top" onclick="window.festivalEditFormInstance?.scrollToTop()">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
              </svg>
              Scroll to Top
            </button>
          </div>

          <div class="form-actions" style="display: none;">
            <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
            <button type="submit" class="btn-primary">Save Festival</button>
          </div>
        </form>
        </div>
      </div>
    `;

    // Store instance globally for onclick handlers
    window.festivalEditFormInstance = this;

    this.renderBandsOptions();

    const checkboxes = this.container.querySelectorAll('#bandsOptions input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.checked = festival.bands?.includes(cb.value) || false;
    });

    this.updateSelectedBands();

    // Re-setup event listeners after render
    this.setupEventListeners();

    // Validate URLs asynchronously
    this.validateUrls();
  }

  renderImagePreview(url) {
    if (!url) {
      return '<div class="loading">No image URL provided</div>';
    }
    return `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<div class=\\'error\\'>❌ Failed to load image</div>'" />`;
  }

  validateUrls() {
    const websiteUrl = this.currentFestival?.website;

    if (websiteUrl) {
      this.validateUrl(websiteUrl, "festivalWebsite");
    }
  }

  renderBandsOptions() {
    const optionsContainer = this.container.querySelector("#bandsOptions");
    if (!optionsContainer) return;

    optionsContainer.innerHTML = this.bands
      .map(
        (band) => `
      <label class="multiselect-option">
        <input type="checkbox" value="${this.escapeHtml(band)}" data-band="${this.escapeHtml(band)}">
        <span>${this.escapeHtml(band)}</span>
      </label>
    `,
      )
      .join("");
  }
}
