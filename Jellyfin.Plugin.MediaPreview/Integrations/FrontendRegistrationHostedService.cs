using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MediaBrowser.Common.Configuration;

namespace Jellyfin.Plugin.MediaPreview;

public sealed class FrontendRegistrationHostedService : BackgroundService
{
    private const int MaxAttempts = 12;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);
    private readonly ILogger<FrontendRegistrationHostedService> _logger;
    private readonly FrontendInjectionAvailabilityService _availability;
    private readonly IApplicationPaths _applicationPaths;

    public FrontendRegistrationHostedService(
        ILogger<FrontendRegistrationHostedService> logger,
        FrontendInjectionAvailabilityService availability,
        IApplicationPaths applicationPaths)
    {
        _logger = logger;
        _availability = availability;
        _applicationPaths = applicationPaths;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        for (int attempt = 1; attempt <= MaxAttempts && !stoppingToken.IsCancellationRequested; attempt += 1)
        {
            FrontendInjectionAvailability availability = _availability.GetAvailability();
            if (!availability.PluginDiscoveryComplete && attempt < MaxAttempts)
            {
                _logger.LogDebug(
                    "Waiting for Jellyfin plugin discovery before selecting a frontend injection method (attempt {Attempt}/{MaxAttempts}).",
                    attempt,
                    MaxAttempts);
                await Task.Delay(RetryDelay, stoppingToken);
                continue;
            }

            if (FrontendRegistration.TryRegisterConfigured(availability, _applicationPaths, _logger))
            {
                return;
            }

            if (attempt < MaxAttempts)
            {
                _logger.LogInformation(
                    "Retrying Media Preview frontend loader registration in {DelaySeconds} seconds (attempt {NextAttempt}/{MaxAttempts}).",
                    RetryDelay.TotalSeconds,
                    attempt + 1,
                    MaxAttempts);

                await Task.Delay(RetryDelay, stoppingToken);
            }
        }

        _logger.LogWarning(
            "Media Preview could not register a frontend loader. Install File Transformation or JavaScript Injector, or grant write access to jellyfin-web/index.html.");
    }
}
