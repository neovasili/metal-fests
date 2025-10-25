class AdminList {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`AdminList container not found: ${containerId}`);
      return;
    }
    this.title = options.title || "Items";
    this.placeholderText = options.placeholderText || "No items found";
    this.onItemSelect = options.onItemSelect || null;
    this.onSort = options.onSort || null;
    this.items = [];
    this.selectedIndex = -1;
    this.sortOrder = "asc";
  }

  async init() {
    await this.loadComponent();
    this.setupElements();
    this.setupEventListeners();
  }

  async loadComponent() {
    try {
      const response = await fetch("/components/admin-list/admin-list.html");
      if (!response.ok) {
        throw new Error(`Failed to load admin list: ${response.statusText}`);
      }
      const html = await response.text();
      this.container.innerHTML = html;
    } catch (error) {
      console.error("Error loading admin list:", error);
    }
  }

  setupElements() {
    this.listSection = this.container.querySelector(".admin-list-section");
    this.listTitle = this.container.querySelector(".list-title");
    this.listContent = this.container.querySelector(".list-content");
    this.listPlaceholder = this.container.querySelector(".list-placeholder p");
    this.sortToggle = this.container.querySelector(".sort-toggle");
    this.sortLabel = this.container.querySelector(".sort-label");

    if (this.listTitle) {
      this.listTitle.textContent = this.title;
    }
    if (this.listPlaceholder) {
      this.listPlaceholder.textContent = this.placeholderText;
    }
  }

  setupEventListeners() {
    if (this.sortToggle) {
      this.sortToggle.addEventListener("click", () => {
        this.toggleSort();
      });
    }
  }

  setItems(items) {
    this.items = items;
  }

  attachItemListeners() {
    const itemElements = this.listContent.querySelectorAll(".list-item");
    itemElements.forEach((element) => {
      element.addEventListener("click", () => {
        const index = parseInt(element.getAttribute("data-index"), 10);
        this.selectItem(index);
      });
    });
  }

  selectItem(index) {
    if (index < 0 || index >= this.items.length) return;

    this.selectedIndex = index;
    this.render();

    if (this.onItemSelect) {
      this.onItemSelect(this.items[index], index);
    }
  }

  getSelectedItem() {
    return this.selectedIndex >= 0 ? this.items[this.selectedIndex] : null;
  }

  toggleSort() {
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
    if (this.sortLabel) {
      this.sortLabel.textContent = this.sortOrder === "asc" ? "A-Z" : "Z-A";
    }

    if (this.onSort) {
      this.onSort(this.sortOrder);
    }
  }

  updateTitle(title) {
    this.title = title;
    if (this.listTitle) {
      this.listTitle.textContent = title;
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    if (!this.listContent) return;

    if (this.items.length === 0) {
      this.listContent.innerHTML = `
        <div class="list-placeholder">
          <p>${this.placeholderText}</p>
        </div>
      `;
      return;
    }

    this.listContent.innerHTML = this.items
      .map(
        (item, index) => `
      <div class="list-item ${index === this.selectedIndex ? "active" : ""}" data-index="${index}">
        <div class="list-item-content">
          <div class="list-item-name">${this.escapeHtml(item.name)}</div>
          ${item.meta ? `<div class="list-item-meta">${this.escapeHtml(item.meta)}</div>` : ""}
          ${item.genres ? `<div class="list-item-genres">${this.escapeHtml(item.genres)}</div>` : ""}
        </div>
        ${item.badge ? `<span class="list-item-badge ${item.badge.type}">${this.escapeHtml(item.badge.text)}</span>` : ""}
      </div>
    `,
      )
      .join("");

    this.attachItemListeners();
  }
}
