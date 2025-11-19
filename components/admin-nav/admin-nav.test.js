import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// AdminNav is loaded globally via vitest.setup.js

describe("AdminNav", () => {
  let container;

  beforeEach(() => {
    // Create container
    container = document.createElement("div");
    container.id = "admin-nav-container";
    document.body.appendChild(container);

    // Mock fetch for template
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<nav class="admin-nav"><h1>Admin Panel</h1></nav>',
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with container", async () => {
      const adminNav = new AdminNav("admin-nav-container");
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(adminNav.container).toBe(container);
    });

    it("should handle missing container gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const adminNav = new AdminNav("non-existent-container");

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("AdminNav container not found"));
      expect(adminNav.container).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should call init during construction", async () => {
      const adminNav = new AdminNav("admin-nav-container");
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("loadComponent", () => {
    it("should fetch and load template HTML", async () => {
      const adminNav = new AdminNav("admin-nav-container");
      await adminNav.loadComponent();

      expect(global.fetch).toHaveBeenCalledWith("/components/admin-nav/admin-nav.html");
      expect(container.innerHTML).toContain("admin-nav");
    });

    it("should handle fetch errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const adminNav = new AdminNav("admin-nav-container");
      await adminNav.loadComponent();

      expect(consoleSpy).toHaveBeenCalledWith("Error loading admin nav:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("should handle non-ok response", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      const adminNav = new AdminNav("admin-nav-container");
      await adminNav.loadComponent();

      expect(consoleSpy).toHaveBeenCalledWith("Error loading admin nav:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("should set container innerHTML with fetched HTML", async () => {
      const customHTML = '<nav class="custom-nav"><p>Custom Nav Content</p></nav>';
      const adminNav = new AdminNav("admin-nav-container");

      // Need to reset fetch mock after constructor call
      global.fetch.mockClear();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => customHTML,
      });

      await adminNav.loadComponent();

      expect(container.innerHTML).toBe(customHTML);
    });
  });
});
