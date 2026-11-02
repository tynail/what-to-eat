#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cat > "$tmp/sudo" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$@"
EOF
chmod +x "$tmp/sudo"
export PATH="$tmp:$PATH"
image="ghcr.io/tynail/what-to-eat@sha256:$(printf 'a%.0s' {1..64})"
revision=$(printf 'b%.0s' {1..40})
expected=$(printf '%s\n' -n /opt/weekly-table/deploy.sh "$image" "$revision")
actual=$(SSH_ORIGINAL_COMMAND="deploy $image $revision" bash "$root/deploy/pi/deploy-ssh.sh")
[[ $actual == "$expected" ]] || { echo 'Valid deployment command was not passed intact.' >&2; exit 1; }
for command in "deploy $image $revision; id" "deploy $image $revision extra" "deploy other@sha256:abc $revision" '' 'bash'; do
  if SSH_ORIGINAL_COMMAND="$command" bash "$root/deploy/pi/deploy-ssh.sh" >/dev/null 2>&1; then
    echo 'Invalid SSH command was accepted.' >&2
    exit 1
  fi
done
if bash "$root/deploy/pi/deploy.sh" 'invalid' "$revision" >/dev/null 2>&1; then
  echo 'Invalid image was accepted.' >&2
  exit 1
fi
mkdir -p "$tmp/deployment"
sed -e "s|/opt/weekly-table|$tmp/deployment|g" -e "s|/run/lock/weekly-table-deploy.lock|$tmp/deploy.lock|g" "$root/deploy/pi/deploy.sh" > "$tmp/deploy.sh"
cat > "$tmp/flock" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$tmp/docker" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$TEST_CALLS"
case "$*" in
  'image inspect'*Architecture*) echo arm64 ;;
  'image inspect'*) echo "$TEST_REVISION" ;;
  *'run --rm backup')
    case "$TEST_SCENARIO" in
      backup-error) exit 23 ;;
      invalid-backup) echo 'Backup ready: /backups/invalid' ;;
      *)
        mkdir -p "$TEST_DEPLOY_DIR/backups/20261101T030000000000Z/keys"
        touch "$TEST_DEPLOY_DIR/backups/20261101T030000000000Z/meals.db"
        echo 'Backup ready: /backups/20261101T030000000000Z'
        ;;
    esac
    ;;
  *'up -d app proxy tunnel') exit 24 ;;
  *'start app')
    [[ $(cat "$TEST_DEPLOY_DIR/image.env") == APP_IMAGE=old-image ]] || exit 25
    ;;
esac
EOF
chmod +x "$tmp/flock" "$tmp/docker"
export TEST_CALLS="$tmp/docker-calls" TEST_DEPLOY_DIR="$tmp/deployment" TEST_REVISION="$revision"
for TEST_SCENARIO in backup-error invalid-backup post-switch-error; do
  export TEST_SCENARIO
  printf 'DOMAIN=meals.example.com\n' > "$TEST_DEPLOY_DIR/settings.env"
  printf 'APP_IMAGE=old-image\n' > "$TEST_DEPLOY_DIR/image.env"
  : > "$TEST_CALLS"
  status=0
  bash "$tmp/deploy.sh" "$image" "$revision" > "$tmp/deploy-output" 2>&1 || status=$?
  case "$TEST_SCENARIO" in
    backup-error) expected_status=23 ;;
    invalid-backup) expected_status=1 ;;
    post-switch-error) expected_status=24 ;;
  esac
  [[ $status == "$expected_status" ]] || { cat "$tmp/deploy-output"; echo "Unexpected exit status for $TEST_SCENARIO: $status" >&2; exit 1; }
  if [[ $TEST_SCENARIO == post-switch-error ]]; then
    if grep -q ' start app$' "$TEST_CALLS"; then
      echo 'App was restarted after image switch.' >&2
      exit 1
    fi
  else
    grep -q ' start app$' "$TEST_CALLS" || { echo "Existing app was not restarted for $TEST_SCENARIO." >&2; exit 1; }
  fi
done
echo 'Deployment command guards passed.'
