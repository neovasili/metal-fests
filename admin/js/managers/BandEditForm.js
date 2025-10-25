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
    this.allGenres = [];
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
      const genresSet = new Set();
      data.bands?.forEach((band) => {
        band.genres?.forEach((genre) => genresSet.add(genre));
      });
      this.allGenres = Array.from(genresSet).sort();
    } catch (error) {
      console.error("Error loading genres:", error);
    }
  }

  setupEventListeners() {
    const form = this.container.querySelector("#bandForm");
    const cancelBtn = this.container.querySelector("#cancelBtn");
    const addMemberBtn = this.container.querySelector("#addMemberBtn");
    const selectedGenres = this.container.querySelector("#selectedGenres");
    const genresDropdown = this.container.querySelector("#genresDropdown");
    const genresSearch = this.container.querySelector("#genresSearch");
    const genresOptions = this.container.querySelector("#genresOptions");

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

    if (selectedGenres && genresDropdown) {
      selectedGenres.addEventListener("click", () => {
        genresDropdown.classList.toggle("open");
      });

      document.addEventListener("click", (e) => {
        if (!selectedGenres.contains(e.target) && !genresDropdown.contains(e.target)) {
          genresDropdown.classList.remove("open");
        }
      });
    }

    if (genresSearch) {
      genresSearch.addEventListener("input", (e) => {
        this.filterGenres(e.target.value);
      });
    }

    if (genresOptions) {
      genresOptions.addEventListener("change", () => {
        this.updateSelectedGenres();
      });
    }
  }

  filterGenres(searchTerm) {
    const options = this.container.querySelectorAll(".multiselect-option");
    const term = searchTerm.toLowerCase();

    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      option.style.display = text.includes(term) ? "flex" : "none";
    });
  }

  updateSelectedGenres() {
    const checkboxes = this.container.querySelectorAll('#genresOptions input[type="checkbox"]');
    const selected = Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    const selectedContainer = this.container.querySelector("#selectedGenres");
    if (!selectedContainer) return;

    if (selected.length === 0) {
      selectedContainer.innerHTML = '<span class="placeholder">Select genres...</span>';
    } else {
      selectedContainer.innerHTML = selected
        .map(
          (genre) => `
        <span class="selected-tag">
          ${this.escapeHtml(genre)}
          <button type="button" class="remove-tag" data-genre="${this.escapeHtml(genre)}">×</button>
        </span>
      `,
        )
        .join("");

      selectedContainer.querySelectorAll(".remove-tag").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const genre = btn.getAttribute("data-genre");
          this.unselectGenre(genre);
        });
      });
    }
  }

  unselectGenre(genre) {
    const checkbox = this.container.querySelector(`#genresOptions input[value="${genre}"]`);
    if (checkbox) {
      checkbox.checked = false;
      this.updateSelectedGenres();
    }
  }

  addMemberField(member = { name: "", role: "" }) {
    const membersContainer = this.container.querySelector("#membersContainer");
    if (!membersContainer) return;

    const memberDiv = document.createElement("div");
    memberDiv.className = "member-item";
    memberDiv.innerHTML = `
      <div class="member-fields">
        <input type="text" class="member-name" placeholder="Member name" value="${this.escapeHtml(member.name)}">
        <input type="text" class="member-role" placeholder="Role" value="${this.escapeHtml(member.role)}">
      </div>
      <button type="button" class="btn-remove-member">Remove</button>
    `;

    memberDiv.querySelector(".btn-remove-member").addEventListener("click", () => {
      memberDiv.remove();
    });

    membersContainer.appendChild(memberDiv);
  }

  handleSubmit() {
    const formData = new FormData(this.container.querySelector("#bandForm"));
    const selectedGenres = Array.from(this.container.querySelectorAll("#genresOptions input:checked")).map(
      (cb) => cb.value,
    );

    const members = [];
    this.container.querySelectorAll(".member-item").forEach((item) => {
      const name = item.querySelector(".member-name").value.trim();
      const role = item.querySelector(".member-role").value.trim();
      if (name && role) {
        members.push({ name, role });
      }
    });

    const band = {
      key: formData.get("key").trim(),
      name: formData.get("name").trim(),
      country: formData.get("country").trim(),
      description: formData.get("description").trim(),
      headlineImage: formData.get("headlineImage").trim(),
      logo: formData.get("logo").trim(),
      website: formData.get("website").trim(),
      spotify: formData.get("spotify").trim(),
      genres: selectedGenres,
      reviewed: formData.get("reviewed") === "on",
      members,
    };

    if (this.validate(band)) {
      if (this.onSave) {
        this.onSave(band);
      }
    }
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
    this.currentBand = band;
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

    this.container.innerHTML = `
      <div class="admin-form">
        <div class="form-header">
          <h2 class="form-title">Band Details</h2>
        </div>

        <form id="bandForm" class="band-form">
          <div class="form-group">
            <label for="bandKey">Band Key*</label>
            <input type="text" id="bandKey" name="key" required placeholder="e.g., iron-maiden">
          </div>

          <div class="form-group">
            <label for="bandName">Band Name*</label>
            <input type="text" id="bandName" name="name" required placeholder="Enter band name">
          </div>

          <div class="form-group">
            <label for="bandCountry">Country*</label>
            <input type="text" id="bandCountry" name="country" required placeholder="e.g., United Kingdom">
          </div>

          <div class="form-group">
            <label for="bandDescription">Description*</label>
            <textarea id="bandDescription" name="description" required placeholder="Band description..."></textarea>
          </div>

          <div class="form-group">
            <label for="bandHeadlineImage">Headline Image URL*</label>
            <input type="url" id="bandHeadlineImage" name="headlineImage" required placeholder="https://example.com/image.jpg">
          </div>

          <div class="form-group">
            <label for="bandLogo">Logo URL*</label>
            <input type="url" id="bandLogo" name="logo" required placeholder="https://example.com/logo.png">
          </div>

          <div class="form-group">
            <label for="bandWebsite">Website*</label>
            <input type="url" id="bandWebsite" name="website" required placeholder="https://example.com">
          </div>

          <div class="form-group">
            <label for="bandSpotify">Spotify URL</label>
            <input type="url" id="bandSpotify" name="spotify" placeholder="https://open.spotify.com/artist/...">
          </div>

          <div class="form-group">
            <label for="bandGenres">Genres*</label>
            <div class="multiselect-container">
              <div class="multiselect-selected" id="selectedGenres">
                <span class="placeholder">Select genres...</span>
              </div>
              <div class="multiselect-dropdown" id="genresDropdown">
                <input type="text" class="multiselect-search" id="genresSearch" placeholder="Search genres...">
                <div class="multiselect-options" id="genresOptions"></div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="bandReviewed" name="reviewed">
              Reviewed
            </label>
          </div>

          <div class="form-group">
            <label>Band Members</label>
            <div id="membersContainer"></div>
            <button type="button" class="btn-add" id="addMemberBtn">Add Member</button>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
            <button type="submit" class="btn-primary">Save Band</button>
          </div>
        </form>
      </div>
    `;

    const form = this.container.querySelector("#bandForm");
    if (!form) return;

    form.elements.key.value = this.currentBand.key || "";
    form.elements.name.value = this.currentBand.name || "";
    form.elements.country.value = this.currentBand.country || "";
    form.elements.description.value = this.currentBand.description || "";
    form.elements.headlineImage.value = this.currentBand.headlineImage || "";
    form.elements.logo.value = this.currentBand.logo || "";
    form.elements.website.value = this.currentBand.website || "";
    form.elements.spotify.value = this.currentBand.spotify || "";
    form.elements.reviewed.checked = this.currentBand.reviewed || false;

    this.renderGenresOptions();

    const checkboxes = this.container.querySelectorAll('#genresOptions input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.checked = this.currentBand.genres?.includes(cb.value) || false;
    });

    this.updateSelectedGenres();

    // Render members
    if (this.currentBand.members && this.currentBand.members.length > 0) {
      this.currentBand.members.forEach((member) => {
        this.addMemberField(member);
      });
    }

    // Re-setup event listeners after render
    this.setupEventListeners();
  }

  renderGenresOptions() {
    const optionsContainer = this.container.querySelector("#genresOptions");
    if (!optionsContainer) return;

    optionsContainer.innerHTML = this.allGenres
      .map(
        (genre) => `
      <label class="multiselect-option">
        <input type="checkbox" value="${this.escapeHtml(genre)}" data-genre="${this.escapeHtml(genre)}">
        <span>${this.escapeHtml(genre)}</span>
      </label>
    `,
      )
      .join("");
  }
}
