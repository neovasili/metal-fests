#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

source "$(dirname "$0")/common.sh"

printf "\n${PURPLE}Minifying and obfuscating JavaScript files in build folder${RESET}\n"

# Check if build folder exists
if [ ! -d "build" ]; then
  printf "${RED}Error: build folder does not exist. Run 'pnpm build' first.${RESET}\n"
  exit 1
fi

# Initialize size counters
original_size=0
minified_size=0

# Find all JS files in build folder
find build -name "*.js" -type f | while read -r file; do
  printf "${CYAN}Processing: ${file}${RESET}\n"

  # Get original file size
  file_original_size=$(wc -c < "$file")

  # Create a backup of original file
  cp "$file" "${file}.orig"

  # Step 1: Minify with Terser and save to temp file
  npx terser "${file}.orig" \
    --compress \
    --mangle \
    --output "$file"

  # TODO: do not obfuscate for now as it increases size and breaks some functionality
  # Step 2: Obfuscate with javascript-obfuscator - overwrite the file
  # npx javascript-obfuscator "$file" \
  #   --output "$file" \
  #   --compact true \
  #   --control-flow-flattening false \
  #   --dead-code-injection false \
  #   --debug-protection false \
  #   --disable-console-output false \
  #   --identifier-names-generator hexadecimal \
  #   --log false \
  #   --numbers-to-expressions false \
  #   --rename-globals false \
  #   --self-defending false \
  #   --simplify true \
  #   --split-strings false \
  #   --string-array true \
  #   --string-array-calls-transform false \
  #   --string-array-index-shift true \
  #   --string-array-rotate true \
  #   --string-array-shuffle true \
  #   --string-array-wrappers-count 1 \
  #   --string-array-wrappers-chained-calls true \
  #   --string-array-wrappers-parameters-max-count 2 \
  #   --string-array-wrappers-type variable \
  #   --string-array-threshold 0.75 \
  #   --unicode-escape-sequence false

  # Get minified file size
  file_minified_size=$(wc -c < "$file")

  # Calculate reduction
  file_reduction=$((file_original_size - file_minified_size))
  if [ "$file_original_size" -gt 0 ]; then
    file_percent=$(awk "BEGIN {printf \"%.2f\", ($file_reduction / $file_original_size) * 100}")
  else
    file_percent="0.00"
  fi

  printf "${GREEN}✓ Processed: ${file} (${file_original_size} → ${file_minified_size} bytes, -${file_percent}%%)${RESET}\n"

  # Clean up backup file
  rm -f "${file}.orig"

  # Update totals
  original_size=$((original_size + file_original_size))
  minified_size=$((minified_size + file_minified_size))
done > /tmp/js_minify_output.txt

# Read the output
cat /tmp/js_minify_output.txt
original_size=$(find build -name "*.js" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')
rm -f /tmp/js_minify_output.txt

printf "\n${GREEN}JavaScript minification and obfuscation completed!${RESET}\n"
printf "${YELLOW}Total JavaScript files size: ${original_size} bytes${RESET}\n"
