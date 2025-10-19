// Band Edit Form - Handles band information editing with auto-save

class BandEditForm {
  constructor() {
    this.currentBand = null;
    this.saveTimeout = null;
    this.saveDelay = 2000; // 2 seconds
    this.isSaving = false;
    this.onBandUpdated = null; // Callback when band is saved
    this.formContainer = null;
    this.allGenres = new Set(); // Store all existing genres
  }

  /**
   * Initialize the form
   */
  init() {
    this.formContainer = document.getElementById("bandForm");
    this.loadAllGenres();
  }

  /**
   * Load all existing genres from the database
   */
  async loadAllGenres() {
    try {
      const response = await fetch("/db.json");
      const data = await response.json();

      // Collect all unique genres from all bands
      data.bands.forEach((band) => {
        if (band.genres && Array.isArray(band.genres)) {
          band.genres.forEach((genre) => {
            this.allGenres.add(genre);
          });
        }
      });
    } catch (error) {
      console.error("Error loading genres:", error);
    }
  }

  /**
   * Load a band into the form
   */
  loadBand(band) {
    if (!band) {
      this.showPlaceholder();
      return;
    }

    this.currentBand = { ...band }; // Create a copy
    this.renderForm();
  }

  /**
   * Show placeholder when no band is selected
   */
  showPlaceholder() {
    this.currentBand = null;
    if (this.formContainer) {
      this.formContainer.innerHTML = `
        <div class="form-placeholder">
          <p>👈 Select a band from the list to start editing</p>
        </div>
      `;
    }
  }

