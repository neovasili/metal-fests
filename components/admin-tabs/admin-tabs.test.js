import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// AdminTabs is loaded globally via vitest.setup.js

describe("AdminTabs", () => {
  let container;
  let mockConfig;
  let mockOnTabChange;

  beforeEach(() => {
    // Create container
    container = document.createElement("div");
    container.id = "admin-tabs-container";
    document.body.appendChild(container);

    // Mock config
    mockOnTabChange = vi.fn();
    mockConfig = {
      tabs: [
        {
          id: "festivals",
          label: "Festivals",
          icon: "M12,2L2,7V17H22V7L12,2Z",
          count: 5,
        },
        {
          id: "bands",
          label: "Bands",
          icon: "M12,3V13.55C11.41,13.21 10.73,13 10,13",
          count: 10,
        },
      ],
      onTabChange: mockOnTabChange,
      activeTabId: "festivals",
    };

    // Mock fetch for template
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<div class="admin-tabs"></div>',
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with container and config", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);

      // Wait for init
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(adminTabs.container).toBe(container);
      expect(adminTabs.tabs).toEqual(mockConfig.tabs);
      expect(adminTabs.onTabChange).toBe(mockOnTabChange);
      expect(adminTabs.activeTab).toBe("festivals");
    });

    it("should use first tab as active if no activeTabId provided", async () => {
      const configWithoutActive = { ...mockConfig };
      delete configWithoutActive.activeTabId;

      const adminTabs = new AdminTabs("admin-tabs-container", configWithoutActive);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(adminTabs.activeTab).toBe("festivals");
    });

    it("should handle missing container gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const adminTabs = new AdminTabs("non-existent-container", mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("AdminTabs container not found"));
      expect(adminTabs.container).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should set default empty tabs array if none provided", async () => {
      const configWithoutTabs = { onTabChange: mockOnTabChange };
      const adminTabs = new AdminTabs("admin-tabs-container", configWithoutTabs);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(adminTabs.tabs).toEqual([]);
    });

    it("should set default noop onTabChange if none provided", async () => {
      const configWithoutCallback = { tabs: mockConfig.tabs };
      const adminTabs = new AdminTabs("admin-tabs-container", configWithoutCallback);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(() => adminTabs.onTabChange()).not.toThrow();
    });
  });

  describe("loadComponent", () => {
    it("should fetch and load template HTML", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await adminTabs.loadComponent();

      expect(global.fetch).toHaveBeenCalledWith("/components/admin-tabs/admin-tabs.html");
      expect(container.innerHTML).toContain('class="admin-tabs"');
    });

    it("should handle fetch errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await adminTabs.loadComponent();

      expect(consoleSpy).toHaveBeenCalledWith("Error loading admin tabs:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("should handle non-ok response", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await adminTabs.loadComponent();

      expect(consoleSpy).toHaveBeenCalledWith("Error loading admin tabs:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("renderTabs", () => {
    it("should render all tabs with correct labels", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const buttons = container.querySelectorAll(".admin-tab");
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toContain("Festivals");
      expect(buttons[1].textContent).toContain("Bands");
    });

    it("should mark active tab with active class", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const buttons = container.querySelectorAll(".admin-tab");
      expect(buttons[0].classList.contains("active")).toBe(true);
      expect(buttons[1].classList.contains("active")).toBe(false);
    });

    it("should render counts when provided", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const countElements = container.querySelectorAll(".tab-count");
      expect(countElements.length).toBe(2);
      expect(countElements[0].textContent).toBe("5");
      expect(countElements[1].textContent).toBe("10");
    });

    it("should render tabs without counts when not provided", async () => {
      const configWithoutCounts = {
        ...mockConfig,
        tabs: [
          { id: "tab1", label: "Tab 1", icon: "icon1" },
          { id: "tab2", label: "Tab 2", icon: "icon2" },
        ],
      };

      const adminTabs = new AdminTabs("admin-tabs-container", configWithoutCounts);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const countElements = container.querySelectorAll(".tab-count");
      expect(countElements.length).toBe(0);
    });

    it("should render SVG icons", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(2);
      expect(svgs[0].querySelector("path")).not.toBeNull();
    });

    it("should handle missing tabs container gracefully", async () => {
      container.innerHTML = "<div>No tabs container</div>";
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      adminTabs.container = container;

      expect(() => adminTabs.renderTabs()).not.toThrow();
    });
  });

  describe("setupEventListeners", () => {
    it("should add click listeners to all tab buttons", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const buttons = container.querySelectorAll(".admin-tab");
      buttons[1].click();

      expect(mockOnTabChange).toHaveBeenCalledWith("bands");
    });

    it("should call switchTab when button is clicked", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const switchTabSpy = vi.spyOn(adminTabs, "switchTab");
      const buttons = container.querySelectorAll(".admin-tab");
      buttons[1].click();

      expect(switchTabSpy).toHaveBeenCalledWith("bands");
    });
  });

  describe("switchTab", () => {
    it("should update activeTab property", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      adminTabs.switchTab("bands");
      expect(adminTabs.activeTab).toBe("bands");
    });

    it("should toggle active class on buttons", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      adminTabs.switchTab("bands");

      const buttons = container.querySelectorAll(".admin-tab");
      expect(buttons[0].classList.contains("active")).toBe(false);
      expect(buttons[1].classList.contains("active")).toBe(true);
    });

    it("should call onTabChange callback", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      mockOnTabChange.mockClear();
      adminTabs.switchTab("bands");

      expect(mockOnTabChange).toHaveBeenCalledWith("bands");
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it("should handle switching to same tab", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      mockOnTabChange.mockClear();
      adminTabs.switchTab("festivals");

      expect(mockOnTabChange).toHaveBeenCalledWith("festivals");
    });
  });

  describe("updateCount", () => {
    it("should update count for specified tab", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      adminTabs.updateCount("festivals", 15);

      const countElement = container.querySelector('.tab-count[data-tab="festivals"]');
      expect(countElement.textContent).toBe("15");
    });

    it("should handle updating multiple tabs", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      adminTabs.updateCount("festivals", 20);
      adminTabs.updateCount("bands", 30);

      const festivalCount = container.querySelector('.tab-count[data-tab="festivals"]');
      const bandsCount = container.querySelector('.tab-count[data-tab="bands"]');
      expect(festivalCount.textContent).toBe("20");
      expect(bandsCount.textContent).toBe("30");
    });

    it("should handle non-existent tab gracefully", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(() => adminTabs.updateCount("non-existent", 99)).not.toThrow();
    });

    it("should accept count updates", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      adminTabs.updateCount("festivals", 100);

      const countElement = container.querySelector('.tab-count[data-tab="festivals"]');
      expect(countElement.textContent).toBe("100");
    });
  });

  describe("getActiveTab", () => {
    it("should return current active tab", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(adminTabs.getActiveTab()).toBe("festivals");
    });

    it("should return updated active tab after switch", async () => {
      const adminTabs = new AdminTabs("admin-tabs-container", mockConfig);
      await new Promise((resolve) => setTimeout(resolve, 50));

      adminTabs.switchTab("bands");
      expect(adminTabs.getActiveTab()).toBe("bands");
    });
  });
});
