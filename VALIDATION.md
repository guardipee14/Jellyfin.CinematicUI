# Cinematic UI validation — October 3, 2026

## v0.1.12 mobile homepage release

The owner's Jellyfin Android screenshot showed carousel indicators covering Play/More Info and a horizontal scrollbar beneath them. The existing three-title fixtures did not cover the default 12-title or maximum 30-title carousels. New layout checks reproduced the failures before the CSS fix. The responsive hero now uses separate top-control, content/action, and indicator rows at widths up to 1000px. Indicators wrap, actions can wrap, and content grows for larger text and long titles. The wide desktop rules and native Home rows remain intact.

All 100 desktop/phone Chromium checks pass locally. Twelve additional checks cover 320×740 and 390×844 phones, a 768×1024 tablet, 915×412 landscape, 12/30 titles, 200% text with long titles and no logo, hidden navigation settings, pointer selection/current state, and More Info navigation. The tests select a different title from the randomized initial slide without forcing disabled buttons. All 24 Python tooling tests pass. The v0.1.12 build has zero warnings/errors; compiled identity/resource/legacy-configuration checks and package validation pass.

A manual Chrome preview at 390×844 using the real assets and synthetic artwork confirmed 12 indicators below the action row, no hero scrollbar, and functioning title selection and More Info. Screenshot: `C:\Dev\CinematicUI-Previews\v0.1.12-phone.jpg`. This is responsive browser validation, not a physical Android/WebView test. Production has not been updated or restarted for this fix.

The [candidate CI](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37180565354), [merged main CI](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37180728481), and [release workflow](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37180879379) all passed. Each checked 100 browser cases, 24 tooling tests, the zero-warning build/contracts, packaging, and real Jellyfin candidate installation/update. The immutable source tag is `be418cdc371451a6ae24a3acde4df54a85e38525`.

The public release test installed from the stable GitHub catalog, then updated the actual published v0.1.11 package through Jellyfin's Update Plugins task. It confirmed one active identity, unchanged settings/XML, and intact Web injection. Independent unauthenticated checks verified the exact stable catalog URL, all eight public ZIPs, and unchanged older entries. The catalog commit is `fdd89d701146452c3020ad5b2ce09dfd547528b0`; v0.1.12's ZIP MD5 is `e6eb3628cdbe233b01870a3718ab264b`.

Published October 3, 2026 (October 4 UTC). Run Update Plugins, restart Jellyfin through TrueNAS Apps, then fully close and reopen the Android app to load the new assets. The owner's physical Android confirmation remains outstanding.

## v0.1.10 player colors and title/details publication

The owner's Plex/Jellyfin screenshots and read-only production series/season DOM inspection informed the details layout. Inspection identified hard-coded blue legacy range thumbs/bars and Jellyfin's React palette variables that the earlier theme did not override. The native volume container's zero flex basis also collapsed it after v0.1.9 disabled flex growth; the candidate gives it an explicit 76px basis.

The real plugin assets passed 66 Chromium checks across desktop and 390×844 phone projects. Nine additional cases per viewport cover actual rendered slider-thumb pixels (outside the track band), native volume/React accents, a custom purple accent, native-blue restoration when the global theme is off, compact series details, a three-column desktop/one-column phone season grid, native detail/episode action handlers, series/season/library/player/Home transitions, cached hidden detail pages, opt-outs, TV, unknown detail structures, and unknown episode rows. The 14 detail checks were rerun after the final transparent-card and cached-page assertions. All 24 tooling tests, the zero-warning .NET build, compiled identity/embedded-resource contracts, and legacy XML defaults passed locally.

Visual checks use synthetic artwork/media and fixture handlers based on observed native markup. They cover the title/action layout, dim backdrop, slim gold player timeline, visible volume control, and responsive geometry. They do not claim a production streaming test, actual stream selection/PiP, Firefox/Safari, physical-device, or screen-reader testing. During this milestone, production inspection only navigated to Season 1 and returned to the original series page; no playback, settings, installation, or server lifecycle changes were made.

