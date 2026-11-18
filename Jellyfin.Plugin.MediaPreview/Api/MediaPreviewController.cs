using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Jellyfin.Plugin.MediaPreview.Trailers;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using JellyfinUser = Jellyfin.Database.Implementations.Entities.User;

namespace Jellyfin.Plugin.MediaPreview.Api;

[ApiController]
[Route("media-preview")]
public sealed class MediaPreviewController : ControllerBase
{
    private const string ScriptResourcePath = "Jellyfin.Plugin.MediaPreview.dist.mediapreview.bundle.js";
    private const string ConfigScriptResourcePath = "Jellyfin.Plugin.MediaPreview.dist.config.bundle.js";
    // Jellyfin's policy name for administrator-only endpoints (Jellyfin.Api.Constants.Policies).
    private const string AdministratorPolicy = "RequiresElevation";
    private const string LibraryOverridesKey = "libraryPreviewSourceOverrides";
    private const string HasLibraryOverridesKey = "hasLibraryPreviewSourceOverrides";
    private static readonly JsonSerializerOptions RuntimeConfigJsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly PropertyInfo[] PluginConfigurationProperties = typeof(PluginConfiguration)
        .GetProperties(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);
    private static readonly Lazy<byte[]> ClientScript = new(
        () => LoadEmbeddedScript(ScriptResourcePath),
        LazyThreadSafetyMode.ExecutionAndPublication);
    private static readonly Lazy<byte[]> ConfigScript = new(
        () => LoadEmbeddedScript(ConfigScriptResourcePath),
        LazyThreadSafetyMode.ExecutionAndPublication);
    private readonly ILogger<MediaPreviewController> _logger;
    private readonly ILibraryManager _libraryManager;
    private readonly UnavailableTrailerStore _unavailableTrailerStore;
    private readonly FrontendInjectionAvailabilityService _frontendInjectionAvailability;
    private readonly IUserManager _userManager;
    private readonly IApplicationPaths _applicationPaths;

    public MediaPreviewController(
        ILogger<MediaPreviewController> logger,
        ILibraryManager libraryManager,
        IUserManager userManager,
        IApplicationPaths applicationPaths,
        UnavailableTrailerStore unavailableTrailerStore,
        FrontendInjectionAvailabilityService frontendInjectionAvailability)
    {
        _logger = logger;
        _libraryManager = libraryManager;
        _userManager = userManager;
        _applicationPaths = applicationPaths;
        _unavailableTrailerStore = unavailableTrailerStore;
        _frontendInjectionAvailability = frontendInjectionAvailability;
    }

    [HttpGet("script")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [Produces("application/javascript")]
    public ActionResult GetClientScript()
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";

        byte[] scriptBytes;
        try
        {
            scriptBytes = ClientScript.Value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not load the embedded media preview client script.");
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The embedded media preview client script is invalid.");
        }

        PluginConfiguration config = PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);
        Dictionary<string, object?> runtimeConfig = PluginConfigurationProperties.ToDictionary(
            property => JsonNamingPolicy.CamelCase.ConvertName(property.Name),
            property => property.GetValue(config));

        // This script is served without authentication (it also loads on the login page), so
        // library ids stay out of it. Signed-in clients fetch them from config/library-overrides.
        runtimeConfig[LibraryOverridesKey] = Array.Empty<LibraryPreviewSourceOverride>();
        runtimeConfig[HasLibraryOverridesKey] = config.LibraryPreviewSourceOverrides.Count > 0;

        string serializedConfig = JsonSerializer.Serialize(runtimeConfig, RuntimeConfigJsonOptions);

        byte[] configBytes = Encoding.UTF8.GetBytes(
            "window.JellyfinMediaPreviewPluginConfig = " + serializedConfig + ";" + Environment.NewLine);

        // The response only changes with the bundle or the configuration, so it is hashed into
        // an ETag. Browsers revalidate on every load (no-cache) and get a 304 while unchanged,
        // instead of downloading the whole bundle again.
        string etag = BuildScriptEtag(configBytes, scriptBytes);
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Remove("Pragma");
        Response.Headers.Remove("Expires");
        Response.Headers.ETag = etag;
        if (IfNoneMatchContains(Request.Headers.IfNoneMatch, etag))
        {
            return StatusCode(StatusCodes.Status304NotModified);
        }

        using MemoryStream scriptBuffer = new MemoryStream();
        scriptBuffer.Write(configBytes, 0, configBytes.Length);
        scriptBuffer.Write(scriptBytes, 0, scriptBytes.Length);

