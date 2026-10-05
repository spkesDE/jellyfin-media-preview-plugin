using System.Xml.Serialization;
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
        Assert.Equal("inherit", defaults.InProgressPreviewSource);
        Assert.Equal("scrub", defaults.HoverMode);
        Assert.Equal("medium", defaults.YouTubeCropStrength);
        Assert.True(defaults.DirectPlayPreviewEnabled);
        Assert.Equal(20, defaults.DirectPlayStartPercent);
        Assert.Equal(1.5, defaults.DirectPlayPlaybackRate);
        Assert.Equal(15, defaults.DirectPlayPreviewDurationSeconds);
        Assert.True(defaults.DirectPlayTranscodeFallbackEnabled);
        Assert.Equal(480, defaults.DirectPlayTranscodeMaxHeight);
        Assert.Equal(1500, defaults.DirectPlayTranscodeVideoBitrateKbps);
        Assert.Equal(["local-trailer", "remote-trailer", "direct-play"], defaults.VideoControlSources);
        Assert.Equal(["local-trailer", "remote-trailer", "direct-play"], defaults.AudioControlSources);
        Assert.Empty(defaults.PreferTrailerFallbacks);
        Assert.Empty(defaults.PreferTrickplayFallbacks);
        Assert.Empty(defaults.PreferDirectPlayFallbacks);
        Assert.Collection(
            normalized.PreferTrailerFallbacks,
            entry => AssertDefaultSource(entry, "local-trailer"),
            entry => AssertDefaultSource(entry, "remote-trailer"),
            entry => AssertDefaultSource(entry, "direct-play"),
            entry => AssertDefaultSource(entry, "trickplay"));
        Assert.Collection(
            normalized.PreferTrickplayFallbacks,
            entry => AssertDefaultSource(entry, "local-trailer"),
            entry => AssertDefaultSource(entry, "remote-trailer"),
            entry => AssertDefaultSource(entry, "direct-play"));
        Assert.Collection(
            normalized.PreferDirectPlayFallbacks,
            entry => AssertDefaultSource(entry, "trickplay"),
            entry => AssertDefaultSource(entry, "local-trailer"),
            entry => AssertDefaultSource(entry, "remote-trailer"));
        Assert.Equal(defaults.PreviewSource, normalized.PreviewSource);
        Assert.Equal(defaults.InProgressPreviewSource, normalized.InProgressPreviewSource);
        Assert.Equal(defaults.HoverMode, normalized.HoverMode);
        Assert.Equal(defaults.YouTubeCropStrength, normalized.YouTubeCropStrength);
    }

    [Fact]
    public void MediaControlSourcesPreserveValidSelectionsAndRemoveDuplicates()
    {
        PluginConfiguration normalized = PluginConfigurationNormalizer.Normalize(new PluginConfiguration
        {
            VideoControlSources = ["direct-play", "invalid", "local-trailer", "direct-play"],
            AudioControlSources = ["remote-trailer"]
        });

        Assert.Equal(["direct-play", "local-trailer"], normalized.VideoControlSources);
        Assert.Equal(["remote-trailer"], normalized.AudioControlSources);
    }

    [Fact]
    public void InvalidChoicesUseCanonicalFallbacks()
    {
        PluginConfiguration normalized = PluginConfigurationNormalizer.Normalize(new PluginConfiguration
        {
            PreviewSource = "invalid",
            InProgressPreviewSource = "invalid",
            HoverMode = "invalid",
            YouTubeCropStrength = "invalid",
            DirectPlayStartPercent = 100,
            DirectPlayPlaybackRate = 10,
            DirectPlayPreviewDurationSeconds = -1,
            DirectPlayTranscodeMaxHeight = 100,
            DirectPlayTranscodeVideoBitrateKbps = 100
        });

        Assert.Equal("trickplay", normalized.PreviewSource);
        Assert.Equal("inherit", normalized.InProgressPreviewSource);
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
            InProgressPreviewSource = "direct-play",
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
        Assert.Equal("direct-play", normalized.InProgressPreviewSource);
        Assert.Equal("direct-play", normalized.MoviePreviewSource);
        Assert.Equal("direct-play", normalized.SeriesPreviewSource);
        Assert.Equal("direct-play", normalized.EpisodePreviewSource);
        Assert.Equal("direct-play", normalized.VideoPreviewSource);
        Assert.Equal("direct-play", Assert.Single(normalized.LibraryPreviewSourceOverrides).PreviewSource);
    }

    [Fact]
    public void PreferredFallbacksPreserveOrderAndRepairInvalidEntries()
    {
        PluginConfiguration normalized = PluginConfigurationNormalizer.Normalize(new PluginConfiguration
        {
            PreviewSource = "prefer-direct-play",
            PreferDirectPlayFallbacks =
            [
                new PreviewFallbackSource { Source = "trickplay", Enabled = true },
                new PreviewFallbackSource { Source = "trickplay", Enabled = false },
                new PreviewFallbackSource { Source = "direct-play", Enabled = true },
                new PreviewFallbackSource { Source = "invalid", Enabled = true }
            ]
        });

        Assert.Equal("prefer-direct-play", normalized.PreviewSource);
        Assert.Collection(
            normalized.PreferDirectPlayFallbacks,
            entry =>
            {
                Assert.Equal("trickplay", entry.Source);
                Assert.True(entry.Enabled);
            },
            entry =>
            {
                Assert.Equal("local-trailer", entry.Source);
                Assert.True(entry.Enabled);
            },
            entry =>
            {
                Assert.Equal("remote-trailer", entry.Source);
                Assert.True(entry.Enabled);
            });
    }

    [Fact]
    public void PreferTrailerMigratesLegacyFallbacksAndAllowsRemoteFirst()
    {
        PluginConfiguration legacy = PluginConfigurationNormalizer.Normalize(new PluginConfiguration
        {
            PreferTrailerFallbacks =
            [
                new PreviewFallbackSource { Source = "remote-trailer", Enabled = true },
                new PreviewFallbackSource { Source = "direct-play", Enabled = true },
                new PreviewFallbackSource { Source = "trickplay", Enabled = false }
            ]
        });

        Assert.Equal("local-trailer", legacy.PreferTrailerFallbacks[0].Source);

        PluginConfiguration remoteFirst = PluginConfigurationNormalizer.Normalize(new PluginConfiguration
        {
            PreferTrailerFallbacks =
            [
                new PreviewFallbackSource { Source = "remote-trailer", Enabled = true },
                new PreviewFallbackSource { Source = "local-trailer", Enabled = true },
                new PreviewFallbackSource { Source = "direct-play", Enabled = true },
                new PreviewFallbackSource { Source = "trickplay", Enabled = false }
            ]
        });

        Assert.Equal("remote-trailer", remoteFirst.PreferTrailerFallbacks[0].Source);
        Assert.Equal("local-trailer", remoteFirst.PreferTrailerFallbacks[1].Source);
    }

    [Fact]
    public void PreferredFallbacksPreserveOrderAndStateAcrossXmlReload()
    {
        PluginConfiguration original = new PluginConfiguration
        {
            PreferTrailerFallbacks =
            [
                new PreviewFallbackSource { Source = "remote-trailer", Enabled = true },
                new PreviewFallbackSource { Source = "trickplay", Enabled = false },
                new PreviewFallbackSource { Source = "direct-play", Enabled = true },
                new PreviewFallbackSource { Source = "local-trailer", Enabled = false }
            ],
            PreferTrickplayFallbacks =
            [
                new PreviewFallbackSource { Source = "direct-play", Enabled = false },
                new PreviewFallbackSource { Source = "remote-trailer", Enabled = true },
                new PreviewFallbackSource { Source = "local-trailer", Enabled = false }
            ],
            PreferDirectPlayFallbacks =
            [
                new PreviewFallbackSource { Source = "remote-trailer", Enabled = false },
                new PreviewFallbackSource { Source = "local-trailer", Enabled = true },
                new PreviewFallbackSource { Source = "trickplay", Enabled = false }
            ]
        };

        XmlSerializer serializer = new(typeof(PluginConfiguration));
        using StringWriter writer = new();
        serializer.Serialize(writer, original);
        using StringReader reader = new(writer.ToString());
        PluginConfiguration reloaded = Assert.IsType<PluginConfiguration>(serializer.Deserialize(reader));
        PluginConfiguration normalized = PluginConfigurationNormalizer.Normalize(reloaded);

        AssertFallbacks(
            normalized.PreferTrailerFallbacks,
            ("remote-trailer", true),
            ("trickplay", false),
            ("direct-play", true),
            ("local-trailer", false));
        AssertFallbacks(
            normalized.PreferTrickplayFallbacks,
            ("direct-play", false),
            ("remote-trailer", true),
            ("local-trailer", false));
        AssertFallbacks(
            normalized.PreferDirectPlayFallbacks,
            ("remote-trailer", false),
            ("local-trailer", true),
            ("trickplay", false));
    }

    private static void AssertFallbacks(
        IReadOnlyList<PreviewFallbackSource> actual,
        params (string Source, bool Enabled)[] expected)
    {
        Assert.Equal(expected.Length, actual.Count);
        for (int index = 0; index < expected.Length; index++)
        {
            Assert.Equal(expected[index].Source, actual[index].Source);
            Assert.Equal(expected[index].Enabled, actual[index].Enabled);
        }
    }

    private static void AssertDefaultSource(PreviewFallbackSource entry, string source)
    {
        Assert.Equal(source, entry.Source);
        Assert.True(entry.Enabled);
    }
}
