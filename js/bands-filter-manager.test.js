// Unit tests for BandsFilterManager
// BandsFilterManager is loaded globally via vitest.setup.js

describe("BandsFilterManager", () => {
  let bandsFilterManager;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key) => mockLocalStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
    };

    bandsFilterManager = new BandsFilterManager();
  });

  describe("constructor", () => {
    it("should initialize with empty selection when localStorage is empty", () => {
      expect(bandsFilterManager.getSelectedBandsCount()).toBe(0);
    });

    it("should load selected bands from localStorage", () => {
      mockLocalStorage["metalFestsBandsFilter"] = JSON.stringify(["Metallica", "Iron Maiden"]);
      const manager = new BandsFilterManager();
      expect(manager.getSelectedBandsCount()).toBe(2);
      expect(manager.isBandSelected("Metallica")).toBe(true);
    });

    it("should handle corrupted localStorage data gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockLocalStorage["metalFestsBandsFilter"] = "invalid json";
      const manager = new BandsFilterManager();
      expect(manager.getSelectedBandsCount()).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe("toggleBand", () => {
    it("should add a band to selection when not present", () => {
      const result = bandsFilterManager.toggleBand("Metallica");
      expect(result).toBe(true);
      expect(bandsFilterManager.isBandSelected("Metallica")).toBe(true);
    });

    it("should remove a band from selection when already present", () => {
      bandsFilterManager.toggleBand("Metallica");
      const result = bandsFilterManager.toggleBand("Metallica");
      expect(result).toBe(false);
      expect(bandsFilterManager.isBandSelected("Metallica")).toBe(false);
    });

    it("should save to localStorage after toggle", () => {
      bandsFilterManager.toggleBand("Iron Maiden");
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsBandsFilter", JSON.stringify(["Iron Maiden"]));
    });
  });

  describe("addBand", () => {
    it("should add a band to selection", () => {
      bandsFilterManager.addBand("Slayer");
      expect(bandsFilterManager.isBandSelected("Slayer")).toBe(true);
    });

    it("should not add duplicates", () => {
      bandsFilterManager.addBand("Slayer");
      bandsFilterManager.addBand("Slayer");
      expect(bandsFilterManager.getSelectedBandsCount()).toBe(1);
    });

    it("should save to localStorage", () => {
      bandsFilterManager.addBand("Megadeth");
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsBandsFilter", JSON.stringify(["Megadeth"]));
    });
  });

  describe("removeBand", () => {
    it("should remove a band from selection", () => {
      bandsFilterManager.addBand("Anthrax");
      bandsFilterManager.removeBand("Anthrax");
      expect(bandsFilterManager.isBandSelected("Anthrax")).toBe(false);
    });

    it("should handle removing non-existent band gracefully", () => {
      expect(() => bandsFilterManager.removeBand("Non-existent")).not.toThrow();
    });

    it("should save to localStorage", () => {
      bandsFilterManager.addBand("Testament");
      bandsFilterManager.removeBand("Testament");
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsBandsFilter", JSON.stringify([]));
    });
  });

  describe("isBandSelected", () => {
    it("should return true for selected bands", () => {
      bandsFilterManager.addBand("Judas Priest");
      expect(bandsFilterManager.isBandSelected("Judas Priest")).toBe(true);
    });

    it("should return false for non-selected bands", () => {
      expect(bandsFilterManager.isBandSelected("Random Band")).toBe(false);
    });
  });

  describe("getSelectedBands", () => {
    it("should return empty array when no bands selected", () => {
      expect(bandsFilterManager.getSelectedBands()).toEqual([]);
    });

    it("should return all selected bands", () => {
      bandsFilterManager.addBand("Band A");
      bandsFilterManager.addBand("Band B");
      const selected = bandsFilterManager.getSelectedBands();
      expect(selected).toHaveLength(2);
      expect(selected).toContain("Band A");
      expect(selected).toContain("Band B");
    });
  });

  describe("clearAllBands", () => {
    it("should remove all selected bands", () => {
      bandsFilterManager.addBand("Band 1");
      bandsFilterManager.addBand("Band 2");
      bandsFilterManager.clearAllBands();
      expect(bandsFilterManager.getSelectedBandsCount()).toBe(0);
    });

    it("should save empty state to localStorage", () => {
      bandsFilterManager.addBand("Band 1");
      bandsFilterManager.clearAllBands();
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsBandsFilter", JSON.stringify([]));
    });
  });

  describe("getSelectedBandsCount", () => {
    it("should return 0 when no bands selected", () => {
      expect(bandsFilterManager.getSelectedBandsCount()).toBe(0);
    });

    it("should return correct count of selected bands", () => {
      bandsFilterManager.addBand("Band 1");
      bandsFilterManager.addBand("Band 2");
      bandsFilterManager.addBand("Band 3");
      expect(bandsFilterManager.getSelectedBandsCount()).toBe(3);
    });
  });

  describe("hasSelectedBands", () => {
    it("should return false when no bands selected", () => {
      expect(bandsFilterManager.hasSelectedBands()).toBe(false);
    });

    it("should return true when bands are selected", () => {
      bandsFilterManager.addBand("Band 1");
      expect(bandsFilterManager.hasSelectedBands()).toBe(true);
    });
  });

  describe("setSelectedBands", () => {
    it("should replace selection with new bands", () => {
      bandsFilterManager.addBand("Old Band");
      bandsFilterManager.setSelectedBands(["New Band 1", "New Band 2"]);
      expect(bandsFilterManager.getSelectedBandsCount()).toBe(2);
      expect(bandsFilterManager.isBandSelected("Old Band")).toBe(false);
      expect(bandsFilterManager.isBandSelected("New Band 1")).toBe(true);
    });

    it("should save to localStorage", () => {
      bandsFilterManager.setSelectedBands(["Band A", "Band B"]);
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsBandsFilter", JSON.stringify(["Band A", "Band B"]));
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage save errors gracefully", () => {
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage full");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => bandsFilterManager.addBand("Test")).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle localStorage load errors gracefully", () => {
      localStorage.getItem = vi.fn(() => {
        throw new Error("Storage error");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = new BandsFilterManager();
      expect(manager.getSelectedBandsCount()).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
