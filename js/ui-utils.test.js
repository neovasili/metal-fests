import { describe, it, expect, beforeEach, vi } from "vitest";

// UIUtils is loaded globally via vitest.setup.js

describe("UIUtils", () => {
  describe("createStarIcon", () => {
    it("should create a star icon element with empty star when not favorite", () => {
      const starIcon = UIUtils.createStarIcon(false);

      expect(starIcon.className).toBe("star-icon ");
      expect(starIcon.innerHTML).toBe("☆");
      expect(starIcon.getAttribute("role")).toBe("button");
      expect(starIcon.getAttribute("tabindex")).toBe("0");
      expect(starIcon.getAttribute("aria-label")).toBe("Add to favorites");
      expect(starIcon.title).toBe("Add to favorites");
    });

    it("should create a star icon element with filled star when favorite", () => {
      const starIcon = UIUtils.createStarIcon(true);

      expect(starIcon.className).toBe("star-icon favorite");
      expect(starIcon.innerHTML).toBe("★");
      expect(starIcon.getAttribute("aria-label")).toBe("Remove from favorites");
      expect(starIcon.title).toBe("Remove from favorites");
    });

    it("should create a star icon with default false when no parameter provided", () => {
      const starIcon = UIUtils.createStarIcon();

      expect(starIcon.className).toBe("star-icon ");
      expect(starIcon.innerHTML).toBe("☆");
    });
  });

  describe("updateStarIcon", () => {
    let starIcon;

    beforeEach(() => {
      starIcon = document.createElement("div");
      starIcon.className = "star-icon";
    });

    it("should update star icon to favorite state", () => {
      UIUtils.updateStarIcon(starIcon, true);

      expect(starIcon.classList.contains("favorite")).toBe(true);
      expect(starIcon.innerHTML).toBe("★");
      expect(starIcon.getAttribute("aria-label")).toBe("Remove from favorites");
      expect(starIcon.title).toBe("Remove from favorites");
    });

    it("should update star icon to non-favorite state", () => {
      starIcon.classList.add("favorite");
      starIcon.innerHTML = "★";

      UIUtils.updateStarIcon(starIcon, false);

      expect(starIcon.classList.contains("favorite")).toBe(false);
      expect(starIcon.innerHTML).toBe("☆");
      expect(starIcon.getAttribute("aria-label")).toBe("Add to favorites");
      expect(starIcon.title).toBe("Add to favorites");
    });
  });

  describe("showNotification", () => {
    beforeEach(() => {
      // Clean up any existing notifications
      const existing = document.querySelector(".notification");
      if (existing) {
        existing.remove();
      }
      vi.useFakeTimers();
    });

    it("should create a notification element with the correct message", () => {
      UIUtils.showNotification("Test message", "info");

      const notification = document.querySelector(".notification");
      expect(notification).not.toBeNull();
      expect(notification.textContent).toBe("Test message");
      expect(notification.className).toBe("notification notification-info");
    });

    it("should create a success notification when type is success", () => {
      UIUtils.showNotification("Success!", "success");

      const notification = document.querySelector(".notification");
      expect(notification.className).toBe("notification notification-success");
    });

    it("should create an error notification when type is error", () => {
      UIUtils.showNotification("Error!", "error");

      const notification = document.querySelector(".notification");
      expect(notification.className).toBe("notification notification-error");
    });

    it("should remove existing notification before creating a new one", () => {
      UIUtils.showNotification("First message");
      UIUtils.showNotification("Second message");

      const notifications = document.querySelectorAll(".notification");
      expect(notifications.length).toBe(1);
      expect(notifications[0].textContent).toBe("Second message");
    });

    it("should remove notification after timeout", () => {
      UIUtils.showNotification("Temporary message");

      let notification = document.querySelector(".notification");
      expect(notification).not.toBeNull();

      // Fast-forward time by 3 seconds
      vi.advanceTimersByTime(3000);

      // Check that opacity is set to 0
      notification = document.querySelector(".notification");
      expect(notification.style.opacity).toBe("0");

      // Fast-forward another 300ms for the fade-out animation
      vi.advanceTimersByTime(300);

      // Notification should be removed
      notification = document.querySelector(".notification");
      expect(notification).toBeNull();
    });
  });

  describe("createFilterButton", () => {
    it("should create an inactive filter button by default", () => {
      const container = UIUtils.createFilterButton();

      expect(container.className).toBe("filter-container");

      const button = container.querySelector(".filter-button");
      expect(button).not.toBeNull();
      expect(button.classList.contains("active")).toBe(false);
      expect(button.getAttribute("aria-label")).toBe("Show favorites only");
      expect(button.title).toBe("Show favorites only");
    });

    it("should create an active filter button when isActive is true", () => {
      const container = UIUtils.createFilterButton(true);

      const button = container.querySelector(".filter-button");
      expect(button.classList.contains("active")).toBe(true);
      expect(button.getAttribute("aria-label")).toBe("Show all festivals");
      expect(button.title).toBe("Show all festivals");
    });

    it("should contain filter icon and text", () => {
      const container = UIUtils.createFilterButton();
      const button = container.querySelector(".filter-button");

      const icon = button.querySelector(".filter-icon");
      const text = button.querySelector(".filter-text");

      expect(icon).not.toBeNull();
      expect(icon.textContent).toBe("★");
      expect(text).not.toBeNull();
      expect(text.textContent).toBe("Favorites");
    });
  });

  describe("createSearchFilter", () => {
    it("should create a search filter with empty initial value", () => {
      const container = UIUtils.createSearchFilter();

      expect(container.className).toContain("search-filter-container");

      const input = container.querySelector(".search-filter-input");
      expect(input).not.toBeNull();
      expect(input.value).toBe("");
      expect(input.placeholder).toBe("Search festivals...");
    });

    it("should create a search filter with provided initial value", () => {
      const container = UIUtils.createSearchFilter("Wacken");

      const input = container.querySelector(".search-filter-input");
      expect(input.value).toBe("Wacken");
    });

    it("should show clear button when initial value is provided", () => {
      const container = UIUtils.createSearchFilter("test");

      const clearButton = container.querySelector(".search-filter-clear");
      expect(clearButton).not.toBeNull();
      expect(clearButton.style.display).toBe("block");
    });

    it("should hide clear button when initial value is empty", () => {
      const container = UIUtils.createSearchFilter("");

      const clearButton = container.querySelector(".search-filter-clear");
      expect(clearButton).not.toBeNull();
      expect(clearButton.style.display).toBe("none");
    });

    it("should contain search icon", () => {
      const container = UIUtils.createSearchFilter();

      const icon = container.querySelector(".search-filter-icon");
      expect(icon).not.toBeNull();
      expect(icon.innerHTML).toBe("🔍");
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("addStarEventListeners", () => {
    let starIcon;
    let callback;

    beforeEach(() => {
      starIcon = UIUtils.createStarIcon();
      callback = vi.fn();
      UIUtils.addStarEventListeners(starIcon, callback);
    });

    it("should call callback when star icon is clicked", () => {
      starIcon.click();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should call callback when Enter key is pressed", () => {
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      starIcon.dispatchEvent(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should call callback when Space key is pressed", () => {
      const event = new KeyboardEvent("keydown", { key: " " });
      starIcon.dispatchEvent(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not call callback when other keys are pressed", () => {
      const event = new KeyboardEvent("keydown", { key: "a" });
      starIcon.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should apply hover effects on mouseenter", () => {
      const event = new MouseEvent("mouseenter");
      starIcon.dispatchEvent(event);
      expect(starIcon.style.transform).toBe("scale(1.2)");
    });

    it("should remove hover effects on mouseleave", () => {
      starIcon.style.transform = "scale(1.2)";
      const event = new MouseEvent("mouseleave");
      starIcon.dispatchEvent(event);
      expect(starIcon.style.transform).toBe("scale(1)");
    });
  });

  describe("updateFilterButton", () => {
    let container;

    beforeEach(() => {
      container = UIUtils.createFilterButton(false);
    });

    it("should update button to active state", () => {
      UIUtils.updateFilterButton(container, true);

      const button = container.querySelector(".filter-button");
      expect(button.classList.contains("active")).toBe(true);
      expect(button.getAttribute("aria-label")).toBe("Show all festivals");
      expect(button.title).toBe("Show all festivals");
    });

    it("should update button to inactive state", () => {
      container = UIUtils.createFilterButton(true);
      UIUtils.updateFilterButton(container, false);

      const button = container.querySelector(".filter-button");
      expect(button.classList.contains("active")).toBe(false);
      expect(button.getAttribute("aria-label")).toBe("Show favorites only");
      expect(button.title).toBe("Show favorites only");
    });

    it("should handle missing button element gracefully", () => {
      const emptyContainer = document.createElement("div");
      expect(() => UIUtils.updateFilterButton(emptyContainer, true)).not.toThrow();
    });
  });

  describe("addFilterButtonEventListeners", () => {
    let container;
    let callback;

    beforeEach(() => {
      container = UIUtils.createFilterButton(false);
      callback = vi.fn();
      UIUtils.addFilterButtonEventListeners(container, callback);
    });

    it("should call callback when button is clicked", () => {
      const button = container.querySelector(".filter-button");
      button.click();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should call callback when Enter key is pressed", () => {
      const button = container.querySelector(".filter-button");
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      button.dispatchEvent(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should call callback when Space key is pressed", () => {
      const button = container.querySelector(".filter-button");
      const event = new KeyboardEvent("keydown", { key: " " });
      button.dispatchEvent(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not call callback when other keys are pressed", () => {
      const button = container.querySelector(".filter-button");
      const event = new KeyboardEvent("keydown", { key: "a" });
      button.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle missing button element gracefully", () => {
      const emptyContainer = document.createElement("div");
      expect(() => UIUtils.addFilterButtonEventListeners(emptyContainer, callback)).not.toThrow();
    });
  });

  describe("createBandsFilter", () => {
    it("should create bands filter with empty selection", () => {
      const allBands = ["Metallica", "Iron Maiden", "Slayer"];
      const container = UIUtils.createBandsFilter(allBands, []);

      expect(container.className).toBe("filter-container");

      const toggleButton = container.querySelector(".bands-filter-toggle");
      expect(toggleButton).not.toBeNull();
      expect(toggleButton.getAttribute("aria-expanded")).toBe("false");

      const countSpan = toggleButton.querySelector(".bands-filter-count");
      expect(countSpan.textContent).toBe("");
    });

    it("should create bands filter with selected bands", () => {
      const allBands = ["Metallica", "Iron Maiden", "Slayer"];
      const selectedBands = ["Metallica", "Slayer"];
      const container = UIUtils.createBandsFilter(allBands, selectedBands);

      const toggleButton = container.querySelector(".bands-filter-toggle");
      const countSpan = toggleButton.querySelector(".bands-filter-count");
      expect(countSpan.textContent).toBe("2");
      expect(toggleButton.title).toContain("2 selected");
    });

    it("should contain all required elements", () => {
      const container = UIUtils.createBandsFilter(["Band1"], []);

      expect(container.querySelector(".bands-filter-toggle")).not.toBeNull();
      expect(container.querySelector(".bands-filter-dropdown")).not.toBeNull();
      expect(container.querySelector(".bands-filter-search")).not.toBeNull();
      expect(container.querySelector(".bands-filter-list")).not.toBeNull();
      expect(container.querySelector(".bands-filter-clear-all")).not.toBeNull();
    });

    it("should have dropdown hidden by default", () => {
      const container = UIUtils.createBandsFilter(["Band1"], []);
      const dropdown = container.querySelector(".bands-filter-dropdown");
      expect(dropdown.style.display).toBe("none");
    });
  });

  describe("updateBandsFilter", () => {
    let container;
    let allBands;

    beforeEach(() => {
      allBands = ["Metallica", "Iron Maiden", "Slayer", "Megadeth"];
      container = UIUtils.createBandsFilter(allBands, []);
    });

    it("should update toggle button with selected count", () => {
      const selectedBands = ["Metallica", "Slayer"];
      UIUtils.updateBandsFilter(container, allBands, selectedBands);

      const toggleButton = container.querySelector(".bands-filter-toggle");
      const countSpan = toggleButton.querySelector(".bands-filter-count");
      expect(countSpan.textContent).toBe("2");
      expect(toggleButton.title).toContain("2 selected");
    });

    it("should display selected bands in separate section", () => {
      const selectedBands = ["Metallica"];
      UIUtils.updateBandsFilter(container, allBands, selectedBands);

      const bandsList = container.querySelector(".bands-filter-list");
      const selectedSection = bandsList.querySelector(".bands-filter-selected-section");
      expect(selectedSection).not.toBeNull();

      const sectionHeader = selectedSection.querySelector(".bands-filter-section-header");
      expect(sectionHeader.textContent).toContain("Selected Bands");
      expect(sectionHeader.textContent).toContain("1");
    });

    it("should filter bands based on search input", () => {
      const searchInput = container.querySelector(".bands-filter-search");
      searchInput.value = "mega";

      UIUtils.updateBandsFilter(container, allBands, []);

      const bandsList = container.querySelector(".bands-filter-list");
      const items = bandsList.querySelectorAll(".bands-filter-item");

      // Should only show Megadeth
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain("Megadeth");
    });

    it("should show all unselected bands when search is empty", () => {
      const selectedBands = ["Metallica"];
      UIUtils.updateBandsFilter(container, allBands, selectedBands);

      const bandsList = container.querySelector(".bands-filter-list");
      const unselectedItems = Array.from(bandsList.querySelectorAll(".bands-filter-item:not(.selected)"));

      // Should show 3 unselected bands (all except Metallica)
      expect(unselectedItems.length).toBe(3);
    });

    it("should mark selected bands with checked checkbox", () => {
      const selectedBands = ["Iron Maiden"];
      UIUtils.updateBandsFilter(container, allBands, selectedBands);

      const bandsList = container.querySelector(".bands-filter-list");
      const selectedItems = bandsList.querySelectorAll(".bands-filter-item.selected");

      expect(selectedItems.length).toBe(1);
      const checkbox = selectedItems[0].querySelector("input[type='checkbox']");
      expect(checkbox.checked).toBe(true);
      expect(checkbox.value).toBe("Iron Maiden");
    });
  });

  describe("addBandsFilterEventListeners", () => {
    let container;
    let callbacks;

    beforeEach(() => {
      const allBands = ["Metallica", "Iron Maiden", "Slayer"];
      container = UIUtils.createBandsFilter(allBands, []);
      callbacks = {
        onDropdownOpen: vi.fn(),
        onClearAll: vi.fn(),
        onSearch: vi.fn(),
        onBandToggle: vi.fn(),
      };
      UIUtils.addBandsFilterEventListeners(container, callbacks);
    });

    it("should toggle dropdown on button click", () => {
      const toggleButton = container.querySelector(".bands-filter-toggle");
      const dropdown = container.querySelector(".bands-filter-dropdown");

      expect(dropdown.style.display).toBe("none");

      toggleButton.click();
      expect(dropdown.style.display).toBe("block");
      expect(toggleButton.getAttribute("aria-expanded")).toBe("true");

      toggleButton.click();
      expect(dropdown.style.display).toBe("none");
      expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
    });

    it("should call onDropdownOpen callback when opening dropdown", () => {
      const toggleButton = container.querySelector(".bands-filter-toggle");
      toggleButton.click();
      expect(callbacks.onDropdownOpen).toHaveBeenCalledTimes(1);
    });

    it("should call onClearAll callback when clear button is clicked", () => {
      const clearButton = container.querySelector(".bands-filter-clear-all");
      clearButton.click();
      expect(callbacks.onClearAll).toHaveBeenCalledTimes(1);
    });

    it("should call onSearch callback when search input changes", () => {
      const searchInput = container.querySelector(".bands-filter-search");
      searchInput.value = "metal";
      searchInput.dispatchEvent(new Event("input"));

      expect(callbacks.onSearch).toHaveBeenCalledTimes(1);
      expect(callbacks.onSearch).toHaveBeenCalledWith("metal");
    });

    it("should call onBandToggle callback when checkbox is changed", () => {
      const allBands = ["Metallica", "Iron Maiden"];
      UIUtils.updateBandsFilter(container, allBands, []);

      const bandsList = container.querySelector(".bands-filter-list");
      const checkbox = bandsList.querySelector("input[type='checkbox']");

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));

      expect(callbacks.onBandToggle).toHaveBeenCalledTimes(1);
      expect(callbacks.onBandToggle).toHaveBeenCalledWith(checkbox.value, true);
    });

    it("should close dropdown when clicking outside", () => {
      const toggleButton = container.querySelector(".bands-filter-toggle");
      const dropdown = container.querySelector(".bands-filter-dropdown");

      // Open dropdown
      toggleButton.click();
      expect(dropdown.style.display).toBe("block");

      // Click outside
      document.body.click();
      expect(dropdown.style.display).toBe("none");
      expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
    });

    it("should not close dropdown when clicking inside", () => {
      const toggleButton = container.querySelector(".bands-filter-toggle");
      const dropdown = container.querySelector(".bands-filter-dropdown");
      const searchInput = container.querySelector(".bands-filter-search");

      // Open dropdown
      toggleButton.click();
      expect(dropdown.style.display).toBe("block");

      // Click inside
      searchInput.click();
      expect(dropdown.style.display).toBe("block");
    });
  });

  describe("highlightSelectedBands", () => {
    let bandsList;

    beforeEach(() => {
      bandsList = document.createElement("div");

      // Create some band tags
      const band1 = document.createElement("span");
      band1.className = "band-tag";
      band1.textContent = "Metallica";

      const band2 = document.createElement("span");
      band2.className = "band-tag";
      band2.textContent = "Iron Maiden";

      const band3 = document.createElement("span");
      band3.className = "band-tag";
      band3.textContent = "Slayer";

      bandsList.appendChild(band1);
      bandsList.appendChild(band2);
      bandsList.appendChild(band3);
    });

    it("should highlight selected bands", () => {
      const selectedBands = ["Metallica", "Slayer"];
      UIUtils.highlightSelectedBands(bandsList, selectedBands);

      const tags = bandsList.querySelectorAll(".band-tag");
      expect(tags[0].classList.contains("highlighted")).toBe(true); // Metallica
      expect(tags[1].classList.contains("highlighted")).toBe(false); // Iron Maiden
      expect(tags[2].classList.contains("highlighted")).toBe(true); // Slayer
    });

    it("should remove highlight from unselected bands", () => {
      // First highlight all
      const tags = bandsList.querySelectorAll(".band-tag");
      tags.forEach((tag) => tag.classList.add("highlighted"));

      // Then update with only one selected
      UIUtils.highlightSelectedBands(bandsList, ["Iron Maiden"]);

      expect(tags[0].classList.contains("highlighted")).toBe(false); // Metallica
      expect(tags[1].classList.contains("highlighted")).toBe(true); // Iron Maiden
      expect(tags[2].classList.contains("highlighted")).toBe(false); // Slayer
    });

    it("should handle empty selected bands array", () => {
      UIUtils.highlightSelectedBands(bandsList, []);

      const tags = bandsList.querySelectorAll(".band-tag");
      tags.forEach((tag) => {
        expect(tag.classList.contains("highlighted")).toBe(false);
      });
    });
  });

  describe("addSearchFilterEventListeners", () => {
    let container;
    let callbacks;

    beforeEach(() => {
      container = UIUtils.createSearchFilter();
      callbacks = {
        onSearch: vi.fn(),
        onClear: vi.fn(),
      };
      vi.useFakeTimers();
      UIUtils.addSearchFilterEventListeners(container, callbacks);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should call onSearch callback after debounce delay", () => {
      const searchInput = container.querySelector(".search-filter-input");

      searchInput.value = "wacken";
      searchInput.dispatchEvent(new Event("input"));

      // Should not be called immediately
      expect(callbacks.onSearch).not.toHaveBeenCalled();

      // Fast-forward time by 500ms
      vi.advanceTimersByTime(500);

      expect(callbacks.onSearch).toHaveBeenCalledTimes(1);
      expect(callbacks.onSearch).toHaveBeenCalledWith("wacken");
    });

    it("should show clear button when input has value", () => {
      const searchInput = container.querySelector(".search-filter-input");
      const clearButton = container.querySelector(".search-filter-clear");

      expect(clearButton.style.display).toBe("none");

      searchInput.value = "test";
      searchInput.dispatchEvent(new Event("input"));

      expect(clearButton.style.display).toBe("block");
    });

    it("should hide clear button when input is empty", () => {
      const searchInput = container.querySelector(".search-filter-input");
      const clearButton = container.querySelector(".search-filter-clear");

      // Set value first
      searchInput.value = "test";
      searchInput.dispatchEvent(new Event("input"));
      expect(clearButton.style.display).toBe("block");

      // Clear value
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input"));
      expect(clearButton.style.display).toBe("none");
    });

    it("should debounce rapid input changes", () => {
      const searchInput = container.querySelector(".search-filter-input");

      searchInput.value = "a";
      searchInput.dispatchEvent(new Event("input"));
      vi.advanceTimersByTime(100);

      searchInput.value = "ab";
      searchInput.dispatchEvent(new Event("input"));
      vi.advanceTimersByTime(100);

      searchInput.value = "abc";
      searchInput.dispatchEvent(new Event("input"));

      // Should not have been called yet
      expect(callbacks.onSearch).not.toHaveBeenCalled();

      // Fast-forward to complete the debounce
      vi.advanceTimersByTime(500);

      // Should only be called once with the latest value
      expect(callbacks.onSearch).toHaveBeenCalledTimes(1);
      expect(callbacks.onSearch).toHaveBeenCalledWith("abc");
    });

    it("should clear input and call onClear when clear button is clicked", () => {
      const searchInput = container.querySelector(".search-filter-input");
      const clearButton = container.querySelector(".search-filter-clear");

      searchInput.value = "test";
      clearButton.style.display = "block";

      clearButton.click();

      expect(searchInput.value).toBe("");
      expect(clearButton.style.display).toBe("none");
      expect(callbacks.onClear).toHaveBeenCalledTimes(1);
    });

    it("should focus input after clearing", () => {
      const searchInput = container.querySelector(".search-filter-input");
      const clearButton = container.querySelector(".search-filter-clear");

      const focusSpy = vi.spyOn(searchInput, "focus");

      searchInput.value = "test";
      clearButton.click();

      expect(focusSpy).toHaveBeenCalled();
    });

    it("should trigger search immediately on Enter key", () => {
      const searchInput = container.querySelector(".search-filter-input");

      searchInput.value = "enter test";
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      searchInput.dispatchEvent(event);

      // Should be called immediately without waiting for debounce
      expect(callbacks.onSearch).toHaveBeenCalledTimes(1);
      expect(callbacks.onSearch).toHaveBeenCalledWith("enter test");
    });

    it("should clear pending debounce timeout on Enter key", () => {
      const searchInput = container.querySelector(".search-filter-input");

      // Start typing
      searchInput.value = "test";
      searchInput.dispatchEvent(new Event("input"));

      // Press Enter before debounce completes
      vi.advanceTimersByTime(200);
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      searchInput.dispatchEvent(event);

      // Should be called once immediately
      expect(callbacks.onSearch).toHaveBeenCalledTimes(1);

      // Complete the debounce timeout
      vi.advanceTimersByTime(500);

      // Should still only be called once
      expect(callbacks.onSearch).toHaveBeenCalledTimes(1);
    });
  });
});
