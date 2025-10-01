# AI Coding Assistant Instructions - Metal Festivals Timeline

## Project Overview
This is a **vanilla JavaScript web application** displaying a timeline of European metal festivals. It's built with zero frameworks - pure HTML, CSS, and JavaScript with a Python HTTP server to handle CORS issues.

## Architecture & Key Patterns

### Data Flow
- **Single data source**: `db.json` contains all festival data in chronological format
- **Class-based structure**: `FestivalTimeline` class in `script.js` handles all app logic
- **Async initialization**: Data loading → sorting → DOM rendering pipeline
- **Error boundaries**: Graceful fallbacks for network failures and missing images

### Core Components
- `index.html` - Minimal structure with dynamic content injection point (`#timeline-content`)
- `script.js` - Main `FestivalTimeline` class handles data fetching, sorting, and DOM rendering
- `js/favorites-manager.js` - `FavoritesManager` class handles localStorage and favorite state
- `js/filter-manager.js` - `FilterManager` class handles filter state and localStorage operations
- `js/ui-utils.js` - `UIUtils` class provides DOM utilities and UI interactions
- `css/base.css` - Reset, fonts, and global styles
- `css/layout.css` - Header, timeline structure, and main layout
- `css/components.css` - Festival cards, buttons, notifications, and interactive elements
- `css/responsive.css` - Media queries and responsive behavior
- `db.json` - Festival data with strict schema (dates, bands array, poster URLs)
- `server.py` - Custom HTTP server with CORS headers for local development

### Critical Development Workflow
**Always use the Python server** - never open `index.html` directly due to CORS restrictions:
```bash
python3 server.py  # Preferred method
# OR python3 -m http.server 8000
```

## Project-Specific Conventions

### Data Schema (db.json)
Festival objects must follow this exact structure:
```json
{
  "name": "Festival Name",
  "dates": { "start": "2026-MM-DD", "end": "2026-MM-DD" },
  "location": "City, Country", 
  "poster": "image_url",
  "website": "https://...",
  "bands": ["Band1", "Band2"],
  "ticketPrice": 199
}
```

### CSS Architecture
- **Modular structure**: Separated into base, layout, components, and responsive files
- **Metal theme**: Dark gradients (`#1a1a1a` to `#2d2d2d`) with orange accents (`#ff6b00`)
- **Timeline layout**: Flexbox-based central line with alternating left/right cards
- **Component-based**: Individual components (cards, buttons, notifications) in separate sections
- **Responsive design**: Mobile-first approach with tablet and desktop enhancements
- **Interactive effects**: Transform-based hover states and smooth animations

### JavaScript Patterns
- **Modular classes**: `FestivalTimeline`, `FavoritesManager`, and `UIUtils` for separation of concerns
- **No frameworks**: Pure DOM manipulation with `document.createElement()`
- **localStorage integration**: Persistent favorites using `FavoritesManager` class
- **Error handling**: Try-catch blocks with user-friendly error messages
- **Date formatting**: Custom `formatDateRange()` method for consistent date display
- **Dynamic alternation**: Cards alternate left/right using index modulo (`index % 2`)
- **Image fallbacks**: `onerror` handlers generate placeholder images with festival names
- **Accessibility**: Star icons include ARIA labels, keyboard navigation, and focus management

### Styling Conventions
- **BEM-like naming**: `.festival-card`, `.festival-poster`, `.bands-list`
- **Utility classes**: `.left`, `.right` for timeline positioning
- **State classes**: Visual feedback through temporary transform changes
- **CSS custom properties**: Use consistent color scheme variables

## Key Integration Points
- **Unsplash API**: Poster images use specific crop parameters (`w=300&h=400&fit=crop`)
- **External links**: Festival websites open in new tabs with `rel="noopener noreferrer"`
- **CORS handling**: Custom Python server adds necessary headers for local JSON fetching

## Testing & Debugging
- **Browser console**: Check for fetch errors and image loading issues
- **Network tab**: Verify `db.json` loads correctly (common CORS issue)
- **Responsive testing**: Use browser dev tools to test timeline → stacked layout transition
- **Port conflicts**: Server shows clear error message if port 8000 is occupied

## When Modifying
- **Adding festivals**: Update `db.json` following exact schema, maintain chronological order
- **Styling changes**: Maintain metal theme consistency and responsive behavior
- **JavaScript**: Preserve error handling patterns and async/await structure
- **Server changes**: Keep CORS headers intact for local development