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

    public string Description => "Registers the media preview frontend injection through the File Transformation plugin.";

    public string Category => "Startup Services";

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Registering Media Preview file transformation.");
        FileTransformationRegistrar.TryRegister(_logger);
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
