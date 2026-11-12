#!/usr/bin/env bash
# Download tradle.net's daily schedule and per-country export data into public/
# so this build shows the same country and the same treemap values as
# tradle.net. (tradle.net doesn't allow cross-origin requests, so the browser
# can't read these files from there directly.)
#
# Country files that already exist are kept (the data is static); pass
# FORCE=1 to re-download everything. Failed downloads never replace a good
# file, and the treemap falls back to OEC's data API for missing countries.
set -euo pipefail

BASE="https://tradle.net"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/public"
OUT="$PUBLIC/countries"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# 1. Schedule
if curl -fsSL "$BASE/data.csv" -o "$TMP/schedule.csv" &&
  head -1 "$TMP/schedule.csv" | grep -q '^date,country' &&
  [ "$(wc -l <"$TMP/schedule.csv")" -ge "$(wc -l <"$PUBLIC/data.new.csv")" ]; then
  cp "$TMP/schedule.csv" "$PUBLIC/data.new.csv"
  echo "Schedule updated (last entry: $(tail -1 "$PUBLIC/data.new.csv"))"
else
  echo "::warning::Could not refresh the schedule from tradle.net; keeping the existing copy"
fi

# 2. Country export data, for every country in the schedule
fetch_country() {
  local code="$1"
  [ -s "$OUT/$code.csv" ] && [ "${FORCE:-0}" != 1 ] && return 0
  if curl -fsSL "$BASE/countries/$code.csv" -o "$TMP/$code.csv" 2>/dev/null &&
    head -1 "$TMP/$code.csv" | grep -q '^Section ID,'; then
    mv "$TMP/$code.csv" "$OUT/$code.csv"
  else
    echo "  no data on tradle.net for: $code"
  fi
}
export -f fetch_country
export BASE OUT TMP FORCE

tail -n +2 "$PUBLIC/data.new.csv" | tr -d '\r' | cut -d, -f2 | tr 'A-Z' 'a-z' | sort -u |
  xargs -P 4 -I{} bash -c 'fetch_country "$@"' _ {}

# 3. Index of available files, so the app knows which countries to load locally
(
  cd "$OUT"
  ls -1 *.csv 2>/dev/null | sed 's/\.csv$//' |
    python3 -c 'import json,sys; print(json.dumps(sorted(l.strip() for l in sys.stdin if l.strip())))'
) >"$OUT/index.json"
echo "Country data files: $(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))))' "$OUT/index.json")"
