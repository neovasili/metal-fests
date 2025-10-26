package api

import (
	"net/http"
	"strings"
)

// API router
func Router(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "PUT" && strings.HasPrefix(r.URL.Path, "/api/bands/"):
		handleUpdateBand(w, r)
	case r.Method == "PUT" && strings.HasPrefix(r.URL.Path, "/api/festivals/"):
		handleUpdateFestival(w, r)
	case r.Method == "POST" && r.URL.Path == "/api/validate-url":
		handleValidateURL(w, r)
	default:
		http.Error(w, "Not Found", http.StatusNotFound)
	}
}
