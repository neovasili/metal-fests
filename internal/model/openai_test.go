package model

import (
	"encoding/json"
	"testing"

	"github.com/openai/openai-go/v3"
)

func TestAskOpenAIResponseJSON(t *testing.T) {
	tests := []struct {
		name     string
		response AskOpenAIResponse
	}{
		{
			name: "Complete response",
			response: AskOpenAIResponse{
				OutputText:      `{"key":"test","name":"Test Band"}`,
				TotalUsedTokens: 1500,
				EstimatedCost:   0.05,
				UsedModel:       openai.ChatModelGPT4o,
			},
		},
		{
			name: "Response with zero cost",
			response: AskOpenAIResponse{
				OutputText:      "{}",
				TotalUsedTokens: 0,
				EstimatedCost:   0.0,
				UsedModel:       openai.ChatModelGPT4oMini,
			},
		},
		{
			name: "Response with fallback model",
			response: AskOpenAIResponse{
				OutputText:      `{"bands":["Metallica","Iron Maiden"]}`,
				TotalUsedTokens: 3000,
				EstimatedCost:   0.15,
				UsedModel:       openai.ChatModelGPT4_1,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test that the struct can be created and accessed
			if tt.response.OutputText == "" {
				t.Error("OutputText should not be empty")
			}
			if tt.response.TotalUsedTokens < 0 {
				t.Error("TotalUsedTokens should not be negative")
			}
			if tt.response.EstimatedCost < 0 {
				t.Error("EstimatedCost should not be negative")
			}
			if tt.response.UsedModel == "" {
				t.Error("UsedModel should not be empty")
			}
		})
	}
}

func TestAskOpenAIResponseMarshaling(t *testing.T) {
	response := AskOpenAIResponse{
		OutputText:      `{"test":"value"}`,
		TotalUsedTokens: 500,
		EstimatedCost:   0.02,
		UsedModel:       openai.ChatModelGPT4o,
	}

	// Test JSON marshaling
	data, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal AskOpenAIResponse: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaledResponse struct {
		OutputText      string  `json:"OutputText"`
		TotalUsedTokens int     `json:"TotalUsedTokens"`
		EstimatedCost   float64 `json:"EstimatedCost"`
		UsedModel       string  `json:"UsedModel"`
	}
	err = json.Unmarshal(data, &unmarshaledResponse)
	if err != nil {
		t.Fatalf("Failed to unmarshal AskOpenAIResponse: %v", err)
	}

	if unmarshaledResponse.OutputText != response.OutputText {
		t.Errorf("OutputText mismatch: got %v, want %v", unmarshaledResponse.OutputText, response.OutputText)
	}
	if unmarshaledResponse.TotalUsedTokens != response.TotalUsedTokens {
		t.Errorf("TotalUsedTokens mismatch: got %v, want %v", unmarshaledResponse.TotalUsedTokens, response.TotalUsedTokens)
	}
	if unmarshaledResponse.EstimatedCost != response.EstimatedCost {
		t.Errorf("EstimatedCost mismatch: got %v, want %v", unmarshaledResponse.EstimatedCost, response.EstimatedCost)
	}
	if unmarshaledResponse.UsedModel != string(response.UsedModel) {
		t.Errorf("UsedModel mismatch: got %v, want %v", unmarshaledResponse.UsedModel, string(response.UsedModel))
	}
}
