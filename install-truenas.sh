#!/usr/bin/env bash
set -euo pipefail
PLUGIN_NAME='Cinematic UI'
PLUGIN_DLL='Jellyfin.Plugin.CinematicUI.dll'
SDK_IMAGE='mcr.microsoft.com/dotnet/sdk:10.0'
CONTAINER="${JELLYFIN_CONTAINER:-ix-jellyfin-jellyfin-1}"
say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
[[ ${EUID:-$(id -u)} -eq 0 ]] || die 'Run with sudo bash ./install-truenas.sh'
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
command -v docker >/dev/null || die 'Docker is required on TrueNAS SCALE.'
command -v python3 >/dev/null || die 'Python 3 is required; use the normal catalog install instead.'
docker inspect "$CONTAINER" >/dev/null || die "Container '$CONTAINER' not found. Set JELLYFIN_CONTAINER."
VERSION="$(python3 "$SCRIPT_DIR/scripts/release.py" check-source --root "$SCRIPT_DIR")"
TAG="v${VERSION%.0}"
SERVER_VERSION="$(docker exec "$CONTAINER" sh -c 'jellyfin --version 2>/dev/null || /jellyfin/jellyfin --version')"
[[ "$SERVER_VERSION" == *'12.1.0.0'* ]] || die "Expected Jellyfin 12.1.0.0; got $SERVER_VERSION"
CONFIG_ROOT="$(docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/config"}}{{println .Source}}{{end}}{{end}}' | sed '/^[[:space:]]*$/d' | head -n1)"
[[ -n "$CONFIG_ROOT" && -d "$CONFIG_ROOT" ]] || die 'Could not locate the persistent /config host path.'
BUILD_DIR="$(mktemp -d /tmp/cinematic-ui-build.XXXXXX)"
trap 'rm -rf -- "$BUILD_DIR"' EXIT
cp -a "$SCRIPT_DIR/." "$BUILD_DIR/"
rm -rf -- "$BUILD_DIR/bin" "$BUILD_DIR/obj" "$BUILD_DIR/dist" "$BUILD_DIR/artifacts" "$BUILD_DIR/.git"
say 'Building with the isolated official .NET 10 SDK image'
docker pull "$SDK_IMAGE"
docker run --rm -e DOTNET_CLI_TELEMETRY_OPTOUT=1 -e DOTNET_NOLOGO=1 -v "$BUILD_DIR:/src" -w /src "$SDK_IMAGE" \
    sh -c 'dotnet restore Jellyfin.Plugin.CinematicUI.csproj && dotnet build Jellyfin.Plugin.CinematicUI.csproj -c Release --no-restore -warnaserror && dotnet run --project tests/Contracts/Contracts.csproj -c Release -- .'
DLL_PATH="$BUILD_DIR/bin/Release/net10.0/$PLUGIN_DLL"
[[ -s "$DLL_PATH" ]] || die 'Build did not produce the plugin DLL.'
ARTIFACT_DIR="$SCRIPT_DIR/artifacts"
python3 "$SCRIPT_DIR/scripts/release.py" package --root "$BUILD_DIR" --tag "$TAG" --output "$ARTIFACT_DIR"
PLUGIN_ROOT="$CONFIG_ROOT/plugins"
BACKUP_ROOT="$CONFIG_ROOT/cinematic-ui-backups/$(date +%Y%m%d-%H%M%S)"
say 'Archiving previous plugin copies outside Jellyfin plugin discovery'
python3 "$SCRIPT_DIR/scripts/manual.py" archive --config-root "$CONFIG_ROOT" --backup "$BACKUP_ROOT"
PLUGIN_DIR="$PLUGIN_ROOT/${PLUGIN_NAME}_${VERSION}"
mkdir -p "$PLUGIN_DIR"
install -m 0644 "$DLL_PATH" "$PLUGIN_DIR/$PLUGIN_DLL"
install -m 0644 "$BUILD_DIR/meta.json" "$PLUGIN_DIR/meta.json"
# Match the app's existing effective user, without changing app ownership or container settings.
PLUGIN_UID="$(docker exec "$CONTAINER" id -u)"
PLUGIN_GID="$(docker exec "$CONTAINER" id -g)"
chown "$PLUGIN_UID:$PLUGIN_GID" "$PLUGIN_DIR" "$PLUGIN_DIR/$PLUGIN_DLL" "$PLUGIN_DIR/meta.json"
printf '\nInstalled %s at: %s\n' "$VERSION" "$PLUGIN_DIR"
printf 'Runtime package: %s\n' "$ARTIFACT_DIR/CinematicUI-$TAG-jf12.1.zip"
printf 'Backups: %s\n' "$BACKUP_ROOT"
printf '\nRestart Jellyfin through the TrueNAS Apps UI, then hard-refresh Jellyfin Web.\n'
printf 'Normal future updates use Jellyfin Update Plugins after adding the documented repository URL.\n'
