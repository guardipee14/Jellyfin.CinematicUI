# Cinematic UI v0.1.5

Cinematic UI is a Jellyfin 12.1 plugin that owns the customized Jellyfin Web experience instead of relying on Dashboard → Branding → Custom CSS.

## What changed in v0.1.5

- Clarifies the difference between **Jellyfin library permissions** and cosmetic navigation hiding.
- Replaces the old hard-coded “Hide Other Videos from Web navigation” behavior with an optional comma-separated list of library names to hide cosmetically.
- Adds a **Hide Jellyfin header branding on login** option.
- Adds optional **hero title keyword exclusions**.
- Adds optional **exclude fully played titles from hero** behavior.
- Pauses hero rotation when the browser tab is hidden and resumes cleanly when it becomes visible.
- Adds render-generation protection so quick Next/Previous clicks cannot leave stale hero artwork behind.
- Adds GitHub Actions release automation that builds a Jellyfin-compatible plugin ZIP and repository `manifest.json`.

## Current features

### Login
- Profile-forward “Who’s watching?” layout
- Custom server title
- Circular profile cards with accent hover ring
- Renamed alternate-account sign-in button
- Slowly moving Jellyfin splash/poster-wall background
- Configurable movement speed, blur, and darkness
- Optional hiding of the normal Jellyfin header branding on the login page

### Home
- Rotating featured-title hero using real Jellyfin library items
- Per-library hero source restriction (default: Anime, Movies, TV Shows)
- Backdrop / Thumb / Primary image fallbacks
- Transparent Jellyfin Logo artwork when available
- Cross-fade background transitions and repeat avoidance
- Play and More Info actions
- Clickable carousel dots
- Optional Previous / Next controls and keyboard Left / Right navigation
- Optional title-keyword exclusions
- Optional fully-played-title filtering
- Configurable rotation interval, number of items, artwork zoom, and overview length
- Tablet / mobile layout

### Navigation and theme
- Plex-inspired global dark theme with gold accent
- Hide duplicate My Media Home row
- Hide Other Videos Home rows if desired
- Optional cosmetic hiding of named libraries from Jellyfin Web navigation
- Library permissions remain controlled exclusively through Jellyfin user settings
- Styled cards, progress bars, navigation, dialogs, inputs, and detail pages

## Install / upgrade on TrueNAS SCALE

Extract the source bundle and run:

```bash
sudo bash ./install-truenas.sh
```

The installer:
1. finds `ix-jellyfin-jellyfin-1` by default,
2. finds the host dataset mounted to `/config`,
3. builds with the official .NET 10 SDK container,
4. backs up the currently installed Cinematic UI directory,
5. installs the compiled DLL and metadata,
6. creates a reusable binary plugin ZIP,
7. creates a Jellyfin repository `manifest.json` alongside the binary ZIP.

Restart Jellyfin from the TrueNAS Apps UI after installation, then hard-refresh Jellyfin Web with `Ctrl+Shift+R`.

## Plugin settings

Open:

`Dashboard → Plugins → Cinematic UI → Settings`

Settings are grouped into:
- Appearance
- Login
- Home Hero
- Navigation & Home Rows
- Repository

### Important permission note

The navigation-hiding field is **cosmetic only**. It does not grant or revoke library access. Use:

`Dashboard → Users → <profile> → Library Access`

for actual access control.

## Repository-ready release workflow

The source contains:

```text
.github/workflows/release.yml
repository/README.md
repository/manifest.example.json
```

Once the source is published at:

```text
https://github.com/guardipee14/Jellyfin.CinematicUI
```

pushing a tag such as:

```text
v0.1.5
```

builds the DLL, packages the plugin ZIP, calculates Jellyfin's MD5 checksum, creates `manifest.json`, and attaches both files to the GitHub Release.

The Jellyfin repository URL will be:

```text
https://github.com/guardipee14/Jellyfin.CinematicUI/releases/latest/download/manifest.json
```

Add it under:

`Dashboard → Plugins → Repositories`

Once that manifest is reachable, Jellyfin can associate Cinematic UI with its repository rather than treating it only as a manually installed plugin.

## Manual repository artifacts

The TrueNAS installer still generates:

```text
artifacts/CinematicUI-v0.1.5-jf12.1.zip
artifacts/manifest.json
```

The generated manifest defaults its binary URL to:

```text
https://github.com/guardipee14/Jellyfin.CinematicUI/releases/download/v0.1.5/CinematicUI-v0.1.5-jf12.1.zip
```

You can override the binary URL while installing/building:

```bash
sudo -E CINEMATIC_RELEASE_URL='https://example.com/CinematicUI-v0.1.5-jf12.1.zip' bash ./install-truenas.sh
```

## Uninstall / rollback

```bash
sudo bash ./uninstall-truenas.sh
```

The uninstall helper moves the plugin directory aside instead of deleting it.

## Compatibility

- Jellyfin Server: 12.1
- Target ABI: 12.1.0.0
- Runtime: .NET 10
- Tested deployment model: TrueNAS SCALE Apps / Docker-based Jellyfin

## Project

Developer: Donaven Guardipee  
GitHub: `guardipee14`  
Intended repository: `https://github.com/guardipee14/Jellyfin.CinematicUI`
