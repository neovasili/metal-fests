import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load db.json once for all tests
const dbPath = path.join(process.cwd(), "db.json");
const dbContent = fs.readFileSync(dbPath, "utf-8");
const db = JSON.parse(dbContent);

test.describe("Timeline Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to timeline page before each test
    await page.goto("/");

    // Wait for the timeline to be fully loaded
    await page.waitForSelector(".festival-card", {
      state: "visible",
      timeout: 10000,
    });

    // Give a bit more time for all cards to render
    await page.waitForTimeout(500);
  });

  test("displays correct number of festivals from db.json", async ({ page }) => {
    const expectedFestivalCount = db.festivals.length;
    const festivalCards = await page.locator(".festival-card").count();

    expect(festivalCards).toBe(expectedFestivalCount);
  });

  test("displays festival card with all required information", async ({ page }) => {
    const firstCard = page.locator(".festival-card").first();

    // Check that essential elements are present
    await expect(firstCard.locator(".festival-poster")).toBeVisible();
    await expect(firstCard.locator(".festival-name")).toBeVisible();
    await expect(firstCard.locator(".festival-dates")).toBeVisible();
    await expect(firstCard.locator(".festival-location")).toBeVisible();
    await expect(firstCard.locator(".ticket-price")).toBeVisible();
    await expect(firstCard.locator(".festival-bands")).toBeVisible();
    await expect(firstCard.locator(".festival-website")).toBeVisible();
    await expect(firstCard.locator(".favorite-container")).toBeVisible();
  });

  test("festival cards display correct data from db.json", async ({ page }) => {
    // Festivals are sorted by date, so find the one with earliest start date
    const sortedFestivals = [...db.festivals].sort((a, b) => {
      return new Date(a.dates.start) - new Date(b.dates.start);
    });
    const firstFestival = sortedFestivals[0];
    const firstCard = page.locator(".festival-card").first();

    // Check festival name
    const festivalName = await firstCard.locator(".festival-name").textContent();
    expect(festivalName).toContain(firstFestival.name);

    // Check location
    const location = await firstCard.locator(".festival-location").textContent();
    expect(location).toBe(firstFestival.location);

    // Check website link
    const websiteLink = await firstCard.locator(".festival-website").getAttribute("href");
    expect(websiteLink).toBe(firstFestival.website);
  });

  test("festival website links open in new tab", async ({ page }) => {
    const firstCard = page.locator(".festival-card").first();
    const websiteLink = firstCard.locator(".festival-website");

    // Check link has correct attributes for opening in new tab
    await expect(websiteLink).toHaveAttribute("target", "_blank");
    await expect(websiteLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("favorite button is present and interactive", async ({ page }) => {
    const firstCard = page.locator(".festival-card").first();
    const favoriteButton = firstCard.locator(".star-icon").first();

    // Check favorite button is visible
    await expect(favoriteButton).toBeVisible();

    // Click the favorite button
    await favoriteButton.click();

    // Wait a bit for the state to update
    await page.waitForTimeout(300);

    // Check that the button has the favorite class
    await expect(favoriteButton).toHaveClass(/favorite/);

    // Click again to unfavorite
    await favoriteButton.click();
    await page.waitForTimeout(300);

    // Check that the favorite class is removed
    const classAttr = await favoriteButton.getAttribute("class");
    expect(classAttr).not.toContain("favorite");
  });

  test("search filter is present and functional", async ({ page }) => {
    const searchInput = page.locator(".search-filter-input").first();

    // Check search input is visible
    await expect(searchInput).toBeVisible();

    // Type in search input
    await searchInput.fill("Sweden");

    // Wait for debounce
    await page.waitForTimeout(600);

    // Check that filtered results are displayed
    const visibleCards = await page.locator(".festival-card:visible").count();
    expect(visibleCards).toBeGreaterThan(0);

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(600);

    // All festivals should be visible again
    const allCards = await page.locator(".festival-card:visible").count();
    expect(allCards).toBe(db.festivals.length);
  });

  test("favorites filter button is present", async ({ page }) => {
    const favoritesFilter = page.locator(".filter-button").first();

    // Check favorites filter button is visible
    await expect(favoritesFilter).toBeVisible();
  });

  test("bands filter is present", async ({ page }) => {
    const bandsFilter = page.locator(".bands-filter-toggle").first();

    // Check bands filter is visible
    await expect(bandsFilter).toBeVisible();
  });

  test("view toggle shows active timeline link", async ({ page }) => {
    const timelineLink = page.locator(".view-link[href='/']").first();

    // Check timeline link has active class
    await expect(timelineLink).toHaveClass(/active/);
  });

  test("timeline line is present in DOM", async ({ page }) => {
    const timelineLine = page.locator(".timeline-line");

    // Check timeline line is attached to DOM
    await expect(timelineLine).toBeAttached();
  });

  test("header contains title and navigation", async ({ page }) => {
    const header = page.locator("header.header");
    const title = header.locator("h1 a");

    // Check header is visible
    await expect(header).toBeVisible();

    // Check title is correct
    await expect(title).toHaveText("Metal Festivals 2026");

    // Check title links to home
    await expect(title).toHaveAttribute("href", "/");
  });

  test("footer is present with correct content", async ({ page }) => {
    const footer = page.locator("footer");

    // Check footer is visible
    await expect(footer).toBeVisible();

    // Check footer contains GitHub link
    const githubLink = footer.locator("a.github-link");
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute("href", "https://github.com/neovasili/metal-fests");
  });

  test("band tags are clickable and open band modal", async ({ page }) => {
    // Find first band tag in any festival card
    const firstBandTag = page.locator(".band-tag").first();

    // Click the band tag
    await firstBandTag.click();

    // Wait for modal to appear
    await page.waitForSelector(".band-modal-overlay", {
      state: "visible",
      timeout: 5000,
    });

    // Check modal is visible
    const modal = page.locator(".band-modal-overlay");
    await expect(modal).toBeVisible();

    // Check modal has content
    const modalContent = modal.locator(".band-modal-content");
    await expect(modalContent).toBeVisible();

    // Close modal by clicking close button
    const closeButton = modal.locator(".band-modal-close");
    await closeButton.click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible();
  });

  test("loading indicator disappears after content loads", async ({ page }) => {
    // The loading indicator should not be visible after content loads
    const loading = page.locator("#loading");

    // Check loading is not visible (or has display: none)
    await expect(loading).toBeHidden();
  });

  test("page is responsive and mobile menu works", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload to apply viewport
    await page.reload();
    await page.waitForSelector(".festival-card", { state: "visible" });

    // Check hamburger menu is visible on mobile
    const hamburgerMenu = page.locator("#hamburger-menu");
    await expect(hamburgerMenu).toBeVisible();

    // Click hamburger to open mobile menu
    await hamburgerMenu.click();

    // Check mobile menu is visible
    const mobileMenu = page.locator("#mobile-menu");
    await expect(mobileMenu).toBeVisible();

    // Click again to close
    await hamburgerMenu.click();
    await page.waitForTimeout(300);

    // Mobile menu should be hidden
    await expect(mobileMenu).not.toBeVisible();
  });
});
