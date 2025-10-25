class AdminNav {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`AdminNav container not found: ${containerId}`);
      return;
    }
    this.init();
  }

  async init() {
    await this.loadComponent();
    this.setupEventListeners();
    this.updateActiveLink();
  }

  setupEventListeners() {
    if (this.sortToggle) {
      this.sortToggle.addEventListener("click", () => {
        this.toggleSort();
      });
    }
  }

  async loadComponent() {
    try {
      const response = await fetch("/components/admin-nav/admin-nav.html");
      if (!response.ok) {
        throw new Error(`Failed to load admin nav: ${response.statusText}`);
      }
      const html = await response.text();
      this.container.innerHTML = html;
    } catch (error) {
      console.error("Error loading admin nav:", error);
    }
  }

  updateActiveLink() {
    const currentPath = window.location.pathname;
    const links = this.container.querySelectorAll(".admin-nav-link");

    links.forEach((link) => {
      link.classList.remove("active");
      const page = link.getAttribute("data-page");

      if (
        (page === "festivals" && (currentPath === "/admin" || currentPath === "/admin/")) ||
        (page === "bands" && currentPath.includes("/admin/bands"))
      ) {
        link.classList.add("active");
      }
    });
  }
}
