package model

import (
	"encoding/json"
	"testing"
)

func TestValidateURLRequestJSON(t *testing.T) {
	tests := []struct {
		name string
		req  ValidateURLRequest
	}{
		{
			name: "valid URL",
			req:  ValidateURLRequest{URL: "https://example.com"},
		},
		{
			name: "empty URL",
			req:  ValidateURLRequest{URL: ""},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.req)
			if err != nil {
				t.Fatalf("Failed to marshal ValidateURLRequest: %v", err)
			}

			var unmarshaledReq ValidateURLRequest
			err = json.Unmarshal(data, &unmarshaledReq)
			if err != nil {
				t.Fatalf("Failed to unmarshal ValidateURLRequest: %v", err)
			}

			if unmarshaledReq.URL != tt.req.URL {
				t.Errorf("URL mismatch: got %v, want %v", unmarshaledReq.URL, tt.req.URL)
			}
		})
	}
}

func TestValidateURLResponseJSON(t *testing.T) {
	tests := []struct {
		name string
		resp ValidateURLResponse
	}{
		{
			name: "valid response with all fields",
			resp: ValidateURLResponse{
				Valid:  true,
				Status: 200,
				Error:  "",
				URL:    "https://example.com",
			},
		},
		{
			name: "invalid response with error",
			resp: ValidateURLResponse{
				Valid:  false,
				Status: 404,
				Error:  "Not Found",
				URL:    "https://invalid.com",
			},
		},
		{
			name: "response without optional fields",
			resp: ValidateURLResponse{
				Valid: true,
				URL:   "https://example.com",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.resp)
			if err != nil {
				t.Fatalf("Failed to marshal ValidateURLResponse: %v", err)
			}

			var unmarshaledResp ValidateURLResponse
			err = json.Unmarshal(data, &unmarshaledResp)
			if err != nil {
				t.Fatalf("Failed to unmarshal ValidateURLResponse: %v", err)
			}

			if unmarshaledResp.Valid != tt.resp.Valid {
				t.Errorf("Valid mismatch: got %v, want %v", unmarshaledResp.Valid, tt.resp.Valid)
			}
			if unmarshaledResp.Status != tt.resp.Status {
				t.Errorf("Status mismatch: got %v, want %v", unmarshaledResp.Status, tt.resp.Status)
			}
			if unmarshaledResp.Error != tt.resp.Error {
				t.Errorf("Error mismatch: got %v, want %v", unmarshaledResp.Error, tt.resp.Error)
			}
			if unmarshaledResp.URL != tt.resp.URL {
				t.Errorf("URL mismatch: got %v, want %v", unmarshaledResp.URL, tt.resp.URL)
			}
		})
	}
}

func TestUpdateBandResponseJSON(t *testing.T) {
	tests := []struct {
		name string
		resp UpdateBandResponse
	}{
		{
			name: "success response",
			resp: UpdateBandResponse{
				Success: true,
				Message: "Band updated successfully",
			},
		},
		{
			name: "failure response",
			resp: UpdateBandResponse{
				Success: false,
				Message: "Failed to update band",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.resp)
			if err != nil {
				t.Fatalf("Failed to marshal UpdateBandResponse: %v", err)
			}

			var unmarshaledResp UpdateBandResponse
			err = json.Unmarshal(data, &unmarshaledResp)
			if err != nil {
				t.Fatalf("Failed to unmarshal UpdateBandResponse: %v", err)
			}

			if unmarshaledResp.Success != tt.resp.Success {
				t.Errorf("Success mismatch: got %v, want %v", unmarshaledResp.Success, tt.resp.Success)
			}
			if unmarshaledResp.Message != tt.resp.Message {
				t.Errorf("Message mismatch: got %v, want %v", unmarshaledResp.Message, tt.resp.Message)
			}
		})
	}
}

func TestValidateURLResponseJSONOmitEmpty(t *testing.T) {
	// Test that omitempty works correctly
	resp := ValidateURLResponse{
		Valid:  true,
		Status: 0,
		Error:  "",
		URL:    "https://example.com",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("Failed to marshal ValidateURLResponse: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("Failed to unmarshal to map: %v", err)
	}

	// Status and Error should be omitted when zero/empty
	if _, exists := raw["status"]; exists {
		t.Errorf("Status field should be omitted when zero")
	}
	if _, exists := raw["error"]; exists {
		t.Errorf("Error field should be omitted when empty")
	}

	// Valid and URL should always be present
	if _, exists := raw["valid"]; !exists {
		t.Errorf("Valid field should be present")
	}
	if _, exists := raw["url"]; !exists {
		t.Errorf("URL field should be present")
	}
}
