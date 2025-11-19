// Multiselect Dropdown Component - Reusable dropdown with search functionality

class MultiselectDropdown {
  constructor(options) {
    this.allItems = options.allItems || [];
    this.selectedItems = options.selectedItems || [];
    this.placeholder = options.placeholder || "Search...";
    this.icon = options.icon || "🔍";
    this.label = options.label || "Select Items";
    this.onToggle = options.onToggle || (() => {});
    this.onSearch = options.onSearch || (() => {});
    this.container = null;
    this.dropdown = null;
    this.isOpen = false;
  }

  /**
   * Create and return the dropdown element
   */
  create() {
    const container = document.createElement("div");
    container.className = "multiselect-dropdown-container";

    // Create toggle button
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "multiselect-toggle";
    toggleButton.innerHTML = `
      <span class="multiselect-icon">${this.icon}</span>
      <span class="multiselect-label">${this.label}</span>
      <span class="multiselect-arrow">▼</span>
    `;

    // Create dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "multiselect-dropdown";
    dropdown.style.display = "none";

    // Create search input
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "multiselect-search";
    searchInput.placeholder = this.placeholder;
    dropdown.appendChild(searchInput);

    // Create items list
    const itemsList = document.createElement("div");
    itemsList.className = "multiselect-list";
    dropdown.appendChild(itemsList);

    container.appendChild(toggleButton);
    container.appendChild(dropdown);

    this.container = container;
    this.dropdown = dropdown;
    this.toggleButton = toggleButton;
    this.searchInput = searchInput;
    this.itemsList = itemsList;

    this.attachEventListeners();
    this.render();

    return container;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Toggle dropdown
    this.toggleButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    // Search input
    this.searchInput.addEventListener("input", (e) => {
      this.onSearch(e.target.value);
      this.render();
    });

    // Item selection
    this.itemsList.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        const item = e.target.value;
        const isSelected = e.target.checked;
        this.onToggle(item, isSelected);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (this.container && !this.container.contains(e.target)) {
        this.close();
      }
    });

    // Prevent dropdown from closing when clicking inside
    this.dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Toggle dropdown open/close
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open dropdown
   */
  open() {
    this.dropdown.style.display = "block";
    this.isOpen = true;
    const arrow = this.toggleButton.querySelector(".multiselect-arrow");
    arrow.textContent = "▲";
    this.searchInput.focus();
  }

  /**
   * Close dropdown
   */
  close() {
    this.dropdown.style.display = "none";
    this.isOpen = false;
    const arrow = this.toggleButton.querySelector(".multiselect-arrow");
    arrow.textContent = "▼";
    this.searchInput.value = "";
    this.render();
  }

  /**
   * Update the items and selected items
   */
  update(allItems, selectedItems) {
    this.allItems = allItems;
    this.selectedItems = selectedItems;
    this.render();
  }

  /**
   * Render the items list
   */
  render() {
    const searchTerm = this.searchInput.value.toLowerCase();

    // Separate selected and unselected items
    const selectedSet = new Set(this.selectedItems);
    const unselectedItems = this.allItems.filter((item) => !selectedSet.has(item));

    // Filter unselected items based on search
    const filteredUnselected = unselectedItems.filter((item) => item.toLowerCase().includes(searchTerm));

    this.itemsList.innerHTML = "";

    // Add selected items section (always visible)
    if (this.selectedItems.length > 0) {
      const selectedSection = document.createElement("div");
      selectedSection.className = "multiselect-selected-section";

      const sectionHeader = document.createElement("div");
      sectionHeader.className = "multiselect-section-header";
      sectionHeader.textContent = `Selected (${this.selectedItems.length})`;
      selectedSection.appendChild(sectionHeader);

      this.selectedItems.forEach((item) => {
        const itemElement = this.createItemElement(item, true);
        selectedSection.appendChild(itemElement);
      });

      this.itemsList.appendChild(selectedSection);
    }

    // Add unselected items that match the search
    filteredUnselected.forEach((item) => {
      const itemElement = this.createItemElement(item, false);
      this.itemsList.appendChild(itemElement);
    });

    // Show "no results" message if nothing matches
    if (filteredUnselected.length === 0 && this.selectedItems.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "multiselect-no-results";
      noResults.textContent = searchTerm ? "No matches found" : "No items available";
      this.itemsList.appendChild(noResults);
    }
  }

  /**
   * Create an item element (checkbox + label)
   */
  createItemElement(item, isSelected) {
    const itemElement = document.createElement("label");
    itemElement.className = `multiselect-item ${isSelected ? "selected" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = item;
    checkbox.checked = isSelected;

    const itemName = document.createElement("span");
    itemName.textContent = item;
    itemName.title = item;

    itemElement.appendChild(checkbox);
    itemElement.appendChild(itemName);

    return itemElement;
  }

  /**
   * Destroy the dropdown and remove event listeners
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.MultiselectDropdown = MultiselectDropdown;
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = MultiselectDropdown;
}
