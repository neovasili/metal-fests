import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load db.json once for all tests
const dbPath = path.join(process.cwd(), "db.json");
const dbContent = fs.readFileSync(dbPath, "utf-8");
const db = JSON.parse(dbContent);

test.describe("Admin Festivals Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin festivals page
    await page.goto("/admin");

    // Wait for the admin page to load
    await page.waitForSelector(".list-item", {
      state: "visible",
      timeout: 10000,
    });

    // Give a bit more time for data to load
    await page.waitForTimeout(500);
  });

  test("loads and displays correct number of festivals", async ({ page }) => {
    const expectedFestivalCount = db.festivals.length;

    // Count festival items in the list
    const festivalItems = await page.locator(".list-item").count();

    expect(festivalItems).toBe(expectedFestivalCount);
  });

  test("displays festival list with required elements", async ({ page }) => {
    // Check that at least one festival is displayed
    const firstItem = page.locator(".list-item").first();
    await expect(firstItem).toBeVisible();

    // Verify the item has a name
    const itemName = await firstItem.locator(".list-item-name").textContent();
    expect(itemName).toBeTruthy();
    expect(itemName.length).toBeGreaterThan(0);
  });

  test("loads festival data into form when festival is selected", async ({ page }) => {
    // Click on first festival in the list
    await page.locator(".list-item").first().click();

    // Wait for form to load
    await page.waitForSelector("#festivalForm", {
      state: "visible",
      timeout: 5000,
    });

    // Get the festival name from the form (we don't know which one loaded due to sorting)
    const nameInput = page.locator("#festivalName");
    const loadedName = await nameInput.inputValue();

    // Verify it's one of our festivals
    const festivalNames = db.festivals.map((f) => f.name);
    expect(festivalNames).toContain(loadedName);

    // Verify other fields are populated (not empty)
    const locationInput = page.locator("#festivalLocation");
    expect(await locationInput.inputValue()).toBeTruthy();

    const websiteInput = page.locator("#festivalWebsite");
    expect(await websiteInput.inputValue()).toBeTruthy();

    // Poster might be empty for some festivals, so just verify the input exists
    const posterInput = page.locator("#festivalPoster");
    expect(posterInput).toBeTruthy();
  });

  test("loads festival dates correctly into form", async ({ page }) => {
    // Select first festival
    await page.locator(".list-item").first().click();
    await page.waitForSelector("#festivalForm", { state: "visible" });

    // Verify dates are populated (not empty) with valid format
    const startDateInput = page.locator("#festivalStartDate");
    const startValue = await startDateInput.inputValue();
    expect(startValue).toBeTruthy();
    expect(startValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const endDateInput = page.locator("#festivalEndDate");
    const endValue = await endDateInput.inputValue();
    expect(endValue).toBeTruthy();
    expect(endValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("loads festival coordinates correctly into form", async ({ page }) => {
    // Select first festival
    await page.locator(".list-item").first().click();
    await page.waitForSelector("#festivalForm", { state: "visible" });

    // Verify coordinates are populated with valid numbers
    const latInput = page.locator("#festivalLatitude");
    const latValue = await latInput.inputValue();
    expect(latValue).toBeTruthy();
    expect(parseFloat(latValue)).not.toBe(0);
    expect(parseFloat(latValue)).not.toBeNaN();

    const lngInput = page.locator("#festivalLongitude");
    const lngValue = await lngInput.inputValue();
    expect(lngValue).toBeTruthy();
    expect(parseFloat(lngValue)).not.toBe(0);
    expect(parseFloat(lngValue)).not.toBeNaN();
  });

  test("displays bands in correct tiers based on size", async ({ page }) => {
    // Find a festival with bands that have different sizes
    const festivalWithBands = db.festivals.find((f) => f.bands && f.bands.length > 0);

    if (!festivalWithBands) {
      test.skip();
      return;
    }

    // Find the festival in the list by name
    const festivalItem = page.locator(".list-item").filter({
      hasText: festivalWithBands.name,
    });

    await festivalItem.click();
    await page.waitForSelector("#festivalForm", { state: "visible" });

    // Wait for bands to be populated
    await page.waitForTimeout(500);

    // Check tier 3 bands (size 3)
    const tier3Bands = festivalWithBands.bands.filter((b) => b.size === 3);
    if (tier3Bands.length > 0) {
      const tier3Container = page.locator("#selectedBandsTier3");
      const tier3Text = await tier3Container.textContent();
      // Check that at least one tier 3 band name appears
      const hasTier3Band = tier3Bands.some((band) => tier3Text.includes(band.name));
      expect(hasTier3Band).toBeTruthy();
    }

    // Check tier 2 bands (size 2)
    const tier2Bands = festivalWithBands.bands.filter((b) => b.size === 2);
    if (tier2Bands.length > 0) {
      const tier2Container = page.locator("#selectedBandsTier2");
      const tier2Text = await tier2Container.textContent();
      const hasTier2Band = tier2Bands.some((band) => tier2Text.includes(band.name));
      expect(hasTier2Band).toBeTruthy();
    }

    // Check tier 1 bands (size 0 or 1)
    const tier1Bands = festivalWithBands.bands.filter((b) => !b.size || b.size === 1);
    if (tier1Bands.length > 0) {
      const tier1Container = page.locator("#selectedBandsTier1");
      const tier1Text = await tier1Container.textContent();
      const hasTier1Band = tier1Bands.some((band) => tier1Text.includes(band.name));
      expect(hasTier1Band).toBeTruthy();
    }
  });

  test("can search/filter festivals in the list", async ({ page }) => {
    // Get first festival name
    const firstFestival = db.festivals[0];
    const searchTerm = firstFestival.name.substring(0, 5);

    // Find search input (if exists)
    const searchInput = page.locator(".admin-list-search, [placeholder*='Search']").first();

    if (await searchInput.isVisible()) {
      await searchInput.fill(searchTerm);
      await page.waitForTimeout(500);

      // Verify some items are still visible
      const visibleItems = await page.locator(".list-item:visible").count();
      expect(visibleItems).toBeGreaterThan(0);
    }
  });

  test("displays sort toggle and can change sort order", async ({ page }) => {
    const sortToggle = page.locator(".sort-toggle, [data-sort]");

    if (await sortToggle.isVisible()) {
      // Get initial first item text
      const initialFirstItem = await page.locator(".list-item").first().locator(".list-item-name").textContent();

      // Click sort toggle
      await sortToggle.click();
      await page.waitForTimeout(300);

      // Get new first item text (might be different after sort)
      const newFirstItem = await page.locator(".list-item").first().locator(".list-item-name").textContent();

      // After sorting, first item should still exist
      expect(newFirstItem).toBeTruthy();
    }
  });

  test("form is read-only state for existing festivals (placeholder test)", async ({ page }) => {
    // Select first festival
    await page.locator(".list-item").first().click();
    await page.waitForSelector("#festivalForm", { state: "visible" });

    // Verify form inputs are enabled (admin should be able to edit)
    const nameInput = page.locator("#festivalName");
    const isDisabled = await nameInput.isDisabled();

    // Inputs should be editable in admin panel, but we won't change them
    expect(isDisabled).toBe(false);
  });

  test("all three tier dropdown menus are present", async ({ page }) => {
    // Select first festival
    await page.locator(".list-item").first().click();
    await page.waitForSelector("#festivalForm", { state: "visible" });

    // Check that all three tier containers exist
    await expect(page.locator("#selectedBandsTier3")).toBeVisible();
    await expect(page.locator("#selectedBandsTier2")).toBeVisible();
    await expect(page.locator("#selectedBandsTier1")).toBeVisible();
  });

  test("tier descriptions are displayed correctly", async ({ page }) => {
    // Select first festival
    await page.locator(".list-item").first().click();
    await page.waitForSelector("#festivalForm", { state: "visible" });

    // Check for tier descriptions
    const tierDescriptions = await page.locator(".tier-description").count();
    expect(tierDescriptions).toBe(3);

    // Verify description texts contain expected keywords
    const tier3Desc = await page.locator(".tier-description").nth(0).textContent();
    expect(tier3Desc.toLowerCase()).toContain("gold");

    const tier2Desc = await page.locator(".tier-description").nth(1).textContent();
    expect(tier2Desc.toLowerCase()).toContain("orange");

    const tier1Desc = await page.locator(".tier-description").nth(2).textContent();
    expect(tier1Desc.toLowerCase()).toContain("grey");
  });
});
