package model

import (
	"encoding/json"
	"testing"
)

func TestFestivalJSON(t *testing.T) {
	tests := []struct {
		name     string
		festival Festival
	}{
		{
			name: "complete festival with all fields",
			festival: Festival{
				Key:  "wacken-2026",
				Name: "Wacken Open Air 2026",
				Dates: Dates{
					Start: "2026-08-06",
					End:   "2026-08-08",
				},
				Location: "Wacken, Germany",
				Coordinates: Coordinates{
					Lat: 53.9189,
					Lng: 9.3769,
				},
				Poster:  "https://example.com/poster.jpg",
				Website: "https://wacken.com",
				Bands: []BandRef{
					{Key: "metallica", Name: "Metallica"},
					{Key: "iron-maiden", Name: "Iron Maiden"},
				},
				TicketPrice: 299.99,
			},
		},
		{
			name: "festival with minimal fields",
			festival: Festival{
				Key:         "test-fest",
				Name:        "Test Festival",
				Dates:       Dates{Start: "", End: ""},
				Location:    "",
				Coordinates: Coordinates{Lat: 0, Lng: 0},
				Bands:       []BandRef{},
				TicketPrice: 0,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test marshaling
			data, err := json.Marshal(tt.festival)
			if err != nil {
				t.Fatalf("Failed to marshal festival: %v", err)
			}

			// Test unmarshaling
			var unmarshaledFestival Festival
			err = json.Unmarshal(data, &unmarshaledFestival)
			if err != nil {
				t.Fatalf("Failed to unmarshal festival: %v", err)
			}

			// Verify fields
			if unmarshaledFestival.Key != tt.festival.Key {
				t.Errorf("Key mismatch: got %v, want %v", unmarshaledFestival.Key, tt.festival.Key)
			}
			if unmarshaledFestival.Name != tt.festival.Name {
				t.Errorf("Name mismatch: got %v, want %v", unmarshaledFestival.Name, tt.festival.Name)
			}
			if unmarshaledFestival.Location != tt.festival.Location {
				t.Errorf("Location mismatch: got %v, want %v", unmarshaledFestival.Location, tt.festival.Location)
			}
			if unmarshaledFestival.TicketPrice != tt.festival.TicketPrice {
				t.Errorf("TicketPrice mismatch: got %v, want %v", unmarshaledFestival.TicketPrice, tt.festival.TicketPrice)
			}
		})
	}
}

func TestBandRefJSON(t *testing.T) {
	bandRef := BandRef{
		Key:  "metallica",
		Name: "Metallica",
	}

	data, err := json.Marshal(bandRef)
	if err != nil {
		t.Fatalf("Failed to marshal BandRef: %v", err)
	}

	var unmarshaledBandRef BandRef
	err = json.Unmarshal(data, &unmarshaledBandRef)
	if err != nil {
		t.Fatalf("Failed to unmarshal BandRef: %v", err)
	}

	if unmarshaledBandRef.Key != bandRef.Key {
		t.Errorf("Key mismatch: got %v, want %v", unmarshaledBandRef.Key, bandRef.Key)
	}
	if unmarshaledBandRef.Name != bandRef.Name {
		t.Errorf("Name mismatch: got %v, want %v", unmarshaledBandRef.Name, bandRef.Name)
	}
}

func TestDatesJSON(t *testing.T) {
	dates := Dates{
		Start: "2026-08-06",
		End:   "2026-08-08",
	}

	data, err := json.Marshal(dates)
	if err != nil {
		t.Fatalf("Failed to marshal Dates: %v", err)
	}

	var unmarshaledDates Dates
	err = json.Unmarshal(data, &unmarshaledDates)
	if err != nil {
		t.Fatalf("Failed to unmarshal Dates: %v", err)
	}

	if unmarshaledDates.Start != dates.Start {
		t.Errorf("Start mismatch: got %v, want %v", unmarshaledDates.Start, dates.Start)
	}
	if unmarshaledDates.End != dates.End {
		t.Errorf("End mismatch: got %v, want %v", unmarshaledDates.End, dates.End)
	}
}

func TestCoordinatesJSON(t *testing.T) {
	coords := Coordinates{
		Lat: 53.9189,
		Lng: 9.3769,
	}

	data, err := json.Marshal(coords)
	if err != nil {
		t.Fatalf("Failed to marshal Coordinates: %v", err)
	}

	var unmarshaledCoords Coordinates
	err = json.Unmarshal(data, &unmarshaledCoords)
	if err != nil {
		t.Fatalf("Failed to unmarshal Coordinates: %v", err)
	}

	if unmarshaledCoords.Lat != coords.Lat {
		t.Errorf("Lat mismatch: got %v, want %v", unmarshaledCoords.Lat, coords.Lat)
	}
	if unmarshaledCoords.Lng != coords.Lng {
		t.Errorf("Lng mismatch: got %v, want %v", unmarshaledCoords.Lng, coords.Lng)
	}
}

func TestFestivalJSONTags(t *testing.T) {
	festival := Festival{
		Key:      "test",
		Name:     "Test",
		Dates:    Dates{Start: "2026-01-01", End: "2026-01-02"},
		Location: "Location",
		Coordinates: Coordinates{
			Lat: 1.0,
			Lng: 2.0,
		},
		Poster:      "poster.jpg",
		Website:     "https://test.com",
		Bands:       []BandRef{{Key: "band", Name: "Band"}},
		TicketPrice: 100.0,
	}

	data, err := json.Marshal(festival)
	if err != nil {
		t.Fatalf("Failed to marshal festival: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("Failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"key", "name", "dates", "location", "coordinates",
		"poster", "website", "bands", "ticketPrice",
	}

	for _, field := range expectedFields {
		if _, exists := raw[field]; !exists {
			t.Errorf("Expected field %q not found in JSON", field)
		}
	}
}
