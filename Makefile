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
	@echo "  make start     			- Start the development server"
	@echo "  make dev       			- Alias for start"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint      			- Run all linters"
	@echo "  make lint-fix  			- Fix auto-fixable linting issues"
	@echo "  make validate  			- Run linters + JSON validation"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean     			- Clean temporary files and caches"
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
	@echo "🚀 Starting Metal Festivals Timeline development server..."
	python3 server.py

dev: start

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

validate: lint
	@echo "✅ All validations passed!"

# Clean temporary files
clean:
	@echo "🧹 Cleaning temporary files..."
	rm -rf node_modules/.cache
	rm -rf .eslintcache
	find . -name ".DS_Store" -delete
	@echo "✅ Cleanup complete!"

build-project:
	@echo "🏗️  Building the project..."
	pnpm build
	@echo "✅ Build complete!"
