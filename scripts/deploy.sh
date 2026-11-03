#!/usr/bin/env bash
# Runs on the server (GitHub Actions calls it over SSH; see the README). Swaps in
# a release made by scripts/package-release.sh and restarts it under pm2. If it
# doesn't turn healthy, the previous release comes back. Deletes the release file.
#
#   bash scripts/deploy.sh <release.tgz>
set -euo pipefail

release="$1"
trap 'rm -f "$release"' EXIT
repo="$(cd "$(dirname "$0")/.." && pwd)"
app="$HOME/kotes-app"

start() {
  pm2 delete kotes-app >/dev/null 2>&1 || true
  # Localhost only: nginx is the way in.
  (cd "$app/current" && NODE_ENV=production HOSTNAME=127.0.0.1 PORT=3000 pm2 start server.js --name kotes-app >/dev/null)
  pm2 save >/dev/null
}

# /api/health also proves the database is reachable.
healthy() {
  for _ in $(seq 1 30); do
    curl -fsS --max-time 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

mkdir -p "$app"
rm -rf "$app/next" "$app/previous" "$app/failed"
mkdir "$app/next"
tar -xzf "$release" -C "$app/next"
# One settings file, kept beside the clone. git ignores it.
ln -sfn "$repo/.env.production" "$app/next/.env.production"

if [ -d "$app/current" ]; then
  mv "$app/current" "$app/previous"
fi
mv "$app/next" "$app/current"
start

if ! healthy; then
  echo "The new release isn't healthy. Last logs:" >&2
  pm2 logs kotes-app --nostream --lines 30 >&2 || true
  if [ -d "$app/previous" ]; then
    echo "Rolling back to the previous release." >&2
    mv "$app/current" "$app/failed"
    mv "$app/previous" "$app/current"
    start
  fi
  exit 1
fi

echo "Deployed and healthy."
