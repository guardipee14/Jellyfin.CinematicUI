# Jellyfin repository publication

Cinematic UI uses a release-hosted Jellyfin repository manifest.

After the GitHub repository exists at:

`https://github.com/guardipee14/Jellyfin.CinematicUI`

pushing a version tag such as `v0.1.5` runs `.github/workflows/release.yml`. The workflow builds the plugin, creates the binary ZIP, calculates Jellyfin's MD5 checksum, creates `manifest.json`, and attaches both files to the GitHub Release.

Add this URL to Jellyfin under **Dashboard → Plugins → Repositories**:

`https://github.com/guardipee14/Jellyfin.CinematicUI/releases/latest/download/manifest.json`

The plugin GUID stays constant across manual and repository installs, so Jellyfin can associate the installed plugin with the repository once the manifest is reachable.
