import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("manual", ROOT / "scripts/manual.py")
manual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manual)


class ManualArchiveTests(unittest.TestCase):
    def plugin(self, root, name, guid=manual.GUID):
        path = root / "plugins" / name
        path.mkdir(parents=True)
        (path / "meta.json").write_text(json.dumps({"guid": guid}), encoding="utf-8")
        (path / manual.ASSEMBLY).write_bytes(b"saved binary")
        return path

    def test_archives_all_versions_and_preserves_settings(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.plugin(root, "Cinematic UI")
            self.plugin(root, "Cinematic UI_0.1.6.0", manual.GUID.replace("-", ""))
            other = self.plugin(root, "Other Plugin", "11111111-1111-1111-1111-111111111111")
            xml = root / "plugins/configurations/Jellyfin.Plugin.CinematicUI.xml"
            xml.parent.mkdir()
            xml.write_bytes(b"saved configuration")
            backup = root / "cinematic-ui-backups/test"
            manual.archive(root, backup)
            self.assertEqual(b"saved configuration", xml.read_bytes())
            self.assertEqual(xml.read_bytes(), (backup / xml.name).read_bytes())
            self.assertTrue(other.is_dir())
            for name in ("Cinematic UI", "Cinematic UI_0.1.6.0"):
                self.assertEqual(b"saved binary", (backup / name / manual.ASSEMBLY).read_bytes())

    def test_refuses_backup_inside_plugin_scan_root(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            original = self.plugin(root, "Cinematic UI")
            with self.assertRaises(ValueError):
                manual.archive(root, root / "plugins/backup")
            self.assertTrue(original.is_dir())

    def test_collision_never_overwrites_an_archive(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            original = self.plugin(root, "Cinematic UI")
            backup = root / "cinematic-ui-backups/test"
            backup.mkdir(parents=True)
            with self.assertRaises(ValueError):
                manual.archive(root, backup)
            self.assertTrue(original.is_dir())

    def test_invalid_manifest_fails_before_moving_anything(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            original = self.plugin(root, "Cinematic UI")
            broken = self.plugin(root, "Broken Plugin")
            (broken / "meta.json").write_text("{broken", encoding="utf-8")
            with self.assertRaises(json.JSONDecodeError):
                manual.archive(root, root / "cinematic-ui-backups/test")
            self.assertTrue(original.is_dir())


if __name__ == "__main__":
    unittest.main()
