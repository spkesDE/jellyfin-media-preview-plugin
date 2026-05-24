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
    private readonly ILogger<MediaPreviewController> _logger;
    private readonly string _scriptResourcePath;

    public MediaPreviewController(ILogger<MediaPreviewController> logger)
    {
        _logger = logger;
        _scriptResourcePath = "Jellyfin.Plugin.MediaPreview.dist.mediapreview.bundle.js";
    }

    [HttpGet("script")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/javascript")]
    public ActionResult GetClientScript()
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";

        Stream? scriptStream = Assembly.GetExecutingAssembly().GetManifestResourceStream(_scriptResourcePath);
        if (scriptStream is null)
        {
            _logger.LogWarning("Could not find embedded media preview script resource at {ResourcePath}.", _scriptResourcePath);
            return NotFound();
        }

        using StreamReader reader = new StreamReader(scriptStream, Encoding.UTF8);
        string scriptBody = reader.ReadToEnd();

        PluginConfiguration config = PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);
        string serializedConfig = JsonSerializer.Serialize(new
        {
            enabled = config.Enabled,
            previewSource = config.PreviewSource,
            trailerAudioEnabled = config.TrailerAudioEnabled,
            trailerVolumePercent = config.TrailerVolumePercent,
            hoverDelayMs = config.HoverDelayMs,
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
            youTubeCropStrength = config.YouTubeCropStrength,
            trailerExpandButtonEnabled = config.TrailerExpandButtonEnabled,
            trailerExpandButtonPosition = config.TrailerExpandButtonPosition
        });

        string script = "window.JellyfinMediaPreviewPluginConfig = " + serializedConfig + ";" + Environment.NewLine + scriptBody;
        return Content(script, "application/javascript", Encoding.UTF8);
    }
}
