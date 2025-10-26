package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/neovasili/metal-fests/internal/model"
)

// Handle POST /api/validate-url - Validate a URL
func handleValidateURL(w http.ResponseWriter, r *http.Request) {
	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer func() {
		if err := r.Body.Close(); err != nil {
			log.Printf("Failed to close request body: %v", err)
		}
	}()

	// Parse request
	var req model.ValidateURLRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	// Validate the URL
	response := model.ValidateURLResponse{URL: req.URL}

	client := &http.Client{
		Timeout: 5 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			// Allow redirects
			return nil
		},
	}

	httpReq, err := http.NewRequest("GET", req.URL, nil)
	if err != nil {
		response.Valid = false
		response.Status = 0
		response.Error = fmt.Sprintf("Invalid URL: %v", err)
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Printf("Failed to encode response: %v", err)
		}
		log.Printf("❌ Invalid URL: %s (%v)", req.URL, err)
		return
	}

	httpReq.Header.Set("User-Agent", "Mozilla/5.0 (compatible; URLValidator/1.0)")

	resp, err := client.Do(httpReq)
	if err != nil {
		response.Valid = false
		response.Status = 0
		response.Error = err.Error()
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Printf("Failed to encode response: %v", err)
		}
		log.Printf("❌ URL unreachable: %s (%v)", req.URL, err)
		return
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			log.Printf("Failed to close response body: %v", err)
		}
	}()

	response.Status = resp.StatusCode
	response.Valid = resp.StatusCode >= 200 && resp.StatusCode < 400

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}

	if response.Valid {
		log.Printf("✅ URL validated: %s (status: %d)", req.URL, resp.StatusCode)
	} else {
		log.Printf("⚠️  URL returned error: %s (status: %d)", req.URL, resp.StatusCode)
	}
}
