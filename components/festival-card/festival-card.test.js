import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// FestivalCard is loaded globally via vitest.setup.js

describe("FestivalCard", () => {
  let mockBandManager;
  let mockFavoritesManager;
  let mockFestival;

  beforeEach(() => {
    // Mock band manager
    mockBandManager = {
      hasCompleteInfo: vi.fn(),
      getBandByName: vi.fn(),
      showBand: vi.fn(),
    };

    // Mock favorites manager
    mockFavoritesManager = {
      isFavorite: vi.fn(),
      toggleFavorite: vi.fn(),
    };

    // Mock festival data
    mockFestival = {
      name: "Wacken Open Air",
      poster: "https://example.com/poster.jpg",
      dates: {
        start: "2026-07-30",
        end: "2026-08-01",
      },
      location: "Wacken, Germany",
      bands: [{ name: "Metallica" }, { name: "Iron Maiden" }],
      ticketPrice: 250,
      website: "https://wacken.com",
    };

    // Mock fetch for template loading
    global.fetch = vi.fn();

    // Reset template cache
    FestivalCard.template = null;

    // Mock UIUtils
    global.UIUtils = {
      createStarIcon: vi.fn(() => {
        const icon = document.createElement("div");
        icon.className = "star-icon";
        return icon;
      }),
      addStarEventListeners: vi.fn(),
      updateStarIcon: vi.fn(),
      showNotification: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadTemplate", () => {
    it("should load and cache template", async () => {
      const mockHTML = '<div class="festival-card">Template content</div>';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHTML,
      });

      const template = await FestivalCard.loadTemplate();

      expect(global.fetch).toHaveBeenCalledWith("components/festival-card/festival-card.html");
      expect(template).toContain("festival-card");
      expect(FestivalCard.template).not.toBeNull();
    });

    it("should use cached template on subsequent calls", async () => {
      const mockHTML = '<div class="festival-card">Cached template</div>';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHTML,
      });

      await FestivalCard.loadTemplate();
      const secondCall = await FestivalCard.loadTemplate();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(secondCall).toContain("festival-card");
    });

    it("should extract festival-card element from HTML document", async () => {
      const mockHTML = `
        <!DOCTYPE html>
        <html>
          <body>
            <div class="festival-card">Card content</div>
          </body>
        </html>
      `;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHTML,
      });

      const template = await FestivalCard.loadTemplate();

      expect(template).toContain('class="festival-card"');
      expect(template).toContain("Card content");
      expect(template).not.toContain("<!DOCTYPE html>");
    });
  });

  describe("isTemplateLoaded", () => {
    it("should return false when template not loaded", () => {
      FestivalCard.template = null;
      expect(FestivalCard.isTemplateLoaded()).toBe(false);
    });

    it("should return true when template is loaded", () => {
      FestivalCard.template = "<div>Template</div>";
      expect(FestivalCard.isTemplateLoaded()).toBe(true);
    });
  });

  describe("formatDateRange", () => {
    it("should format single day event", () => {
      const date = new Date("2026-07-30");
      const result = FestivalCard.formatDateRange(date, date);
      expect(result).toBe("Jul 30");
    });

    it("should format same month date range", () => {
      const start = new Date("2026-07-30");
      const end = new Date("2026-07-31");
      const result = FestivalCard.formatDateRange(start, end);
      expect(result).toBe("Jul 30-31");
    });

    it("should format different month date range", () => {
      const start = new Date("2026-07-30");
      const end = new Date("2026-08-01");
      const result = FestivalCard.formatDateRange(start, end);
      expect(result).toBe("Jul 30 - Aug 1");
    });
  });

  describe("createBandTagsHTML", () => {
    it("should return coming soon message for empty bands array", () => {
      const result = FestivalCard.createBandTagsHTML([], mockBandManager);
      expect(result).toContain("Coming soon...");
    });

    it("should create clickable tags for bands with complete info", () => {
      mockBandManager.hasCompleteInfo.mockReturnValueOnce(true);
      mockBandManager.getBandByName.mockReturnValueOnce({ key: "metallica", name: "Metallica" });

      const result = FestivalCard.createBandTagsHTML([{ name: "Metallica" }], mockBandManager);

      expect(result).toContain("clickable");
      expect(result).toContain('data-band-key="metallica"');
      expect(result).toContain("Metallica");
    });

    it("should create non-clickable tags for bands without complete info", () => {
      mockBandManager.hasCompleteInfo.mockReturnValueOnce(false);

      const result = FestivalCard.createBandTagsHTML([{ name: "Unknown Band" }], mockBandManager);

      expect(result).not.toContain("clickable");
      expect(result).not.toContain("data-band-key");
      expect(result).toContain("Unknown Band");
    });

    it("should handle multiple bands", () => {
      mockBandManager.hasCompleteInfo.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockBandManager.getBandByName.mockReturnValueOnce({ key: "metallica", name: "Metallica" });

      const bands = [{ name: "Metallica" }, { name: "Unknown Band" }];
      const result = FestivalCard.createBandTagsHTML(bands, mockBandManager);

      expect(result).toContain("Metallica");
      expect(result).toContain("Unknown Band");
      expect(result.match(/band-tag/g).length).toBe(2);
    });

    it("should sort bands by size descending then alphabetically", () => {
      mockBandManager.hasCompleteInfo.mockReturnValue(false);

      const bands = [
        { name: "Metallica", size: 2 },
        { name: "Iron Maiden", size: 3 },
        { name: "Slayer", size: 1 },
        { name: "Anthrax", size: 3 },
      ];

      const result = FestivalCard.createBandTagsHTML(bands, mockBandManager);

      // Extract band names in order they appear
      const matches = result.match(/>[^<]+</g).map((m) => m.slice(1, -1));

      // Expected order: size 3 first (Anthrax, Iron Maiden alphabetically), then size 2 (Metallica), then size 1 (Slayer)
      expect(matches[0]).toBe("Anthrax");
      expect(matches[1]).toBe("Iron Maiden");
      expect(matches[2]).toBe("Metallica");
      expect(matches[3]).toBe("Slayer");
    });

    it("should apply tier classes based on band size", () => {
      mockBandManager.hasCompleteInfo.mockReturnValue(false);

      const bands = [
        { name: "Headliner", size: 3 },
        { name: "Support", size: 2 },
        { name: "Opener", size: 1 },
        { name: "Unknown", size: 0 },
      ];

      const result = FestivalCard.createBandTagsHTML(bands, mockBandManager);

      // Verify tier classes are applied correctly
      expect(result).toContain('class="band-tag tier-3"');
      expect(result).toContain('class="band-tag tier-2"');
      expect(result).toContain('class="band-tag tier-1"');

      // Verify size 0 is treated as tier-1
      const unknownBandMatch = result.match(/<span class="band-tag tier-1">Unknown<\/span>/);
      expect(unknownBandMatch).toBeTruthy();
    });
  });

  describe("render", () => {
    beforeEach(() => {
      const mockTemplate = `
        <div class="festival-card">
          <img src="{{poster}}" alt="{{name}}">
          <h3>{{name}}</h3>
          <p>{{dates}}</p>
          <p>{{location}}</p>
          <div class="bands">{{bands}}</div>
          <p>{{ticketPrice}}</p>
          <a href="{{website}}">Website</a>
          <div class="favorite-container"></div>
        </div>
      `;
      FestivalCard.template = mockTemplate;
      mockFavoritesManager.isFavorite.mockReturnValue(false);
      mockBandManager.hasCompleteInfo.mockReturnValue(false);
    });

    it("should render festival card with all data", async () => {
      const card = await FestivalCard.render(mockFestival, {
        bandManager: mockBandManager,
        favoritesManager: mockFavoritesManager,
      });

      expect(card.innerHTML).toContain("Wacken Open Air");
      expect(card.innerHTML).toContain("Wacken, Germany");
      expect(card.innerHTML).toContain("From 250€");
      expect(card.innerHTML).toContain("https://wacken.com");
    });

    it("should format dates correctly", async () => {
      const card = await FestivalCard.render(mockFestival, {
        bandManager: mockBandManager,
        favoritesManager: mockFavoritesManager,
      });

      expect(card.innerHTML).toContain("Jul 30");
    });

    it("should show price not available when no ticket price", async () => {
      const festivalWithoutPrice = { ...mockFestival, ticketPrice: null };
      const card = await FestivalCard.render(festivalWithoutPrice, {
        bandManager: mockBandManager,
        favoritesManager: mockFavoritesManager,
      });

      expect(card.innerHTML).toContain("Price not available");
    });

    it("should add favorite feature when favoritesManager provided", async () => {
      await FestivalCard.render(mockFestival, {
        bandManager: mockBandManager,
        favoritesManager: mockFavoritesManager,
      });

      expect(UIUtils.createStarIcon).toHaveBeenCalled();
      expect(UIUtils.addStarEventListeners).toHaveBeenCalled();
    });

    it("should wrap in div when wrapInDiv option is true", async () => {
      const wrapper = await FestivalCard.render(mockFestival, {
        bandManager: mockBandManager,
        favoritesManager: mockFavoritesManager,
        wrapInDiv: true,
      });

      expect(wrapper.tagName).toBe("DIV");
      expect(wrapper.querySelector(".festival-card")).not.toBeNull();
    });
  });

  describe("addFavoriteFeature", () => {
    let card;

    beforeEach(() => {
      card = document.createElement("div");
      card.className = "festival-card";
      const favoriteContainer = document.createElement("div");
      favoriteContainer.className = "favorite-container";
      card.appendChild(favoriteContainer);
    });

    it("should add star icon to favorite container", () => {
      mockFavoritesManager.isFavorite.mockReturnValue(false);

      FestivalCard.addFavoriteFeature(card, mockFestival, mockFavoritesManager);

      expect(UIUtils.createStarIcon).toHaveBeenCalledWith(false);
      const container = card.querySelector(".favorite-container");
      expect(container.children.length).toBeGreaterThan(0);
    });

    it("should create filled star for favorited festival", () => {
      mockFavoritesManager.isFavorite.mockReturnValue(true);

      FestivalCard.addFavoriteFeature(card, mockFestival, mockFavoritesManager);

      expect(UIUtils.createStarIcon).toHaveBeenCalledWith(true);
    });

    it("should handle missing favorite container gracefully", () => {
      const emptyCard = document.createElement("div");
      expect(() => {
        FestivalCard.addFavoriteFeature(emptyCard, mockFestival, mockFavoritesManager);
      }).not.toThrow();
    });

    it("should setup event listeners for star icon", () => {
      mockFavoritesManager.isFavorite.mockReturnValue(false);

      FestivalCard.addFavoriteFeature(card, mockFestival, mockFavoritesManager);

      expect(UIUtils.addStarEventListeners).toHaveBeenCalled();
    });
  });

  describe("addBandClickHandlers", () => {
    let card;

    beforeEach(() => {
      card = document.createElement("div");
      card.className = "festival-card";
    });

    it("should add click handlers to clickable band tags", () => {
      const bandTag1 = document.createElement("span");
      bandTag1.className = "band-tag clickable";
      bandTag1.setAttribute("data-band-key", "metallica");

      const bandTag2 = document.createElement("span");
      bandTag2.className = "band-tag clickable";
      bandTag2.setAttribute("data-band-key", "iron-maiden");

      card.appendChild(bandTag1);
      card.appendChild(bandTag2);

      FestivalCard.addBandClickHandlers(card, mockBandManager);

      bandTag1.click();
      expect(mockBandManager.showBand).toHaveBeenCalledWith("metallica", false);
    });

    it("should not add handlers to non-clickable band tags", () => {
      const bandTag = document.createElement("span");
      bandTag.className = "band-tag";
      card.appendChild(bandTag);

      FestivalCard.addBandClickHandlers(card, mockBandManager);

      bandTag.click();
      expect(mockBandManager.showBand).not.toHaveBeenCalled();
    });

    it("should stop event propagation when band tag is clicked", () => {
      const bandTag = document.createElement("span");
      bandTag.className = "band-tag clickable";
      bandTag.setAttribute("data-band-key", "metallica");
      card.appendChild(bandTag);

      FestivalCard.addBandClickHandlers(card, mockBandManager);

      const event = new MouseEvent("click", { bubbles: true });
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");
      bandTag.dispatchEvent(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it("should handle band tags without data-band-key", () => {
      const bandTag = document.createElement("span");
      bandTag.className = "band-tag clickable";
      card.appendChild(bandTag);

      FestivalCard.addBandClickHandlers(card, mockBandManager);

      bandTag.click();
      expect(mockBandManager.showBand).not.toHaveBeenCalled();
    });
  });
});
