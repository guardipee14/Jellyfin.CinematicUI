using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.CinematicUI.Configuration;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool EnableInjection { get; set; } = true;
    public bool EnableGlobalTheme { get; set; } = true;
    public bool EnableLoginExperience { get; set; } = true;
    public bool EnableHomeHero { get; set; } = true;

    public string ServerTitle { get; set; } = "DONAVEN'S JELLYFIN";
    public string AccentColor { get; set; } = "#e5a00d";

    public bool LoginBackgroundMotion { get; set; } = true;
    public int LoginBackgroundMotionSeconds { get; set; } = 65;
    public int LoginBackgroundBlurPx { get; set; } = 3;
    public int LoginOverlayDarknessPercent { get; set; } = 48;
    public bool LoginHideHeaderBranding { get; set; } = true;

    public int HeroRotationSeconds { get; set; } = 12;
    public int HeroCandidateLimit { get; set; } = 36;
    public int HeroMaxItems { get; set; } = 12;
    public bool HeroUseLogos { get; set; } = true;
    public bool HeroPauseOnHover { get; set; } = true;
    public bool HeroShowNavigationArrows { get; set; } = true;
    public bool HeroShowDots { get; set; } = true;
    public int HeroOverviewLines { get; set; } = 3;
    public int HeroAvoidRepeatCount { get; set; } = 6;
    public int HeroArtworkZoomPercent { get; set; } = 8;
    public string HeroLibraryNames { get; set; } = "Anime,Movies,TV Shows";
    public string HeroExcludedTitleKeywords { get; set; } = string.Empty;
    public bool HeroExcludePlayed { get; set; } = false;

    public bool HideMyMediaRow { get; set; } = true;
    public bool HideOtherVideosHomeRows { get; set; } = true;

    // Cosmetic-only navigation hiding. A blank value means do not hide any library.
    public string HiddenNavigationLibraryNames { get; set; } = string.Empty;

    // Kept for configuration compatibility with v0.1.4 and earlier. v0.1.5 no longer
    // uses this flag to hide a library because access control belongs in Jellyfin Users.
    public bool HideOtherVideosNavigation { get; set; } = false;
}
