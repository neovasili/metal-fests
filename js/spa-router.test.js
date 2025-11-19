// Unit tests for SPARouter
// SPARouter is loaded globally via vitest.setup.js

describe("SPARouter", () => {
  let router;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key) => mockLocalStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockLocalStorage[key] = value;
      }),
    };

    // Mock window.location and history
    delete window.location;
    window.location = { pathname: "/", href: "" };
    window.history = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    };

    // Mock document elements
    document.body.innerHTML = `
      <a href="/" class="nav-link">Home</a>
      <a href="/about" class="nav-link">About</a>
      <a href="https://external.com" class="nav-link">External</a>
      <a href="/bands/metallica" class="nav-link">Band</a>
    `;
  });

  afterEach(() => {
    if (router) {
      // Clean up event listeners
      router = null;
    }
  });

  describe("constructor", () => {
    it("should initialize with routes", () => {
      const onRouteChange = vi.fn();
      router = new SPARouter({
        routes: { "/": "home", "/about": "about" },
        onRouteChange,
        linkSelector: ".nav-link",
      });

      expect(router.routes).toEqual({ "/": "home", "/about": "about" });
      expect(onRouteChange).toHaveBeenCalled();
    });

    it("should use default linkSelector if not provided", () => {
      router = new SPARouter({
        routes: {},
        onRouteChange: vi.fn(),
      });

      expect(router.linkSelector).toBe("a");
    });

    it("should handle storageKey option", () => {
      router = new SPARouter({
        routes: {},
        onRouteChange: vi.fn(),
        storageKey: "testRouteKey",
      });

      expect(router.storageKey).toBe("testRouteKey");
    });
  });

  describe("isInternalLink", () => {
    beforeEach(() => {
      router = new SPARouter({
        routes: {},
        onRouteChange: vi.fn(),
      });
    });

    it("should return true for internal links", () => {
      const link = document.createElement("a");
      link.setAttribute("href", "/about");
      expect(router.isInternalLink(link)).toBe(true);
    });

    it("should return false for external links", () => {
      const link = document.createElement("a");
      link.setAttribute("href", "https://example.com");
      expect(router.isInternalLink(link)).toBe(false);
    });

    it("should return false for links with target attribute", () => {
      const link = document.createElement("a");
      link.setAttribute("href", "/about");
      link.setAttribute("target", "_blank");
      expect(router.isInternalLink(link)).toBe(false);
    });

    it("should return false for links with data-no-route attribute", () => {
      const link = document.createElement("a");
      link.setAttribute("href", "/about");
      link.setAttribute("data-no-route", "true");
      expect(router.isInternalLink(link)).toBe(false);
    });

    it("should return false for protocol-relative URLs", () => {
      const link = document.createElement("a");
      link.setAttribute("href", "//example.com");
      expect(router.isInternalLink(link)).toBe(false);
    });
  });

  describe("navigate", () => {
    beforeEach(() => {
      const onRouteChange = vi.fn();
      router = new SPARouter({
        routes: { "/": "home", "/about": "about" },
        onRouteChange,
        linkSelector: ".nav-link",
      });
    });

    it("should update history and call onRouteChange", () => {
      const onRouteChange = vi.fn();
      router.onRouteChange = onRouteChange;

      router.navigate("/about");

      expect(window.history.pushState).toHaveBeenCalledWith({ path: "/about" }, "", "/about");
      expect(onRouteChange).toHaveBeenCalledWith("/about", false);
    });

    it("should not navigate if already on the path", () => {
      window.location.pathname = "/about";
      const pushStateSpy = vi.spyOn(window.history, "pushState");

      router.navigate("/about");

      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it("should save route to localStorage if storageKey is set", () => {
      router.storageKey = "testKey";
      router.navigate("/about");

      expect(localStorage.setItem).toHaveBeenCalledWith("testKey", "/about");
    });
  });

  describe("getCleanPath", () => {
    beforeEach(() => {
      router = new SPARouter({
        routes: {},
        onRouteChange: vi.fn(),
      });
    });

    it("should clean index.html from path", () => {
      expect(router.getCleanPath("/index.html")).toBe("/");
    });

    it("should clean map.html from path", () => {
      expect(router.getCleanPath("/map.html")).toBe("/map");
    });

    it("should clean error.html from path", () => {
      expect(router.getCleanPath("/error.html")).toBe("/error");
    });

    it("should return path as-is if no .html", () => {
      expect(router.getCleanPath("/about")).toBe("/about");
    });
  });

  describe("isActiveRoute", () => {
    beforeEach(() => {
      router = new SPARouter({
        routes: {},
        onRouteChange: vi.fn(),
      });
    });

    it("should return true for exact match", () => {
      expect(router.isActiveRoute("/about", "/about")).toBe(true);
    });

    it("should handle root/timeline special case", () => {
      expect(router.isActiveRoute("/", "/")).toBe(true);
      expect(router.isActiveRoute("/timeline", "/")).toBe(true);
    });

    it("should return false for admin routes to prevent nested matching", () => {
      expect(router.isActiveRoute("/admin/bands", "/admin")).toBe(false);
    });

    it("should match nested routes for non-admin paths", () => {
      expect(router.isActiveRoute("/bands/metallica", "/bands")).toBe(true);
    });

    it("should not match root as prefix for other routes", () => {
      expect(router.isActiveRoute("/about", "/")).toBe(false);
    });
  });

  describe("getCurrentRoute", () => {
    it("should return current pathname", () => {
      window.location.pathname = "/test-path";
      router = new SPARouter({
        routes: {},
        onRouteChange: vi.fn(),
      });

      expect(router.getCurrentRoute()).toBe("/test-path");
    });
  });

  describe("localStorage integration", () => {
    it("should save route when storageKey is provided", () => {
      router = new SPARouter({
        routes: {},
        onRouteChange: vi.fn(),
        storageKey: "savedRoute",
      });

      router.navigate("/about");

      expect(localStorage.setItem).toHaveBeenCalledWith("savedRoute", "/about");
    });

    it("should handle localStorage errors gracefully", () => {
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage full");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      router = new SPARouter({
        routes: {},
        onRouteChange: vi.fn(),
        storageKey: "savedRoute",
      });

      expect(() => router.navigate("/about")).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
