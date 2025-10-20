package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"
)

// ANSI color codes for terminal output
const (
	ColorHeader    = "\033[95m"
	ColorBlue      = "\033[94m"
	ColorCyan      = "\033[96m"
	ColorGreen     = "\033[92m"
	ColorYellow    = "\033[93m"
	ColorRed       = "\033[91m"
	ColorBold      = "\033[1m"
	ColorUnderline = "\033[4m"
	ColorEnd       = "\033[0m"
)

// Database structures
type Database struct {
	Festivals []Festival `json:"festivals"`
	Bands     []Band     `json:"bands"`
}

type Festival struct {
	Name  string   `json:"name"`
	Bands []string `json:"bands"`
}

type Band struct {
	Name    string   `json:"name"`
	Genres  []string `json:"genres"`
	Members []Member `json:"members"`
}

type Member struct {
	Name string `json:"name"`
	Role string `json:"role"`
}

// ValidationResult tracks errors and warnings
type ValidationResult struct {
	Errors   int
	Warnings int
}

// Helper functions for colorized output
func colorize(text, color string) string {
	return fmt.Sprintf("%s%s%s", color, text, ColorEnd)
}

func printHeader(text string) {
	fmt.Printf("\n%s\n", colorize(strings.Repeat("═", 80), ColorBold))
	fmt.Printf("%s\n", colorize(fmt.Sprintf("  %s", text), ColorBold+ColorCyan))
	fmt.Printf("%s\n\n", colorize(strings.Repeat("═", 80), ColorBold))
}

func printSuccess(text string) {
	fmt.Printf("%s %s\n", colorize("✓", ColorGreen), text)
}

func printWarning(text string) {
	fmt.Printf("%s %s\n", colorize("⚠", ColorYellow), colorize(text, ColorYellow))
}

func printError(text string) {
	fmt.Printf("%s %s\n", colorize("✗", ColorRed), colorize(text, ColorRed))
}

func printInfo(text string) {
	fmt.Printf("%s %s\n", colorize("ℹ", ColorBlue), text)
}

// levenshteinDistance calculates the Levenshtein distance between two strings
func levenshteinDistance(s1, s2 string) int {
	r1 := []rune(s1)
	r2 := []rune(s2)

	if len(r1) < len(r2) {
		return levenshteinDistance(s2, s1)
	}

	if len(r2) == 0 {
		return len(r1)
	}

	previousRow := make([]int, len(r2)+1)
	for i := range previousRow {
		previousRow[i] = i
	}

	for i, c1 := range r1 {
		currentRow := []int{i + 1}
		for j, c2 := range r2 {
			insertions := previousRow[j+1] + 1
			deletions := currentRow[j] + 1
			substitutions := previousRow[j]
			if c1 != c2 {
				substitutions++
			}
			currentRow = append(currentRow, min(insertions, deletions, substitutions))
		}
		previousRow = currentRow
	}

	return previousRow[len(r2)]
}

func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// isCapitalizedPerWord checks if text follows capitalized per word pattern
func isCapitalizedPerWord(text string, allowExceptions bool) bool {
	exceptions := map[string]bool{
		"of": true, "the": true, "and": true, "in": true, "a": true,
		"an": true, "or": true, "but": true, "for": true, "at": true,
		"by": true, "to": true, "from": true, "with": true,
	}

	words := strings.Fields(text)
	if len(words) == 0 {
		return false
	}

	for i, word := range words {
		if word == "" {
			continue
		}

		// Skip words that are all digits
		allDigits := true
		for _, c := range word {
			if !unicode.IsDigit(c) {
				allDigits = false
				break
			}
		}
		if allDigits {
			continue
		}

		// Check if word is an exception (but not the first word)
		if allowExceptions && i > 0 && exceptions[strings.ToLower(word)] {
			if strings.ToLower(word) == word {
				continue
			}
		}

		// For non-exception words, check if first letter is capitalized
		firstLetterIdx := -1
		for j, c := range word {
			if unicode.IsLetter(c) {
				firstLetterIdx = j
				break
			}
		}

		if firstLetterIdx != -1 {
			firstLetter := []rune(word)[firstLetterIdx]
			if !unicode.IsUpper(firstLetter) {
				return false
			}
		}
	}

	return true
}

