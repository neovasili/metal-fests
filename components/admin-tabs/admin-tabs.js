class AdminTabs {
  constructor(containerId, config) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`AdminTabs container not found: ${containerId}`);
      return;
    }
    this.tabs = config.tabs || [];
    this.onTabChange = config.onTabChange || (() => {});
    this.activeTab = config.activeTabId || this.tabs[0]?.id || null;
    this.init();
  }

  async init() {
    await this.loadComponent();
    this.renderTabs();
    this.setupEventListeners();
  }

  async loadComponent() {
    try {
      const response = await fetch("/components/admin-tabs/admin-tabs.html");
      if (!response.ok) {
        throw new Error(`Failed to load admin tabs: ${response.statusText}`);
      }
      const html = await response.text();
      this.container.innerHTML = html;
    } catch (error) {
      console.error("Error loading admin tabs:", error);
    }
  }

  renderTabs() {
    const tabsContainer = this.container.querySelector(".admin-tabs");
    if (!tabsContainer) return;

    tabsContainer.innerHTML = this.tabs
      .map(
        (tab) => `
      <button class="admin-tab ${tab.id === this.activeTab ? "active" : ""}" data-tab="${tab.id}">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="${tab.icon}"/>
        </svg>
        ${tab.label}${tab.count !== undefined ? ` (<span class="tab-count" data-tab="${tab.id}">${tab.count}</span>)` : ""}
      </button>
    `,
      )
      .join("");
  }

  setupEventListeners() {
    const tabButtons = this.container.querySelectorAll(".admin-tab");
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.getAttribute("data-tab");
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    const tabButtons = this.container.querySelectorAll(".admin-tab");
    tabButtons.forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-tab") === tabId);
    });

    if (this.onTabChange) {
      this.onTabChange(tabId);
    }
  }

  updateCount(tabId, count) {
    const countElement = this.container.querySelector(`.tab-count[data-tab="${tabId}"]`);
    if (countElement) {
      countElement.textContent = count;
    }
  }

  getActiveTab() {
    return this.activeTab;
  }
}
