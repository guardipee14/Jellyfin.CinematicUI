#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
VERSION="$(python3 scripts/release.py check-source)"
dotnet restore Jellyfin.Plugin.CinematicUI.csproj
dotnet build Jellyfin.Plugin.CinematicUI.csproj -c Release --no-restore -warnaserror
dotnet run --project tests/Contracts/Contracts.csproj -c Release -- .
python3 scripts/release.py package --tag "v${VERSION%.0}"
