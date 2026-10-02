# TrueNAS SCALE installation and rollback

Prefer the catalog install in the main README. This helper remains a manual fallback:

```bash
sudo bash ./install-truenas.sh
```

It reads the version from source metadata, verifies the running Jellyfin 12.1 ABI, builds in the official .NET 10 SDK container, validates the compiled resources, and creates the same runtime ZIP format as CI. It does not install development packages into the TrueNAS base OS or replace the app container.

The installer detects the dataset mounted at `/config`, archives all existing Cinematic UI copies outside the scanned plugin directory, and installs into `plugins/Cinematic UI_<version>`. Configuration remains at `plugins/configurations/Jellyfin.Plugin.CinematicUI.xml`.

Restart using **TrueNAS → Apps → Jellyfin → Restart**, then hard-refresh Jellyfin Web. `JELLYFIN_CONTAINER` can select a non-default container name.

Backups are stored under `/config/cinematic-ui-backups/<timestamp>/`. An optional copy of the settings XML is included for rollback. Backups must remain outside `/config/plugins`; Jellyfin scans subdirectories there and may load or delete rollback copies.

To remove the plugin while retaining its settings and a recoverable copy:

```bash
sudo bash ./uninstall-truenas.sh
```

To roll back, stop Jellyfin through TrueNAS Apps, move the current Cinematic UI directory outside `plugins`, restore one archived plugin directory into `plugins`, and start Jellyfin through Apps. Keep the configuration XML unless deliberately restoring an older settings backup. Disable Cinematic UI auto-update in Jellyfin before rollback if you need to remain on the older version; otherwise the next Update Plugins run will offer the compatible newer release again.
