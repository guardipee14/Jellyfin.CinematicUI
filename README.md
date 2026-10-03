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

The missing v0.1.5 Web resources were restored from the original working installer archive. v0.1.5/v0.1.6 preserve that baseline. v0.1.7 adds keyboard-safe hero indicators, explicit Pause/Resume rotation, reduced-motion defaults, stable artwork during rapid title changes, scrollable profile choices, and support for Jellyfin 12.1's React header in existing branding/navigation settings. See [RECOVERY.md](RECOVERY.md) for provenance and [ROADMAP.md](ROADMAP.md) for milestone order.

v0.1.8 brings the library closer to the owner's Plex reference: a desktop sidebar from Jellyfin's existing navigation, a library heading/search pill, 166px posters with more space, transparent left-aligned captions, and subdued toolbar/count badges. Native filter/sort, grid/list view, detail navigation, and playback remain in Jellyfin. Small screens keep native navigation; **Use Plex-style library layout** under Appearance restores the original library layout when disabled. This shell targets the observed Jellyfin 12.1 React structure and leaves other page structures intact.

v0.1.9 adds a Plex-style video player: a thin timeline above compact bottom controls, a footer title, centered transport controls on wide screens, and wrapped controls on smaller screens. **Use Plex-style video player layout** under Appearance switches this off. Native playback, seeking, volume, audio/subtitle/settings menus, fullscreen, episode navigation, and auto-hide remain Jellyfin behavior; the plugin does not replace the video element or playback engine. TV layout and unrecognized player structures retain the original layout. The global theme now respects Jellyfin's transparent playback background, including when the player layout option is off.

v0.1.10 completes the player accent treatment: native seek/volume/settings slider thumbs and bars, React accents, and focus states follow the configured color (gold by default). It also fixes the collapsed volume slider. The new title/details layout uses smaller posters, a clear Play button, quieter metadata over a dimmed backdrop, full-width sections below the poster, and a responsive season episode grid. Native actions, metadata, lazy artwork, and playback remain intact. **Use Plex-style title details** under Appearance offers an opt-out; the desktop sidebar follows the existing library-layout setting. TV, unsupported detail structures, and unknown episode rows retain native layouts. The global-theme opt-out restores Jellyfin's native accent colors.

v0.1.11 adds a compact profile and account menu while retaining native password, image, navigation, and sign-out controls. **Use clean profile and user menu** under Appearance offers an opt-out. Hero requests and artwork are cancelled when the account, server, or Home page changes. History and Play intent are scoped to the current account/server; credentials from another origin are never used.

Hero library names are explicit: partial matches use only matching available libraries, and no matches retain native Home. Leave the field blank to use all available movie/TV libraries. Failed view enumeration, empty selections, and all played/keyword-excluded items also retain native Home without repeated requests on every DOM change. Jellyfin library permissions continue to control access.

## Manual TrueNAS fallback and rollback

The normal catalog install requires no shell work. If needed, build from a complete source checkout using:

```bash
sudo bash ./install-truenas.sh
```

The helper builds in the official .NET 10 SDK Docker image, keeps backups outside plugin discovery, and creates a runtime ZIP under `artifacts/`. It does not install SDK packages into the TrueNAS base OS or replace the app container.

Removal and rollback instructions are in [INSTALL-TRUENAS.md](INSTALL-TRUENAS.md). Plugin configuration is retained on removal.

## Development and releases

Requires .NET 10 and Python 3.12+ for release tooling. CI also uses Node for JavaScript syntax validation and Docker for a disposable Jellyfin 12.1 integration test.

Browser regression checks use Node and the locked Playwright dependency: `npm ci`, `npx playwright install chromium`, then `npm run test:browser`. The fixture serves real plugin assets with synthetic media on localhost; `npm run preview:browser` serves it for a manual walkthrough. It does not connect to production or package test dependencies in the runtime ZIP.

```bash
bash build.sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/integration.py
```

On Windows: `./build.ps1 -Python python`.

Update the version/changelog, push the code, and push a matching new tag such as `v0.1.11`. The workflow validates the candidate, publishes an immutable GitHub release ZIP and manifest snapshot, then updates the cumulative `repository` branch only after checking public downloads. See [PUBLISH-GITHUB.md](PUBLISH-GITHUB.md) for release and retry details, and [VALIDATION.md](VALIDATION.md) for the completed milestone's evidence.

Compatibility: Jellyfin Server 12.1, target ABI `12.1.0.0`, .NET 10. Developer: Donaven Guardipee ([guardipee14](https://github.com/guardipee14)).
