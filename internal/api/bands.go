package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/neovasili/metal-fests/internal/data"
	"github.com/neovasili/metal-fests/internal/model"
)

// Handle PUT /api/bands/{key} - Update band data
func handleUpdateBand(w http.ResponseWriter, r *http.Request) {
	// Extract band key from path
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/bands/"), "/")
	if len(pathParts) == 0 || pathParts[0] == "" {
		http.Error(w, "Band key is required", http.StatusBadRequest)
		return
	}
	bandKey := pathParts[0]

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

	// Parse updated band data
	var updatedBand model.Band
	if err := json.Unmarshal(body, &updatedBand); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	err = data.UpdateBandInDatabase(updatedBand)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update band: %v", err), http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(model.UpdateBandResponse{
		Success: true,
		Message: "Band updated",
	}); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}

	log.Printf("✅ Updated band: %s (%s)", updatedBand.Name, bandKey)
}
