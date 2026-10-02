using System.Reflection;
using System.Text;
using System.Text.Json;

namespace Jellyfin.Plugin.CinematicUI;

internal static class EmbeddedAssets
{
    private static string Read(string suffix)
    {
        var assembly = typeof(Plugin).Assembly;
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith(suffix, StringComparison.OrdinalIgnoreCase));

        if (resourceName is null)
        {
            return string.Empty;
        }

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return string.Empty;
        }

        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    public static string Css => Read("Web.cinematic.css");
    public static string ClientJs => Read("Web.client.js");

    public static string ConfigJson
    {
        get
        {
            var cfg = Plugin.Instance?.Configuration;
            var safe = new
            {
                enableGlobalTheme = cfg?.EnableGlobalTheme ?? true,
                enableLoginExperience = cfg?.EnableLoginExperience ?? true,
                enableHomeHero = cfg?.EnableHomeHero ?? true,
                hideMyMediaRow = cfg?.HideMyMediaRow ?? true,
                hideOtherVideosHomeRows = cfg?.HideOtherVideosHomeRows ?? true,
                hiddenNavigationLibraryNames = cfg?.HiddenNavigationLibraryNames ?? string.Empty,
                serverTitle = cfg?.ServerTitle ?? "JELLYFIN",
                accentColor = cfg?.AccentColor ?? "#e5a00d",
                heroRotationSeconds = Math.Clamp(cfg?.HeroRotationSeconds ?? 12, 5, 120),
                heroCandidateLimit = Math.Clamp(cfg?.HeroCandidateLimit ?? 36, 10, 100),
                heroMaxItems = Math.Clamp(cfg?.HeroMaxItems ?? 12, 3, 30),
                heroUseLogos = cfg?.HeroUseLogos ?? true,
                heroPauseOnHover = cfg?.HeroPauseOnHover ?? true,
                heroShowNavigationArrows = cfg?.HeroShowNavigationArrows ?? true,
                heroShowDots = cfg?.HeroShowDots ?? true,
                heroOverviewLines = Math.Clamp(cfg?.HeroOverviewLines ?? 3, 1, 5),
                heroAvoidRepeatCount = Math.Clamp(cfg?.HeroAvoidRepeatCount ?? 6, 0, 30),
                heroArtworkZoomPercent = Math.Clamp(cfg?.HeroArtworkZoomPercent ?? 8, 0, 20),
                heroLibraryNames = cfg?.HeroLibraryNames ?? "Anime,Movies,TV Shows",
                heroExcludedTitleKeywords = cfg?.HeroExcludedTitleKeywords ?? string.Empty,
                heroExcludePlayed = cfg?.HeroExcludePlayed ?? false,
                loginBackgroundMotion = cfg?.LoginBackgroundMotion ?? true,
                loginBackgroundMotionSeconds = Math.Clamp(cfg?.LoginBackgroundMotionSeconds ?? 65, 15, 300),
                loginBackgroundBlurPx = Math.Clamp(cfg?.LoginBackgroundBlurPx ?? 3, 0, 12),
                loginOverlayDarknessPercent = Math.Clamp(cfg?.LoginOverlayDarknessPercent ?? 48, 0, 85),
                loginHideHeaderBranding = cfg?.LoginHideHeaderBranding ?? true
            };

            return JsonSerializer.Serialize(safe);
        }
    }
}
