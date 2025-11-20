package model

import (
	"encoding/json"
	"testing"
)

func TestDatabaseJSON(t *testing.T) {
	tests := []struct {
		name string
		db   Database
	}{
		{
			name: "database with festivals and bands",
			db: Database{
				Festivals: []Festival{
					{
						Key:      "wacken-2026",
						Name:     "Wacken Open Air",
						Location: "Wacken, Germany",
						Dates:    Dates{Start: "2026-08-06", End: "2026-08-08"},
						Coordinates: Coordinates{
							Lat: 53.9189,
							Lng: 9.3769,
						},
						Bands:       []BandRef{{Key: "metallica", Name: "Metallica"}},
						TicketPrice: 299.99,
					},
				},
				Bands: []Band{
					{
						Key:     "metallica",
						Name:    "Metallica",
						Country: "USA",
						Genres:  []string{"Heavy Metal"},
						Members: []Member{{Name: "James Hetfield", Role: "Vocals"}},
					},
				},
			},
		},
		{
			name: "empty database",
			db: Database{
				Festivals: []Festival{},
				Bands:     []Band{},
			},
		},
		{
			name: "database with nil slices",
			db: Database{
				Festivals: nil,
				Bands:     nil,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test marshaling
			data, err := json.Marshal(tt.db)
			if err != nil {
				t.Fatalf("Failed to marshal Database: %v", err)
			}

			// Test unmarshaling
			var unmarshaledDB Database
			err = json.Unmarshal(data, &unmarshaledDB)
			if err != nil {
				t.Fatalf("Failed to unmarshal Database: %v", err)
			}

			// Verify festivals count
			if len(unmarshaledDB.Festivals) != len(tt.db.Festivals) {
				t.Errorf("Festivals count mismatch: got %v, want %v",
					len(unmarshaledDB.Festivals), len(tt.db.Festivals))
			}

			// Verify bands count
			if len(unmarshaledDB.Bands) != len(tt.db.Bands) {
				t.Errorf("Bands count mismatch: got %v, want %v",
					len(unmarshaledDB.Bands), len(tt.db.Bands))
			}

			// Verify first festival if exists
			if len(tt.db.Festivals) > 0 && len(unmarshaledDB.Festivals) > 0 {
				if unmarshaledDB.Festivals[0].Key != tt.db.Festivals[0].Key {
					t.Errorf("Festival key mismatch: got %v, want %v",
						unmarshaledDB.Festivals[0].Key, tt.db.Festivals[0].Key)
				}
			}

			// Verify first band if exists
			if len(tt.db.Bands) > 0 && len(unmarshaledDB.Bands) > 0 {
				if unmarshaledDB.Bands[0].Key != tt.db.Bands[0].Key {
					t.Errorf("Band key mismatch: got %v, want %v",
						unmarshaledDB.Bands[0].Key, tt.db.Bands[0].Key)
				}
			}
		})
	}
}

func TestDatabaseJSONTags(t *testing.T) {
	db := Database{
		Festivals: []Festival{
			{Key: "test-fest", Name: "Test Festival"},
		},
		Bands: []Band{
			{Key: "test-band", Name: "Test Band"},
		},
	}

	data, err := json.Marshal(db)
	if err != nil {
		t.Fatalf("Failed to marshal Database: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("Failed to unmarshal to map: %v", err)
	}

	// Verify JSON field names
	if _, exists := raw["festivals"]; !exists {
		t.Errorf("Expected field 'festivals' not found in JSON")
	}
	if _, exists := raw["bands"]; !exists {
		t.Errorf("Expected field 'bands' not found in JSON")
	}
}

func TestDatabaseEmptyArraysSerialization(t *testing.T) {
	db := Database{
		Festivals: []Festival{},
		Bands:     []Band{},
	}

	data, err := json.Marshal(db)
	if err != nil {
		t.Fatalf("Failed to marshal Database: %v", err)
	}

	// Empty arrays should be serialized as [] not null
	expectedJSON := `{"festivals":[],"bands":[]}`
	var expected, actual map[string]interface{}

	if err := json.Unmarshal([]byte(expectedJSON), &expected); err != nil {
		t.Fatalf("Failed to unmarshal expected JSON: %v", err)
	}
	if err := json.Unmarshal(data, &actual); err != nil {
		t.Fatalf("Failed to unmarshal actual JSON: %v", err)
	}

	// Verify that festivals is an array
	if festivals, ok := actual["festivals"].([]interface{}); !ok {
		t.Errorf("Festivals should be an array")
	} else if len(festivals) != 0 {
		t.Errorf("Festivals array should be empty, got length %d", len(festivals))
	}

	// Verify that bands is an array
	if bands, ok := actual["bands"].([]interface{}); !ok {
		t.Errorf("Bands should be an array")
	} else if len(bands) != 0 {
		t.Errorf("Bands array should be empty, got length %d", len(bands))
	}
}
