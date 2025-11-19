import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// FestivalManager is loaded globally via vitest.setup.js

describe("FestivalManager", () => {
  let festivalManager;
  let mockFestivals;
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

    // Mock festivals data
    mockFestivals = [
      {
        key: "wacken-2026",
        name: "Wacken Open Air",
        dates: { start: "2026-07-30", end: "2026-08-01" },
        location: "Wacken, Germany",
        bands: [{ name: "Metallica" }],
      },
      {
        key: "hellfest-2026",
        name: "Hellfest",
        dates: { start: "2026-06-18", end: "2026-06-21" },
        location: "Clisson, France",
        bands: [{ name: "Iron Maiden" }],
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

    festivalManager = new FestivalManager("test-list-container", "test-form-container");
  });

  afterEach(() => {
    document.body.removeChild(listContainer);
    document.body.removeChild(formContainer);
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with empty arrays and default values", () => {
      expect(festivalManager.festivals).toEqual([]);
      expect(festivalManager.filteredFestivals).toEqual([]);
      expect(festivalManager.selectedIndex).toBe(-1);
      expect(festivalManager.sortOrder).toBe("asc");
      expect(festivalManager.listContainerId).toBe("test-list-container");
      expect(festivalManager.formContainerId).toBe("test-form-container");
    });
  });

  describe("loadFestivals", () => {
    it("should load festivals from API", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ festivals: mockFestivals }),
      });

      await festivalManager.loadFestivals();

      expect(festivalManager.festivals).toEqual(mockFestivals);
      expect(festivalManager.filteredFestivals.length).toBe(2);
    });

    it("should sort festivals alphabetically", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ festivals: mockFestivals }),
      });

      await festivalManager.loadFestivals();

      expect(festivalManager.filteredFestivals[0].name).toBe("Hellfest");
      expect(festivalManager.filteredFestivals[1].name).toBe("Wacken Open Air");
    });

    it("should handle fetch errors gracefully", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await festivalManager.loadFestivals();

      expect(consoleSpy).toHaveBeenCalledWith("Error loading festivals:", expect.any(Error));
      expect(window.notificationManager.show).toHaveBeenCalledWith("Error loading festivals", "error");
      consoleSpy.mockRestore();
    });

    it("should handle non-ok response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await festivalManager.loadFestivals();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle missing festivals in response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await festivalManager.loadFestivals();

      expect(festivalManager.festivals).toEqual([]);
    });
  });

  describe("formatDate", () => {
    it("should format date correctly", () => {
      const result = festivalManager.formatDate("2026-07-30");
      expect(result).toMatch(/30.*Jul/);
    });

    it("should handle empty date", () => {
      const result = festivalManager.formatDate("");
      expect(result).toBe("");
    });

    it("should handle null date", () => {
      const result = festivalManager.formatDate(null);
      expect(result).toBe("");
    });
  });

  describe("sortFestivals", () => {
    beforeEach(() => {
      festivalManager.festivals = mockFestivals;
      festivalManager.filteredFestivals = [...mockFestivals];
      festivalManager.adminList = {
        setItems: vi.fn(),
        updateTitle: vi.fn(),
        render: vi.fn(),
      };
    });

    it("should sort festivals ascending", () => {
      festivalManager.sortFestivals("asc");

      expect(festivalManager.filteredFestivals[0].name).toBe("Hellfest");
      expect(festivalManager.filteredFestivals[1].name).toBe("Wacken Open Air");
    });

    it("should sort festivals descending", () => {
      festivalManager.sortFestivals("desc");

      expect(festivalManager.filteredFestivals[0].name).toBe("Wacken Open Air");
      expect(festivalManager.filteredFestivals[1].name).toBe("Hellfest");
    });

    it("should update list after sorting", () => {
      festivalManager.sortFestivals("asc");

      expect(festivalManager.adminList.setItems).toHaveBeenCalled();
      expect(festivalManager.adminList.render).toHaveBeenCalled();
    });
  });

  describe("filterFestivals", () => {
    beforeEach(() => {
      festivalManager.festivals = mockFestivals;
      festivalManager.filteredFestivals = [...mockFestivals];
      festivalManager.adminList = {
        setItems: vi.fn(),
        updateTitle: vi.fn(),
        render: vi.fn(),
      };
    });

    it("should show all festivals when search is empty", () => {
      festivalManager.filterFestivals("");

      expect(festivalManager.filteredFestivals.length).toBe(2);
    });

    it("should filter by festival name", () => {
      festivalManager.filterFestivals("wacken");

      expect(festivalManager.filteredFestivals.length).toBe(1);
      expect(festivalManager.filteredFestivals[0].name).toBe("Wacken Open Air");
    });

    it("should filter by location", () => {
      festivalManager.filterFestivals("france");

      expect(festivalManager.filteredFestivals.length).toBe(1);
      expect(festivalManager.filteredFestivals[0].name).toBe("Hellfest");
    });

    it("should filter by band name", () => {
      festivalManager.filterFestivals("metallica");

      expect(festivalManager.filteredFestivals.length).toBe(1);
      expect(festivalManager.filteredFestivals[0].name).toBe("Wacken Open Air");
    });

    it("should be case insensitive", () => {
      festivalManager.filterFestivals("WACKEN");

      expect(festivalManager.filteredFestivals.length).toBe(1);
    });
  });

  describe("onFestivalSelect", () => {
    beforeEach(() => {
      festivalManager.filteredFestivals = mockFestivals;
      festivalManager.editForm = {
        loadFestival: vi.fn(),
        render: vi.fn(),
      };
    });

    it("should select festival and load in edit form", () => {
      festivalManager.onFestivalSelect({}, 0);

      expect(festivalManager.selectedIndex).toBe(0);
      expect(festivalManager.currentFestival).toBe(mockFestivals[0]);
      expect(festivalManager.editForm.loadFestival).toHaveBeenCalledWith(mockFestivals[0]);
      expect(festivalManager.editForm.render).toHaveBeenCalled();
    });

    it("should handle missing edit form", () => {
      festivalManager.editForm = null;

      expect(() => festivalManager.onFestivalSelect({}, 0)).not.toThrow();
    });
  });

  describe("saveFestival", () => {
    beforeEach(() => {
      festivalManager.festivals = [...mockFestivals];
      festivalManager.filteredFestivals = [...mockFestivals];
      festivalManager.adminList = {
        setItems: vi.fn(),
        updateTitle: vi.fn(),
        render: vi.fn(),
      };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
    });

    it("should update existing festival", async () => {
      const updatedFestival = { ...mockFestivals[0], name: "Updated Name" };

      await festivalManager.saveFestival(updatedFestival);

      expect(festivalManager.festivals[0].name).toBe("Updated Name");
      expect(window.notificationManager.show).toHaveBeenCalledWith("Festival updated successfully", "success");
    });

    it("should add new festival", async () => {
      const newFestival = {
        key: "new-festival",
        name: "New Festival",
        dates: { start: "2026-08-01", end: "2026-08-03" },
        location: "Test Location",
        bands: [],
      };

      await festivalManager.saveFestival(newFestival);

      expect(festivalManager.festivals.length).toBe(3);
      expect(window.notificationManager.show).toHaveBeenCalledWith("Festival created successfully", "success");
    });

    it("should not show notification for auto-save", async () => {
      const updatedFestival = { ...mockFestivals[0], name: "Auto Updated" };

      await festivalManager.saveFestival(updatedFestival, true);

      expect(window.notificationManager.show).not.toHaveBeenCalled();
    });

    it("should handle save errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Save failed"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(festivalManager.saveFestival(mockFestivals[0])).rejects.toThrow();

      expect(window.notificationManager.show).toHaveBeenCalledWith("Error saving festival", "error");
      consoleSpy.mockRestore();
    });
  });

  describe("getSelectedFestival", () => {
    it("should return selected festival", () => {
      festivalManager.filteredFestivals = mockFestivals;
      festivalManager.selectedIndex = 1;

      const result = festivalManager.getSelectedFestival();

      expect(result).toBe(mockFestivals[1]);
    });

    it("should return null when no selection", () => {
      const result = festivalManager.getSelectedFestival();

      expect(result).toBeNull();
    });
  });

  describe("navigateList", () => {
    beforeEach(() => {
      festivalManager.filteredFestivals = mockFestivals;
      festivalManager.selectedIndex = 0;
      festivalManager.adminList = {
        selectItem: vi.fn(),
      };
    });

    it("should navigate to next festival", () => {
      festivalManager.navigateList(1);

      expect(festivalManager.adminList.selectItem).toHaveBeenCalledWith(1);
    });

    it("should navigate to previous festival", () => {
      festivalManager.selectedIndex = 1;
      festivalManager.navigateList(-1);

      expect(festivalManager.adminList.selectItem).toHaveBeenCalledWith(0);
    });

    it("should wrap to last festival when going before first", () => {
      festivalManager.navigateList(-1);

      expect(festivalManager.adminList.selectItem).toHaveBeenCalledWith(1);
    });

    it("should wrap to first festival when going after last", () => {
      festivalManager.selectedIndex = 1;
      festivalManager.navigateList(1);

      expect(festivalManager.adminList.selectItem).toHaveBeenCalledWith(0);
    });

    it("should do nothing with empty list", () => {
      festivalManager.filteredFestivals = [];

      festivalManager.navigateList(1);

      expect(festivalManager.adminList.selectItem).not.toHaveBeenCalled();
    });
  });
});
