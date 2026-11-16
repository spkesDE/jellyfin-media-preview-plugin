using MediaBrowser.Model.Tasks;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview;

public sealed class StartupService : IScheduledTask
{
    private readonly ILogger<StartupService> _logger;
    private readonly FrontendInjectionAvailabilityService _availability;
    private readonly IApplicationPaths _applicationPaths;

    public StartupService(
        ILogger<StartupService> logger,
        FrontendInjectionAvailabilityService availability,
        IApplicationPaths applicationPaths)
    {
        _logger = logger;
        _availability = availability;
        _applicationPaths = applicationPaths;
    }

    public string Name => "Media Preview Startup";

    public string Key => "Jellyfin.Plugin.MediaPreview.Startup";

    public string Description => "Registers the Media Preview frontend through File Transformation, JavaScript Injector, or direct injection.";

    public string Category => "Startup Services";

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Registering the Media Preview frontend loader.");
        FrontendInjectionAvailability availability = _availability.GetAvailability();
        if (!availability.PluginDiscoveryComplete)
        {
            _logger.LogInformation("Plugin discovery is still running; the hosted registration service will select the frontend loader.");
            return Task.CompletedTask;
        }

        if (!FrontendRegistration.TryRegisterConfigured(availability, _applicationPaths, _logger))
        {
            _logger.LogWarning(
                "Media Preview could not register a frontend loader. Install File Transformation or JavaScript Injector, or grant write access to jellyfin-web/index.html.");
        }

        return Task.CompletedTask;
    }

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        yield return new TaskTriggerInfo
        {
            Type = TaskTriggerInfoType.StartupTrigger
        };
    }

}
