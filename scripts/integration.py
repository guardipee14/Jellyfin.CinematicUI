"""Test catalog installs and scheduled updates using disposable Jellyfin 12.1 containers.

Only containers created by this script are restarted or removed. No production paths are used.
"""
import argparse
import copy
import functools
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path
from release import GUID, package, read_json, require, source_metadata, write_json

IMAGE = "ghcr.io/jellyfin/jellyfin:12.1"
TEST_PASSWORD = "Cinematic release test 123!"


def run(*args):
    result = subprocess.run(args, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(f"Command failed: {args[0]} {args[1]}\n{result.stdout}\n{result.stderr}")
    return result.stdout.strip()


def wait_for(predicate, message, timeout=180):
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        try:
            value = predicate()
            if value:
                return value
        except (OSError, ValueError) as error:
            last = error
        time.sleep(2)
    raise TimeoutError(f"{message}; last response: {last}")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class Jellyfin:
    def __init__(self, workspace, label):
        self.name = f"cinematic-qa-{label}-{uuid.uuid4().hex[:8]}"
        self.config = workspace / label / "config"
        self.cache = workspace / label / "cache"
        self.config.mkdir(parents=True)
        self.cache.mkdir(parents=True)
        self.token = None
        self.base = None

    def start(self):
        run("docker", "run", "--detach", "--name", self.name,
            "--user", f"{os.getuid()}:{os.getgid()}", "--add-host", "host.docker.internal:host-gateway",
            "--publish", "127.0.0.1::8096", "--volume", f"{self.config}:/config", "--volume", f"{self.cache}:/cache", IMAGE)
        port = run("docker", "port", self.name, "8096/tcp").split(":")[-1]
        self.base = f"http://127.0.0.1:{port}"
        self.ready()

    def ready(self):
        def started():
            info = self.request("/System/Info/Public")
            # During migrations Jellyfin's startup middleware can return a 200 progress object.
            return info if "Version" in info else None
        info = wait_for(started, "Jellyfin did not finish startup")
        abi = tuple(map(int, info["Version"].split(".")))
        abi += (0,) * (4 - len(abi))
        require(abi == (12, 1, 0, 0), f"Wrong test ABI: {info['Version']}")

    def request(self, path, method="GET", data=None, raw=False):
        headers = {"Content-Type": "application/json",
                   "Authorization": 'MediaBrowser Client="Cinematic CI", Device="CI", DeviceId="cinematic-ci", Version="1.0"'}
        if self.token:
            headers["X-Emby-Token"] = self.token
            headers["Authorization"] += f', Token="{self.token}"'
        request = urllib.request.Request(self.base + path, method=method, headers=headers,
                                         data=json.dumps(data).encode() if data is not None else None)
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read()
        if raw:
            return body
        return json.loads(body) if body else None

    def setup(self):
        self.request("/Startup/Configuration", "POST", {"ServerName": "Cinematic CI", "UICulture": "en-US",
                                                        "MetadataCountryCode": "US", "PreferredMetadataLanguage": "en"})
        self.request("/Startup/User")
        self.request("/Startup/User", "POST", {"Name": "release-test", "Password": TEST_PASSWORD})
        self.request("/Startup/RemoteAccess", "POST", {"EnableRemoteAccess": False, "EnableAutomaticPortMapping": False})
        self.request("/Startup/Complete", "POST")
        self.login()
        # Exercise the explicit scheduled task rather than racing its default startup trigger.
        task = next(task for task in self.request("/ScheduledTasks") if task["Key"] == "PluginUpdates")
        self.request(f"/ScheduledTasks/{task['Id']}/Triggers", "POST", [])

    def login(self):
        response = self.request("/Users/AuthenticateByName", "POST", {"Username": "release-test", "Pw": TEST_PASSWORD})
        self.token = response["AccessToken"]

    def repository(self, url):
        self.request("/Repositories", "POST", [{"Name": "Cinematic CI", "Url": url, "Enabled": True}])

    def catalog(self):
        packages = self.request("/Packages")
        found = next((item for item in packages if item.get("guid") == GUID), None)
        require(found is not None, f"Cinematic UI missing from catalog; repositories={self.request('/Repositories')}; packages={packages}")
        return found

    def install(self, version):
        query = urllib.parse.urlencode({"assemblyGuid": GUID, "version": version})
        self.request("/Packages/Installed/Cinematic%20UI?" + query, "POST")

    def restart(self):
        run("docker", "restart", self.name)
        self.ready()
        self.login()

    def active(self, version):
        plugins = [p for p in self.request("/Plugins") if p["Id"].lower() == GUID]
        require(len(plugins) == 1, f"Duplicate plugin identities after restart: {plugins}")
        require(plugins[0]["Version"] == version and plugins[0]["Status"] == "Active", f"Plugin did not activate: {plugins}")

    def injection(self, root, expected_title=None):
        index = self.request("/web/index.html?cinematic-qa=" + uuid.uuid4().hex, raw=True).decode().replace("\r\n", "\n")
        require(index.count("<!-- CINEMATIC-UI-INJECTED -->") == 1, "Missing or duplicate injection")
        for path in ("Web/cinematic.css", "Web/client.js"):
            require((root / path).read_text(encoding="utf-8") in index, f"{path} was not injected intact")
        if expected_title:
            config = index.split("window.CinematicUIConfig=", 1)[1].split(";</script>", 1)[0]
            require(json.loads(config)["serverTitle"] == expected_title, "Injected configuration did not survive the update")

    def update_task(self):
        task = next(t for t in self.request("/ScheduledTasks") if t["Key"] == "PluginUpdates")
        last = task.get("LastExecutionResult")
        self.request(f"/ScheduledTasks/Running/{task['Id']}", "POST")
        def complete():
            info = self.request(f"/ScheduledTasks/{task['Id']}")
            result = info.get("LastExecutionResult")
            return result if result and result != last and info["State"] == "Idle" else None
        result = wait_for(complete, "Update Plugins did not finish")
        require(result["Status"] == "Completed", f"Scheduled update failed: {result}")

    def close(self):
        subprocess.run(["docker", "rm", "--force", self.name], capture_output=True)


def previous_artifact(root, workspace, current):
    numbers = list(map(int, current["version"].split(".")))
    require(numbers[2] > 0, "Integration fixture requires a positive patch version")
    numbers[2] -= 1
    version = ".".join(map(str, numbers))
    source = workspace / "previous-source"
    source.mkdir()
    for file in ("Jellyfin.Plugin.CinematicUI.csproj", "Plugin.cs", "EmbeddedAssets.cs", "IndexInjectionMiddleware.cs", "ServiceRegistrator.cs"):
        shutil.copy2(root / file, source / file)
    for directory in ("Web", "Configuration"):
        shutil.copytree(root / directory, source / directory)
    project = source / "Jellyfin.Plugin.CinematicUI.csproj"
    project.write_text(project.read_text().replace(current["version"], version), encoding="utf-8")
    metadata = copy.deepcopy(current)
    metadata["version"] = version
    metadata["changelog"] = "Synthetic previous version used only in isolated release tests."
    write_json(source / "meta.json", metadata)
    run("dotnet", "restore", str(project))
    run("dotnet", "build", str(project), "-c", "Release", "--no-restore")
    out = workspace / "served" / "previous"
    artifact = package(source, "v" + version[:-2], out)
    return artifact, read_json(out / "release-entry.json")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", default="artifacts")
    parser.add_argument("--root", default=".")
    parser.add_argument("--public-manifest", help="Also install from this published HTTPS manifest in a fresh instance")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    current = source_metadata(root)
    artifacts = Path(args.artifacts).resolve()
    entry = read_json(artifacts / "release-entry.json")
    run("docker", "pull", IMAGE)
    with tempfile.TemporaryDirectory(prefix="cinematic-qa-") as folder:
        workspace = Path(folder)
        served = workspace / "served"
        served.mkdir()
        old_zip, old_entry = previous_artifact(root, workspace, current)
        shutil.copy2(artifacts / entry[0]["versions"][0]["sourceUrl"].rsplit("/", 1)[1], served / "current.zip")
        handler = functools.partial(QuietHandler, directory=str(served))
        server = http.server.ThreadingHTTPServer(("0.0.0.0", 0), handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        repo_url = f"http://host.docker.internal:{server.server_port}/manifest.json"
        local_entry, local_old = copy.deepcopy(entry), copy.deepcopy(old_entry)
        local_entry[0]["versions"][0]["sourceUrl"] = repo_url.replace("manifest.json", "current.zip")
        local_old[0]["versions"][0]["sourceUrl"] = repo_url.replace("manifest.json", f"previous/{old_zip.name}")
        clean, manual = Jellyfin(workspace, "clean"), Jellyfin(workspace, "manual")
        try:
            write_json(served / "manifest.json", local_entry)
            clean.start()
            clean.setup()
            clean.repository(args.public_manifest or repo_url)
            require(any(v["version"] == current["version"] for v in clean.catalog()["versions"]), "Catalog does not discover current version")
            clean.install(current["version"])
            clean.restart()
            clean.active(current["version"])
            clean.injection(root)
            print("PASS: clean catalog discovery, install, restart, and intact Web injection", flush=True)
            installed = manual.config / "plugins/Cinematic UI"
            installed.mkdir(parents=True)
            with zipfile.ZipFile(old_zip) as archive:
                archive.extractall(installed)
            write_json(served / "manifest.json", local_old)
            manual.start()
            manual.setup()
            manual.active(old_entry[0]["versions"][0]["version"])
            settings = manual.request(f"/Plugins/{GUID}/Configuration")
            settings.update(ServerTitle="Release QA <safe> & settings", HeroLibraryNames="Movies,Anime", HeroRotationSeconds=23,
                            HeroExcludedTitleKeywords="fixture exclusion", LoginBackgroundBlurPx=7, HiddenNavigationLibraryNames="Other Videos")
            manual.request(f"/Plugins/{GUID}/Configuration", "POST", settings)
            config_path = manual.config / "plugins/configurations/Jellyfin.Plugin.CinematicUI.xml"
            require(config_path.is_file(), "Configuration filename changed")
            xml_before = config_path.read_bytes()
            manual.repository(repo_url)
            manual.catalog()
            future = copy.deepcopy(local_entry[0]["versions"][0])
            future.update(version="99.0.0.0", targetAbi="99.0.0.0")
            manifest = copy.deepcopy(local_entry)
            manifest[0]["versions"] = [future, local_entry[0]["versions"][0], local_old[0]["versions"][0]]
            write_json(served / "manifest.json", manifest)
            discovered = manual.catalog()["versions"]
            require(all(v["version"] != "99.0.0.0" for v in discovered), "Incompatible ABI was not filtered")
            manual.update_task()
            target = manual.config / f"plugins/Cinematic UI_{current['version']}" / "meta.json"
            require(target.is_file(), "Scheduled task did not install the compatible update")
            require(read_json(target)["version"] == current["version"], "Wrong version installed")
            manual.restart()
            manual.active(current["version"])
            actual = manual.request(f"/Plugins/{GUID}/Configuration")
            for key, value in settings.items():
                require(actual[key] == value, f"Configuration lost during upgrade: {key}")
            require(config_path.read_bytes() == xml_before, "Plugin configuration XML changed during upgrade")
            manual.injection(root, settings["ServerTitle"])
            manual.update_task()
            manual.active(current["version"])
            print("PASS: manual migration, compatible scheduled update, one active plugin, preserved XML/settings, and hard refresh", flush=True)
        except Exception:
            for instance in (clean, manual):
                log = subprocess.run(["docker", "logs", "--tail", "200", instance.name], text=True, capture_output=True)
                print(log.stdout + log.stderr, file=sys.stderr)
            raise
        finally:
            clean.close()
            manual.close()
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    main()
