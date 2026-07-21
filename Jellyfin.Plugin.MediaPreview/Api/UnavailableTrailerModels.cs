namespace Jellyfin.Plugin.MediaPreview.Api;

public sealed class ReportUnavailableTrailerRequest
{
    public string ItemId { get; set; } = string.Empty;

    public string VideoId { get; set; } = string.Empty;

    public int ErrorCode { get; set; }
}

public sealed class UnavailableTrailerListResponse
{
    public IReadOnlyList<string> VideoIds { get; init; } = [];
}