  /**
   * Render the complete form
   */
  renderForm() {
    if (!this.currentBand || !this.formContainer) return;

    const band = this.currentBand;

    this.formContainer.innerHTML = `
      <!-- Key (readonly) -->
      <div class="form-group">
        <label for="key">Key</label>
        <input type="text" id="key" value="${band.key || ""}" readonly />
      </div>

      <!-- Name -->
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" value="${band.name || ""}" data-field="name" />
      </div>

      <!-- Country -->
      <div class="form-group">
        <label for="country">Country</label>
        <input type="text" id="country" value="${band.country || ""}" data-field="country" />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" data-field="description">${band.description || ""}</textarea>
      </div>

      <!-- Headline Image -->
      <div class="form-group">
        <label for="headlineImage">Headline Image URL</label>
        <div class="image-preview" id="headlineImagePreview">
          ${this.renderImagePreview(band.headlineImage)}
        </div>
        <input
          type="url"
          id="headlineImage"
          value="${band.headlineImage || ""}"
          data-field="headlineImage"
          data-preview="headlineImagePreview"
        />
      </div>

      <!-- Logo -->
      <div class="form-group">
        <label for="logo">Logo URL</label>
        <div class="image-preview" id="logoPreview">
          ${this.renderImagePreview(band.logo)}
        </div>
        <input
          type="url"
          id="logo"
          value="${band.logo || ""}"
          data-field="logo"
          data-preview="logoPreview"
        />
      </div>

      <!-- Website -->
      <div class="form-group">
        <label for="website">Website</label>
        <div class="url-field-container">
          <input type="url" id="website" value="${band.website || ""}" data-field="website" />
          <a href="${band.website || "#"}" target="_blank" rel="noopener noreferrer" class="url-link-icon" id="websiteLink" ${!band.website ? 'style="pointer-events: none; opacity: 0.3;"' : ""}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Spotify -->
      <div class="form-group">
        <label for="spotify">Spotify URL</label>
        <div class="url-field-container">
          <input type="url" id="spotify" value="${band.spotify || ""}" data-field="spotify" />
          <a href="${band.spotify || "#"}" target="_blank" rel="noopener noreferrer" class="url-link-icon" id="spotifyLink" ${!band.spotify ? 'style="pointer-events: none; opacity: 0.3;"' : ""}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Genres (multi-select) -->
      <div class="form-group">
        <label>Genres</label>
        <div id="genresContainer">
          ${this.renderGenresField(band.genres || [])}
        </div>
      </div>

      <!-- Reviewed (checkbox) -->
      <div class="form-group">
        <label for="reviewed">
          <input
            type="checkbox"
            id="reviewed"
            ${band.reviewed ? "checked" : ""}
            data-field="reviewed"
          />
          Mark as Reviewed
        </label>
      </div>

      <!-- Members (array of objects) -->
      <div class="form-group">
        <label>Members</label>
        <div id="membersContainer">
          ${this.renderMembersField(band.members || [])}
        </div>
        <button type="button" class="btn-add" onclick="bandEditForm.addMember()">+ Add Member</button>
      </div>
    `;

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Render image preview
   */
  renderImagePreview(url) {
    if (!url) {
      return '<div class="loading">No image URL provided</div>';
    }
    return `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<div class=\\'error\\'>Failed to load image</div>'" />`;
  }

  /**
   * Render genres field with multi-select and custom input
   */
  renderGenresField(selectedGenres) {
    const allGenresArray = Array.from(this.allGenres).sort();

    // Create checkboxes for all existing genres
    const genreCheckboxes = allGenresArray
      .map((genre) => {
        const isSelected = selectedGenres.includes(genre);
        return `
        <label class="genre-checkbox">
          <input
            type="checkbox"
            value="${genre}"
            ${isSelected ? "checked" : ""}
            onchange="bandEditForm.handleGenreToggle(this)"
          />
          <span>${genre}</span>
        </label>
      `;
      })
      .join("");

    return `
      <div class="genres-multiselect">
        ${genreCheckboxes}
      </div>
      <div class="add-new-genre">
        <input
          type="text"
          id="newGenreInput"
          placeholder="Add new genre..."
          class="new-genre-input"
        />
        <button type="button" class="btn-add-small" onclick="bandEditForm.addNewGenre()">Add</button>
      </div>
      <div class="selected-genres-display">
        <strong>Selected:</strong> ${selectedGenres.length > 0 ? selectedGenres.join(", ") : "None"}
      </div>
    `;
  }

  /**
   * Render array field (genres)
   */
  renderArrayField(items, fieldName) {
    if (!items || items.length === 0) {
      return '<p style="color: #999; margin: 0.5rem 0;">No items added yet</p>';
    }

    return items
      .map(
        (item, index) => `
      <div class="array-item">
        <input
          type="text"
          value="${item}"
          data-field="${fieldName}"
          data-index="${index}"
        />
        <button type="button" class="btn-remove" onclick="bandEditForm.removeArrayItem('${fieldName}', ${index})">Remove</button>
      </div>
    `,
      )
      .join("");
  }

  /**
   * Render members field (array of objects)
   */
  renderMembersField(members) {
    if (!members || members.length === 0) {
      return '<p style="color: #999; margin: 0.5rem 0;">No members added yet</p>';
    }

    return members
      .map(
        (member, index) => `
      <div class="member-item">
        <div class="member-fields">
          <div>
            <label style="font-size: 0.75rem;">Name</label>
            <input
              type="text"
              value="${member.name || ""}"
              data-field="members"
              data-index="${index}"
              data-subfield="name"
            />
          </div>
          <div>
            <label style="font-size: 0.75rem;">Role</label>
            <input
              type="text"
              value="${member.role || ""}"
              data-field="members"
              data-index="${index}"
              data-subfield="role"
            />
          </div>
        </div>
        <button type="button" class="btn-remove" onclick="bandEditForm.removeMember(${index})">Remove Member</button>
      </div>
    `,
      )
      .join("");
  }

  /**
   * Attach event listeners to form fields
   */
  attachEventListeners() {
    // Text inputs and textareas
    const textFields = this.formContainer.querySelectorAll(
      'input[data-field]:not([type="checkbox"]), textarea[data-field]',
    );
    textFields.forEach((field) => {
      field.addEventListener("input", (e) => this.handleFieldChange(e));
    });

    // Checkbox
    const checkbox = this.formContainer.querySelector('input[type="checkbox"][data-field]');
    if (checkbox) {
      checkbox.addEventListener("change", (e) => this.handleFieldChange(e));
    }

    // Image URL fields with preview
    const imageFields = this.formContainer.querySelectorAll("input[data-preview]");
    imageFields.forEach((field) => {
      field.addEventListener("input", (e) => this.handleImagePreviewUpdate(e));
    });

    // URL fields with link icons
    const websiteField = document.getElementById("website");
    const spotifyField = document.getElementById("spotify");

    if (websiteField) {
      websiteField.addEventListener("input", (e) => this.updateUrlLink("websiteLink", e.target.value));
    }

    if (spotifyField) {
      spotifyField.addEventListener("input", (e) => this.updateUrlLink("spotifyLink", e.target.value));
    }
  }

  /**
   * Handle field value changes
   */
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
      } else {
        // Simple array (genres)
        if (!this.currentBand[fieldName]) {
          this.currentBand[fieldName] = [];
        }
        this.currentBand[fieldName][index] = field.value;
      }
    } else {
      // Simple field
      if (field.type === "checkbox") {
        this.currentBand[fieldName] = field.checked;
      } else {
        this.currentBand[fieldName] = field.value;
      }
    }

    // Schedule auto-save
    this.scheduleAutoSave();
  }

  /**
   * Handle image preview updates
   */
  handleImagePreviewUpdate(event) {
    const field = event.target;
    const previewId = field.getAttribute("data-preview");
    const previewContainer = document.getElementById(previewId);

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
      previewContainer.innerHTML = '<div class="error">Failed to load image</div>';
    };
    img.src = url;
  }

  /**
   * Schedule auto-save after delay
   */
  scheduleAutoSave() {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Set new timeout
    this.saveTimeout = setTimeout(() => {
      this.saveBand();
    }, this.saveDelay);
  }

  /**
   * Update URL link icon href and enabled state
   */
  updateUrlLink(linkId, url) {
    const link = document.getElementById(linkId);
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

  /**
   * Handle genre checkbox toggle
   */
  handleGenreToggle(checkbox) {
    if (!this.currentBand.genres) {
      this.currentBand.genres = [];
    }

    const genre = checkbox.value;

    if (checkbox.checked) {
      // Add genre if not already present
      if (!this.currentBand.genres.includes(genre)) {
        this.currentBand.genres.push(genre);
      }
    } else {
      // Remove genre
      this.currentBand.genres = this.currentBand.genres.filter((g) => g !== genre);
    }

    // Update the display
    this.updateSelectedGenresDisplay();

    // Schedule auto-save
    this.scheduleAutoSave();
  }

  /**
   * Add a new genre to the list
   */
  addNewGenre() {
    const input = document.getElementById("newGenreInput");
    if (!input) return;

    const newGenre = input.value.trim();

    if (!newGenre) {
      return;
    }

    // Add to global genres list
    this.allGenres.add(newGenre);

    // Add to current band genres
    if (!this.currentBand.genres) {
      this.currentBand.genres = [];
    }

    if (!this.currentBand.genres.includes(newGenre)) {
      this.currentBand.genres.push(newGenre);
    }

    // Clear input
    input.value = "";

    // Re-render genres section
    const container = document.getElementById("genresContainer");
    if (container) {
      container.innerHTML = this.renderGenresField(this.currentBand.genres);
    }

    // Schedule auto-save
    this.scheduleAutoSave();
  }

  /**
   * Update the selected genres display
   */
  updateSelectedGenresDisplay() {
    const display = document.querySelector(".selected-genres-display");
    if (!display || !this.currentBand) return;

    const genres = this.currentBand.genres || [];
    display.innerHTML = `<strong>Selected:</strong> ${genres.length > 0 ? genres.join(", ") : "None"}`;
  }

  /**
   * Save the current band
   */
  async saveBand() {
    if (!this.currentBand || this.isSaving) return;

    this.isSaving = true;

    try {
      const response = await fetch("/api/bands/" + this.currentBand.key, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.currentBand),
      });

      if (!response.ok) {
        throw new Error("Failed to save band");
      }

      // Show success notification
      if (window.notification) {
        window.notification.show("Changes saved successfully");
      }

      // Trigger callback
      if (this.onBandUpdated) {
        this.onBandUpdated(this.currentBand);
      }
    } catch (error) {
      console.error("Error saving band:", error);
      if (window.notification) {
        window.notification.show("Error saving changes", "error");
      }
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Add a new genre
   */
  addGenre() {
    if (!this.currentBand.genres) {
      this.currentBand.genres = [];
    }
    this.currentBand.genres.push("");

    // Re-render genres section
    const container = document.getElementById("genresContainer");
    if (container) {
      container.innerHTML = this.renderArrayField(this.currentBand.genres, "genres");
      this.attachEventListeners();
    }
  }

  /**
   * Remove an item from array field
   */
  removeArrayItem(fieldName, index) {
    if (this.currentBand[fieldName] && this.currentBand[fieldName][index] !== undefined) {
      this.currentBand[fieldName].splice(index, 1);

      // Re-render the field
      const container = document.getElementById(fieldName + "Container");
      if (container) {
        container.innerHTML = this.renderArrayField(this.currentBand[fieldName], fieldName);
        this.attachEventListeners();
      }

      // Auto-save
      this.scheduleAutoSave();
    }
  }

  /**
   * Add a new member
   */
  addMember() {
    if (!this.currentBand.members) {
      this.currentBand.members = [];
    }
    this.currentBand.members.push({ name: "", role: "" });

    // Re-render members section
    const container = document.getElementById("membersContainer");
    if (container) {
      container.innerHTML = this.renderMembersField(this.currentBand.members);
      this.attachEventListeners();
    }
  }

  /**
   * Remove a member
   */
  removeMember(index) {
    if (this.currentBand.members && this.currentBand.members[index]) {
      this.currentBand.members.splice(index, 1);

      // Re-render members section
      const container = document.getElementById("membersContainer");
      if (container) {
        container.innerHTML = this.renderMembersField(this.currentBand.members);
        this.attachEventListeners();
      }

      // Auto-save
      this.scheduleAutoSave();
    }
  }

  /**
   * Get current band data
   */
  getCurrentBand() {
    return this.currentBand;
  }
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.BandEditForm = BandEditForm;
}
