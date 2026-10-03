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

Follow [PUBLISH-GITHUB.md](PUBLISH-GITHUB.md). For the next release, update the project/metadata versions to a new four-part value such as `0.1.12.0`, update the changelog, timestamp, and displayed settings version, land the source on main, wait for CI, then push the matching `v0.1.12` tag.

The release workflow restores/builds with warnings treated as errors, checks compiled assembly identity and exact embedded resources, validates metadata/tag/checksums, and runs tooling and real Jellyfin integration tests. After verification, it uses the built-in `GITHUB_TOKEN` with `contents: write` to stage and verify a draft release, publish its assets, check unauthenticated downloads, and advance the stable manifest. A final test installs from the public GitHub URL and upgrades an actual prior published ZIP when one exists.

Publication is serialized. The publisher waits for newly created drafts to appear in GitHub's authenticated release listing and refuses duplicate drafts, changed published versions, corrupted history, or concurrent external manifest changes. If the controller needs a fix, merge it on main and dispatch the release workflow from main with the existing tag. Tagged source is still built and tested separately. Never move release tags or replace published ZIPs.

## Validation and production scope

See [VALIDATION.md](VALIDATION.md) for run links and exact scope. CI runs disposable Jellyfin 12.1 containers to test catalog installation, manual migration, ABI filtering, the scheduled Update Plugins task, one active identity after restart, unchanged settings/XML, and intact UI injection after a cache-bypassing request. Candidate checks use a synthetic prior version; public release checks use actual prior published packages when available.

After the owner updated/restarted the TrueNAS app, read-only checks confirmed Jellyfin `12.1.0.0` and Cinematic UI `0.1.6.0` loaded and active, the expected GUID, automatic updates enabled, the catalog repository enabled, the settings file present, and one intact UI injection. At that inspection, the plugin folder was `/config/plugins/Cinematic UI_0.1.6.0`. Its container is `ix-jellyfin-jellyfin-1`, with persistent `/config` at `/mnt/New NAS/Apps/jellyfin`.

The agent did not modify production repositories, files, configuration, or container lifecycle. The owner performed the production update/restart. Subsequent browser checks verified the rendered login and hero, More Info navigation, and return to one Home hero. The v0.1.6 production resources match the recovered baseline; no byte-for-byte comparison of pre/post production settings or production playback test is claimed.

Existing UI reliability/accessibility is complete in published v0.1.7. The immutable source tag is `325a1ca333fac68a6021c04ed2138bc1c2477d80`. It fixes lost indicator focus, current-title semantics, explicit rotation pause/resume and reduced-motion behavior, the rapid-navigation artwork race, modern React header settings, and small-screen login scrolling. All 18 desktop/phone browser checks and 24 tooling tests passed, followed by clean public installation and the actual published v0.1.6-to-v0.1.7 update with settings/XML preserved. Production was last confirmed on v0.1.6; the agent did not deploy v0.1.7 there. [VALIDATION.md](VALIDATION.md) records checksums and run links.

The owner then supplied Plex and Jellyfin screenshots and prioritized the library appearance. Published v0.1.8 has source tag `3c2e3c5a1c1369f7cc0aaa6785f53a73947b1ca7`. It adds a 260px desktop sidebar using existing profile-visible destinations, 166px spaced posters, transparent left-aligned captions, a current-library heading and search pill, and quieter native controls/badges. Filter/sort, grid/list view, details, and playback stay native. `EnableLibraryLayout` defaults to true for legacy XML and is exposed under Appearance; disabling it or the global theme restores the original shell. Small screens retain native navigation. The shell requires the observed Jellyfin 12.1 React header/spacer structure, excludes TV layout, and cleans up on leaving library pages. All 32 desktop/phone browser checks, 24 tooling tests, the clean build/contracts, and real Jellyfin checks passed. The actual published v0.1.7-to-v0.1.8 update through the public catalog preserved settings/XML and one active identity. All four public ZIPs and unchanged historical entries were independently verified. Production library DOM inspection was read-only; the agent did not install or restart production for this layout. See [VALIDATION.md](VALIDATION.md).

The owner next requested a Plex-inspired video player. Published v0.1.9 has immutable source tag `d7bac76bcfc052d356953afd4e1fcd3f801925de`. It uses the existing native video controls with a slim timeline, footer title, centered transport on wide screens, and wrapped controls on narrower screens. Modern React header text is projected into the footer without moving or rebinding native controls. `EnablePlayerLayout` defaults on for legacy XML and is exposed under Appearance; TV and unrecognized structures retain native layout. The global theme respects Jellyfin's transparent playback background even when this layout option is off. All 48 browser checks, 24 tooling tests, warning-free build/contracts, and real Jellyfin checks passed. Clean public installation and the actual published v0.1.8-to-v0.1.9 Update Plugins path preserved settings/XML and one active identity. All five public ZIPs and immutable prior entries were independently verified. See [VALIDATION.md](VALIDATION.md) for evidence and [ROADMAP.md](ROADMAP.md) for milestone order.

