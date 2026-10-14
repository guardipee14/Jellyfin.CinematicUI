import copy
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import integration
from release import FIELDS, source_metadata


class IntegrationServerTests(unittest.TestCase):
    def test_ready_checks_each_selected_server_abi(self):
        with tempfile.TemporaryDirectory() as folder:
            for version in integration.SERVER_ABIS:
                with self.subTest(version=version):
                    instance = integration.Jellyfin(Path(folder), version, version)
                    instance.request = Mock(return_value={'Version': version + '.0'})
                    instance.ready()

    def test_ready_rejects_a_different_server_version(self):
        with tempfile.TemporaryDirectory() as folder:
            instance = integration.Jellyfin(Path(folder), 'wrong-version', '12.2')
            instance.request = Mock(return_value={'Version': '12.1.0'})
            with self.assertRaisesRegex(ValueError, 'Wrong test ABI'):
                instance.ready()

    def test_unsupported_server_is_rejected_before_creating_paths(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError, 'Unsupported test server'):
                integration.Jellyfin(Path(folder), 'unsupported', '99.0')
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_container_uses_the_selected_image(self):
        with tempfile.TemporaryDirectory() as folder:
            instance = integration.Jellyfin(Path(folder), 'image', '12.2')
            instance.ready = Mock()
            with patch.object(integration.os, 'getuid', return_value=1000, create=True), patch.object(integration.os, 'getgid', return_value=1000, create=True), patch.object(integration, 'run', side_effect=['fixture-container', '127.0.0.1:8097']) as run:
                instance.start()
            self.assertEqual(run.call_args_list[0].args[-1], 'ghcr.io/jellyfin/jellyfin:12.2')
            self.assertEqual(instance.base, 'http://127.0.0.1:8097')

    def test_published_previous_respects_the_selected_server_abi(self):
        meta = source_metadata(ROOT)
        manifest = [{key: meta[key] for key in FIELDS}]
        manifest[0]['versions'] = [dict(version=version, targetAbi=abi, changelog='Fixture', timestamp='2026-10-01T00:00:00Z', checksum='a' * 32, sourceUrl='https://example.com/' + version + '.zip')
                                   for version, abi in [('0.1.14.2', '12.3.0.0'), ('0.1.14.1', '12.2.0.0'), ('0.1.14.0', '12.1.0.0')]]
        current = copy.deepcopy(meta)
        current['version'] = '0.1.15.0'
        for abi, expected in [((12, 1, 0, 0), '0.1.14.0'), ((12, 2, 0, 0), '0.1.14.1')]:
            with self.subTest(abi=abi), tempfile.TemporaryDirectory() as folder:
                responses = [io.BytesIO(json.dumps(manifest).encode()), io.BytesIO(b'synthetic download')]
                with patch.object(integration.urllib.request, 'urlopen', side_effect=responses), patch.object(integration, 'verify_zip') as verify, patch('sys.stdout', new_callable=io.StringIO):
                    _, entry = integration.published_previous('https://example.com/manifest.json', Path(folder), current, abi)
                self.assertEqual(entry[0]['versions'][0]['version'], expected)
                self.assertEqual(verify.call_args.args[1]['version'], expected)
