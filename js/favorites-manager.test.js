// Unit tests for FavoritesManager
// FavoritesManager is loaded globally via vitest.setup.js

describe("FavoritesManager", () => {
  let favoritesManager;
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

    favoritesManager = new FavoritesManager();
  });

  describe("constructor", () => {
    it("should initialize with empty favorites when localStorage is empty", () => {
      expect(favoritesManager.getFavoriteCount()).toBe(0);
    });

    it("should load favorites from localStorage", () => {
      mockLocalStorage["metalFestsFavorites"] = JSON.stringify(["Festival 1", "Festival 2"]);
      const manager = new FavoritesManager();
      expect(manager.getFavoriteCount()).toBe(2);
      expect(manager.isFavorite("Festival 1")).toBe(true);
    });

    it("should handle corrupted localStorage data gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockLocalStorage["metalFestsFavorites"] = "invalid json";
      const manager = new FavoritesManager();
      expect(manager.getFavoriteCount()).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe("toggleFavorite", () => {
    it("should add a festival to favorites when not present", () => {
      const result = favoritesManager.toggleFavorite("Wacken Open Air");
      expect(result).toBe(true);
      expect(favoritesManager.isFavorite("Wacken Open Air")).toBe(true);
    });

    it("should remove a festival from favorites when already present", () => {
      favoritesManager.toggleFavorite("Wacken Open Air");
      const result = favoritesManager.toggleFavorite("Wacken Open Air");
      expect(result).toBe(false);
      expect(favoritesManager.isFavorite("Wacken Open Air")).toBe(false);
    });

    it("should save to localStorage after toggle", () => {
      favoritesManager.toggleFavorite("Hellfest");
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsFavorites", JSON.stringify(["Hellfest"]));
    });
  });

  describe("isFavorite", () => {
    it("should return true for favorited festivals", () => {
      favoritesManager.toggleFavorite("Download Festival");
      expect(favoritesManager.isFavorite("Download Festival")).toBe(true);
    });

    it("should return false for non-favorited festivals", () => {
      expect(favoritesManager.isFavorite("Random Festival")).toBe(false);
    });
  });

  describe("getFavorites", () => {
    it("should return empty array when no favorites", () => {
      expect(favoritesManager.getFavorites()).toEqual([]);
    });

    it("should return all favorited festivals", () => {
      favoritesManager.toggleFavorite("Festival A");
      favoritesManager.toggleFavorite("Festival B");
      const favorites = favoritesManager.getFavorites();
      expect(favorites).toHaveLength(2);
      expect(favorites).toContain("Festival A");
      expect(favorites).toContain("Festival B");
    });
  });

  describe("clearFavorites", () => {
    it("should remove all favorites", () => {
      favoritesManager.toggleFavorite("Festival 1");
      favoritesManager.toggleFavorite("Festival 2");
      favoritesManager.clearFavorites();
      expect(favoritesManager.getFavoriteCount()).toBe(0);
    });

    it("should save empty state to localStorage", () => {
      favoritesManager.toggleFavorite("Festival 1");
      favoritesManager.clearFavorites();
      expect(localStorage.setItem).toHaveBeenCalledWith("metalFestsFavorites", JSON.stringify([]));
    });
  });

  describe("getFavoriteCount", () => {
    it("should return 0 when no favorites", () => {
      expect(favoritesManager.getFavoriteCount()).toBe(0);
    });

    it("should return correct count of favorites", () => {
      favoritesManager.toggleFavorite("Festival 1");
      favoritesManager.toggleFavorite("Festival 2");
      favoritesManager.toggleFavorite("Festival 3");
      expect(favoritesManager.getFavoriteCount()).toBe(3);
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage save errors gracefully", () => {
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage full");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => favoritesManager.toggleFavorite("Test")).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle localStorage load errors gracefully", () => {
      localStorage.getItem = vi.fn(() => {
        throw new Error("Storage error");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = new FavoritesManager();
      expect(manager.getFavoriteCount()).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
