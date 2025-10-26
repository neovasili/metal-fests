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

// Handle PUT /api/festivals/{key} - Update festival data
func handleUpdateFestival(w http.ResponseWriter, r *http.Request) {
	// Extract festival key from path
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/festivals/"), "/")
	if len(pathParts) == 0 || pathParts[0] == "" {
		http.Error(w, "Festival key is required", http.StatusBadRequest)
		return
	}
	festivalKey := pathParts[0]

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

	// Parse updated festival data
	var updatedFestival model.Festival
	if err := json.Unmarshal(body, &updatedFestival); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	err = data.UpdateFestivalInDatabase(updatedFestival)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update festival: %v", err), http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(model.UpdateBandResponse{
		Success: true,
		Message: "Festival updated",
	}); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}

	log.Printf("✅ Updated festival: %s (%s)", updatedFestival.Name, festivalKey)
}
