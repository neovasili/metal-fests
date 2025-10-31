package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"

	"github.com/neovasili/metal-fests/internal/data"
	"github.com/neovasili/metal-fests/internal/model"
	"github.com/neovasili/metal-fests/internal/openai"
)

type BandSearchResult struct {
	Error         string         `json:"error,omitempty"`
	Key           string         `json:"key,omitempty"`
	Name          string         `json:"name,omitempty"`
	Country       string         `json:"country,omitempty"`
	Description   string         `json:"description,omitempty"`
	HeadlineImage string         `json:"headlineImage,omitempty"`
	Logo          string         `json:"logo,omitempty"`
	Website       string         `json:"website,omitempty"`
	Spotify       string         `json:"spotify,omitempty"`
	Genres        []string       `json:"genres,omitempty"`
	Members       []model.Member `json:"members,omitempty"`
}

type UpdateStats struct {
	TotalBands       int
	AddedBands       int
	UpdatedBands     int
	SkippedBands     int
	NotFoundBands    int
	TotalTokens      int
	PromptTokens     int
	CompletionTokens int
}

var openaiClient *openai.OpenAIClient

func generateBandKey(bandName string) string {
	// Convert to lowercase
	key := strings.ToLower(bandName)

	// Remove special characters
	reg := regexp.MustCompile(`[^a-z0-9\s-]`)
	key = reg.ReplaceAllString(key, "")

	// Replace spaces with hyphens
	key = strings.ReplaceAll(key, " ", "-")

	// Remove consecutive hyphens
	reg = regexp.MustCompile(`-+`)
	key = reg.ReplaceAllString(key, "-")

	// Trim hyphens from start and end
	key = strings.Trim(key, "-")

	return key
}

func isBandComplete(band model.Band) bool {
	if band.Key == "" || band.Name == "" || band.Country == "" || band.Description == "" {
		return false
	}
	if band.HeadlineImage == "" || band.Logo == "" || band.Website == "" || band.Spotify == "" {
		return false
	}
	if len(band.Genres) == 0 || len(band.Members) == 0 {
		return false
	}
	return true
}

func searchBandInfo(promptTemplate, bandName string, dryRun bool) (*BandSearchResult, int, error) {
	userPrompt := strings.ReplaceAll(promptTemplate, "{{ BAND_NAME }}", bandName)
	systemPrompt := "Metal band data curator. Return valid compact JSON only. No markdown, no explanations, no extra text."

	resp, err := openaiClient.AskOpenAI(systemPrompt, userPrompt, dryRun)
	if err != nil {
		return nil, 0, err
	}

	if resp == nil {
		return nil, 0, fmt.Errorf("no response from OpenAI")
	}
	if len(resp.OutputText()) == 0 {
		return nil, int(resp.Usage.TotalTokens), fmt.Errorf("empty response from OpenAI")
	}

	content := strings.TrimSpace(resp.OutputText())

	var result BandSearchResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, int(resp.Usage.TotalTokens), fmt.Errorf("failed to parse OpenAI response: %w", err)
	}
	result.Key = generateBandKey(result.Name)

	return &result, int(resp.Usage.TotalTokens), nil
}

func mergeBandData(existing *model.Band, updated *BandSearchResult) bool {
	hasChanges := false

	if existing.Country == "" && updated.Country != "" {
		existing.Country = updated.Country
		hasChanges = true
	}
	if existing.Description == "" && updated.Description != "" {
		existing.Description = updated.Description
		hasChanges = true
	}
	if existing.HeadlineImage == "" && updated.HeadlineImage != "" {
		existing.HeadlineImage = updated.HeadlineImage
		hasChanges = true
	}
	if existing.Logo == "" && updated.Logo != "" {
		existing.Logo = updated.Logo
		hasChanges = true
	}
	if existing.Website == "" && updated.Website != "" {
		existing.Website = updated.Website
		hasChanges = true
	}
	if existing.Spotify == "" && updated.Spotify != "" {
		existing.Spotify = updated.Spotify
		hasChanges = true
	}
	if len(existing.Genres) == 0 && len(updated.Genres) > 0 {
		existing.Genres = updated.Genres
		hasChanges = true
	}
	if len(existing.Members) == 0 && len(updated.Members) > 0 {
		existing.Members = updated.Members
		hasChanges = true
	}

	return hasChanges
}

