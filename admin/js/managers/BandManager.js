class BandManager {
  constructor(listContainerId, formContainerId) {
    this.bands = [];
    this.filteredBands = [];
    this.selectedIndex = -1;
    this.sortOrder = "asc";
    this.adminList = null;
    this.listContainerId = listContainerId;
    this.formContainerId = formContainerId;
    this.editForm = null;
    this.currentTab = "review"; // Default tab
  }

  async init() {
    // Restore saved tab from localStorage
    const savedTab = localStorage.getItem("adminActiveTab");
    if (savedTab) {
      this.currentTab = savedTab;
    }

    await this.loadBands();
    await this.initEditForm();
    await this.initBandsList();
    // Load the initial band from localStorage if available
    await this.loadInitialSelection();
  }

  setActiveTab(tabId) {
    this.currentTab = tabId;
    this.filterByTab();
    this.updateList();
    this.clearSelection();
  }

  filterByTab() {
    if (this.currentTab === "review") {
      // Show only bands that are NOT reviewed
      this.filteredBands = this.bands.filter((band) => !band.reviewed);
    } else if (this.currentTab === "reviewed") {
      // Show only bands that ARE reviewed
      this.filteredBands = this.bands.filter((band) => band.reviewed);
    } else {
      // Default: show all bands
      this.filteredBands = [...this.bands];
    }
  }

  async loadBands() {
    try {
      const response = await fetch("/db.json");
      if (!response.ok) {
        throw new Error("Failed to load bands database");
      }
      const data = await response.json();
      this.bands = data.bands || [];
      // Apply tab filter
      this.filterByTab();
    } catch (error) {
      console.error("Error loading bands:", error);
      window.notificationManager?.show("Error loading bands", "error");
    }
  }

  getBandsToReview() {
    return this.bands.filter((band) => !band.reviewed);
  }

  getBandsReviewed() {
    return this.bands.filter((band) => band.reviewed);
  }

  async initEditForm() {
    this.editForm = new BandEditForm(this.formContainerId, {
      onSave: (band) => this.saveBand(band),
      onCancel: () => this.clearSelection(),
    });
    await this.editForm.init();
  }

  async initBandsList() {
    this.adminList = new AdminList(this.listContainerId, {
      title: "Bands",
      placeholderText: "No bands found",
      onItemSelect: (item, index) => this.onBandSelect(item, index),
      onSort: (order) => this.sortBands(order),
    });
    await this.adminList.init();
    this.updateList();
  }

  updateList() {
    const listItems = this.filteredBands.map((band) => ({
      name: band.name,
      meta: `${band.country} • ${band.genres?.join(", ") || "No genres"}`,
      badge: band.reviewed ? { text: "Reviewed", type: "complete" } : { text: "Pending", type: "pending" },
    }));

    this.adminList.setItems(listItems);
    const tabName = this.currentTab === "review" ? "To Review" : this.currentTab === "reviewed" ? "Reviewed" : "All";
    this.adminList.updateTitle(`Bands ${tabName} (${this.filteredBands.length})`);
    this.adminList.render();
  }

  onBandSelect(item, index) {
    this.selectedIndex = index;
    const band = this.filteredBands[index];
    if (band && this.editForm) {
      this.editForm.loadBand(band);
      this.editForm.render();
      // Save selected band to localStorage
      localStorage.setItem("selectedBandName", band.name);
    }
  }

  sortBands(order) {
    this.sortOrder = order;
    this.filteredBands.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return order === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    this.updateList();
  }

  filterBands(searchTerm) {
    // First, filter by tab
    this.filterByTab();

    // Then, apply search filter if provided
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      this.filteredBands = this.filteredBands.filter(
        (band) =>
          band.name.toLowerCase().includes(term) ||
          band.country.toLowerCase().includes(term) ||
          band.genres?.some((genre) => genre.toLowerCase().includes(term)),
      );
    }

    this.sortBands(this.sortOrder);
  }

  async saveBand(bandData) {
    try {
      const existingIndex = this.bands.findIndex((b) => b.key === bandData.key);

      if (existingIndex >= 0) {
        this.bands[existingIndex] = bandData;
        window.notificationManager?.show("Band updated successfully", "success");
      } else {
        this.bands.push(bandData);
        window.notificationManager?.show("Band created successfully", "success");
      }

      await this.saveToDatabaseJson();
      // Refilter based on current tab
      this.filterByTab();
      this.updateList();
      this.clearSelection();
    } catch (error) {
      console.error("Error saving band:", error);
      window.notificationManager?.show("Error saving band", "error");
    }
  }

  async deleteBand(bandKey) {
    try {
      const index = this.bands.findIndex((b) => b.key === bandKey);
      if (index >= 0) {
        this.bands.splice(index, 1);
        await this.saveToDatabaseJson();
        // Refilter based on current tab
        this.filterByTab();
        this.updateList();
        this.clearSelection();
        window.notificationManager?.show("Band deleted successfully", "success");
      }
    } catch (error) {
      console.error("Error deleting band:", error);
      window.notificationManager?.show("Error deleting band", "error");
    }
  }

  async saveToDatabaseJson() {
    console.log("Band data would be saved to server:", this.bands);
  }

  clearSelection() {
    this.selectedIndex = -1;
    this.adminList.selectedIndex = -1;
    this.adminList.render();
    if (this.editForm) {
      this.editForm.clear();
    }
    // Clear saved selection from localStorage
    localStorage.removeItem("selectedBandName");
  }

  async loadInitialSelection() {
    const savedBandName = localStorage.getItem("selectedBandName");
    if (savedBandName) {
      const index = this.filteredBands.findIndex((b) => b.name === savedBandName);
      if (index >= 0) {
        const band = this.filteredBands[index];
        this.adminList.selectItem(index);
        this.editForm.loadBand(band);
      }
    }
  }

  getSelectedBand() {
    return this.selectedIndex >= 0 ? this.filteredBands[this.selectedIndex] : null;
  }

  navigateList(direction) {
    if (this.filteredBands.length === 0) return;

    let newIndex = this.selectedIndex + direction;
    if (newIndex < 0) {
      newIndex = this.filteredBands.length - 1;
    } else if (newIndex >= this.filteredBands.length) {
      newIndex = 0;
    }

    this.adminList.selectItem(newIndex);
  }

  async render() {
    console.log("Rendering Band Manager, current tab:", this.currentTab);
    // Ensure filtered bands match current tab
    this.filterByTab();
    console.log("Render edit form");
    await this.editForm.render();
    console.log("Render admin list");
    await this.adminList.render();
  }
}
