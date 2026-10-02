# Cinematic UI

Cinematic UI is a Jellyfin 12.1 plugin providing a profile-forward login, Plex-inspired theme, and rotating library-driven home hero. Its Web assets are embedded in the plugin DLL.

## Install from Jellyfin's catalog

1. Open **Dashboard → Plugins → Repositories** (or **Manage Repositories**).
2. Add a repository named **Cinematic UI** with this URL:

```text
https://raw.githubusercontent.com/guardipee14/Jellyfin.CinematicUI/repository/manifest.json
```

3. Open **Catalog**, select **Cinematic UI**, and install the latest compatible version.
4. Restart Jellyfin when requested. On TrueNAS, use **Apps → Jellyfin → Restart**.
5. Hard-refresh Jellyfin Web with `Ctrl+Shift+R`, then open **Dashboard → Plugins → Cinematic UI → Settings**.

The plugin is distributed through this third-party repository. Adding the URL makes it available in your server's catalog; it does not add it to Jellyfin's official repository.

## Updates and existing manual installations

Jellyfin's normal **Update Plugins** scheduled task discovers and installs newer compatible releases. A release with a higher `targetAbi` is filtered out on older servers, and prior compatible versions remain in the manifest. Activation may require a server restart.

Existing manual installations use the same GUID (`e4c17f1b-c451-4a31-b98c-5d0ef44f9a21`) and assembly name. Add the repository and leave automatic updates enabled. A catalog release must be strictly newer than the installed version to be picked up by the scheduled task. Adding a repository alone does not upgrade an equal version. The old unversioned manual folder is superseded by the managed version after restart; keep rollback copies outside `/config/plugins`.

Settings remain in `/config/plugins/configurations/Jellyfin.Plugin.CinematicUI.xml`. Neither release ZIPs nor the installer overwrite or delete this file.

## Existing UI behavior

- Login: custom server title, circular profile cards, animated poster wall, configurable blur/darkness/motion, optional header-branding hiding.
- Home: library-driven hero (Anime, Movies, TV Shows by default), transparent Logo artwork with title fallback, Backdrop/Thumb/Primary fallbacks, Play/More Info, cross-fades, dots, arrows, pause on hover, repeat avoidance, title exclusions, optional played-title filtering.
- Theme: dark interface with gold accent, card hover/focus, progress indicators, dialogs, inputs, detail styling, optional My Media and Other Videos row hiding.
- Navigation hiding is cosmetic. Actual library permissions remain under **Dashboard → Users → Library Access**.

The missing v0.1.5 Web resources were restored from the original working installer archive. Repository-management work adds no new UI features. See [RECOVERY.md](RECOVERY.md) for provenance and validation scope.

## Manual TrueNAS fallback and rollback

The normal catalog install requires no shell work. If needed, build from a complete source checkout using:

```bash
sudo bash ./install-truenas.sh
```

The helper builds in the official .NET 10 SDK Docker image, keeps backups outside plugin discovery, and creates a runtime ZIP under `artifacts/`. It does not install SDK packages into the TrueNAS base OS or replace the app container.

Removal and rollback instructions are in [INSTALL-TRUENAS.md](INSTALL-TRUENAS.md). Plugin configuration is retained on removal.

## Development and releases

Requires .NET 10 and Python 3.12+ for release tooling. CI also uses Node for JavaScript syntax validation and Docker for a disposable Jellyfin 12.1 integration test.

```bash
bash build.sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/integration.py
```

On Windows: `./build.ps1 -Python python`.

Update the version/changelog, push the code, and push a matching tag such as `v0.1.6`. The workflow validates the candidate, publishes an immutable GitHub release ZIP and manifest snapshot, then updates the cumulative `repository` branch only after checking public downloads. See [PUBLISH-GITHUB.md](PUBLISH-GITHUB.md) for release and retry details.

Compatibility: Jellyfin Server 12.1, target ABI `12.1.0.0`, .NET 10. Developer: Donaven Guardipee ([guardipee14](https://github.com/guardipee14)).
