package data

import (
	"encoding/json"
	"os"

	"github.com/neovasili/metal-fests/internal/constants"
	"github.com/neovasili/metal-fests/internal/model"
)

// dbFilePath allows overriding the database file path for testing
var dbFilePath = constants.DBFile

// Read current database
func readDatabase() (*model.Database, error) {
	// #nosec G304 - dbFilePath is controlled and can be overridden for testing
	dbData, err := os.ReadFile(dbFilePath)
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

	if err := os.WriteFile(dbFilePath, updatedData, 0600); err != nil {
		return err
	}
	return nil
}
