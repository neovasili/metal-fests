class AdminPageLoader {
  constructor() {
    this.formContainerId = "edit-form-container";
    this.listContainerId = "management-list-container";
    this.adminNav = new AdminNav("adminNavContainer");
    this.adminTabs = null;
    this.festivalManager = null;
    this.bandManager = null;
    this.router = null;
  }

  async init() {
    this.festivalManager = new FestivalManager(this.listContainerId, this.formContainerId);
    this.bandManager = new BandManager(this.listContainerId, this.formContainerId);
    await this.festivalManager.init();
    await this.bandManager.init();

    this.initRouter();
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
    const targetPage = this.getTargetPage(path);
    this.loadPage(targetPage);
  }

  getTargetPage(path) {
    if (path === "/admin" || path === "/admin/") {
      return "festivals";
    } else if (path === "/admin/bands") {
      return "bands";
    }
  }

  async loadPage(page) {
    if (page === "festivals") {
      await this.loadFestivalsPage();
    } else if (page === "bands") {
      await this.loadBandsPage();
    }
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

  async loadFestivalsPage() {
    console.log("loadFestivalsPage called");
    this.updatePageTitle("Festivals Management");
    this.updateAdminBadge("Festivals Management");

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

  async loadBandsPage() {
    this.updatePageTitle("Bands Management");
    this.updateAdminBadge("Bands Management");

    this.clearTabs();

    await this.initBandTabs();

    await this.bandManager.render();
  }

  async initBandTabs() {
    // Get counts from managers
    const reviewCount = this.bandManager ? this.bandManager.getBandsToReview().length : 0;
    const reviewedCount = this.bandManager ? this.bandManager.getBandsReviewed().length : 0;

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

  handleTabChange(tabId) {
    console.log("Tab changed to:", tabId);
    localStorage.setItem("adminActiveTab", tabId);

    // Update the band manager to filter by the new tab
    if (this.bandManager) {
      this.bandManager.setActiveTab(tabId);
    }
  }

  getActiveTab() {
    return localStorage.getItem("adminActiveTab") || "review";
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
