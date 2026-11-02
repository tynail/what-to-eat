#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd /opt/weekly-table
exec 9>/run/lock/weekly-table-deploy.lock
flock -n 9 || { echo 'Deployment or backup already running.' >&2; exit 1; }
docker compose --project-directory /opt/weekly-table --env-file settings.env --env-file image.env -f compose.yaml --profile tools run --rm backup
retained=$(cat rollback-backup 2>/dev/null || true)
find backups -mindepth 1 -maxdepth 1 -type d -mtime +14 -name '20*T*Z' -print0 | while IFS= read -r -d '' path; do
  [[ ${path##*/} == "$retained" ]] || rm -rf -- "$path"
done
