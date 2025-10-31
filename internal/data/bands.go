package data

import (
	"fmt"

	"github.com/neovasili/metal-fests/internal/model"
)

func GetBands() ([]model.Band, error) {
	db, err := readDatabase()
	if err != nil {
		return nil, err
	}
	return db.Bands, nil
}

func AddBandToDatabase(newBand model.Band) error {
	db, err := readDatabase()
	if err != nil {
		return err
	}

	// Check if band already exists
	for _, band := range db.Bands {
		if band.Key == newBand.Key {
			return fmt.Errorf("band already exists")
		}
	}

	db.Bands = append(db.Bands, newBand)

	err = writeDatabase(db)
	if err != nil {
		return err
	}

	return nil
}

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

func CollectAllFestivalBands() ([]model.BandRef, error) {
	db, err := readDatabase()
	if err != nil {
		return nil, err
	}

	bandSet := make(map[string]model.BandRef)

	for _, festival := range db.Festivals {
		for _, bandRef := range festival.Bands {
			if _, exists := bandSet[bandRef.Key]; !exists {
				bandSet[bandRef.Key] = bandRef
			}
		}
	}

	bands := make([]model.BandRef, 0, len(bandSet))
	for _, bandRef := range bandSet {
		bands = append(bands, bandRef)
	}

	return bands, nil
}
