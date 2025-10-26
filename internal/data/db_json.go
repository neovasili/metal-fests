package data

import (
	"encoding/json"
	"os"

	"github.com/neovasili/metal-fests/internal/constants"
	"github.com/neovasili/metal-fests/internal/model"
)

// Read current database
func readDatabase() (*model.Database, error) {
	dbData, err := os.ReadFile(constants.DBFile)
	if err != nil {
		return nil, err
	}

	var db model.Database
	if err := json.Unmarshal(dbData, &db); err != nil {
		return nil, err
	}
	return &db, nil
}

// Write updated data back to database
func writeDatabase(db *model.Database) error {
	updatedData, err := json.MarshalIndent(db, "", "  ")
	if err != nil {
		return err
	}

	// Add trailing newline
	updatedData = append(updatedData, '\n')

	if err := os.WriteFile(constants.DBFile, updatedData, 0600); err != nil {
		return err
	}
	return nil
}
