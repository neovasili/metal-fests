// Unit tests for SearchFilterManager
// SearchFilterManager is loaded globally via vitest.setup.js

describe("SearchFilterManager", () => {
  let searchFilterManager;
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

    searchFilterManager = new SearchFilterManager();
  });

  describe("constructor", () => {
    it("should initialize with empty search text when localStorage is empty", () => {
      expect(searchFilterManager.getSearchText()).toBe("");
    });

    it("should load search text from localStorage", () => {
      mockLocalStorage["metalFestsSearchFilter"] = "metallica";
      const manager = new SearchFilterManager();
      expect(manager.getSearchText()).toBe("metallica");
    });

    it("should handle missing localStorage gracefully", () => {
      localStorage.getItem = vi.fn(() => null);
      const manager = new SearchFilterManager();
      expect(manager.getSearchText()).toBe("");
    });
  });

  describe("setSearchText", () => {
    it("should set search text", () => {
      searchFilterManager.setSearchText("iron maiden");
      expect(searchFilterManager.getSearchText()).toBe("iron maiden");
    });

    it("should save to localStorage", () => {
      searchFilterManager.setSearchText("slayer");
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsSearchFilter", "slayer");
    });

    it("should handle empty string", () => {
      searchFilterManager.setSearchText("");
      expect(searchFilterManager.getSearchText()).toBe("");
    });
  });

  describe("getSearchText", () => {
    it("should return empty string by default", () => {
      expect(searchFilterManager.getSearchText()).toBe("");
    });

    it("should return current search text", () => {
      searchFilterManager.setSearchText("megadeth");
      expect(searchFilterManager.getSearchText()).toBe("megadeth");
    });
  });

  describe("clearSearchText", () => {
    it("should clear search text", () => {
      searchFilterManager.setSearchText("anthrax");
      searchFilterManager.clearSearchText();
      expect(searchFilterManager.getSearchText()).toBe("");
    });

    it("should save empty string to localStorage", () => {
      searchFilterManager.setSearchText("test");
      searchFilterManager.clearSearchText();
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsSearchFilter", "");
    });
  });

  describe("isSearchActive", () => {
    it("should return false when search text is empty", () => {
      expect(searchFilterManager.isSearchActive()).toBe(false);
    });

    it("should return false when search text is only whitespace", () => {
      searchFilterManager.setSearchText("   ");
      expect(searchFilterManager.isSearchActive()).toBe(false);
    });

    it("should return true when search text is not empty", () => {
      searchFilterManager.setSearchText("sabbath");
      expect(searchFilterManager.isSearchActive()).toBe(true);
    });

    it("should return true when search text has leading/trailing whitespace but content", () => {
      searchFilterManager.setSearchText("  judas priest  ");
      expect(searchFilterManager.isSearchActive()).toBe(true);
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage save errors gracefully", () => {
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage full");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => searchFilterManager.setSearchText("test")).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle localStorage load errors gracefully", () => {
      localStorage.getItem = vi.fn(() => {
        throw new Error("Storage error");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = new SearchFilterManager();
      expect(manager.getSearchText()).toBe("");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