func addMissingBands(promptTemplate, bandName string, dryRun bool) *UpdateStats {
	stats := &UpdateStats{}

	// Collect all bands from festivals
	festivalBands, err := data.CollectAllFestivalBands()
	if err != nil {
		fmt.Printf("  ⚠️  Error fetching festival bands: %v\n", err)
		return stats
	}

	// Filter by band name if provided
	if bandName != "" {
		found := false
		for _, band := range festivalBands {
			if band.Name == bandName {
				festivalBands = []model.BandRef{band}
				found = true
				break
			}
		}
		if !found {
			fmt.Printf("  ⚠️  Band '%s' not found in any festival\n", bandName)
			return stats
		}
	}

	stats.TotalBands = len(festivalBands)

	fmt.Printf("Found %d unique bands in festivals\n", stats.TotalBands)

	// Get existing bands
	existingBandsList, err := data.GetBands()
	if err != nil {
		fmt.Printf("  ⚠️  Error fetching bands: %v\n", err)
		return stats
	}

	// Create a map of existing bands for quick lookup
	existingBands := make(map[string]*model.Band)
	for i := range existingBandsList {
		existingBands[existingBandsList[i].Key] = &existingBandsList[i]
	}

	// Process each band
	for i, band := range festivalBands {
		fmt.Printf("\n[%d/%d] Processing '%s'...\n", i+1, stats.TotalBands, band.Name)

		bandKey := band.Key
		existingBand, exists := existingBands[bandKey]

		// Check if band exists and is complete
		if exists && isBandComplete(*existingBand) {
			fmt.Printf("  ✓ Band already exists and is complete\n")
			stats.SkippedBands++
			continue
		}

		// Search for band information
		result, tokens, err := searchBandInfo(promptTemplate, band.Name, dryRun)
		if err != nil {
			fmt.Printf("  ⚠️  Error: %v\n", err)
			continue
		}

		stats.TotalTokens += tokens

		// Check if band was found
		if result.Error != "" {
			fmt.Printf("  ⚠️  Band not found\n")
			stats.NotFoundBands++
			continue
		}

		result.Name = cases.Title(language.English).String(result.Name)

		// Ensure music genres and band members roles are properly capitalized
		for i := range result.Genres {
			result.Genres[i] = cases.Title(language.English).String(result.Genres[i])
		}
		for i := range result.Members {
			result.Members[i].Name = cases.Title(language.English).String(result.Members[i].Name)
		}

		if exists {
			// Update existing band
			if mergeBandData(existingBand, result) {
				if err := data.UpdateBandInDatabase(*existingBand); err != nil {
					fmt.Printf("  ⚠️  Error updating band in database: %v\n", err)
					continue
				}
				fmt.Printf("  ✓ Updated existing band data\n")
				stats.UpdatedBands++
			} else {
				fmt.Printf("  - No new data to update\n")
				stats.SkippedBands++
			}
		} else {
			// Add new band
			newBand := model.Band{
				Key:           result.Key,
				Name:          result.Name,
				Country:       result.Country,
				Description:   result.Description,
				HeadlineImage: result.HeadlineImage,
				Logo:          result.Logo,
				Website:       result.Website,
				Spotify:       result.Spotify,
				Genres:        result.Genres,
				Members:       result.Members,
			}

			if err := data.AddBandToDatabase(newBand); err != nil {
				fmt.Printf("  ⚠️  Error adding band to database: %v\n", err)
				continue
			}
			existingBands[newBand.Key] = &newBand
			fmt.Printf("  ✓ Added new band\n")
			stats.AddedBands++
		}

		fmt.Printf("  📊 Tokens used: %d\n", tokens)
	}

	return stats
}

func generateSummary(stats *UpdateStats) string {
	var buf bytes.Buffer

	buf.WriteString("# 🤖 Automated Bands Information Update\n\n")
	buf.WriteString("This PR contains automated updates to band information.\n\n")
	buf.WriteString("## 📊 Update Statistics\n\n")
	buf.WriteString(fmt.Sprintf("- **Total Bands Processed**: %d\n", stats.TotalBands))
	buf.WriteString(fmt.Sprintf("- **New Bands Added**: %d\n", stats.AddedBands))
	buf.WriteString(fmt.Sprintf("- **Existing Bands Updated**: %d\n", stats.UpdatedBands))
	buf.WriteString(fmt.Sprintf("- **Bands Skipped** (already complete): %d\n", stats.SkippedBands))
	buf.WriteString(fmt.Sprintf("- **Bands Not Found**: %d\n", stats.NotFoundBands))
	buf.WriteString("\n## 🤖 AI Usage Statistics\n\n")
	buf.WriteString(fmt.Sprintf("- **Total Tokens**: %d\n", stats.TotalTokens))
	buf.WriteString("- **Model**: gpt-4.1-mini\n")
	buf.WriteString("\n## ⚙️ Automation Details\n\n")
	buf.WriteString(fmt.Sprintf("- **Run Date**: %s\n", time.Now().Format("2006-01-02 15:04:05 UTC")))
	buf.WriteString("- **Source**: GitHub Actions Workflow\n")
	buf.WriteString("- **Script**: `scripts/band_updater.go`\n")

	if stats.AddedBands == 0 && stats.UpdatedBands == 0 {
		buf.WriteString("\n---\n")
		buf.WriteString("*No updates were needed. All band information is up to date.*\n")
	} else {
		buf.WriteString("\n---\n")
		buf.WriteString("*This PR was automatically generated. Please review the changes before merging.*\n")
	}

	return buf.String()
}

func main() {
	// Parse command line flags
	dryRun := false
	bandName := ""

	flag.BoolVar(&dryRun, "dry-run", false, "Enable dry run mode")
	flag.StringVar(&bandName, "band", "", "Specify band name")
	flag.Parse()

	if dryRun {
		fmt.Println("🔍 DRY-RUN MODE: No API calls will be made, no files will be modified")
		fmt.Println()
	}

	if bandName != "" {
		fmt.Printf("🎯 Single band mode: %s\n\n", bandName)
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" && !dryRun {
		fmt.Fprintf(os.Stderr, "Error: OPENAI_API_KEY environment variable not set\n")
		os.Exit(1)
	}

	openaiClient = openai.NewOpenAIClient(apiKey)

	// Load prompt template
	promptTemplate, err := openai.LoadPromptFile("scripts/band_prompt.md")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading prompt template: %v\n", err)
		os.Exit(1)
	}

	// Add missing bands
	stats := addMissingBands(promptTemplate, bandName, dryRun)

	// Generate summary
	summary := generateSummary(stats)
	if err := os.WriteFile("band_update_summary.md", []byte(summary), 0600); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing summary: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n✅ Band update completed successfully!")
	fmt.Printf("📄 Summary written to band_update_summary.md\n")
}
