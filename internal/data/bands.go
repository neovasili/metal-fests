package data

import (
	"fmt"

	"github.com/neovasili/metal-fests/internal/model"
)

func UpdateBandInDatabase(updatedBand model.Band) error {
	db, err := readDatabase()
	if err != nil {
		return err
	}

	bandFound := false
	for i, band := range db.Bands {
		if band.Key == updatedBand.Key {
			db.Bands[i] = updatedBand
			bandFound = true
			break
		}
	}

	if !bandFound {
		return fmt.Errorf("band not found")
	}

	err = writeDatabase(db)
	if err != nil {
		return err
	}

	return nil
}
