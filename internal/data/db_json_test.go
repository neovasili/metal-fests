package data

import (
	"os"
	"testing"

	"github.com/neovasili/metal-fests/internal/model"
)

func TestReadAndWriteDatabase(t *testing.T) {
	tempFile := "test_db.json"
	if err := os.WriteFile(tempFile, []byte(`{"bands":[],"festivals":[]}`), 0600); err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	oldPath := SetDBFilePathForTesting(tempFile)
	defer func() {
		SetDBFilePathForTesting(oldPath)
		_ = os.Remove(tempFile)
	}()

	db, err := readDatabase()
	if err != nil {
		t.Fatalf("readDatabase failed: %v", err)
	}

	db.Bands = append(db.Bands, model.Band{Key: "b1", Name: "Band 1"})
	err = writeDatabase(db)
	if err != nil {
		t.Fatalf("writeDatabase failed: %v", err)
	}

	db2, err := readDatabase()
	if err != nil {
		t.Fatalf("readDatabase after write failed: %v", err)
	}
	if len(db2.Bands) != 1 || db2.Bands[0].Key != "b1" {
		t.Errorf("expected band 'b1', got %+v", db2.Bands)
	}
}
