package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/neovasili/metal-fests/internal/data"
	"github.com/neovasili/metal-fests/internal/model"
	"github.com/neovasili/metal-fests/internal/openai"
)

type FestivalUpdateResult struct {
	Bands       []model.BandRef `json:"bands"`
	TicketPrice *float64        `json:"ticketPrice"`
}

type FestivalChange struct {
	Name         string
	NewBands     []string
	UpdatedBands []string
	OldPrice     float64
	NewPrice     float64
	PriceUpdated bool
}

type UpdateStats struct {
	TotalFestivals   int
	UpdatedFestivals int
	NewBands         int
	UpdatedPrices    int
	TotalTokens      int
	TotalCost        float64
	UsedModel        string
	PromptTokens     int
	CompletionTokens int
	Changes          []FestivalChange
}

var openaiClient *openai.OpenAIClient

func searchFestivalInfo(promptTemplate string, festival model.Festival, useFallbackModel bool, dryRun bool) (*FestivalUpdateResult, int, float64, string, error) {
	userPrompt := strings.ReplaceAll(promptTemplate, "{{ FESTIVAL_NAME }}", festival.Name)
	userPrompt = strings.ReplaceAll(userPrompt, "{{ FESTIVAL_LOCATION }}", festival.Location)
	userPrompt = strings.ReplaceAll(userPrompt, "{{ FESTIVAL_URL }}", festival.Website)

	usedTokens := 0
	estimatedCost := 0.0
	usedModel := ""

	var festivalJsonSchema = map[string]any{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]any{
			"bands": map[string]any{
				"type":                 "array",
				"additionalProperties": false,
				"items": map[string]any{
					"type":                 "object",
					"additionalProperties": false,
					"properties": map[string]any{
						"name": map[string]any{"type": "string", "additionalProperties": false},
						"size": map[string]any{"type": "integer", "additionalProperties": false},
					},
					"required": []string{"name", "size"},
				},
			},
			"ticketPrice": map[string]any{
				"type":                 []any{"integer", "null"},
				"additionalProperties": false,
			},
		},
		"required": []string{"bands", "ticketPrice"},
	}

	modelToUse := openai.PrimaryModel
	if useFallbackModel {
		modelToUse = openai.FallbackModel
	}

	resp, err := openaiClient.AskOpenAI(userPrompt, festivalJsonSchema, modelToUse, dryRun)
	if err != nil {
		return nil, usedTokens, estimatedCost, usedModel, err
	}

	if resp == nil {
		return nil, usedTokens, estimatedCost, usedModel, fmt.Errorf("no response from OpenAI")
	}
	usedTokens = resp.TotalUsedTokens
	estimatedCost = resp.EstimatedCost
	usedModel = string(resp.UsedModel)
	fmt.Printf("🧠 Used model: %s\n", usedModel)
	fmt.Printf("📊 Tokens used: %d\n", usedTokens)
	fmt.Printf("💰 Estimated cost: $%.2f\n", estimatedCost)
	if len(resp.OutputText) == 0 {
		return nil, usedTokens, estimatedCost, usedModel, fmt.Errorf("empty response from OpenAI")
	}

	content := strings.TrimSpace(resp.OutputText)
	var result FestivalUpdateResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, usedTokens, estimatedCost, usedModel, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	return &result, usedTokens, estimatedCost, usedModel, nil
}

