package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/neovasili/metal-fests/internal/model"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

type OpenAIRequest struct {
	Model       string          `json:"model"`
	Messages    []OpenAIMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
	Tools       []OpenAITool    `json:"tools,omitempty"`
}

type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAITool struct {
	Type     string             `json:"type"`
	Function OpenAIToolFunction `json:"function"`
}

type OpenAIToolFunction struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
}

type OpenAIResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

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

func loadPromptFile(filename string) (string, error) {
	// #nosec G304 - filename comes from validated command-line arguments
	data, err := os.ReadFile(filename)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func loadDatabase(filename string) (*model.Database, error) {
	// #nosec G304 - filename comes from validated command-line arguments
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var db model.Database
	if err := json.Unmarshal(data, &db); err != nil {
		return nil, err
	}

	return &db, nil
}

func saveDatabase(filename string, db *model.Database) error {
	data, err := json.MarshalIndent(db, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0600)
}

func askOpenAI(apiKey, systemPrompt, userPrompt string) (*OpenAIResponse, error) {
	reqBody := OpenAIRequest{
		Model: "gpt-4.1-mini",
		Messages: []OpenAIMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.3,
		Tools: []OpenAITool{
			{
				Type: "web_search",
				Function: OpenAIToolFunction{
					Name:        "web_search",
					Description: "Search the web for current information",
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to close response body: %v\n", err)
		}
	}()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OpenAI API error: %s - %s", resp.Status, string(body))
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return nil, err
	}

	return &openAIResp, nil
}

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

func collectAllFestivalBands(db *model.Database) []string {
	bandSet := make(map[string]bool)

	for _, festival := range db.Festivals {
		for _, bandRef := range festival.Bands {
			bandSet[bandRef.Name] = true
		}
	}

	bands := make([]string, 0, len(bandSet))
	for band := range bandSet {
		bands = append(bands, band)
	}

	return bands
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

func searchBandInfo(apiKey, promptTemplate, bandName string, dryRun bool) (*BandSearchResult, int, error) {
	userPrompt := strings.ReplaceAll(promptTemplate, "{{ BAND_NAME }}", bandName)

	if dryRun {
		fmt.Printf("  [DRY-RUN] Would call OpenAI API with prompt for %s\n", bandName)
		// Return empty result in dry-run mode
		return &BandSearchResult{
			Error: "",
		}, 0, nil
	}

	systemPrompt := "Metal band data curator. Return valid compact JSON only. No markdown, no explanations, no extra text."

	resp, err := askOpenAI(apiKey, systemPrompt, userPrompt)
	if err != nil {
		return nil, 0, err
	}

	if len(resp.Choices) == 0 {
		return nil, resp.Usage.TotalTokens, fmt.Errorf("no response from OpenAI")
	}

	content := strings.TrimSpace(resp.Choices[0].Message.Content)

	var result BandSearchResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, resp.Usage.TotalTokens, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	return &result, resp.Usage.TotalTokens, nil
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

func addMissingBands(apiKey, promptTemplate string, db *model.Database, dryRun bool) *UpdateStats {
	stats := &UpdateStats{}

	// Collect all bands from festivals
	festivalBands := collectAllFestivalBands(db)
	stats.TotalBands = len(festivalBands)

	fmt.Printf("Found %d unique bands in festivals\n", stats.TotalBands)

	// Create a map of existing bands for quick lookup
	existingBands := make(map[string]*model.Band)
	for i := range db.Bands {
		existingBands[db.Bands[i].Key] = &db.Bands[i]
	}

	// Process each band
	for i, bandName := range festivalBands {
		fmt.Printf("\n[%d/%d] Processing '%s'...\n", i+1, stats.TotalBands, bandName)

		bandKey := generateBandKey(bandName)
		existingBand, exists := existingBands[bandKey]

		// Check if band exists and is complete
		if exists && isBandComplete(*existingBand) {
			fmt.Printf("  ✓ Band already exists and is complete\n")
			stats.SkippedBands++
			continue
		}

		// Search for band information
		result, tokens, err := searchBandInfo(apiKey, promptTemplate, bandName, dryRun)
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

		if exists {
			// Update existing band
			if mergeBandData(existingBand, result) {
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

			db.Bands = append(db.Bands, newBand)
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
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" || arg == "-d" {
			dryRun = true
		}
	}

	if dryRun {
		fmt.Println("🔍 DRY-RUN MODE: No API calls will be made, no files will be modified")
		fmt.Println()
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" && !dryRun {
		fmt.Fprintf(os.Stderr, "Error: OPENAI_API_KEY environment variable not set\n")
		os.Exit(1)
	}

	// Load prompt template
	promptTemplate, err := loadPromptFile("scripts/band_prompt.md")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading prompt template: %v\n", err)
		os.Exit(1)
	}

	// Load database
	db, err := loadDatabase("db.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading database: %v\n", err)
		os.Exit(1)
	}

	// Add missing bands
	stats := addMissingBands(apiKey, promptTemplate, db, dryRun)

	if !dryRun {
		// Save updated database
		if err := saveDatabase("db.json", db); err != nil {
			fmt.Fprintf(os.Stderr, "Error saving database: %v\n", err)
			os.Exit(1)
		}

		// Generate summary
		summary := generateSummary(stats)
		if err := os.WriteFile("band_update_summary.md", []byte(summary), 0600); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing summary: %v\n", err)
			os.Exit(1)
		}

		fmt.Println("\n✅ Band update completed successfully!")
		fmt.Printf("📄 Summary written to band_update_summary.md\n")
	} else {
		fmt.Println("\n✅ Dry-run completed successfully!")
		fmt.Println("📄 No files were modified")
	}
}
