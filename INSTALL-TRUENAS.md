# TrueNAS SCALE install — Cinematic UI v0.1.5

From the extracted plugin source directory:

```bash
sudo bash ./install-truenas.sh
```

The installer uses a temporary `mcr.microsoft.com/dotnet/sdk:10.0` container, so it does **not** install development packages into the TrueNAS base OS.

After a successful build you should see paths for:

```text
Plugin directory: .../plugins/Cinematic UI
Reusable plugin ZIP: .../artifacts/CinematicUI-v0.1.5-jf12.1.zip
Repository manifest: .../artifacts/manifest.json
```

Then restart Jellyfin from:

`TrueNAS → Apps → Jellyfin → Restart`

Verify:

```bash
sudo docker logs ix-jellyfin-jellyfin-1 2>&1 \
  | grep -iE 'Cinematic|Jellyfin.Plugin.CinematicUI' \
  | tail -20
```

Expected version:

```text
Loaded assembly Jellyfin.Plugin.CinematicUI, Version=0.1.5.0
Loaded plugin: Cinematic UI 0.1.5.0
```

Then hard-refresh Jellyfin Web:

```text
Ctrl + Shift + R
```

## Upgrade note from v0.1.4

The old `Hide Other Videos from Web navigation` setting is intentionally no longer used. v0.1.5 separates cosmetic navigation cleanup from Jellyfin permissions. After upgrading, use the new **Hide libraries from Web navigation** field only if you intentionally want to hide permitted libraries from the Web header.

## Rollback

```bash
sudo bash ./uninstall-truenas.sh
```

The installer also keeps the prior installation under a timestamped backup directory inside the Jellyfin plugins folder.
