// Unit tests for Notification
// Notification is loaded globally via vitest.setup.js

describe("Notification", () => {
  let notification;
  let mockToast;
  let mockMessage;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="toast" class="toast">
        <div id="toastMessage"></div>
      </div>
    `;

    mockToast = document.getElementById("toast");
    mockMessage = document.getElementById("toastMessage");

    // Use fake timers
    vi.useFakeTimers();

    notification = new Notification();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should find toast elements", () => {
      expect(notification.toast).toBe(mockToast);
      expect(notification.message).toBe(mockMessage);
    });

    it("should set default duration", () => {
      expect(notification.duration).toBe(3000);
    });

    it("should handle missing elements gracefully", () => {
      document.body.innerHTML = "";
      const notif = new Notification();
      expect(notif.toast).toBeNull();
      expect(notif.message).toBeNull();
    });
  });

  describe("show", () => {
    it("should display success notification", () => {
      notification.show("Success message", "success");

      expect(mockMessage.textContent).toBe("Success message");
      expect(mockToast.classList.contains("show")).toBe(true);
      expect(mockToast.classList.contains("error")).toBe(false);
    });

    it("should display error notification", () => {
      notification.show("Error message", "error");

      expect(mockMessage.textContent).toBe("Error message");
      expect(mockToast.classList.contains("show")).toBe(true);
      expect(mockToast.classList.contains("error")).toBe(true);
    });

    it("should default to success type", () => {
      notification.show("Default message");

      expect(mockToast.classList.contains("error")).toBe(false);
    });

    it("should auto-hide after default duration", () => {
      notification.show("Test message");

      expect(mockToast.classList.contains("show")).toBe(true);

      vi.advanceTimersByTime(3000);

      expect(mockToast.classList.contains("show")).toBe(false);
    });

    it("should use custom duration", () => {
      notification.show("Test message", "success", 5000);

      vi.advanceTimersByTime(3000);
      expect(mockToast.classList.contains("show")).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(mockToast.classList.contains("show")).toBe(false);
    });

    it("should clear existing timeout before showing new notification", () => {
      notification.show("First message");
      vi.advanceTimersByTime(1000);

      notification.show("Second message");

      expect(mockMessage.textContent).toBe("Second message");
      expect(mockToast.classList.contains("show")).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(mockToast.classList.contains("show")).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(mockToast.classList.contains("show")).toBe(false);
    });

    it("should handle missing toast element gracefully", () => {
      notification.toast = null;
      expect(() => notification.show("Test")).not.toThrow();
    });

    it("should handle missing message element gracefully", () => {
      notification.message = null;
      expect(() => notification.show("Test")).not.toThrow();
    });
  });

  describe("hide", () => {
    it("should hide the notification", () => {
      notification.show("Test message");
      expect(mockToast.classList.contains("show")).toBe(true);

      notification.hide();
      expect(mockToast.classList.contains("show")).toBe(false);
    });

    it("should handle missing toast element gracefully", () => {
      notification.toast = null;
      expect(() => notification.hide()).not.toThrow();
    });
  });

  describe("global window export", () => {
    it("should export notification to window", () => {
      expect(window.notification).toBeDefined();
      expect(window.notification).toBeInstanceOf(Notification);
    });

    it("should export notificationManager alias", () => {
      expect(window.notificationManager).toBeDefined();
      expect(window.notificationManager).toBe(window.notification);
    });
  });
});
