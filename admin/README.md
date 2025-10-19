# Admin Panel - Band Review System

## Overview

The admin panel provides a desktop-focused interface for reviewing and managing band information in the database. It's designed for local development use only and requires no authentication.

## Access

**URL:** `http://localhost:8000/admin/`

**Requirements:**

- Local development server running (`python3 server.py`)
- Desktop browser (optimized for 1024px+ width)

## Features

### 1. **Band Review List**

Located on the right side of the screen, displays all bands that need review:

**Criteria for appearing in list:**

- `reviewed: false` OR
- Missing `reviewed` field

**Display Information:**

- Band name (sorted alphabetically)
- Country
- Genres (as colored tags)
- Total count of bands to review

**Sorting:**

- Click sort button to toggle A-Z ↔ Z-A
- Current sort order displayed in button

**Interaction:**

- Click any band to load it in the edit form
- Active band is highlighted with orange border

### 2. **Band Edit Form**

Located on the left side, displays all editable fields for the selected band:

**Fields (in database order):**

1. **Key** (read-only) - Band's unique identifier
2. **Name** - Band name
3. **Country** - Country of origin
4. **Description** - Full band description with markdown link support
5. **Headline Image URL** - Main band photo
   - Live preview shown above field
   - Updates on typing (with error handling)
6. **Logo URL** - Band logo
   - Live preview shown above field
   - Updates on typing (with error handling)
7. **Website** - Official band website
8. **Spotify URL** - Spotify artist page
9. **Genres** - Array of genre strings
   - Add/remove genres dynamically
   - "Add Genre" button to append new entries
10. **Reviewed** - Checkbox to mark band as reviewed
11. **Members** - Array of member objects
    - Each member has name and role
    - Add/remove members dynamically
    - "Add Member" button to append new entries

**Auto-Save:**

- Changes automatically save 2 seconds after last edit
- Toast notification confirms save
- No manual save button needed

**Navigation:**

- Previous (◀) and Next (▶) arrows in header
- Navigate through bands in list order
- Arrows disabled at list boundaries

### 3. **Image Previews**

Real-time image preview for Logo and Headline Image fields:

**States:**

- **Loading:** "Loading image..." while fetching
- **Success:** Full image displayed
- **Error:** "Failed to load image" with red border
- **Empty:** "No image URL provided"

**Update Trigger:**

- Updates as you type in URL field
- Debounced to avoid excessive requests

### 4. **Auto-Save System**

**How it works:**

1. User edits any field
2. System waits 2 seconds for additional changes
3. Automatically saves to `db.json`
4. Toast notification confirms success

**Benefits:**

- No manual save needed
- Prevents data loss
- Immediate feedback

**Error Handling:**

- Failed saves show error toast
- Console logs error details
- User can retry by editing again

### 5. **Review Workflow**

**Marking a band as reviewed:**

1. Edit band information as needed
2. Check "Mark as Reviewed" checkbox
3. System auto-saves after 2 seconds
4. Band automatically removed from review list
5. Next band in list loads automatically (if available)

**If last band in list:**

- Form shows placeholder message
- "No bands to review!" message in list
- Success state reached! 🎉

## File Structure

```shell
admin/
├── index.html              # Main admin page
├── css/
│   └── admin.css          # Admin-specific styles
└── js/
    ├── admin.js           # Main coordination script
    ├── band-review-manager.js   # List management
    ├── band-edit-form.js        # Form handling
    └── notification.js          # Toast notifications
```

## Reused Public Assets

The admin panel reuses these files from the public site:

- `/styles.css` - Base styles, variables, header
- `/css/band-modal.css` - Some modal/form styles
- `/js/band-manager.js` - Band data loading utilities
- `/img/favicon.ico` - Favicon
- Header structure and branding

## Technical Implementation

### API Endpoint

**PUT `/api/bands/{bandKey}`**

Updates a band in `db.json`:

```javascript
fetch('/api/bands/within-temptation', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updatedBand)
})
```

**Response:**

```json
{
  "success": true,
  "message": "Band updated"
}
```

**Server-side:**

- Reads `db.json`
- Finds band by key
- Updates band data
- Writes back to `db.json`
- Returns success/error response

### Data Flow

```shell
User Edit
    ↓
Field Change Event
    ↓
Update Internal State
    ↓
Schedule Auto-Save (2s delay)
    ↓
PUT /api/bands/{key}
    ↓
Server Updates db.json
    ↓
Success Response
    ↓
Show Toast Notification
    ↓
If reviewed=true → Remove from List
```

