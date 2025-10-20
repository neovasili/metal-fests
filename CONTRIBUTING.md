# Contributing to Metal Festivals Timeline

Thank you for your interest in contributing to the Metal Festivals Timeline project! 🤘

## Getting Started

### Prerequisites

- **Go 1.21+** (for running the local server)
- **Node.js 18+** and **pnpm 8+** (for development tools)
- **Git** (for version control)

### Setup Development Environment

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/metal-fests.git
   cd metal-fests
   ```

2. **Install Dependencies**

   ```bash
   # Quick setup (installs everything + pre-commit hooks)
   make setup
   ```

3. **Start Development Server**

   ```bash
   make dev  # or make dev
   ```

## Code Quality Standards

This project maintains high code quality through automated linting and formatting:

### Pre-commit Hooks

All commits are automatically checked for:

- **JavaScript**: ESLint (Standard config)
- **CSS**: Stylelint (Standard config)
- **HTML**: HTMLHint validation
- **Markdown**: Markdownlint
- **Python**: Black formatting + Flake8 linting
- **General**: Trailing whitespace, file endings, merge conflicts

### Manual Code Quality Checks

```bash
# Run all linters
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Validate everything (linting + JSON)
pnpm validate
```

### Code Style Guidelines

#### JavaScript

- Use **2 spaces** for indentation
- Use **double quotes** for strings
- Always use **semicolons**
- Follow **Standard JS** conventions
- Maximum line length: **100 characters**

#### CSS

- Use **2 spaces** for indentation
- Use **double quotes** for strings
- Use **lowercase** named colors when possible ("white", not #FFF)
- Avoid **!important** declarations
- Follow **BEM-like** naming conventions

#### HTML

- Use **double quotes** for attributes
- Include **alt** attributes for images
- Use semantic HTML elements
- Validate with HTMLHint

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# OR
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Keep commits small and focused
- Write clear, descriptive commit messages
- Ensure all linters pass before committing

### 3. Test Your Changes

```bash
# Start the server and test functionality
pnpm start

# Run validation
pnpm validate

# Test on different screen sizes (responsive design)
```

### 4. Commit and Push

```bash
git add .
git commit -m "feat: add new festival filtering feature"
git push origin feature/your-feature-name
```

### 5. Create Pull Request

- Use descriptive PR titles
- Include screenshots for UI changes
- Reference any related issues
- Ensure CI checks pass

## Types of Contributions

### 🎸 Adding New Festivals

Edit `db.json` following this structure:

```json
{
  "name": "Festival Name",
  "dates": {
    "start": "2026-MM-DD",
    "end": "2026-MM-DD"
  },
  "location": "City, Country",
  "coordinates": [latitude, longitude],
  "poster": "image_url",
  "website": "https://festival-website.com",
  "bands": ["Band 1", "Band 2"],
  "ticketPrice": 199
}
```

### 🎨 UI/UX Improvements

- Maintain the dark metal theme
- Ensure responsive design works on all devices
- Test on multiple browsers
- Follow existing component patterns

### 🐛 Bug Fixes

- Include reproduction steps in your PR
- Add comments explaining the fix
- Test edge cases

### 📚 Documentation

- Keep README up to date
- Add JSDoc comments for functions
- Include code examples where helpful

## Project Architecture

### File Organization

```shell
metal-fests/
├── index.html, map.html, error.html  # Main pages
├── script.js                         # Timeline functionality
├── css/                              # Modular CSS architecture
│   ├── base.css                      # Global styles
│   ├── layout.css                    # Layout & structure
│   ├── components.css                # UI components
│   └── responsive.css                # Media queries
├── js/                               # Modular JavaScript
│   ├── *-manager.js                  # State management
│   ├── ui-utils.js                   # Utility functions
│   └── map.js, error.js              # Page-specific logic
└── db.json                           # Festival data
```

### Key Design Patterns

- **Modular CSS**: Separate files for different concerns
- **Class-based JS**: Use ES6 classes for organization
- **localStorage**: Persistent state management
- **Vanilla JS**: No frameworks, pure DOM manipulation
- **Responsive First**: Mobile-first design approach

## Deployment

The project is designed for static hosting:

- **GitHub Pages**: Automatic deployment from main branch
- **S3 + CloudFront**: See deployment guide in README
- **Local Development**: Go server with CORS support and admin API

## Getting Help

- **Issues**: Check existing [GitHub issues](https://github.com/neovasili/metal-fests/issues)
- **Discussions**: Start a [GitHub discussion](https://github.com/neovasili/metal-fests/discussions)
- **Code Review**: Ask questions in your PR

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Future CHANGELOG.md entries
- Social media shoutouts for significant contributions

---

**Thank you for helping make the Metal Festivals Timeline awesome!** 🤘🔥
