// Unit tests for MultiselectDropdown
// MultiselectDropdown is loaded globally via vitest.setup.js

describe("MultiselectDropdown", () => {
  let dropdown;
  let options;

  beforeEach(() => {
    options = {
      allItems: ["Rock", "Metal", "Jazz", "Blues", "Classical"],
      selectedItems: ["Metal", "Rock"],
      placeholder: "Search genres...",
      icon: "🎸",
      label: "Select Genres",
      onToggle: vi.fn(),
      onSearch: vi.fn(),
    };

    dropdown = new MultiselectDropdown(options);
  });

  describe("constructor", () => {
    it("should initialize with provided options", () => {
      expect(dropdown.allItems).toEqual(options.allItems);
      expect(dropdown.selectedItems).toEqual(options.selectedItems);
      expect(dropdown.placeholder).toBe("Search genres...");
      expect(dropdown.icon).toBe("🎸");
      expect(dropdown.label).toBe("Select Genres");
    });

    it("should use default values when options not provided", () => {
      const defaultDropdown = new MultiselectDropdown({});
      expect(defaultDropdown.allItems).toEqual([]);
      expect(defaultDropdown.selectedItems).toEqual([]);
      expect(defaultDropdown.placeholder).toBe("Search...");
      expect(defaultDropdown.icon).toBe("🔍");
      expect(defaultDropdown.label).toBe("Select Items");
    });

    it("should initialize as closed", () => {
      expect(dropdown.isOpen).toBe(false);
    });
  });

  describe("create", () => {
    it("should create dropdown container", () => {
      const element = dropdown.create();
      expect(element.className).toBe("multiselect-dropdown-container");
    });

    it("should create toggle button with label and icon", () => {
      const element = dropdown.create();
      const toggleButton = element.querySelector(".multiselect-toggle");
      expect(toggleButton).toBeTruthy();
      expect(toggleButton.innerHTML).toContain("🎸");
      expect(toggleButton.innerHTML).toContain("Select Genres");
    });

    it("should create dropdown with search input", () => {
      const element = dropdown.create();
      const searchInput = element.querySelector(".multiselect-search");
      expect(searchInput).toBeTruthy();
      expect(searchInput.placeholder).toBe("Search genres...");
    });

    it("should create items list", () => {
      const element = dropdown.create();
      const itemsList = element.querySelector(".multiselect-list");
      expect(itemsList).toBeTruthy();
    });

    it("should initially hide dropdown", () => {
      const element = dropdown.create();
      const dropdownEl = element.querySelector(".multiselect-dropdown");
      expect(dropdownEl.style.display).toBe("none");
    });
  });

  describe("toggle", () => {
    beforeEach(() => {
      dropdown.create();
    });

    it("should open dropdown when closed", () => {
      dropdown.toggle();
      expect(dropdown.isOpen).toBe(true);
      expect(dropdown.dropdown.style.display).toBe("block");
    });

    it("should close dropdown when open", () => {
      dropdown.open();
      dropdown.toggle();
      expect(dropdown.isOpen).toBe(false);
      expect(dropdown.dropdown.style.display).toBe("none");
    });
  });

  describe("open", () => {
    beforeEach(() => {
      dropdown.create();
    });

    it("should display dropdown", () => {
      dropdown.open();
      expect(dropdown.dropdown.style.display).toBe("block");
      expect(dropdown.isOpen).toBe(true);
    });

    it("should update arrow icon", () => {
      dropdown.open();
      const arrow = dropdown.toggleButton.querySelector(".multiselect-arrow");
      expect(arrow.textContent).toBe("▲");
    });

    it("should focus search input", () => {
      dropdown.create();
      document.body.appendChild(dropdown.container);
      const focusSpy = vi.spyOn(dropdown.searchInput, "focus");

      dropdown.open();

      expect(focusSpy).toHaveBeenCalled();
      document.body.removeChild(dropdown.container);
    });
  });

  describe("close", () => {
    beforeEach(() => {
      dropdown.create();
      dropdown.open();
    });

    it("should hide dropdown", () => {
      dropdown.close();
      expect(dropdown.dropdown.style.display).toBe("none");
      expect(dropdown.isOpen).toBe(false);
    });

    it("should update arrow icon", () => {
      dropdown.close();
      const arrow = dropdown.toggleButton.querySelector(".multiselect-arrow");
      expect(arrow.textContent).toBe("▼");
    });

    it("should clear search input", () => {
      dropdown.searchInput.value = "test";
      dropdown.close();
      expect(dropdown.searchInput.value).toBe("");
    });
  });

  describe("update", () => {
    beforeEach(() => {
      dropdown.create();
    });

    it("should update items and selected items", () => {
      const newItems = ["Pop", "Rap"];
      const newSelected = ["Pop"];

      dropdown.update(newItems, newSelected);

      expect(dropdown.allItems).toEqual(newItems);
      expect(dropdown.selectedItems).toEqual(newSelected);
    });

    it("should re-render list", () => {
      const renderSpy = vi.spyOn(dropdown, "render");
      dropdown.update(["Item1"], []);
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe("render", () => {
    beforeEach(() => {
      dropdown.create();
    });

    it("should show selected items section when items are selected", () => {
      dropdown.render();
      const selectedSection = dropdown.itemsList.querySelector(".multiselect-selected-section");
      expect(selectedSection).toBeTruthy();
    });

    it("should display selected count", () => {
      dropdown.render();
      const header = dropdown.itemsList.querySelector(".multiselect-section-header");
      expect(header.textContent).toBe("Selected (2)");
    });

    it("should show unselected items", () => {
      dropdown.render();
      const items = dropdown.itemsList.querySelectorAll(".multiselect-item");
      // 2 selected + 3 unselected = 5 total
      expect(items.length).toBe(5);
    });

    it("should filter items based on search", () => {
      dropdown.searchInput.value = "metal";
      dropdown.render();

      const items = dropdown.itemsList.querySelectorAll(".multiselect-item:not(.selected)");
      expect(items.length).toBe(0); // Metal is selected, so 0 unselected matches
    });

    it("should show no results message when nothing matches", () => {
      dropdown.selectedItems = [];
      dropdown.searchInput.value = "nonexistent";
      dropdown.render();

      const noResults = dropdown.itemsList.querySelector(".multiselect-no-results");
      expect(noResults).toBeTruthy();
      expect(noResults.textContent).toBe("No matches found");
    });

    it("should show no items message when list is empty", () => {
      dropdown.allItems = [];
      dropdown.selectedItems = [];
      dropdown.render();

      const noResults = dropdown.itemsList.querySelector(".multiselect-no-results");
      expect(noResults).toBeTruthy();
      expect(noResults.textContent).toBe("No items available");
    });
  });

  describe("createItemElement", () => {
    beforeEach(() => {
      dropdown.create();
    });

    it("should create item with checkbox", () => {
      const item = dropdown.createItemElement("Metal", true);
      const checkbox = item.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(true);
      expect(checkbox.value).toBe("Metal");
    });

    it("should add selected class for selected items", () => {
      const item = dropdown.createItemElement("Metal", true);
      expect(item.classList.contains("selected")).toBe(true);
    });

    it("should not add selected class for unselected items", () => {
      const item = dropdown.createItemElement("Jazz", false);
      expect(item.classList.contains("selected")).toBe(false);
    });

    it("should set item text and title", () => {
      const item = dropdown.createItemElement("Metal", false);
      const span = item.querySelector("span");
      expect(span.textContent).toBe("Metal");
      expect(span.title).toBe("Metal");
    });
  });

  describe("event listeners", () => {
    beforeEach(() => {
      dropdown.create();
      document.body.appendChild(dropdown.container);
    });

    afterEach(() => {
      if (dropdown.container && dropdown.container.parentNode) {
        document.body.removeChild(dropdown.container);
      }
    });

    it("should call onToggle when checkbox is changed", () => {
      dropdown.render();
      const checkbox = dropdown.itemsList.querySelector('input[type="checkbox"]');

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));

      expect(options.onToggle).toHaveBeenCalled();
    });

    it("should call onSearch when search input changes", () => {
      dropdown.searchInput.value = "test";
      dropdown.searchInput.dispatchEvent(new Event("input"));

      expect(options.onSearch).toHaveBeenCalledWith("test");
    });

    it("should toggle dropdown when button is clicked", () => {
      expect(dropdown.isOpen).toBe(false);

      dropdown.toggleButton.click();

      expect(dropdown.isOpen).toBe(true);
    });

    it("should close dropdown when clicking outside", () => {
      dropdown.open();
      expect(dropdown.isOpen).toBe(true);

      document.body.click();

      expect(dropdown.isOpen).toBe(false);
    });

    it("should not close dropdown when clicking inside", () => {
      dropdown.open();

      dropdown.dropdown.click();

      expect(dropdown.isOpen).toBe(true);
    });
  });

  describe("destroy", () => {
    it("should remove dropdown from DOM", () => {
      const element = dropdown.create();
      document.body.appendChild(element);

      dropdown.destroy();

      expect(document.body.contains(element)).toBe(false);
    });

    it("should handle destroying when not attached to DOM", () => {
      dropdown.create();
      expect(() => dropdown.destroy()).not.toThrow();
    });
  });
});
