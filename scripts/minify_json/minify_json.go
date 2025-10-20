package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const buildDir = "build"

func minifyJSONFile(filePath string) error {
	// #nosec G304 - filePath comes from validated command-line arguments
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("error reading file: %w", err)
	}

	originalSize := len(content)

	// Parse JSON
	var data interface{}
	if err := json.Unmarshal(content, &data); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Marshal with minimal formatting
	minified, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("error marshaling JSON: %w", err)
	}

	minifiedSize := len(minified)

	if err := os.WriteFile(filePath, minified, 0600); err != nil {
		return fmt.Errorf("error writing file: %w", err)
	}

	savings := 0.0
	if originalSize > 0 {
		savings = (1 - float64(minifiedSize)/float64(originalSize)) * 100
	}

	fmt.Printf("✓ %s: %d → %d bytes (%.2f%% reduction)\n", filePath, originalSize, minifiedSize, savings)
	return nil
}

func main() {
	fmt.Println("🔨 Minifying JSON files...")
	fmt.Println()

	// Check if build directory exists
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		fmt.Printf("⚠ No %s directory found\n", buildDir)
		return
	}

	// Find all JSON files in build directory
	var jsonFiles []string
	err := filepath.Walk(buildDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(path, ".json") {
			jsonFiles = append(jsonFiles, path)
		}
		return nil
	})

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error walking directory: %v\n", err)
		os.Exit(1)
	}

	if len(jsonFiles) == 0 {
		fmt.Printf("⚠ No JSON files found in %s\n", buildDir)
		return
	}

	// Minify each file
	for _, file := range jsonFiles {
		if err := minifyJSONFile(file); err != nil {
			fmt.Fprintf(os.Stderr, "✗ Error minifying %s: %v\n", file, err)
			os.Exit(1)
		}
	}

	fmt.Println("\n✅ JSON minification complete!")
}
