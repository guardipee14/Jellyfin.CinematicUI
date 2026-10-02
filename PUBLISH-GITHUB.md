# Publishing Cinematic UI

## Normal release procedure

1. Update `Version`, `AssemblyVersion`, and `FileVersion` in `Jellyfin.Plugin.CinematicUI.csproj`, and `version`, `changelog`, and UTC `timestamp` in `meta.json`. Use four-part plugin versions such as `0.1.6.0`. Keep the assembly name and plugin GUID unchanged.
2. If changing the Jellyfin API baseline, update both Jellyfin package references and `targetAbi` together. Confirm the real server compatibility with the Docker integration test before releasing.
3. Commit and push to `main`. Wait for CI to pass.
4. Tag that commit and push the tag:

```bash
git tag v0.1.6
git push origin v0.1.6
```

The tag must exactly match the source version. Tags such as `v0.1.6-beta` and version overrides are rejected.

## What Actions publishes

The shared verification job restores and builds with .NET 10, checks the compiled assembly identity and all embedded resources, runs release-tool tests, packages only `Jellyfin.Plugin.CinematicUI.dll` and `meta.json`, and exercises a real disposable Jellyfin 12.1 server. The integration test covers catalog installation, restart, intact injection after a cache-bypassing request, migration from a manual folder, a newer compatible update through the scheduled Update Plugins task, exclusion of a future incompatible ABI, one active plugin after restart, and unchanged settings/XML.

After every required check passes, the publishing job uses the built-in `GITHUB_TOKEN` with `contents: write` to:

1. Read the existing manifest from the `repository` branch and validate its history.
2. Merge the verified version without changing earlier entries.
3. Create a draft GitHub release with the runtime ZIP, `release-entry.json`, and a cumulative `manifest.json` snapshot.
4. Download the staged ZIP and check its exact checksum/layout.
5. Publish the release and verify all package URLs without authentication.
6. Advance the stable manifest branch only after the binaries are publicly downloadable.
7. Verify the public raw manifest.
8. Repeat catalog installation from the public GitHub URL. When an earlier compatible release exists, seed its actual released ZIP as a manual installation and upgrade it through Jellyfin's scheduled task from the public repository.

Public catalog URL:

`https://raw.githubusercontent.com/guardipee14/Jellyfin.CinematicUI/repository/manifest.json`

No PAT, custom updater, or separate hosting provider is required. Repositories that protect the generated `repository` branch must allow Actions to write that branch. Publication is serialized across tags; a concurrent external branch change causes a safe failure rather than overwriting history. Push one release tag at a time and wait for its workflow to finish; GitHub concurrency can replace an older pending run when several tags are pushed together.

## Failure and retry

Failed verification publishes nothing. A failure after public release creation leaves the prior catalog manifest intact; users never receive a manifest entry pointing at a draft or missing asset. Fix the operational problem and rerun the failed workflow. The workflow can also be dispatched manually with the existing tag, and checks out that tag rather than current `main`.

Published version entries and ZIP checksums are immutable. A rerun must produce the same package. If code, metadata, or binary content changes, increment the version and create a new tag. Do not move release tags or overwrite published assets. Backfilled older versions are merged in numeric order without dropping newer versions.

For a local artifact check, install .NET 10 and Python 3.12+, then run `bash build.sh`, or `./build.ps1 -Python python`. To run the integration test locally on Linux with Docker, first build the artifacts, then run `python3 scripts/integration.py`. After a release, use `--public-manifest <catalog URL>` to repeat clean installation using the published GitHub URL.
