# European Metal Festivals 2026 Timeline

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=neovasili_metal-fests&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=neovasili_metal-fests)
[![Code Quality & Linting](https://github.com/neovasili/metal-fests/actions/workflows/ci.yml/badge.svg)](https://github.com/neovasili/metal-fests/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A responsive web application displaying a timeline of heavy metal festivals across Europe in 2026.

## Features

- 🎸 **Interactive Timeline**: Vertical timeline with festivals positioned chronologically
- 🗺️ **Interactive Map**: Explore festivals on an interactive map with custom markers
- ⭐ **Favorites System**: Mark festivals as favorites with star icons and localStorage persistence
- 🎵 **Band Filtering**: Multi-selection filter to find festivals by bands with search functionality
- 🎨 **Dark Metal Theme**: Metal-inspired design with orange accents
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎵 **Festival Information**: Complete details including bands, dates, locations, and ticket prices
- ⚡ **Vanilla JavaScript**: No frameworks needed, fast and lightweight
- 🔧 **Code Quality**: Comprehensive linting setup with pre-commit hooks and CI/CD

## Running the Application

Due to browser CORS restrictions, you cannot open `index.html` directly. You need to serve the files through a local HTTP server.

### Option 1: Using the included Go server (Recommended)

```bash
# Navigate to the project directory
cd /Users/neovasili/workspace/personal/metal-fests

# Run the server
go run server.go
```

Or build and run the binary:

```bash
# Build the server
go build -o metal-fests-server server.go

# Run the server
./metal-fests-server
```

Then open your browser and go to: **<http://localhost:8000>**

### Option 2: Using Python's built-in server

```bash
# Navigate to the project directory
cd /Users/neovasili/workspace/personal/metal-fests

# Start the server
python3 -m http.server 8000
```

Then open your browser and go to: **<http://localhost:8000>**

**Note**: Python's built-in server won't support the admin API endpoints for updating band data.

### Option 3: Using Node.js (if you have it installed)

```bash
# Install a simple server globally
npm install -g http-server

# Navigate to the project directory
cd /Users/neovasili/workspace/personal/metal-fests

# Start the server
http-server -p 8000
```

Then open your browser and go to: <http://localhost:8000>

## Development Setup

### Prerequisites

- **Go 1.21+** (for running the local server and validation)
- **Node.js 18+** and **pnpm 8+** (for linting and development tools)
- **Python 3.7+** (optional, for minification and updater scripts)
- **Git** (for version control and hooks)

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/neovasili/metal-fests.git
cd metal-fests

# Install development dependencies and setup hooks
pnpm setup

# Start development server
npm run dev
```

### Development Commands

```bash
# Start development server (Go)
pnpm start                    # or pnpm dev

# Linting commands
pnpm lint                 # Run all linters
pnpm lint:js             # Lint JavaScript files
pnpm lint:css            # Lint CSS files
pnpm lint:html           # Lint HTML files
pnpm lint:md             # Lint Markdown files

# Fix linting issues automatically
pnpm lint:fix            # Fix all auto-fixable issues
pnpm format              # Alias for lint:fix

# Validation
pnpm validate            # Run linters + JSON validation
```

### Pre-commit Hooks

This project uses [pre-commit](https://pre-commit.com/) hooks to ensure code quality:

- **JavaScript**: ESLint with Standard config
- **CSS**: Stylelint with Standard config
- **HTML**: HTMLHint validation
- **Markdown**: Markdownlint
- **Python**: Black formatting + Flake8 linting
- **General**: Trailing whitespace, EOF newlines, merge conflicts

Install hooks manually:

```bash
pip install pre-commit
pre-commit install
```

### Code Quality Tools

| Tool | Purpose | Config File |
|------|---------|-------------|
| **ESLint** | JavaScript linting | `.eslintrc.json` |
| **Stylelint** | CSS linting | `.stylelintrc.json` |
| **HTMLHint** | HTML validation | `.htmlhintrc` |
| **Markdownlint** | Markdown linting | `.markdownlint.yaml` |

### Continuous Integration

GitHub Actions automatically runs on:

- **Push to main/develop**: Full linting suite + tests
- **Pull Requests**: Code quality checks + security scan
- **All commits**: Pre-commit hooks ensure code quality

View the CI status: [![CI Status](https://github.com/neovasili/metal-fests/actions/workflows/ci.yml/badge.svg)](https://github.com/neovasili/metal-fests/actions/workflows/ci.yml)

## Files Structure

```shell
metal-fests/
├── index.html              # Main timeline page
├── map.html               # Interactive map page
├── error.html             # Error page
├── script.js              # Timeline JavaScript functionality
├── css/
│   ├── base.css           # Reset, fonts, and global styles
│   ├── layout.css         # Header, timeline structure, and main layout
│   ├── components.css     # Festival cards, buttons, notifications
│   ├── responsive.css     # Media queries and responsive behavior
│   ├── map.css           # Map-specific styles
│   └── error.css         # Error page styles
├── js/
│   ├── favorites-manager.js   # Favorites localStorage management
│   ├── filter-manager.js      # Filter state management
│   ├── bands-filter-manager.js # Bands filter management
│   ├── ui-utils.js           # DOM utilities and UI interactions
│   ├── map.js               # Map functionality with Leaflet
│   └── error.js             # Error page JavaScript
├── img/
│   ├── metal-fests.png      # Favicon and map markers
│   ├── placeholder.jpg      # Fallback poster image
│   └── error-background.png # Error page background
├── db.json               # Festival data
├── server.go             # Go server (main server)
├── go.mod                # Go module file
└── README.md             # This file
```

## Pages and Navigation

### Timeline View (`index.html`)

- Chronological timeline layout with alternating festival cards
- Month markers for easy navigation
- All filtering and favorites features available

### Map View (`map.html`)

- Interactive map using Leaflet and OpenStreetMap
- Custom markers using the festival favicon
- Click markers to open detailed festival modals
- Same filtering system as timeline view
- Dark themed map tiles for consistent aesthetics

### Navigation

- Header navigation allows switching between Timeline and Map views
- All pages share the same header with filtering options
- Consistent favorites and band filtering across all views

## Festival Data

The `db.json` file contains information about 15 major European metal festivals:

- **Sweden Rock Festival** (Sweden) - June 3-6
- **Rock in Ring** (Germany) - June 5-7
- **Rock in Park** (Germany) - June 5-7
- **Download Festival** (UK) - June 10-14
- **Nova Rock Festival** (Austria) - June 11-14
- **Hellfest** (France) - June 18-21
- **Copenhell** (Denmark) - June 19-21
- **Graspop Metal Meeting** (Belgium) - June 25-28
- **Greenfield Festival** (Switzerland) - June 12-14
- **Resurrection Fest** (Spain) - July 1-4
- **Leyendas del Rock** (Spain) - August 7-9
- **Masters of Rock** (Czech Republic) - July 9-12
- **Sion sous les Etoiles** (Switzerland) - July 15-19
- **Kavarna Rock Fest** (Bulgaria) - July 1-4
- **Rock for People** (Czech Republic) - June 11-14

## Customization

To add more festivals, simply edit the `db.json` file following the existing structure:

```json
{
  "name": "Festival Name",
  "dates": {
    "start": "2026-MM-DD",
    "end": "2026-MM-DD"
  },
  "location": "City, Country",
  "poster": "image_url_or_path",
  "website": "https://festival-website.com",
  "bands": ["Band 1", "Band 2", "etc"],
  "ticketPrice": 199
}
```

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Maps**: Leaflet.js with OpenStreetMap tiles (CartoDB Dark theme)
- **Storage**: localStorage for favorites and filter preferences
- **Styling**: Modular CSS architecture with responsive design

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Troubleshooting

**CORS Error**: Make sure you're running a local server instead of opening the HTML file directly.

**Images not loading**: The poster images use Unsplash URLs. If they don't load, check your internet connection or replace with local image paths.

**Port already in use**: If port 8000 is busy, edit `server.go` and change the `PORT` constant to a different number (e.g., 8080, 3000, etc.).

---

🤘 **Enjoy exploring the metal festivals of Europe!** 🤘

## Quick Start

1. Clone or download the repository
2. Run `go run server.go` in the project directory
3. Open `http://localhost:8000` in your browser
4. Navigate using clean URLs:
   - Timeline: `http://localhost:8000/` or `http://localhost:8000/timeline`
   - Map: `http://localhost:8000/map`
5. Switch between views using the header navigation
6. Use the favorites star and bands filter to personalize your view
