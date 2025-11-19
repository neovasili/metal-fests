// Unit tests for HeaderManager
// HeaderManager is loaded globally via vitest.setup.js

describe("HeaderManager", () => {
  let headerManager;
  let mockHeader;
  let mockHamburgerMenu;
  let mockMobileMenu;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <header class="header">
        <button id="hamburger-menu"></button>
        <nav id="mobile-menu">
          <a class="view-link" href="/">Home</a>
          <a class="view-link" href="/map">Map</a>
        </nav>
      </header>
    `;

    mockHeader = document.querySelector(".header");
    mockHamburgerMenu = document.getElementById("hamburger-menu");
    mockMobileMenu = document.getElementById("mobile-menu");

    // Mock window.scrollY
    Object.defineProperty(window, "scrollY", {
      writable: true,
      value: 0,
    });

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      cb();
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with DOM elements", () => {
      headerManager = new HeaderManager();
      expect(headerManager.header).toBe(mockHeader);
      expect(headerManager.hamburgerMenu).toBe(mockHamburgerMenu);
      expect(headerManager.mobileMenu).toBe(mockMobileMenu);
    });

    it("should initialize lastScrollY with current scroll position", () => {
      window.scrollY = 150;
      headerManager = new HeaderManager();
      expect(headerManager.lastScrollY).toBe(150);
    });

    it("should call init method", () => {
      const initSpy = vi.spyOn(HeaderManager.prototype, "init");
      headerManager = new HeaderManager();
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe("toggleMobileMenu", () => {
    beforeEach(() => {
      headerManager = new HeaderManager();
    });

    it("should open menu when closed", () => {
      headerManager.toggleMobileMenu();
      expect(mockMobileMenu.classList.contains("active")).toBe(true);
      expect(mockHamburgerMenu.classList.contains("active")).toBe(true);
    });

    it("should close menu when open", () => {
      mockMobileMenu.classList.add("active");
      headerManager.toggleMobileMenu();
      expect(mockMobileMenu.classList.contains("active")).toBe(false);
      expect(mockHamburgerMenu.classList.contains("active")).toBe(false);
    });
  });

  describe("openMobileMenu", () => {
    beforeEach(() => {
      headerManager = new HeaderManager();
    });

    it("should add active class to menu and hamburger", () => {
      headerManager.openMobileMenu();
      expect(mockMobileMenu.classList.contains("active")).toBe(true);
      expect(mockHamburgerMenu.classList.contains("active")).toBe(true);
    });

    it("should prevent body scroll", () => {
      headerManager.openMobileMenu();
      expect(document.body.style.overflow).toBe("hidden");
    });
  });

  describe("closeMobileMenu", () => {
    beforeEach(() => {
      headerManager = new HeaderManager();
      mockMobileMenu.classList.add("active");
      mockHamburgerMenu.classList.add("active");
      document.body.style.overflow = "hidden";
    });

    it("should remove active class from menu and hamburger", () => {
      headerManager.closeMobileMenu();
      expect(mockMobileMenu.classList.contains("active")).toBe(false);
      expect(mockHamburgerMenu.classList.contains("active")).toBe(false);
    });

    it("should restore body scroll", () => {
      headerManager.closeMobileMenu();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("hamburger menu interactions", () => {
    beforeEach(() => {
      headerManager = new HeaderManager();
    });

    it("should toggle menu when hamburger is clicked", () => {
      mockHamburgerMenu.click();
      expect(mockMobileMenu.classList.contains("active")).toBe(true);

      mockHamburgerMenu.click();
      expect(mockMobileMenu.classList.contains("active")).toBe(false);
    });

    it("should close menu when clicking outside header", () => {
      headerManager.openMobileMenu();
      expect(mockMobileMenu.classList.contains("active")).toBe(true);

      document.body.click();
      expect(mockMobileMenu.classList.contains("active")).toBe(false);
    });

    it("should not close menu when clicking inside header", () => {
      headerManager.openMobileMenu();
      mockHeader.click();
      expect(mockMobileMenu.classList.contains("active")).toBe(true);
    });

    it("should close menu on Escape key", () => {
      headerManager.openMobileMenu();

      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(escapeEvent);

      expect(mockMobileMenu.classList.contains("active")).toBe(false);
    });

    it("should not close menu on other keys", () => {
      headerManager.openMobileMenu();

      const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
      document.dispatchEvent(enterEvent);

      expect(mockMobileMenu.classList.contains("active")).toBe(true);
    });
  });

  describe("mobile menu links", () => {
    beforeEach(() => {
      headerManager = new HeaderManager();
    });

    it("should close menu when view link is clicked", () => {
      headerManager.openMobileMenu();

      const viewLink = mockMobileMenu.querySelector(".view-link");
      viewLink.click();

      expect(mockMobileMenu.classList.contains("active")).toBe(false);
    });
  });

  describe("scroll behavior", () => {
    let rafCallback;

    beforeEach(() => {
      // Mock requestAnimationFrame to capture the callback
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        rafCallback = cb;
        return 0;
      });
      headerManager = new HeaderManager();
    });

    it("should hide header when scrolling down past 100px", () => {
      window.scrollY = 150;
      window.dispatchEvent(new Event("scroll"));
      rafCallback(); // Execute the callback

      expect(mockHeader.classList.contains("hidden")).toBe(true);
      expect(headerManager.lastScrollY).toBe(150);
    });

    it("should not hide header when scrolling down less than 100px", () => {
      window.scrollY = 50;
      window.dispatchEvent(new Event("scroll"));
      rafCallback(); // Execute the callback

      expect(mockHeader.classList.contains("hidden")).toBe(false);
    });

    it("should show header when scrolling up", () => {
      // Start at top
      window.scrollY = 0;
      headerManager.lastScrollY = 0;

      // Scroll down first (past 100px threshold)
      window.scrollY = 150;
      window.dispatchEvent(new Event("scroll"));
      rafCallback(); // Execute the callback
      expect(mockHeader.classList.contains("hidden")).toBe(true);
      expect(headerManager.lastScrollY).toBe(150);

      // Now scroll up
      window.scrollY = 100;
      window.dispatchEvent(new Event("scroll"));
      rafCallback(); // Execute the callback
      expect(mockHeader.classList.contains("hidden")).toBe(false);
      expect(headerManager.lastScrollY).toBe(100);
    });

    it("should close mobile menu when scrolling down", () => {
      headerManager.openMobileMenu();
      expect(mockMobileMenu.classList.contains("active")).toBe(true);

      window.scrollY = 150;
      window.dispatchEvent(new Event("scroll"));
      rafCallback(); // Execute the callback

      expect(mockMobileMenu.classList.contains("active")).toBe(false);
    });

    it("should use requestAnimationFrame for scroll handling", () => {
      window.scrollY = 150;
      window.dispatchEvent(new Event("scroll"));

      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe("missing elements", () => {
    it("should handle missing hamburger menu gracefully", () => {
      document.body.innerHTML = `
        <header class="header">
          <nav id="mobile-menu"></nav>
        </header>
      `;

      expect(() => new HeaderManager()).not.toThrow();
    });

    it("should handle missing mobile menu", () => {
      document.body.innerHTML = `
        <header class="header">
          <button id="hamburger-menu"></button>
        </header>
      `;

      // Will throw error when trying to access mobileMenu methods
      expect(() => new HeaderManager()).toThrow();
    });
  });
});
