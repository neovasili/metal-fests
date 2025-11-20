package main

import (
	"testing"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

func TestLevenshteinDistance(t *testing.T) {
	tests := []struct {
		name     string
		s1       string
		s2       string
		expected int
	}{
		{
			name:     "Identical strings",
			s1:       "hello",
			s2:       "hello",
			expected: 0,
		},
		{
			name:     "One character difference",
			s1:       "hello",
			s2:       "hallo",
			expected: 1,
		},
		{
			name:     "Empty strings",
			s1:       "",
			s2:       "",
			expected: 0,
		},
		{
			name:     "Empty to non-empty",
			s1:       "",
			s2:       "hello",
			expected: 5,
		},
		{
			name:     "Multiple operations",
			s1:       "kitten",
			s2:       "sitting",
			expected: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := levenshteinDistance(tt.s1, tt.s2)
			if result != tt.expected {
				t.Errorf("levenshteinDistance(%q, %q) = %d, want %d", tt.s1, tt.s2, result, tt.expected)
			}
		})
	}
}

func TestMinInt(t *testing.T) {
	tests := []struct {
		name     string
		a        int
		b        int
		c        int
		expected int
	}{
		{
			name:     "a is minimum",
			a:        1,
			b:        2,
			c:        3,
			expected: 1,
		},
		{
			name:     "b is minimum",
			a:        3,
			b:        1,
			c:        2,
			expected: 1,
		},
		{
			name:     "c is minimum",
			a:        3,
			b:        2,
			c:        1,
			expected: 1,
		},
		{
			name:     "All equal",
			a:        5,
			b:        5,
			c:        5,
			expected: 5,
		},
		{
			name:     "Negative numbers",
			a:        -5,
			b:        -2,
			c:        -10,
			expected: -10,
		},
		{
			name:     "Zero included",
			a:        0,
			b:        1,
			c:        2,
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := minInt(tt.a, tt.b, tt.c)
			if result != tt.expected {
				t.Errorf("minInt(%d, %d, %d) = %d, want %d", tt.a, tt.b, tt.c, result, tt.expected)
			}
		})
	}
}

func TestIsProperlyCapitalized(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		expected bool
	}{
		{
			name:     "Properly capitalized single word",
			text:     "Metal",
			expected: true,
		},
		{
			name:     "Properly capitalized multiple words",
			text:     "Heavy Metal",
			expected: true,
		},
		{
			name:     "All lowercase",
			text:     "heavy metal",
			expected: false,
		},
		{
			name:     "All uppercase",
			text:     "HEAVY METAL",
			expected: false,
		},
		{
			name:     "Empty string",
			text:     "",
			expected: false,
		},
		{
			name:     "Single character capitalized",
			text:     "A",
			expected: true,
		},
		{
			name:     "Single character lowercase",
			text:     "a",
			expected: false,
		},
		{
			name:     "Title case with articles",
			text:     cases.Title(language.English).String("the quick brown fox"),
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isProperlyCapitalized(tt.text)
			if result != tt.expected {
				t.Errorf("isProperlyCapitalized(%q) = %v, want %v", tt.text, result, tt.expected)
			}
		})
	}
}

func TestColorize(t *testing.T) {
	tests := []struct {
		name  string
		text  string
		color string
	}{
		{
			name:  "Red color",
			text:  "Error",
			color: ColorRed,
		},
		{
			name:  "Green color",
			text:  "Success",
			color: ColorGreen,
		},
		{
			name:  "Empty text",
			text:  "",
			color: ColorBlue,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := colorize(tt.text, tt.color)
			if result == "" && tt.text != "" {
				t.Errorf("colorize(%q, %q) returned empty string", tt.text, tt.color)
			}
		})
	}
}
