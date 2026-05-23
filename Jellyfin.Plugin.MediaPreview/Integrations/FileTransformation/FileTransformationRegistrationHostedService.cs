using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview;

public sealed class FileTransformationRegistrationHostedService : BackgroundService
{
    private const int MaxAttempts = 12;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);
    private readonly ILogger<FileTransformationRegistrationHostedService> _logger;

    public FileTransformationRegistrationHostedService(ILogger<FileTransformationRegistrationHostedService> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        for (int attempt = 1; attempt <= MaxAttempts && !stoppingToken.IsCancellationRequested; attempt += 1)
        {
            if (FileTransformationRegistrar.TryRegister(_logger))
            {
                return;
            }

            if (attempt < MaxAttempts)
            {
                _logger.LogInformation(
                    "Retrying Media Preview File Transformation registration in {DelaySeconds} seconds (attempt {NextAttempt}/{MaxAttempts}).",
                    RetryDelay.TotalSeconds,
                    attempt + 1,
                    MaxAttempts);

                await Task.Delay(RetryDelay, stoppingToken);
            }
        }

        _logger.LogWarning("Media Preview could not register its File Transformation patch after repeated retries.");
    }
}
