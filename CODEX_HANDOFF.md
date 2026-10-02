# Codex Handoff — Jellyfin.CinematicUI

## Goal

Turn `guardipee14/Jellyfin.CinematicUI` into a proper Jellyfin third-party plugin repository so Jellyfin can:

1. discover Cinematic UI from a repository manifest hosted on GitHub,
2. install the plugin through Dashboard -> Plugins -> Catalog,
3. see future versions when we publish a new release/tag,
4. use Jellyfin's built-in **Update Plugins** scheduled task to pull newer compatible versions,
5. preserve plugin configuration across updates,
6. continue supporting manual TrueNAS installation as a fallback.

Official Jellyfin documentation confirms that third-party repositories are manifest URLs whose versions point to binary plugin packages, and Jellyfin includes an **Update Plugins** scheduled task.

## Current deployed state

- TrueNAS SCALE / Docker Jellyfin container: `ix-jellyfin-jellyfin-1`
- Jellyfin server line: 12.1
- Runtime target: .NET 10
- Plugin name: `Cinematic UI`
- Plugin GUID: `e4c17f1b-c451-4a31-b98c-5d0ef44f9a21`
- Current working version deployed on the server: **0.1.5.0**
- Jellyfin log has confirmed:
  - `Loaded assembly Jellyfin.Plugin.CinematicUI, Version=0.1.5.0`
  - `Loaded plugin: Cinematic UI 0.1.5.0`
- The plugin is currently installed under Jellyfin's persistent config at:
  - host: `/mnt/New NAS/Apps/jellyfin/plugins/Cinematic UI`
  - container: `/config/plugins/Cinematic UI`

The working v0.1.5 was originally built with the TrueNAS installer and is already functioning in Jellyfin Web.

## Current UI behavior that must not regress

### Login
- profile-forward “Who’s watching?” layout
- custom server title
- circular profile cards
- animated splash/poster wall
- configurable blur/darkness/motion
- optional hiding of Jellyfin header branding

### Home
- rotating library-driven hero
- hero restricted to configured libraries, default:
  - Anime
  - Movies
  - TV Shows
- transparent Jellyfin Logo artwork when available
- fallback to text title
- backdrop/Thumb/Primary artwork fallbacks
- Play and More Info buttons
- carousel dots
- Previous/Next controls
- pause on hover
- cross-fade transitions
- repeat avoidance
- title keyword exclusions
- optional exclude-played behavior
- Other Videos is excluded from the hero when it is not in HeroLibraryNames

### Theme
- Plex-inspired dark theme with gold accent
- card hover/focus treatment
- progress bars and indicators
- dialogs / inputs / detail page styling
- hides duplicate My Media row when enabled
- optionally hides Other Videos Home rows
- cosmetic navigation hiding is separate from Jellyfin user library permissions

## IMPORTANT: GitHub repository is only partially populated

The GitHub repository has been created and many project files have been committed, but the previous interactive transfer was interrupted.

Do **not** assume current GitHub HEAD is buildable until you inspect it.

At minimum, verify whether these embedded assets are present and complete:

- `Web/cinematic.css`
- `Web/client.js`

The current root listing did not show a `Web` directory after the interruption, even though the working TrueNAS v0.1.5 bundle embeds those resources.

Also validate:

- `Configuration/configPage.html`
- `Configuration/PluginConfiguration.cs`
- `EmbeddedAssets.cs`
- `IndexInjectionMiddleware.cs`
- `Plugin.cs`
- `ServiceRegistrator.cs`
- `Jellyfin.Plugin.CinematicUI.csproj`
- `meta.json`
- `install-truenas.sh`
- `uninstall-truenas.sh`
- `.github/workflows/release.yml`
- repository manifest generation

Treat the deployed TrueNAS v0.1.5 behavior as the functional baseline.

## Repository/update architecture to implement

Preferred architecture:

