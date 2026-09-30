namespace Jellyfin.Plugin.MediaPreview;

internal static class PluginConfigurationNormalizer
{
    private static readonly HashSet<string> ValidFrontendInjectionMethods = new(StringComparer.Ordinal)
    {
        FrontendInjectionMethods.Automatic,
        FrontendInjectionMethods.FileTransformation,
        FrontendInjectionMethods.JavaScriptInjector,
        FrontendInjectionMethods.Direct
    };

    private static readonly HashSet<string> ValidPreviewSources = new(StringComparer.Ordinal)
    {
        "trickplay",
        "direct-play",
        "trailer",
        "prefer-trickplay",
        "prefer-trailer",
        "prefer-direct-play"
    };

    private static readonly HashSet<string> ValidContentTypePreviewSources = new(StringComparer.Ordinal)
    {
        "inherit",
        "trickplay",
        "direct-play",
        "trailer",
        "prefer-trickplay",
        "prefer-trailer",
        "prefer-direct-play"
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

    private static readonly HashSet<string> ValidPortraitCardExpansionModes = new(StringComparer.Ordinal)
    {
        "off",
        "3:2",
        "16:9",
        "source"
    };

    private static readonly HashSet<string> ValidPortraitCardExpansionLayoutModes = new(StringComparer.Ordinal)
    {
        "all",
        "horizontal-only",
        "compress"
    };

    private static readonly HashSet<string> ValidPortraitCardCompressionModes = new(StringComparer.Ordinal)
    {
        "distance",
        "neighbors"
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

    private static readonly HashSet<string> ValidPreviewTransitionModes = new(StringComparer.Ordinal)
    {
        "off",
        "fade",
        "crossfade"
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

    private static readonly HashSet<string> ValidMediaControlSources = new(StringComparer.Ordinal)
    {
        "local-trailer",
        "remote-trailer",
        "direct-play"
    };

    public static PluginConfiguration Normalize(PluginConfiguration? configuration)
    {
        PluginConfiguration source = configuration ?? new PluginConfiguration();
        PluginConfiguration normalized = new PluginConfiguration
        {
            Enabled = source.Enabled,
            FrontendInjectionMethod = NormalizeChoice(
                source.FrontendInjectionMethod,
                ValidFrontendInjectionMethods,
                FrontendInjectionMethods.Automatic),
            PreviewSource = NormalizeChoice(source.PreviewSource, ValidPreviewSources, "trickplay"),
            MoviePreviewSource = NormalizeChoice(source.MoviePreviewSource, ValidContentTypePreviewSources, "inherit"),
            SeriesPreviewSource = NormalizeChoice(source.SeriesPreviewSource, ValidContentTypePreviewSources, "inherit"),
            EpisodePreviewSource = NormalizeChoice(source.EpisodePreviewSource, ValidContentTypePreviewSources, "inherit"),
            VideoPreviewSource = NormalizeChoice(source.VideoPreviewSource, ValidContentTypePreviewSources, "inherit"),
            LibraryPreviewSourceOverrides = NormalizeLibraryPreviewSourceOverrides(source.LibraryPreviewSourceOverrides),
            PreferTrailerFallbacks = NormalizeFallbackSources(
                source.PreferTrailerFallbacks,
                "local-trailer",
                true,
                ("remote-trailer", true),
                ("direct-play", true),
                ("trickplay", true)),
            PreferTrickplayFallbacks = NormalizeFallbackSources(
                source.PreferTrickplayFallbacks,
                "trickplay",
                false,
                ("local-trailer", true),
                ("remote-trailer", true),
                ("direct-play", true)),
            PreferDirectPlayFallbacks = NormalizeFallbackSources(
                source.PreferDirectPlayFallbacks,
                "direct-play",
                false,
                ("trickplay", true),
                ("local-trailer", true),
                ("remote-trailer", true)),
            MetadataOverlayEnabled = source.MetadataOverlayEnabled,
            MetadataOverlayPosition = NormalizeChoice(source.MetadataOverlayPosition, ValidTrailerExpandButtonPositions, "bottom-left"),
            MetadataOverlayShowTitle = source.MetadataOverlayShowTitle,
            MetadataOverlayShowYear = source.MetadataOverlayShowYear,
            MetadataOverlayShowRuntime = source.MetadataOverlayShowRuntime,
            MetadataOverlayShowOfficialRating = source.MetadataOverlayShowOfficialRating,
            MetadataOverlayShowCommunityRating = source.MetadataOverlayShowCommunityRating,
            ShowNoPreviewMessage = source.ShowNoPreviewMessage,
            TrailerAudioEnabled = source.TrailerAudioEnabled,
            TrailerVolumePercent = Clamp(source.TrailerVolumePercent, 0, 100, 35),
            VideoControlSources = NormalizeMediaControlSources(source.VideoControlSources),
            AudioControlSources = NormalizeMediaControlSources(source.AudioControlSources),
            DirectPlayPreviewEnabled = source.DirectPlayPreviewEnabled,
            DirectPlayStartPercent = Clamp(source.DirectPlayStartPercent, 0, 90, 20),
            DirectPlayPlaybackRate = Clamp(source.DirectPlayPlaybackRate, 0.5, 2, 1.5),
            DirectPlayPreviewDurationSeconds = Clamp(source.DirectPlayPreviewDurationSeconds, 0, 300, 15),
            DirectPlayTranscodeFallbackEnabled = source.DirectPlayTranscodeFallbackEnabled,
            DirectPlayTranscodeMaxHeight = Clamp(source.DirectPlayTranscodeMaxHeight, 240, 2160, 480),
            DirectPlayTranscodeVideoBitrateKbps = Clamp(source.DirectPlayTranscodeVideoBitrateKbps, 250, 20000, 1500),
            UnavailableTrailerCacheEnabled = source.UnavailableTrailerCacheEnabled,
            UnavailableTrailerRetryDays = Clamp(source.UnavailableTrailerRetryDays, 1, 365, 30),
            HoverDelayMs = Math.Max(0, source.HoverDelayMs),
            HoverIntentEnabled = source.HoverIntentEnabled,
            HoverIntentThresholdPx = Math.Max(0, source.HoverIntentThresholdPx),
            HoverCooldownMs = Math.Max(0, source.HoverCooldownMs),
            KeyboardPreviewEnabled = source.KeyboardPreviewEnabled,
            KeyboardPreviewDelayMs = Math.Max(0, source.KeyboardPreviewDelayMs),
            KeyboardPreviewStartPercent = Clamp(source.KeyboardPreviewStartPercent, 0, 100, 50),
            KeyboardArrowScrubEnabled = source.KeyboardArrowScrubEnabled,
            KeyboardArrowStepPercent = Clamp(source.KeyboardArrowStepPercent, 1, 100, 8),
            KeyboardEscapeClosesPreview = source.KeyboardEscapeClosesPreview,
            HoverCountdownEnabled = source.HoverCountdownEnabled,
            HoverCountdownPosition = NormalizeChoice(source.HoverCountdownPosition, ValidTrailerExpandButtonPositions, "top-right"),
            TrickplayWidth = Math.Max(1, source.TrickplayWidth),
            TrickplayPreloadEnabled = source.TrickplayPreloadEnabled,
            TrickplayPreloadLimit = source.TrickplayPreloadLimit,
            TrickplayLoadingIndicatorEnabled = source.TrickplayLoadingIndicatorEnabled,
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
            PortraitCardExpansionMode = NormalizeChoice(source.PortraitCardExpansionMode, ValidPortraitCardExpansionModes, "off"),
            PortraitCardExpansionLayoutMode = NormalizeChoice(source.PortraitCardExpansionLayoutMode, ValidPortraitCardExpansionLayoutModes, "horizontal-only"),
            PortraitCardCompressionMode = NormalizeChoice(source.PortraitCardCompressionMode, ValidPortraitCardCompressionModes, "distance"),
            PortraitCardRowLockEnabled = source.PortraitCardRowLockEnabled,
            BackdropCardPreviewMode = NormalizeChoice(source.BackdropCardPreviewMode, ValidPreviewModes, "cover"),
            PreviewBackdropMode = NormalizeChoice(source.PreviewBackdropMode, ValidPreviewBackdropModes, "dim-blur"),
            PreviewBackdropIntensityPercent = Clamp(source.PreviewBackdropIntensityPercent, 0, 100, 35),
            PreviewTransitionMode = NormalizeChoice(source.PreviewTransitionMode, ValidPreviewTransitionModes, "fade"),
            PreviewTransitionDurationMs = Math.Max(0, source.PreviewTransitionDurationMs),
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

    private static double Clamp(double value, double min, double max, double fallback)
    {
        return double.IsFinite(value) && value >= min && value <= max ? value : fallback;
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

    private static string[] NormalizeMediaControlSources(IEnumerable<string>? sources)
    {
        return [.. (sources ?? [])
            .Where(source => !string.IsNullOrWhiteSpace(source) && ValidMediaControlSources.Contains(source))
            .Distinct(StringComparer.Ordinal)];
    }

    private static List<LibraryPreviewSourceOverride> NormalizeLibraryPreviewSourceOverrides(
        IEnumerable<LibraryPreviewSourceOverride>? overrides)
    {
        Dictionary<string, LibraryPreviewSourceOverride> normalized = new(StringComparer.Ordinal);

        foreach (LibraryPreviewSourceOverride? entry in overrides ?? [])
        {
            if (entry is null || string.IsNullOrWhiteSpace(entry.LibraryId))
            {
                continue;
            }

            string libraryId = entry.LibraryId.Trim();
            string previewSource = NormalizeChoice(entry.PreviewSource, ValidContentTypePreviewSources, "inherit");

            normalized[libraryId] = new LibraryPreviewSourceOverride
            {
                LibraryId = libraryId,
                PreviewSource = previewSource
            };
        }

        return [.. normalized.Values];
    }

    private static List<PreviewFallbackSource> NormalizeFallbackSources(
        IEnumerable<PreviewFallbackSource>? sources,
        string primarySource,
        bool includePrimary,
        params (string Source, bool Enabled)[] defaults)
    {
        HashSet<string> allowedSources = new(StringComparer.Ordinal)
        {
            "trickplay",
            "local-trailer",
            "remote-trailer",
            "direct-play"
        };
        if (!includePrimary)
        {
            allowedSources.Remove(primarySource);
        }
        HashSet<string> seen = new(StringComparer.Ordinal);
        List<PreviewFallbackSource> normalized = [];

        foreach (PreviewFallbackSource? entry in sources ?? [])
        {
            string source = entry?.Source?.Trim() ?? string.Empty;
            if (source == "trailer")
            {
                foreach (string trailerSource in new[] { "local-trailer", "remote-trailer" })
                {
                    if (allowedSources.Contains(trailerSource) && seen.Add(trailerSource))
                    {
                        normalized.Add(new PreviewFallbackSource { Source = trailerSource, Enabled = entry!.Enabled });
                    }
                }

                continue;
            }
            if (!allowedSources.Contains(source) || !seen.Add(source))
            {
                continue;
            }

            normalized.Add(new PreviewFallbackSource { Source = source, Enabled = entry!.Enabled });
        }

        if (includePrimary && seen.Add(primarySource))
        {
            normalized.Insert(0, new PreviewFallbackSource { Source = primarySource, Enabled = true });
        }

        foreach ((string source, bool enabled) in defaults)
        {
            if (seen.Add(source))
            {
                normalized.Add(new PreviewFallbackSource { Source = source, Enabled = enabled });
            }
        }

        return normalized;
    }
}
