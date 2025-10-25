#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

source "$(dirname "$0")/common.sh"

printf "\n${PURPLE}Minifying JSON files in build folder${RESET}\n"

# Check if build folder exists
if [ ! -d "build" ]; then
  printf "${RED}Error: build folder does not exist. Run 'pnpm build' first.${RESET}\n"
  exit 1
fi

# Initialize size counters
original_size=0
minified_size=0

# Find all JSON files in build folder and minify them
find build -name "*.json" -type f | while read -r file; do
  printf "${CYAN}Minifying: ${file}${RESET}\n"

  # Get original file size
  file_original_size=$(wc -c < "$file")

  # Create a temporary file
  temp_file="${file}.tmp"

  # Minify JSON by removing whitespace using jq
  jq -c . "$file" > "$temp_file"

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
done > /tmp/json_minify_output.txt

# Read the output
cat /tmp/json_minify_output.txt
original_size=$(find build -name "*.json" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')
rm -f /tmp/json_minify_output.txt

printf "\n${GREEN}JSON minification completed!${RESET}\n"
printf "${YELLOW}Total JSON files size: ${original_size} bytes${RESET}\n"
