#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

source "$(dirname "$0")/common.sh"

printf "\n${PURPLE}Minifying HTML files in build folder${RESET}\n"

# Check if build folder exists
if [ ! -d "build" ]; then
  printf "${RED}Error: build folder does not exist. Run 'pnpm build' first.${RESET}\n"
  exit 1
fi

# Initialize size counters
original_size=0
minified_size=0

# Find all HTML files in build folder and minify them
find build -name "*.html" -type f | while read -r file; do
  printf "${CYAN}Minifying: ${file}${RESET}\n"

  # Get original file size
  file_original_size=$(wc -c < "$file")

  # Create a temporary file
  temp_file="${file}.tmp"

  # Minify HTML file
  npx html-minifier-terser \
    --collapse-whitespace \
    --remove-comments \
    --remove-optional-tags \
    --remove-redundant-attributes \
    --remove-script-type-attributes \
    --remove-tag-whitespace \
    --use-short-doctype \
    --minify-css true \
    --minify-js true \
    --output "$temp_file" \
    "$file"

  # Replace original file with minified version
  mv "$temp_file" "$file"

  # Get minified file size
  file_minified_size=$(wc -c < "$file")

  # Calculate reduction
  file_reduction=$((file_original_size - file_minified_size))
  file_percent=$(awk "BEGIN {printf \"%.2f\", ($file_reduction / $file_original_size) * 100}")

  printf "${GREEN}✓ Minified: ${file} (${file_original_size} → ${file_minified_size} bytes, -${file_percent}%%)${RESET}\n"

  # Update totals
  original_size=$((original_size + file_original_size))
  minified_size=$((minified_size + file_minified_size))
done > /tmp/html_minify_output.txt

# Read the totals from the output
cat /tmp/html_minify_output.txt
original_size=$(find build -name "*.html" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')
rm -f /tmp/html_minify_output.txt

printf "\n${GREEN}HTML minification completed!${RESET}\n"
printf "${YELLOW}Total HTML files size: ${original_size} bytes${RESET}\n"
