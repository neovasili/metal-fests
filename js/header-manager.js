// Header Manager - Handles hamburger menu and scroll behavior
class HeaderManager {
  constructor() {
    this.header = document.querySelector(".header");
    this.hamburgerMenu = document.getElementById("hamburger-menu");
    this.mobileMenu = document.getElementById("mobile-menu");
    this.lastScrollY = window.scrollY;
    this.init();
  }

  init() {
    if (this.hamburgerMenu && this.mobileMenu) {
      this.setupHamburgerMenu();
    }
    this.setupScrollBehavior();
    this.setupMobileMenuLinks();
  }

  setupHamburgerMenu() {
    this.hamburgerMenu.addEventListener("click", () => {
      this.toggleMobileMenu();
    });

    // Close menu when clicking outside
    document.addEventListener("click", (event) => {
      if (!this.header.contains(event.target) && this.mobileMenu.classList.contains("active")) {
        this.closeMobileMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.mobileMenu.classList.contains("active")) {
        this.closeMobileMenu();
      }
    });
  }

  setupScrollBehavior() {
    let ticking = false;

    const updateHeader = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
        // Scrolling down
        this.header.classList.add("hidden");
        this.closeMobileMenu();
      } else {
        // Scrolling up
        this.header.classList.remove("hidden");
      }

      this.lastScrollY = currentScrollY;
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    });
  }

  setupMobileMenuLinks() {
    // Close menu when navigation links are clicked
    const navLinks = this.mobileMenu.querySelectorAll(".view-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        this.closeMobileMenu();
      });
    });
  }

  toggleMobileMenu() {
    const isActive = this.mobileMenu.classList.contains("active");

    if (isActive) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  openMobileMenu() {
    this.mobileMenu.classList.add("active");
    this.hamburgerMenu.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent scroll when menu is open
  }

  closeMobileMenu() {
    this.mobileMenu.classList.remove("active");
    this.hamburgerMenu.classList.remove("active");
    document.body.style.overflow = ""; // Restore scroll
  }
}

// Initialize header manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new HeaderManager();
});
