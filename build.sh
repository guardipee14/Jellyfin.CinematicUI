#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
dotnet restore
dotnet build -c Release --no-restore
rm -rf dist
mkdir -p dist
cp bin/Release/net10.0/Jellyfin.Plugin.CinematicUI.dll dist/
cp meta.json dist/
zip -j -r CinematicUI-v0.1.5.zip dist/*
echo "Built ./CinematicUI-v0.1.5.zip"
