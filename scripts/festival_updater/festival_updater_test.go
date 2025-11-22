package main

import (
	"strings"
	"testing"

	"github.com/neovasili/metal-fests/internal/model"
)

func TestContainsBand(t *testing.T) {
	tests := []struct {
		name     string
		bands    []model.BandRef
		bandName string
		expected bool
	}{
		{
			name: "Band exists in list",
			bands: []model.BandRef{
				{Key: "metallica", Name: "Metallica"},
				{Key: "iron-maiden", Name: "Iron Maiden"},
			},
			bandName: "Metallica",
			expected: true,
		},
		{
			name: "Band does not exist in list",
			bands: []model.BandRef{
				{Key: "metallica", Name: "Metallica"},
				{Key: "iron-maiden", Name: "Iron Maiden"},
			},
			bandName: "Slayer",
			expected: false,
		},
		{
			name:     "Empty band list",
			bands:    []model.BandRef{},
			bandName: "Metallica",
			expected: false,
		},
		{
			name:     "Nil band list",
			bands:    nil,
			bandName: "Metallica",
			expected: false,
		},
		{
			name: "Case sensitive match",
			bands: []model.BandRef{
				{Key: "metallica", Name: "Metallica"},
			},
			bandName: "metallica",
			expected: false,
		},
		{
			name: "Band with spaces",
			bands: []model.BandRef{
				{Key: "black-sabbath", Name: "Black Sabbath"},
			},
			bandName: "Black Sabbath",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsBand(tt.bands, tt.bandName)
			if result != tt.expected {
				t.Errorf("containsBand() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestBandNameToKey(t *testing.T) {
	tests := []struct {
		name     string
		bandName string
		expected string
	}{
		{
			name:     "Simple band name",
			bandName: "Metallica",
			expected: "metallica",
		},
		{
			name:     "Band name with spaces",
			bandName: "Iron Maiden",
			expected: "iron-maiden",
		},
		{
			name:     "Band name with ampersand",
			bandName: "Foo & Bar",
			expected: "foo-and-bar",
		},
		{
			name:     "Band name with multiple ampersands",
			bandName: "A & B & C",
			expected: "a-and-b-and-c",
		},
		{
			name:     "Band name with consecutive spaces",
			bandName: "Foo   Bar",
			expected: "foo-bar",
		},
		{
			name:     "Band name all uppercase",
			bandName: "BLACK SABBATH",
			expected: "black-sabbath",
		},
		{
			name:     "Band name with mixed case",
			bandName: "DeAd KeNnEdYs",
			expected: "dead-kennedys",
		},
		{
			name:     "Band name with consecutive hyphens",
			bandName: "Foo--Bar",
			expected: "foo-bar",
		},
		{
			name:     "Band name with triple hyphens",
			bandName: "Foo---Bar",
			expected: "foo-bar",
		},
		{
			name:     "Complex band name",
			bandName: "Foo & Bar  Baz",
			expected: "foo-and-bar-baz",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := bandNameToKey(tt.bandName)
			if result != tt.expected {
				t.Errorf("bandNameToKey(%q) = %q, want %q", tt.bandName, result, tt.expected)
			}
		})
	}
}

func TestGeneratePRSummary(t *testing.T) {
	tests := []struct {
		name     string
		stats    UpdateStats
		contains []string
	}{
		{
			name: "Summary with updates",
			stats: UpdateStats{
				TotalFestivals:   5,
				UpdatedFestivals: 3,
				NewBands:         10,
				UpdatedPrices:    2,
				TotalTokens:      3000,
				TotalCost:        0.10,
				UsedModel:        "gpt-4o-mini",
			},
			contains: []string{
				"# 🤖 Automated Festival Information Update",
				"**Total Festivals Processed**: 5",
				"**Festivals Updated**: 3",
				"**New Bands Added**: 10",
				"**Ticket Prices Updated**: 2",
				"**Total Tokens**: 3000",
				"**Total Cost**: 0.10 €",
				"gpt-4o-mini",
				"scripts/festival_updater.go",
				"*This PR was automatically generated. Please review the changes before merging.*",
			},
		},
		{
			name: "Summary with no updates",
			stats: UpdateStats{
				TotalFestivals:   5,
				UpdatedFestivals: 0,
				NewBands:         0,
				UpdatedPrices:    0,
				TotalTokens:      0,
			},
			contains: []string{
				"# 🤖 Automated Festival Information Update",
				"**Total Festivals Processed**: 5",
				"**Festivals Updated**: 0",
				"**New Bands Added**: 0",
				"**Ticket Prices Updated**: 0",
				"*No updates were needed. All festival information is up to date.*",
			},
		},
		{
			name: "Summary with only band updates",
			stats: UpdateStats{
				TotalFestivals:   3,
				UpdatedFestivals: 2,
				NewBands:         5,
				UpdatedPrices:    0,
				TotalTokens:      1500,
			},
			contains: []string{
				"# 🤖 Automated Festival Information Update",
				"**Total Festivals Processed**: 3",
				"**Festivals Updated**: 2",
				"**New Bands Added**: 5",
				"**Ticket Prices Updated**: 0",
			},
		},
		{
			name: "Summary with only price updates",
			stats: UpdateStats{
				TotalFestivals:   3,
				UpdatedFestivals: 1,
				NewBands:         0,
				UpdatedPrices:    1,
				TotalTokens:      800,
			},
			contains: []string{
				"# 🤖 Automated Festival Information Update",
				"**Total Festivals Processed**: 3",
				"**Festivals Updated**: 1",
				"**New Bands Added**: 0",
				"**Ticket Prices Updated**: 1",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			summary := generatePRSummary(&tt.stats)
			for _, substr := range tt.contains {
				if !strings.Contains(summary, substr) {
					t.Errorf("generatePRSummary() missing expected substring: %q", substr)
				}
			}
		})
	}
}

func TestBandHasBeenUpdated(t *testing.T) {
	tests := []struct {
		name     string
		bands    []model.BandRef
		band     model.BandRef
		expected bool
	}{
		{
			name: "Band size changed",
			bands: []model.BandRef{
				{Key: "metallica", Name: "Metallica", Size: 1},
				{Key: "iron-maiden", Name: "Iron Maiden", Size: 2},
			},
			band:     model.BandRef{Key: "metallica", Name: "Metallica", Size: 3},
			expected: true,
		},
		{
			name: "Band name changed",
			bands: []model.BandRef{
				{Key: "metallica", Name: "Metallica", Size: 1},
			},
			band:     model.BandRef{Key: "metallica", Name: "Metallica!", Size: 1},
			expected: true,
		},
		{
			name: "Band unchanged",
			bands: []model.BandRef{
				{Key: "metallica", Name: "Metallica", Size: 1},
			},
			band:     model.BandRef{Key: "metallica", Name: "Metallica", Size: 1},
			expected: false,
		},
		{
			name: "Band not in list",
			bands: []model.BandRef{
				{Key: "metallica", Name: "Metallica", Size: 1},
			},
			band:     model.BandRef{Key: "slayer", Name: "Slayer", Size: 2},
			expected: false,
		},
		{
			name:     "Empty band list",
			bands:    []model.BandRef{},
			band:     model.BandRef{Key: "metallica", Name: "Metallica", Size: 1},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := bandHasBeenUpdated(tt.bands, tt.band)
			if result != tt.expected {
				t.Errorf("bandHasBeenUpdated() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestUpdateBandData(t *testing.T) {
	tests := []struct {
		name             string
		festival         model.Festival
		band             model.BandRef
		expectedBandSize int
		expectedBandName string
	}{
		{
			name: "Update existing band size",
			festival: model.Festival{
				Key:  "wacken-2026",
				Name: "Wacken 2026",
				Bands: []model.BandRef{
					{Key: "metallica", Name: "Metallica", Size: 1},
					{Key: "iron-maiden", Name: "Iron Maiden", Size: 2},
				},
			},
			band:             model.BandRef{Key: "metallica", Name: "Metallica", Size: 3},
			expectedBandSize: 3,
			expectedBandName: "Metallica",
		},
		{
			name: "Update existing band name",
			festival: model.Festival{
				Key:  "wacken-2026",
				Name: "Wacken 2026",
				Bands: []model.BandRef{
					{Key: "metallica", Name: "Metalica", Size: 1},
				},
			},
			band:             model.BandRef{Key: "metallica", Name: "Metallica", Size: 1},
			expectedBandSize: 1,
			expectedBandName: "Metallica",
		},
		{
			name: "Update band in middle of list",
			festival: model.Festival{
				Key:  "test-fest",
				Name: "Test Fest",
				Bands: []model.BandRef{
					{Key: "band1", Name: "Band 1", Size: 1},
					{Key: "band2", Name: "Band 2", Size: 2},
					{Key: "band3", Name: "Band 3", Size: 3},
				},
			},
			band:             model.BandRef{Key: "band2", Name: "Band Two", Size: 5},
			expectedBandSize: 5,
			expectedBandName: "Band Two",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := updateBandData(tt.festival, tt.band)

			// Find the updated band in the result
			found := false
			for _, b := range result.Bands {
				if b.Key == tt.band.Key {
					found = true
					if b.Size != tt.expectedBandSize {
						t.Errorf("Band size = %v, want %v", b.Size, tt.expectedBandSize)
					}
					if b.Name != tt.expectedBandName {
						t.Errorf("Band name = %v, want %v", b.Name, tt.expectedBandName)
					}
					break
				}
			}

			if !found {
				t.Errorf("Band with key %q not found in updated festival", tt.band.Key)
			}
		})
	}
}
