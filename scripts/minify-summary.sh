#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

source "$(dirname "$0")/common.sh"

printf "\n${PURPLE}═══════════════════════════════════════════════════════════${RESET}\n"
printf "${PURPLE}              MINIFICATION SUMMARY REPORT${RESET}\n"
printf "${PURPLE}═══════════════════════════════════════════════════════════${RESET}\n\n"

# Get original sizes (before minification)
html_original=$(cat /tmp/minify_stats/html_original.txt 2>/dev/null || echo "0")
css_original=$(cat /tmp/minify_stats/css_original.txt 2>/dev/null || echo "0")
js_original=$(cat /tmp/minify_stats/js_original.txt 2>/dev/null || echo "0")
json_original=$(cat /tmp/minify_stats/json_original.txt 2>/dev/null || echo "0")

# Get minified file sizes
html_size=$(find build -name "*.html" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
css_size=$(find build -name "*.css" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
js_size=$(find build -name "*.js" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
json_size=$(find build -name "*.json" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")

# Get file counts
html_count=$(find build -name "*.html" -type f | wc -l)
css_count=$(find build -name "*.css" -type f | wc -l)
js_count=$(find build -name "*.js" -type f | wc -l)
json_count=$(find build -name "*.json" -type f | wc -l)

# Calculate totals
total_original=$((html_original + css_original + js_original + json_original))
total_size=$((html_size + css_size + js_size + json_size))
total_reduction=$((total_original - total_size))

# Calculate percentages
if [ "$html_original" -gt 0 ]; then
  html_percent=$(awk "BEGIN {printf \"%.2f\", (($html_original - $html_size) / $html_original) * 100}")
else
  html_percent="0.00"
fi

if [ "$css_original" -gt 0 ]; then
  css_percent=$(awk "BEGIN {printf \"%.2f\", (($css_original - $css_size) / $css_original) * 100}")
else
  css_percent="0.00"
fi

if [ "$js_original" -gt 0 ]; then
  js_percent=$(awk "BEGIN {printf \"%.2f\", (($js_original - $js_size) / $js_original) * 100}")
else
  js_percent="0.00"
fi

if [ "$json_original" -gt 0 ]; then
  json_percent=$(awk "BEGIN {printf \"%.2f\", (($json_original - $json_size) / $json_original) * 100}")
else
  json_percent="0.00"
fi

if [ "$total_original" -gt 0 ]; then
  total_percent=$(awk "BEGIN {printf \"%.2f\", (($total_original - $total_size) / $total_original) * 100}")
else
  total_percent="0.00"
fi

# Format sizes
html_kb=$(awk "BEGIN {printf \"%.2f\", $html_size / 1024}")
css_kb=$(awk "BEGIN {printf \"%.2f\", $css_size / 1024}")
js_kb=$(awk "BEGIN {printf \"%.2f\", $js_size / 1024}")
json_kb=$(awk "BEGIN {printf \"%.2f\", $json_size / 1024}")
total_kb=$(awk "BEGIN {printf \"%.2f\", $total_size / 1024}")

html_reduction=$((html_original - html_size))
css_reduction=$((css_original - css_size))
js_reduction=$((js_original - js_size))
json_reduction=$((json_original - json_size))

printf "${CYAN}File Type${RESET}     ${CYAN}Count${RESET}    ${CYAN}Original${RESET}      ${CYAN}Minified${RESET}      ${CYAN}Saved${RESET}         ${CYAN}Reduction${RESET}\n"
printf "───────────────────────────────────────────────────────────────────────────────────────────\n"
printf "${YELLOW}HTML${RESET}          %-6s   %8s B    %8s B    %8s B    ${GREEN}%6s%%${RESET}\n" "$html_count" "$html_original" "$html_size" "$html_reduction" "$html_percent"
printf "${YELLOW}CSS${RESET}           %-6s   %8s B    %8s B    %8s B    ${GREEN}%6s%%${RESET}\n" "$css_count" "$css_original" "$css_size" "$css_reduction" "$css_percent"
printf "${YELLOW}JavaScript${RESET}    %-6s   %8s B    %8s B    %8s B    ${GREEN}%6s%%${RESET}\n" "$js_count" "$js_original" "$js_size" "$js_reduction" "$js_percent"
printf "${YELLOW}JSON${RESET}          %-6s   %8s B    %8s B    %8s B    ${GREEN}%6s%%${RESET}\n" "$json_count" "$json_original" "$json_size" "$json_reduction" "$json_percent"
printf "───────────────────────────────────────────────────────────────────────────────────────────\n"
printf "${GREEN}TOTAL${RESET}                  %8s B    %8s B    %8s B    ${GREEN}%6s%%${RESET}\n\n" "$total_original" "$total_size" "$total_reduction" "$total_percent"

printf "${BLUE}Final build size: %.2f KB (%.2f MB)${RESET}\n" "$total_kb" "$(awk "BEGIN {printf \"%.2f\", $total_size / 1048576}")"
printf "${BLUE}Total saved: %s bytes (%.2f KB)${RESET}\n\n" "$total_reduction" "$(awk "BEGIN {printf \"%.2f\", $total_reduction / 1024}")"

printf "${PURPLE}═══════════════════════════════════════════════════════════${RESET}\n\n"
