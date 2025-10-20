# Metal Festivals Timeline - Development Makefile

.PHONY: help install setup start dev lint lint-fix test validate clean

# Default target
help:
	@echo "Metal Festivals Timeline - Available commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup     			- Install all dependencies and setup pre-commit hooks"
	@echo "  make install   			- Install npm dependencies only"
	@echo ""
	@echo "Development:"
	@echo "  make start     			- Start the Go development server"
	@echo "  make start-prod			- Start the Go server with build folder"
	@echo "  make dev       			- Alias for start (Go server)"
	@echo "  make build-server		- Build the Go server binary"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint      			- Run all linters"
	@echo "  make lint-fix  			- Fix auto-fixable linting issues"
	@echo "  make validate  			- Run linters + JSON validation"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean     			- Clean temporary files and caches"
	@echo "  make clean-server		- Remove Go server binary"
	@echo ""
	@echo "Build:"
	@echo "  make build-project   - Build the project for production"
	@echo ""

# Install pnpm dependencies
install:
	pnpm install

# Full setup including pre-commit hooks
setup: install
	pip install pre-commit
	pre-commit install
	@echo "✅ Development environment setup complete!"

# Start development server
start:
	@echo "🚀 Starting Metal Festivals Timeline server (Go)..."
	go run server.go

# Start production server (with build folder)
start-prod:
	@echo "🚀 Starting Metal Festivals Timeline server (Production mode)..."
	go run server.go -build

dev: start

# Build Go server binary
build-server:
	@echo "🔨 Building Go server binary..."
	go build -o metal-fests-server server.go
	@echo "✅ Build complete: ./metal-fests-server"

# Linting commands
lint:
	@echo "🔍 Running all linters..."
	pnpm lint

lint-fix:
	@echo "🔧 Fixing auto-fixable linting issues..."
	pnpm lint:fix

format:
	@echo "🎨 Formatting code with Prettier..."
	pnpm format

validate:
	@echo "🔍 Running all validations..."
	@pnpm validate
	@echo "✅ All validations passed!"

# Clean temporary files
clean:
	@echo "🧹 Cleaning temporary files..."
	rm -rf node_modules/.cache
	rm -rf .eslintcache
	find . -name ".DS_Store" -delete
	@echo "✅ Cleanup complete!"

clean-server:
	@echo "🧹 Cleaning Go server binary..."
	rm -f metal-fests-server
	@echo "✅ Server binary removed!"

build-project:
	@echo "🏗️  Building the project..."
	pnpm build
	@echo "✅ Build complete!"
