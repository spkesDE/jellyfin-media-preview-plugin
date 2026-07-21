using System.Text.Json.Serialization;

namespace Jellyfin.Plugin.MediaPreview.Api;

public sealed class ReportUnavailableTrailerRequest
{
    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("videoId")]
    public string VideoId { get; set; } = string.Empty;

    [JsonPropertyName("errorCode")]
    public int ErrorCode { get; set; }
}

public sealed class UnavailableTrailerListResponse
{
    [JsonPropertyName("videoIds")]
    public IReadOnlyList<string> VideoIds { get; init; } = [];
}
