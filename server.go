package main

import (
	"flag"
	"fmt"
	"github.com/neovasili/metal-fests/internal/api"
	"github.com/neovasili/metal-fests/internal/constants"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// responseWriter wraps http.ResponseWriter to capture the status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader intercepts the status code
func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// CustomFileServer wraps http.FileServer to handle clean URLs
type CustomFileServer struct {
	fs      http.Handler
	baseDir string
	devMode bool
}

func (cfs *CustomFileServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// In development mode, disable caching
	if cfs.devMode {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
	}

	// Check if the file exists
	path := r.URL.Path
	fullPath := filepath.Join(cfs.baseDir, path)

	// If path starts with /admin, serve admin/index.html
	if strings.HasPrefix(path, "/admin") {
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			r.URL.Path = "/admin/index.html"
		}
	} else if _, err := os.Stat(fullPath); os.IsNotExist(err) && !strings.HasPrefix(path, "/api/") {
		// If path doesn't exist and it's not an API request, serve error.html
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
		// wrap the ResponseWriter
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)
		log.Printf("%s %d %s - %v", r.Method, rw.statusCode, r.URL.Path, time.Since(start))
	})
}

func main() {
	// Define command-line flags
	useBuild := flag.Bool("build", false, "Serve from the build folder (production mode)")
	flag.Parse()

	// Determine which directory to serve
	serveDir := "."
	mode := "Development"
	if *useBuild {
		serveDir = "build"
		mode = "Production"
	}

	// Get current directory
	dir, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	// Verify the serve directory exists
	if _, err := os.Stat(serveDir); os.IsNotExist(err) {
		log.Fatalf("❌ Error: %s directory does not exist. Run 'pnpm build' first.", serveDir)
	}

	// Create file server with the appropriate directory
	fileServer := &CustomFileServer{
		fs:      http.FileServer(http.Dir(serveDir)),
		baseDir: serveDir,
		devMode: !*useBuild, // Disable caching in dev mode
	}

	// Setup routes
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/", api.Router)

	// Static file serving
	mux.Handle("/", fileServer)

	// Apply middleware
	handler := corsMiddleware(loggingMiddleware(mux))

	// Print startup information
	fmt.Printf("🤘 Metal Festivals Timeline Server (%s Mode) 🤘\n", mode)
	fmt.Printf("📡 Serving at: http://localhost:%d\n", constants.PORT)
	fmt.Printf("📁 Base directory: %s\n", dir)
	fmt.Printf("📂 Serving from: %s/\n", serveDir)
	fmt.Println("🌐 Access the application:")
	fmt.Printf("   Timeline: http://localhost:%d/index.html\n", constants.PORT)
	fmt.Printf("   Map:      http://localhost:%d/map.html\n", constants.PORT)
	fmt.Printf("   Admin:    http://localhost:%d/admin/\n", constants.PORT)
	if *useBuild {
		fmt.Println("   ⚡ Serving minified production files")
	} else {
		fmt.Println("   🔧 Serving source files (dev mode)")
	}
	fmt.Println("   (Clean URLs handled by client-side router)")
	fmt.Println("⏹️  Press Ctrl+C to stop the server")
	fmt.Println()

	// Start server with timeouts
	addr := fmt.Sprintf(":%d", constants.PORT)
	server := &http.Server{
		Addr:           addr,
		Handler:        handler,
		ReadTimeout:    constants.ReadTimeout,
		WriteTimeout:   constants.WriteTimeout,
		IdleTimeout:    constants.IdleTimeout,
		MaxHeaderBytes: constants.MaxHeaderBytes,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
