using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview;

public sealed class StartupService : IScheduledTask
{
    private readonly ILogger<StartupService> _logger;

    public StartupService(ILogger<StartupService> logger)
    {
        _logger = logger;
    }

    public string Name => "Media Preview Startup";

    public string Key => "Jellyfin.Plugin.MediaPreview.Startup";

    public string Description => "Registers the media preview frontend through JavaScript Injector or File Transformation.";

    public string Category => "Startup Services";

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Registering the Media Preview frontend loader.");
        if (!FrontendRegistration.TryRegisterConfigured(_logger))
        {
            _logger.LogWarning(
                "Media Preview could not register a frontend loader. Install either JavaScript Injector or File Transformation.");
        }

        return Task.CompletedTask;
    }

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        yield return new TaskTriggerInfo
        {
            Type = TaskTriggerInfo.TriggerStartup
        };
    }

}
