using System.Text.Json;
using System.Xml.Serialization;
using Jellyfin.Plugin.CinematicUI;
using Jellyfin.Plugin.CinematicUI.Configuration;
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
var serializer = new XmlSerializer(typeof(PluginConfiguration));
using var legacyXml = new StringReader("<PluginConfiguration><ServerTitle>Retained title</ServerTitle><HeroRotationSeconds>23</HeroRotationSeconds></PluginConfiguration>");
var restored = (PluginConfiguration)serializer.Deserialize(legacyXml)!;
Require(restored.EnableLibraryLayout && restored.ServerTitle == "Retained title" && restored.HeroRotationSeconds == 23, "Legacy settings must retain values and default the new library appearance flag");
var embeddedType = assembly.GetType("Jellyfin.Plugin.CinematicUI.EmbeddedAssets")!;
using var configJson = JsonDocument.Parse((string)embeddedType.GetProperty("ConfigJson")!.GetValue(null)!);
Require(configJson.RootElement.GetProperty("enableLibraryLayout").GetBoolean(), "Library appearance flag is missing from injected configuration");
Require(restored.EnablePlayerLayout, "Legacy XML must default the player appearance flag on");
Require(configJson.RootElement.GetProperty("enablePlayerLayout").GetBoolean(), "Player appearance flag is missing from injected configuration");
Require(restored.EnableDetailsLayout, "Legacy XML must default the details appearance flag on");
Require(configJson.RootElement.GetProperty("enableDetailsLayout").GetBoolean(), "Details appearance flag is missing from injected configuration");
Require(restored.EnableProfileLayout, "Legacy XML must default the profile appearance flag on");
Require(configJson.RootElement.GetProperty("enableProfileLayout").GetBoolean(), "Profile appearance flag is missing from injected configuration");
foreach (var asset in new[] { "Web/cinematic.css", "Web/client.js", "Configuration/configPage.html" })
{
    var name = "Jellyfin.Plugin.CinematicUI." + asset.Replace('/', '.');
    using var resource = assembly.GetManifestResourceStream(name);
    Require(resource is not null, $"Missing embedded resource {name}");
    using var bytes = new MemoryStream();
    resource!.CopyTo(bytes);
    Require(bytes.ToArray().SequenceEqual(File.ReadAllBytes(Path.Combine(root, asset))), $"Embedded {asset} differs from source");
}
Console.WriteLine($"Verified assembly identity, version {metadata.Version}, update metadata, and all embedded resources.");