        return File(scriptBuffer.ToArray(), "application/javascript; charset=utf-8");
    }

    internal static string BuildScriptEtag(byte[] configBytes, byte[] scriptBytes)
    {
        using IncrementalHash hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        hash.AppendData(configBytes);
        hash.AppendData(scriptBytes);
        return "\"" + Convert.ToHexString(hash.GetHashAndReset(), 0, 16).ToLowerInvariant() + "\"";
    }

    internal static bool IfNoneMatchContains(IEnumerable<string?> ifNoneMatchHeaders, string etag)
    {
        foreach (string? header in ifNoneMatchHeaders)
        {
            if (string.IsNullOrEmpty(header))
            {
                continue;
            }

            foreach (string candidate in header.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
            {
                string normalized = candidate.StartsWith("W/", StringComparison.Ordinal) ? candidate[2..] : candidate;
                if (normalized == "*" || string.Equals(normalized, etag, StringComparison.Ordinal))
                {
                    return true;
                }
            }
        }

        return false;
    }

    [HttpGet("config-script")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [Produces("application/javascript")]
    public ActionResult GetConfigScript()
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";

        try
        {
            return File(ConfigScript.Value, "application/javascript; charset=utf-8");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not load the embedded media preview configuration script.");
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The embedded media preview configuration script is invalid.");
        }
    }

    [Authorize]
    [HttpGet("config/injection-methods")]
    [ProducesResponseType<Dictionary<string, bool>>(StatusCodes.Status200OK)]
    public ActionResult<Dictionary<string, bool>> GetFrontendInjectionMethods()
    {
        FrontendInjectionAvailability availability = _frontendInjectionAvailability.GetAvailability();
        return Ok(new Dictionary<string, bool>
        {
            [FrontendInjectionMethods.Automatic] = true,
            [FrontendInjectionMethods.FileTransformation] = availability.FileTransformation,
            [FrontendInjectionMethods.JavaScriptInjector] = availability.JavaScriptInjector,
            [FrontendInjectionMethods.Direct] = availability.Direct
        });
    }

    [Authorize(Policy = AdministratorPolicy)]
    [HttpGet("config/diagnostics")]
    [ProducesResponseType<DiagnosticsResponse>(StatusCodes.Status200OK)]
    public ActionResult<DiagnosticsResponse> GetDiagnostics()
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        PluginConfiguration config = PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);
        FrontendInjectionAvailability availability = _frontendInjectionAvailability.GetAvailability();
        return Ok(new DiagnosticsResponse
        {
            PluginVersion = Plugin.Instance?.Version?.ToString() ?? "unknown",
            ConfiguredMethod = config.FrontendInjectionMethod,
            ActiveMethod = FrontendRegistration.ActiveMethod,
            LastRegistrationSucceeded = FrontendRegistration.LastRegistrationSucceeded,
            LastRegistrationUtc = FrontendRegistration.LastRegistrationUtc,
            PluginDiscoveryComplete = availability.PluginDiscoveryComplete,
            FileTransformationAvailable = availability.FileTransformation,
            JavaScriptInjectorAvailable = availability.JavaScriptInjector,
            DirectInjectionAvailable = availability.Direct,
            DirectLoaderInIndex = DirectScriptInjector.HasLoader(_applicationPaths),
            ClientBundle = DescribeBundle(ClientScript),
            ConfigBundle = DescribeBundle(ConfigScript)
        });
    }

    private static BundleDiagnostics DescribeBundle(Lazy<byte[]> bundle)
    {
        try
        {
            return new BundleDiagnostics { Valid = true, SizeBytes = bundle.Value.Length };
        }
        catch (Exception ex)
        {
            return new BundleDiagnostics { Valid = false, Error = ex.Message };
        }
    }

    [Authorize]
    [HttpGet("config/library-overrides")]
    [ProducesResponseType<LibraryOverridesResponse>(StatusCodes.Status200OK)]
    public ActionResult<LibraryOverridesResponse> GetLibraryOverrides()
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        PluginConfiguration config = PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);
        return Ok(new LibraryOverridesResponse
        {
            Overrides = config.LibraryPreviewSourceOverrides
                .Select(entry => new LibraryOverrideDto
                {
                    LibraryId = entry.LibraryId,
                    PreviewSource = entry.PreviewSource
                })
                .ToArray()
        });
    }

    [Authorize]
    [HttpGet("unavailable-trailers")]
    [ProducesResponseType<UnavailableTrailerListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UnavailableTrailerListResponse>> GetUnavailableTrailers(
        CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        IReadOnlyList<string> videoIds = await _unavailableTrailerStore
            .GetActiveVideoIdsAsync(cancellationToken)
            .ConfigureAwait(false);
        return Ok(new UnavailableTrailerListResponse { VideoIds = videoIds });
    }

    [Authorize(Policy = AdministratorPolicy)]
    [HttpGet("unavailable-trailers/details")]
    [ProducesResponseType<UnavailableTrailerDetailsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UnavailableTrailerDetailsResponse>> GetUnavailableTrailerDetails(
        CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        PluginConfiguration config = PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);
        IReadOnlyList<UnavailableTrailerSnapshot> entries = await _unavailableTrailerStore
            .GetEntriesAsync(cancellationToken)
            .ConfigureAwait(false);

        return Ok(new UnavailableTrailerDetailsResponse
        {
            Enabled = config.UnavailableTrailerCacheEnabled,
            RetryDays = config.UnavailableTrailerRetryDays,
            Entries = entries.Select(entry => new UnavailableTrailerDetail
            {
                VideoId = entry.VideoId,
                ErrorCode = entry.ErrorCode,
                FirstSeenUtc = entry.FirstSeenUtc,
                LastSeenUtc = entry.LastSeenUtc,
                RetryAfterUtc = entry.RetryAfterUtc,
                ReportCount = entry.ReportCount,
                Items = entry.ItemIds
                    .Select(itemId => Guid.TryParse(itemId, out Guid id) ? _libraryManager.GetItemById(id) : null)
                    .OfType<BaseItem>()
                    .Select(item => new UnavailableTrailerItem
                    {
                        Id = item.Id.ToString("N"),
                        Name = item.Name ?? string.Empty,
                        Type = item.GetBaseItemKind().ToString(),
                        ProductionYear = item.ProductionYear
                    })
                    .ToArray()
            }).ToArray()
        });
    }

    [Authorize(Policy = AdministratorPolicy)]
    [HttpDelete("unavailable-trailers/{videoId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetUnavailableTrailer(
        [FromRoute] string videoId,
        CancellationToken cancellationToken)
    {
        if (!YouTubeVideoId.IsValid(videoId))
        {
            return BadRequest("The video id is invalid.");
        }

        bool removed = await _unavailableTrailerStore.RemoveAsync(videoId, cancellationToken).ConfigureAwait(false);
        return removed ? NoContent() : NotFound();
    }

    [Authorize(Policy = AdministratorPolicy)]
    [HttpDelete("unavailable-trailers")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ResetAllUnavailableTrailers(CancellationToken cancellationToken)
    {
        await _unavailableTrailerStore.ClearAsync(cancellationToken).ConfigureAwait(false);
        return NoContent();
    }

    [Authorize]
    [HttpPost("unavailable-trailers/report")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReportUnavailableTrailer(
        [FromBody] ReportUnavailableTrailerRequest request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(request.ItemId, out Guid itemId)
            || !YouTubeVideoId.IsValid(request.VideoId)
            || !YouTubeVideoId.IsUnavailableErrorCode(request.ErrorCode))
        {
            return BadRequest("The unavailable trailer report is invalid.");
        }

        JellyfinUser? user = ActiveUser.Resolve(User, _userManager);
        if (user is null)
        {
            return Forbid();
        }

        // Resolving through the user returns null for items outside their libraries or
        // parental limits, so a report cannot probe items the user cannot see.
        BaseItem? item = _libraryManager.GetItemById<BaseItem>(itemId, user);
        bool trailerBelongsToItem = item?.RemoteTrailers?.Any(remoteTrailer =>
            string.Equals(
                YouTubeVideoId.Extract(remoteTrailer.Url),
                request.VideoId,
                StringComparison.Ordinal)) == true;
        if (!trailerBelongsToItem)
        {
            return BadRequest("The reported trailer is not attached to the item.");
        }

        await _unavailableTrailerStore
            .ReportAsync(request.VideoId, itemId, request.ErrorCode, cancellationToken)
            .ConfigureAwait(false);
        return NoContent();
    }

    private static byte[] LoadEmbeddedScript(string resourcePath)
    {
        Assembly assembly = typeof(MediaPreviewController).Assembly;
        using Stream scriptStream = assembly.GetManifestResourceStream(resourcePath)
            ?? throw new InvalidDataException($"Embedded resource '{resourcePath}' was not found.");

        if (scriptStream.Length <= 0 || scriptStream.Length > 5 * 1024 * 1024)
        {
            throw new InvalidDataException($"Embedded client script has an invalid length of {scriptStream.Length} bytes.");
        }

        int scriptLength = checked((int)scriptStream.Length);
        byte[] scriptBytes = new byte[scriptLength];
        scriptStream.ReadExactly(scriptBytes);

        string scriptText = new UTF8Encoding(false, true).GetString(scriptBytes).TrimEnd();
        if (!scriptText.StartsWith("\"use strict\";", StringComparison.Ordinal)
            || !scriptText.EndsWith("})();", StringComparison.Ordinal))
        {
            throw new InvalidDataException("Embedded client script failed its content boundary validation.");
        }

        return scriptBytes;
    }
}
