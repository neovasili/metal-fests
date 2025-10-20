package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type Festival struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	Location    string   `json:"location"`
	Date        string   `json:"date"`
	Bands       []string `json:"bands"`
	TicketPrice *float64 `json:"ticketPrice"`
	Website     string   `json:"website"`
}

type Band struct {
	Key           string   `json:"key"`
	Name          string   `json:"name"`
	Country       string   `json:"country"`
	Description   string   `json:"description"`
	HeadlineImage string   `json:"headlineImage"`
	Logo          string   `json:"logo"`
	Website       string   `json:"website"`
	Spotify       string   `json:"spotify"`
	Genres        []string `json:"genres"`
	Members       []Member `json:"members"`
}

type Member struct {
	Name string `json:"name"`
	Role string `json:"role"`
}

type Database struct {
	Festivals []Festival `json:"festivals"`
	Bands     []Band     `json:"bands"`
}

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

func loadPromptFile(filename string) (string, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func loadDatabase(filename string) (*Database, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var db Database
	if err := json.Unmarshal(data, &db); err != nil {
		return nil, err
	}

	return &db, nil
}

func saveDatabase(filename string, db *Database) error {
	data, err := json.MarshalIndent(db, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
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
	defer resp.Body.Close()

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

func searchFestivalInfo(apiKey string, promptTemplate string, festival Festival, dryRun bool) (*FestivalUpdateResult, int, error) {
	userPrompt := strings.ReplaceAll(promptTemplate, "{{ FESTIVAL_NAME }}", festival.Name)
	userPrompt = strings.ReplaceAll(userPrompt, "{{ FESTIVAL_LOCATION }}", festival.Location)
	userPrompt = strings.ReplaceAll(userPrompt, "{{ FESTIVAL_URL }}", festival.Website)

	if dryRun {
		fmt.Printf("  [DRY-RUN] Would call OpenAI API with prompt for %s\n", festival.Name)
		// Return empty result in dry-run mode
		return &FestivalUpdateResult{
			Bands:       []string{},
			TicketPrice: nil,
		}, 0, nil
	}

	systemPrompt := "You are a data extraction assistant. Always return valid compact JSON only. No markdown, no explanations, no extra text."

	resp, err := askOpenAI(apiKey, systemPrompt, userPrompt)
	if err != nil {
		return nil, 0, err
	}

	if len(resp.Choices) == 0 {
		return nil, resp.Usage.TotalTokens, fmt.Errorf("no response from OpenAI")
	}

	content := strings.TrimSpace(resp.Choices[0].Message.Content)

	var result FestivalUpdateResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, resp.Usage.TotalTokens, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	return &result, resp.Usage.TotalTokens, nil
}

func updateExistingFestivals(apiKey, promptTemplate string, db *Database, dryRun bool) (*UpdateStats, error) {
	stats := &UpdateStats{
		TotalFestivals: len(db.Festivals),
	}

	fmt.Printf("Updating %d festivals...\n", stats.TotalFestivals)

	for i := range db.Festivals {
		festival := &db.Festivals[i]
		fmt.Printf("\n[%d/%d] Processing %s...\n", i+1, stats.TotalFestivals, festival.Name)

		result, tokens, err := searchFestivalInfo(apiKey, promptTemplate, *festival, dryRun)
		if err != nil {
			fmt.Printf("  ⚠️  Error: %v\n", err)
			continue
		}

		stats.TotalTokens += tokens

		updated := false

		// Update bands if new ones found
		if len(result.Bands) > 0 {
			oldBandCount := len(festival.Bands)
			newBands := make([]string, 0)

			for _, band := range result.Bands {
				if !contains(festival.Bands, band) {
					newBands = append(newBands, band)
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
		if result.TicketPrice != nil && (festival.TicketPrice == nil || *festival.TicketPrice != *result.TicketPrice) {
			oldPrice := "null"
			if festival.TicketPrice != nil {
				oldPrice = fmt.Sprintf("%.2f€", *festival.TicketPrice)
			}
			festival.TicketPrice = result.TicketPrice
			stats.UpdatedPrices++
			updated = true
			fmt.Printf("  ✓ Updated ticket price: %s → %.2f€\n", oldPrice, *result.TicketPrice)
		}

		if updated {
			stats.UpdatedFestivals++
		}

		fmt.Printf("  📊 Tokens used: %d\n", tokens)
	}

	return stats, nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
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
	promptTemplate, err := loadPromptFile("scripts/prompt.md")
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

	// Update festivals
	stats, err := updateExistingFestivals(apiKey, promptTemplate, db, dryRun)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error updating festivals: %v\n", err)
		os.Exit(1)
	}

	if !dryRun {
		// Save updated database
		if err := saveDatabase("db.json", db); err != nil {
			fmt.Fprintf(os.Stderr, "Error saving database: %v\n", err)
			os.Exit(1)
		}

		// Generate PR summary
		summary := generatePRSummary(stats)
		if err := os.WriteFile("festival_update_summary.md", []byte(summary), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing summary: %v\n", err)
			os.Exit(1)
		}

		fmt.Println("\n✅ Festival update completed successfully!")
		fmt.Printf("📄 Summary written to festival_update_summary.md\n")
	} else {
		fmt.Println("\n✅ Dry-run completed successfully!")
		fmt.Println("📄 No files were modified")
	}
}