// isRoleCapitalized checks if band member role has first word capitalized
func isRoleCapitalized(role string) bool {
	if role == "" {
		return false
	}

	words := strings.Fields(role)
	if len(words) == 0 {
		return false
	}

	firstWord := words[0]

	// Find first letter
	firstLetterIdx := -1
	for i, c := range firstWord {
		if unicode.IsLetter(c) {
			firstLetterIdx = i
			break
		}
	}

	if firstLetterIdx == -1 {
		return true // No letters, skip validation
	}

	firstLetter := []rune(firstWord)[firstLetterIdx]
	return unicode.IsUpper(firstLetter)
}

// validateJSONStructure validates that the file is valid JSON and loads it
func validateJSONStructure(filePath string) (bool, *Database) {
	printHeader("JSON STRUCTURE VALIDATION")

	file, err := os.ReadFile(filePath)
	if err != nil {
		printError(fmt.Sprintf("Error reading file: %v", err))
		return false, nil
	}

	var data Database
	if err := json.Unmarshal(file, &data); err != nil {
		printError(fmt.Sprintf("Invalid JSON: %v", err))
		return false, nil
	}

	printSuccess("Valid JSON structure")
	return true, &data
}

// validateBandNames validates band names in both festivals and bands sections
func validateBandNames(data *Database) ValidationResult {
	printHeader("BAND NAME CAPITALIZATION")

	result := ValidationResult{}

	// Check band names in festivals
	printInfo("Checking band names in festivals...")
	totalFestivalBands := 0
	for _, festival := range data.Festivals {
		for _, bandName := range festival.Bands {
			totalFestivalBands++
			if !isCapitalizedPerWord(bandName, true) {
				printError(fmt.Sprintf("  Festival '%s': Band name '%s' not properly capitalized", festival.Name, bandName))
				result.Errors++
			}
		}
	}

	if result.Errors == 0 {
		printSuccess(fmt.Sprintf("All %d band names in festivals are properly capitalized", totalFestivalBands))
	}

	// Check band names in bands section
	printInfo("Checking band names in bands section...")
	bandsErrors := 0
	for _, band := range data.Bands {
		if !isCapitalizedPerWord(band.Name, true) {
			printError(fmt.Sprintf("  Band '%s' not properly capitalized", band.Name))
			bandsErrors++
			result.Errors++
		}
	}

	if bandsErrors == 0 {
		printSuccess(fmt.Sprintf("All %d band names are properly capitalized", len(data.Bands)))
	}

	return result
}

// validateGenres validates music genre capitalization
func validateGenres(data *Database) ValidationResult {
	printHeader("MUSIC GENRE CAPITALIZATION")

	result := ValidationResult{}
	totalGenres := 0

	for _, band := range data.Bands {
		for _, genre := range band.Genres {
			totalGenres++
			if !isCapitalizedPerWord(genre, false) {
				printError(fmt.Sprintf("  Band '%s': Genre '%s' not properly capitalized", band.Name, genre))
				result.Errors++
			}
		}
	}

	if result.Errors == 0 {
		printSuccess(fmt.Sprintf("All %d genre entries are properly capitalized", totalGenres))
	}

	return result
}

// validateMemberRoles validates band member role capitalization
func validateMemberRoles(data *Database) ValidationResult {
	printHeader("BAND MEMBER ROLE CAPITALIZATION")

	result := ValidationResult{}
	totalMembers := 0

	for _, band := range data.Bands {
		for _, member := range band.Members {
			totalMembers++
			if !isRoleCapitalized(member.Role) {
				printError(fmt.Sprintf("  Band '%s', Member '%s': Role '%s' first word not capitalized", band.Name, member.Name, member.Role))
				result.Errors++
			}
		}
	}

	if result.Errors == 0 {
		printSuccess(fmt.Sprintf("All %d member roles are properly capitalized", totalMembers))
	}

	return result
}

