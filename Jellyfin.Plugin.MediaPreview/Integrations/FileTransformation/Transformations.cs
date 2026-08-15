using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using MediaBrowser.Common.Net;

namespace Jellyfin.Plugin.MediaPreview;

public static class Transformations
{
    private static readonly Regex ScriptMarkerRegex = new(
        "<script[^>]*plugin=\\\"MediaPreviewLegacy\\\"[^>]*></script>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ClosingBodyRegex = new(
        "(</body>)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static string IndexTransformation(PatchRequestPayload payload)
    {
        string contents = payload.Contents ?? string.Empty;
        PluginConfiguration configuration = PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);
        if (configuration.FrontendInjectionMethod == FrontendInjectionMethods.JavaScriptInjector)
        {
            return ScriptMarkerRegex.Replace(contents, string.Empty);
        }

        string scriptTag = BuildScriptTag();
        string stripped = ScriptMarkerRegex.Replace(contents, string.Empty);

        if (stripped.Contains(scriptTag, StringComparison.Ordinal))
        {
            return stripped;
        }

        return ClosingBodyRegex.Replace(stripped, scriptTag + "$1");
    }

    private static string BuildScriptTag()
    {
        string basePath = string.Empty;
        NetworkConfiguration? networkConfiguration = Plugin.Instance?.ServerConfigurationManager.GetNetworkConfiguration();
        if (!string.IsNullOrWhiteSpace(networkConfiguration?.BaseUrl))
        {
            basePath = "/" + networkConfiguration.BaseUrl.Trim().Trim('/');
        }

        return $"<script FileTransformation=\"true\" plugin=\"MediaPreviewLegacy\" defer=\"defer\" src=\"{basePath}/media-preview-legacy/script\"></script>";
    }
}

public sealed class PatchRequestPayload
{
    [JsonPropertyName("contents")]
    public string? Contents { get; set; }
}
