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
	runes := []rune(content)
	length := len(runes)

	inString := false
	stringChar := rune(0)
	inRegex := false
	inSingleLineComment := false
	inMultiLineComment := false

	for i := 0; i < length; i++ {
		char := runes[i]

		// Handle escape sequences - but only if not already escaped
		if i > 0 && runes[i-1] == '\\' && (i < 2 || runes[i-2] != '\\') {
			result.WriteRune(char)
			continue
		}

		// Handle strings (double quotes, single quotes, template literals)
		if !inRegex && !inSingleLineComment && !inMultiLineComment {
			if char == '"' || char == '\'' || char == '`' {
				if !inString {
					inString = true
					stringChar = char
					result.WriteRune(char)
					continue
				} else if char == stringChar {
					// Check if this closing quote is escaped
					escapedCount := 0
					for j := i - 1; j >= 0 && runes[j] == '\\'; j-- {
						escapedCount++
					}
					// If odd number of backslashes, the quote is escaped
					if escapedCount%2 == 1 {
						result.WriteRune(char)
						continue
					}
					inString = false
					stringChar = 0
					result.WriteRune(char)
					continue
				}
			}
		}

		// Inside string - preserve everything
		if inString {
			result.WriteRune(char)
			continue
		}

		// Handle single-line comments
		if !inMultiLineComment && !inRegex && char == '/' && i+1 < length && runes[i+1] == '/' {
			inSingleLineComment = true
			i++ // Skip the second /
			continue
		}

		if inSingleLineComment {
			if char == '\n' {
				inSingleLineComment = false
				// Don't add the newline, just continue
			}
			continue
		}

		// Handle multi-line comments
		if !inSingleLineComment && !inRegex && char == '/' && i+1 < length && runes[i+1] == '*' {
			inMultiLineComment = true
			i++ // Skip the *
			continue
		}

		if inMultiLineComment {
			if char == '*' && i+1 < length && runes[i+1] == '/' {
				inMultiLineComment = false
				i++ // Skip the /
			}
			continue
		}

		// Handle regex detection (basic)
		// A regex likely follows: =, (, [, {, :, ;, !, &, |, ?, +, -, *, /, %, <, >, ^, ~, ,, return, throw
		if !inRegex && char == '/' {
			// Look back to determine if this could be a regex
			prevNonSpace := getPrevNonSpace(&result)
			if isRegexContext(prevNonSpace) {
				inRegex = true
				result.WriteRune(char)
				continue
			}
		}

		if inRegex {
			result.WriteRune(char)
			if char == '/' {
				// End of regex - but handle flags (g, i, m, s, u, y)
				inRegex = false
				// Continue to include flags
				for i+1 < length && isRegexFlag(runes[i+1]) {
					i++
					result.WriteRune(runes[i])
				}
			}
			continue
		}

		// Handle whitespace
		if unicode.IsSpace(char) {
			// Check if we need space between tokens
			if result.Len() > 0 && i+1 < length {
				prevChar := getLastChar(&result)
				nextNonSpace := getNextNonSpace(runes, i)

				if needsSpace(prevChar, nextNonSpace) {
					result.WriteRune(' ')
				}
			}
			continue
		}

		// Regular character
		result.WriteRune(char)
	}

	return result.String()
}

func getPrevNonSpace(sb *strings.Builder) rune {
	s := sb.String()
	for i := len(s) - 1; i >= 0; i-- {
		if !unicode.IsSpace(rune(s[i])) {
			return rune(s[i])
		}
	}
	return 0
}

func getLastChar(sb *strings.Builder) rune {
	s := sb.String()
	if len(s) == 0 {
		return 0
	}
	return rune(s[len(s)-1])
}

func getNextNonSpace(runes []rune, start int) rune {
	for i := start + 1; i < len(runes); i++ {
		if !unicode.IsSpace(runes[i]) {
			return runes[i]
		}
	}
	return 0
}

func isRegexContext(prev rune) bool {
	// Characters that typically precede a regex
	regexPreceders := "=([{:;!&|?+-%<>^~,\n"
	return strings.ContainsRune(regexPreceders, prev) || prev == 0
}

func isRegexFlag(r rune) bool {
	return r == 'g' || r == 'i' || r == 'm' || r == 's' || r == 'u' || r == 'y'
}

func needsSpace(prev, next rune) bool {
	if prev == 0 || next == 0 {
		return false
	}

	// Need space between alphanumeric characters or identifiers
	isIdentChar := func(r rune) bool {
		return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' || r == '$'
	}

	if isIdentChar(prev) && isIdentChar(next) {
		return true
	}

	// Need space between certain operator combinations to avoid ambiguity
	// Examples: + +, - -, < <, > >, & &, | |, = =
	operatorPairs := map[string]bool{
		"++": true, "--": true, "<<": true, ">>": true,
		"&&": true, "||": true, "==": true, "!=": true,
		"<=": true, ">=": true, "**": true,
	}

	pair := string([]rune{prev, next})
	if operatorPairs[pair] {
		return false // These are valid operators, don't separate
	}

	// Space needed between single operators that could combine
	singleOps := "+-*/%<>=!&|"
	if strings.ContainsRune(singleOps, prev) && strings.ContainsRune(singleOps, next) {
		return true
	}

	// Space needed after keywords
	keywords := []string{"return", "throw", "new", "delete", "typeof", "void", "in", "of", "instanceof"}
	for _, keyword := range keywords {
		if prev == rune(keyword[len(keyword)-1]) && isIdentChar(next) {
			return true
		}
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
