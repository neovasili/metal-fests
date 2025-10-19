#!/usr/bin/env python3
"""
Simple HTTP server for serving the Metal Festivals Timeline webpage.
This server resolves CORS issues when loading local JSON files.
Includes admin API endpoints for updating band data.
"""

import http.server
import socketserver
import os
import sys
import json
import re
from urllib.parse import urlparse

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # For clean URLs that don't exist as files, serve error.html
        # This allows client-side routing to take over
        if not os.path.exists(self.translate_path(self.path)):
            # Serve error.html for non-existent paths
            self.path = '/error.html'

        return super().do_GET()

    def do_PUT(self):
        """Handle PUT requests for updating band data"""
        # Check if this is an API request to update a band
        if self.path.startswith('/api/bands/'):
            self.handle_update_band()
        else:
            self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight"""
        self.send_response(200)
        self.end_headers()

    def handle_update_band(self):
        """Update band data in db.json"""
        try:
            # Extract band key from path
            band_key = self.path.split('/api/bands/')[1]

            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            updated_band = json.loads(body.decode('utf-8'))

            # Read current db.json
            db_path = 'db.json'
            with open(db_path, 'r', encoding='utf-8') as f:
                db_data = json.load(f)

            # Find and update the band
            band_found = False
            for i, band in enumerate(db_data['bands']):
                if band.get('key') == band_key:
                    db_data['bands'][i] = updated_band
                    band_found = True
                    break

            if not band_found:
                self.send_error(404, "Band not found")
                return

            # Write updated data back to db.json
            with open(db_path, 'w', encoding='utf-8') as f:
                json.dump(db_data, f, indent=2, ensure_ascii=False)
                f.write('\n')

            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = json.dumps({'success': True, 'message': 'Band updated'})
            self.wfile.write(response.encode('utf-8'))

            print(f"✅ Updated band: {updated_band.get('name')} ({band_key})")

        except json.JSONDecodeError as e:
            self.send_error(400, f"Invalid JSON: {str(e)}")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")
            print(f"❌ Error updating band: {str(e)}")

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def log_message(self, format, *args):
        # Override to provide cleaner logging
        print(f"[{self.address_string()}] {format % args}")

def main():
    # Change to the directory containing this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print("🤘 Metal Festivals Timeline Server (Local Dev) 🤘")
            print(f"📡 Serving at: http://localhost:{PORT}")
            print(f"📁 Directory: {script_dir}")
            print("🌐 For local development - access HTML files directly:")
            print(f"   Timeline: http://localhost:{PORT}/index.html")
            print(f"   Map:      http://localhost:{PORT}/map.html")
            print(f"   Admin:    http://localhost:{PORT}/admin/")
            print("   (Clean URLs handled by client-side router)")
            print("⏹️  Press Ctrl+C to stop the server\n")

            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use. Try a different port or stop the existing server.")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    main()
