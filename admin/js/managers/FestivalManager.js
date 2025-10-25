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
    } catch (error) {
      console.error("Error loading festivals:", error);
      window.notificationManager?.show("Error loading festivals", "error");
    }
  }

  async initEditForm() {
    this.editForm = new FestivalEditForm(this.formContainerId, {
      onSave: (festival) => this.saveFestival(festival),
      onCancel: () => this.clearSelection(),
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
    this.updateList();
  }

  updateList() {
    const listItems = this.filteredFestivals.map((festival) => ({
      name: festival.name,
      meta: `${this.formatDate(festival.dates.start)} - ${this.formatDate(festival.dates.end)} • ${festival.location}`,
      badge: null,
    }));

    this.adminList.setItems(listItems);
    this.adminList.updateTitle(`Festivals (${this.filteredFestivals.length})`);
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
      this.editForm.loadFestival(festival);
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
          festival.bands.some((band) => band.toLowerCase().includes(term)),
      );
    }
    this.sortFestivals(this.sortOrder);
  }

  async saveFestival(festivalData) {
    try {
      const existingIndex = this.festivals.findIndex((f) => f.name === festivalData.name);

      if (existingIndex >= 0) {
        this.festivals[existingIndex] = festivalData;
        window.notificationManager?.show("Festival updated successfully", "success");
      } else {
        this.festivals.push(festivalData);
        window.notificationManager?.show("Festival created successfully", "success");
      }

      await this.saveToDatabaseJson();
      this.filteredFestivals = [...this.festivals];
      this.updateList();
      this.clearSelection();
    } catch (error) {
      console.error("Error saving festival:", error);
      window.notificationManager?.show("Error saving festival", "error");
    }
  }

  async deleteFestival(festivalName) {
    try {
      const index = this.festivals.findIndex((f) => f.name === festivalName);
      if (index >= 0) {
        this.festivals.splice(index, 1);
        await this.saveToDatabaseJson();
        this.filteredFestivals = [...this.festivals];
        this.updateList();
        this.clearSelection();
        window.notificationManager?.show("Festival deleted successfully", "success");
      }
    } catch (error) {
      console.error("Error deleting festival:", error);
      window.notificationManager?.show("Error deleting festival", "error");
    }
  }

  async saveToDatabaseJson() {
    console.log("Festival data would be saved to server:", this.festivals);
  }

  clearSelection() {
    this.selectedIndex = -1;
    this.adminList.selectedIndex = -1;
    this.adminList.render();
    if (this.editForm) {
      this.editForm.clear();
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
    await this.editForm.render();
    await this.adminList.render();
  }
}
