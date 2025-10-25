// Client-side router for public pages using SPARouter
class ClientRouter {
  constructor() {
    this.bandRoutePattern = /^\/bands\/([a-z0-9-]+)$/;
    this.init();
  }

  init() {
    // Initialize SPA Router for view links
    this.router = new SPARouter({
      routes: {
        "/": "index",
        "/timeline": "index",
        "/map": "map",
        "/error": "error",
      },
      linkSelector: ".view-link",
      onRouteChange: (path, isInitial) => {
        this.handleRouteChange(path, isInitial);
      },
    });
  }

  handleRouteChange(path, isInitial) {
    // Check if it's a band route - those are handled by BandManager
    const bandMatch = path.match(this.bandRoutePattern);
    if (bandMatch) {
      // Band routes stay on index page, BandManager handles the modal
      return;
    }

    // For other routes, check if we need to reload the page
    const targetPage = this.getTargetPage(path);
    const currentPage = this.getCurrentPage();

    if (targetPage !== currentPage && !isInitial) {
      // Need to navigate to a different HTML file
      this.loadPage(targetPage);
    }
  }

  getTargetPage(path) {
    if (path === "/" || path === "/timeline" || path.match(this.bandRoutePattern)) {
      return "index.html";
    } else if (path === "/map") {
      return "map.html";
    } else if (path === "/error") {
      return "error.html";
    }
    return "index.html";
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path.endsWith(".html")) {
      return path.split("/").pop();
    }
    // If no .html extension, we're on a clean URL
    return this.getTargetPage(path);
  }

  loadPage(htmlFile) {
    // Navigate to the HTML file
    window.location.href = htmlFile;
  }
}

// Initialize router when DOM is loaded
function initializeRouter() {
  // Small delay to ensure navigation elements are rendered
  setTimeout(() => {
    new ClientRouter();
  }, 100);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeRouter);
} else {
  initializeRouter();
}
