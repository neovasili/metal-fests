package data

import (
	"fmt"

	"github.com/neovasili/metal-fests/internal/model"
)

func UpdateFestivalInDatabase(updatedFestival model.Festival) error {
	db, err := readDatabase()
	if err != nil {
		return err
	}

	festivalFound := false
	for i, festival := range db.Festivals {
		if festival.Key == updatedFestival.Key {
			db.Festivals[i] = updatedFestival
			festivalFound = true
			break
		}
	}

	if !festivalFound {
		return fmt.Errorf("festival not found")
	}

	err = writeDatabase(db)
	if err != nil {
		return err
	}

	return nil
}
