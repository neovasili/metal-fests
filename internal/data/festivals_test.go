package data

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/neovasili/metal-fests/internal/model"
)

func TestGetFestivals(t *testing.T) {
	tempDir := t.TempDir()
	dbFile := filepath.Join(tempDir, "db.json")
	testDB := model.Database{
		Festivals: []model.Festival{
			{Key: "wacken-2026", Name: "Wacken Open Air", Location: "Germany"},
			{Key: "hellfest-2026", Name: "Hellfest", Location: "France"},
		},
		Bands: []model.Band{},
	}
	data, err := json.MarshalIndent(testDB, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal test database: %v", err)
	}
	if err := os.WriteFile(dbFile, append(data, '\n'), 0600); err != nil {
		t.Fatalf("Failed to write test database: %v", err)
	}
	originalDBFile := SetDBFilePathForTesting(dbFile)
	defer SetDBFilePathForTesting(originalDBFile)

	festivals, err := GetFestivals()
	if err != nil {
		t.Fatalf("GetFestivals failed: %v", err)
	}
	if len(festivals) != 2 {
		t.Errorf("Expected 2 festivals, got %d", len(festivals))
	}
	if festivals[0].Key != "wacken-2026" {
		t.Errorf("Expected first festival key 'wacken-2026', got %q", festivals[0].Key)
	}
}

func TestUpdateFestivalInDatabase(t *testing.T) {
	tempDir := t.TempDir()
	dbFile := filepath.Join(tempDir, "db.json")
	testDB := model.Database{
		Festivals: []model.Festival{
			{
				Key:         "wacken-2026",
				Name:        "Wacken Open Air",
				Location:    "Germany",
				TicketPrice: 250.0,
			},
		},
		Bands: []model.Band{},
	}
	data, err := json.MarshalIndent(testDB, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal test database: %v", err)
	}
	if err := os.WriteFile(dbFile, append(data, '\n'), 0600); err != nil {
		t.Fatalf("Failed to write test database: %v", err)
	}
	originalDBFile := SetDBFilePathForTesting(dbFile)
	defer SetDBFilePathForTesting(originalDBFile)

	updatedFestival := model.Festival{
		Key:         "wacken-2026",
		Name:        "Wacken Open Air 2026",
		Location:    "Wacken, Germany",
		TicketPrice: 299.99,
	}
	err = UpdateFestivalInDatabase(updatedFestival)
	if err != nil {
		t.Fatalf("UpdateFestivalInDatabase failed: %v", err)
	}

	festivals, err := GetFestivals()
	if err != nil {
		t.Fatalf("GetFestivals failed: %v", err)
	}
	if len(festivals) != 1 {
		t.Errorf("Expected 1 festival, got %d", len(festivals))
	}
	if festivals[0].Name != "Wacken Open Air 2026" {
		t.Errorf("Expected festival name 'Wacken Open Air 2026', got %q", festivals[0].Name)
	}
	if festivals[0].TicketPrice != 299.99 {
		t.Errorf("Expected ticket price 299.99, got %v", festivals[0].TicketPrice)
	}
}

func TestUpdateFestivalInDatabase_NotFound(t *testing.T) {
	tempDir := t.TempDir()
	dbFile := filepath.Join(tempDir, "db.json")
	testDB := model.Database{
		Festivals: []model.Festival{},
		Bands:     []model.Band{},
	}
	data, err := json.MarshalIndent(testDB, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal test database: %v", err)
	}
	if err := os.WriteFile(dbFile, append(data, '\n'), 0600); err != nil {
		t.Fatalf("Failed to write test database: %v", err)
	}
	originalDBFile := SetDBFilePathForTesting(dbFile)
	defer SetDBFilePathForTesting(originalDBFile)

	updatedFestival := model.Festival{
		Key:  "non-existent",
		Name: "Non Existent Festival",
	}
	err = UpdateFestivalInDatabase(updatedFestival)
	if err == nil {
		t.Errorf("Expected error when updating non-existent festival, got nil")
	}
	expectedError := "festival not found"
	if err.Error() != expectedError {
		t.Errorf("Expected error %q, got %q", expectedError, err.Error())
	}
}

func TestGetFestivals_FileNotFound(t *testing.T) {
	tempDir := t.TempDir()
	dbFile := filepath.Join(tempDir, "non_existent.json")
	originalDBFile := SetDBFilePathForTesting(dbFile)
	defer SetDBFilePathForTesting(originalDBFile)

	_, err := GetFestivals()
	if err == nil {
		t.Errorf("Expected error when database file not found, got nil")
	}
}

func TestUpdateFestivalInDatabase_InvalidJSON(t *testing.T) {
	tempDir := t.TempDir()
	dbFile := filepath.Join(tempDir, "db.json")
	// Write invalid JSON
	if err := os.WriteFile(dbFile, []byte("invalid json"), 0600); err != nil {
		t.Fatalf("Failed to write test database: %v", err)
	}
	originalDBFile := SetDBFilePathForTesting(dbFile)
	defer SetDBFilePathForTesting(originalDBFile)

	updatedFestival := model.Festival{
		Key:  "test",
		Name: "Test Festival",
	}
	err := UpdateFestivalInDatabase(updatedFestival)
	if err == nil {
		t.Errorf("Expected error when reading invalid JSON, got nil")
	}
}
