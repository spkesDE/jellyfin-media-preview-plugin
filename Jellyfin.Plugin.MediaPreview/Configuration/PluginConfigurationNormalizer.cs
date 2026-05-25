namespace Jellyfin.Plugin.MediaPreview;

internal static class PluginConfigurationNormalizer
{
    private static readonly HashSet<string> ValidPreviewSources = new(StringComparer.Ordinal)
    {
        "trickplay",
        "trailer",
        "prefer-trickplay",
        "prefer-trailer",
        "smart"
    };

    private static readonly HashSet<string> ValidContentTypePreviewSources = new(StringComparer.Ordinal)
    {
        "inherit",
        "trickplay",
        "trailer",
        "prefer-trickplay",
        "prefer-trailer",
        "smart"
    };

    private static readonly HashSet<string> ValidSmartPrimarySources = new(StringComparer.Ordinal)
    {
        "trickplay",
        "trailer"
    };

    private static readonly HashSet<string> ValidSmartTrailerScopes = new(StringComparer.Ordinal)
    {
        "local-only",
        "local-and-remote"
    };

    private static readonly HashSet<string> ValidHoverModes = new(StringComparer.Ordinal)
    {
        "scrub",
        "auto"
    };

    private static readonly HashSet<string> ValidAutoScrubModes = new(StringComparer.Ordinal)
    {
        "step",
        "sweep",
        "ping-pong"
    };

    private static readonly HashSet<string> ValidAutoScrubPresets = new(StringComparer.Ordinal)
    {
        "custom",
        "snappy",
        "balanced",
        "cinematic"
    };

    private static readonly HashSet<string> ValidPreviewModes = new(StringComparer.Ordinal)
    {
        "cover",
        "contain",
        "stretch"
    };

    private static readonly HashSet<string> ValidPreviewBackdropModes = new(StringComparer.Ordinal)
    {
        "off",
        "dim",
        "vignette",
        "dim-vignette",
        "blur",
        "dim-blur"
    };

    private static readonly HashSet<string> ValidYouTubeCropStrengths = new(StringComparer.Ordinal)
    {
        "off",
        "light",
        "medium",
        "strong"
    };

    private static readonly HashSet<string> ValidTrailerExpandButtonPositions = new(StringComparer.Ordinal)
    {
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right"
    };

    public static PluginConfiguration Normalize(PluginConfiguration? configuration)
    {
        PluginConfiguration source = configuration ?? new PluginConfiguration();
        PluginConfiguration normalized = new PluginConfiguration
        {
            Enabled = source.Enabled,
            PreviewSource = NormalizeChoice(source.PreviewSource, ValidPreviewSources, "trickplay"),
            MoviePreviewSource = NormalizeChoice(source.MoviePreviewSource, ValidContentTypePreviewSources, "inherit"),
            SeriesPreviewSource = NormalizeChoice(source.SeriesPreviewSource, ValidContentTypePreviewSources, "inherit"),
            EpisodePreviewSource = NormalizeChoice(source.EpisodePreviewSource, ValidContentTypePreviewSources, "inherit"),
            VideoPreviewSource = NormalizeChoice(source.VideoPreviewSource, ValidContentTypePreviewSources, "inherit"),
            SmartMoviePrimarySource = NormalizeChoice(source.SmartMoviePrimarySource, ValidSmartPrimarySources, "trailer"),
            SmartSeriesPrimarySource = NormalizeChoice(source.SmartSeriesPrimarySource, ValidSmartPrimarySources, "trickplay"),
            SmartEpisodePrimarySource = NormalizeChoice(source.SmartEpisodePrimarySource, ValidSmartPrimarySources, "trickplay"),
            SmartVideoPrimarySource = NormalizeChoice(source.SmartVideoPrimarySource, ValidSmartPrimarySources, "trickplay"),
            SmartTrailerScope = NormalizeChoice(source.SmartTrailerScope, ValidSmartTrailerScopes, "local-and-remote"),
            ShowNoPreviewMessage = source.ShowNoPreviewMessage,
            TrailerAudioEnabled = source.TrailerAudioEnabled,
            TrailerVolumePercent = Clamp(source.TrailerVolumePercent, 0, 100, 35),
            HoverDelayMs = Math.Max(0, source.HoverDelayMs),
            HoverIntentEnabled = source.HoverIntentEnabled,
            HoverIntentThresholdPx = Math.Max(0, source.HoverIntentThresholdPx),
            HoverCooldownMs = Math.Max(0, source.HoverCooldownMs),
            HoverCountdownEnabled = source.HoverCountdownEnabled,
            HoverCountdownPosition = NormalizeChoice(source.HoverCountdownPosition, ValidTrailerExpandButtonPositions, "top-right"),
            TrickplayWidth = Math.Max(1, source.TrickplayWidth),
            RestoreOnLeave = source.RestoreOnLeave,
            ShowProgressIndicator = source.ShowProgressIndicator,
            Debug = source.Debug,
            HoverMode = NormalizeChoice(source.HoverMode, ValidHoverModes, "scrub"),
            AutoScrubMode = NormalizeAutoScrubMode(source.AutoScrubMode),
            AutoScrubPreset = NormalizeChoice(source.AutoScrubPreset, ValidAutoScrubPresets, "balanced"),
            AutoScrubStartPercent = Clamp(source.AutoScrubStartPercent, 0, 100, 0),
            AutoScrubIntervalMs = Math.Max(50, source.AutoScrubIntervalMs),
            AutoScrubDurationMs = Math.Max(500, source.AutoScrubDurationMs),
            AutoScrubMinDelayMs = Clamp(source.AutoScrubMinDelayMs, 16, 60000, 40),
            AutoScrubMaxDelayMs = Clamp(source.AutoScrubMaxDelayMs, 16, 60000, 1000),
            PortraitCardPreviewMode = NormalizeChoice(source.PortraitCardPreviewMode, ValidPreviewModes, "contain"),
            BackdropCardPreviewMode = NormalizeChoice(source.BackdropCardPreviewMode, ValidPreviewModes, "cover"),
            PreviewBackdropMode = NormalizeChoice(source.PreviewBackdropMode, ValidPreviewBackdropModes, "dim-blur"),
            PreviewBackdropIntensityPercent = Clamp(source.PreviewBackdropIntensityPercent, 0, 100, 35),
            YouTubeCropStrength = NormalizeChoice(source.YouTubeCropStrength, ValidYouTubeCropStrengths, "medium"),
            TrailerExpandButtonEnabled = source.TrailerExpandButtonEnabled,
            TrailerExpandButtonPosition = NormalizeChoice(source.TrailerExpandButtonPosition, ValidTrailerExpandButtonPositions, "top-right")
        };

        if (normalized.AutoScrubMaxDelayMs < normalized.AutoScrubMinDelayMs)
        {
            normalized.AutoScrubMaxDelayMs = normalized.AutoScrubMinDelayMs;
        }

        return normalized;
    }

    private static int Clamp(int value, int min, int max, int fallback)
    {
        return value < min || value > max ? fallback : value;
    }

    private static string NormalizeChoice(string? value, HashSet<string> allowedValues, string fallback)
    {
        return !string.IsNullOrWhiteSpace(value) && allowedValues.Contains(value)
            ? value
            : fallback;
    }

    private static string NormalizeAutoScrubMode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "step";
        }

        return value switch
        {
            "smooth" => "sweep",
            "smooth-pingpong" => "ping-pong",
            _ => NormalizeChoice(value, ValidAutoScrubModes, "step")
        };
    }
}
