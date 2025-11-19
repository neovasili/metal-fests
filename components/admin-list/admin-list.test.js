import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// AdminList is loaded globally via vitest.setup.js

describe("AdminList", () => {
  let container;
  let mockOnItemSelect;
  let mockOnSort;

  beforeEach(() => {
    // Create container
    container = document.createElement("div");
    container.id = "admin-list-container";
    document.body.appendChild(container);

    // Mock callbacks
    mockOnItemSelect = vi.fn();
    mockOnSort = vi.fn();

    // Mock fetch for template
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <div class="admin-list-section">
          <div class="list-header">
            <h2 class="list-title"></h2>
            <button class="sort-toggle">
              <span class="sort-label">A-Z</span>
            </button>
          </div>
          <div class="list-content"></div>
        </div>
      `,
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default options", async () => {
      const adminList = new AdminList("admin-list-container");

      expect(adminList.container).toBe(container);
      expect(adminList.title).toBe("Items");
      expect(adminList.placeholderText).toBe("No items found");
      expect(adminList.items).toEqual([]);
      expect(adminList.selectedIndex).toBe(-1);
      expect(adminList.sortOrder).toBe("asc");
    });

    it("should initialize with custom options", () => {
      const adminList = new AdminList("admin-list-container", {
        title: "Custom Title",
        placeholderText: "Custom placeholder",
        onItemSelect: mockOnItemSelect,
        onSort: mockOnSort,
      });

      expect(adminList.title).toBe("Custom Title");
      expect(adminList.placeholderText).toBe("Custom placeholder");
      expect(adminList.onItemSelect).toBe(mockOnItemSelect);
      expect(adminList.onSort).toBe(mockOnSort);
    });

    it("should handle missing container gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const adminList = new AdminList("non-existent-container");

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("AdminList container not found"));
      expect(adminList.container).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("loadComponent", () => {
    it("should fetch and load template HTML", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.loadComponent();

      expect(global.fetch).toHaveBeenCalledWith("/components/admin-list/admin-list.html");
      expect(container.innerHTML).toContain("admin-list-section");
    });

    it("should handle fetch errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const adminList = new AdminList("admin-list-container");
      await adminList.loadComponent();

      expect(consoleSpy).toHaveBeenCalledWith("Error loading admin list:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("should handle non-ok response", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      const adminList = new AdminList("admin-list-container");
      await adminList.loadComponent();

      expect(consoleSpy).toHaveBeenCalledWith("Error loading admin list:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("setupElements", () => {
    it("should find and store element references", async () => {
      const adminList = new AdminList("admin-list-container", { title: "My List" });
      await adminList.init();

      expect(adminList.listSection).not.toBeNull();
      expect(adminList.listTitle).not.toBeNull();
      expect(adminList.listContent).not.toBeNull();
      expect(adminList.sortToggle).not.toBeNull();
      expect(adminList.sortLabel).not.toBeNull();
    });

    it("should set title text", async () => {
      const adminList = new AdminList("admin-list-container", { title: "Custom Title" });
      await adminList.init();

      expect(adminList.listTitle.textContent).toBe("Custom Title");
    });
  });

  describe("setItems", () => {
    it("should set items array", async () => {
      const adminList = new AdminList("admin-list-container");
      const items = [{ name: "Item 1" }, { name: "Item 2" }];

      adminList.setItems(items);

      expect(adminList.items).toBe(items);
    });
  });

  describe("render", () => {
    it("should show placeholder when no items", async () => {
      const adminList = new AdminList("admin-list-container", {
        placeholderText: "No data available",
      });
      await adminList.init();

      adminList.render();

      expect(container.innerHTML).toContain("No data available");
    });

    it("should render list items", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      adminList.setItems([
        { name: "Item 1", meta: "Meta 1" },
        { name: "Item 2", meta: "Meta 2" },
      ]);
      adminList.render();

      const items = container.querySelectorAll(".list-item");
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain("Item 1");
      expect(items[0].textContent).toContain("Meta 1");
    });

    it("should render item with genres", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      adminList.setItems([{ name: "Band", genres: "Metal, Rock" }]);
      adminList.render();

      expect(container.innerHTML).toContain("Metal, Rock");
      expect(container.querySelector(".list-item-genres")).not.toBeNull();
    });

    it("should render item with badge", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      adminList.setItems([
        {
          name: "Item",
          badge: { text: "New", type: "success" },
        },
      ]);
      adminList.render();

      const badge = container.querySelector(".list-item-badge");
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe("New");
      expect(badge.classList.contains("success")).toBe(true);
    });

    it("should mark selected item as active", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      adminList.setItems([{ name: "Item 1" }, { name: "Item 2" }]);
      adminList.selectedIndex = 1;
      adminList.render();

      const items = container.querySelectorAll(".list-item");
      expect(items[0].classList.contains("active")).toBe(false);
      expect(items[1].classList.contains("active")).toBe(true);
    });

    it("should escape HTML in item name", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      adminList.setItems([{ name: "<script>alert('xss')</script>" }]);
      adminList.render();

      expect(container.innerHTML).not.toContain("<script>");
      expect(container.innerHTML).toContain("&lt;script&gt;");
    });

    it("should escape HTML in meta and genres", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      adminList.setItems([
        {
          name: "Item",
          meta: "<b>Bold</b>",
          genres: "<i>Italic</i>",
        },
      ]);
      adminList.render();

      expect(container.innerHTML).toContain("&lt;b&gt;");
      expect(container.innerHTML).toContain("&lt;i&gt;");
    });
  });

  describe("selectItem", () => {
    it("should select item and call callback", async () => {
      const adminList = new AdminList("admin-list-container", {
        onItemSelect: mockOnItemSelect,
      });
      await adminList.init();

      const items = [{ name: "Item 1" }, { name: "Item 2" }];
      adminList.setItems(items);
      adminList.render();

      adminList.selectItem(1);

      expect(adminList.selectedIndex).toBe(1);
      expect(mockOnItemSelect).toHaveBeenCalledWith(items[1], 1);
    });

    it("should update UI when item is selected", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      adminList.setItems([{ name: "Item 1" }, { name: "Item 2" }]);
      adminList.render();

      adminList.selectItem(0);

      const items = container.querySelectorAll(".list-item");
      expect(items[0].classList.contains("active")).toBe(true);
    });

    it("should ignore invalid index", async () => {
      const adminList = new AdminList("admin-list-container", {
        onItemSelect: mockOnItemSelect,
      });
      await adminList.init();

      adminList.setItems([{ name: "Item 1" }]);
      adminList.selectItem(-1);
      adminList.selectItem(10);

      expect(mockOnItemSelect).not.toHaveBeenCalled();
    });
  });

  describe("getSelectedItem", () => {
    it("should return selected item", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      const items = [{ name: "Item 1" }, { name: "Item 2" }];
      adminList.setItems(items);
      adminList.selectedIndex = 1;

      expect(adminList.getSelectedItem()).toBe(items[1]);
    });

    it("should return null when no selection", () => {
      const adminList = new AdminList("admin-list-container");

      expect(adminList.getSelectedItem()).toBeNull();
    });
  });

  describe("toggleSort", () => {
    it("should toggle sort order", async () => {
      const adminList = new AdminList("admin-list-container", {
        onSort: mockOnSort,
      });
      await adminList.init();

      expect(adminList.sortOrder).toBe("asc");

      adminList.toggleSort();
      expect(adminList.sortOrder).toBe("desc");
      expect(mockOnSort).toHaveBeenCalledWith("desc");

      adminList.toggleSort();
      expect(adminList.sortOrder).toBe("asc");
      expect(mockOnSort).toHaveBeenCalledWith("asc");
    });

    it("should update sort label", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      expect(adminList.sortLabel.textContent).toBe("A-Z");

      adminList.toggleSort();
      expect(adminList.sortLabel.textContent).toBe("Z-A");

      adminList.toggleSort();
      expect(adminList.sortLabel.textContent).toBe("A-Z");
    });

    it("should trigger via button click", async () => {
      const adminList = new AdminList("admin-list-container", {
        onSort: mockOnSort,
      });
      await adminList.init();

      adminList.sortToggle.click();

      expect(mockOnSort).toHaveBeenCalledWith("desc");
    });
  });

  describe("updateTitle", () => {
    it("should update title text", async () => {
      const adminList = new AdminList("admin-list-container");
      await adminList.init();

      adminList.updateTitle("New Title");

      expect(adminList.title).toBe("New Title");
      expect(adminList.listTitle.textContent).toBe("New Title");
    });

    it("should handle missing listTitle element", () => {
      const adminList = new AdminList("admin-list-container");
      adminList.listTitle = null;

      expect(() => adminList.updateTitle("Test")).not.toThrow();
    });
  });

  describe("escapeHtml", () => {
    it("should escape HTML special characters", () => {
      const adminList = new AdminList("admin-list-container");

      expect(adminList.escapeHtml("<div>")).toBe("&lt;div&gt;");
      expect(adminList.escapeHtml("&")).toBe("&amp;");
    });

    it("should handle plain text", () => {
      const adminList = new AdminList("admin-list-container");

      expect(adminList.escapeHtml("Normal text")).toBe("Normal text");
    });
  });

  describe("attachItemListeners", () => {
    it("should add click listeners to items", async () => {
      const adminList = new AdminList("admin-list-container", {
        onItemSelect: mockOnItemSelect,
      });
      await adminList.init();

      const items = [{ name: "Item 1" }, { name: "Item 2" }];
      adminList.setItems(items);
      adminList.render();

      const itemElements = container.querySelectorAll(".list-item");
      itemElements[1].click();

      expect(mockOnItemSelect).toHaveBeenCalledWith(items[1], 1);
    });
  });
});
