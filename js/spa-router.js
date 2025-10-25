// Generic SPA Router for both public and admin pages
class SPARouter {
  constructor(config) {
    this.routes = config.routes || {};
    this.onRouteChange = config.onRouteChange || (() => {});
    this.linkSelector = config.linkSelector || "a";
    this.routePatterns = config.routePatterns || [];
    this.storageKey = config.storageKey || null; // Optional localStorage key for route persistence
    this.init();
  }

  init() {
    // Handle initial page load
    this.handleInitialRoute();

    // Handle browser back/forward buttons
    window.addEventListener("popstate", (e) => {
      const path = window.location.pathname;
      this.saveRoute(path);
      this.onRouteChange(path, false);
      this.updateActiveNav(path);
    });

    // Intercept navigation clicks
    document.addEventListener("click", (e) => {
      const link = e.target.closest(this.linkSelector);
      if (link && this.isInternalLink(link)) {
        e.preventDefault();
        const href = link.getAttribute("href");
        this.navigate(href);
      }
    });
  }

  isInternalLink(link) {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("/") || href.startsWith("//")) {
      return false;
    }
    // Skip links with target attribute or data-no-route
    if (link.hasAttribute("target") || link.hasAttribute("data-no-route")) {
      return false;
    }
    return true;
  }

  handleInitialRoute() {
    let currentPath = window.location.pathname;

    // Check if we have a saved route in localStorage (for page reloads)
    if (this.storageKey) {
      const savedRoute = this.getSavedRoute();
      // Only use saved route if current path is the base route
      if (savedRoute && this.isBaseRoute(currentPath)) {
        currentPath = savedRoute;
        window.history.replaceState({ path: currentPath }, "", currentPath);
      }
    }

    // Clean up URL if it has .html extension
    if (currentPath.endsWith(".html")) {
      const cleanPath = this.getCleanPath(currentPath);
      window.history.replaceState({ path: cleanPath }, "", cleanPath);
      this.saveRoute(cleanPath);
      this.onRouteChange(cleanPath, true);
    } else {
      this.saveRoute(currentPath);
      this.onRouteChange(currentPath, true);
    }

    this.updateActiveNav(currentPath);
  }

  isBaseRoute(path) {
    // Check if path is one of the base routes that should be replaced with saved route
    const baseRoutes = Object.keys(this.routes).filter((route) => {
      // Get the first route that matches a base pattern
      return route === "/" || route.endsWith("/");
    });
    return baseRoutes.includes(path);
  }

  saveRoute(path) {
    if (this.storageKey) {
      try {
        localStorage.setItem(this.storageKey, path);
      } catch (error) {
        console.error("Error saving route to localStorage:", error);
      }
    }
  }

  getSavedRoute() {
    if (this.storageKey) {
      try {
        return localStorage.getItem(this.storageKey);
      } catch (error) {
        console.error("Error loading route from localStorage:", error);
      }
    }
    return null;
  }

  getCleanPath(path) {
    // Map HTML files to clean URLs
    if (path.includes("index.html")) {
      return path.replace("index.html", "").replace(/\/$/, "") || "/";
    } else if (path.includes("map.html")) {
      return "/map";
    } else if (path.includes("error.html")) {
      return "/error";
    }
    return path;
  }

  navigate(path) {
    // Don't navigate if already on this path
    if (window.location.pathname === path) {
      return;
    }
    console.log("navigating to:", path);

    // Update browser history
    window.history.pushState({ path }, "", path);

    // Save route to localStorage
    this.saveRoute(path);

    // Trigger route change callback
    this.onRouteChange(path, false);

    // Update navigation state
    this.updateActiveNav(path);
  }

  updateActiveNav(currentPath) {
    const navLinks = document.querySelectorAll(this.linkSelector);

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      link.classList.remove("active");

      // Check if this link should be active
      if (this.isActiveRoute(currentPath, href)) {
        link.classList.add("active");
      }
    });
  }

  isActiveRoute(currentPath, linkHref) {
    if (!linkHref) return false;

    // Exact match
    if (currentPath === linkHref) {
      return true;
    }

    // Handle root/timeline special case
    if ((currentPath === "/" || currentPath === "/timeline") && linkHref === "/") {
      return true;
    }

    // Check if current path starts with link href (for nested routes)
    if (linkHref !== "/" && currentPath.startsWith(linkHref)) {
      return true;
    }

    return false;
  }

  getCurrentRoute() {
    return window.location.pathname;
  }
}

// Export for use in modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = SPARouter;
}
