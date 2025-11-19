// Unit tests for FilterManager
// FilterManager is loaded globally via vitest.setup.js

describe("FilterManager", () => {
  let filterManager;
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

    filterManager = new FilterManager();
  });

  describe("constructor", () => {
    it("should initialize with filter disabled when localStorage is empty", () => {
      expect(filterManager.isFilterEnabled()).toBe(false);
    });

    it("should load filter state from localStorage", () => {
      mockLocalStorage["metalFestsFilterState"] = JSON.stringify(true);
      const manager = new FilterManager();
      expect(manager.isFilterEnabled()).toBe(true);
    });

    it("should handle corrupted localStorage data gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockLocalStorage["metalFestsFilterState"] = "invalid json";
      const manager = new FilterManager();
      expect(manager.isFilterEnabled()).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe("toggleFilter", () => {
    it("should enable filter when disabled", () => {
      const result = filterManager.toggleFilter();
      expect(result).toBe(true);
      expect(filterManager.isFilterEnabled()).toBe(true);
    });

    it("should disable filter when enabled", () => {
      filterManager.toggleFilter(); // Enable
      const result = filterManager.toggleFilter(); // Disable
      expect(result).toBe(false);
      expect(filterManager.isFilterEnabled()).toBe(false);
    });

    it("should save to localStorage after toggle", () => {
      filterManager.toggleFilter();
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsFilterState", JSON.stringify(true));
    });
  });

  describe("isFilterEnabled", () => {
    it("should return false when filter is disabled", () => {
      expect(filterManager.isFilterEnabled()).toBe(false);
    });

    it("should return true when filter is enabled", () => {
      filterManager.toggleFilter();
      expect(filterManager.isFilterEnabled()).toBe(true);
    });
  });

  describe("setFilterState", () => {
    it("should enable filter when set to true", () => {
      filterManager.setFilterState(true);
      expect(filterManager.isFilterEnabled()).toBe(true);
    });

    it("should disable filter when set to false", () => {
      filterManager.setFilterState(true);
      filterManager.setFilterState(false);
      expect(filterManager.isFilterEnabled()).toBe(false);
    });

    it("should save to localStorage", () => {
      filterManager.setFilterState(true);
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsFilterState", JSON.stringify(true));
    });
  });

  describe("resetFilter", () => {
    it("should disable filter", () => {
      filterManager.toggleFilter(); // Enable
      filterManager.resetFilter();
      expect(filterManager.isFilterEnabled()).toBe(false);
    });

    it("should save to localStorage", () => {
      filterManager.resetFilter();
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsFilterState", JSON.stringify(false));
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage save errors gracefully", () => {
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage full");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => filterManager.toggleFilter()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle localStorage load errors gracefully", () => {
      localStorage.getItem = vi.fn(() => {
        throw new Error("Storage error");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = new FilterManager();
      expect(manager.isFilterEnabled()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
