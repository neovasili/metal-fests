package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

const buildDir = "build"

func minifyCSS(content string) string {
	// Remove comments
	commentPattern := regexp.MustCompile(`/\*[\s\S]*?\*/`)
	content = commentPattern.ReplaceAllString(content, "")

	// Remove unnecessary whitespace
	content = regexp.MustCompile(`\s+`).ReplaceAllString(content, " ")

	// Remove spaces around special characters
	content = regexp.MustCompile(`\s*([{};:,>+~])\s*`).ReplaceAllString(content, "$1")

	// Remove spaces before !important
	content = strings.ReplaceAll(content, " !important", "!important")

	// Remove trailing semicolons before }
	content = regexp.MustCompile(`;}`).ReplaceAllString(content, "}")

	// Remove leading/trailing whitespace
	content = strings.TrimSpace(content)

	return content
}

func minifyCSSFile(filePath string) error {
	// #nosec G304 - filePath comes from validated command-line arguments
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("error reading file: %w", err)
	}

	originalSize := len(content)
	minified := minifyCSS(string(content))
	minifiedSize := len(minified)

	if err := os.WriteFile(filePath, []byte(minified), 0600); err != nil {
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
	fmt.Println("🔨 Minifying CSS files...")
	fmt.Println()

	// Check if build directory exists
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		fmt.Printf("⚠ No %s directory found\n", buildDir)
		return
	}

	// Find all CSS files in build directory
	var cssFiles []string
	err := filepath.Walk(buildDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(path, ".css") {
			cssFiles = append(cssFiles, path)
		}
		return nil
	})

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error walking directory: %v\n", err)
		os.Exit(1)
	}

	if len(cssFiles) == 0 {
		fmt.Printf("⚠ No CSS files found in %s\n", buildDir)
		return
	}

	// Minify each file
	for _, file := range cssFiles {
		if err := minifyCSSFile(file); err != nil {
			fmt.Fprintf(os.Stderr, "✗ Error minifying %s: %v\n", file, err)
			os.Exit(1)
		}
	}

	fmt.Println("\n✅ CSS minification complete!")
}
