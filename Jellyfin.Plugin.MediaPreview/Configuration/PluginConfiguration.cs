using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.MediaPreview;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;

    public int HoverDelayMs { get; set; } = 300;

    public int TrickplayWidth { get; set; } = 320;

    public bool RestoreOnLeave { get; set; } = true;

    public bool ShowProgressIndicator { get; set; } = true;

    public bool Debug { get; set; } = false;

    public string PreviewSource { get; set; } = "prefer-trailer";

    public bool TrailerAudioEnabled { get; set; } = false;

    public int TrailerVolumePercent { get; set; } = 35;

    public string HoverMode { get; set; } = "auto";

    public string AutoScrubMode { get; set; } = "step";

    public string AutoScrubPreset { get; set; } = "balanced";

    public int AutoScrubStartPercent { get; set; } = 0;

    public int AutoScrubIntervalMs { get; set; } = 220;

    public int AutoScrubDurationMs { get; set; } = 4000;

    public int AutoScrubMinDelayMs { get; set; } = 40;

    public int AutoScrubMaxDelayMs { get; set; } = 1000;

    public string PortraitCardPreviewMode { get; set; } = "contain";

    public string BackdropCardPreviewMode { get; set; } = "cover";

    public string PreviewBackdropMode { get; set; } = "dim-blur";

    public int PreviewBackdropIntensityPercent { get; set; } = 35;

    public string YouTubeCropStrength { get; set; } = "off";

    public bool TrailerExpandButtonEnabled { get; set; } = true;

    public string TrailerExpandButtonPosition { get; set; } = "top-right";
}
