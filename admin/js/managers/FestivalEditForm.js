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

  handleSubmit() {
    const formData = new FormData(this.container.querySelector("#festivalForm"));
    const selectedBands = Array.from(this.container.querySelectorAll("#bandsOptions input:checked")).map(
      (cb) => cb.value,
    );

    const festival = {
      name: formData.get("name").trim(),
      dates: {
        start: formData.get("startDate"),
        end: formData.get("endDate"),
      },
      location: formData.get("location").trim(),
      coordinates: {
        lat: parseFloat(formData.get("latitude")),
        lng: parseFloat(formData.get("longitude")),
      },
      poster: formData.get("poster").trim(),
      website: formData.get("website").trim(),
      bands: selectedBands,
      ticketPrice: parseFloat(formData.get("ticketPrice")),
    };

    if (this.validate(festival)) {
      if (this.onSave) {
        this.onSave(festival);
      }
    }
  }

  validate(festival) {
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
    this.currentFestival = festival;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    this.container.innerHTML = `
      <div class="admin-form">
        <div class="form-header">
          <h2 class="form-title">Festival Details</h2>
        </div>

        <form id="festivalForm" class="festival-form">
          <div class="form-group">
            <label for="festivalName">Festival Name*</label>
            <input type="text" id="festivalName" name="name" required placeholder="Enter festival name">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="festivalStartDate">Start Date*</label>
              <input type="date" id="festivalStartDate" name="startDate" required>
            </div>

            <div class="form-group">
              <label for="festivalEndDate">End Date*</label>
              <input type="date" id="festivalEndDate" name="endDate" required>
            </div>
          </div>

          <div class="form-group">
            <label for="festivalLocation">Location*</label>
            <input type="text" id="festivalLocation" name="location" required placeholder="City, Country">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="festivalLatitude">Latitude*</label>
              <input type="number" id="festivalLatitude" name="latitude" step="0.000001" required placeholder="51.5074">
            </div>

            <div class="form-group">
              <label for="festivalLongitude">Longitude*</label>
              <input type="number" id="festivalLongitude" name="longitude" step="0.000001" required placeholder="-0.1278">
            </div>
          </div>

          <div class="form-group">
            <label for="festivalPoster">Poster URL*</label>
            <input type="url" id="festivalPoster" name="poster" required placeholder="https://example.com/poster.jpg">
          </div>

          <div class="form-group">
            <label for="festivalWebsite">Website*</label>
            <input type="url" id="festivalWebsite" name="website" required placeholder="https://example.com">
          </div>

          <div class="form-group">
            <label for="festivalTicketPrice">Ticket Price (€)*</label>
            <input type="number" id="festivalTicketPrice" name="ticketPrice" step="0.01" min="0" required placeholder="0.00">
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

          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
            <button type="submit" class="btn-primary">Save Festival</button>
          </div>
        </form>
      </div>
    `;

    const form = this.container.querySelector("#festivalForm");
    if (!form) return;

    form.elements.name.value = this.currentFestival.name || "";
    form.elements.startDate.value = this.currentFestival.dates?.start || "";
    form.elements.endDate.value = this.currentFestival.dates?.end || "";
    form.elements.location.value = this.currentFestival.location || "";
    form.elements.latitude.value = this.currentFestival.coordinates?.lat || "";
    form.elements.longitude.value = this.currentFestival.coordinates?.lng || "";
    form.elements.poster.value = this.currentFestival.poster || "";
    form.elements.website.value = this.currentFestival.website || "";
    form.elements.ticketPrice.value = this.currentFestival.ticketPrice || "";

    this.renderBandsOptions();

    const checkboxes = this.container.querySelectorAll('#bandsOptions input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.checked = this.currentFestival.bands?.includes(cb.value) || false;
    });

    this.updateSelectedBands();
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
