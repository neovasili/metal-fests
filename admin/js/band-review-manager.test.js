import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// BandReviewManager is loaded globally via vitest.setup.js

describe("BandReviewManager", () => {
  let manager;
  let mockBands;

  beforeEach(() => {
    manager = new BandReviewManager();

    // Mock bands data
    mockBands = [
      {
        key: "band1",
        name: "Metallica",
        country: "USA",
        genres: ["Thrash Metal", "Heavy Metal"],
        reviewed: false,
      },
      {
        key: "band2",
        name: "Iron Maiden",
        country: "UK",
        genres: ["Heavy Metal"],
        reviewed: true,
      },
      {
        key: "band3",
        name: "Slayer",
        country: "USA",
        genres: ["Thrash Metal"],
        reviewed: false,
      },
      {
        key: "band4",
        name: "Megadeth",
        country: "USA",
        genres: ["Thrash Metal"],
        // reviewed is undefined
      },
    ];

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="sortToggle"></div>
      <div id="sortLabel"></div>
      <div id="band-count"></div>
      <div id="review-count"></div>
      <div id="bandsList"></div>
    `;

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      expect(manager.bands).toEqual([]);
      expect(manager.filteredBands).toEqual([]);
      expect(manager.sortOrder).toBe("asc");
      expect(manager.currentBandIndex).toBe(-1);
      expect(manager.onBandSelect).toBeNull();
      expect(manager.onBandRemoved).toBeNull();
    });
  });

  describe("loadBands", () => {
    it("should load only non-reviewed bands", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bands: mockBands }),
      });

      const result = await manager.loadBands();

      expect(result.length).toBe(3); // Metallica, Slayer, Megadeth
      expect(result[0].key).toBe("band1");
      expect(result[1].key).toBe("band3");
      expect(result[2].key).toBe("band4");
    });

    it("should filter out reviewed bands", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bands: mockBands }),
      });

      await manager.loadBands();

      const hasReviewedBand = manager.bands.some((band) => band.reviewed === true);
      expect(hasReviewedBand).toBe(false);
    });

    it("should handle fetch errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await manager.loadBands();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading bands:", expect.any(Error));
    });

    it("should sort bands after loading", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bands: mockBands }),
      });

      await manager.loadBands();

      expect(manager.filteredBands[0].name).toBe("Megadeth");
      expect(manager.filteredBands[1].name).toBe("Metallica");
      expect(manager.filteredBands[2].name).toBe("Slayer");
    });

    it("should update count after loading", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bands: mockBands }),
      });

      await manager.loadBands();

      const countElement = document.getElementById("band-count");
      const tabCountElement = document.getElementById("review-count");
      expect(countElement.textContent).toBe("3");
      expect(tabCountElement.textContent).toBe("3");
    });
  });

  describe("sortBands", () => {
    beforeEach(() => {
      manager.bands = [mockBands[0], mockBands[2], mockBands[3]]; // Non-reviewed bands
    });

    it("should sort bands ascending by default", () => {
      manager.sortOrder = "asc";
      manager.sortBands();

      expect(manager.filteredBands[0].name).toBe("Megadeth");
      expect(manager.filteredBands[1].name).toBe("Metallica");
      expect(manager.filteredBands[2].name).toBe("Slayer");
    });

    it("should sort bands descending", () => {
      manager.sortOrder = "desc";
      manager.sortBands();

      expect(manager.filteredBands[0].name).toBe("Slayer");
      expect(manager.filteredBands[1].name).toBe("Metallica");
      expect(manager.filteredBands[2].name).toBe("Megadeth");
    });

    it("should sort case-insensitively", () => {
      manager.bands = [
        { key: "b1", name: "ZEPPELIN", reviewed: false },
        { key: "b2", name: "acdc", reviewed: false },
        { key: "b3", name: "Beatles", reviewed: false },
      ];
      manager.sortOrder = "asc";
      manager.sortBands();

      expect(manager.filteredBands[0].name).toBe("acdc");
      expect(manager.filteredBands[1].name).toBe("Beatles");
      expect(manager.filteredBands[2].name).toBe("ZEPPELIN");
    });
  });

  describe("toggleSortOrder", () => {
    beforeEach(() => {
      manager.bands = [mockBands[0], mockBands[2]];
      manager.sortBands();
    });

    it("should toggle from asc to desc", () => {
      expect(manager.sortOrder).toBe("asc");
      manager.toggleSortOrder();
      expect(manager.sortOrder).toBe("desc");
    });

    it("should toggle from desc to asc", () => {
      manager.sortOrder = "desc";
      manager.toggleSortOrder();
      expect(manager.sortOrder).toBe("asc");
    });

    it("should update sort label", () => {
      manager.toggleSortOrder();
      const sortLabel = document.getElementById("sortLabel");
      expect(sortLabel.textContent).toBe("Z-A");

      manager.toggleSortOrder();
      expect(sortLabel.textContent).toBe("A-Z");
    });

    it("should re-render list after toggle", () => {
      const renderSpy = vi.spyOn(manager, "renderList");
      manager.toggleSortOrder();
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe("renderList", () => {
    it("should show placeholder when no bands", () => {
      manager.filteredBands = [];
      manager.renderList();

      const listContent = document.getElementById("bandsList");
      expect(listContent.innerHTML).toContain("No bands to review!");
      expect(listContent.innerHTML).toContain("🎉");
    });

    it("should render band items", () => {
      manager.filteredBands = [mockBands[0]];
      manager.renderList();

      const listContent = document.getElementById("bandsList");
      expect(listContent.innerHTML).toContain("Metallica");
      expect(listContent.innerHTML).toContain("USA");
      expect(listContent.innerHTML).toContain("Thrash Metal");
    });

    it("should attach event listeners to band items", () => {
      manager.filteredBands = [mockBands[0], mockBands[2]];
      manager.renderList();

      const bandItems = document.querySelectorAll(".band-item");
      expect(bandItems.length).toBe(2);

      const firstItem = bandItems[0];
      expect(firstItem.getAttribute("data-index")).toBe("0");
    });
  });

  describe("selectBand", () => {
    beforeEach(() => {
      manager.filteredBands = [mockBands[0], mockBands[2]];
      manager.renderList();
    });

    it("should select band by index", () => {
      manager.selectBand(0);
      expect(manager.currentBandIndex).toBe(0);
    });

    it("should call onBandSelect callback", () => {
      const callback = vi.fn();
      manager.onBandSelect = callback;
      manager.selectBand(0);

      expect(callback).toHaveBeenCalledWith(mockBands[0], 0);
    });

    it("should update active item in UI", () => {
      manager.selectBand(0);

      const bandItems = document.querySelectorAll(".band-item");
      expect(bandItems[0].classList.contains("active")).toBe(true);
      expect(bandItems[1].classList.contains("active")).toBe(false);
    });

    it("should not select invalid index", () => {
      manager.selectBand(-1);
      expect(manager.currentBandIndex).toBe(-1);

      manager.selectBand(10);
      expect(manager.currentBandIndex).toBe(-1);
    });
  });

  describe("getCurrentBand", () => {
    beforeEach(() => {
      manager.filteredBands = [mockBands[0], mockBands[2]];
    });

    it("should return current selected band", () => {
      manager.currentBandIndex = 0;
      const band = manager.getCurrentBand();
      expect(band.key).toBe("band1");
    });

    it("should return null when no band selected", () => {
      manager.currentBandIndex = -1;
      const band = manager.getCurrentBand();
      expect(band).toBeNull();
    });

    it("should return null for invalid index", () => {
      manager.currentBandIndex = 10;
      const band = manager.getCurrentBand();
      expect(band).toBeNull();
    });
  });

  describe("navigation", () => {
    beforeEach(() => {
      manager.filteredBands = [mockBands[0], mockBands[2], mockBands[3]];
      manager.renderList();
      manager.selectBand(1);
    });

    it("should navigate to previous band", () => {
      const result = manager.navigatePrevious();
      expect(result).toBe(true);
      expect(manager.currentBandIndex).toBe(0);
    });

    it("should navigate to next band", () => {
      const result = manager.navigateNext();
      expect(result).toBe(true);
      expect(manager.currentBandIndex).toBe(2);
    });

    it("should not navigate previous from first band", () => {
      manager.currentBandIndex = 0;
      const result = manager.navigatePrevious();
      expect(result).toBe(false);
      expect(manager.currentBandIndex).toBe(0);
    });

    it("should not navigate next from last band", () => {
      manager.currentBandIndex = 2;
      const result = manager.navigateNext();
      expect(result).toBe(false);
      expect(manager.currentBandIndex).toBe(2);
    });

    it("should check if can navigate previous", () => {
      expect(manager.canNavigatePrevious()).toBe(true);
      manager.currentBandIndex = 0;
      expect(manager.canNavigatePrevious()).toBe(false);
    });

    it("should check if can navigate next", () => {
      expect(manager.canNavigateNext()).toBe(true);
      manager.currentBandIndex = 2;
      expect(manager.canNavigateNext()).toBe(false);
    });
  });

  describe("removeBand", () => {
    beforeEach(() => {
      manager.bands = [mockBands[0], mockBands[2], mockBands[3]];
      manager.filteredBands = [...manager.bands];
      manager.renderList();
      manager.selectBand(1);
    });

    it("should remove band from both arrays", () => {
      manager.removeBand("band3");

      expect(manager.filteredBands.length).toBe(2);
      expect(manager.bands.length).toBe(2);
      expect(manager.filteredBands.find((b) => b.key === "band3")).toBeUndefined();
    });

    it("should adjust current index when removing current band", () => {
      manager.currentBandIndex = 2; // Last band
      manager.removeBand("band4");
      expect(manager.currentBandIndex).toBe(1);
    });

    it("should call onBandRemoved callback", () => {
      const callback = vi.fn();
      manager.onBandRemoved = callback;
      manager.removeBand("band3");
      expect(callback).toHaveBeenCalled();
    });

    it("should re-render list after removal", () => {
      manager.removeBand("band3");
      const listContent = document.getElementById("bandsList");
      expect(listContent.innerHTML).not.toContain("Slayer");
    });

    it("should update count after removal", () => {
      manager.removeBand("band3");
      const countElement = document.getElementById("band-count");
      expect(countElement.textContent).toBe("2");
    });

    it("should select another band after removal if available", () => {
      const selectSpy = vi.spyOn(manager, "selectBand");
      manager.removeBand("band3");
      expect(selectSpy).toHaveBeenCalled();
    });

    it("should handle removing non-existent band", () => {
      const initialLength = manager.filteredBands.length;
      manager.removeBand("nonexistent");
      expect(manager.filteredBands.length).toBe(initialLength);
    });
  });

  describe("getBandByKey", () => {
    beforeEach(() => {
      manager.filteredBands = [mockBands[0], mockBands[2]];
    });

    it("should return band with matching key", () => {
      const band = manager.getBandByKey("band1");
      expect(band.name).toBe("Metallica");
    });

    it("should return undefined for non-existent key", () => {
      const band = manager.getBandByKey("nonexistent");
      expect(band).toBeUndefined();
    });
  });

  describe("setupEventListeners", () => {
    it("should attach event listener to sort toggle", () => {
      const sortToggle = document.getElementById("sortToggle");
      const toggleSpy = vi.spyOn(manager, "toggleSortOrder");

      manager.setupEventListeners();
      sortToggle.click();

      expect(toggleSpy).toHaveBeenCalled();
    });

    it("should handle missing sort toggle element", () => {
      document.body.innerHTML = "";
      expect(() => manager.setupEventListeners()).not.toThrow();
    });
  });

  describe("renderBandItem", () => {
    it("should render band with genres", () => {
      const html = manager.renderBandItem(mockBands[0], 0);

      expect(html).toContain("Metallica");
      expect(html).toContain("USA");
      expect(html).toContain("Thrash Metal");
      expect(html).toContain("Heavy Metal");
    });

    it("should show placeholder for empty genres", () => {
      const bandWithoutGenres = { ...mockBands[0], genres: [] };
      const html = manager.renderBandItem(bandWithoutGenres, 0);

      expect(html).toContain("No genres");
    });

    it("should mark active band", () => {
      manager.currentBandIndex = 1;
      const html = manager.renderBandItem(mockBands[0], 1);

      expect(html).toContain('class="band-item active"');
    });

    it("should not mark inactive bands", () => {
      manager.currentBandIndex = 0;
      const html = manager.renderBandItem(mockBands[0], 1);

      expect(html).toContain('class="band-item "');
    });
  });
});
