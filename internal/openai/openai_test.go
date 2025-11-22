package openai

import (
	"errors"
	"net/http"
	"os"
	"testing"

	"github.com/openai/openai-go/v3"
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

func TestEstimateCost(t *testing.T) {
	tests := []struct {
		name      string
		model     string
		inTokens  int
		outTokens int
		expected  float64
	}{
		{
			name:      "GPT-4o with 1000 input and 500 output tokens",
			model:     openai.ChatModelGPT4o,
			inTokens:  1000,
			outTokens: 500,
			expected:  0.0025 + 0.0025, // (1000/1M * 2.5) + (500/1M * 5) = 0.005
		},
		{
			name:      "GPT-4.1 with 2000 input and 1000 output tokens",
			model:     openai.ChatModelGPT4_1,
			inTokens:  2000,
			outTokens: 1000,
			expected:  0.006 + 0.006, // (2000/1M * 3) + (1000/1M * 6) = 0.012
		},
		{
			name:      "Zero tokens",
			model:     openai.ChatModelGPT4o,
			inTokens:  0,
			outTokens: 0,
			expected:  0.0,
		},
		{
			name:      "Unknown model",
			model:     "unknown-model",
			inTokens:  1000,
			outTokens: 500,
			expected:  0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := estimateCost(tt.model, tt.inTokens, tt.outTokens)
			if result != tt.expected {
				t.Errorf("estimateCost(%q, %d, %d) = %f, want %f", tt.model, tt.inTokens, tt.outTokens, result, tt.expected)
			}
		})
	}
}

func TestIsRateLimitError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name: "HTTP 429 Too Many Requests",
			err: &openai.Error{
				StatusCode: http.StatusTooManyRequests,
			},
			expected: true,
		},
		{
			name: "rate_limit_exceeded code",
			err: &openai.Error{
				StatusCode: http.StatusBadRequest,
				Code:       "rate_limit_exceeded",
			},
			expected: true,
		},
		{
			name: "insufficient_quota code",
			err: &openai.Error{
				StatusCode: http.StatusBadRequest,
				Code:       "insufficient_quota",
			},
			expected: true,
		},
		{
			name: "requests_limit_exceeded code",
			err: &openai.Error{
				StatusCode: http.StatusBadRequest,
				Code:       "requests_limit_exceeded",
			},
			expected: true,
		},
		{
			name: "Non-rate-limit error",
			err: &openai.Error{
				StatusCode: http.StatusBadRequest,
				Code:       "invalid_request",
			},
			expected: false,
		},
		{
			name:     "Generic error",
			err:      errors.New("generic error"),
			expected: false,
		},
		{
			name:     "Nil error",
			err:      nil,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isRateLimitError(tt.err)
			if result != tt.expected {
				t.Errorf("isRateLimitError() = %v, want %v", result, tt.expected)
			}
		})
	}
}

// Note: Integration tests for AskOpenAI would require a real API key and network access.
// You can add a test with a dryRun flag to check request formatting if needed.
