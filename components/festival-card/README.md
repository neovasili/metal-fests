# Festival Card Component

A reusable UI component for displaying festival information in the Metal Festivals 2026 application.

## Structure

The component consists of three separate files:

- `festival-card.html` - HTML template with placeholders
- `festival-card.css` - Component-specific styles
- `festival-card.js` - JavaScript class for rendering and behavior

## Usage

### Pre-loading (Recommended)

For optimal performance, pre-load the template once before rendering multiple cards:

```javascript
// Pre-load template (fetches from server once)
await FestivalCard.loadTemplate();

// Now render multiple cards (uses cached template)
for (const festival of festivals) {
  const card = await FestivalCard.render(festival, options);
  container.appendChild(card);
}
```

### Basic Example

```javascript
// Render a festival card
const card = await FestivalCard.render(festival, {
  bandManager: bandManagerInstance,
  favoritesManager: favoritesManagerInstance,
  index: 0, // For timeline view (determines left/right position)
});

// Append to container
container.appendChild(card);
```

**Note**: The `render()` method automatically loads the template on first use and caches it for subsequent calls.

### Options

- `bandManager` (required) - Instance of BandManager for handling band interactions
- `favoritesManager` (required) - Instance of FavoritesManager for favorite toggling
- `index` (optional) - Card index for timeline view (0 = left, 1 = right, etc.)
- `wrapInDiv` (optional) - Whether to wrap card in outer div (for map view modals)

### Events

The component emits a custom `favoriteToggled` event when the favorite button is clicked:

```javascript
card.addEventListener("favoriteToggled", (e) => {
  console.log("Festival:", e.detail.festival);
  console.log("New status:", e.detail.newStatus);
});
```

## Template Placeholders

The HTML template uses the following placeholders:

- `{{poster}}` - URL to festival poster image
- `{{name}}` - Festival name
- `{{dates}}` - Formatted date range
- `{{location}}` - Festival location
- `{{bands}}` - HTML for band tags list
- `{{ticketPrice}}` - Ticket price (numeric)
- `{{website}}` - Festival website URL

## Styling

The component CSS includes styles for:

- Card layout and positioning (left/right timeline alignment)
- Hover effects and transitions
- Collapsed state
- Band tags (normal, highlighted, clickable)
- Favorite button container
- Responsive design

## Integration

### In HTML

```html
<link rel="stylesheet" href="/components/festival-card/festival-card.css" />
<script src="/components/festival-card/festival-card.js"></script>
```

### In Timeline View

The component automatically handles:

- Left/right alternating layout
- Month marker integration
- Filter application
- Favorite toggling with notifications

### In Map View

For map view modals, use `wrapInDiv: true` to maintain proper nesting.

## Development

The component follows these principles:

- **Separation of Concerns**: HTML, CSS, and JS in separate files
- **Reusability**: Works in both timeline and map views
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Linting**: All files are linted separately (JS with ESLint, CSS with Stylelint)
- **Template Caching**: HTML template is fetched once and cached in memory for performance
- **Valid HTML**: Template is a complete HTML5 document, with only the card element extracted at runtime

## Dependencies

- `UIUtils` - For star icon creation and notification display
- `BandManager` - For band data and modal display
- `FavoritesManager` - For favorite state management
