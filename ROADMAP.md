# Cinematic UI roadmap

The original handoff defined the repository-management milestone but no later feature schedule. After completing catalog installation and updates, the owner asked to continue with the next milestone. The sequence below makes that continuation explicit.

## 1. Catalog installation and updates — complete

v0.1.5 restored the interrupted source transfer. v0.1.6 enabled normal updates from the existing manual installation. GitHub releases, the cumulative manifest, runtime checksums, compatible version selection, and configuration preservation are validated in real Jellyfin 12.1 containers. The owner updated production to v0.1.6; subsequent read-only checks confirmed active plugin loading, the enabled catalog, automatic updates, retained settings file, and one intact UI injection. See [VALIDATION.md](VALIDATION.md).

## 2. Existing UI reliability and accessibility — complete in v0.1.7

Published October 2, 2026. All 18 desktop/phone browser checks and the existing build/package and real Jellyfin checks passed. The public release test upgraded the actual v0.1.6 package through Jellyfin's normal Update Plugins task with settings/XML preserved. See [VALIDATION.md](VALIDATION.md) for run links and scope.

The live browser walkthrough confirmed functioning hero artwork, rotation, More Info, and restoration of one hero on returning Home. It also reproduced lost focus after indicator selection, missing selected-state semantics, and the login branding toggle missing Jellyfin 12.1's React header.

Acceptance criteria:

- Indicator selection retains keyboard focus and exposes the current title.
- Keyboard focus pauses rotation until an explicit Resume action, independently of the hover setting.
- A visible Pause/Resume control supports pointer and keyboard input; reduced motion starts paused.
- Indicators have usable hit areas and remain reachable on narrow screens.
- Rapid title changes retain current artwork after earlier fade timers finish.
- Login branding and cosmetic navigation hiding support the observed React header while retaining legacy selectors.
- Login profile and recovery controls remain reachable when content exceeds the viewport.
- Desktop and phone browser regression tests pass, followed by the existing build/package and real Jellyfin install/update checks.

The browser fixtures use real plugin CSS/JavaScript with synthetic media and credentials. They do not claim a full screen-reader audit, physical-device testing, or production playback validation.

## 3. Plex-inspired library layout — complete in v0.1.8

The owner supplied Plex and Jellyfin library screenshots and asked to prioritize a similar library layout. This explicitly moves visual library work ahead of the previously planned selection-reliability milestone.

The layout uses existing profile-visible header links and icons in a desktop sidebar, a current-library heading, a search pill, smaller spaced posters, left-aligned transparent captions, and subdued toolbar/count badges. It retains native filter/sort, grid/list view, detail navigation, and playback controls. Small screens retain native navigation, and a new Appearance setting disables the library layout. Route cleanup restores the Home, login, and detail layouts. The shell requires the observed modern header/spacer structure and falls back to the original layout when that structure is absent.

Published October 2, 2026. Responsive geometry, active/keyboard library navigation, native controls and list view, configured navigation exclusions, appearance opt-out, legacy settings defaults, and route cleanup passed CI: all 32 browser checks, 24 tooling tests, compiled build/resource contracts, and real Jellyfin install/update checks. Clean public installation and the actual published v0.1.7-to-v0.1.8 update passed with settings/XML preserved. Preview media is synthetic; no production metadata or media files are copied into fixtures. See [VALIDATION.md](VALIDATION.md).

## 4. Plex-inspired video player — v0.1.9

The owner asked to continue the Plex-inspired appearance in the video player. The desktop layout uses a thin timeline, footer title, centered transport on wide screens, and compact playback options. Smaller screens wrap controls without changing their handlers. The appearance setting defaults on for legacy configurations and offers an opt-out. TV layout and unrecognized player structures fall back. Native playback visibility, menus, streams, subtitles, fullscreen, and episode navigation remain Jellyfin responsibilities. The global theme must preserve the native transparent playback background.

All 48 local desktop/phone browser checks and 24 tooling tests pass, along with the warning-free .NET build and compiled contracts. Eight new player cases cover geometry/transparency, real synthetic-video play/pause/seeking, native menu handlers, volume/mute, desktop fullscreen and title transitions, hidden controls, opt-out/fallback/legacy title, and route cleanup. CI and public publication validation are pending.

## 5. Profile and library-selection reliability — next

Check account switching and pending artwork requests, configured library-name mismatches, view-enumeration failures, played-title/keyword exclusions, and repeat history across users. Define the expected fallback behavior explicitly before changing it. Jellyfin user library permissions remain the source of access control; navigation hiding remains cosmetic.

## 6. Performance and further visual refinement — afterward

Measure observer activity, request volume, object-URL lifetime, and route cleanup. Use those findings to prioritize focused refinements to login and hero layouts. Preserve the working catalog update path and settings compatibility for every release.
