using Xunit;

namespace Jellyfin.Plugin.MediaPreview.Tests;

public sealed class PluginConfigurationNormalizerTests
{
    [Fact]
    public void DefaultsRemainCanonicalAfterNormalization()
    {
        PluginConfiguration defaults = new PluginConfiguration();
        PluginConfiguration normalized = PluginConfigurationNormalizer.Normalize(defaults);

        Assert.Equal("trickplay", defaults.PreviewSource);
        Assert.Equal("scrub", defaults.HoverMode);
        Assert.Equal("medium", defaults.YouTubeCropStrength);
        Assert.Equal(20, defaults.DirectPlayStartPercent);
        Assert.Equal(1.5, defaults.DirectPlayPlaybackRate);
        Assert.Equal(15, defaults.DirectPlayPreviewDurationSeconds);
        Assert.True(defaults.DirectPlayTranscodeFallbackEnabled);
        Assert.Equal(480, defaults.DirectPlayTranscodeMaxHeight);
        Assert.Equal(1500, defaults.DirectPlayTranscodeVideoBitrateKbps);
        Assert.Equal(defaults.PreviewSource, normalized.PreviewSource);
        Assert.Equal(defaults.HoverMode, normalized.HoverMode);
        Assert.Equal(defaults.YouTubeCropStrength, normalized.YouTubeCropStrength);
    }

    [Fact]
    public void InvalidChoicesUseCanonicalFallbacks()
    {
        PluginConfiguration normalized = PluginConfigurationNormalizer.Normalize(new PluginConfiguration
        {
            PreviewSource = "invalid",
            HoverMode = "invalid",
            YouTubeCropStrength = "invalid",
            DirectPlayStartPercent = 100,
            DirectPlayPlaybackRate = 10,
            DirectPlayPreviewDurationSeconds = -1,
            DirectPlayTranscodeMaxHeight = 100,
            DirectPlayTranscodeVideoBitrateKbps = 100
        });

        Assert.Equal("trickplay", normalized.PreviewSource);
        Assert.Equal("scrub", normalized.HoverMode);
        Assert.Equal("medium", normalized.YouTubeCropStrength);
        Assert.Equal(20, normalized.DirectPlayStartPercent);
        Assert.Equal(1.5, normalized.DirectPlayPlaybackRate);
        Assert.Equal(15, normalized.DirectPlayPreviewDurationSeconds);
        Assert.Equal(480, normalized.DirectPlayTranscodeMaxHeight);
        Assert.Equal(1500, normalized.DirectPlayTranscodeVideoBitrateKbps);
    }

    [Fact]
    public void DirectPlayIsAcceptedAtEveryRuleLevel()
    {
        PluginConfiguration normalized = PluginConfigurationNormalizer.Normalize(new PluginConfiguration
        {
            PreviewSource = "direct-play",
            MoviePreviewSource = "direct-play",
            SeriesPreviewSource = "direct-play",
            EpisodePreviewSource = "direct-play",
            VideoPreviewSource = "direct-play",
            LibraryPreviewSourceOverrides =
            [
                new LibraryPreviewSourceOverride
                {
                    LibraryId = "movies",
                    PreviewSource = "direct-play"
                }
            ]
        });

        Assert.Equal("direct-play", normalized.PreviewSource);
        Assert.Equal("direct-play", normalized.MoviePreviewSource);
        Assert.Equal("direct-play", normalized.SeriesPreviewSource);
        Assert.Equal("direct-play", normalized.EpisodePreviewSource);
        Assert.Equal("direct-play", normalized.VideoPreviewSource);
        Assert.Equal("direct-play", Assert.Single(normalized.LibraryPreviewSourceOverrides).PreviewSource);
    }
}
