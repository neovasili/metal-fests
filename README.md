# European Metal Festivals 2026 Timeline

A responsive web application displaying a timeline of heavy metal festivals across Europe in 2026.

## Features

- 🎸 **Interactive Timeline**: Vertical timeline with festivals positioned chronologically
- 🎨 **Dark Metal Theme**: Metal-inspired design with orange accents
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎵 **Festival Information**: Complete details including bands, dates, locations, and ticket prices
- ⚡ **Vanilla JavaScript**: No frameworks needed, fast and lightweight

## Running the Application

Due to browser CORS restrictions, you cannot open `index.html` directly. You need to serve the files through a local HTTP server.

### Option 1: Using the included Python server (Recommended)

```bash
# Navigate to the project directory
cd /Users/neovasili/workspace/personal/metal-fests

# Run the server
python3 server.py
```

Then open your browser and go to: **http://localhost:8000**

### Option 2: Using Python's built-in server

```bash
# Navigate to the project directory
cd /Users/neovasili/workspace/personal/metal-fests

# Start the server
python3 -m http.server 8000
```

Then open your browser and go to: **http://localhost:8000**

### Option 3: Using Node.js (if you have it installed)

```bash
# Install a simple server globally
npm install -g http-server

# Navigate to the project directory
cd /Users/neovasili/workspace/personal/metal-fests

# Start the server
http-server -p 8000
```

Then open your browser and go to: **http://localhost:8000**

## Files Structure

```
metal-fests/
├── index.html          # Main HTML file
├── styles.css          # All styling and responsive design
├── script.js           # JavaScript functionality
├── db.json            # Festival data
├── server.py          # Python server script
└── README.md          # This file
```

## Festival Data

The `db.json` file contains information about 7 major European metal festivals:

- **Wacken Open Air** (Germany) - July 30-Aug 1
- **Download Festival** (UK) - June 11-13
- **Hellfest** (France) - June 18-21
- **Sweden Rock Festival** (Sweden) - June 3-6
- **Graspop Metal Meeting** (Belgium) - June 25-27
- **Resurrection Fest** (Spain) - July 1-4
- **Masters of Rock** (Czech Republic) - July 9-11

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

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Troubleshooting

**CORS Error**: Make sure you're running a local server instead of opening the HTML file directly.

**Images not loading**: The poster images use Unsplash URLs. If they don't load, check your internet connection or replace with local image paths.

**Port already in use**: If port 8000 is busy, edit `server.py` and change the `PORT` variable to a different number (e.g., 8080, 3000, etc.).

---

🤘 **Enjoy exploring the metal festivals of Europe!** 🤘