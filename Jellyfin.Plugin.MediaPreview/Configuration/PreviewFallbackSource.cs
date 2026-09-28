namespace Jellyfin.Plugin.MediaPreview;

public sealed class PreviewFallbackSource
{
    public string Source { get; set; } = "trailer";

    public bool Enabled { get; set; } = true;
}
