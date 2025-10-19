#!/usr/bin/env python3
"""
JSON Minification Script
Minifies the db.json file
"""

import json
import os
import sys
import subprocess
from pathlib import Path


# Output directory for minified files
BUILD_DIR = "build"


def ensure_dir(directory: str):
    """Ensure directory exists"""
    Path(directory).mkdir(parents=True, exist_ok=True)


def minify_json_file(file_path: str):
    """Minify a single JSON file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Parse and minify JSON by removing all whitespace
        parsed = json.loads(content)
        minified = json.dumps(parsed, separators=(",", ":"))

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
    except json.JSONDecodeError as e:
        print(f"✗ Invalid JSON in {file_path}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error minifying {file_path}: {e}")
        sys.exit(1)


def main():
    """Main execution"""
    print("🔨 Minifying JSON files...\n")

    # Find JSON files in build folder
    try:
        result = subprocess.run(
            ["find", BUILD_DIR, "-type", "f", "-name", "*.json"],
            capture_output=True,
            text=True,
            check=True,
        )
        json_files = [f for f in result.stdout.strip().split("\n") if f]
    except subprocess.CalledProcessError:
        print(f"⚠ No JSON files found in {BUILD_DIR}")
        return

    for file in json_files:
        if os.path.exists(file):
            minify_json_file(file)
        else:
            print(f"⚠ File not found: {file}")

    print("\n✅ JSON minification complete!")


if __name__ == "__main__":
    main()
