package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

const buildDir = "build"

func minifyHTML(content string) string {
	// Remove HTML comments (but preserve IE conditional comments)
	ieCommentPattern := regexp.MustCompile(`<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->`)
	ieComments := ieCommentPattern.FindAllString(content, -1)

	commentPattern := regexp.MustCompile(`<!--[\s\S]*?-->`)
	content = commentPattern.ReplaceAllString(content, "")

	// Restore IE conditional comments
	for _, comment := range ieComments {
		content = content + comment
	}

	// Remove whitespace between tags
	content = regexp.MustCompile(`>\s+<`).ReplaceAllString(content, "><")

	// Remove leading/trailing whitespace on lines
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(line)
	}
	content = strings.Join(lines, "")

	// Collapse multiple spaces into one (but preserve spaces in text content)
	content = regexp.MustCompile(`\s{2,}`).ReplaceAllString(content, " ")

	// Remove quotes around attribute values where safe
	// (keeping them for values with spaces or special characters)
	content = regexp.MustCompile(`=\s*"([a-zA-Z0-9\-_]+)"`).ReplaceAllString(content, `=$1`)
	content = regexp.MustCompile(`=\s*'([a-zA-Z0-9\-_]+)'`).ReplaceAllString(content, `=$1`)

	return strings.TrimSpace(content)
}

func minifyHTMLFile(filePath string) error {
	// #nosec G304 - filePath comes from validated command-line arguments
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("error reading file: %w", err)
	}

	originalSize := len(content)
	minified := minifyHTML(string(content))
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
	fmt.Println("🔨 Minifying HTML files...")
	fmt.Println()

	// Check if build directory exists
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		fmt.Printf("⚠ No %s directory found\n", buildDir)
		return
	}

	// Find all HTML files in build directory
	var htmlFiles []string
	err := filepath.Walk(buildDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(path, ".html") {
			htmlFiles = append(htmlFiles, path)
		}
		return nil
	})

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error walking directory: %v\n", err)
		os.Exit(1)
	}

	if len(htmlFiles) == 0 {
		fmt.Printf("⚠ No HTML files found in %s\n", buildDir)
		return
	}

	// Minify each file
	for _, file := range htmlFiles {
		if err := minifyHTMLFile(file); err != nil {
			fmt.Fprintf(os.Stderr, "✗ Error minifying %s: %v\n", file, err)
			os.Exit(1)
		}
	}

	fmt.Println("\n✅ HTML minification complete!")
}
