#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

source scripts/common.sh

printf "\n${PURPLE}Cleanup build folder${RESET}\n"

rm -rf build/

printf "\n${PURPLE}Create build folder${RESET}\n"

mkdir -p build

printf "\n${PURPLE}Copy files to build folder${RESET}\n"

cp -r ./js ./build/
cp -r ./img ./build/
cp -r ./css ./build/
cp -r ./fonts ./build/
cp -r ./components ./build/
# TODO: Do not copy admin folder for production builds for now
# cp -r ./admin ./build/
cp *.html ./build/
cp script.js ./build/
cp db.json ./build/

printf "\n${PURPLE}Remove test files from build folder${RESET}\n"

find ./build -type f -name "*.test.js" -delete

printf "\n${PURPLE}Minifying and obfuscating build files${RESET}\n"

# Save original sizes before minification
mkdir -p /tmp/minify_stats
find build -name "*.html" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' > /tmp/minify_stats/html_original.txt
find build -name "*.css" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' > /tmp/minify_stats/css_original.txt
find build -name "*.js" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' > /tmp/minify_stats/js_original.txt
find build -name "*.json" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' > /tmp/minify_stats/json_original.txt

# Run minification scripts
./scripts/minify-html.sh
./scripts/minify-css.sh
./scripts/minify-js.sh
./scripts/minify-json.sh

# Show summary
./scripts/minify-summary.sh

# Clean up stats
rm -rf /tmp/minify_stats

printf "\n${GREEN}Build completed successfully!${RESET}\n"
