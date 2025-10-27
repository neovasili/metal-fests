class FestivalManager {
  constructor(listContainerId, formContainerId) {
    this.festivals = [];
    this.filteredFestivals = [];
    this.selectedIndex = -1;
    this.sortOrder = "asc";
    this.adminList = null;
    this.listContainerId = listContainerId;
    this.formContainerId = formContainerId;
    this.editForm = null;
  }

  async init() {
    await this.loadFestivals();
    await this.initEditForm();
    await this.initFestivalsList();
    // Load the initial festival from localStorage if available
    await this.loadInitialSelection();
  }

  async loadFestivals() {
    try {
      const response = await fetch("/db.json");
      if (!response.ok) {
        throw new Error("Failed to load festivals database");
      }
      const data = await response.json();
      this.festivals = data.festivals || [];
      this.filteredFestivals = [...this.festivals];
      // Sort the data, but don't update UI yet (adminList not initialized)
      this.filteredFestivals.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return this.sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
    } catch (error) {
      console.error("Error loading festivals:", error);
      window.notificationManager?.show("Error loading festivals", "error");
    }
  }

  async initEditForm() {
    this.editForm = new FestivalEditForm(this.formContainerId, {
      onSave: (festival) => this.saveFestival(festival),
    });
    await this.editForm.init();
  }

  async initFestivalsList() {
    this.adminList = new AdminList(this.listContainerId, {
      title: "Festivals",
      placeholderText: "No festivals found",
      onItemSelect: (item, index) => this.onFestivalSelect(item, index),
      onSort: (order) => this.sortFestivals(order),
    });
    await this.adminList.init();
    // Don't call updateList() here - let render() handle it when the page is actually loaded
  }

  updateList() {
    const listItems = this.filteredFestivals.map((festival) => ({
      name: festival.name,
      meta: `${this.formatDate(festival.dates.start)} - ${this.formatDate(festival.dates.end)}`,
      genres: festival.location || "Unknown location",
      badge: null,
    }));

    this.adminList.setItems(listItems);
    this.adminList.updateTitle(`Festivals (${this.filteredFestivals.length})`);
    this.adminList.render();
  }

  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }

  onFestivalSelect(item, index) {
    this.selectedIndex = index;
    const festival = this.filteredFestivals[index];
    if (festival && this.editForm) {
      this.currentFestival = festival; // Track current festival for API calls
      this.editForm.loadFestival(festival);
      this.editForm.render();
      // Save selected festival key to localStorage
      localStorage.setItem("selectedFestivalKey", festival.key);
    }
  }

  sortFestivals(order) {
    this.sortOrder = order;
    this.filteredFestivals.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return order === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    this.updateList();
  }

  filterFestivals(searchTerm) {
    if (!searchTerm) {
      this.filteredFestivals = [...this.festivals];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredFestivals = this.festivals.filter(
        (festival) =>
          festival.name.toLowerCase().includes(term) ||
          festival.location.toLowerCase().includes(term) ||
          festival.bands.some((bandRef) => bandRef.name.toLowerCase().includes(term)),
      );
    }
    this.sortFestivals(this.sortOrder);
  }

  async saveFestival(festivalData, isAutoSave = false) {
    try {
      const existingIndex = this.festivals.findIndex((f) => f.key === festivalData.key);

      if (existingIndex >= 0) {
        this.festivals[existingIndex] = festivalData;
        this.currentFestival = festivalData; // Keep current festival in sync
        if (!isAutoSave) {
          window.notificationManager?.show("Festival updated successfully", "success");
        }
      } else {
        this.festivals.push(festivalData);
        this.currentFestival = festivalData; // Keep current festival in sync
        if (!isAutoSave) {
          window.notificationManager?.show("Festival created successfully", "success");
        }
      }

      await this.saveToDatabaseJson();
      this.filteredFestivals = [...this.festivals];
      this.sortFestivals(this.sortOrder);
    } catch (error) {
      console.error("Error saving festival:", error);
      if (!isAutoSave) {
        window.notificationManager?.show("Error saving festival", "error");
      }
      throw error; // Re-throw to let auto-save handle it
    }
  }

  async deleteFestival(festivalKey) {
    try {
      const index = this.festivals.findIndex((f) => f.key === festivalKey);
      if (index >= 0) {
        this.festivals.splice(index, 1);
        await this.saveToDatabaseJson();
        this.filteredFestivals = [...this.festivals];
        this.sortFestivals(this.sortOrder);
        window.notificationManager?.show("Festival deleted successfully", "success");
      }
    } catch (error) {
      console.error("Error deleting festival:", error);
      window.notificationManager?.show("Error deleting festival", "error");
    }
  }

  async saveToDatabaseJson() {
    try {
      // Use the current festival to determine which one to update
      if (!this.currentFestival || !this.currentFestival.key) {
        throw new Error("No festival selected for update");
      }

      // Save single festival data to the server
      const response = await fetch(`/api/festivals/${encodeURIComponent(this.currentFestival.key)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.currentFestival),
      });

      if (!response.ok) {
        throw new Error("Failed to save festival to database");
      }

      return true;
    } catch (error) {
      console.error("Error saving festival to database:", error);
      throw error;
    }
  }

  async loadInitialSelection() {
    const savedFestivalKey = localStorage.getItem("selectedFestivalKey");
    if (savedFestivalKey) {
      const index = this.filteredFestivals.findIndex((f) => f.key === savedFestivalKey);
      if (index >= 0) {
        const festival = this.filteredFestivals[index];
        this.adminList.selectItem(index);
        this.editForm.loadFestival(festival);
      }
    }
  }

  getSelectedFestival() {
    return this.selectedIndex >= 0 ? this.filteredFestivals[this.selectedIndex] : null;
  }

  navigateList(direction) {
    if (this.filteredFestivals.length === 0) return;

    let newIndex = this.selectedIndex + direction;
    if (newIndex < 0) {
      newIndex = this.filteredFestivals.length - 1;
    } else if (newIndex >= this.filteredFestivals.length) {
      newIndex = 0;
    }

    this.adminList.selectItem(newIndex);
  }

  async render() {
    // ALWAYS re-initialize the list to ensure we have the correct HTML
    await this.initFestivalsList();

    // Update the list before rendering
    this.updateList();
    await this.editForm.render();

    // Restore selection from localStorage after rendering
    await this.loadInitialSelection();
  }
}
