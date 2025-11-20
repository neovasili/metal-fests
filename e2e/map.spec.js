import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load db.json once for all tests
const dbPath = path.join(process.cwd(), "db.json");
const dbContent = fs.readFileSync(dbPath, "utf-8");
const db = JSON.parse(dbContent);

test.describe("Map Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to timeline first (map requires timeline data to be loaded)
    await page.goto("/");

    // Wait for timeline to load
    await page.waitForSelector(".festival-card", {
      state: "visible",
      timeout: 10000,
    });

    // Give time for all data to load
    await page.waitForTimeout(500);

    // Now navigate to map page
    const mapLink = page.locator(".view-link[href='/map']").first();
    await mapLink.click();

    // Wait for map view container to become visible (it has display: none initially)
    await page.waitForFunction(
      () => {
        const mapView = document.getElementById("map-view");
        return mapView && window.getComputedStyle(mapView).display !== "none";
      },
      { timeout: 5000 },
    );

    // Wait for the map element to be visible
    await page.waitForSelector("#festival-map", {
      state: "visible",
      timeout: 10000,
    });

    // Wait for Leaflet map to initialize (check for leaflet-container class)
    await page.waitForSelector(".leaflet-container", {
      state: "visible",
      timeout: 10000,
    });

    // Give time for markers to render
    await page.waitForTimeout(1500);
  });

  test("navigates to map view and displays map container", async ({ page }) => {
    const mapView = page.locator("#map-view");
    const festivalMap = page.locator("#festival-map");

    // Check map view container is visible
    await expect(mapView).toBeVisible();

    // Check map element is visible
    await expect(festivalMap).toBeVisible();
  });

  test("initializes Leaflet map with correct elements", async ({ page }) => {
    // Check for Leaflet container
    const leafletContainer = page.locator(".leaflet-container");
    await expect(leafletContainer).toBeVisible();

    // Check for map tiles (check for attached state, not visible since it might be positioned offscreen)
    const tileLayer = page.locator(".leaflet-tile-pane");
    await expect(tileLayer).toBeAttached();

    // Check for zoom controls
    const zoomControl = page.locator(".leaflet-control-zoom");
    await expect(zoomControl).toBeVisible();

    // Check for zoom in button
    const zoomIn = page.locator(".leaflet-control-zoom-in");
    await expect(zoomIn).toBeVisible();

    // Check for zoom out button
    const zoomOut = page.locator(".leaflet-control-zoom-out");
    await expect(zoomOut).toBeVisible();
  });

  test("displays correct number of festival markers", async ({ page }) => {
    // Count festivals with valid coordinates
    const festivalsWithCoordinates = db.festivals.filter(
      (f) => f.coordinates && f.coordinates.lat && f.coordinates.lng,
    );

    // Wait for markers to load
    await page.waitForSelector(".custom-marker", { timeout: 10000 });

    // Count markers on map
    const markerCount = await page.locator(".custom-marker").count();

    expect(markerCount).toBe(festivalsWithCoordinates.length);
  });

  test("festival markers have correct structure", async ({ page }) => {
    const firstMarker = page.locator(".custom-marker").first();

    await expect(firstMarker).toBeVisible();

    // Check marker contains image
    const markerImage = firstMarker.locator("img");
    await expect(markerImage).toBeVisible();

    // Check image has correct attributes
    await expect(markerImage).toHaveAttribute("src", "img/metal-fests.png");
  });

  test("clicking marker opens festival modal", async ({ page }) => {
    // Click first marker (force click to bypass element interception)
    const firstMarker = page.locator(".custom-marker").first();
    await firstMarker.click({ force: true });

    // Wait for modal to appear
    await page.waitForSelector("#festival-modal", {
      state: "visible",
      timeout: 5000,
    });

    // Check modal is visible
    const modal = page.locator("#festival-modal");
    await expect(modal).toBeVisible();

    // Check modal has content
    const modalContent = modal.locator(".modal-content");
    await expect(modalContent).toBeVisible();

    // Check festival card is rendered in modal
    const festivalCard = modal.locator(".festival-card");
    await expect(festivalCard).toBeVisible();
  });

  test("modal displays festival card with all required information", async ({ page }) => {
    // Click first marker (force click to bypass element interception)
    await page.locator(".custom-marker").first().click({ force: true });

    // Wait for modal
    await page.waitForSelector("#festival-modal", { state: "visible" });

    const modal = page.locator("#festival-modal");
    const festivalCard = modal.locator(".festival-card");

    // Check festival card elements
    await expect(festivalCard.locator(".festival-poster")).toBeVisible();
    await expect(festivalCard.locator(".festival-name")).toBeVisible();
    await expect(festivalCard.locator(".festival-dates")).toBeVisible();
    await expect(festivalCard.locator(".festival-location")).toBeVisible();
    await expect(festivalCard.locator(".ticket-price")).toBeVisible();
    await expect(festivalCard.locator(".festival-bands")).toBeVisible();
    await expect(festivalCard.locator(".festival-website")).toBeVisible();
  });

  test("modal close button works", async ({ page }) => {
    // Open modal
    await page.locator(".custom-marker").first().click({ force: true });
    await page.waitForSelector("#festival-modal", { state: "visible" });

    const modal = page.locator("#festival-modal");

    // Click close button
    const closeButton = modal.locator(".modal-close");
    await closeButton.click();

    // Wait a bit for animation
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(modal).toBeHidden();
  });

  test("modal closes when clicking outside content", async ({ page }) => {
    // Open modal
    await page.locator(".custom-marker").first().click({ force: true });
    await page.waitForSelector("#festival-modal", { state: "visible" });

    const modal = page.locator("#festival-modal");

    // Click on modal overlay (outside content)
    await modal.click({ position: { x: 10, y: 10 } });

    // Wait a bit for animation
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(modal).toBeHidden();
  });

  test("modal closes with Escape key", async ({ page }) => {
    // Open modal
    await page.locator(".custom-marker").first().click({ force: true });
    await page.waitForSelector("#festival-modal", { state: "visible" });

    const modal = page.locator("#festival-modal");

    // Press Escape key
    await page.keyboard.press("Escape");

    // Wait a bit for animation
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(modal).toBeHidden();
  });

  test("map view link is active when on map page", async ({ page }) => {
    const mapLink = page.locator(".view-link[href='/map']").first();

    // Check map link has active class
    await expect(mapLink).toHaveClass(/active/);
  });

  test("search filter affects visible markers", async ({ page }) => {
    // Get initial marker count
    const initialCount = await page.locator(".custom-marker").count();
    expect(initialCount).toBeGreaterThan(0);

    // Use search filter - search for a specific festival
    const searchInput = page.locator(".search-filter-input").first();
    await searchInput.fill("Sweden");

    // Wait for filter to apply (debounce + render time)
    await page.waitForTimeout(1000);

    // Get filtered marker count
    const filteredCount = await page.locator(".custom-marker").count();

    // Should have fewer markers (or equal if all festivals match)
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(1000);

    // Should be back to initial count
    const finalCount = await page.locator(".custom-marker").count();
    expect(finalCount).toBe(initialCount);
  });

  test("favorites filter affects visible markers", async ({ page }) => {
    // Get initial marker count
    const initialCount = await page.locator(".custom-marker").count();

    // Add a festival to favorites by clicking a marker and favoriting it
    await page.locator(".custom-marker").first().click({ force: true });
    await page.waitForSelector("#festival-modal", { state: "visible" });

    const modal = page.locator("#festival-modal");
    const starIcon = modal.locator(".star-icon").first();
    await starIcon.click();

    // Close modal
    await modal.locator(".modal-close").click();
    await page.waitForTimeout(300);

    // Activate favorites filter
    const favoritesButton = page.locator(".filter-button").first();
    await favoritesButton.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Get filtered marker count
    const filteredCount = await page.locator(".custom-marker").count();

    // Should have fewer markers (only favorites)
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThanOrEqual(1);

    // Deactivate filter
    await favoritesButton.click();
    await page.waitForTimeout(500);

    // Should be back to initial count
    const finalCount = await page.locator(".custom-marker").count();
    expect(finalCount).toBe(initialCount);
  });

  test("bands filter affects visible markers", async ({ page }) => {
    // Get initial marker count
    const initialCount = await page.locator(".custom-marker").count();

    // Open bands filter
    const bandsFilterToggle = page.locator(".bands-filter-toggle").first();
    await bandsFilterToggle.click();

    // Wait for dropdown to open
    await page.waitForTimeout(300);

    // Select first band checkbox from the bands filter list
    const firstBandCheckbox = page.locator(".bands-filter-item input[type='checkbox']").first();
    await firstBandCheckbox.click({ force: true });

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Get filtered marker count
    const filteredCount = await page.locator(".custom-marker").count();

    // Should have fewer or equal markers
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    // Clear filter
    const clearButton = page.locator(".bands-filter-clear-all").first();
    await clearButton.click({ force: true });
    await page.waitForTimeout(500);

    // Should be back to initial count
    const finalCount = await page.locator(".custom-marker").count();
    expect(finalCount).toBe(initialCount);
  });

  test("zoom controls work correctly", async ({ page }) => {
    const zoomIn = page.locator(".leaflet-control-zoom-in");
    const zoomOut = page.locator(".leaflet-control-zoom-out");

    // Both should be visible
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();

    // Click zoom in
    await zoomIn.click();
    await page.waitForTimeout(500);

    // Click zoom out
    await zoomOut.click();
    await page.waitForTimeout(500);

    // Both buttons should still be visible (no errors)
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
  });

  test("header and footer are visible on map page", async ({ page }) => {
    const header = page.locator("header.header");
    const footer = page.locator("footer");

    // Check header is visible
    await expect(header).toBeVisible();

    // Check title
    const title = header.locator("h1 a");
    await expect(title).toHaveText("Metal Festivals 2026");

    // Check footer is visible
    await expect(footer).toBeVisible();
  });

  test("switching between timeline and map views works", async ({ page }) => {
    // We're on map page, check map is visible
    const mapView = page.locator("#map-view");
    await expect(mapView).toBeVisible();

    // Click timeline link
    const timelineLink = page.locator(".view-link[href='/']").first();
    await timelineLink.click();

    // Wait for navigation
    await page.waitForTimeout(500);

    // Check URL changed to timeline
    expect(page.url()).toMatch(/\/$/);

    // Timeline content should be visible
    const timelineContent = page.locator("#timeline-content");
    await expect(timelineContent).toBeVisible();

    // Click map link again
    const mapLink = page.locator(".view-link[href='/map']").first();
    await mapLink.click();

    // Wait for navigation
    await page.waitForTimeout(500);

    // Check URL changed back to map
    expect(page.url()).toContain("/map");

    // Map should be visible again
    await expect(mapView).toBeVisible();
  });

  test("loading indicator disappears after map loads", async ({ page }) => {
    // The loading indicator should not be visible after content loads
    const loading = page.locator("#loading");

    // Check loading is not visible
    await expect(loading).toBeHidden();
  });

  test("mobile viewport displays map correctly", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to timeline first, then to map
    await page.goto("/");
    await page.waitForSelector(".festival-card", { state: "visible", timeout: 10000 });
    await page.waitForTimeout(500);

    // Open hamburger menu (map link is hidden on mobile)
    const hamburgerMenu = page.locator("#hamburger-menu");
    await expect(hamburgerMenu).toBeVisible();
    await hamburgerMenu.click({ force: true });

    // Wait for mobile menu to actually open (active class added)
    const activeMobileMenu = page.locator("#mobile-menu.active");
    await expect(activeMobileMenu).toBeVisible();

    // Now click the map link inside the opened menu
    const mapLink = activeMobileMenu.locator(".view-link[href='/map']");
    await mapLink.click();
    await page.waitForFunction(
      () => {
        const mapView = document.getElementById("map-view");
        return mapView && window.getComputedStyle(mapView).display !== "none";
      },
      { timeout: 5000 },
    );
    await page.waitForSelector("#festival-map", { state: "visible", timeout: 10000 });
    await page.waitForSelector(".leaflet-container", { state: "visible", timeout: 10000 });
    await page.waitForTimeout(1500);

    // Check map is still visible
    const festivalMap = page.locator("#festival-map");
    await expect(festivalMap).toBeVisible();

    // Check Leaflet map initialized
    const leafletContainer = page.locator(".leaflet-container");
    await expect(leafletContainer).toBeVisible();

    // Check mobile menu works (already have hamburgerMenu variable from earlier)
    await expect(hamburgerMenu).toBeVisible();

    // Open mobile menu
    await hamburgerMenu.click();
    const mobileMenu = page.locator("#mobile-menu");
    await expect(mobileMenu).toBeVisible();
  });

  test("marker hover shows popup with festival name", async ({ page }) => {
    const firstMarker = page.locator(".custom-marker").first();

    // Hover over marker (force to bypass interception from overlapping markers)
    await firstMarker.hover({ force: true });

    // Wait for popup to appear
    await page.waitForTimeout(300);

    // Check for Leaflet popup
    const popup = page.locator(".leaflet-popup");
    await expect(popup).toBeVisible();

    // Popup should contain text (festival name)
    const popupContent = popup.locator(".leaflet-popup-content");
    const text = await popupContent.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("favorite button in modal updates marker visibility with filter", async ({ page }) => {
    // Open modal for first marker
    await page.locator(".custom-marker").first().click({ force: true });
    await page.waitForSelector("#festival-modal", { state: "visible" });

    const modal = page.locator("#festival-modal");

    // Add to favorites
    const starIcon = modal.locator(".star-icon").first();
    await starIcon.click();
    await page.waitForTimeout(300);

    // Verify it's favorited (has favorite class)
    await expect(starIcon).toHaveClass(/favorite/);

    // Close modal
    await modal.locator(".modal-close").click();
    await page.waitForTimeout(300);

    // Enable favorites filter
    const favoritesButton = page.locator(".filter-button").first();
    await favoritesButton.click();
    await page.waitForTimeout(500);

    // At least one marker should be visible (the one we favorited)
    const visibleMarkers = await page.locator(".custom-marker").count();
    expect(visibleMarkers).toBeGreaterThanOrEqual(1);

    // Disable filter and unfavorite
    await favoritesButton.click();
    await page.waitForTimeout(300);

    // Open modal again
    await page.locator(".custom-marker").first().click({ force: true });
    await page.waitForSelector("#festival-modal", { state: "visible" });

    // Unfavorite
    const starIcon2 = page.locator("#festival-modal .star-icon").first();
    await starIcon2.click();
    await page.waitForTimeout(300);
  });
});
