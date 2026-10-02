# Interrupted transfer recovery

The October 2, 2026 GitHub checkout contained 20 source/documentation files but omitted both embedded Web resources. Git history contained neither resource.

Both files were restored from the working `Jellyfin.CinematicUI-v0.1.5-TrueNAS-Installer.zip` in the owner's Downloads directory. Every other archive file matched GitHub HEAD after normalizing line endings. The restored resources have these SHA-256 hashes:

| Resource | SHA-256 |
| --- | --- |
| `Web/cinematic.css` | `258a4deef56693a8af890ba058ebcf7ad1e8d383cc43bcda6f3f581cf8d231c2` |
| `Web/client.js` | `dbf19bc489aed888cdb85aa72ff8d05dc825411dd5a4797a16b0c4041866b8ef` |

Restored v0.1.5 builds for `net10.0` against Jellyfin 12.1.0 with zero warnings/errors. The production server was inspected over SSH: Jellyfin reports `12.1.0.0`; Cinematic UI reports `0.1.5.0`, the expected GUID, and `autoUpdate: true`.

The UI resources are recovered assets, with no new UI features. Both recovered hashes also match the assets served by the deployed plugin in `/web/index.html`, which contains one injection marker. Repository-management changes replace release tooling/documentation and correct the repository URL shown in settings.

The automated Docker test uses a synthetic previous assembly version built from the current UI source. It checks the real Jellyfin installer/update mechanism rather than treating that fixture as a historical deployed release. Production restart and browser visual checks are separate from CI and must be reported separately.
