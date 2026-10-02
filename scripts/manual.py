"""Archive only Cinematic UI plugin copies, outside Jellyfin's discovery directory."""
import argparse
import json
import shutil
from pathlib import Path
from release import GUID, ASSEMBLY, require


def archive(config_root, backup):
    config_root, backup = Path(config_root).resolve(), Path(backup).resolve()
    plugins = config_root / "plugins"
    require(config_root.is_dir(), "Config root does not exist")
    require(backup.is_relative_to(config_root) and not backup.is_relative_to(plugins), "Backup must be inside config but outside plugins")
    matches = []
    if plugins.is_dir():
        for folder in plugins.iterdir():
            if not folder.is_dir() or folder.is_symlink():
                continue
            meta = folder / "meta.json"
            if meta.is_file():
                # Do not guess ownership of an unreadable/malformed manifest.
                manifest = json.loads(meta.read_text(encoding="utf-8-sig"))
                if manifest.get("guid", "").lower() == GUID:
                    matches.append(folder)
            elif folder.name == "Cinematic UI" and (folder / ASSEMBLY).is_file():
                matches.append(folder)
    if not matches:
        print("No previous Cinematic UI copies found.")
        return
    require(not backup.exists(), "Backup path already exists; choose a new timestamp")
    backup.mkdir(parents=True)
    settings = plugins / "configurations/Jellyfin.Plugin.CinematicUI.xml"
    if settings.is_file():
        shutil.copy2(settings, backup / settings.name)
    for folder in matches:
        require(folder.resolve().parent == plugins.resolve(), "Plugin path escaped scan root")
        shutil.move(str(folder), str(backup / folder.name))
        print(f"Archived {folder.name} to {backup}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["archive"])
    parser.add_argument("--config-root", required=True)
    parser.add_argument("--backup", required=True)
    args = parser.parse_args()
    archive(args.config_root, args.backup)
