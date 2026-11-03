#!/usr/bin/env bash
# Turns a finished `npm run build` into a release file for scripts/deploy.sh.
#
#   bash scripts/package-release.sh <release.tgz>
set -euo pipefail

cd "$(dirname "$0")/.."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
# Secrets stay on the server, whichever machine did the build.
rm -f .next/standalone/.env*
tar -czf "$1" -C .next/standalone .
