#!/usr/bin/env python3
"""
HTML Minification Script
Minifies all HTML files in the project
"""

import os
import sys
import subprocess
from pathlib import Path

try:
    import htmlmin
except ImportError:
    print("❌ htmlmin not installed. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "htmlmin"])
    import htmlmin


# Output directory for minified files
BUILD_DIR = "build"


def ensure_dir(directory: str):
    """Ensure directory exists"""
    Path(directory).mkdir(parents=True, exist_ok=True)


def minify_html_file(file_path: str):
    """Minify a single HTML file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Minify HTML
        minified = htmlmin.minify(
            content,
            remove_comments=True,
            remove_empty_space=True,
            remove_all_empty_space=False,
            reduce_empty_attributes=True,
            reduce_boolean_attributes=True,
            remove_optional_attribute_quotes=False,
            convert_charrefs=True,
            keep_pre=True,
        )

        ensure_dir(BUILD_DIR)

        # Write back to same file (in-place minification)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(minified)

        original_size = len(content.encode("utf-8"))
        minified_size = len(minified.encode("utf-8"))
        savings = ((1 - minified_size / original_size) * 100) if original_size > 0 else 0

        print(
            f"✓ {file_path}: {original_size} → {minified_size} bytes "
            f"({savings:.2f}% reduction)"
        )
    except Exception as e:
        print(f"✗ Error minifying {file_path}: {e}")
        sys.exit(1)


def main():
    """Main execution"""
    print("🔨 Minifying HTML files...\n")

    # Find HTML files in build folder
    try:
        result = subprocess.run(
            ["find", BUILD_DIR, "-type", "f", "-name", "*.html"],
            capture_output=True,
            text=True,
            check=True,
        )
        html_files = [f for f in result.stdout.strip().split("\n") if f]
    except subprocess.CalledProcessError:
        print(f"⚠ No HTML files found in {BUILD_DIR}")
        return

    for file in html_files:
        if os.path.exists(file):
            minify_html_file(file)
        else:
            print(f"⚠ File not found: {file}")

    print("\n✅ HTML minification complete!")


if __name__ == "__main__":
    main()
