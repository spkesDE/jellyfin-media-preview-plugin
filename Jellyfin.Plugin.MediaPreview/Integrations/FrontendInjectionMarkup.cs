using System.Text.RegularExpressions;
using MediaBrowser.Common.Net;

namespace Jellyfin.Plugin.MediaPreview;

internal static class FrontendInjectionMarkup
{
    private static readonly Regex ScriptMarkerRegex = new(
        "<script\\b(?=[^>]*\\bplugin=([\"'])MediaPreview\\1)[^>]*>\\s*</script>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    internal static string Strip(string contents) => ScriptMarkerRegex.Replace(contents, string.Empty);

    internal static string BuildScriptTag(string providerAttribute, string injectionMethod)
    {
        string basePath = GetBasePath();
        return $"<script {providerAttribute}=\"true\" data-injection-method=\"{injectionMethod}\" plugin=\"MediaPreview\" defer=\"defer\" src=\"{basePath}/media-preview/script\"></script>";
    }

    private static string GetBasePath()
    {
        NetworkConfiguration? network = Plugin.Instance?.ServerConfigurationManager.GetNetworkConfiguration();
        return string.IsNullOrWhiteSpace(network?.BaseUrl)
            ? string.Empty
            : "/" + network.BaseUrl.Trim().Trim('/');
    }
}
