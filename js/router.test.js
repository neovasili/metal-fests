// Unit tests for ClientRouter (router.js)
// ClientRouter is loaded globally via vitest.setup.js

describe("ClientRouter", () => {
  let router;
  let mockSPARouter;

  beforeEach(() => {
    // Mock SPARouter
    mockSPARouter = {
      routes: {},
      onRouteChange: null,
      linkSelector: null,
    };

    global.SPARouter = vi.fn((config) => {
      mockSPARouter.routes = config.routes;
      mockSPARouter.onRouteChange = config.onRouteChange;
      mockSPARouter.linkSelector = config.linkSelector;
      return mockSPARouter;
    });

    // Setup DOM
    document.body.innerHTML = `
      <div id="timeline-view"></div>
      <div id="map-view"></div>
      <div id="loading-text"></div>
    `;

    // Mock window.location
    delete window.location;
    window.location = {
      href: "",
      pathname: "/",
    };

    // Mock window.initializeMap
    window.initializeMap = vi.fn();
    window.sharedFestivals = [];
    window.sharedFavoritesManager = {};
    window.sharedFilterManager = {};
    window.sharedBandsFilterManager = {};
    window.sharedSearchFilterManager = {};
    window.sharedBandManager = {};

    // Mock setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      router = new ClientRouter();
      expect(router.bandRoutePattern).toBeInstanceOf(RegExp);
      expect(router.currentView).toBeNull();
      expect(router.mapInitialized).toBe(false);
    });

    it("should initialize SPARouter with correct config", () => {
      router = new ClientRouter();
      expect(global.SPARouter).toHaveBeenCalled();
      expect(mockSPARouter.routes).toEqual({
        "/": "timeline",
        "/timeline": "timeline",
        "/map": "map",
        "/error": "error",
      });
      expect(mockSPARouter.linkSelector).toBe(".view-link");
    });
  });

  describe("getTargetView", () => {
    beforeEach(() => {
      router = new ClientRouter();
    });

    it("should return timeline for root path", () => {
      expect(router.getTargetView("/")).toBe("timeline");
    });

    it("should return timeline for /timeline path", () => {
      expect(router.getTargetView("/timeline")).toBe("timeline");
    });

    it("should return timeline for band routes", () => {
      expect(router.getTargetView("/bands/metallica")).toBe("timeline");
    });

    it("should return map for /map path", () => {
      expect(router.getTargetView("/map")).toBe("map");
    });

    it("should return error for /error path", () => {
      expect(router.getTargetView("/error")).toBe("error");
    });

    it("should return timeline for unknown paths", () => {
      expect(router.getTargetView("/unknown")).toBe("timeline");
    });
  });

  describe("handleRouteChange", () => {
    beforeEach(() => {
      router = new ClientRouter();
    });

    it("should not handle band routes", () => {
      const switchViewSpy = vi.spyOn(router, "switchView");
      router.handleRouteChange("/bands/metallica", false);
      expect(switchViewSpy).not.toHaveBeenCalled();
    });

    it("should redirect to error.html for error view when not initial", () => {
      router.handleRouteChange("/error", false);
      expect(window.location.href).toBe("error.html");
    });

    it("should not redirect to error.html on initial load", () => {
      router.handleRouteChange("/error", true);
      expect(window.location.href).toBe("");
    });

    it("should switch view for timeline on SPA page", () => {
      const switchViewSpy = vi.spyOn(router, "switchView");
      router.handleRouteChange("/timeline", false);
      expect(switchViewSpy).toHaveBeenCalledWith("timeline", false);
    });

    it("should switch view for map on SPA page", () => {
      const switchViewSpy = vi.spyOn(router, "switchView");
      router.handleRouteChange("/map", false);
      expect(switchViewSpy).toHaveBeenCalledWith("map", false);
    });

    it("should redirect to index.html when not on SPA page", () => {
      document.body.innerHTML = ""; // Remove timeline-view and map-view
      router.handleRouteChange("/timeline", false);
      expect(window.location.href).toBe("index.html");
    });

    it("should redirect to / for map when not on SPA page", () => {
      document.body.innerHTML = "";
      router.handleRouteChange("/map", false);
      expect(window.location.href).toBe("/");
    });

    it("should not redirect when on standalone page on initial load", () => {
      document.body.innerHTML = "";
      router.handleRouteChange("/timeline", true);
      expect(window.location.href).toBe("");
    });
  });

  describe("switchView", () => {
    beforeEach(() => {
      router = new ClientRouter();
    });

    it("should not switch if already on the same view", () => {
      router.currentView = "timeline";
      const timelineView = document.getElementById("timeline-view");
      timelineView.style.display = "none";

      router.switchView("timeline", false);

      expect(timelineView.style.display).toBe("none"); // Should not change
    });

    it("should switch to timeline view", () => {
      const timelineView = document.getElementById("timeline-view");
      const mapView = document.getElementById("map-view");
      const loadingText = document.getElementById("loading-text");

      router.switchView("timeline", true);

      expect(timelineView.style.display).toBe("block");
      expect(mapView.style.display).toBe("none");
      expect(loadingText.textContent).toBe("Loading festivals...");
      expect(document.title).toBe("European Metal Festivals 2026 Timeline");
      expect(router.currentView).toBe("timeline");
    });

    it("should switch to map view", () => {
      const timelineView = document.getElementById("timeline-view");
      const mapView = document.getElementById("map-view");
      const loadingText = document.getElementById("loading-text");

      router.switchView("map", true);

      expect(timelineView.style.display).toBe("none");
      expect(mapView.style.display).toBe("block");
      expect(loadingText.textContent).toBe("Loading festivals map...");
      expect(document.title).toBe("Festival Map - European Metal Festivals 2026");
      expect(router.currentView).toBe("map");
    });

    it("should initialize map on first switch to map view", () => {
      router.switchView("map", true);

      expect(router.mapInitialized).toBe(true);

      vi.advanceTimersByTime(50);

      expect(window.initializeMap).toHaveBeenCalledWith([], {}, {}, {}, {}, {});
    });

    it("should not initialize map again on subsequent switches", () => {
      router.switchView("map", true);
      vi.advanceTimersByTime(50);
      expect(window.initializeMap).toHaveBeenCalledTimes(1);

      router.currentView = "timeline";
      router.switchView("map", true);
      vi.advanceTimersByTime(50);
      expect(window.initializeMap).toHaveBeenCalledTimes(1);
    });

    it("should not initialize map if initializeMap function is not available", () => {
      delete window.initializeMap;

      router.switchView("map", true);
      vi.advanceTimersByTime(50);

      expect(router.mapInitialized).toBe(false);
    });

    it("should handle missing DOM elements gracefully", () => {
      document.body.innerHTML = "";

      expect(() => router.switchView("timeline", true)).not.toThrow();
      expect(() => router.switchView("map", true)).not.toThrow();
    });

    it("should pass shared data to map initialization", () => {
      window.sharedFestivals = [{ name: "Wacken" }];
      window.sharedFavoritesManager = { test: "favorites" };
      window.sharedFilterManager = { test: "filter" };
      window.sharedBandsFilterManager = { test: "bands" };
      window.sharedSearchFilterManager = { test: "search" };
      window.sharedBandManager = { test: "band" };

      router.switchView("map", true);
      vi.advanceTimersByTime(50);

      expect(window.initializeMap).toHaveBeenCalledWith(
        [{ name: "Wacken" }],
        { test: "favorites" },
        { test: "filter" },
        { test: "bands" },
        { test: "search" },
        { test: "band" },
      );
    });
  });

  describe("band route pattern", () => {
    beforeEach(() => {
      router = new ClientRouter();
    });

    it("should match valid band routes", () => {
      expect("/bands/metallica".match(router.bandRoutePattern)).toBeTruthy();
      expect("/bands/iron-maiden".match(router.bandRoutePattern)).toBeTruthy();
      expect("/bands/ac-dc".match(router.bandRoutePattern)).toBeTruthy();
    });

    it("should not match invalid band routes", () => {
      expect("/bands/".match(router.bandRoutePattern)).toBeFalsy();
      expect("/bands/Metallica".match(router.bandRoutePattern)).toBeFalsy(); // Uppercase
      expect("/bands/band_name".match(router.bandRoutePattern)).toBeFalsy(); // Underscore
      expect("/bands/band name".match(router.bandRoutePattern)).toBeFalsy(); // Space
    });
  });
});
