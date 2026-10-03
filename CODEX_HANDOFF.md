# Codex Handoff — Jellyfin.CinematicUI

## Repository-management milestone

Completed October 2, 2026. The interrupted source transfer is repaired, v0.1.5 builds cleanly in CI, and both v0.1.5 and the maintenance v0.1.6 release are published. Clean installation from the public GitHub catalog and the actual published v0.1.5-to-v0.1.6 upgrade through Jellyfin's normal Update Plugins task both passed. [VALIDATION.md](VALIDATION.md) records the evidence and production scope.

The missing `Web/cinematic.css` and `Web/client.js` were recovered exactly from the owner's working v0.1.5 TrueNAS installer archive. Every other original archive file matched the transferred source after normalizing line endings. Both recovered asset hashes match the resources served by the production v0.1.6 plugin. No new UI features were added during the repository-management milestone. [RECOVERY.md](RECOVERY.md) records provenance; [README.md](README.md) describes login, hero, theme, and navigation behavior.

## Stable catalog and identity

Add this third-party repository in **Jellyfin Dashboard → Plugins → Repositories**:

```text
https://raw.githubusercontent.com/guardipee14/Jellyfin.CinematicUI/repository/manifest.json
```

- Repository: `guardipee14/Jellyfin.CinematicUI`
- Plugin: `Cinematic UI`
- GUID: `e4c17f1b-c451-4a31-b98c-5d0ef44f9a21`
- Assembly: `Jellyfin.Plugin.CinematicUI.dll`
- Runtime: .NET 10 (`net10.0`)
- Jellyfin package references: `12.1.0`
- Target ABI: `12.1.0.0`
- Settings: `/config/plugins/configurations/Jellyfin.Plugin.CinematicUI.xml`

Source lives on `main`; the generated `repository` branch contains the cumulative manifest. GitHub releases host the runtime ZIPs. Each ZIP contains only the plugin DLL and `meta.json`; its exact bytes determine Jellyfin's MD5 checksum. Prior compatible version entries are retained and sorted numerically. Published entries and checksums are immutable.

## Installation and normal updates

For a clean installation, add the repository, choose Cinematic UI in **Catalog**, install, and restart when requested. The release package targets Jellyfin 12.1 and automatic updates remain enabled.

Existing manual v0.1.5 installations share the GUID and configuration filename. Add the same repository and run the normal **Update Plugins** scheduled task. A strictly newer catalog version is required: v0.1.6 is the maintenance release that enables this transition. After restart, Jellyfin activates one current plugin identity and supersedes the older unversioned folder. Settings remain intact. Keep rollback copies outside `/config/plugins`.

Hard-refresh Jellyfin Web after activation. On TrueNAS, use **Apps → Jellyfin → Restart**. No custom updater or shell installation is required for catalog users.

## Release procedure and recovery

Follow [PUBLISH-GITHUB.md](PUBLISH-GITHUB.md). For the next release, update the project/metadata versions to a new four-part value such as `0.1.9.0`, update the changelog, timestamp, and displayed settings version, land the source on main, wait for CI, then push the matching `v0.1.9` tag.

The release workflow restores/builds with warnings treated as errors, checks compiled assembly identity and exact embedded resources, validates metadata/tag/checksums, and runs tooling and real Jellyfin integration tests. After verification, it uses the built-in `GITHUB_TOKEN` with `contents: write` to stage and verify a draft release, publish its assets, check unauthenticated downloads, and advance the stable manifest. A final test installs from the public GitHub URL and upgrades an actual prior published ZIP when one exists.

Publication is serialized. The publisher waits for newly created drafts to appear in GitHub's authenticated release listing and refuses duplicate drafts, changed published versions, corrupted history, or concurrent external manifest changes. If the controller needs a fix, merge it on main and dispatch the release workflow from main with the existing tag. Tagged source is still built and tested separately. Never move release tags or replace published ZIPs.

