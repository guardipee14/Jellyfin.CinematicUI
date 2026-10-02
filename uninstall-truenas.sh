#!/usr/bin/env bash
set -euo pipefail

PLUGIN_NAME='Cinematic UI'
DEFAULT_CONTAINER='ix-jellyfin-jellyfin-1'

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    echo "Run with sudo: sudo bash ./uninstall-truenas.sh" >&2
    exit 1
fi

CONTAINER="${JELLYFIN_CONTAINER:-$DEFAULT_CONTAINER}"
docker inspect "$CONTAINER" >/dev/null 2>&1 || { echo "Container '$CONTAINER' not found." >&2; exit 1; }
CONFIG_ROOT="$(docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/config"}}{{println .Source}}{{end}}{{end}}' | sed '/^[[:space:]]*$/d' | head -n1)"
[[ -n "$CONFIG_ROOT" ]] || { echo 'Could not locate /config host path.' >&2; exit 1; }
PLUGIN_DIR="$CONFIG_ROOT/plugins/$PLUGIN_NAME"

if [[ -d "$PLUGIN_DIR" ]]; then
    ARCHIVE="$CONFIG_ROOT/plugins/${PLUGIN_NAME}.removed-$(date +%Y%m%d-%H%M%S)"
    mv "$PLUGIN_DIR" "$ARCHIVE"
    echo "Plugin moved to: $ARCHIVE"
else
    echo "Plugin is not currently installed at: $PLUGIN_DIR"
fi

echo 'Restart Jellyfin from the TrueNAS Apps UI to complete removal.'
