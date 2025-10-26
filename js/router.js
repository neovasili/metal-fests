// Client-side router for public pages using SPARouter
class ClientRouter {
  constructor() {
    this.bandRoutePattern = /^\/bands\/([a-z0-9-]+)$/;
    this.currentView = null;
    this.mapInitialized = false;
    this.init();
  }

  init() {
    // Initialize SPA Router for view links
    this.router = new SPARouter({
      routes: {
        "/": "timeline",
        "/timeline": "timeline",
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
      // Band routes stay on timeline view, BandManager handles the modal
      return;
    }

    // Determine which view to show
    const targetView = this.getTargetView(path);

    // If error page is needed, redirect to error.html
    if (targetView === "error") {
      if (!isInitial) {
        window.location.href = "error.html";
      }
      return;
    }

    // Check if we're on the main SPA page (index.html)
    const hasTimelineView = document.getElementById("timeline-view") !== null;
    const hasMapView = document.getElementById("map-view") !== null;

    if (hasTimelineView && hasMapView) {
      // We're on the SPA page, just switch views
      this.switchView(targetView, isInitial);
    } else {
      // We're on a standalone page (map.html or error.html), redirect to index.html
      if (!isInitial) {
        window.location.href = path === "/map" ? "/" : "index.html";
      }
    }
  }

  getTargetView(path) {
    if (path === "/" || path === "/timeline" || path.match(this.bandRoutePattern)) {
      return "timeline";
    } else if (path === "/map") {
      return "map";
    } else if (path === "/error") {
      return "error";
    }
    return "timeline";
  }

  switchView(view, isInitial) {
    // Don't switch if already on this view
    if (this.currentView === view && !isInitial) {
      return;
    }

    this.currentView = view;

    const timelineView = document.getElementById("timeline-view");
    const mapView = document.getElementById("map-view");
    const loadingText = document.getElementById("loading-text");

    if (view === "timeline") {
      // Show timeline, hide map
      if (timelineView) timelineView.style.display = "block";
      if (mapView) mapView.style.display = "none";
      if (loadingText) loadingText.textContent = "Loading festivals...";
      document.title = "European Metal Festivals 2026 Timeline";
    } else if (view === "map") {
      // Show map, hide timeline
      if (timelineView) timelineView.style.display = "none";
      if (mapView) mapView.style.display = "block";
      if (loadingText) loadingText.textContent = "Loading festivals map...";
      document.title = "Festival Map - European Metal Festivals 2026";

      // Initialize map if not already done
      if (!this.mapInitialized && typeof window.initializeMap === "function") {
        this.mapInitialized = true;
        // Small delay to ensure the map container is visible
        setTimeout(() => {
          // Pass shared data and managers from timeline to map
          const festivals = window.sharedFestivals || [];
          const favoritesManager = window.sharedFavoritesManager;
          const filterManager = window.sharedFilterManager;
          const bandsFilterManager = window.sharedBandsFilterManager;
          const bandManager = window.sharedBandManager;

          window.initializeMap(festivals, favoritesManager, filterManager, bandsFilterManager, bandManager);
        }, 50);
      }
    }
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
