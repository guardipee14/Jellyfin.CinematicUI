# Stable Jellyfin repository manifest

Add this URL in Dashboard → Plugins → Repositories:

`https://raw.githubusercontent.com/guardipee14/Jellyfin.CinematicUI/repository/manifest.json`

The `repository` branch contains the live cumulative manifest. Source stays on `main`. Each immutable version points to its own public GitHub release ZIP, with the MD5 checksum Jellyfin expects. New versions are sorted numerically, newest first; older compatible releases remain available when later releases require a newer server ABI.

A manifest attached to a GitHub release is a publication-time snapshot. The stable branch URL is the catalog URL; `releases/latest/download/manifest.json` is not used for update discovery.

See [PUBLISH-GITHUB.md](../PUBLISH-GITHUB.md) for the release procedure and recovery from failed publication.
