#!/usr/bin/env bash
set -euo pipefail

PLUGIN_NAME='Cinematic UI'
PLUGIN_DLL='Jellyfin.Plugin.CinematicUI.dll'
PROJECT='Jellyfin.Plugin.CinematicUI.csproj'
SDK_IMAGE='mcr.microsoft.com/dotnet/sdk:10.0'
DEFAULT_CONTAINER='ix-jellyfin-jellyfin-1'

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    die "Run this installer with sudo: sudo bash ./install-truenas.sh"
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER="${JELLYFIN_CONTAINER:-$DEFAULT_CONTAINER}"

command -v docker >/dev/null 2>&1 || die "docker was not found. This installer is intended for the TrueNAS SCALE shell."
docker inspect "$CONTAINER" >/dev/null 2>&1 || die "Jellyfin container '$CONTAINER' was not found. Set JELLYFIN_CONTAINER to the correct name and retry."

say "Checking Jellyfin container"
SERVER_VERSION="$(docker exec "$CONTAINER" sh -lc 'jellyfin --version 2>/dev/null || /jellyfin/jellyfin --version 2>/dev/null || true' | head -n1 | tr -d '\r')"
if [[ -n "$SERVER_VERSION" ]]; then
    printf 'Jellyfin: %s\n' "$SERVER_VERSION"
    if [[ "$SERVER_VERSION" != *'12.1'* ]]; then
        printf 'WARNING: this build targets Jellyfin 12.1. Continue only if you know this server is compatible.\n' >&2
    fi
else
    printf 'Jellyfin version could not be read automatically; continuing with the 12.1-targeted build.\n'
fi

CONFIG_ROOT="$(docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/config"}}{{println .Source}}{{end}}{{end}}' | sed '/^[[:space:]]*$/d' | head -n1)"
[[ -n "$CONFIG_ROOT" ]] || die "Could not locate the host path mounted at /config."
[[ -d "$CONFIG_ROOT" ]] || die "Detected /config source does not exist: $CONFIG_ROOT"

PLUGIN_ROOT="$CONFIG_ROOT/plugins"
PLUGIN_DIR="$PLUGIN_ROOT/$PLUGIN_NAME"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$PLUGIN_ROOT/${PLUGIN_NAME}.backup-$TIMESTAMP"
BUILD_DIR="$(mktemp -d /tmp/cinematic-ui-build.XXXXXX)"
trap 'rm -rf "$BUILD_DIR"' EXIT

say "Preparing isolated build directory"
cp -a "$SCRIPT_DIR/." "$BUILD_DIR/"
rm -rf "$BUILD_DIR/bin" "$BUILD_DIR/obj" "$BUILD_DIR/dist" "$BUILD_DIR/artifacts" 2>/dev/null || true

say "Pulling .NET 10 SDK build image"
docker pull "$SDK_IMAGE"

say "Building Cinematic UI for Jellyfin 12.1"
docker run --rm \
    -e DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    -e DOTNET_NOLOGO=1 \
    -v "$BUILD_DIR:/src" \
    -w /src \
    "$SDK_IMAGE" \
    sh -lc 'dotnet restore ./Jellyfin.Plugin.CinematicUI.csproj && dotnet build ./Jellyfin.Plugin.CinematicUI.csproj -c Release --no-restore'

DLL_PATH="$BUILD_DIR/bin/Release/net10.0/$PLUGIN_DLL"
[[ -s "$DLL_PATH" ]] || die "Build completed without producing $PLUGIN_DLL"

say "Backing up any existing installation"
mkdir -p "$PLUGIN_ROOT"
if [[ -d "$PLUGIN_DIR" ]]; then
    mv "$PLUGIN_DIR" "$BACKUP_DIR"
    printf 'Backup: %s\n' "$BACKUP_DIR"
fi

say "Installing plugin into Jellyfin persistent config"
mkdir -p "$PLUGIN_DIR"
install -m 0644 "$DLL_PATH" "$PLUGIN_DIR/$PLUGIN_DLL"
install -m 0644 "$BUILD_DIR/meta.json" "$PLUGIN_DIR/meta.json"
printf '%s\n' '0.1.5.0' > "$PLUGIN_DIR/installed-version.txt"
chmod 0644 "$PLUGIN_DIR/installed-version.txt"

