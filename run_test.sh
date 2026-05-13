#!/bin/bash
set -eo pipefail
cd "$(dirname "$0")"
npx mocha test/ --recursive --timeout 10000 --no-warnings
