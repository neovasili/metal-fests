class BandEditForm {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`BandEditForm container not found: ${containerId}`);
      return;
    }
    this.onSave = options.onSave || null;
    this.onCancel = options.onCancel || null;
    this.currentBand = null;
    this.allGenres = new Set();
    this.saveTimeout = null;
    this.saveDelay = 2000; // 2 seconds for auto-save
    this.isSaving = false;
    this.urlValidationCache = new Map();
    this.urlValidationTimeouts = {};
    this.genresDropdown = null;
  }

  async init() {
    await this.loadGenres();
    this.setupEventListeners();
  }

  async loadGenres() {
    try {
      const response = await fetch("/db.json");
      if (!response.ok) {
        throw new Error("Failed to load genres database");
      }
      const data = await response.json();
      // Extract unique genres from all bands
      data.bands?.forEach((band) => {
        band.genres?.forEach((genre) => this.allGenres.add(genre));
      });
    } catch (error) {
      console.error("Error loading genres:", error);
    }
  }

  setupEventListeners() {
    const form = this.container.querySelector("#bandForm");
    const cancelBtn = this.container.querySelector("#cancelBtn");
    const addMemberBtn = this.container.querySelector("#addMemberBtn");

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

    if (addMemberBtn) {
      addMemberBtn.addEventListener("click", () => {
        this.addMemberField();
      });
    }

    // Auto-save on text inputs and textareas
    const textFields = this.container.querySelectorAll(
      'input[data-field]:not([type="checkbox"]), textarea[data-field]',
    );
    textFields.forEach((field) => {
      field.addEventListener("input", (e) => this.handleFieldChange(e));
    });

    // Auto-save on checkbox
    const reviewedCheckbox = this.container.querySelector('input[type="checkbox"][id="bandReviewed"]');
    if (reviewedCheckbox) {
      reviewedCheckbox.addEventListener("change", (e) => {
        this.currentBand.reviewed = e.target.checked;
        this.scheduleAutoSave();
      });
    }

    // Image preview handlers
    const imageFields = this.container.querySelectorAll("input[data-preview]");
    imageFields.forEach((field) => {
      field.addEventListener("input", (e) => this.handleImagePreviewUpdate(e));
    });

    // URL validation handlers
    const websiteField = this.container.querySelector("#bandWebsite");
    const spotifyField = this.container.querySelector("#bandSpotify");

    if (websiteField) {
      websiteField.addEventListener("input", (e) => {
        this.updateUrlLink("websiteLink", e.target.value);
        this.scheduleUrlValidation(e.target.value, "bandWebsite");
      });
    }

    if (spotifyField) {
      spotifyField.addEventListener("input", (e) => {
        this.updateUrlLink("spotifyLink", e.target.value);
        this.scheduleUrlValidation(e.target.value, "bandSpotify");
      });
    }
  }

  handleFieldChange(event) {
    const field = event.target;
    const fieldName = field.getAttribute("data-field");
    const index = field.getAttribute("data-index");
    const subfield = field.getAttribute("data-subfield");

    if (!fieldName) return;

    // Update the band data
    if (index !== null) {
      // Array field
      if (subfield) {
        // Array of objects (members)
        if (!this.currentBand[fieldName]) {
          this.currentBand[fieldName] = [];
        }
        if (!this.currentBand[fieldName][index]) {
          this.currentBand[fieldName][index] = {};
        }
        this.currentBand[fieldName][index][subfield] = field.value;
      }
    } else {
      // Simple field
      this.currentBand[fieldName] = field.value;
    }

    // Schedule auto-save
    this.scheduleAutoSave();
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
    if (!this.currentBand || this.isSaving) return;

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
      console.error("Error auto-saving band:", error);
      // Show error notification
      if (window.notificationManager) {
        window.notificationManager.show("Failed to save changes", "error", 3000);
      }
    } finally {
      this.isSaving = false;
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
    if (!this.currentBand || !this.currentBand.name) {
      alert("Please load a band first");
      return;
    }

    const bandName = this.currentBand.name;
    let searchQuery = "";

    switch (fieldType) {
      case "headlineImage":
        searchQuery = `${bandName} band members`;
        break;
      case "logo":
        searchQuery = `${bandName} band logo`;
        break;
      default:
        searchQuery = bandName;
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodedQuery}`;
    window.open(googleImagesUrl, "_blank", "noopener,noreferrer");
  }

  initializeGenresDropdown() {
    const container = this.container.querySelector("#genresDropdownContainer");
    if (!container || !this.currentBand) return;

    // Destroy existing dropdown if any
    if (this.genresDropdown) {
      this.genresDropdown.destroy();
    }

    const allGenresArray = Array.from(this.allGenres).sort();

    this.genresDropdown = new MultiselectDropdown({
      allItems: allGenresArray,
      selectedItems: this.currentBand.genres || [],
      placeholder: "Search genres...",
      icon: "🎵",
      label: "Select Genres",
      onToggle: (genre, isSelected) => {
        this.handleGenreToggle(genre, isSelected);
      },
      onSearch: () => {
        // Search is handled internally by the component
      },
    });

    container.innerHTML = "";
    container.appendChild(this.genresDropdown.create());
  }

  handleGenreToggle(genre, isSelected) {
    if (!this.currentBand.genres) {
      this.currentBand.genres = [];
    }

    if (isSelected) {
      if (!this.currentBand.genres.includes(genre)) {
        this.currentBand.genres.push(genre);
      }
    } else {
      this.currentBand.genres = this.currentBand.genres.filter((g) => g !== genre);
    }

    this.updateGenresDisplay();
    this.scheduleAutoSave();
  }

  validateNewGenre(input) {
    const newGenre = input.value.trim();
    const addBtn = this.container.querySelector("#addGenreBtn");
    const validationMsg = this.container.querySelector("#genreValidationMessage");

    if (!newGenre) {
      input.style.borderColor = "";
      if (addBtn) addBtn.disabled = false;
      if (validationMsg) {
        validationMsg.textContent = "";
        validationMsg.style.display = "none";
      }
      return;
    }

    // Check if genre already exists (case-insensitive)
    const genreExists = Array.from(this.allGenres).some((genre) => genre.toLowerCase() === newGenre.toLowerCase());

    if (genreExists) {
      input.style.borderColor = "#ef4444";
      if (addBtn) addBtn.disabled = true;
      if (validationMsg) {
        validationMsg.textContent = "This genre already exists, select from the dropdown";
        validationMsg.style.display = "block";
      }
    } else {
      input.style.borderColor = "#10b981"; // green
      if (addBtn) addBtn.disabled = false;
      if (validationMsg) {
        validationMsg.textContent = "";
        validationMsg.style.display = "none";
      }
    }
  }

  addNewGenre() {
    const input = this.container.querySelector("#newGenreInput");
    if (!input) return;

    const newGenre = input.value.trim();

    if (!newGenre) return;

    // Check if genre already exists
    const genreExists = Array.from(this.allGenres).some((genre) => genre.toLowerCase() === newGenre.toLowerCase());

    if (genreExists) return;

    // Add to global genres list
    this.allGenres.add(newGenre);

    // Add to current band genres
    if (!this.currentBand.genres) {
      this.currentBand.genres = [];
    }

    if (!this.currentBand.genres.includes(newGenre)) {
      this.currentBand.genres.push(newGenre);
    }

    // Clear input and validation
    input.value = "";
    input.style.borderColor = "";
    const validationMsg = this.container.querySelector("#genreValidationMessage");
    if (validationMsg) {
      validationMsg.textContent = "";
      validationMsg.style.display = "none";
    }

    // Re-initialize dropdown with updated genres
    this.initializeGenresDropdown();

    // Update display
    this.updateGenresDisplay();

    // Schedule auto-save
    this.scheduleAutoSave();
  }

  updateGenresDisplay() {
    const display = this.container.querySelector(".selected-genres-display");
    if (!display || !this.currentBand) return;

    const genres = this.currentBand.genres || [];
    display.innerHTML = `<strong>Selected Genres:</strong> ${genres.length > 0 ? genres.join(", ") : "None"}`;

    // Update dropdown if it exists
    if (this.genresDropdown) {
      this.genresDropdown.update(Array.from(this.allGenres).sort(), this.currentBand.genres || []);
    }
  }

  scrollToTop() {
    const scrollableContainer = this.container.querySelector(".form-content");
    if (scrollableContainer) {
      scrollableContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      this.container.scrollTo({ top: 0, behavior: "smooth" });
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

  previewBand() {
    if (!this.currentBand || !this.currentBand.key) {
      return;
    }

    const bandUrl = `/bands/${this.currentBand.key}`;
    window.open(bandUrl, "_blank", "noopener,noreferrer");
  }

  addMemberField(member = { name: "", role: "" }) {
    const membersContainer = this.container.querySelector("#membersContainer");
    if (!membersContainer) return;

    const index = this.container.querySelectorAll(".member-item").length;

    const memberDiv = document.createElement("div");
    memberDiv.className = "member-item-compact";
    memberDiv.innerHTML = `
      <label>Name</label>
      <input
        type="text"
        class="member-name"
        placeholder="Member name"
        value="${this.escapeHtml(member.name)}"
        data-field="members"
        data-index="${index}"
        data-subfield="name"
      >
      <label>Role</label>
      <input
        type="text"
        class="member-role"
        placeholder="Role/Instrument"
        value="${this.escapeHtml(member.role)}"
        data-field="members"
        data-index="${index}"
        data-subfield="role"
      >
      <button type="button" class="btn-remove-icon" title="Remove member">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
        </svg>
      </button>
    `;

    // Add remove handler
    memberDiv.querySelector(".btn-remove-icon").addEventListener("click", () => {
      this.removeMember(memberDiv);
    });

    // Add auto-save handlers to inputs
    memberDiv.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", (e) => this.handleFieldChange(e));
    });

    membersContainer.appendChild(memberDiv);

    // Initialize members array if needed
    if (!this.currentBand.members) {
      this.currentBand.members = [];
    }
    if (!this.currentBand.members[index]) {
      this.currentBand.members[index] = member;
    }
  }

  removeMember(memberDiv) {
    if (!memberDiv) return;

    const index = parseInt(memberDiv.querySelector("[data-index]").getAttribute("data-index"));

    // Remove from DOM
    memberDiv.remove();

    // Remove from data
    if (this.currentBand.members && this.currentBand.members[index] !== undefined) {
      this.currentBand.members.splice(index, 1);
    }

    // Re-index remaining members
    this.reindexMembers();

    // Auto-save
    this.scheduleAutoSave();
  }

  reindexMembers() {
    const memberItems = this.container.querySelectorAll(".member-item-compact");
    memberItems.forEach((item, newIndex) => {
      const inputs = item.querySelectorAll("input[data-index]");
      inputs.forEach((input) => {
        input.setAttribute("data-index", newIndex);
      });
    });
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
    const form = this.container.querySelector("#bandForm");
    if (!form) return null;

    // Collect members
    const members = [];
    this.container.querySelectorAll(".member-item-compact").forEach((item) => {
      const nameInput = item.querySelector(".member-name");
      const roleInput = item.querySelector(".member-role");
      const name = nameInput ? nameInput.value.trim() : "";
      const role = roleInput ? roleInput.value.trim() : "";
      if (name && role) {
        members.push({ name, role });
      }
    });

    return {
      key: form.elements.key.value.trim(),
      name: form.elements.name.value.trim(),
      country: form.elements.country.value.trim(),
      description: form.elements.description.value.trim(),
      headlineImage: form.elements.headlineImage.value.trim(),
      logo: form.elements.logo.value.trim(),
      website: form.elements.website.value.trim(),
      spotify: form.elements.spotify.value.trim(),
      genres: this.currentBand?.genres || [],
      reviewed: form.elements.reviewed.checked,
      members,
    };
  }

  validate(band) {
    if (!band.key || band.key.length < 2) {
      window.notificationManager?.show("Band key must be at least 2 characters", "error");
      return false;
    }

    if (!band.name || band.name.length < 2) {
      window.notificationManager?.show("Band name must be at least 2 characters", "error");
      return false;
    }

    if (!band.country || band.country.length < 2) {
      window.notificationManager?.show("Country must be at least 2 characters", "error");
      return false;
    }

    if (!band.description || band.description.length < 10) {
      window.notificationManager?.show("Description must be at least 10 characters", "error");
      return false;
    }

    if (!this.isValidUrl(band.headlineImage)) {
      window.notificationManager?.show("Invalid headline image URL", "error");
      return false;
    }

    if (!this.isValidUrl(band.logo)) {
      window.notificationManager?.show("Invalid logo URL", "error");
      return false;
    }

    if (!this.isValidUrl(band.website)) {
      window.notificationManager?.show("Invalid website URL", "error");
      return false;
    }

    if (band.spotify && !this.isValidUrl(band.spotify)) {
      window.notificationManager?.show("Invalid Spotify URL", "error");
      return false;
    }

    if (band.genres.length === 0) {
      window.notificationManager?.show("At least one genre is required", "error");
      return false;
    }

    // Validate members if any exist
    if (band.members && band.members.length > 0) {
      for (let i = 0; i < band.members.length; i++) {
        const member = band.members[i];
        if (!member.name || !member.name.trim()) {
          window.notificationManager?.show(`Member ${i + 1}: Name is required`, "error");
          return false;
        }
        if (!member.role || !member.role.trim()) {
          window.notificationManager?.show(`Member ${i + 1}: Role is required`, "error");
          return false;
        }
      }
    }

    return true;
  }

  isValidUrl(urlString) {
    if (!urlString) return false;
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  loadBand(band) {
    this.currentBand = band ? { ...band } : null;
  }

  clear() {
    this.currentBand = null;
    this.render();
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    if (!this.currentBand) {
      this.container.innerHTML = `
        <div class="form-placeholder">
          <p>Select a band from the list to start editing 👉</p>
        </div>
      `;
      return;
    }

    const band = this.currentBand;

    this.container.innerHTML = `
      <div class="admin-form">
        <!-- Form Header with Preview Button -->
        <div class="form-header">
          <div class="form-header-title">
            <h2>Band Details</h2>
          </div>
          <button
            type="button"
            class="btn-preview-band"
            id="previewBand"
            ${!band.key ? "disabled" : ""}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
            </svg>
            Preview Band
          </button>
        </div>

        <!-- Scrollable Form Content -->
        <div class="form-content">
          <form id="bandForm" class="band-form">
            <!-- Reviewed Checkbox -->
            <div class="form-group">
              <label>
                <input type="checkbox" id="bandReviewed" name="reviewed" ${band.reviewed ? "checked" : ""}>
                Mark as Reviewed
              </label>
            </div>

            <!-- Key (readonly when editing) -->
            <div class="form-group">
              <label for="bandKey">Band Key*</label>
              <input
                type="text"
                id="bandKey"
                name="key"
                value="${this.escapeHtml(band.key || "")}"
                ${band.key ? "readonly" : "required"}
                placeholder="e.g., iron-maiden"
                data-field="key"
              >
            </div>

            <!-- Name -->
            <div class="form-group">
              <label for="bandName">Band Name*</label>
              <input
                type="text"
                id="bandName"
                name="name"
                value="${this.escapeHtml(band.name || "")}"
                required
                placeholder="Enter band name"
                data-field="name"
              >
            </div>

            <!-- Country -->
            <div class="form-group">
              <label for="bandCountry">Country*</label>
              <input
                type="text"
                id="bandCountry"
                name="country"
                value="${this.escapeHtml(band.country || "")}"
                required
                placeholder="e.g., United Kingdom"
                data-field="country"
              >
            </div>

            <!-- Description -->
            <div class="form-group">
              <label for="bandDescription">Description*</label>
              <textarea
                id="bandDescription"
                name="description"
                required
                placeholder="Band description..."
                data-field="description"
              >${this.escapeHtml(band.description || "")}</textarea>
            </div>

            <!-- Headline Image -->
            <div class="form-group">
              <label for="bandHeadlineImage">Headline Image URL*</label>
              <div class="image-preview" id="headlineImagePreview">
                ${this.renderImagePreview(band.headlineImage)}
              </div>
              <div class="url-field-container">
                <input
                  type="url"
                  id="bandHeadlineImage"
                  name="headlineImage"
                  value="${this.escapeHtml(band.headlineImage || "")}"
                  required
                  placeholder="https://example.com/image.jpg"
                  data-field="headlineImage"
                  data-preview="headlineImagePreview"
                >
                <button type="button" class="btn-search-image" onclick="window.bandEditFormInstance?.searchGoogleImages('headlineImage')" title="Search on Google Images">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Logo -->
            <div class="form-group">
              <label for="bandLogo">Logo URL*</label>
              <div class="image-preview" id="logoPreview">
                ${this.renderImagePreview(band.logo)}
              </div>
              <div class="url-field-container">
                <input
                  type="url"
                  id="bandLogo"
                  name="logo"
                  value="${this.escapeHtml(band.logo || "")}"
                  required
                  placeholder="https://example.com/logo.png"
                  data-field="logo"
                  data-preview="logoPreview"
                >
                <button type="button" class="btn-search-image" onclick="window.bandEditFormInstance?.searchGoogleImages('logo')" title="Search on Google Images">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Website -->
            <div class="form-group">
              <label for="bandWebsite">Website*</label>
              <div class="url-field-container">
                <input
                  type="url"
                  id="bandWebsite"
                  name="website"
                  value="${this.escapeHtml(band.website || "")}"
                  required
                  placeholder="https://example.com"
                  data-field="website"
                >
                <a href="${band.website || "#"}" target="_blank" rel="noopener noreferrer" class="url-link-icon" id="websiteLink" ${!band.website ? 'style="pointer-events: none; opacity: 0.3;"' : ""}>
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                  </svg>
                </a>
              </div>
            </div>

            <!-- Spotify -->
            <div class="form-group">
              <label for="bandSpotify">Spotify URL</label>
              <div class="url-field-container">
                <input
                  type="url"
                  id="bandSpotify"
                  name="spotify"
                  value="${this.escapeHtml(band.spotify || "")}"
                  placeholder="https://open.spotify.com/artist/..."
                  data-field="spotify"
                >
                <a href="${band.spotify || "#"}" target="_blank" rel="noopener noreferrer" class="url-link-icon" id="spotifyLink" ${!band.spotify ? 'style="pointer-events: none; opacity: 0.3;"' : ""}>
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                  </svg>
                </a>
              </div>
            </div>

            <!-- Genres -->
            <div class="form-group">
              <label>Genres*</label>
              <div class="selected-genres-display">
                <strong>Selected Genres:</strong> ${band.genres && band.genres.length > 0 ? band.genres.join(", ") : "None"}
              </div>
              <div id="genresDropdownContainer" class="genres-dropdown-container"></div>
              <div class="add-new-genre">
                <input
                  type="text"
                  id="newGenreInput"
                  placeholder="Add new genre..."
                  class="new-genre-input"
                  oninput="window.bandEditFormInstance?.validateNewGenre(this)"
                />
                <button type="button" class="btn-add-icon" onclick="window.bandEditFormInstance?.addNewGenre()" id="addGenreBtn">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                  </svg>
                </button>
                <div class="genre-validation-message" id="genreValidationMessage"></div>
              </div>
            </div>

            <!-- Members -->
            <div class="form-group">
              <label>Band Members</label>
              <div id="membersContainer">
                ${band.members && band.members.length > 0 ? "" : '<p style="color: #999; margin: 0.5rem 0;">No members added yet</p>'}
              </div>
              <button type="button" class="btn-add" id="addMemberBtn">+ Add Member</button>
            </div>

            <!-- Scroll to Top Button -->
            <div class="scroll-to-top-container">
              <button type="button" class="btn-scroll-top" onclick="window.bandEditFormInstance?.scrollToTop()">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                </svg>
                Scroll to Top
              </button>
            </div>

            <!-- Form Actions -->
            <div class="form-actions" style="display: none;">
              <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
              <button type="submit" class="btn-primary">Save Band</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Store instance globally for onclick handlers
    window.bandEditFormInstance = this;

    // Setup preview button handler
    const previewBtn = this.container.querySelector("#previewBand");
    if (previewBtn) {
      previewBtn.addEventListener("click", () => this.previewBand());
    }

    // Initialize genres dropdown
    this.initializeGenresDropdown();

    // Render existing members
    if (band.members && band.members.length > 0) {
      band.members.forEach((member) => {
        this.addMemberField(member);
      });
    }

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
    const websiteUrl = this.currentBand?.website;
    const spotifyUrl = this.currentBand?.spotify;

    if (websiteUrl) {
      this.validateUrl(websiteUrl, "bandWebsite");
    }

    if (spotifyUrl) {
      this.validateUrl(spotifyUrl, "bandSpotify");
    }
  }
}
