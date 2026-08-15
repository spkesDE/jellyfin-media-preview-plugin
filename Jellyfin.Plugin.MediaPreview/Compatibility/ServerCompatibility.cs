using MediaBrowser.Controller;

namespace Jellyfin.Plugin.MediaPreview;

internal static class ServerCompatibility
{
    internal static readonly Version SupportedServerVersion = new Version(10, 10, 7, 0);

    internal static Version? DetectedServerVersion =>
        typeof(IServerApplicationHost).Assembly.GetName().Version;

    internal static bool IsSupported =>
        DetectedServerVersion == SupportedServerVersion;

    internal static void EnsureSupported()
    {
        if (IsSupported)
        {
            return;
        }

        throw new NotSupportedException(
            $"Media Preview Legacy supports Jellyfin {SupportedServerVersion} only. " +
            $"Detected server version: {DetectedServerVersion?.ToString() ?? "unknown"}.");
    }
}