// detectDuplicates detects potential duplicate band names using Levenshtein distance
func detectDuplicates(data *Database, threshold int) ValidationResult {
	printHeader("DUPLICATE DETECTION (Levenshtein Distance)")

	result := ValidationResult{}

	// Collect all band names from both sections
	type BandEntry struct {
		Name   string
		Source string
	}
	var allBands []BandEntry

	// From festivals
	for _, festival := range data.Festivals {
		for _, bandName := range festival.Bands {
			allBands = append(allBands, BandEntry{
				Name:   bandName,
				Source: fmt.Sprintf("Festival: %s", festival.Name),
			})
		}
	}

	// From bands section
	for _, band := range data.Bands {
		allBands = append(allBands, BandEntry{
			Name:   band.Name,
			Source: "Bands section",
		})
	}

	printInfo(fmt.Sprintf("Checking %d band entries for potential duplicates (threshold: %d)...", len(allBands), threshold))

	checkedPairs := make(map[string]bool)
	duplicatesFound := 0

	for i := 0; i < len(allBands); i++ {
		for j := i + 1; j < len(allBands); j++ {
			name1 := allBands[i].Name
			name2 := allBands[j].Name
			source1 := allBands[i].Source
			source2 := allBands[j].Source

			// Create normalized pair key
			lower1 := strings.ToLower(name1)
			lower2 := strings.ToLower(name2)
			var pairKey string
			if lower1 < lower2 {
				pairKey = lower1 + "|" + lower2
			} else {
				pairKey = lower2 + "|" + lower1
			}

			if checkedPairs[pairKey] {
				continue
			}
			checkedPairs[pairKey] = true

			// Skip if exactly the same (legitimate duplicates across festivals)
			if name1 == name2 {
				continue
			}

			distance := levenshteinDistance(lower1, lower2)

			if distance <= threshold {
				printWarning(fmt.Sprintf("  Potential duplicate (distance=%d): '%s' (%s) ↔ '%s' (%s)", distance, name1, source1, name2, source2))
				result.Warnings++
				duplicatesFound++
			}
		}
	}

	if duplicatesFound == 0 {
		printSuccess("No potential duplicates detected")
	} else {
		printInfo(fmt.Sprintf("Found %d potential duplicate(s)", duplicatesFound))
	}

	return result
}

func main() {
	fmt.Printf("\n%s\n", colorize("🎸 Metal Festivals Database Validator", ColorBold+ColorCyan))
	fmt.Printf("%s\n", colorize(strings.Repeat("=", 80), ColorBold))

	// Determine file path
	execPath, err := os.Executable()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error getting executable path: %v\n", err)
		os.Exit(1)
	}
	execDir := filepath.Dir(execPath)
	dbPath := filepath.Join(execDir, "..", "db.json")

	// For go run, use current directory
	if strings.Contains(execPath, "go-build") {
		wd, _ := os.Getwd()
		dbPath = filepath.Join(wd, "db.json")
	}

	// Validate JSON structure
	success, data := validateJSONStructure(dbPath)
	if !success {
		printError("\n❌ Validation failed: Invalid JSON structure")
		os.Exit(1)
	}

	// Print data summary
	printInfo(fmt.Sprintf("Loaded %d festivals and %d bands", len(data.Festivals), len(data.Bands)))

	// Run all validation checks
	totalErrors := 0
	totalWarnings := 0

	result := validateBandNames(data)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	result = validateGenres(data)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	result = validateMemberRoles(data)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	result = detectDuplicates(data, 2)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	// Print summary
	printHeader("VALIDATION SUMMARY")

	if totalErrors == 0 && totalWarnings == 0 {
		fmt.Printf("%s\n", colorize("✅ All validations passed! No issues found.", ColorBold+ColorGreen))
		os.Exit(0)
	} else {
		if totalErrors > 0 {
			fmt.Printf("%s\n", colorize(fmt.Sprintf("❌ Found %d error(s)", totalErrors), ColorBold+ColorRed))
		}
		if totalWarnings > 0 {
			fmt.Printf("%s\n", colorize(fmt.Sprintf("⚠️  Found %d warning(s)", totalWarnings), ColorBold+ColorYellow))
		}

		if totalErrors > 0 {
			os.Exit(1)
		}
		os.Exit(0)
	}
}
