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
  });
});
