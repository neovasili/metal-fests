#!/usr/bin/env python3
"""
Simple HTTP server for serving the Metal Festivals Timeline webpage.
This server resolves CORS issues when loading local JSON files.
"""

import http.server
import socketserver
import os
import sys

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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
            print(f"🤘 Metal Festivals Timeline Server 🤘")
            print(f"📡 Serving at: http://localhost:{PORT}")
            print(f"📁 Directory: {script_dir}")
            print(f"🌐 Open http://localhost:{PORT} in your browser")
            print(f"⏹️  Press Ctrl+C to stop the server\n")
            
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