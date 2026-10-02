using System;
using System.Collections.Generic;
using Jellyfin.Plugin.CinematicUI.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.CinematicUI;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static readonly Guid PluginId = Guid.Parse("e4c17f1b-c451-4a31-b98c-5d0ef44f9a21");

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Cinematic UI";

    public override Guid Id => PluginId;

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "cinematic-ui-config",
            EmbeddedResourcePath = GetType().Namespace + ".Configuration.configPage.html",
            DisplayName = "Cinematic UI",
            MenuIcon = "theaters",
            EnableInMainMenu = true
        };
    }
}
