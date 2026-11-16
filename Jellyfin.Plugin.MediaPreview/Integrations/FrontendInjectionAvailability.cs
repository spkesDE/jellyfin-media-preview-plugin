using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview;

internal sealed record FrontendInjectionAvailability(
    bool PluginDiscoveryComplete,
    bool FileTransformation,
    bool JavaScriptInjector,
    bool Direct);

public sealed class FrontendInjectionAvailabilityService
{
    private const string FileTransformationAssembly = "Jellyfin.Plugin.FileTransformation";
    private const string JavaScriptInjectorAssembly = "Jellyfin.Plugin.JavaScriptInjector";
    private readonly IServerApplicationHost _applicationHost;
    private readonly IPluginManager _pluginManager;
    private readonly IApplicationPaths _applicationPaths;
    private readonly ILogger<FrontendInjectionAvailabilityService> _logger;

    public FrontendInjectionAvailabilityService(
        IServerApplicationHost applicationHost,
        IPluginManager pluginManager,
        IApplicationPaths applicationPaths,
        ILogger<FrontendInjectionAvailabilityService> logger)
    {
        _applicationHost = applicationHost;
        _pluginManager = pluginManager;
        _applicationPaths = applicationPaths;
        _logger = logger;
    }

    internal FrontendInjectionAvailability GetAvailability()
    {
        (bool fileTransformation, bool javaScriptInjector) = GetActiveHelperPlugins();
        return new FrontendInjectionAvailability(
            _applicationHost.CoreStartupHasCompleted,
            fileTransformation && FileTransformationRegistrar.IsAvailable(),
            javaScriptInjector && JavaScriptInjectorRegistrar.IsAvailable(),
            DirectScriptInjector.IsAvailable(_applicationPaths));
    }

    private (bool FileTransformation, bool JavaScriptInjector) GetActiveHelperPlugins()
    {
        try
        {
            bool IsActive(string assemblyName) => _pluginManager.Plugins.Any(plugin =>
                plugin.IsEnabledAndSupported
                && (string.Equals(
                        plugin.Instance?.GetType().Assembly.GetName().Name,
                        assemblyName,
                        StringComparison.OrdinalIgnoreCase)
                    || plugin.DllFiles.Any(file => string.Equals(
                        Path.GetFileNameWithoutExtension(file),
                        assemblyName,
                        StringComparison.OrdinalIgnoreCase))));

            return (IsActive(FileTransformationAssembly), IsActive(JavaScriptInjectorAssembly));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Jellyfin's plugin API could not be queried while checking frontend injection helpers.");
            return (false, false);
        }
    }
}
