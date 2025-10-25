// Notification System - Toast notifications for user feedback

class Notification {
  constructor() {
    this.toast = document.getElementById("toast");
    this.message = document.getElementById("toastMessage");
    this.timeout = null;
    this.duration = 3000; // 3 seconds
  }

  /**
   * Show a notification
   * @param {string} message - The message to display
   * @param {string} type - 'success' or 'error'
   * @param {number} duration - Duration in milliseconds (optional, defaults to 3000)
   */
  show(message, type = "success", duration) {
    if (!this.toast || !this.message) return;

    // Clear existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Update message
    this.message.textContent = message;

    // Update type
    this.toast.classList.remove("error");
    if (type === "error") {
      this.toast.classList.add("error");
    }

    // Show toast
    this.toast.classList.add("show");

    // Use custom duration or default
    const displayDuration = duration !== undefined ? duration : this.duration;

    // Auto-hide after duration
    this.timeout = setTimeout(() => {
      this.hide();
    }, displayDuration);
  }

  /**
   * Hide the notification
   */
  hide() {
    if (this.toast) {
      this.toast.classList.remove("show");
    }
  }
}

// Initialize and export
if (typeof window !== "undefined") {
  window.notification = new Notification();
  // Create alias for consistency with code that uses notificationManager
  window.notificationManager = window.notification;
}