### Classes

#### BandReviewManager

- Loads non-reviewed bands
- Handles sorting (A-Z, Z-A)
- Renders list
- Manages selection
- Removes reviewed bands

#### BandEditForm

- Renders all form fields
- Handles field changes
- Updates image previews
- Auto-saves after delay
- Manages arrays (genres, members)

#### Notification

- Shows toast messages
- Auto-hides after 3 seconds
- Supports success/error types

## Keyboard Shortcuts

Currently not implemented, but could add:

- `←` - Previous band
- `→` - Next band
- `Ctrl+S` - Manual save
- `Esc` - Clear form

## Browser Compatibility

**Tested on:**

- Chrome/Edge (Chromium)
- Firefox
- Safari

**Requirements:**

- ES6+ support
- Fetch API
- CSS Grid
- CSS Custom Properties (variables)

## Security Notes

⚠️ **Important Security Considerations:**

1. **No Authentication**
   - Anyone with local server access can edit bands
   - OK for local development only
   - DO NOT expose to internet

2. **Production Deployment**
   - Exclude `/admin` folder from production builds
   - Add to `.gitignore` if needed
   - Or use separate admin deployment

3. **Data Validation**
   - Limited server-side validation
   - Client handles most validation
   - Could add schema validation

## Common Tasks

### Review a New Band

1. Start local server: `python3 server.py`
2. Navigate to `http://localhost:8000/admin/`
3. Click band from list
4. Review/edit all fields
5. Check image previews work
6. Verify description, links, members
7. Check "Mark as Reviewed"
8. Wait for auto-save confirmation
9. Band disappears from list

### Batch Review Multiple Bands

1. Select first band from list
2. Review and mark as reviewed
3. System auto-loads next band
4. Repeat until list is empty
5. Use arrow keys for quick navigation

### Fix Image URLs

1. Select band with broken image
2. Update image URL in field
3. Preview updates live
4. Wait for green background (success)
5. Auto-saves automatically

### Add Missing Information

1. Select band with incomplete data
2. Add missing genres via "+ Add Genre"
3. Add missing members via "+ Add Member"
4. Fill in member name and role
5. Auto-saves all changes

## Troubleshooting

### Band list shows 0 bands

**Possible causes:**

- All bands are already reviewed ✅
- Server not running
- `db.json` not found

**Solution:**

- Check console for errors
- Verify server is running
- Check network tab in DevTools

### Auto-save not working

**Possible causes:**

- Server not running
- Network error
- Invalid data format

**Solution:**

- Check console for errors
- Verify PUT request in Network tab
- Check server logs for errors

### Image preview not loading

**Possible causes:**

- Invalid URL
- CORS restrictions
- Image host blocking requests

**Solution:**

- Verify URL is correct
- Try URL in new browser tab
- Check browser console for CORS errors

### Form not loading

**Possible causes:**

- JavaScript error
- Missing dependencies
- Band data malformed

**Solution:**

- Open browser console
- Check for JavaScript errors
- Verify band data structure

## Future Enhancements

Potential improvements for the admin panel:

1. **Bulk Operations**
   - Select multiple bands
   - Batch approve/reject
   - Bulk genre editing

2. **Search & Filters**
   - Search bands by name
   - Filter by country
   - Filter by genre

3. **Validation**
   - Required field indicators
   - URL format validation
   - Image dimension checks

4. **History**
   - Track edit history
   - Undo/redo changes
   - Change log

5. **Preview Mode**
   - Preview how band will look in public site
   - Modal preview
   - Timeline card preview

6. **Keyboard Shortcuts**
   - Navigate with arrow keys
   - Quick save
   - Quick approve

7. **Statistics**
   - Total bands reviewed
   - Review progress
   - Time estimates

8. **Authentication**
   - Simple password protection
   - User accounts
   - Edit permissions

9. **Image Upload**
   - Direct image upload
   - Image optimization
   - CDN integration

10. **AI Integration**
    - Auto-fill from band name
    - Suggest similar bands
    - Genre recommendations

## Related Documentation

- **Band Updater Scripts:** `scripts/README.md`
- **Reviewed Bands Feature:** `REVIEWED_BANDS_FEATURE.md`
- **Band Modal Refactoring:** `BAND_MODAL_REFACTORING.md`
- **Main Project README:** `README.md`
