package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	modelData "github.com/neovasili/metal-fests/internal/data"
	"github.com/neovasili/metal-fests/internal/model"
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
	fmt.Printf("%s %s\n", colorize("i", ColorBlue), text)
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
			currentRow = append(currentRow, minInt(insertions, deletions, substitutions))
		}
		previousRow = currentRow
	}

	return previousRow[len(r2)]
}

func minInt(a, b, c int) int {
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

// isProperlyCapitalized checks if text matches cases.Title capitalization
func isProperlyCapitalized(text string) bool {
	if text == "" {
		return false
	}

	// Use the same capitalization as the band updater
	expected := modelData.NormalizeBandName(text)
	return text == expected
}

// validateJSONStructure validates that the file is valid JSON and loads it
func validateJSONStructure(filePath string) (bool, *model.Database) {
	printHeader("JSON STRUCTURE VALIDATION")

	// #nosec G304 - filePath comes from validated command-line arguments
	file, err := os.ReadFile(filePath)
	if err != nil {
		printError(fmt.Sprintf("Error reading file: %v", err))
		return false, nil
	}

	var data model.Database
	if err := json.Unmarshal(file, &data); err != nil {
		printError(fmt.Sprintf("Invalid JSON: %v", err))
		return false, nil
	}

	printSuccess("Valid JSON structure")
	return true, &data
}

// validateBandNames validates band names in both festivals and bands sections
func validateBandNames(data *model.Database, fix bool) ValidationResult {
	printHeader("BAND NAME CAPITALIZATION")

	result := ValidationResult{}
	fixed := 0

	// Check band names in festivals
	printInfo("Checking band names in festivals...")
	for i, festival := range data.Festivals {
		for j, band := range festival.Bands {
			expected := modelData.NormalizeBandName(band.Name)
			if band.Name != expected {
				if fix {
					printInfo(fmt.Sprintf("  Festival '%s', Band: Fixing '%s' → '%s'", festival.Name, band.Name, expected))
					data.Festivals[i].Bands[j].Name = expected
					fixed++
				} else {
					printError(fmt.Sprintf("  Festival '%s', Band: '%s' not properly capitalized (should be '%s')", festival.Name, band.Name, expected))
					result.Errors++
				}
			}
		}
	}

	// Check band names in bands section
	printInfo("Checking band names in bands section...")
	for i, band := range data.Bands {
		expected := modelData.NormalizeBandName(band.Name)
		if band.Name != expected {
			if fix {
				printInfo(fmt.Sprintf("  Band: Fixing '%s' → '%s'", band.Name, expected))
				data.Bands[i].Name = expected
				fixed++
			} else {
				printError(fmt.Sprintf("  Band: '%s' not properly capitalized (should be '%s')", band.Name, expected))
				result.Errors++
			}
		}
	}

	if fix && fixed > 0 {
		printSuccess(fmt.Sprintf("Fixed %d band name(s)", fixed))
	} else if result.Errors == 0 {
		printSuccess("All band names are properly capitalized")
	}

	return result
}

// validateGenres validates music genre capitalization
func validateGenres(data *model.Database, fix bool) ValidationResult {
	printHeader("MUSIC GENRE CAPITALIZATION")

	result := ValidationResult{}
	totalGenres := 0
	fixed := 0

	for i, band := range data.Bands {
		for j, genre := range band.Genres {
			totalGenres++
			if !isProperlyCapitalized(genre) {
				expected := modelData.NormalizeBandName(genre)
				if fix {
					printInfo(fmt.Sprintf("  Band '%s': Fixing genre '%s' → '%s'", band.Name, genre, expected))
					data.Bands[i].Genres[j] = expected
					fixed++
				} else {
					printError(fmt.Sprintf("  Band '%s': Genre '%s' not properly capitalized (should be '%s')", band.Name, genre, expected))
					result.Errors++
				}
			}
		}
	}

	if fix && fixed > 0 {
		printSuccess(fmt.Sprintf("Fixed %d genre(s)", fixed))
	} else if result.Errors == 0 {
		printSuccess(fmt.Sprintf("All %d genre entries are properly capitalized", totalGenres))
	}

	return result
}

// validateMemberRoles validates band member role capitalization
func validateMemberRoles(data *model.Database, fix bool) ValidationResult {
	printHeader("BAND MEMBER ROLE CAPITALIZATION")

	result := ValidationResult{}
	totalMembers := 0
	fixed := 0

	for i, band := range data.Bands {
		for j, member := range band.Members {
			totalMembers++
			if !isProperlyCapitalized(member.Role) {
				expected := modelData.NormalizeBandName(member.Role)
				if fix {
					printInfo(fmt.Sprintf("  Band '%s', Member '%s': Fixing role '%s' → '%s'", band.Name, member.Name, member.Role, expected))
					data.Bands[i].Members[j].Role = expected
					fixed++
				} else {
					printError(fmt.Sprintf("  Band '%s', Member '%s': Role '%s' not properly capitalized (should be '%s')", band.Name, member.Name, member.Role, expected))
					result.Errors++
				}
			}
		}
	}

	if fix && fixed > 0 {
		printSuccess(fmt.Sprintf("Fixed %d member role(s)", fixed))
	} else if result.Errors == 0 {
		printSuccess(fmt.Sprintf("All %d member roles are properly capitalized", totalMembers))
	}

	return result
}

// validateBandKeys validates that band keys are compliant with the generateBandKey format
func validateBandKeys(data *model.Database, fix bool) ValidationResult {
	printHeader("BAND KEY COMPLIANCE")

	result := ValidationResult{}
	fixed := 0

	// Check band keys in festivals
	printInfo("Checking band keys in festivals...")
	for i, festival := range data.Festivals {
		for j, band := range festival.Bands {
			expected := modelData.GenerateBandKey(band.Name)
			if band.Key != expected {
				if fix {
					printInfo(fmt.Sprintf("  Festival '%s', Band '%s': Fixing key '%s' → '%s'", festival.Name, band.Name, band.Key, expected))
					data.Festivals[i].Bands[j].Key = expected
					fixed++
				} else {
					printError(fmt.Sprintf("  Festival '%s', Band '%s': Key '%s' not compliant (should be '%s')", festival.Name, band.Name, band.Key, expected))
					result.Errors++
				}
			}
		}
	}

	// Check band keys in bands section
	printInfo("Checking band keys in bands section...")
	for i, band := range data.Bands {
		expected := modelData.GenerateBandKey(band.Name)
		if band.Key != expected {
			if fix {
				printInfo(fmt.Sprintf("  Band '%s': Fixing key '%s' → '%s'", band.Name, band.Key, expected))
				data.Bands[i].Key = expected
				fixed++
			} else {
				printError(fmt.Sprintf("  Band '%s': Key '%s' not compliant (should be '%s')", band.Name, band.Key, expected))
				result.Errors++
			}
		}
	}

	if fix && fixed > 0 {
		printSuccess(fmt.Sprintf("Fixed %d band key(s)", fixed))
	} else if result.Errors == 0 {
		printSuccess("All band keys are compliant")
	}

	return result
}

// detectDuplicates detects potential duplicate band names using Levenshtein distance
func detectDuplicates(data *model.Database, threshold int, hideWarnings bool) ValidationResult {
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
		for _, bandRef := range festival.Bands {
			allBands = append(allBands, BandEntry{
				Name:   bandRef.Name,
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
				if !hideWarnings {
					printWarning(fmt.Sprintf("  Potential duplicate (distance=%d): '%s' (%s) ↔ '%s' (%s)", distance, name1, source1, name2, source2))
				}
				result.Warnings++
				duplicatesFound++
			}
		}
	}

	if duplicatesFound == 0 {
		printSuccess("No potential duplicates detected")
	} else {
		if hideWarnings {
			printInfo(fmt.Sprintf("Found %d potential duplicate(s) (use without --hide-warnings to see details)", duplicatesFound))
		} else {
			printInfo(fmt.Sprintf("Found %d potential duplicate(s)", duplicatesFound))
		}
	}

	return result
}

func main() {
	// Parse command line flags
	fix := flag.Bool("fix", false, "Automatically fix formatting issues")
	hideWarnings := flag.Bool("hide-warnings", false, "Hide warning details (e.g., duplicate band list)")
	flag.Parse()

	fmt.Printf("\n%s\n", colorize("🎸 Metal Festivals Database Validator", ColorBold+ColorCyan))
	fmt.Printf("%s\n", colorize(strings.Repeat("=", 80), ColorBold))

	if *fix {
		printInfo("🔧 Fix mode enabled: Formatting issues will be automatically corrected")
		fmt.Println()
	}

	if *hideWarnings {
		printInfo("🔇 Hide warnings mode enabled: Warning details will be hidden")
		fmt.Println()
	}

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

	result := validateBandNames(data, *fix)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	result = validateGenres(data, *fix)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	result = validateMemberRoles(data, *fix)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	result = validateBandKeys(data, *fix)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	result = detectDuplicates(data, 2, *hideWarnings)
	totalErrors += result.Errors
	totalWarnings += result.Warnings

	// Save fixed data if in fix mode
	if *fix {
		printHeader("SAVING CHANGES")
		jsonData, err := json.MarshalIndent(data, "", "  ")
		if err != nil {
			printError(fmt.Sprintf("Error marshaling JSON: %v", err))
			os.Exit(1)
		}

		// #nosec G306 - db.json needs to be readable by other processes
		if err := os.WriteFile(dbPath, jsonData, 0644); err != nil {
			printError(fmt.Sprintf("Error writing file: %v", err))
			os.Exit(1)
		}

		printSuccess("Changes saved successfully to db.json")
	}

	// Print summary
	printHeader("VALIDATION SUMMARY")

	if *fix {
		if totalErrors == 0 && totalWarnings == 0 {
			fmt.Printf("%s\n", colorize("✅ All validations passed! No issues found.", ColorBold+ColorGreen))
		} else {
			fmt.Printf("%s\n", colorize("✅ All fixable issues have been corrected!", ColorBold+ColorGreen))
			if totalWarnings > 0 {
				fmt.Printf("%s\n", colorize(fmt.Sprintf("⚠️  Found %d warning(s) (not auto-fixable)", totalWarnings), ColorBold+ColorYellow))
			}
		}
		os.Exit(0)
	}

	if totalErrors == 0 && totalWarnings == 0 {
		fmt.Printf("%s\n", colorize("✅ All validations passed! No issues found.", ColorBold+ColorGreen))
		os.Exit(0)
	}

	if totalErrors > 0 {
		fmt.Printf("%s\n", colorize(fmt.Sprintf("❌ Found %d error(s)", totalErrors), ColorBold+ColorRed))
		fmt.Printf("%s\n", colorize("💡 Tip: Run with --fix flag to automatically correct these issues", ColorBlue))
	}
	if totalWarnings > 0 {
		fmt.Printf("%s\n", colorize(fmt.Sprintf("⚠️  Found %d warning(s)", totalWarnings), ColorBold+ColorYellow))
	}

	if totalErrors > 0 {
		os.Exit(1)
	}
	os.Exit(0)
}
