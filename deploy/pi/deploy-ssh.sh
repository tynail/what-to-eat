#!/usr/bin/env bash
set -euo pipefail
# SSH_ORIGINAL_COMMAND is data, never shell code.
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ (ghcr\.io/tynail/what-to-eat@sha256:[0-9a-f]{64})\ ([0-9a-f]{40})$ ]]; then
  exec sudo -n /opt/weekly-table/deploy.sh "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
fi
echo 'Invalid deployment request.' >&2
exit 2
