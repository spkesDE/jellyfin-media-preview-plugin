namespace Jellyfin.Plugin.MediaPreview;

public sealed class LibraryPreviewSourceOverride
{
    public string LibraryId { get; set; } = string.Empty;

    public string PreviewSource { get; set; } = "inherit";
}
