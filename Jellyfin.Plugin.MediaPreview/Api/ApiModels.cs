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

public sealed class DiagnosticsResponse
{
    [JsonPropertyName("pluginVersion")]
    public string PluginVersion { get; init; } = string.Empty;

    [JsonPropertyName("configuredMethod")]
    public string ConfiguredMethod { get; init; } = string.Empty;

    [JsonPropertyName("activeMethod")]
    public string ActiveMethod { get; init; } = string.Empty;

    [JsonPropertyName("lastRegistrationSucceeded")]
    public bool LastRegistrationSucceeded { get; init; }

    [JsonPropertyName("lastRegistrationUtc")]
    public DateTimeOffset? LastRegistrationUtc { get; init; }

    [JsonPropertyName("pluginDiscoveryComplete")]
    public bool PluginDiscoveryComplete { get; init; }

    [JsonPropertyName("fileTransformationAvailable")]
    public bool FileTransformationAvailable { get; init; }

    [JsonPropertyName("javaScriptInjectorAvailable")]
    public bool JavaScriptInjectorAvailable { get; init; }

    [JsonPropertyName("directInjectionAvailable")]
    public bool DirectInjectionAvailable { get; init; }

    [JsonPropertyName("directLoaderInIndex")]
    public bool? DirectLoaderInIndex { get; init; }

    [JsonPropertyName("clientBundle")]
    public BundleDiagnostics ClientBundle { get; init; } = new();

    [JsonPropertyName("configBundle")]
    public BundleDiagnostics ConfigBundle { get; init; } = new();
}

public sealed class BundleDiagnostics
{
    [JsonPropertyName("valid")]
    public bool Valid { get; init; }

    [JsonPropertyName("sizeBytes")]
    public int SizeBytes { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }
}

public sealed class UnavailableTrailerDetailsResponse
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; }

    [JsonPropertyName("retryDays")]
    public int RetryDays { get; init; }

    [JsonPropertyName("entries")]
    public IReadOnlyList<UnavailableTrailerDetail> Entries { get; init; } = [];
}

public sealed class UnavailableTrailerDetail
{
    [JsonPropertyName("videoId")]
    public string VideoId { get; init; } = string.Empty;

    [JsonPropertyName("errorCode")]
    public int ErrorCode { get; init; }

    [JsonPropertyName("firstSeenUtc")]
    public DateTimeOffset FirstSeenUtc { get; init; }

    [JsonPropertyName("lastSeenUtc")]
    public DateTimeOffset LastSeenUtc { get; init; }

    [JsonPropertyName("retryAfterUtc")]
    public DateTimeOffset RetryAfterUtc { get; init; }

    [JsonPropertyName("reportCount")]
    public int ReportCount { get; init; }

    [JsonPropertyName("items")]
    public IReadOnlyList<UnavailableTrailerItem> Items { get; init; } = [];
}

public sealed class UnavailableTrailerItem
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; init; } = string.Empty;

    [JsonPropertyName("productionYear")]
    public int? ProductionYear { get; init; }
}
