# Publish Cinematic UI to GitHub

Intended repository:

`https://github.com/guardipee14/Jellyfin.CinematicUI`

## First publication

Create an empty public repository named `Jellyfin.CinematicUI` under the `guardipee14` account, then push this source tree to its `main` branch.

If GitHub CLI is installed and authenticated, from this directory you can use:

```bash
git init
git add .
git commit -m "release: Cinematic UI v0.1.5"
git branch -M main
gh repo create guardipee14/Jellyfin.CinematicUI --public --source=. --remote=origin --push
```

Then publish v0.1.5 by pushing the tag:

```bash
git tag v0.1.5
git push origin v0.1.5
```

The included GitHub Actions workflow builds the plugin and publishes these release assets automatically:

- `CinematicUI-v0.1.5-jf12.1.zip`
- `manifest.json`

## Jellyfin repository URL

After the workflow finishes, add this URL under **Dashboard → Plugins → Repositories**:

`https://github.com/guardipee14/Jellyfin.CinematicUI/releases/latest/download/manifest.json`

The repository manifest uses the same plugin GUID as the manual install, allowing Jellyfin to associate the existing Cinematic UI installation with the repository metadata.
