import copy
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("release", ROOT / "scripts/release.py")
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        meta = release.source_metadata(ROOT)
        self.entry = [{key: meta[key] for key in release.FIELDS}]
        self.entry[0]["versions"] = [dict(version="0.1.5.0", changelog="Test", targetAbi="12.1.0.0",
                                         timestamp="2026-10-02T20:15:00Z", checksum="a" * 32,
                                         sourceUrl="https://github.com/example/repo/releases/download/v0.1.5/plugin.zip")]

    def other(self, version, abi="12.1.0.0"):
        entry = copy.deepcopy(self.entry)
        entry[0]["versions"][0]["version"] = version
        entry[0]["versions"][0]["targetAbi"] = abi
        return entry

    def test_tag_and_metadata_must_match(self):
        meta = release.source_metadata(ROOT)
        release.source_metadata(ROOT, "v" + meta["version"][:-2])
        with self.assertRaises(ValueError):
            release.source_metadata(ROOT, "v99.0.0")

    def test_reject_ambiguous_tags(self):
        for tag in ("0.1.5", "v0.1.5.0", "v0.1.5-beta", "v01.1.5", "v0.1", "v0.1.5; echo nope"):
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                release.tag_version(tag)

    def test_first_release(self):
        self.assertEqual(self.entry, release.merge_manifest(None, self.entry))

    def test_retains_older_compatible_versions(self):
        merged = release.merge_manifest(self.entry, self.other("0.1.6.0"))
        self.assertEqual(["0.1.6.0", "0.1.5.0"], [v["version"] for v in merged[0]["versions"]])

    def test_future_abi_does_not_remove_previous_versions(self):
        merged = release.merge_manifest(self.entry, self.other("0.2.0.0", "13.0.0.0"))
        compatible = [v for v in merged[0]["versions"] if release.version_tuple(v["targetAbi"]) <= (12, 1, 0, 0)]
        self.assertEqual(["0.1.5.0"], [v["version"] for v in compatible])

    def test_backfill_sorts_numerically(self):
        merged = release.merge_manifest(self.other("0.1.10.0"), self.other("0.1.9.0"))
        self.assertEqual(["0.1.10.0", "0.1.9.0"], [v["version"] for v in merged[0]["versions"]])

    def test_rerun_is_idempotent(self):
        self.assertEqual(self.entry, release.merge_manifest(self.entry, self.entry))

    def test_published_version_cannot_change(self):
        for field, value in (("checksum", "b" * 32), ("targetAbi", "13.0.0.0"), ("changelog", "changed")):
            changed = copy.deepcopy(self.entry)
            changed[0]["versions"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                release.merge_manifest(self.entry, changed)

    def test_corrupt_history_fails_closed(self):
        for field, value in (("guid", "wrong"), ("name", "Renamed"), ("versions", [])):
            changed = copy.deepcopy(self.entry)
            changed[0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                release.merge_manifest(changed, self.other("0.1.6.0"))

    def test_checksum_url_version_and_timestamp_validation(self):
        for field, value in (("checksum", "GENERATED"), ("sourceUrl", "http://example.com/plugin.zip"),
                             ("version", "0.1.5"), ("targetAbi", "not-a-version"), ("timestamp", "2026-10-02T20:00:00")):
            changed = copy.deepcopy(self.entry)
            changed[0]["versions"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                release.validate_manifest(changed)

    def test_duplicate_version_rejected(self):
        duplicate = copy.deepcopy(self.entry)
        duplicate[0]["versions"] *= 2
        with self.assertRaises(ValueError):
            release.validate_manifest(duplicate)

    def test_update_flag_must_not_be_disabled(self):
        meta = release.source_metadata(ROOT)
        meta["autoUpdate"] = False
        with self.assertRaises(ValueError):
            release.validate_meta(meta)

    def test_package_layout_and_tampering(self):
        meta = release.source_metadata(ROOT)
        tag = "v" + meta["version"][:-2]
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in ("meta.json", "Plugin.cs", "Jellyfin.Plugin.CinematicUI.csproj", "Web/cinematic.css", "Web/client.js", "Configuration/configPage.html"):
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((ROOT / name).read_bytes())
            binary = root / "bin/Release/net10.0" / release.ASSEMBLY
            binary.parent.mkdir(parents=True)
            binary.write_bytes(b"MZ" + b"fixture" * 1000)
            path = release.package(root, tag, root / "one")
            second = release.package(root, tag, root / "two")
            self.assertEqual(path.read_bytes(), second.read_bytes())
            entry = release.read_json(root / "one/release-entry.json")
            release.verify_zip(path, entry[0]["versions"][0])
            with zipfile.ZipFile(path, "a") as archive:
                archive.writestr("configurations/settings.xml", "must never ship settings")
            altered = copy.deepcopy(entry[0]["versions"][0])
            altered["checksum"] = release.md5_bytes(path.read_bytes())
            with self.assertRaises(ValueError):
                release.verify_zip(path, altered)
            with self.assertRaises(ValueError):
                release.verify_zip(path, entry[0]["versions"][0])


if __name__ == "__main__":
    unittest.main()
