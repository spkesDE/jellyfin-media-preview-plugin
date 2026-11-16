using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Jellyfin.Plugin.MediaPreview;

public static class Transformations
{
    private static readonly Regex ClosingBodyRegex = new(
        "(</body>)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static string IndexTransformation(PatchRequestPayload payload)
    {
        string contents = payload.Contents ?? string.Empty;
        PluginConfiguration configuration = PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);
        string stripped = FrontendInjectionMarkup.Strip(contents);
        if (configuration.FrontendInjectionMethod == FrontendInjectionMethods.JavaScriptInjector)
        {
            return stripped;
        }

        string scriptTag = FrontendInjectionMarkup.BuildScriptTag(
            "FileTransformation",
            FrontendInjectionMethods.FileTransformation);

        if (stripped.Contains(scriptTag, StringComparison.Ordinal))
        {
            return stripped;
        }

        return ClosingBodyRegex.Replace(stripped, scriptTag + "$1");
    }
}

public sealed class PatchRequestPayload
{
    [JsonPropertyName("contents")]
    public string? Contents { get; set; }
}
