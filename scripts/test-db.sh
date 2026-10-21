#!/usr/bin/env bash
# Runs the pgTAP suite against the local Supabase database.
# Same tests as `supabase test db`, but copies the files into the runner
# container, so it works when Docker can't bind-mount the repo (Colima only
# mounts the home folder, and this checkout may live under /tmp).
# Usage: scripts/test-db.sh [file.test.sql ...]
set -euo pipefail
cd "$(dirname "$0")/.."
project=$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' supabase/config.toml)
db="supabase_db_${project}"
net="supabase_network_${project}"
image=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -m1 'supabase/pg_prove')
files=("$@")
[ ${#files[@]} -eq 0 ] && files=(supabase/tests/database/*.test.sql)
cid=$(docker create --network "$net" -e PGPASSWORD=postgres "$image" \
  pg_prove --ext .sql -h "$db" -U postgres -d postgres /tests)
trap 'docker rm -f "$cid" >/dev/null' EXIT
tmp=$(mktemp -d)
cp "${files[@]}" "$tmp/"
docker cp "$tmp/." "$cid:/tests" >/dev/null
rm -rf "$tmp"
docker start -a "$cid"
