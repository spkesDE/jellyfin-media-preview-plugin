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
            YouTubeCropStrength = "invalid"
        });

        Assert.Equal("trickplay", normalized.PreviewSource);
        Assert.Equal("scrub", normalized.HoverMode);
        Assert.Equal("medium", normalized.YouTubeCropStrength);
    }
}
