#!/usr/bin/env bash
set -euo pipefail
[[ ${EUID:-$(id -u)} -eq 0 ]] || { echo 'Run with sudo bash ./uninstall-truenas.sh' >&2; exit 1; }
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER="${JELLYFIN_CONTAINER:-ix-jellyfin-jellyfin-1}"
docker inspect "$CONTAINER" >/dev/null
CONFIG_ROOT="$(docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/config"}}{{println .Source}}{{end}}{{end}}' | sed '/^[[:space:]]*$/d' | head -n1)"
[[ -n "$CONFIG_ROOT" && -d "$CONFIG_ROOT" ]] || { echo 'Could not locate /config host path.' >&2; exit 1; }
BACKUP_ROOT="$CONFIG_ROOT/cinematic-ui-backups/removed-$(date +%Y%m%d-%H%M%S)"
python3 "$SCRIPT_DIR/scripts/manual.py" archive --config-root "$CONFIG_ROOT" --backup "$BACKUP_ROOT"
echo 'Configuration XML was retained. Restart Jellyfin through the TrueNAS Apps UI to complete removal.'
