import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// AdminBandManager is loaded globally via vitest.setup.js

describe("AdminBandManager", () => {
  let bandManager;
  let mockBands;
  let listContainer;
  let formContainer;

  beforeEach(() => {
    // Create containers
    listContainer = document.createElement("div");
    listContainer.id = "test-list-container";
    document.body.appendChild(listContainer);

    formContainer = document.createElement("div");
    formContainer.id = "test-form-container";
    document.body.appendChild(formContainer);

    // Mock bands data
    mockBands = [
      {
        key: "metallica",
        name: "Metallica",
        country: "USA",
        genres: ["Thrash Metal", "Heavy Metal"],
        reviewed: true,
      },
      {
        key: "iron-maiden",
        name: "Iron Maiden",
        country: "UK",
        genres: ["Heavy Metal"],
        reviewed: false,
      },
      {
        key: "slayer",
        name: "Slayer",
        country: "USA",
        genres: ["Thrash Metal"],
        reviewed: false,
      },
    ];

    // Mock fetch
    global.fetch = vi.fn();

    // Mock window.notificationManager
    global.window.notificationManager = {
      show: vi.fn(),
    };

    // Mock localStorage
    vi.spyOn(Storage.prototype, "getItem");
    vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(Storage.prototype, "removeItem");

    bandManager = new AdminBandManager("test-list-container", "test-form-container");
  });

  afterEach(() => {
    document.body.removeChild(listContainer);
    document.body.removeChild(formContainer);
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with empty arrays and default values", () => {
      expect(bandManager.bands).toEqual([]);
      expect(bandManager.filteredBands).toEqual([]);
      expect(bandManager.selectedIndex).toBe(-1);
      expect(bandManager.sortOrder).toBe("asc");
      expect(bandManager.currentTab).toBe("review");
      expect(bandManager.listContainerId).toBe("test-list-container");
      expect(bandManager.formContainerId).toBe("test-form-container");
    });
  });

  describe("loadBands", () => {
    it("should load bands from API", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bands: mockBands }),
      });

      await bandManager.loadBands();

      expect(bandManager.bands).toEqual(mockBands);
    });

    it("should filter by default tab (review)", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bands: mockBands }),
      });

      await bandManager.loadBands();

      expect(bandManager.filteredBands.length).toBe(2);
      expect(bandManager.filteredBands.every((b) => !b.reviewed)).toBe(true);
    });

    it("should sort bands alphabetically", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bands: mockBands }),
      });

      await bandManager.loadBands();

      expect(bandManager.filteredBands[0].name).toBe("Iron Maiden");
      expect(bandManager.filteredBands[1].name).toBe("Slayer");
    });

    it("should handle fetch errors gracefully", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await bandManager.loadBands();

      expect(consoleSpy).toHaveBeenCalledWith("Error loading bands:", expect.any(Error));
      expect(window.notificationManager.show).toHaveBeenCalledWith("Error loading bands", "error");
      consoleSpy.mockRestore();
    });

    it("should handle missing bands in response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await bandManager.loadBands();

      expect(bandManager.bands).toEqual([]);
    });
  });

  describe("setActiveTab", () => {
    beforeEach(() => {
      bandManager.bands = mockBands;
      bandManager.adminList = {
        setItems: vi.fn(),
        updateTitle: vi.fn(),
        render: vi.fn(),
        selectItem: vi.fn(),
      };
      bandManager.editForm = {
        loadBand: vi.fn(),
      };
    });

    it("should filter to review tab", () => {
      bandManager.setActiveTab("review");

      expect(bandManager.currentTab).toBe("review");
      expect(bandManager.filteredBands.length).toBe(2);
      expect(bandManager.filteredBands.every((b) => !b.reviewed)).toBe(true);
    });

    it("should filter to reviewed tab", () => {
      bandManager.setActiveTab("reviewed");

      expect(bandManager.currentTab).toBe("reviewed");
      expect(bandManager.filteredBands.length).toBe(1);
      expect(bandManager.filteredBands[0].reviewed).toBe(true);
    });

    it("should update list after tab change", () => {
      bandManager.setActiveTab("reviewed");

      expect(bandManager.adminList.setItems).toHaveBeenCalled();
      expect(bandManager.adminList.render).toHaveBeenCalled();
    });
  });

  describe("getBandsToReview", () => {
    it("should return only non-reviewed bands", () => {
      bandManager.bands = mockBands;

      const result = bandManager.getBandsToReview();

      expect(result.length).toBe(2);
      expect(result.every((b) => !b.reviewed)).toBe(true);
    });

    it("should return empty array when all reviewed", () => {
      bandManager.bands = [{ ...mockBands[0], reviewed: true }];

      const result = bandManager.getBandsToReview();

      expect(result).toEqual([]);
    });
  });

  describe("getBandsReviewed", () => {
    it("should return only reviewed bands", () => {
      bandManager.bands = mockBands;

      const result = bandManager.getBandsReviewed();

      expect(result.length).toBe(1);
      expect(result[0].reviewed).toBe(true);
    });

    it("should return empty array when none reviewed", () => {
      bandManager.bands = mockBands.map((b) => ({ ...b, reviewed: false }));

      const result = bandManager.getBandsReviewed();

      expect(result).toEqual([]);
    });
  });

  describe("getStorageKey", () => {
    it("should return tab-specific key for review", () => {
      bandManager.currentTab = "review";

      expect(bandManager.getStorageKey()).toBe("selectedBandName_review");
    });

    it("should return tab-specific key for reviewed", () => {
      bandManager.currentTab = "reviewed";

      expect(bandManager.getStorageKey()).toBe("selectedBandName_reviewed");
    });
  });

  describe("sortBands", () => {
    beforeEach(() => {
      bandManager.bands = mockBands;
      bandManager.filteredBands = [...mockBands];
      bandManager.adminList = {
        setItems: vi.fn(),
        updateTitle: vi.fn(),
        render: vi.fn(),
      };
    });

    it("should sort bands ascending", () => {
      bandManager.sortBands("asc");

      expect(bandManager.filteredBands[0].name).toBe("Iron Maiden");
      expect(bandManager.filteredBands[2].name).toBe("Slayer");
    });

    it("should sort bands descending", () => {
      bandManager.sortBands("desc");

      expect(bandManager.filteredBands[0].name).toBe("Slayer");
      expect(bandManager.filteredBands[2].name).toBe("Iron Maiden");
    });

    it("should update list after sorting", () => {
      bandManager.sortBands("asc");

      expect(bandManager.adminList.setItems).toHaveBeenCalled();
      expect(bandManager.adminList.render).toHaveBeenCalled();
    });
  });

  describe("filterBands", () => {
    beforeEach(() => {
      bandManager.bands = mockBands;
      bandManager.currentTab = "review";
      bandManager.adminList = {
        setItems: vi.fn(),
        updateTitle: vi.fn(),
        render: vi.fn(),
      };
    });

    it("should filter by band name", () => {
      bandManager.filterBands("iron");

      expect(bandManager.filteredBands.length).toBe(1);
      expect(bandManager.filteredBands[0].name).toBe("Iron Maiden");
    });

    it("should filter by country", () => {
      bandManager.filterBands("usa");

      expect(bandManager.filteredBands.length).toBe(1);
      expect(bandManager.filteredBands[0].name).toBe("Slayer");
    });

    it("should filter by genre", () => {
      bandManager.filterBands("thrash");

      expect(bandManager.filteredBands.length).toBe(1);
      expect(bandManager.filteredBands[0].name).toBe("Slayer");
    });

    it("should respect tab filter", () => {
      bandManager.currentTab = "reviewed";
      bandManager.filterBands("");

      expect(bandManager.filteredBands.length).toBe(1);
      expect(bandManager.filteredBands[0].reviewed).toBe(true);
    });

    it("should be case insensitive", () => {
      bandManager.filterBands("SLAYER");

      expect(bandManager.filteredBands.length).toBe(1);
    });
  });

  describe("onBandSelect", () => {
    beforeEach(() => {
      bandManager.filteredBands = mockBands;
      bandManager.editForm = {
        loadBand: vi.fn(),
        render: vi.fn(),
      };
    });

    it("should select band and load in edit form", () => {
      bandManager.onBandSelect({}, 0);

      expect(bandManager.selectedIndex).toBe(0);
      expect(bandManager.currentBand).toBe(mockBands[0]);
      expect(bandManager.editForm.loadBand).toHaveBeenCalledWith(mockBands[0]);
      expect(bandManager.editForm.render).toHaveBeenCalled();
    });

    it("should handle missing edit form", () => {
      bandManager.editForm = null;

      expect(() => bandManager.onBandSelect({}, 0)).not.toThrow();
    });
  });

  describe("saveBand", () => {
    beforeEach(() => {
      bandManager.bands = [...mockBands];
      bandManager.filteredBands = [...mockBands];
      bandManager.currentTab = "review";
      bandManager.adminList = {
        setItems: vi.fn(),
        updateTitle: vi.fn(),
        render: vi.fn(),
      };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
    });

    it("should update existing band", async () => {
      const updatedBand = { ...mockBands[0], country: "Canada" };

      await bandManager.saveBand(updatedBand);

      expect(bandManager.bands[0].country).toBe("Canada");
      expect(window.notificationManager.show).toHaveBeenCalledWith("Band updated successfully", "success");
    });

    it("should add new band", async () => {
      const newBand = {
        key: "new-band",
        name: "New Band",
        country: "Germany",
        genres: ["Metal"],
        reviewed: false,
      };

      await bandManager.saveBand(newBand);

      expect(bandManager.bands.length).toBe(4);
      expect(window.notificationManager.show).toHaveBeenCalledWith("Band created successfully", "success");
    });

    it("should not show notification for auto-save", async () => {
      const updatedBand = { ...mockBands[0], country: "Canada" };

      await bandManager.saveBand(updatedBand, true);

      expect(window.notificationManager.show).not.toHaveBeenCalled();
    });

    it("should handle save errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Save failed"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(bandManager.saveBand(mockBands[0])).rejects.toThrow();

      expect(window.notificationManager.show).toHaveBeenCalledWith("Error saving band", "error");
      consoleSpy.mockRestore();
    });

    it("should refilter by current tab after save", async () => {
      const updatedBand = { ...mockBands[1], reviewed: true };

      await bandManager.saveBand(updatedBand);

      // Should filter out the band from review tab since it's now reviewed
      expect(bandManager.filteredBands.length).toBe(1);
    });
  });

  describe("getSelectedBand", () => {
    it("should return selected band", () => {
      bandManager.filteredBands = mockBands;
      bandManager.selectedIndex = 1;

      const result = bandManager.getSelectedBand();

      expect(result).toBe(mockBands[1]);
    });

    it("should return null when no selection", () => {
      const result = bandManager.getSelectedBand();

      expect(result).toBeNull();
    });
  });

  describe("navigateList", () => {
    beforeEach(() => {
      bandManager.filteredBands = mockBands;
      bandManager.selectedIndex = 0;
      bandManager.adminList = {
        selectItem: vi.fn(),
      };
    });

    it("should navigate to next band", () => {
      bandManager.navigateList(1);

      expect(bandManager.adminList.selectItem).toHaveBeenCalledWith(1);
    });

    it("should navigate to previous band", () => {
      bandManager.selectedIndex = 1;
      bandManager.navigateList(-1);

      expect(bandManager.adminList.selectItem).toHaveBeenCalledWith(0);
    });

    it("should wrap to last band when going before first", () => {
      bandManager.navigateList(-1);

      expect(bandManager.adminList.selectItem).toHaveBeenCalledWith(2);
    });

    it("should wrap to first band when going after last", () => {
      bandManager.selectedIndex = 2;
      bandManager.navigateList(1);

      expect(bandManager.adminList.selectItem).toHaveBeenCalledWith(0);
    });

    it("should do nothing with empty list", () => {
      bandManager.filteredBands = [];

      bandManager.navigateList(1);

      expect(bandManager.adminList.selectItem).not.toHaveBeenCalled();
    });
  });
});
