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

public sealed class LibraryOverridesResponse
{
    [JsonPropertyName("overrides")]
    public IReadOnlyList<LibraryOverrideDto> Overrides { get; init; } = [];
}

public sealed class LibraryOverrideDto
{
    [JsonPropertyName("libraryId")]
    public string LibraryId { get; init; } = string.Empty;

    [JsonPropertyName("previewSource")]
    public string PreviewSource { get; init; } = "inherit";
}
