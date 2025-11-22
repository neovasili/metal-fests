package main

import (
	"strings"
	"testing"

	"github.com/neovasili/metal-fests/internal/model"
)

func TestGenerateBandKey(t *testing.T) {
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
			name:     "Band name with special characters",
			bandName: "Motörhead",
			expected: "motrhead",
		},
		{
			name:     "Band name with ampersand and spaces",
			bandName: "Judas Priest & Friends",
			expected: "judas-priest-friends",
		},
		{
			name:     "Band name with multiple consecutive spaces",
			bandName: "Foo   Bar",
			expected: "foo-bar",
		},
		{
			name:     "Band name with leading and trailing hyphens",
			bandName: "---Test Band---",
			expected: "test-band",
		},
		{
			name:     "Band name with numbers",
			bandName: "AC/DC 2024",
			expected: "acdc-2024",
		},
		{
			name:     "Band name all uppercase",
			bandName: "BLACK SABBATH",
			expected: "black-sabbath",
		},
		{
			name:     "Band name with parentheses",
			bandName: "Foo (Band) Bar",
			expected: "foo-band-bar",
		},
		{
			name:     "Band name with dots",
			bandName: "A.B.C. Band",
			expected: "abc-band",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := generateBandKey(tt.bandName)
			if result != tt.expected {
				t.Errorf("generateBandKey(%q) = %q, want %q", tt.bandName, result, tt.expected)
			}
		})
	}
}