func updateExistingFestivals(promptTemplate string, dryRun bool, festivalName string, openaiResponseFilePath string) *UpdateStats {
	festivals, err := data.GetFestivals()
	if err != nil {
		fmt.Printf("  ⚠️  Error fetching festivals: %v\n", err)
	}

	// Filter by festival name if provided
	if festivalName != "" {
		filteredFestivals := make([]model.Festival, 0)
		for _, festival := range festivals {
			if festival.Name == festivalName {
				filteredFestivals = append(filteredFestivals, festival)
				break
			}
		}
		if len(filteredFestivals) == 0 {
			fmt.Printf("  ⚠️  Festival '%s' not found\n", festivalName)
			return &UpdateStats{}
		}
		festivals = filteredFestivals
	}

	stats := &UpdateStats{
		TotalFestivals: len(festivals),
	}

	fmt.Printf("Updating %d festivals...\n", stats.TotalFestivals)

	for index, festival := range festivals {
		fmt.Printf("\n[%d/%d] Processing %s...\n", index+1, stats.TotalFestivals, festival.Name)

		var result = &FestivalUpdateResult{}
		var tokens int
		var cost float64
		var usedModel string
		if openaiResponseFilePath != "" && festivalName != "" {
			// Load OpenAI response from file for testing
			// #nosec G304 -- This is a command-line script where the file path is provided by the user
			content, err := os.ReadFile(openaiResponseFilePath)
			if err != nil {
				fmt.Printf("  ⚠️  Error reading OpenAI response file: %v\n", err)
				continue
			}
			fmt.Println(string(content))
			if err := json.Unmarshal(content, result); err != nil {
				fmt.Printf("  ⚠️  Error parsing OpenAI response file: %v\n", err)
				continue
			}
			fmt.Printf("🧠 Loaded OpenAI response from file: %s\n", openaiResponseFilePath)
		} else {
			result, tokens, cost, usedModel, err = searchFestivalInfo(promptTemplate, festival, false, dryRun)
			stats.TotalTokens += tokens
			stats.TotalCost += cost
			stats.UsedModel = usedModel
			if err != nil {
				fmt.Printf("  ⚠️  Error: %v\n", err)
				continue
			}
			if result == nil {
				fmt.Println("  ℹ️  Dry-run mode: skipping update")
				continue
			}
			// If no bands or ticket price found, retry with fallback model
			if len(result.Bands) == 0 && result.TicketPrice == nil {
				result, tokens, cost, usedModel, err = searchFestivalInfo(promptTemplate, festival, true, dryRun)
				stats.TotalTokens += tokens
				stats.TotalCost += cost
				stats.UsedModel = usedModel
				if err != nil {
					fmt.Printf("  ⚠️  Error: %v\n", err)
					continue
				}
			}
		}

		updated := false
		festivalChange := FestivalChange{
			Name: festival.Name,
		}

		// Update bands if new ones found
		if len(result.Bands) > 0 {
			oldBandCount := len(festival.Bands)
			newBands := make([]model.BandRef, 0)
			updatedBands := make([]model.BandRef, 0)

			for _, bandRef := range result.Bands {
				normalizedBandName := data.NormalizeBandName(bandRef.Name)
				band := model.BandRef{
					Key:  data.GenerateBandKey(normalizedBandName),
					Name: normalizedBandName,
					Size: bandRef.Size,
				}
				if !containsBand(festival.Bands, band.Name) {
					newBands = append(newBands, model.BandRef{Key: band.Key, Name: band.Name, Size: band.Size})
					festivalChange.NewBands = append(festivalChange.NewBands, band.Name)
				} else {
					if bandHasBeenUpdated(festival.Bands, band) {
						updatedBands = append(updatedBands, band)
						festivalChange.UpdatedBands = append(festivalChange.UpdatedBands, band.Name)
					}
				}
			}

			if len(newBands) > 0 {
				festival.Bands = append(festival.Bands, newBands...)
				stats.NewBands += len(newBands)
				updated = true
				fmt.Printf("  ✓ Added %d new bands (total: %d → %d)\n", len(newBands), oldBandCount, len(festival.Bands))
			} else {
				fmt.Printf("  - No new bands to add\n")
			}

			if len(updatedBands) > 0 {
				for _, bandRef := range updatedBands {
					festival = updateBandData(festival, bandRef)
				}
				fmt.Printf("  ✓ Updated %d existing bands\n", len(updatedBands))
				updated = true
			}
		}

		// Update ticket price if available and different
		if result.TicketPrice != nil && festival.TicketPrice == 0 {
			festivalChange.OldPrice = festival.TicketPrice
			festivalChange.NewPrice = *result.TicketPrice
			festivalChange.PriceUpdated = true
			oldPrice := fmt.Sprintf("%.2f€", festival.TicketPrice)
			festival.TicketPrice = *result.TicketPrice
			stats.UpdatedPrices++
			updated = true
			fmt.Printf("  ✓ Updated ticket price: %s → %.2f€\n", oldPrice, *result.TicketPrice)
		}

		if updated {
			stats.UpdatedFestivals++
			stats.Changes = append(stats.Changes, festivalChange)
			err = data.UpdateFestivalInDatabase(festival)
			if err != nil {
				fmt.Printf("  ⚠️  Error updating festival in database: %v\n", err)
			}
		}
	}

	return stats
}

// Check if a band is already in the festival's band list
func containsBand(bands []model.BandRef, bandName string) bool {
	for _, band := range bands {
		if band.Name == bandName {
			return true
		}
	}
	return false
}

// Check if a band has been updated
func bandHasBeenUpdated(bands []model.BandRef, band model.BandRef) bool {
	for _, b := range bands {
		if b.Key == band.Key {
			if b.Name != band.Name || b.Size != band.Size {
				return true
			}
		}
	}
	return false
}

// Updates a band data in a festival's band list
func updateBandData(festival model.Festival, band model.BandRef) model.Festival {
	for i, b := range festival.Bands {
		if b.Key == band.Key {
			festival.Bands[i] = model.BandRef{
				Key:  band.Key,
				Name: band.Name,
				Size: band.Size,
			}
			break
		}
	}
	return festival
}