1. Source lives on `main`.
2. A version/tag release such as `v0.1.6` triggers GitHub Actions.
3. The workflow:
   - restores packages,
   - builds Release for `net10.0`,
   - packages only runtime plugin files into a ZIP,
   - calculates the checksum expected by Jellyfin,
   - creates or updates a repository `manifest.json`,
   - publishes the plugin ZIP and manifest in a way Jellyfin can fetch reliably.
4. Jellyfin repository URL should be stable.
5. Version history in the manifest should be handled correctly. Do not accidentally publish only the newest version if Jellyfin expects prior compatible versions to remain represented.
6. Package GUID must remain constant.
7. `targetAbi` must stay compatible with the target Jellyfin server line.
8. Plugin settings/config must survive upgrades.
9. Release packages should not contain source-only/build artifacts.

## Repository URL

Target GitHub repository:

`https://github.com/guardipee14/Jellyfin.CinematicUI`

A candidate repository URL previously discussed was:

`https://github.com/guardipee14/Jellyfin.CinematicUI/releases/latest/download/manifest.json`

Before finalizing that design, verify it against current Jellyfin repository behavior and consider whether a raw file on a stable branch (for example a dedicated manifest branch or `main/repository/manifest.json`) is more robust for maintaining version history.

## Desired user workflow

### First-time install

User should only need to:

1. Dashboard -> Plugins -> Manage Repositories
2. add the Cinematic UI repository URL
3. open Catalog
4. choose Cinematic UI
5. install
6. restart Jellyfin if required

No TrueNAS shell work should be required for normal users.

### Future updates

For each new release:

1. update plugin version and changelog,
2. push code,
3. tag/release,
4. GitHub Actions builds and publishes package + manifest,
5. Jellyfin detects the newer compatible version through its repository,
6. Jellyfin's normal plugin update mechanism / scheduled **Update Plugins** task installs the update,
7. restart only when Jellyfin requires it for plugin activation.

Do not build a custom self-updater into the plugin unless Jellyfin's standard plugin mechanism is insufficient.

## Validation requirements

Before publishing a version:

- `dotnet restore` succeeds
- `dotnet build -c Release` succeeds with 0 errors
- plugin ZIP contains the correct DLL and metadata only
- manifest JSON validates
- checksum exactly matches the released ZIP
- source URL is downloadable without authentication
- version is higher than the installed version
- GUID matches `e4c17f1b-c451-4a31-b98c-5d0ef44f9a21`
- target ABI is correct for Jellyfin 12.1
- clean Jellyfin test can discover the plugin from the repository
- existing manual install can transition to repository-managed updates without creating a duplicate plugin
- configuration survives upgrade
- UI injection continues to work after hard refresh
- login and hero do not regress

## TrueNAS deployment constraints

- Do not install development packages into the TrueNAS base OS.
- Existing manual installer uses the official Microsoft .NET 10 SDK Docker image for isolated builds.
- Do not change TrueNAS app ownership or lifecycle by manually replacing the application container.
- Restart Jellyfin through TrueNAS Apps UI for final validation.
- Existing Jellyfin persistent plugin path is under the /config mount.

## Security / robustness

- Do not inject secrets into the repository or workflow.
- GitHub Actions should use the built-in `GITHUB_TOKEN` with the minimum release permissions needed.
- Fail open in the web injection middleware so a UI injection problem does not prevent Jellyfin Web from loading.
- Keep asset/config values HTML/JS-safe.
- Avoid dependence on brittle Jellyfin DOM selectors where possible; use resilient selectors/observers.
- Keep an uninstall/rollback path.

## Suggested first Codex tasks

1. Inspect the entire repository and identify missing/incomplete files from the interrupted transfer.
2. Restore a complete buildable v0.1.5 baseline.
3. Build it in CI.
4. Fix/finish the GitHub Actions release workflow.
5. Design a stable Jellyfin repository manifest strategy with version history.
6. Publish the first repository-managed release.
7. Verify the manifest and release asset URLs.
8. Provide the exact repository URL to add in Jellyfin.
9. Document how to release v0.1.6 and later with one tag/push workflow.
10. Do not add new UI features until the repository/install/update pipeline is proven end to end.
