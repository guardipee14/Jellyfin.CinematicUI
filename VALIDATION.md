# Repository-management validation — October 2, 2026

## Recovery and build

The interrupted transfer omitted only `Web/cinematic.css` and `Web/client.js`. Both were recovered from the owner's original v0.1.5 TrueNAS installer archive. All other original archive files matched the transferred source after line-ending normalization. The recovered resources also match the production server's injected resources; their SHA-256 hashes are recorded in [RECOVERY.md](RECOVERY.md).

The recovered v0.1.5 source restores and builds for `net10.0` against Jellyfin 12.1.0 with zero warnings/errors. The compiled contract check confirms assembly version, GUID, automatic-update eligibility, and every embedded resource against source bytes. Node validates the existing client script's syntax.

## Published releases and catalog

- [v0.1.5](https://github.com/guardipee14/Jellyfin.CinematicUI/releases/tag/v0.1.5): immutable source tag `e977e9ca94d72e82d08be371b55c623c23244606`.
- v0.1.5 [full publication and public-installation run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37065683431): passed.
- [v0.1.6](https://github.com/guardipee14/Jellyfin.CinematicUI/releases/tag/v0.1.6): immutable source tag `ff70995a0b6d08780fecc8c43b587d8f5dc4d645`.
- v0.1.6 [publication and published-version upgrade run](https://github.com/guardipee14/Jellyfin.CinematicUI/actions/runs/37066806686): passed, including clean public catalog installation and an actual published v0.1.5-to-v0.1.6 upgrade.

Stable catalog URL:

```text
https://raw.githubusercontent.com/guardipee14/Jellyfin.CinematicUI/repository/manifest.json
```

Each runtime ZIP contains only `Jellyfin.Plugin.CinematicUI.dll` and `meta.json` at its root. Jellyfin's required MD5 checksum is computed from the exact ZIP bytes. Publication downloads and verifies the staged ZIP, then checks public package downloads before advancing the cumulative manifest. The GUID remains `e4c17f1b-c451-4a31-b98c-5d0ef44f9a21`, with target ABI `12.1.0.0`.

The exact stable URL was also fetched independently without authentication after publication. Its manifest retains both versions in descending order, and both public ZIP downloads passed checksum, contents, and metadata validation:

| Version | Jellyfin MD5 checksum |
| --- | --- |
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

The owner's TrueNAS server was inspected read-only over SSH. It reports Jellyfin `12.1.0.0`, Cinematic UI `0.1.5.0`, the expected GUID, and automatic updates enabled. Its served UI resources match the restored files exactly.

Production files, repositories, configuration, and container lifecycle were not modified. Production remains on v0.1.5. No browser visual walkthrough or live production upgrade/restart is claimed. The login, theme, and hero resources remain byte-for-byte unchanged; no new UI features were added. The settings page changes only its displayed version and catalog instructions.

To update that existing installation, add the stable repository URL in Jellyfin, run **Update Plugins**, and restart via **TrueNAS Apps → Jellyfin → Restart** when requested. Hard-refresh Jellyfin Web afterward. Configuration is retained; no shell installer is needed for the catalog transition.
