import importlib.util
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("publish", ROOT / "scripts/publish.py")
publish = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publish)


class PublicationTests(unittest.TestCase):
    def test_discovers_draft_on_later_release_page(self):
        draft = {"tag_name": "v0.1.5", "draft": True, "assets": []}
        with patch.object(publish, "gh", return_value=[[{"tag_name": "v0.1.6", "draft": False}], [draft]]):
            self.assertEqual(draft, publish.find_release("v0.1.5"))

    def test_missing_release_is_distinct_from_existing_draft(self):
        with patch.object(publish, "gh", return_value=[[]]):
            self.assertIsNone(publish.find_release("v0.1.5"))

    def test_duplicate_drafts_fail_closed(self):
        draft = {"tag_name": "v0.1.5", "draft": True}
        with patch.object(publish, "gh", return_value=[[draft, draft]]), self.assertRaises(ValueError):
            publish.find_release("v0.1.5")

    def test_cli_commands_can_return_a_url_instead_of_json(self):
        result = SimpleNamespace(returncode=0, stdout="https://github.com/example/release\n", stderr="")
        with patch.object(publish.subprocess, "run", return_value=result):
            self.assertEqual("https://github.com/example/release", publish.gh("release", "create"))


if __name__ == "__main__":
    unittest.main()