func TestIsBandComplete(t *testing.T) {
	completeBand := model.Band{
		Key:           "metallica",
		Name:          "Metallica",
		Country:       "USA",
		Description:   "American heavy metal band",
		HeadlineImage: "https://example.com/image.jpg",
		Logo:          "https://example.com/logo.png",
		Website:       "https://metallica.com",
		Spotify:       "https://open.spotify.com/artist/123",
		Genres:        []string{"Heavy Metal", "Thrash Metal"},
		Members: []model.Member{
			{Name: "James Hetfield", Role: "Vocals"},
		},
	}

	tests := []struct {
		name     string
		band     model.Band
		expected bool
	}{
		{
			name:     "Complete band",
			band:     completeBand,
			expected: true,
		},
		{
			name: "Missing key",
			band: model.Band{
				Name:          "Metallica",
				Country:       "USA",
				Description:   "American heavy metal band",
				HeadlineImage: "https://example.com/image.jpg",
				Logo:          "https://example.com/logo.png",
				Website:       "https://metallica.com",
				Spotify:       "https://open.spotify.com/artist/123",
				Genres:        []string{"Heavy Metal"},
				Members: []model.Member{
					{Name: "James Hetfield", Role: "Vocals"},
				},
			},
			expected: false,
		},
		{
			name: "Missing name",
			band: model.Band{
				Key:           "metallica",
				Country:       "USA",
				Description:   "American heavy metal band",
				HeadlineImage: "https://example.com/image.jpg",
				Logo:          "https://example.com/logo.png",
				Website:       "https://metallica.com",
				Spotify:       "https://open.spotify.com/artist/123",
				Genres:        []string{"Heavy Metal"},
				Members: []model.Member{
					{Name: "James Hetfield", Role: "Vocals"},
				},
			},
			expected: false,
		},
		{
			name:     "Empty band",
			band:     model.Band{},
			expected: false,
		},
		{
			name: "Empty genres",
			band: model.Band{
				Key:           "metallica",
				Name:          "Metallica",
				Country:       "USA",
				Description:   "American heavy metal band",
				HeadlineImage: "https://example.com/image.jpg",
				Logo:          "https://example.com/logo.png",
				Website:       "https://metallica.com",
				Spotify:       "https://open.spotify.com/artist/123",
				Genres:        []string{},
				Members: []model.Member{
					{Name: "James Hetfield", Role: "Vocals"},
				},
			},
			expected: false,
		},
		{
			name: "Empty members",
			band: model.Band{
				Key:           "metallica",
				Name:          "Metallica",
				Country:       "USA",
				Description:   "American heavy metal band",
				HeadlineImage: "https://example.com/image.jpg",
				Logo:          "https://example.com/logo.png",
				Website:       "https://metallica.com",
				Spotify:       "https://open.spotify.com/artist/123",
				Genres:        []string{"Heavy Metal"},
				Members:       []model.Member{},
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isBandComplete(tt.band)
			if result != tt.expected {
				t.Errorf("isBandComplete() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestMergeBandData(t *testing.T) {
	tests := []struct {
		name            string
		existing        model.Band
		updated         BandSearchResult
		expectedChanges bool
		checkField      func(model.Band) bool
	}{
		{
			name: "Update country when empty",
			existing: model.Band{
				Key:     "metallica",
				Name:    "Metallica",
				Country: "",
			},
			updated: BandSearchResult{
				Country: "USA",
			},
			expectedChanges: true,
			checkField: func(b model.Band) bool {
				return b.Country == "USA"
			},
		},
		{
			name: "Do not update country when not empty",
			existing: model.Band{
				Key:     "metallica",
				Name:    "Metallica",
				Country: "USA",
			},
			updated: BandSearchResult{
				Country: "Canada",
			},
			expectedChanges: false,
			checkField: func(b model.Band) bool {
				return b.Country == "USA"
			},
		},
		{
			name: "Update genres when empty",
			existing: model.Band{
				Key:    "metallica",
				Name:   "Metallica",
				Genres: []string{},
			},
			updated: BandSearchResult{
				Genres: []string{"Heavy Metal", "Thrash Metal"},
			},
			expectedChanges: true,
			checkField: func(b model.Band) bool {
				return len(b.Genres) == 2 && b.Genres[0] == "Heavy Metal" && b.Genres[1] == "Thrash Metal"
			},
		},
		{
			name: "Do not update genres when not empty",
			existing: model.Band{
				Key:    "metallica",
				Name:   "Metallica",
				Genres: []string{"Heavy Metal"},
			},
			updated: BandSearchResult{
				Genres: []string{"Thrash Metal"},
			},
			expectedChanges: false,
			checkField: func(b model.Band) bool {
				return len(b.Genres) == 1 && b.Genres[0] == "Heavy Metal"
			},
		},
		{
			name: "Update members when empty",
			existing: model.Band{
				Key:     "metallica",
				Name:    "Metallica",
				Members: []model.Member{},
			},
			updated: BandSearchResult{
				Members: []model.Member{
					{Name: "James Hetfield", Role: "Vocals"},
				},
			},
			expectedChanges: true,
			checkField: func(b model.Band) bool {
				return len(b.Members) == 1 && b.Members[0].Name == "James Hetfield"
			},
		},
		{
			name: "Multiple updates at once",
			existing: model.Band{
				Key:     "metallica",
				Name:    "Metallica",
				Country: "",
				Website: "",
			},
			updated: BandSearchResult{
				Country: "USA",
				Website: "https://metallica.com",
			},
			expectedChanges: true,
			checkField: func(b model.Band) bool {
				return b.Country == "USA" && b.Website == "https://metallica.com"
			},
		},
		{
			name: "No updates when all fields exist",
			existing: model.Band{
				Key:           "metallica",
				Name:          "Metallica",
				Country:       "USA",
				Description:   "Band",
				HeadlineImage: "image.jpg",
				Logo:          "logo.png",
				Website:       "website.com",
				Spotify:       "spotify.com",
				Genres:        []string{"Metal"},
				Members:       []model.Member{{Name: "Member"}},
			},
			updated: BandSearchResult{
				Country:       "Canada",
				Description:   "New description",
				HeadlineImage: "new.jpg",
				Logo:          "new.png",
				Website:       "new.com",
				Spotify:       "new-spotify.com",
				Genres:        []string{"New Genre"},
				Members:       []model.Member{{Name: "New Member"}},
			},
			expectedChanges: false,
			checkField: func(b model.Band) bool {
				return b.Country == "USA" && b.Description == "Band"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mergeBandData(&tt.existing, &tt.updated)
			if result != tt.expectedChanges {
				t.Errorf("mergeBandData() = %v, want %v", result, tt.expectedChanges)
			}
			if !tt.checkField(tt.existing) {
				t.Errorf("mergeBandData() did not update fields as expected")
			}
		})
	}
}

func TestGenerateSummary(t *testing.T) {
	tests := []struct {
		name     string
		stats    UpdateStats
		contains []string
	}{
		{
			name: "Summary with updates",
			stats: UpdateStats{
				TotalBands:    10,
				AddedBands:    3,
				UpdatedBands:  2,
				SkippedBands:  4,
				NotFoundBands: 1,
				TotalTokens:   5000,
				TotalCost:     0.15,
				UsedModel:     "gpt-4o-mini",
			},
			contains: []string{
				"# 🤖 Automated Bands Information Update",
				"**Total Bands Processed**: 10",
				"**New Bands Added**: 3",
				"**Existing Bands Updated**: 2",
				"**Bands Skipped**",
				"**Bands Not Found**: 1",
				"**Total Tokens**: 5000",
				"**Total Cost**: 0.15 €",
				"gpt-4o-mini",
				"scripts/band_updater.go",
				"*This PR was automatically generated. Please review the changes before merging.*",
			},
		},
		{
			name: "Summary with no updates",
			stats: UpdateStats{
				TotalBands:    10,
				AddedBands:    0,
				UpdatedBands:  0,
				SkippedBands:  10,
				NotFoundBands: 0,
				TotalTokens:   0,
			},
			contains: []string{
				"# 🤖 Automated Bands Information Update",
				"**Total Bands Processed**: 10",
				"**New Bands Added**: 0",
				"**Existing Bands Updated**: 0",
				"*No updates were needed. All band information is up to date.*",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			summary := generateSummary(&tt.stats)
			for _, substr := range tt.contains {
				if !strings.Contains(summary, substr) {
					t.Errorf("generateSummary() missing expected substring: %q", substr)
				}
			}
		})
	}
}
