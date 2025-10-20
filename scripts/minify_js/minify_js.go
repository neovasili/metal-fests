package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"
)

const buildDir = "build"

func minifyJS(content string) string {
	var result strings.Builder
	inString := false
	stringChar := rune(0)
	lastChar := rune(0)
	lastNonSpace := rune(0)

	for i, char := range content {
		// Handle strings
		if (char == '"' || char == '\'' || char == '`') && lastChar != '\\' {
			if !inString {
				inString = true
				stringChar = char
			} else if char == stringChar {
				inString = false
				stringChar = 0
			}
			result.WriteRune(char)
			lastChar = char
			lastNonSpace = char
			continue
		}

		if inString {
			result.WriteRune(char)
			lastChar = char
			continue
		}

		// Handle comments
		if char == '/' && i+1 < len(content) {
			nextChar := rune(content[i+1])
			if nextChar == '/' {
				// Single-line comment - skip until newline
				for i++; i < len(content) && content[i] != '\n'; i++ {
				}
				lastChar = ' '
				continue
			} else if nextChar == '*' {
				// Multi-line comment - skip until */
				i++
				for i++; i < len(content)-1; i++ {
					if content[i] == '*' && content[i+1] == '/' {
						i++
						break
					}
				}
				lastChar = ' '
				continue
			}
		}

		// Handle whitespace
		if unicode.IsSpace(char) {
			// Keep space if it's between alphanumeric characters or certain operators
			if lastNonSpace != 0 && i+1 < len(content) {
				nextNonSpace := rune(0)
				for j := i + 1; j < len(content); j++ {
					if !unicode.IsSpace(rune(content[j])) {
						nextNonSpace = rune(content[j])
						break
					}
				}
				if needsSpace(lastNonSpace, nextNonSpace) {
					result.WriteRune(' ')
				}
			}
			lastChar = char
			continue
		}

		result.WriteRune(char)
		lastChar = char
		lastNonSpace = char
	}

	return result.String()
}

func needsSpace(prev, next rune) bool {
	if prev == 0 || next == 0 {
		return false
	}

	// Need space between alphanumeric characters
	if (unicode.IsLetter(prev) || unicode.IsDigit(prev) || prev == '_' || prev == '$') &&
		(unicode.IsLetter(next) || unicode.IsDigit(next) || next == '_' || next == '$') {
		return true
	}

	// Need space between certain operators and keywords
	operators := "+-*/%<>=!&|"
	if strings.ContainsRune(operators, prev) && strings.ContainsRune(operators, next) {
		return true
	}

	return false
}

func minifyJSFile(filePath string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("error reading file: %w", err)
	}

	originalSize := len(content)
	minified := minifyJS(string(content))
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
	fmt.Println("🔨 Minifying JavaScript files...")
	fmt.Println()

	// Check if build directory exists
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		fmt.Printf("⚠ No %s directory found\n", buildDir)
		return
	}

	// Find all JavaScript files in build directory
	var jsFiles []string
	err := filepath.Walk(buildDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(path, ".js") {
			jsFiles = append(jsFiles, path)
		}
		return nil
	})

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error walking directory: %v\n", err)
		os.Exit(1)
	}

	if len(jsFiles) == 0 {
		fmt.Printf("⚠ No JavaScript files found in %s\n", buildDir)
		return
	}

	// Minify each file
	for _, file := range jsFiles {
		if err := minifyJSFile(file); err != nil {
			fmt.Fprintf(os.Stderr, "✗ Error minifying %s: %v\n", file, err)
			os.Exit(1)
		}
	}

	fmt.Println("\n✅ JavaScript minification complete!")
}