During the player milestone, the owner's plugin dashboard reported v0.1.8 Active. Live player DOM inspection resumed an existing episode; playback was stopped by returning to its details page, and zero playing video elements were subsequently confirmed. No production configuration, plugin installation, files, or server lifecycle were changed. Real play/pause/seeking and desktop fullscreen were tested with a tiny synthetic WebM in isolated browser fixtures; menus use fixture handlers. Actual PiP, streaming audio/subtitle selection, physical-device, and complete production playback validation are not claimed.

After these visual milestones, profile and library-selection reliability remains next. [ROADMAP.md](ROADMAP.md) records account switching/pending requests, configured library-name mismatches, view-enumeration failures, played/keyword exclusions, and repeat history across users. Define fallback behavior before changing it. Browser regression fixtures use the real plugin assets with synthetic media and do not require production credentials.

## Published v0.1.10 player colors and title details

The owner next prioritized remaining blue player accents and cleaner title/details pages using Plex screenshots. Published v0.1.10 has immutable source tag `2a53f92589edfc2813fe56de677e8b36cb213be8`. It fixes native slider thumb/bar and React palette colors, including custom configured accents and the global-theme opt-out, and the previously collapsed volume slider. It adds smaller posters, clear Play labels, subdued metadata/backdrop, full-width content sections, shared library navigation, and a responsive season episode grid with two-line long-title captions. `EnableDetailsLayout` defaults true for legacy XML and appears under Appearance. Native nodes/handlers, metadata, and lazy artwork remain in place; TV, unknown details, and unknown episode rows fall back.

All 66 browser checks, 24 tooling tests, the zero-warning build, compiled contracts, and real Jellyfin checks passed CI. The public release run passed clean catalog installation and the actual published v0.1.9-to-v0.1.10 update with settings/XML preserved and one active identity. All six public ZIPs and immutable historical entries verified independently. The manifest commit is `142af8b2dd8c4162877680a59f1d2fcf74a1b987`; v0.1.10's MD5 is `fb09c1a29ff51009272f75384cbac33a`.

Read-only production series/season DOM inspection informed selectors and returned to the original series page. The dashboard confirmed v0.1.9 Active. No media was started and no production configuration, installation, or lifecycle was changed during this milestone. The owner can run Update Plugins, restart through TrueNAS Apps, and hard-refresh to activate v0.1.10. See [VALIDATION.md](VALIDATION.md). Profile/library-selection reliability follows this user-prioritized visual milestone.

## TrueNAS fallback constraints

- Build with the official .NET 10 SDK Docker image; do not install development packages in the TrueNAS base OS.
- Do not replace the app container or alter TrueNAS application ownership/lifecycle.
- The manual helper gives only its newly installed payload to the app's existing UID/GID and archives old copies outside plugin discovery.
- Configuration is retained on installation, removal, and rollback.
- Restart through the TrueNAS Apps UI.

See [INSTALL-TRUENAS.md](INSTALL-TRUENAS.md) for the manual fallback and rollback. Keep credentials out of source, workflow files, and release assets.

## Published v0.1.11 profiles and selection reliability

Completed October 3, 2026. Immutable source tag `467c02da8b4e35c25afe94c9c00eebf0341a9cbc` implements compact native profile/account-menu styling, request/artwork cancellation across account/token/server/page changes, account/server-scoped repeat history and Play intent, and origin-bound credential selection. Explicit library names never fall back to unrelated libraries: no matches or failed enumeration keeps native Home, and blank selection uses permitted movie/TV views. Played/keyword filters apply across every query attempt. One attempt per Home/account context prevents observer retry storms. The new profile Appearance option defaults on for legacy XML and retains native controls.

All 88 browser and 24 tooling checks, build/contracts and real Jellyfin integration passed CI. Public clean install and the actual v0.1.10-to-v0.1.11 normal update passed with settings/XML preserved. All seven public ZIPs and immutable history were independently verified. Catalog commit `7739b9b3009a850ad4aff51dd2eb23b2fbd792f7`; ZIP MD5 `39ed3fdfefbc44712ddbf9d023d326d8`. The owner reported v0.1.10 installed and looking good; the agent did not deploy v0.1.11 to production.

The owner also requested a separate trusted-device PIN/passkey plugin. Its independent candidate lives at `C:\Dev\Jellyfin.LoginAccess` and in the private `guardipee14/Jellyfin.LoginAccess` repository. Do not mix authentication into Cinematic UI. Passkeys and public remote access require the owner's future HTTPS hostname; no domain or DuckDNS name has been chosen. The owner is considering a central authenticated dashboard with per-user services. No dashboard project, public DNS, router rules, or production authentication changes have been made. See the login repository's handoff for current validation and remaining work.