The final [source CI](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37098874044) and [merged main CI](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37099054338) passed all 66 browser checks, 24 tooling tests, warning-free build/contracts, packaging, and real Jellyfin candidate installation/update checks. The immutable source tag is `2a53f92589edfc2813fe56de677e8b36cb213be8`.

The [publication run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37099208924) passed all verification and publication steps. Its public test logged `Testing upgrade from actual published version 0.1.9.0`, followed by successful clean installation and migration/compatible scheduled update, one active plugin, unchanged settings/XML, and intact injection after a hard refresh. An independent unauthenticated fetch verified the exact stable URL, all six ZIPs, checksums/layout/metadata, and unchanged prior entries. The new checksum is `fb09c1a29ff51009272f75384cbac33a`; the stable manifest commit is `142af8b2dd8c4162877680a59f1d2fcf74a1b987`.

The production dashboard reported v0.1.9.0 Active during read-only inspection. The agent did not install or restart production for this milestone. Run the normal Update Plugins task, restart Jellyfin through TrueNAS Apps, then hard-refresh the browser to activate v0.1.10. The details flag defaults on; its Appearance opt-out and the existing player/library/global-theme toggles remain available.

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
- [v0.1.9](https://github.com/guardipee14/Jellyfin.CinematicUI/releases/tag/v0.1.9): immutable source tag `d7bac76bcfc052d356953afd4e1fcd3f801925de`.
- v0.1.9 [publication and published-version upgrade run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37094297497): passed, including all 48 browser checks, clean public installation, and the actual published v0.1.8-to-v0.1.9 update.
- [v0.1.10](https://github.com/guardipee14/Jellyfin.CinematicUI/releases/tag/v0.1.10): immutable source tag `2a53f92589edfc2813fe56de677e8b36cb213be8`.
- v0.1.10 [publication and published-version upgrade run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37099208924): passed, including all 66 browser checks, clean public installation, and the actual published v0.1.9-to-v0.1.10 update.

Stable catalog URL:

```text
https://raw.githubusercontent.com/guardipee14/Jellyfin.CinematicUI/repository/manifest.json
```

Each runtime ZIP contains only `Jellyfin.Plugin.CinematicUI.dll` and `meta.json` at its root. Jellyfin's required MD5 checksum is computed from the exact ZIP bytes. Publication downloads and verifies the staged ZIP, then checks public package downloads before advancing the cumulative manifest. The GUID remains `e4c17f1b-c451-4a31-b98c-5d0ef44f9a21`, with target ABI `12.1.0.0`.

The exact stable URL was also fetched independently without authentication after publication. The latest manifest retains all six versions in descending order, and all public ZIP downloads passed checksum, contents, and metadata validation. Every prior version entry remains exactly unchanged:

| Version | Jellyfin MD5 checksum |
| --- | --- |
| `0.1.10.0` | `fb09c1a29ff51009272f75384cbac33a` |
| `0.1.9.0` | `709239d9277faaa2e77774d5d6fae7ef` |
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

## v0.1.9 Plex-inspired video player

Live inspection of the owner's existing Plex and Jellyfin players supplied the control proportions and Jellyfin DOM shape. The implementation was checked against the [official Jellyfin Web v12.1 video controller](https://github.com/jellyfin/jellyfin-web/blob/v12.1/src/apps/legacy/controllers/playback/video/index.js) and [overlay styles](https://github.com/jellyfin/jellyfin-web/blob/v12.1/src/styles/videoosd.scss). Native control nodes, handlers, visibility classes, playback engine, and menus remain owned by Jellyfin. The theme now allows native transparent playback backgrounds instead of placing the browsing background over video.

The [candidate CI run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37093833981) and [merged source CI run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37094083598) passed before pushing the immutable source tag `d7bac76bcfc052d356953afd4e1fcd3f801925de`. All 48 desktop/phone browser checks, 24 tooling tests, the zero-warning/error build, compiled identity/resource/legacy XML contracts, packaging, and real Jellyfin candidate install/update checks passed.

Eight new player cases run on desktop and phone. They cover geometry and video transparency; real video play/pause and keyboard seeking; subtitle/audio/settings menu handler preservation; desktop volume/mute and native phone visibility; real desktop fullscreen and title transitions; hidden controls; appearance opt-out/global theme opt-out/TV/unrecognized structure/legacy title fallbacks; and cleanup when returning Home and libraries. The 3,308-byte silent solid-color VP9 clip is generated solely for tests and served with byte ranges so Chromium can seek. Menus use synthetic fixture handlers. PiP button visibility is covered; actual PiP and streaming track selection are not claimed. Test dependencies/media are excluded from the runtime ZIP.

Manual synthetic previews at 1864×949 showed the thin timeline, footer title on the left, centered transport, and playback options on the right. At 390×844, controls wrapped inside the viewport and the video retained its native letterboxing. Desktop/phone screenshots were saved, and temporary viewport overrides and the local preview server were cleaned up.

The production plugin dashboard showed Cinematic UI v0.1.8 Active. Inspecting the live player resumed the existing episode, which was then stopped through Back; a subsequent check confirmed zero playing video elements. The agent did not change production configuration, plugin installation, server files, or lifecycle. No full production playback, physical-device, actual PiP, or streaming audio/subtitle test is claimed.

The [release workflow](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37094297497) repeated all required checks and published v0.1.9. Clean public catalog installation passed. It then downloaded the actual released v0.1.8 ZIP, upgraded through the public repository and Jellyfin's normal Update Plugins task, and confirmed unchanged settings/XML, one active plugin, and intact current injection. Independent unauthenticated checks verified the exact stable catalog, all five public ZIPs, and every unchanged older version entry. The published manifest commit is `1e0d4c7fa0ae66cb1aa8f02755b16eb2a8aad42b`.

v0.1.9 can be activated through Update Plugins, a TrueNAS Apps restart, and a hard browser refresh. The player layout defaults on and can be disabled under Appearance. The agent did not deploy this release to production. Profile/library-selection reliability remains next.

## v0.1.11 profile and library-selection release

Read-only inspection of Jellyfin 12.1's native Profile page and React account menu informed the guarded selectors. Original controls, handlers, file input, and menu destinations remain in place. No production password, avatar, policy, installation, or lifecycle was changed. The owner reported v0.1.10 updated and looking good.

The local .NET build passed with zero warnings/errors, including compiled identity/resource and legacy profile-setting defaults, and all 24 tooling tests passed. All existing 66 browser checks plus 20 new profile/library-selection checks passed on desktop and phone. Two additional checks confirmed hero Play reaches the native handler and cancels pending playback after an account switch. Fixtures use synthetic credentials/media and preserve native-shaped handlers; they do not claim a production password change or full native menu accessibility audit. CI and public install/update validation are required before publication.

Fallback is explicit: named libraries use only available matches, no matches retain native Home, and blank configuration selects available movie/TV views. View enumeration failure never causes root-library queries. Played/keyword filters apply to every fallback query. One request attempt per Home/account context prevents observer retry storms. Pending requests and object URLs are cancelled/cleaned after account, token, server, logout, or route changes; history and Play intent are scoped to account/server. Foreign-origin credentials never leave the browser.

The [candidate CI run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37131362951), [merged main CI run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37131634279), and [release workflow](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37131967801) all passed. Each ran all 88 browser checks, 24 tooling tests, build/contracts and candidate Jellyfin install/update checks. The immutable source tag is `467c02da8b4e35c25afe94c9c00eebf0341a9cbc`.

Publication then passed clean public catalog installation and the actual published v0.1.10-to-v0.1.11 scheduled update with byte-for-byte settings/XML preservation, one active plugin and intact current injection. Independent unauthenticated checks verified all seven released ZIPs and unchanged historical entries. The catalog commit is `7739b9b3009a850ad4aff51dd2eb23b2fbd792f7`, and v0.1.11's ZIP MD5 is `39ed3fdfefbc44712ddbf9d023d326d8`. A manual read-only synthetic preview confirmed the compact profile card and reachable form; no production credentials were entered.

v0.1.11 is available through the existing catalog. Activate it with Update Plugins, a TrueNAS Apps restart, and a hard browser refresh. The agent did not install or restart production.