func generatePRSummary(stats *UpdateStats) string {
	var buf bytes.Buffer

	buf.WriteString("# 🤖 Automated Festival Information Update\n\n")
	buf.WriteString("This PR contains automated updates to festival information.\n\n")
	buf.WriteString("## 📊 Update Statistics\n\n")
	buf.WriteString(fmt.Sprintf("- **Total Festivals Processed**: %d\n", stats.TotalFestivals))
	buf.WriteString(fmt.Sprintf("- **Festivals Updated**: %d\n", stats.UpdatedFestivals))
	buf.WriteString(fmt.Sprintf("- **New Bands Added**: %d\n", stats.NewBands))
	buf.WriteString(fmt.Sprintf("- **Ticket Prices Updated**: %d\n", stats.UpdatedPrices))
	buf.WriteString("\n## 🤖 AI Usage Statistics\n\n")
	buf.WriteString(fmt.Sprintf("- **Total Tokens**: %d\n", stats.TotalTokens))
	buf.WriteString(fmt.Sprintf("- **Total Cost**: %.2f €\n", stats.TotalCost))
	buf.WriteString(fmt.Sprintf("- **Model**: %s\n", stats.UsedModel))
	buf.WriteString("\n## ⚙️ Automation Details\n\n")
	buf.WriteString(fmt.Sprintf("- **Run Date**: %s\n", time.Now().Format("2006-01-02 15:04:05 UTC")))
	buf.WriteString("- **Source**: GitHub Actions Workflow\n")
	buf.WriteString("- **Script**: `scripts/festival_updater.go`\n")

	// Add detailed changes section if there are any updates
	if len(stats.Changes) > 0 {
		buf.WriteString("\n<details>\n<summary>📋 Detailed Festival Changes</summary>\n\n")
		for _, change := range stats.Changes {
			buf.WriteString(fmt.Sprintf("### %s\n\n", change.Name))

			if len(change.NewBands) > 0 {
				buf.WriteString(fmt.Sprintf("- **New Bands Added** (%d):\n", len(change.NewBands)))
				for _, band := range change.NewBands {
					buf.WriteString(fmt.Sprintf("  - %s\n", band))
				}
			}

			if len(change.UpdatedBands) > 0 {
				buf.WriteString(fmt.Sprintf("- **Existing Bands Updated** (%d):\n", len(change.UpdatedBands)))
				for _, band := range change.UpdatedBands {
					buf.WriteString(fmt.Sprintf("  - %s\n", band))
				}
			}

			if change.PriceUpdated {
				buf.WriteString(fmt.Sprintf("- **Ticket Price Updated**: %.2f€ → %.2f€\n", change.OldPrice, change.NewPrice))
			}

			buf.WriteString("\n")
		}
		buf.WriteString("</details>\n")
	}

	if stats.UpdatedFestivals == 0 {
		buf.WriteString("\n---\n")
		buf.WriteString("*No updates were needed. All festival information is up to date.*\n")
	} else {
		buf.WriteString("\n---\n")
		buf.WriteString("*This PR was automatically generated. Please review the changes before merging.*\n")
	}

	return buf.String()
}

func main() {
	// Parse command line flags
	dryRun := false
	festivalName := ""
	openaiResponseFilePath := ""

	flag.BoolVar(&dryRun, "dry-run", false, "Enable dry run mode")
	flag.StringVar(&festivalName, "festival", "", "Specify festival name")
	flag.StringVar(&openaiResponseFilePath, "openai-response", "", "Specify OpenAI response file path for testing")
	flag.Parse()

	if dryRun {
		fmt.Println("🔍 DRY-RUN MODE: No API calls will be made, no files will be modified")
		fmt.Println()
	}

	if festivalName != "" {
		fmt.Printf("🎯 Single festival mode: %s\n\n", festivalName)
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" && !dryRun {
		fmt.Fprintf(os.Stderr, "Error: OPENAI_API_KEY environment variable not set\n")
		os.Exit(1)
	}

	openaiClient = openai.NewOpenAIClient(apiKey)

	// Load prompt template
	promptTemplate, err := openai.LoadPromptFile("scripts/festival_prompt.md")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading prompt template: %v\n", err)
		os.Exit(1)
	}

	// Update festivals
	stats := updateExistingFestivals(promptTemplate, dryRun, festivalName, openaiResponseFilePath)

	// Generate PR summary
	summary := generatePRSummary(stats)
	if err := os.WriteFile("festival_update_summary.md", []byte(summary), 0600); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing summary: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n✅ Festival update completed successfully!")
	fmt.Printf("📄 Summary written to festival_update_summary.md\n")
}
