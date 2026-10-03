# Cinematic UI validation — October 2, 2026

## Recovery and build

The interrupted transfer omitted only `Web/cinematic.css` and `Web/client.js`. Both were recovered from the owner's original v0.1.5 TrueNAS installer archive. All other original archive files matched the transferred source after line-ending normalization. The recovered resources also match the production server's injected resources; their SHA-256 hashes are recorded in [RECOVERY.md](RECOVERY.md).

The recovered v0.1.5 source restores and builds for `net10.0` against Jellyfin 12.1.0 with zero warnings/errors. The compiled contract check confirms assembly version, GUID, automatic-update eligibility, and every embedded resource against source bytes. Node validates the existing client script's syntax.

## Published releases and catalog

- [v0.1.5](https://github.com/guardipee14/Jellyfin.CinematicUI/releases/tag/v0.1.5): immutable source tag `e977e9ca94d72e82d08be371b55c623c23244606`.
- v0.1.5 [full publication and public-installation run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37065683431): passed.
- [v0.1.6](https://github.com/guardipee14/Jellyfin.CinematicUI/releases/tag/v0.1.6): immutable source tag `ff70995a0b6d08780fecc8c43b587d8f5dc4d645`.
- v0.1.6 [publication and published-version upgrade run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37066806686): passed, including clean public catalog installation and an actual published v0.1.5-to-v0.1.6 upgrade.
- [v0.1.7](https://github.com/guardipee14/Jellyfin.CinematicUI/releases/tag/v0.1.7): immutable source tag `325a1ca333fac68a6021c04ed2138bc1c2477d80`.
- v0.1.7 [publication and published-version upgrade run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37081323629): passed, including 18 desktop/phone browser checks, clean public catalog installation, and an actual published v0.1.6-to-v0.1.7 upgrade.
- [v0.1.8](https://github.com/guardipee14/Jellyfin.CinematicUI/releases/tag/v0.1.8): immutable source tag `3c2e3c5a1c1369f7cc0aaa6785f53a73947b1ca7`.
- v0.1.8 [publication and published-version upgrade run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37091023578): passed, including 32 desktop/phone browser checks, clean public installation, and the actual published v0.1.7-to-v0.1.8 update.

Stable catalog URL:

```text
https://raw.githubusercontent.com/guardipee14/Jellyfin.CinematicUI/repository/manifest.json
```

Each runtime ZIP contains only `Jellyfin.Plugin.CinematicUI.dll` and `meta.json` at its root. Jellyfin's required MD5 checksum is computed from the exact ZIP bytes. Publication downloads and verifies the staged ZIP, then checks public package downloads before advancing the cumulative manifest. The GUID remains `e4c17f1b-c451-4a31-b98c-5d0ef44f9a21`, with target ABI `12.1.0.0`.

The exact stable URL was also fetched independently without authentication after publication. The latest manifest retains all four versions in descending order, and all public ZIP downloads passed checksum, contents, and metadata validation. The historical v0.1.5/v0.1.6/v0.1.7 entries remain exactly unchanged:

| Version | Jellyfin MD5 checksum |
| --- | --- |
| `0.1.8.0` | `9c8ff3fd3c4b6da7bfa4d7f97d38d606` |
| `0.1.7.0` | `3253d018513ddcff00cbf6b95ef8b2fd` |
| `0.1.6.0` | `f112e1d6d5646c091dcae30772fb6502` |
| `0.1.5.0` | `5be5e3fb96934ef4a153c0d33d2591ea` |

## Real Jellyfin validation

CI uses isolated `ghcr.io/jellyfin/jellyfin:12.1` containers with disposable configuration and cache paths. The candidate test checks:

1. Catalog discovery, installation, restart, and one active plugin identity.
2. Migration from an unversioned manual installation through Jellyfin's normal **Update Plugins** scheduled task.
3. Exclusion of a future incompatible ABI and selection of the newer compatible version.
4. Preservation of all plugin configuration values and byte-for-byte preservation of the original configuration XML.
5. Exactly one injected UI marker and intact restored CSS/JavaScript after a cache-bypassing request.
6. An additional Update Plugins run leaves the installed current version active.

Candidate tests use a synthetic prior assembly version built from current UI source. The first public v0.1.5 run also uses that fixture because no older published package exists. The v0.1.6 public test downloaded the actual released v0.1.5 ZIP and updated it from the public GitHub catalog. The log confirms `Testing upgrade from actual published version 0.1.5.0` followed by successful clean installation and migration/update checks.

The current main branch includes 24 passing Python tests covering package integrity, deterministic packaging, numeric version ordering, ABI/version consistency, retained manifest history, immutable published entries, safe manual backups, draft discovery across paginated release lists, and delayed draft visibility. The [controller fix's CI run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37066531077) passed all 24 and the real Jellyfin candidate tests. The immutable v0.1.6 tag contains 21 tests; v0.1.5 contains the original 17.

The initial v0.1.5 publication stopped at draft discovery without advancing the catalog. The controller fix was merged on main and the existing tag was retried successfully. The tag was not moved, and the retry reused the staged draft. The first v0.1.6 attempt exposed delayed listing of a newly created draft. A bounded visibility wait was added, and only that attempt's empty unpublished draft was removed to repeat fresh-draft creation. The corrected workflow successfully created a fresh draft, published v0.1.6, retained v0.1.5 history, and passed the final public upgrade test. Both immutable source tags were retained.

## Production and UI scope

At the original recovery inspection, the owner's TrueNAS server reported Jellyfin `12.1.0.0`, Cinematic UI `0.1.5.0`, the expected GUID, and automatic updates enabled. Its served UI resources matched the restored files exactly.

The owner subsequently updated/restarted the TrueNAS app. Read-only checks confirmed Cinematic UI `0.1.6.0` active, the stable repository enabled, automatic updates enabled, the configuration file present, and one intact UI injection. The agent did not modify production files, repositories, configuration, or container lifecycle. No byte-for-byte comparison of pre/post production settings or production playback test is claimed. The v0.1.5/v0.1.6 login, theme, and hero resources preserve the recovered baseline.

Subsequent live browser checks verified login/profile rendering, hero artwork and rotation, More Info navigation, and restoration of one hero on returning Home. Those checks reproduced lost indicator focus and the login branding flag missing Jellyfin 12.1's React header, which define the next UI reliability milestone in [ROADMAP.md](ROADMAP.md).

## v0.1.7 UI reliability and publication

The [candidate CI run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37080678635) passed the .NET build with warnings treated as errors, compiled identity/resource contracts, all 24 Python tooling tests, and 18 Chromium browser checks across desktop and phone projects. Packaging and real Jellyfin catalog installation/update checks also passed. Browser coverage includes retained indicator focus and selected state, keyboard-triggered rotation pause independent of hover, explicit pointer/keyboard Resume, reduced-motion defaults, artwork retention after rapid title changes, detail/Home navigation, modern header branding/navigation settings, and long profile lists on small screens.

The first browser run passed 14 checks but two profile checks could not find an exact accessible name: a decorative fixture avatar symbol was included in that name. Marking that fixture-only decoration `aria-hidden` resolved the mismatch; the subsequent 16-check run passed. Manual visual testing then reproduced a separate artwork race when changing titles before the previous fade timer finished. The cleanup now checks layer ownership and active state, with two additional passing browser regressions.

Manual candidate browser checks used the real CSS/JavaScript with synthetic media on localhost. They confirmed retained selected-indicator focus, pointer Pause/Resume behavior, current artwork after rapid navigation, and scrolling from 12 profile choices to recovery controls at 390×600. Desktop and 390×844 phone screenshots were saved during the walkthrough. These fixtures do not claim a full screen-reader audit, physical-device testing, or production playback validation. Browser dependencies stay outside the runtime ZIP. Immutable v0.1.5/v0.1.6 workflow retries retain their original scope because those source tags predate the browser suite; newer candidates require the locked browser dependencies and tests.

The [final PR revision](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37080929012) and [merged main commit](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37081129575) passed CI before the immutable v0.1.7 tag was pushed. The release workflow repeated all 18 browser and 24 Python tests, the clean build/contracts, packaging, and candidate Jellyfin checks. Publication then downloaded the actual released v0.1.6 ZIP and updated it through the public catalog and normal Update Plugins task. Clean catalog installation, intact current UI injection, one active plugin, retained settings, and byte-for-byte XML preservation passed. An independent unauthenticated fetch verified the exact stable URL, all three ZIPs, and unchanged historical entries. The published manifest commit is `b290256c10b2556812faf1dba10fb9abc2f3db63`.

Production was last confirmed on the owner's v0.1.6 installation. The v0.1.7 release is available through the existing enabled catalog; the agent did not update or restart production during this milestone. [ROADMAP.md](ROADMAP.md) marks UI reliability complete and profile/library-selection reliability next.

## v0.1.8 Plex-inspired library layout

The owner's Plex/Jellyfin screenshots and read-only inspection of the live Jellyfin 12.1 library informed the desktop shell, native navigation destinations, card structure, and toolbar selectors. The sidebar uses only existing profile-visible links/icons and honors configured cosmetic navigation exclusions. No production metadata or artwork was copied into the preview fixture. Native handlers remain on the original controls.

The [candidate CI run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37090458131) and [merged source CI run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37090859915) passed before tagging v0.1.8. All 32 desktop/phone browser checks, 24 Python tooling tests, warning-free .NET build, compiled version/resource contracts, packaging, and real Jellyfin candidate install/update tests passed. Seven new library cases run on both projects: responsive card geometry, keyboard/current-library navigation, native filter/sort/view handlers, list/grid round trips, appearance opt-out, configured exclusions, and cleanup when opening details/Home. A compiled contract loads legacy XML, checks preservation of existing values, and verifies the new default-enabled appearance setting in injected configuration.

Manual synthetic previews confirmed a 260px sidebar and seven 166px posters across an 1854×893 desktop viewport. At 390×844, native navigation remained, the sidebar was hidden, cards formed two columns, and document width did not exceed the viewport. Native list/grid switches retained one sidebar. Desktop and phone screenshots were saved during the walkthrough; temporary viewport overrides and the local fixture server were cleaned up. This does not claim physical-device or production playback validation. Live production library inspection was read-only; the agent did not install or restart production for this layout.

The [release workflow](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37091023578) repeated all required checks, published v0.1.8, and installed it from the unauthenticated public GitHub catalog. It downloaded the actual released v0.1.7 ZIP, migrated/updated it through Jellyfin's normal Update Plugins task, and confirmed one active plugin, intact current injection, preserved settings, and byte-for-byte XML preservation. Independent unauthenticated checks verified all four public ZIPs and exact retention of every older manifest entry. The catalog commit is `46aaa9c98e9ac15a0ae3dca46aeca154ccd8a69f`.

v0.1.8 is available through the existing catalog. Activate it with Update Plugins, restart through TrueNAS Apps, and hard-refresh Jellyfin Web. The library appearance option defaults on; it can be disabled under Cinematic UI's Appearance settings. Profile/library-selection reliability remains the next milestone.