# Create a reusable manual-install ZIP when the host has zip or python3.
ARTIFACT_DIR="$SCRIPT_DIR/artifacts"
mkdir -p "$ARTIFACT_DIR"
DIST_DIR="$BUILD_DIR/dist"
mkdir -p "$DIST_DIR"
cp "$DLL_PATH" "$BUILD_DIR/meta.json" "$DIST_DIR/"
ZIP_PATH="$ARTIFACT_DIR/CinematicUI-v0.1.5-jf12.1.zip"
rm -f "$ZIP_PATH"
if command -v zip >/dev/null 2>&1; then
    (cd "$DIST_DIR" && zip -q -r "$ZIP_PATH" .)
elif command -v python3 >/dev/null 2>&1; then
    python3 - "$DIST_DIR" "$ZIP_PATH" <<'PY'
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in sorted(os.listdir(src)):
        z.write(os.path.join(src, name), arcname=name)
PY
fi

# Generate a repository-ready Jellyfin manifest after the reusable ZIP exists.
# The URL defaults to the intended GitHub release location and can be overridden:
#   CINEMATIC_RELEASE_URL=https://example.invalid/CinematicUI-v0.1.5-jf12.1.zip sudo -E bash ./install-truenas.sh
MANIFEST_PATH="$ARTIFACT_DIR/manifest.json"
if [[ -f "$ZIP_PATH" ]]; then
    RELEASE_URL="${CINEMATIC_RELEASE_URL:-https://github.com/guardipee14/Jellyfin.CinematicUI/releases/download/v0.1.5/CinematicUI-v0.1.5-jf12.1.zip}"
    if command -v md5sum >/dev/null 2>&1; then
        ZIP_MD5="$(md5sum "$ZIP_PATH" | awk '{print $1}')"
    elif command -v python3 >/dev/null 2>&1; then
        ZIP_MD5="$(python3 - "$ZIP_PATH" <<'PYMD5'
import hashlib, sys
h = hashlib.md5()
with open(sys.argv[1], 'rb') as f:
    for chunk in iter(lambda: f.read(1024 * 1024), b''):
        h.update(chunk)
print(h.hexdigest())
PYMD5
)"
    else
        ZIP_MD5=""
    fi

    if [[ -n "$ZIP_MD5" ]]; then
        cat > "$MANIFEST_PATH" <<JSON
[
  {
    "guid": "e4c17f1b-c451-4a31-b98c-5d0ef44f9a21",
    "name": "Cinematic UI",
    "description": "A unified cinematic Jellyfin Web customization with a profile-forward login screen, Plex-inspired theme, navigation cleanup, and rotating library-driven home hero.",
    "overview": "Cinematic login and home experience for Jellyfin Web",
    "owner": "Donaven Guardipee",
    "category": "General",
    "versions": [
      {
        "version": "0.1.5.0",
        "changelog": "Clarifies library permissions versus cosmetic navigation hiding, adds generic optional navigation hiding, login header-branding control, hero title exclusions, played-title filtering, hero lifecycle polish, and GitHub repository-release automation.",
        "targetAbi": "12.1.0.0",
        "sourceUrl": "$RELEASE_URL",
        "checksum": "$ZIP_MD5",
        "timestamp": "2026-10-02T19:45:00Z"
      }
    ]
  }
]
JSON
    fi
fi

say "Installation files are in place"
printf 'Plugin directory: %s\n' "$PLUGIN_DIR"
if [[ -f "$ZIP_PATH" ]]; then
    printf 'Reusable plugin ZIP: %s\n' "$ZIP_PATH"
fi
if [[ -f "$MANIFEST_PATH" ]]; then
    printf 'Repository manifest: %s\n' "$MANIFEST_PATH"
fi
printf '\nRestart Jellyfin from the TrueNAS Apps UI, then open Dashboard -> Plugins -> Cinematic UI.\n'
printf 'After restart, sign out and hard-refresh the browser (Ctrl+Shift+R) to test the login screen.\n'
