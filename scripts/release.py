"""Build and validate Jellyfin release artifacts using only the Python standard library."""
import argparse
import copy
import hashlib
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path

GUID = "e4c17f1b-c451-4a31-b98c-5d0ef44f9a21"
ASSEMBLY = "Jellyfin.Plugin.CinematicUI.dll"
REPOSITORY = "guardipee14/Jellyfin.CinematicUI"
FIELDS = ("guid", "name", "description", "overview", "owner", "category")
VERSION_FIELDS = ("version", "changelog", "targetAbi", "sourceUrl", "checksum", "timestamp")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def version_tuple(value):
    require(isinstance(value, str) and re.fullmatch(r"(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)", value),
            f"Expected four-part numeric version, got {value!r}")
    result = tuple(map(int, value.split(".")))
    require(all(x <= 2_147_483_647 for x in result), "Version component is too large for Jellyfin")
    return result


def tag_version(tag):
    require(re.fullmatch(r"v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)", tag) is not None,
            "Release tags must have the form vMAJOR.MINOR.PATCH; prereleases are not catalog releases")
    return tag[1:] + ".0"


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write_json(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def validate_meta(meta):
    require(isinstance(meta, dict), "meta.json must be an object")
    require(meta.get("guid") == GUID and meta.get("name") == "Cinematic UI", "Plugin identity changed")
    for field in (*FIELDS, "changelog", "targetAbi", "timestamp", "version"):
        require(isinstance(meta.get(field), str) and bool(meta[field].strip()), f"Missing metadata field: {field}")
    version_tuple(meta["version"])
    version_tuple(meta["targetAbi"])
    parsed = datetime.fromisoformat(meta["timestamp"].replace("Z", "+00:00"))
    require(parsed.tzinfo is not None, "Timestamp must include a timezone")
    require(meta.get("autoUpdate", True) is True, "Packaged plugin must support normal Jellyfin updates")


def source_metadata(root, tag=None):
    root = Path(root)
    meta = read_json(root / "meta.json")
    validate_meta(meta)
    project = ET.parse(root / "Jellyfin.Plugin.CinematicUI.csproj").getroot()
    for field in ("Version", "AssemblyVersion", "FileVersion"):
        require(project.findtext(f".//{field}") == meta["version"], f"{field} differs from meta.json")
    require(project.findtext(".//AssemblyName") == ASSEMBLY[:-4], "Assembly name changed; configuration would be renamed")
    require(project.findtext(".//TargetFramework") == "net10.0", "Expected net10.0")
    references = {x.attrib["Include"]: x.attrib["Version"] for x in project.findall(".//PackageReference")}
    for package in ("Jellyfin.Model", "Jellyfin.Controller"):
        require(references.get(package, "") + ".0" == meta["targetAbi"], f"{package} and targetAbi differ")
    require(GUID in (root / "Plugin.cs").read_text(encoding="utf-8"), "Plugin.cs GUID differs from metadata")
    for resource in ("Web/cinematic.css", "Web/client.js", "Configuration/configPage.html"):
        require((root / resource).is_file() and (root / resource).stat().st_size > 100, f"Missing or empty embedded asset: {resource}")
    if tag is not None:
        require(tag_version(tag) == meta["version"], "Release tag, assembly version, and meta.json must match")
    return meta


def md5_bytes(data):
    # Jellyfin's installer contract requires MD5. This is integrity metadata, not authentication.
    return hashlib.md5(data, usedforsecurity=False).hexdigest()


def validate_manifest(manifest, allow_empty=False):
    require(isinstance(manifest, list) and len(manifest) == 1, "Manifest must contain exactly one package")
    package = manifest[0]
    require(isinstance(package, dict), "Manifest package must be an object")
    require(package.get("guid") == GUID and package.get("name") == "Cinematic UI", "Manifest identity changed")
    for field in FIELDS:
        require(isinstance(package.get(field), str) and bool(package[field].strip()), f"Missing package field: {field}")
    versions = package.get("versions")
    require(isinstance(versions, list) and (allow_empty or bool(versions)), "Manifest has no versions")
    seen = set()
    ordered = []
    for item in versions:
        require(isinstance(item, dict), "Version entry must be an object")
        for field in VERSION_FIELDS:
            require(isinstance(item.get(field), str) and bool(item[field].strip()), f"Missing version field: {field}")
        version = version_tuple(item["version"])
        require(version not in seen, "Duplicate manifest version")
        seen.add(version)
        ordered.append(version)
        version_tuple(item["targetAbi"])
        require(re.fullmatch(r"[a-fA-F0-9]{32}", item["checksum"]) is not None, "Invalid Jellyfin MD5 checksum")
        require(item["sourceUrl"].startswith("https://") and item["sourceUrl"].endswith(".zip"), "Package URL must be an HTTPS ZIP")
        require(datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00")).tzinfo is not None, "Timestamp requires timezone")
    require(ordered == sorted(ordered, reverse=True), "Versions must be sorted newest first")
    return manifest


def merge_manifest(previous, entry):
    validate_manifest(entry)
    if previous is None:
        return copy.deepcopy(entry)
    validate_manifest(previous)
    result = copy.deepcopy(entry)
    existing = {v["version"]: copy.deepcopy(v) for v in previous[0]["versions"]}
    incoming = entry[0]["versions"][0]
    if incoming["version"] in existing:
        require(existing[incoming["version"]] == incoming, "Published version is immutable; increment the version instead of replacing it")
    existing[incoming["version"]] = copy.deepcopy(incoming)
    result[0]["versions"] = sorted(existing.values(), key=lambda v: version_tuple(v["version"]), reverse=True)
    return validate_manifest(result)


def package(root, tag, output):
    root, output = Path(root), Path(output)
    meta = source_metadata(root, tag)
    binary = root / "bin/Release/net10.0" / ASSEMBLY
    require(binary.is_file(), "Build Release before packaging")
    output.mkdir(parents=True, exist_ok=True)
    zip_name = f"CinematicUI-{tag}-jf{'.'.join(meta['targetAbi'].split('.')[:2])}.zip"
    zip_path = output / zip_name
    timestamp = datetime.fromisoformat(meta["timestamp"].replace("Z", "+00:00")).astimezone(timezone.utc)
    # A fixed source timestamp, fixed file order, and fixed permissions make retries identical.
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        files = {ASSEMBLY: binary.read_bytes(), "meta.json": (json.dumps(meta, indent=2, ensure_ascii=False) + "\n").encode()}
        for name, data in files.items():
            info = zipfile.ZipInfo(name, timestamp.timetuple()[:6])
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compresslevel=9)
    entry = [{field: meta[field] for field in FIELDS}]
    entry[0]["versions"] = [{field: meta[field] for field in ("version", "changelog", "targetAbi", "timestamp")}]
    entry[0]["versions"][0].update(sourceUrl=f"https://github.com/{REPOSITORY}/releases/download/{tag}/{zip_name}", checksum=md5_bytes(zip_path.read_bytes()))
    validate_manifest(entry)
    write_json(output / "release-entry.json", entry)
    verify_zip(zip_path, entry[0]["versions"][0])
    return zip_path


def verify_zip(path, version):
    data = Path(path).read_bytes()
    require(md5_bytes(data) == version["checksum"].lower(), "ZIP checksum differs from manifest")
    with zipfile.ZipFile(path) as archive:
        require(sorted(archive.namelist()) == sorted([ASSEMBLY, "meta.json"]), "ZIP must contain only the plugin DLL and meta.json at its root")
        require(archive.testzip() is None, "Corrupt ZIP")
        require(len(archive.read(ASSEMBLY)) > 1000 and archive.read(ASSEMBLY)[:2] == b"MZ", "Invalid plugin DLL")
        meta = json.loads(archive.read("meta.json"))
        validate_meta(meta)
        for field in ("version", "targetAbi", "changelog", "timestamp"):
            require(meta[field] == version[field], f"Packaged {field} differs from manifest")


def verify_remote(manifest):
    validate_manifest(manifest)
    for version in manifest[0]["versions"]:
        with urllib.request.urlopen(version["sourceUrl"], timeout=120) as response:
            data = response.read()
        require(md5_bytes(data) == version["checksum"].lower(), f"Released checksum mismatch: {version['version']}")
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "plugin.zip"
            path.write_bytes(data)
            verify_zip(path, version)
        print(f"Verified public package {version['version']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    source = sub.add_parser("check-source")
    source.add_argument("--root", default=".")
    source.add_argument("--tag")
    build = sub.add_parser("package")
    build.add_argument("--root", default=".")
    build.add_argument("--tag", required=True)
    build.add_argument("--output", default="artifacts")
    merge = sub.add_parser("merge")
    merge.add_argument("--previous")
    merge.add_argument("--entry", required=True)
    merge.add_argument("--output", required=True)
    verify = sub.add_parser("verify")
    verify.add_argument("--manifest", required=True)
    verify.add_argument("--remote", action="store_true")
    args = parser.parse_args()
    if args.command == "check-source":
        print(source_metadata(args.root, args.tag)["version"])
    elif args.command == "package":
        print(package(args.root, args.tag, args.output))
    elif args.command == "merge":
        previous = read_json(args.previous) if args.previous else None
        write_json(args.output, merge_manifest(previous, read_json(args.entry)))
    else:
        manifest = validate_manifest(read_json(args.manifest))
        if args.remote:
            verify_remote(manifest)
        print("Manifest validated")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError) as error:
        sys.exit(str(error))
