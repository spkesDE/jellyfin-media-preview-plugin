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
    private const string ConfigScriptResourcePath = "Jellyfin.Plugin.MediaPreview.dist.config.bundle.js";
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
        string serializedConfig = JsonSerializer.Serialize(
            PluginConfigurationProperties.ToDictionary(
                property => JsonNamingPolicy.CamelCase.ConvertName(property.Name),
                property => property.GetValue(config)),
            RuntimeConfigJsonOptions);

        byte[] configBytes = Encoding.UTF8.GetBytes(
            "window.JellyfinMediaPreviewPluginConfig = " + serializedConfig + ";" + Environment.NewLine);

        using MemoryStream scriptBuffer = new MemoryStream();
        scriptBuffer.Write(configBytes, 0, configBytes.Length);
        scriptBuffer.Write(scriptBytes, 0, scriptBytes.Length);

        return File(scriptBuffer.ToArray(), "application/javascript; charset=utf-8");
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
