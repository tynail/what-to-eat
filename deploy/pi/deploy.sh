#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
image=${1:-}
revision=${2:-}
if [[ ! $image =~ ^ghcr\.io/tynail/what-to-eat@sha256:[0-9a-f]{64}$ || ! $revision =~ ^[0-9a-f]{40}$ || $# -ne 2 ]]; then
  echo 'Usage: deploy.sh ghcr.io/tynail/what-to-eat@sha256:<digest> <40-character commit SHA>' >&2
  exit 2
fi
cd /opt/weekly-table
exec 9>/run/lock/weekly-table-deploy.lock
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
docker pull --platform linux/arm64 "$image"
architecture=$(docker image inspect --format '{{.Architecture}}' "$image")
label=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")
[[ $architecture == arm64 && $label == "$revision" ]] || { echo 'Image architecture or revision mismatch.' >&2; exit 1; }
[[ -f settings.env && -f image.env ]] || { echo 'Install settings.env and image.env first.' >&2; exit 1; }
compose=(docker compose --project-directory /opt/weekly-table --env-file settings.env --env-file image.env -f compose.yaml)
"${compose[@]}" config --quiet
restart_existing_app() {
  local status=$?
  trap - EXIT
  if (( status != 0 )); then
    echo 'Deployment failed before image switch. Restarting existing app.' >&2
    "${compose[@]}" start app || echo 'App restart failed. Start the existing app manually.' >&2
  fi
  exit "$status"
}
trap restart_existing_app EXIT
"${compose[@]}" stop app
backup_output=$("${compose[@]}" --profile tools run --rm backup)
printf '%s\n' "$backup_output"
backup_path=$(printf '%s\n' "$backup_output" | sed -n 's/^Backup ready: \/backups\///p')
[[ $backup_path =~ ^[0-9]{8}T[0-9]{12}Z$ && -f backups/$backup_path/meals.db && -d backups/$backup_path/keys ]] || { echo 'Backup verification failed.' >&2; exit 1; }
printf '%s\n' "$backup_path" > rollback-backup
printf 'APP_IMAGE=%s\n' "$image" > image.env.new
mv -f image.env.new image.env
trap - EXIT
"${compose[@]}" up -d app proxy tunnel
ready=false
for attempt in {1..30}; do
  if "${compose[@]}" exec -T proxy wget -q -O /dev/null --header="Host: $(sed -n 's/^DOMAIN=//p' settings.env)" http://127.0.0.1:8080/health; then ready=true; break; fi
  sleep 2
done
$ready || { echo 'Internal health check failed. Inspect docker compose logs; restore the recorded backup with its matching image.' >&2; exit 1; }
domain=$(sed -n 's/^DOMAIN=//p' settings.env)
if ! curl --fail --silent --show-error --max-time 15 "https://$domain/health" >/dev/null; then
  echo 'Public HTTPS health check failed. Inspect tunnel, DNS, and application logs.' >&2
  exit 1
fi
printf 'commit=%s\nimage=%s\nbackup=%s\n' "$revision" "$image" "$backup_path" > last-successful-release.new
mv -f last-successful-release.new last-successful-release
echo 'Deployment succeeded.'
