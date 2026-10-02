"""Publish a verified tag package, then advance the stable repository manifest."""
import argparse
import base64
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from release import REPOSITORY, merge_manifest, read_json, require, tag_version, verify_remote, verify_zip, write_json

BRANCH = "repository"
MANIFEST_URL = f"https://raw.githubusercontent.com/{REPOSITORY}/{BRANCH}/manifest.json"


def gh(*args, payload=None, missing_ok=False):
    result = subprocess.run(["gh", *args], input=json.dumps(payload) if payload is not None else None,
                            text=True, capture_output=True)
    if result.returncode:
        if missing_ok and "HTTP 404" in result.stderr:
            return None
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    if not result.stdout.strip():
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return result.stdout.strip()


def api(path, method="GET", payload=None, missing_ok=False):
    args = ["api", f"repos/{REPOSITORY}/{path}", "--method", method]
    if payload is not None:
        args += ["--input", "-"]
    return gh(*args, payload=payload, missing_ok=missing_ok)


def find_release(tag):
    # The tag endpoint is for published releases. Listing also returns our staged drafts.
    pages = gh("api", f"repos/{REPOSITORY}/releases?per_page=100", "--header", "Cache-Control: no-cache", "--paginate", "--slurp")
    matches = [release for page in pages for release in page if release["tag_name"] == tag]
    require(len(matches) <= 1, "Multiple releases share the tag; resolve duplicate drafts before retrying")
    return matches[0] if matches else None


def wait_for_release(tag, attempts=24, delay=5):
    # Creation can succeed before the authenticated release list reflects the draft.
    for attempt in range(attempts):
        release = find_release(tag)
        if release is not None:
            return release
        if attempt + 1 < attempts:
            time.sleep(delay)
    raise RuntimeError("New draft release is not visible after waiting; retry the existing tag")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--artifacts", default="artifacts")
    args = parser.parse_args()
    tag_version(args.tag)
    folder = Path(args.artifacts)
    entry = read_json(folder / "release-entry.json")
    version = entry[0]["versions"][0]
    require(tag_version(args.tag) == version["version"], "Release tag differs from verified artifact")
    zip_name = version["sourceUrl"].rsplit("/", 1)[1]
    verify_zip(folder / zip_name, version)

    reference = api(f"git/ref/heads/{BRANCH}", missing_ok=True)
    parent = reference["object"]["sha"] if reference else None
    previous = None
    if parent:
        contents = api(f"contents/manifest.json?ref={parent}")
        previous = json.loads(base64.b64decode(contents["content"]))
    manifest = merge_manifest(previous, entry)
    write_json(folder / "manifest.json", manifest)

    existing = find_release(args.tag)
    if existing:
        matches = [asset for asset in existing["assets"] if asset["name"] == zip_name]
        if matches:
            verified = folder / "downloaded"
            verified.mkdir(exist_ok=True)
            gh("release", "download", args.tag, "--repo", REPOSITORY, "--pattern", zip_name, "--dir", str(verified), "--clobber")
            verify_zip(verified / zip_name, version)
        else:
            require(existing["draft"], "Published release is missing its ZIP; do not replace published releases")
    else:
        notes = (f"{version['changelog']}\n\nJellyfin repository URL:\n\n{MANIFEST_URL}\n\n"
                 f"Targets Jellyfin {version['targetAbi']}. Settings and the plugin GUID remain stable across updates.\n")
        (folder / "release-notes.md").write_text(notes, encoding="utf-8")
        gh("release", "create", args.tag, "--repo", REPOSITORY, "--draft", "--verify-tag", "--title", f"Cinematic UI {args.tag}",
           "--notes-file", str(folder / "release-notes.md"))
        existing = wait_for_release(args.tag)

    if existing["draft"]:
        gh("release", "upload", args.tag, "--repo", REPOSITORY, str(folder / zip_name), str(folder / "release-entry.json"),
           str(folder / "manifest.json"), "--clobber")
        verified = folder / "downloaded"
        verified.mkdir(exist_ok=True)
        gh("release", "download", args.tag, "--repo", REPOSITORY, "--pattern", zip_name, "--dir", str(verified), "--clobber")
        verify_zip(verified / zip_name, version)
        # The manifest pointer advances only after the binary becomes publicly downloadable.
        gh("release", "edit", args.tag, "--repo", REPOSITORY, "--draft=false")
    verify_remote(manifest)

    # Re-read the branch before writing; refuse a concurrent external change instead of dropping history.
    latest = api(f"git/ref/heads/{BRANCH}", missing_ok=True)
    require((latest["object"]["sha"] if latest else None) == parent, "Manifest branch changed during publication; rerun this workflow")
    if previous != manifest:
        tree_payload = {"tree": [{"path": "manifest.json", "mode": "100644", "type": "blob",
                                 "content": (folder / "manifest.json").read_text(encoding="utf-8")}]}
        if parent:
            commit = api(f"git/commits/{parent}")
            tree_payload["base_tree"] = commit["tree"]["sha"]
        tree = api("git/trees", "POST", tree_payload)
        commit = api("git/commits", "POST", {"message": f"Publish Cinematic UI {version['version']} catalog metadata",
                                             "tree": tree["sha"], "parents": [parent] if parent else []})
        if parent:
            api(f"git/refs/heads/{BRANCH}", "PATCH", {"sha": commit["sha"], "force": False})
        else:
            api("git/refs", "POST", {"ref": f"refs/heads/{BRANCH}", "sha": commit["sha"]})
        published_sha = commit["sha"]
    else:
        published_sha = parent

    for attempt in range(12):
        try:
            # Bypass a cached first-publication 404, while testing the same unauthenticated endpoint.
            request = urllib.request.Request(f"{MANIFEST_URL}?revision={published_sha}", headers={"Cache-Control": "no-cache"})
            with urllib.request.urlopen(request, timeout=30) as response:
                public = json.load(response)
            require(public == manifest, "Public repository manifest has not refreshed yet")
            print(f"Published {args.tag}; repository manifest and all package URLs verified publicly.")
            print(MANIFEST_URL)
            return
        except (OSError, ValueError):
            if attempt == 11:
                raise
            time.sleep(10)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, RuntimeError) as error:
        sys.exit(str(error))
