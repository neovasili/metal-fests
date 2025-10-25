class AdminPageLoader {
  constructor() {
    this.formContainerId = "edit-form-container";
    this.listContainerId = "management-list-container";
    this.currentPage = this.getCurrentPage();
    this.adminNav = new AdminNav("adminNavContainer");
    this.adminTabs = null;
    this.festivalManager = null;
    this.bandReviewManager = null;
    this.bandReviewedManager = null;
    this.router = null;
  }

  async init() {
    this.festivalManager = new FestivalManager(this.listContainerId, this.formContainerId);
    await this.festivalManager.init();

    this.initRouter();
  }

  async loadAdminNav() {
    this.adminNav = new AdminNav("adminNavContainer");
  }

  initRouter() {
    new SPARouter({
      routes: {
        "/admin": "festivals",
        "/admin/": "festivals",
        "/admin/bands": "bands",
      },
      linkSelector: ".admin-nav-link",
      storageKey: "adminCurrentPage", // Save current page to localStorage
      onRouteChange: (path, isInitial) => {
        this.handleRouteChange(path, isInitial);
      },
    });
  }

  handleRouteChange(path, isInitial) {
    this.loadPage(this.getTargetPage(path));
  }

  getTargetPage(path) {
    if (path === "/admin" || path === "/admin/") {
      return "festivals";
    } else if (path === "/admin/bands") {
      return "bands";
    }
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path.endsWith(".html")) {
      return path.split("/").pop();
    }
    // If no .html extension, we're on a clean URL
    return this.getTargetPage(path);
  }

  async loadPage() {
    if (this.currentPage === "festivals") {
      await this.loadFestivalsPage();
    } else if (this.currentPage === "bands") {
      await this.loadBandsPage();
    }
  }

  async loadFestivalsPage() {
    this.updatePageTitle("Festivals Management");
    this.updateAdminBadge("Festivals Management");

    // Clear tabs for festivals page (no tabs needed)
    this.clearTabs();

    await this.initFestivalsTabs();

    await this.festivalManager.render();
  }

  async initFestivalsTabs() {
    // Get counts from managers
    const festivalsCount =
      this.festivalManager && this.festivalManager.festivals ? this.festivalManager.festivals.length : 0;

    this.adminTabs = new AdminTabs("adminTabsContainer", {
      tabs: [
        {
          id: "review",
          label: "Festivals",
          icon: "M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19M17,8.4L13.4,12L17,15.6L15.6,17L12,13.4L8.4,17L7,15.6L10.6,12L7,8.4L8.4,7L12,10.6L15.6,7L17,8.4Z",
          count: festivalsCount,
        },
      ],
      activeTabId: this.getActiveTab(),
      onTabChange: (tabId) => this.handleTabChange(tabId),
    });
  }

  clearTabs() {
    // Clear the tabs container
    const tabsContainer = document.getElementById("adminTabsContainer");
    if (tabsContainer) {
      tabsContainer.innerHTML = "";
    }
    // Reset tabs instance
    this.adminTabs = null;
  }

  async loadBandsPage() {
    console.log("Loading Bands Page");
    this.updatePageTitle("Bands Management");
    this.updateAdminBadge("Bands Management");

    // Clear previous tabs
    this.clearTabs();

    const mainContainer = document.querySelector(".admin-main-content");
    if (!mainContainer) return;

    // Get the active tab preference to determine initial visibility
    const activeTab = this.getActiveTab();

    mainContainer.innerHTML = `
      <section class="admin-form-section">
        <div class="form-header">
          <button class="nav-arrow nav-prev" id="prevBand" disabled title="Previous band">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          <div class="form-header-title">
            <h2>Band Information</h2>
            <button class="btn-preview-band" id="previewBand" disabled title="Preview band page" style="display: none;">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
              </svg>
              Preview
            </button>
          </div>
          <button class="nav-arrow nav-next" id="nextBand" disabled title="Next band">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>
        </div>
        <div class="form-content" id="bandForm">
          <div class="form-placeholder">
            <p>Select a band from the list to start editing 👉</p>
          </div>
        </div>
      </section>

      <section class="admin-list-section" id="reviewTab" style="display: ${activeTab === "review" ? "block" : "none"};">
        <div class="list-header">
          <h2>Bands to Review (<span id="band-count">0</span>)</h2>
          <button class="sort-toggle" id="sortToggle" title="Toggle sort order">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
            </svg>
            <span id="sortLabel">A-Z</span>
          </button>
        </div>
        <div class="list-content" id="bandsList">
          <div class="list-placeholder">
            <p>🎉 No bands to review!</p>
          </div>
        </div>
      </section>

      <section class="admin-list-section" id="reviewedTab" style="display: ${activeTab === "reviewed" ? "block" : "none"};">
        <div class="list-header">
          <h2>Reviewed Bands (<span id="reviewed-band-count">0</span>)</h2>
          <button class="sort-toggle" id="sortToggleReviewed" title="Toggle sort order">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
            </svg>
            <span id="sortLabelReviewed">A-Z</span>
          </button>
        </div>
        <div class="list-content" id="bandsListReviewed">
          <div class="list-placeholder">
            <p>🎸 No reviewed bands yet!</p>
          </div>
        </div>
      </section>
    `;

    // Initialize band managers first (loads data)
    await this.initBandManagers();

    // Then create tabs with correct counts
    await this.initBandTabs();
  }

  async initBandTabs() {
    const reviewManager = this.bandReviewManager;
    const reviewedManager = this.bandReviewedManager;

    // Get counts from managers
    const reviewCount = reviewManager && reviewManager.bands ? reviewManager.bands.length : 0;
    const reviewedCount = reviewedManager && reviewedManager.bands ? reviewedManager.bands.length : 0;

    this.adminTabs = new AdminTabs("adminTabsContainer", {
      tabs: [
        {
          id: "review",
          label: "Bands to Review",
          icon: "M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19M17,8.4L13.4,12L17,15.6L15.6,17L12,13.4L8.4,17L7,15.6L10.6,12L7,8.4L8.4,7L12,10.6L15.6,7L17,8.4Z",
          count: reviewCount,
        },
        {
          id: "reviewed",
          label: "Reviewed Bands",
          icon: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
          count: reviewedCount,
        },
      ],
      activeTabId: this.getActiveTab(),
      onTabChange: (tabId) => this.handleTabChange(tabId),
    });
  }

  async initBandManagers() {
    window.notificationManager = new NotificationManager();

    this.bandReviewManager = new BandReviewManager();
    await this.bandReviewManager.init();

    this.bandReviewedManager = new BandReviewedManager();
    await this.bandReviewedManager.init();

    const bandEditForm = new BandEditForm("bandForm");
    await bandEditForm.init();

    this.bandReviewManager.editForm = bandEditForm;
    this.bandReviewedManager.editForm = bandEditForm;

    this.setupBandNavigation();
    this.restoreBandSession();
  }

  setupBandNavigation() {
    const prevBtn = document.getElementById("prevBand");
    const nextBtn = document.getElementById("nextBand");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const activeTab = this.getActiveTab();
        if (activeTab === "review") {
          this.bandReviewManager.navigateList(-1);
        } else {
          this.bandReviewedManager.navigateList(-1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const activeTab = this.getActiveTab();
        if (activeTab === "review") {
          this.bandReviewManager.navigateList(1);
        } else {
          this.bandReviewedManager.navigateList(1);
        }
      });
    }
  }

  handleTabChange(tabId) {
    localStorage.setItem("adminActiveTab", tabId);

    const reviewTab = document.getElementById("reviewTab");
    const reviewedTab = document.getElementById("reviewedTab");

    if (tabId === "review") {
      if (reviewTab) reviewTab.style.display = "block";
      if (reviewedTab) reviewedTab.style.display = "none";
    } else if (tabId === "reviewed") {
      if (reviewTab) reviewTab.style.display = "none";
      if (reviewedTab) reviewedTab.style.display = "block";
    }

    this.updateNavigationButtons();
  }

  getActiveTab() {
    return localStorage.getItem("adminActiveTab") || "review";
  }

  updateNavigationButtons() {
    const activeTab = this.getActiveTab();
    const prevBtn = document.getElementById("prevBand");
    const nextBtn = document.getElementById("nextBand");

    if (activeTab === "review") {
      const hasSelection = this.bandReviewManager && this.bandReviewManager.selectedIndex >= 0;
      if (prevBtn) prevBtn.disabled = !hasSelection;
      if (nextBtn) nextBtn.disabled = !hasSelection;
    } else {
      const hasSelection = this.bandReviewedManager && this.bandReviewedManager.selectedIndex >= 0;
      if (prevBtn) prevBtn.disabled = !hasSelection;
      if (nextBtn) nextBtn.disabled = !hasSelection;
    }
  }

  restoreBandSession() {
    const activeTab = this.getActiveTab();
    const savedBandName = localStorage.getItem("adminSelectedBand");

    if (activeTab && savedBandName) {
      if (activeTab === "review" && this.bandReviewManager) {
        const index = this.bandReviewManager.filteredBands.findIndex((b) => b.name === savedBandName);
        if (index >= 0) {
          this.bandReviewManager.selectBand(index);
        }
      } else if (activeTab === "reviewed" && this.bandReviewedManager) {
        const index = this.bandReviewedManager.filteredBands.findIndex((b) => b.name === savedBandName);
        if (index >= 0) {
          this.bandReviewedManager.selectBand(index);
        }
      }
    }
  }

  updatePageTitle(title) {
    document.title = `Admin - ${title} | Metal Festivals 2026`;
  }

  updateAdminBadge(text) {
    const badge = document.querySelector(".admin-badge");
    if (badge) {
      badge.textContent = text;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const adminPageLoader = new AdminPageLoader();
  adminPageLoader.init();
});
