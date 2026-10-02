using System.Text.Json;
using Jellyfin.Plugin.CinematicUI;
using MediaBrowser.Common.Plugins;

var root = Path.GetFullPath(args.Length > 0 ? args[0] : ".");
var assembly = typeof(Plugin).Assembly;
var metadata = JsonSerializer.Deserialize<PluginManifest>(File.ReadAllText(Path.Combine(root, "meta.json")))!;
void Require(bool condition, string message)
{
    if (!condition) throw new InvalidDataException(message);
}
Require(assembly.GetName().Name == "Jellyfin.Plugin.CinematicUI", "Assembly name must remain stable for configuration persistence");
Require(assembly.GetName().Version!.ToString() == metadata.Version, "Built assembly version differs from meta.json");
Require(Plugin.PluginId == metadata.Id, "Built GUID differs from metadata");
Require(metadata.AutoUpdate, "Automatic updates are disabled");
foreach (var asset in new[] { "Web/cinematic.css", "Web/client.js", "Configuration/configPage.html" })
{
    var name = "Jellyfin.Plugin.CinematicUI." + asset.Replace('/', '.');
    using var resource = assembly.GetManifestResourceStream(name);
    Require(resource is not null, $"Missing embedded resource {name}");
    using var bytes = new MemoryStream();
    resource!.CopyTo(bytes);
    Require(bytes.ToArray().SequenceEqual(File.ReadAllBytes(Path.Combine(root, asset))), $"Embedded {asset} differs from recovered source");
}
Console.WriteLine($"Verified assembly identity, version {metadata.Version}, update metadata, and all embedded resources.");
