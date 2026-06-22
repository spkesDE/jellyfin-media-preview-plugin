using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.MediaPreview;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;

    public int HoverDelayMs { get; set; } = 300;

    public bool HoverIntentEnabled { get; set; } = false;

    public int HoverIntentThresholdPx { get; set; } = 18;

    public int HoverCooldownMs { get; set; } = 0;

    public bool KeyboardPreviewEnabled { get; set; } = false;

    public int KeyboardPreviewDelayMs { get; set; } = 300;

    public int KeyboardPreviewStartPercent { get; set; } = 50;

    public bool KeyboardArrowScrubEnabled { get; set; } = true;

    public int KeyboardArrowStepPercent { get; set; } = 8;

    public bool KeyboardEscapeClosesPreview { get; set; } = true;

    public int TrickplayWidth { get; set; } = 320;

    public bool TrickplayPreloadEnabled { get; set; } = false;

    public int TrickplayPreloadLimit { get; set; } = 2;

    public bool TrickplayLoadingIndicatorEnabled { get; set; } = true;

    public string MoviePreviewSource { get; set; } = "inherit";

    public string SeriesPreviewSource { get; set; } = "inherit";

    public string EpisodePreviewSource { get; set; } = "inherit";

    public string VideoPreviewSource { get; set; } = "inherit";

    public List<LibraryPreviewSourceOverride> LibraryPreviewSourceOverrides { get; set; } = [];

    public bool MetadataOverlayEnabled { get; set; } = false;

    public string MetadataOverlayPosition { get; set; } = "bottom-left";

    public bool MetadataOverlayShowTitle { get; set; } = true;

    public bool MetadataOverlayShowYear { get; set; } = true;

    public bool MetadataOverlayShowRuntime { get; set; } = true;

    public bool MetadataOverlayShowOfficialRating { get; set; } = true;

    public bool MetadataOverlayShowCommunityRating { get; set; } = true;

    public bool RestoreOnLeave { get; set; } = true;

    public bool ShowProgressIndicator { get; set; } = true;

    public bool Debug { get; set; } = false;

    public string PreviewSource { get; set; } = "prefer-trailer";

    public bool ShowNoPreviewMessage { get; set; } = false;

    public bool TrailerAudioEnabled { get; set; } = false;

    public int TrailerVolumePercent { get; set; } = 35;

    public string HoverMode { get; set; } = "auto";

    public bool HoverCountdownEnabled { get; set; } = false;

    public string HoverCountdownPosition { get; set; } = "top-right";

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

    public string PreviewTransitionMode { get; set; } = "fade";

    public int PreviewTransitionDurationMs { get; set; } = 180;

    public string YouTubeCropStrength { get; set; } = "off";

    public bool TrailerExpandButtonEnabled { get; set; } = true;

    public string TrailerExpandButtonPosition { get; set; } = "top-right";
}
