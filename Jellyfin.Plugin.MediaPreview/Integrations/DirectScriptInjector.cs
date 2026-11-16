using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview;

internal static class DirectScriptInjector
{
    internal static bool IsAvailable(IApplicationPaths applicationPaths)
    {
        if (string.IsNullOrWhiteSpace(applicationPaths.WebPath))
        {
            return false;
        }

        string indexFile = Path.Combine(applicationPaths.WebPath, "index.html");
        if (!File.Exists(indexFile))
        {
            return false;
        }

        try
        {
            using FileStream stream = File.Open(indexFile, FileMode.Open, FileAccess.ReadWrite, FileShare.ReadWrite);
            return true;
        }
        catch
        {
            return false;
        }
    }

    internal static bool TryInject(IApplicationPaths applicationPaths, ILogger logger)
    {
        string? indexFile = GetIndexFile(applicationPaths, logger);
        if (indexFile is null)
        {
            return false;
        }

        try
        {
            string contents = File.ReadAllText(indexFile);
            string stripped = FrontendInjectionMarkup.Strip(contents);
            int bodyClosing = stripped.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
            if (bodyClosing < 0)
            {
                logger.LogWarning("Could not find a closing body tag in {IndexFile}.", indexFile);
                return false;
            }

            string updated = stripped.Insert(
                bodyClosing,
                FrontendInjectionMarkup.BuildScriptTag("DirectInjection", FrontendInjectionMethods.Direct));
            if (!string.Equals(contents, updated, StringComparison.Ordinal))
            {
                File.WriteAllText(indexFile, updated);
                logger.LogInformation("Injected the Media Preview client script directly into {IndexFile}.", indexFile);
            }
            else
            {
                logger.LogInformation("Found the Media Preview client script in {IndexFile}.", indexFile);
            }

            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to inject the Media Preview client script into {IndexFile}.", indexFile);
            return false;
        }
    }

    internal static void TryRemove(IApplicationPaths applicationPaths, ILogger logger)
    {
        string? indexFile = GetIndexFile(applicationPaths, logger, logMissing: false);
        if (indexFile is null)
        {
            return;
        }

        try
        {
            string contents = File.ReadAllText(indexFile);
            string updated = FrontendInjectionMarkup.Strip(contents);
            if (!string.Equals(contents, updated, StringComparison.Ordinal))
            {
                File.WriteAllText(indexFile, updated);
                logger.LogInformation("Removed the direct Media Preview injection from {IndexFile}.", indexFile);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not remove the previous direct Media Preview injection from {IndexFile}.", indexFile);
        }
    }

    private static string? GetIndexFile(
        IApplicationPaths applicationPaths,
        ILogger logger,
        bool logMissing = true)
    {
        if (string.IsNullOrWhiteSpace(applicationPaths.WebPath))
        {
            if (logMissing)
            {
                logger.LogWarning("Jellyfin's web path is unavailable; direct frontend injection cannot be used.");
            }

            return null;
        }

        string indexFile = Path.Combine(applicationPaths.WebPath, "index.html");
        if (!File.Exists(indexFile))
        {
            if (logMissing)
            {
                logger.LogWarning("Jellyfin's web index was not found at {IndexFile}.", indexFile);
            }

            return null;
        }

        return indexFile;
    }
}
