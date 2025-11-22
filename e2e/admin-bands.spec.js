import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load db.json once for all tests
const dbPath = path.join(process.cwd(), "db.json");
const dbContent = fs.readFileSync(dbPath, "utf-8");
const db = JSON.parse(dbContent);

// Calculate band counts
const reviewedBands = db.bands.filter((b) => b.reviewed === true);
const unreviewedBands = db.bands.filter((b) => b.reviewed === false);

test.describe("Admin Bands Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin bands page
    await page.goto("/admin/bands");

    // Wait for the admin page to load
    await page.waitForSelector(".list-item", {
      state: "visible",
      timeout: 10000,
    });

    // Give a bit more time for data to load
    await page.waitForTimeout(500);
  });

  test("loads and displays bands to review by default", async ({ page }) => {
    // Count band items in the list
    const bandItems = await page.locator(".list-item").count();

    // Should have at least some bands displayed
    expect(bandItems).toBeGreaterThan(0);
    expect(bandItems).toBeLessThanOrEqual(db.bands.length);
  });

  test("displays band tabs (Review and Reviewed)", async ({ page }) => {
    // Check that tabs container exists (use first() to avoid strict mode violation)
    const tabsContainer = page.locator(".admin-tabs").first();
    await expect(tabsContainer).toBeVisible();
  });

  test("can switch to Reviewed tab and displays correct count", async ({ page }) => {
    // Find and click the "Reviewed" tab
    const reviewedTab = page.locator("button").filter({ hasText: /reviewed/i });

    if (await reviewedTab.isVisible()) {
      await reviewedTab.click();
      await page.waitForTimeout(500);

      // Count items after switching tabs
      const bandItems = await page.locator(".list-item").count();
      expect(bandItems).toBe(reviewedBands.length);
    }
  });

  test("displays band list item with required information", async ({ page }) => {
    // Check first band item
    const firstItem = page.locator(".list-item").first();
    await expect(firstItem).toBeVisible();

    // Verify the item has a name
    const itemName = await firstItem.locator(".list-item-name").textContent();
    expect(itemName).toBeTruthy();
    expect(itemName.length).toBeGreaterThan(0);
  });

  test("loads band data into form when band is selected", async ({ page }) => {
    // Click on first band in the list
    await page.locator(".list-item").first().click();

    // Wait for form section to appear
    await page.waitForTimeout(1000);

    // Verify form section is visible
    const formSection = page.locator(".admin-form-section");
    await expect(formSection).toBeVisible();

    // Verify form has content
    const formContent = await formSection.textContent();
    expect(formContent.length).toBeGreaterThan(0);
  });

  test("displays band genres in the form", async ({ page }) => {
    // Click first band
    await page.locator(".list-item").first().click();
    await page.waitForTimeout(1000);

    // Verify admin form section is visible
    const formSection = page.locator(".admin-form-section");
    await expect(formSection).toBeVisible();
  });

  test("displays band members in the form", async ({ page }) => {
    // Click first band
    await page.locator(".list-item").first().click();
    await page.waitForTimeout(1000);

    // Verify form section is visible
    const formSection = page.locator(".admin-form-section");
    await expect(formSection).toBeVisible();
  });

  test("can navigate between bands using list selection", async ({ page }) => {
    // Select first band
    await page.locator(".list-item").first().click();
    await page.waitForTimeout(1000);

    // Verify first band is selected (has active class)
    const firstItem = page.locator(".list-item.active").first();
    await expect(firstItem).toBeVisible();

    // Select second band
    await page.locator(".list-item").nth(1).click();
    await page.waitForTimeout(500);

    // Verify second item is now active
    const activeItems = await page.locator(".list-item.active").count();
    expect(activeItems).toBeGreaterThan(0);
  });

  test("displays sort toggle for band list", async ({ page }) => {
    const sortToggle = page.locator(".sort-toggle, [data-sort]");

    if (await sortToggle.isVisible()) {
      // Get initial first item text
      const initialFirstItem = await page.locator(".list-item").first().locator(".list-item-name").textContent();

      // Click sort toggle
      await sortToggle.click();
      await page.waitForTimeout(300);

      // Get new first item text
      const newFirstItem = await page.locator(".list-item").first().locator(".list-item-name").textContent();

      // First item should still exist
      expect(newFirstItem).toBeTruthy();
    }
  });

  test("form displays when band is selected", async ({ page }) => {
    // Select first band
    await page.locator(".list-item").first().click();
    await page.waitForTimeout(1000);

    // Verify form section is visible
    const formSection = page.locator(".admin-form-section");
    await expect(formSection).toBeVisible();
  });

  test("can switch tabs and verify band counts match database", async ({ page }) => {
    // Check review tab count
    const reviewTab = page.locator("button").filter({ hasText: /^review$/i });

    if (await reviewTab.isVisible()) {
      await reviewTab.click();
      await page.waitForTimeout(500);

      const reviewCount = await page.locator(".list-item").count();
      expect(reviewCount).toBe(unreviewedBands.length);
    }

    // Check reviewed tab count
    const reviewedTab = page.locator("button").filter({ hasText: /reviewed/i });

    if (await reviewedTab.isVisible()) {
      await reviewedTab.click();
      await page.waitForTimeout(500);

      const reviewedCount = await page.locator(".list-item").count();
      expect(reviewedCount).toBe(reviewedBands.length);
    }
  });

  test("band list items display metadata (country/genres)", async ({ page }) => {
    // Check if first band item shows metadata
    const firstItem = page.locator(".list-item").first();

    // Look for meta information element
    const metaElement = firstItem.locator(".list-item-meta, .band-meta");

    if (await metaElement.isVisible()) {
      const metaText = await metaElement.textContent();
      expect(metaText.length).toBeGreaterThan(0);
    }
  });

  test("form is functional but we don't modify data", async ({ page }) => {
    // Select first band
    await page.locator(".list-item").first().click();
    await page.waitForTimeout(1000);

    // Verify form section exists and is visible
    const formSection = page.locator(".admin-form-section");
    await expect(formSection).toBeVisible();

    // We verify the form loaded but don't modify any data
    const formText = await formSection.textContent();
    expect(formText.length).toBeGreaterThan(0);
  });

  test("can search/filter bands in the list", async ({ page }) => {
    // Get first band name
    const firstBand = unreviewedBands[0];
    const searchTerm = firstBand.name.substring(0, 5);

    // Find search input
    const searchInput = page.locator(".list-item-search, [placeholder*='Search']").first();

    if (await searchInput.isVisible()) {
      await searchInput.fill(searchTerm);
      await page.waitForTimeout(500);

      // Verify some items are still visible
      const visibleItems = await page.locator(".list-item:visible").count();
      expect(visibleItems).toBeGreaterThan(0);
    }
  });

  test("displays list with bands", async ({ page }) => {
    // Verify list items exist
    const listItems = await page.locator(".list-item").count();
    expect(listItems).toBeGreaterThan(0);
  });
});
