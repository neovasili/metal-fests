import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// AdminPageLoader is loaded globally via vitest.setup.js

describe("AdminPageLoader", () => {
  let adminPageLoader;

  beforeEach(() => {
    // Create required containers
    const navContainer = document.createElement("div");
    navContainer.id = "adminNavContainer";
    document.body.appendChild(navContainer);

    const tabsContainer = document.createElement("div");
    tabsContainer.id = "adminTabsContainer";
    document.body.appendChild(tabsContainer);

    const listContainer = document.createElement("div");
    listContainer.id = "edit-form-container";
    document.body.appendChild(listContainer);

    const formContainer = document.createElement("div");
    formContainer.id = "management-list-container";
    document.body.appendChild(formContainer);

    const adminBadge = document.createElement("div");
    adminBadge.className = "admin-badge";
    document.body.appendChild(adminBadge);

    // Mock fetch for component loading
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "<div>Mock HTML</div>",
    });

    // Mock localStorage
    vi.spyOn(Storage.prototype, "getItem");
    vi.spyOn(Storage.prototype, "setItem");

    // Mock window.notificationManager
    global.window.notificationManager = {
      show: vi.fn(),
    };

    adminPageLoader = new AdminPageLoader();
  });

  afterEach(() => {
    document
      .querySelectorAll(
        "#adminNavContainer, #adminTabsContainer, #edit-form-container, #management-list-container, .admin-badge",
      )
      .forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      expect(adminPageLoader.formContainerId).toBe("edit-form-container");
      expect(adminPageLoader.listContainerId).toBe("management-list-container");
      expect(adminPageLoader.adminNav).toBeDefined();
      expect(adminPageLoader.adminTabs).toBeNull();
      expect(adminPageLoader.festivalManager).toBeNull();
      expect(adminPageLoader.bandManager).toBeNull();
    });

    it("should create AdminNav instance", () => {
      expect(adminPageLoader.adminNav).toBeInstanceOf(AdminNav);
    });
  });

  describe("getTargetPage", () => {
    it("should return festivals for /admin", () => {
      expect(adminPageLoader.getTargetPage("/admin")).toBe("festivals");
    });

    it("should return festivals for /admin/", () => {
      expect(adminPageLoader.getTargetPage("/admin/")).toBe("festivals");
    });

    it("should return bands for /admin/bands", () => {
      expect(adminPageLoader.getTargetPage("/admin/bands")).toBe("bands");
    });

    it("should return undefined for unknown paths", () => {
      expect(adminPageLoader.getTargetPage("/admin/unknown")).toBeUndefined();
    });
  });

  describe("clearTabs", () => {
    it("should clear tabs container", () => {
      const tabsContainer = document.getElementById("adminTabsContainer");
      tabsContainer.innerHTML = "<div>Existing content</div>";

      adminPageLoader.clearTabs();

      expect(tabsContainer.innerHTML).toBe("");
    });

    it("should reset adminTabs to null", () => {
      adminPageLoader.adminTabs = { some: "object" };

      adminPageLoader.clearTabs();

      expect(adminPageLoader.adminTabs).toBeNull();
    });

    it("should handle missing tabs container", () => {
      document.getElementById("adminTabsContainer").remove();

      expect(() => adminPageLoader.clearTabs()).not.toThrow();
    });
  });

  describe("handleTabChange", () => {
    beforeEach(() => {
      adminPageLoader.bandManager = {
        setActiveTab: vi.fn(),
      };
    });

    it("should save tab to localStorage", () => {
      const setItemSpy = vi.spyOn(localStorage, "setItem");
      adminPageLoader.handleTabChange("reviewed");

      expect(setItemSpy).toHaveBeenCalledWith("adminActiveTab", "reviewed");
      setItemSpy.mockRestore();
    });

    it("should update band manager when present", () => {
      adminPageLoader.handleTabChange("reviewed");

      expect(adminPageLoader.bandManager.setActiveTab).toHaveBeenCalledWith("reviewed");
    });

    it("should handle missing band manager", () => {
      adminPageLoader.bandManager = null;

      expect(() => adminPageLoader.handleTabChange("reviewed")).not.toThrow();
    });
  });

  describe("getActiveTab", () => {
    it("should return saved tab from localStorage", () => {
      const getItemSpy = vi.spyOn(localStorage, "getItem").mockReturnValueOnce("reviewed");

      const result = adminPageLoader.getActiveTab();

      expect(result).toBe("reviewed");
      expect(getItemSpy).toHaveBeenCalledWith("adminActiveTab");
      getItemSpy.mockRestore();
    });
  });

  describe("updatePageTitle", () => {
    it("should update document title", () => {
      adminPageLoader.updatePageTitle("Test Management");

      expect(document.title).toBe("Admin - Test Management | Metal Festivals 2026");
    });
  });

  describe("updateAdminBadge", () => {
    it("should update badge text", () => {
      const badge = document.querySelector(".admin-badge");

      adminPageLoader.updateAdminBadge("Custom Badge Text");

      expect(badge.textContent).toBe("Custom Badge Text");
    });

    it("should handle missing badge element", () => {
      document.querySelector(".admin-badge").remove();

      expect(() => adminPageLoader.updateAdminBadge("Test")).not.toThrow();
    });
  });

  describe("loadPage", () => {
    beforeEach(() => {
      adminPageLoader.loadFestivalsPage = vi.fn();
      adminPageLoader.loadBandsPage = vi.fn();
    });

    it("should load festivals page", async () => {
      await adminPageLoader.loadPage("festivals");

      expect(adminPageLoader.loadFestivalsPage).toHaveBeenCalled();
      expect(adminPageLoader.loadBandsPage).not.toHaveBeenCalled();
    });

    it("should load bands page", async () => {
      await adminPageLoader.loadPage("bands");

      expect(adminPageLoader.loadBandsPage).toHaveBeenCalled();
      expect(adminPageLoader.loadFestivalsPage).not.toHaveBeenCalled();
    });

    it("should do nothing for unknown page", async () => {
      await adminPageLoader.loadPage("unknown");

      expect(adminPageLoader.loadFestivalsPage).not.toHaveBeenCalled();
      expect(adminPageLoader.loadBandsPage).not.toHaveBeenCalled();
    });
  });

  describe("handleRouteChange", () => {
    beforeEach(() => {
      adminPageLoader.loadPage = vi.fn();
    });

    it("should load target page based on path", () => {
      adminPageLoader.handleRouteChange("/admin/bands", false);

      expect(adminPageLoader.loadPage).toHaveBeenCalledWith("bands");
    });

    it("should handle initial route", () => {
      adminPageLoader.handleRouteChange("/admin", true);

      expect(adminPageLoader.loadPage).toHaveBeenCalledWith("festivals");
    });
  });
});
