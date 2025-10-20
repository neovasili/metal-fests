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
cp *.html ./build/
cp script.js ./build/
cp db.json ./build/

printf "\n${GREEN}Build completed successfully!${RESET}\n"
