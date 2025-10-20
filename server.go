package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	PORT   = 8000
	DBFile = "db.json"
)

// Database structure
type Database struct {
	Festivals []Festival `json:"festivals"`
	Bands     []Band     `json:"bands"`
}

type Festival struct {
	Name     string   `json:"name"`
	Location string   `json:"location"`
	Dates    Dates    `json:"dates"`
	Website  string   `json:"website"`
	Bands    []string `json:"bands"`
}

type Dates struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type Band struct {
	Key           string   `json:"key"`
	Name          string   `json:"name"`
	Country       string   `json:"country"`
	Description   string   `json:"description"`
	Logo          string   `json:"logo"`
	HeadlineImage string   `json:"headlineImage"`
	Website       string   `json:"website"`
	Spotify       string   `json:"spotify"`
	Genres        []string `json:"genres"`
	Members       []Member `json:"members"`
	Reviewed      bool     `json:"reviewed"`
}

type Member struct {
	Name string `json:"name"`
	Role string `json:"role"`
}

type ValidateURLRequest struct {
	URL string `json:"url"`
}

type ValidateURLResponse struct {
	Valid  bool   `json:"valid"`
	Status int    `json:"status,omitempty"`
	Error  string `json:"error,omitempty"`
	URL    string `json:"url"`
}

type UpdateBandResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// CustomFileServer wraps http.FileServer to handle clean URLs
type CustomFileServer struct {
	fs http.Handler
}

func (cfs *CustomFileServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Check if the file exists
	path := r.URL.Path
	fullPath := filepath.Join(".", path)

	// If path doesn't exist and it's not an API request, serve error.html
	if _, err := os.Stat(fullPath); os.IsNotExist(err) && !strings.HasPrefix(path, "/api/") {
		r.URL.Path = "/error.html"
	}

	cfs.fs.ServeHTTP(w, r)
}

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Logging middleware
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s %s - %v", r.RemoteAddr, r.Method, r.URL.Path, time.Since(start))
	})
}

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
	var updatedBand Band
	if err := json.Unmarshal(body, &updatedBand); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	// Read current database
	dbData, err := os.ReadFile(DBFile)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read database: %v", err), http.StatusInternalServerError)
		return
	}

	var db Database
	if err := json.Unmarshal(dbData, &db); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse database: %v", err), http.StatusInternalServerError)
		return
	}

	// Find and update the band
	bandFound := false
	for i, band := range db.Bands {
		if band.Key == bandKey {
			db.Bands[i] = updatedBand
			bandFound = true
			break
		}
	}

	if !bandFound {
		http.Error(w, "Band not found", http.StatusNotFound)
		return
	}

	// Write updated data back to database
	updatedData, err := json.MarshalIndent(db, "", "  ")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to marshal database: %v", err), http.StatusInternalServerError)
		return
	}

	// Add trailing newline
	updatedData = append(updatedData, '\n')

	if err := os.WriteFile(DBFile, updatedData, 0600); err != nil {
		http.Error(w, fmt.Sprintf("Failed to write database: %v", err), http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(UpdateBandResponse{
		Success: true,
		Message: "Band updated",
	}); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}

	log.Printf("✅ Updated band: %s (%s)", updatedBand.Name, bandKey)
}

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
	var req ValidateURLRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	// Validate the URL
	response := ValidateURLResponse{URL: req.URL}

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

// API router
func apiRouter(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "PUT" && strings.HasPrefix(r.URL.Path, "/api/bands/"):
		handleUpdateBand(w, r)
	case r.Method == "POST" && r.URL.Path == "/api/validate-url":
		handleValidateURL(w, r)
	default:
		http.Error(w, "Not Found", http.StatusNotFound)
	}
}

func main() {
	// Get current directory
	dir, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	// Create file server
	fileServer := &CustomFileServer{
		fs: http.FileServer(http.Dir(".")),
	}

	// Setup routes
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/", apiRouter)

	// Static file serving
	mux.Handle("/", fileServer)

	// Apply middleware
	handler := corsMiddleware(loggingMiddleware(mux))

	// Print startup information
	fmt.Println("🤘 Metal Festivals Timeline Server (Local Dev) 🤘")
	fmt.Printf("📡 Serving at: http://localhost:%d\n", PORT)
	fmt.Printf("📁 Directory: %s\n", dir)
	fmt.Println("🌐 For local development - access HTML files directly:")
	fmt.Printf("   Timeline: http://localhost:%d/index.html\n", PORT)
	fmt.Printf("   Map:      http://localhost:%d/map.html\n", PORT)
	fmt.Printf("   Admin:    http://localhost:%d/admin/\n", PORT)
	fmt.Println("   (Clean URLs handled by client-side router)")
	fmt.Println("⏹️  Press Ctrl+C to stop the server")
	fmt.Println()

	// Start server with timeouts
	addr := fmt.Sprintf(":%d", PORT)
	server := &http.Server{
		Addr:           addr,
		Handler:        handler,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