## Validation and production scope

See [VALIDATION.md](VALIDATION.md) for run links and exact scope. CI runs disposable Jellyfin 12.1 containers to test catalog installation, manual migration, ABI filtering, the scheduled Update Plugins task, one active identity after restart, unchanged settings/XML, and intact UI injection after a cache-bypassing request. Candidate checks use a synthetic prior version; public release checks use actual prior published packages when available.

After the owner updated/restarted the TrueNAS app, read-only checks confirmed Jellyfin `12.1.0.0` and Cinematic UI `0.1.6.0` loaded and active, the expected GUID, automatic updates enabled, the catalog repository enabled, the settings file present, and one intact UI injection. The current plugin folder is `/config/plugins/Cinematic UI_0.1.6.0`. Its container is `ix-jellyfin-jellyfin-1`, with persistent `/config` at `/mnt/New NAS/Apps/jellyfin`.

The agent did not modify production repositories, files, configuration, or container lifecycle. The owner performed the production update/restart. Subsequent browser checks verified the rendered login and hero, More Info navigation, and return to one Home hero. The v0.1.6 production resources match the recovered baseline; no byte-for-byte comparison of pre/post production settings or production playback test is claimed.

Existing UI reliability/accessibility is complete in published v0.1.7. The immutable source tag is `325a1ca333fac68a6021c04ed2138bc1c2477d80`. It fixes lost indicator focus, current-title semantics, explicit rotation pause/resume and reduced-motion behavior, the rapid-navigation artwork race, modern React header settings, and small-screen login scrolling. All 18 desktop/phone browser checks and 24 tooling tests passed, followed by clean public installation and the actual published v0.1.6-to-v0.1.7 update with settings/XML preserved. Production was last confirmed on v0.1.6; the agent did not deploy v0.1.7 there. [VALIDATION.md](VALIDATION.md) records checksums and run links.

The owner then supplied Plex and Jellyfin screenshots and prioritized the library appearance. Published v0.1.8 has source tag `3c2e3c5a1c1369f7cc0aaa6785f53a73947b1ca7`. It adds a 260px desktop sidebar using existing profile-visible destinations, 166px spaced posters, transparent left-aligned captions, a current-library heading and search pill, and quieter native controls/badges. Filter/sort, grid/list view, details, and playback stay native. `EnableLibraryLayout` defaults to true for legacy XML and is exposed under Appearance; disabling it or the global theme restores the original shell. Small screens retain native navigation. The shell requires the observed Jellyfin 12.1 React header/spacer structure, excludes TV layout, and cleans up on leaving library pages. All 32 desktop/phone browser checks, 24 tooling tests, the clean build/contracts, and real Jellyfin checks passed. The actual published v0.1.7-to-v0.1.8 update through the public catalog preserved settings/XML and one active identity. All four public ZIPs and unchanged historical entries were independently verified. Production library DOM inspection was read-only; the agent did not install or restart production for this layout. See [VALIDATION.md](VALIDATION.md).

After the library milestone, profile and library-selection reliability remains next. [ROADMAP.md](ROADMAP.md) records account switching/pending requests, configured library-name mismatches, view-enumeration failures, played/keyword exclusions, and repeat history across users. Define fallback behavior before changing it. Browser regression fixtures use the real plugin assets with synthetic media and do not require production credentials.

## TrueNAS fallback constraints

- Build with the official .NET 10 SDK Docker image; do not install development packages in the TrueNAS base OS.
- Do not replace the app container or alter TrueNAS application ownership/lifecycle.
- The manual helper gives only its newly installed payload to the app's existing UID/GID and archives old copies outside plugin discovery.
- Configuration is retained on installation, removal, and rollback.
- Restart through the TrueNAS Apps UI.

See [INSTALL-TRUENAS.md](INSTALL-TRUENAS.md) for the manual fallback and rollback. Keep credentials out of source, workflow files, and release assets.
