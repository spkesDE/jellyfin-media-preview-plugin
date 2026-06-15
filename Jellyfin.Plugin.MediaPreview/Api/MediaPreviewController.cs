using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview.Api;

[ApiController]
[Route("media-preview")]
public sealed class MediaPreviewController : ControllerBase
{
    private const string ScriptResourcePath = "Jellyfin.Plugin.MediaPreview.dist.mediapreview.bundle.js";
    private static readonly Lazy<byte[]> ClientScript = new(LoadClientScript, LazyThreadSafetyMode.ExecutionAndPublication);
    private readonly ILogger<MediaPreviewController> _logger;

    public MediaPreviewController(ILogger<MediaPreviewController> logger)
    {
        _logger = logger;
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
        string serializedConfig = JsonSerializer.Serialize(new
        {
            enabled = config.Enabled,
            previewSource = config.PreviewSource,
            moviePreviewSource = config.MoviePreviewSource,
            seriesPreviewSource = config.SeriesPreviewSource,
            episodePreviewSource = config.EpisodePreviewSource,
            videoPreviewSource = config.VideoPreviewSource,
            libraryPreviewSourceOverrides = config.LibraryPreviewSourceOverrides.Select(entry => new
            {
                libraryId = entry.LibraryId,
                previewSource = entry.PreviewSource
            }),
            metadataOverlayEnabled = config.MetadataOverlayEnabled,
            metadataOverlayPosition = config.MetadataOverlayPosition,
            metadataOverlayShowTitle = config.MetadataOverlayShowTitle,
            metadataOverlayShowYear = config.MetadataOverlayShowYear,
            metadataOverlayShowRuntime = config.MetadataOverlayShowRuntime,
            metadataOverlayShowOfficialRating = config.MetadataOverlayShowOfficialRating,
            metadataOverlayShowCommunityRating = config.MetadataOverlayShowCommunityRating,
            showNoPreviewMessage = config.ShowNoPreviewMessage,
            trailerAudioEnabled = config.TrailerAudioEnabled,
            trailerVolumePercent = config.TrailerVolumePercent,
            hoverDelayMs = config.HoverDelayMs,
            hoverIntentEnabled = config.HoverIntentEnabled,
            hoverIntentThresholdPx = config.HoverIntentThresholdPx,
            hoverCooldownMs = config.HoverCooldownMs,
            keyboardPreviewEnabled = config.KeyboardPreviewEnabled,
            keyboardPreviewDelayMs = config.KeyboardPreviewDelayMs,
            keyboardPreviewStartPercent = config.KeyboardPreviewStartPercent,
            keyboardArrowScrubEnabled = config.KeyboardArrowScrubEnabled,
            keyboardArrowStepPercent = config.KeyboardArrowStepPercent,
            keyboardEscapeClosesPreview = config.KeyboardEscapeClosesPreview,
            hoverCountdownEnabled = config.HoverCountdownEnabled,
            hoverCountdownPosition = config.HoverCountdownPosition,
            trickplayWidth = config.TrickplayWidth,
            restoreOnLeave = config.RestoreOnLeave,
            showProgressIndicator = config.ShowProgressIndicator,
            debug = config.Debug,
            hoverMode = config.HoverMode,
            autoScrubMode = config.AutoScrubMode,
            autoScrubPreset = config.AutoScrubPreset,
            autoScrubStartPercent = config.AutoScrubStartPercent,
            autoScrubIntervalMs = config.AutoScrubIntervalMs,
            autoScrubDurationMs = config.AutoScrubDurationMs,
            autoScrubMinDelayMs = config.AutoScrubMinDelayMs,
            autoScrubMaxDelayMs = config.AutoScrubMaxDelayMs,
            portraitCardPreviewMode = config.PortraitCardPreviewMode,
            backdropCardPreviewMode = config.BackdropCardPreviewMode,
            previewBackdropMode = config.PreviewBackdropMode,
            previewBackdropIntensityPercent = config.PreviewBackdropIntensityPercent,
            previewTransitionMode = config.PreviewTransitionMode,
            previewTransitionDurationMs = config.PreviewTransitionDurationMs,
            youTubeCropStrength = config.YouTubeCropStrength,
            trailerExpandButtonEnabled = config.TrailerExpandButtonEnabled,
            trailerExpandButtonPosition = config.TrailerExpandButtonPosition
        });

        byte[] configBytes = Encoding.UTF8.GetBytes(
            "window.JellyfinMediaPreviewPluginConfig = " + serializedConfig + ";" + Environment.NewLine);

        using MemoryStream scriptBuffer = new MemoryStream();
        scriptBuffer.Write(configBytes, 0, configBytes.Length);
        scriptBuffer.Write(scriptBytes, 0, scriptBytes.Length);

        return File(scriptBuffer.ToArray(), "application/javascript; charset=utf-8");
    }

    private static byte[] LoadClientScript()
    {
        Assembly assembly = typeof(MediaPreviewController).Assembly;
        using Stream scriptStream = assembly.GetManifestResourceStream(ScriptResourcePath)
            ?? throw new InvalidDataException($"Embedded resource '{ScriptResourcePath}' was not found.");

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
