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
	Bands       []string `json:"bands"`
	TicketPrice *float64 `json:"ticketPrice"`
}

type UpdateStats struct {
	TotalFestivals   int
	UpdatedFestivals int
	NewBands         int
	UpdatedPrices    int
	TotalTokens      int
	PromptTokens     int
	CompletionTokens int
}

var openaiClient *openai.OpenAIClient

func searchFestivalInfo(promptTemplate string, festival model.Festival, dryRun bool) (*FestivalUpdateResult, int, error) {
	userPrompt := strings.ReplaceAll(promptTemplate, "{{ FESTIVAL_NAME }}", festival.Name)
	userPrompt = strings.ReplaceAll(userPrompt, "{{ FESTIVAL_LOCATION }}", festival.Location)
	userPrompt = strings.ReplaceAll(userPrompt, "{{ FESTIVAL_URL }}", festival.Website)

	systemPrompt := "You are a data extraction assistant. Always return valid compact JSON only. No markdown, no explanations, no extra text."

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

	var result FestivalUpdateResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, int(resp.Usage.TotalTokens), fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	return &result, int(resp.Usage.TotalTokens), nil
}

func updateExistingFestivals(promptTemplate string, dryRun bool, festivalName string) *UpdateStats {
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

		result, tokens, err := searchFestivalInfo(promptTemplate, festival, dryRun)
		if err != nil {
			fmt.Printf("  ⚠️  Error: %v\n", err)
			continue
		}

		stats.TotalTokens += tokens

		updated := false

		// Update bands if new ones found
		if len(result.Bands) > 0 {
			oldBandCount := len(festival.Bands)
			newBands := make([]model.BandRef, 0)

			for _, bandName := range result.Bands {
				if !containsBand(festival.Bands, bandName) {
					// Convert band name to key (lowercase with hyphens)
					bandKey := bandNameToKey(bandName)
					newBands = append(newBands, model.BandRef{Key: bandKey, Name: bandName})
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
		}

		// Update ticket price if available and different
		if result.TicketPrice != nil && festival.TicketPrice != *result.TicketPrice {
			oldPrice := fmt.Sprintf("%.2f€", festival.TicketPrice)
			festival.TicketPrice = *result.TicketPrice
			stats.UpdatedPrices++
			updated = true
			fmt.Printf("  ✓ Updated ticket price: %s → %.2f€\n", oldPrice, *result.TicketPrice)
		}

		if updated {
			stats.UpdatedFestivals++
			err = data.UpdateFestivalInDatabase(festival)
			if err != nil {
				fmt.Printf("  ⚠️  Error updating festival in database: %v\n", err)
			}
		}

		fmt.Printf("  📊 Tokens used: %d\n", tokens)
	}

	return stats
}

func containsBand(bands []model.BandRef, bandName string) bool {
	for _, band := range bands {
		if band.Name == bandName {
			return true
		}
	}
	return false
}

func bandNameToKey(name string) string {
	// Convert band name to key format (lowercase with hyphens, & to and)
	key := strings.ToLower(name)
	key = strings.ReplaceAll(key, "&", "and")
	key = strings.ReplaceAll(key, " ", "-")
	return key
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
	buf.WriteString("- **Model**: gpt-4.1-mini\n")
	buf.WriteString("\n## ⚙️ Automation Details\n\n")
	buf.WriteString(fmt.Sprintf("- **Run Date**: %s\n", time.Now().Format("2006-01-02 15:04:05 UTC")))
	buf.WriteString("- **Source**: GitHub Actions Workflow\n")
	buf.WriteString("- **Script**: `scripts/festival_updater.go`\n")

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

	flag.BoolVar(&dryRun, "dry-run", false, "Enable dry run mode")
	flag.StringVar(&festivalName, "festival", "", "Specify festival name")
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
	stats := updateExistingFestivals(promptTemplate, dryRun, festivalName)

	// Generate PR summary
	summary := generatePRSummary(stats)
	if err := os.WriteFile("festival_update_summary.md", []byte(summary), 0600); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing summary: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n✅ Festival update completed successfully!")
	fmt.Printf("📄 Summary written to festival_update_summary.md\n")
}
