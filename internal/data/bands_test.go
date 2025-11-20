package data

import (
	"os"
	"testing"

	"github.com/neovasili/metal-fests/internal/model"
)

func TestAddAndGetBands(t *testing.T) {
	// Use a temp file for DB
	tempFile := "test_db_bands.json"
	if err := os.WriteFile(tempFile, []byte(`{"bands":[],"festivals":[]}`), 0600); err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	oldPath := SetDBFilePathForTesting(tempFile)
	defer func() {
		SetDBFilePathForTesting(oldPath)
		_ = os.Remove(tempFile)
	}()

	band := model.Band{Key: "testkey", Name: "Test Band"}
	err := AddBandToDatabase(band)
	if err != nil {
		t.Fatalf("AddBandToDatabase failed: %v", err)
	}

	bands, err := GetBands()
	if err != nil {
		t.Fatalf("GetBands failed: %v", err)
	}
	if len(bands) != 1 || bands[0].Key != "testkey" {
		t.Errorf("expected band with key 'testkey', got %+v", bands)
	}
}
