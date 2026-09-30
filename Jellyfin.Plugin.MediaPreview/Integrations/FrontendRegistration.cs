using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview;

internal static class FrontendRegistration
{
    internal static bool LastRegistrationSucceeded { get; private set; }

    internal static string ActiveMethod { get; private set; } = "none";

    internal static bool TryRegisterConfigured(
        FrontendInjectionAvailability availability,
        IApplicationPaths applicationPaths,
        ILogger logger)
    {
        PluginConfiguration configuration = PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);

        bool succeeded;
        string activeMethod;

        switch (configuration.FrontendInjectionMethod)
        {
            case FrontendInjectionMethods.FileTransformation:
                if (!availability.FileTransformation)
                {
                    succeeded = false;
                    activeMethod = "none";
                    break;
                }

                JavaScriptInjectorRegistrar.TrySetEnabled(logger, false);
                succeeded = FileTransformationRegistrar.TryRegister(logger);
                activeMethod = succeeded ? FrontendInjectionMethods.FileTransformation : "none";
                if (succeeded)
                {
                    DirectScriptInjector.TryRemove(applicationPaths, logger);
                }

                break;

            case FrontendInjectionMethods.JavaScriptInjector:
                if (!availability.JavaScriptInjector)
                {
                    succeeded = false;
                    activeMethod = "none";
                    break;
                }

                succeeded = JavaScriptInjectorRegistrar.TryRegister(logger);
                activeMethod = succeeded ? FrontendInjectionMethods.JavaScriptInjector : "none";
                if (succeeded)
                {
                    DirectScriptInjector.TryRemove(applicationPaths, logger);
                }

                break;

            case FrontendInjectionMethods.Direct:
                JavaScriptInjectorRegistrar.TrySetEnabled(logger, false);
                succeeded = availability.Direct && DirectScriptInjector.TryInject(applicationPaths, logger);
                activeMethod = succeeded ? FrontendInjectionMethods.Direct : "none";
                break;

            default:
                succeeded = false;
                activeMethod = "none";
                foreach (string candidate in GetAutomaticCandidates(availability))
                {
                    if (candidate == FrontendInjectionMethods.FileTransformation
                        && FileTransformationRegistrar.TryRegister(logger))
                    {
                        JavaScriptInjectorRegistrar.TrySetEnabled(logger, false);
                        DirectScriptInjector.TryRemove(applicationPaths, logger);
                        succeeded = true;
                        activeMethod = candidate;
                        break;
                    }

                    if (candidate == FrontendInjectionMethods.JavaScriptInjector
                        && JavaScriptInjectorRegistrar.TryRegister(logger))
                    {
                        DirectScriptInjector.TryRemove(applicationPaths, logger);
                        succeeded = true;
                        activeMethod = candidate;
                        break;
                    }

                    if (candidate == FrontendInjectionMethods.Direct)
                    {
                        JavaScriptInjectorRegistrar.TrySetEnabled(logger, false);
                        succeeded = DirectScriptInjector.TryInject(applicationPaths, logger);
                        activeMethod = succeeded ? candidate : "none";
                        break;
                    }
                }

                break;
        }

        LastRegistrationSucceeded = succeeded;
        ActiveMethod = activeMethod;
        return succeeded;
    }

    internal static IReadOnlyList<string> GetAutomaticCandidates(FrontendInjectionAvailability availability)
    {
        List<string> candidates = [];
        if (availability.FileTransformation)
        {
            candidates.Add(FrontendInjectionMethods.FileTransformation);
        }

        if (availability.JavaScriptInjector)
        {
            candidates.Add(FrontendInjectionMethods.JavaScriptInjector);
        }

        if (availability.Direct)
        {
            candidates.Add(FrontendInjectionMethods.Direct);
        }

        return candidates;
    }
}
