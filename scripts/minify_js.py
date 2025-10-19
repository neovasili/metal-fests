#!/usr/bin/env python3
"""
JavaScript Minification Script
Minifies all JavaScript files in the project
"""

import os
import sys
import subprocess
from pathlib import Path

try:
    import rjsmin
except ImportError:
    print("❌ rjsmin not installed. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "rjsmin"])
    import rjsmin


# Output directory for minified files
BUILD_DIR = "build"


def ensure_dir(directory: str):
    """Ensure directory exists"""
    Path(directory).mkdir(parents=True, exist_ok=True)


def minify_js_file(file_path: str):
    """Minify a single JavaScript file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Minify JavaScript
        minified = rjsmin.jsmin(content)

        ensure_dir(BUILD_DIR)

        # Write back to same file (in-place minification)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(minified)

        original_size = len(content.encode("utf-8"))
        minified_size = len(minified.encode("utf-8"))
        savings = (
            ((1 - minified_size / original_size) * 100)
            if original_size > 0
            else 0
        )

        print(
            f"✓ {file_path}: {original_size} → {minified_size} bytes "
            f"({savings:.2f}% reduction)"
        )
    except Exception as e:
        print(f"✗ Error minifying {file_path}: {e}")
        sys.exit(1)


def main():
    """Main execution"""
    print("🔨 Minifying JavaScript files...\n")

    # Find JavaScript files in build folder
    try:
        result = subprocess.run(
            ["find", BUILD_DIR, "-type", "f", "-name", "*.js"],
            capture_output=True,
            text=True,
            check=True,
        )
        js_files = [f for f in result.stdout.strip().split("\n") if f]
    except subprocess.CalledProcessError:
        print(f"⚠ No JavaScript files found in {BUILD_DIR}")
        return

    for file in js_files:
        if os.path.exists(file):
            minify_js_file(file)
        else:
            print(f"⚠ File not found: {file}")

    print("\n✅ JavaScript minification complete!")


if __name__ == "__main__":
    main()
