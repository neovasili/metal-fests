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
}
