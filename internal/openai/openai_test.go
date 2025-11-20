package openai

import (
	"os"
	"testing"
)

func TestLoadPromptFile(t *testing.T) {
	filename := "test_prompt.txt"
	content := "Hello, world!"
	if err := os.WriteFile(filename, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}
	defer func() { _ = os.Remove(filename) }()

	result, err := LoadPromptFile(filename)
	if err != nil {
		t.Fatalf("LoadPromptFile failed: %v", err)
	}
	if result != content {
		t.Errorf("expected %q, got %q", content, result)
	}
}

// Note: Integration tests for AskOpenAI would require a real API key and network access.
// You can add a test with a dryRun flag to check request formatting if needed.
