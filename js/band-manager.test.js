// Unit tests for BandManager
// BandManager is loaded globally via vitest.setup.js

describe("BandManager", () => {
  let bandManager;
  let mockFetch;

  beforeEach(() => {
    bandManager = new BandManager();

    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock window.location
    delete window.location;
    window.location = {
      hostname: "example.com",
      pathname: "/",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with empty arrays and null values", () => {
      expect(bandManager.bands).toEqual([]);
      expect(bandManager.festivals).toEqual([]);
      expect(bandManager.currentBand).toBeNull();
      expect(bandManager.modalOverlay).toBeNull();
      expect(bandManager.isStandalone).toBe(false);
    });
  });

  describe("parseMarkdownLinks", () => {
    it("should return empty string for null input", () => {
      expect(bandManager.parseMarkdownLinks(null)).toBe("");
    });

    it("should return empty string for undefined input", () => {
      expect(bandManager.parseMarkdownLinks(undefined)).toBe("");
    });

    it("should return text as-is when no markdown links present", () => {
      const text = "This is plain text";
      expect(bandManager.parseMarkdownLinks(text)).toBe(text);
    });

    it("should convert markdown links to HTML anchor tags", () => {
      const input = "Check out [our website](https://example.com)";
      const expected =
        'Check out <a href="https://example.com" target="_blank" rel="noopener noreferrer">our website</a>';
      expect(bandManager.parseMarkdownLinks(input)).toBe(expected);
    });

    it("should convert multiple markdown links", () => {
      const input = "Visit [site1](http://site1.com) and [site2](http://site2.com)";
      const result = bandManager.parseMarkdownLinks(input);
      expect(result).toContain('<a href="http://site1.com"');
      expect(result).toContain('<a href="http://site2.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it("should handle links with special characters in text", () => {
      const input = "[Band's Website!](https://band.com)";
      const result = bandManager.parseMarkdownLinks(input);
      expect(result).toContain("Band's Website!");
    });
  });

  describe("isLocalHost", () => {
    it("should return true for localhost", () => {
      window.location.hostname = "localhost";
      expect(bandManager.isLocalHost()).toBe(true);
    });

    it("should return true for 127.0.0.1", () => {
      window.location.hostname = "127.0.0.1";
      expect(bandManager.isLocalHost()).toBe(true);
    });

    it("should return true for IPv6 localhost", () => {
      window.location.hostname = "[::1]";
      expect(bandManager.isLocalHost()).toBe(true);
    });

    it("should return false for other hostnames", () => {
      window.location.hostname = "example.com";
      expect(bandManager.isLocalHost()).toBe(false);
    });
  });

  describe("getBandByKey", () => {
    beforeEach(() => {
      bandManager.bands = [
        { key: "metallica", name: "Metallica" },
        { key: "iron-maiden", name: "Iron Maiden" },
      ];
    });

    it("should return band with matching key", () => {
      const band = bandManager.getBandByKey("metallica");
      expect(band).toEqual({ key: "metallica", name: "Metallica" });
    });

    it("should return undefined for non-existent key", () => {
      const band = bandManager.getBandByKey("nonexistent");
      expect(band).toBeUndefined();
    });
  });

  describe("getBandByName", () => {
    beforeEach(() => {
      bandManager.bands = [
        { key: "metallica", name: "Metallica" },
        { key: "iron-maiden", name: "Iron Maiden" },
      ];
    });

    it("should return band with exact name match", () => {
      const band = bandManager.getBandByName("Metallica");
      expect(band).toEqual({ key: "metallica", name: "Metallica" });
    });

    it("should return band with case-insensitive match", () => {
      const band = bandManager.getBandByName("METALLICA");
      expect(band).toEqual({ key: "metallica", name: "Metallica" });
    });

    it("should return band with trimmed name", () => {
      const band = bandManager.getBandByName("  Iron Maiden  ");
      expect(band).toEqual({ key: "iron-maiden", name: "Iron Maiden" });
    });

    it("should return undefined for non-existent band", () => {
      const band = bandManager.getBandByName("Slayer");
      expect(band).toBeUndefined();
    });
  });

  describe("getFestivalsForBand", () => {
    beforeEach(() => {
      bandManager.festivals = [
        {
          name: "Wacken",
          bands: [{ name: "Metallica" }, { name: "Slayer" }],
        },
        {
          name: "Hellfest",
          bands: [{ name: "Iron Maiden" }],
        },
        {
          name: "Download",
          bands: [{ name: "Metallica" }, { name: "Iron Maiden" }],
        },
      ];
    });

    it("should return festivals featuring the band", () => {
      const festivals = bandManager.getFestivalsForBand("Metallica");
      expect(festivals).toHaveLength(2);
      expect(festivals.map((f) => f.name)).toEqual(["Wacken", "Download"]);
    });

    it("should return empty array for band not in any festival", () => {
      const festivals = bandManager.getFestivalsForBand("Megadeth");
      expect(festivals).toEqual([]);
    });

    it("should return empty array when festivals array is empty", () => {
      bandManager.festivals = [];
      const festivals = bandManager.getFestivalsForBand("Metallica");
      expect(festivals).toEqual([]);
    });
  });

  describe("formatFestivalDates", () => {
    it("should format dates in same month", () => {
      const dates = {
        start: "2026-06-12",
        end: "2026-06-14",
      };
      const result = bandManager.formatFestivalDates(dates);
      expect(result).toBe("Jun 12-14");
    });

    it("should format dates across different months", () => {
      const dates = {
        start: "2026-06-30",
        end: "2026-07-02",
      };
      const result = bandManager.formatFestivalDates(dates);
      expect(result).toContain("Jun");
      expect(result).toContain("Jul");
      expect(result).toContain("30");
      expect(result).toContain("2");
    });

    it("should handle single day event", () => {
      const dates = {
        start: "2026-08-15",
        end: "2026-08-15",
      };
      const result = bandManager.formatFestivalDates(dates);
      expect(result).toContain("Aug");
      expect(result).toContain("15");
    });
  });

  describe("hasCompleteInfo", () => {
    const completeBand = {
      key: "metallica",
      name: "Metallica",
      description: "Thrash metal band",
      logo: "logo.png",
      headlineImage: "image.jpg",
      website: "https://metallica.com",
      spotify: "https://spotify.com",
      genres: ["Thrash Metal"],
      members: [{ name: "James", role: "Vocals" }],
      reviewed: true,
    };

    beforeEach(() => {
      bandManager.bands = [completeBand];
    });

    it("should return true on localhost regardless of data", () => {
      window.location.hostname = "localhost";
      bandManager.bands = [{ name: "Test" }];
      expect(bandManager.hasCompleteInfo("Test")).toBe(true);
    });

    it("should return true for band with complete info in production", () => {
      window.location.hostname = "example.com";
      expect(bandManager.hasCompleteInfo("Metallica")).toBe(true);
    });

    it("should return falsy for band missing key", () => {
      window.location.hostname = "example.com";
      const incompleteBand = { ...completeBand, key: null };
      bandManager.bands = [incompleteBand];
      expect(bandManager.hasCompleteInfo("Metallica")).toBeFalsy();
    });

    it("should return false for band without reviewed flag", () => {
      window.location.hostname = "example.com";
      const incompleteBand = { ...completeBand, reviewed: false };
      bandManager.bands = [incompleteBand];
      expect(bandManager.hasCompleteInfo("Metallica")).toBe(false);
    });

    it("should return false for band with empty genres", () => {
      window.location.hostname = "example.com";
      const incompleteBand = { ...completeBand, genres: [] };
      bandManager.bands = [incompleteBand];
      expect(bandManager.hasCompleteInfo("Metallica")).toBe(false);
    });

    it("should return false for band with empty members", () => {
      window.location.hostname = "example.com";
      const incompleteBand = { ...completeBand, members: [] };
      bandManager.bands = [incompleteBand];
      expect(bandManager.hasCompleteInfo("Metallica")).toBe(false);
    });

    it("should return false for non-existent band", () => {
      window.location.hostname = "example.com";
      expect(bandManager.hasCompleteInfo("Nonexistent")).toBe(false);
    });
  });

  describe("loadBands", () => {
    it("should load bands and festivals from API", async () => {
      const mockData = {
        bands: [{ name: "Metallica" }],
        festivals: [{ name: "Wacken" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await bandManager.loadBands();

      expect(mockFetch).toHaveBeenCalledWith("/db.json");
      expect(bandManager.bands).toEqual(mockData.bands);
      expect(bandManager.festivals).toEqual(mockData.festivals);
      expect(result).toEqual(mockData.bands);
    });

    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await bandManager.loadBands();

      expect(result).toEqual([]);
      expect(bandManager.bands).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await bandManager.loadBands();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle missing bands/festivals in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await bandManager.loadBands();

      expect(bandManager.bands).toEqual([]);
      expect(bandManager.festivals).toEqual([]);
      expect(result).toEqual([]);
    });
  });
});
