using System.Reflection;
using System.Runtime.Loader;
using MediaBrowser.Common.Net;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.MediaPreview;

internal static class JavaScriptInjectorRegistrar
{
    internal const string ScriptId = "2c2ee6c1-bcd7-48e4-a7e8-e6b4d77d3df2-media-preview";
    private const string JavaScriptInjectorAssemblyName = "Jellyfin.Plugin.JavaScriptInjector";
    private const string JavaScriptInjectorInterfaceTypeName = "Jellyfin.Plugin.JavaScriptInjector.PluginInterface";

    internal static bool IsAvailable() => FindRegisterMethod() is not null;

    public static bool TryRegister(ILogger logger)
    {
        return TrySetEnabled(logger, true);
    }

    internal static bool TrySetEnabled(ILogger logger, bool enabled)
    {
        try
        {
            Plugin? plugin = Plugin.Instance;
            if (plugin is null)
            {
                logger.LogWarning("Media Preview plugin instance was not available for JavaScript Injector registration.");
                return false;
            }

            MethodInfo? registerScriptMethod = FindRegisterMethod();
            if (registerScriptMethod is null)
            {
                logger.LogDebug("JavaScript Injector is not available for Media Preview.");
                return false;
            }

            JObject payload = new JObject
            {
                { "id", ScriptId },
                { "name", "Media Preview loader" },
                { "script", BuildLoaderScript() },
                { "enabled", enabled },
                { "requiresAuthentication", false },
                { "pluginId", plugin.Id.ToString() },
                { "pluginName", plugin.Name },
                { "pluginVersion", typeof(JavaScriptInjectorRegistrar).Assembly.GetName().Version?.ToString() ?? string.Empty }
            };

            object? registerResult = registerScriptMethod.Invoke(null, new object?[] { payload });
            if (registerResult is not true)
            {
                logger.LogWarning("JavaScript Injector rejected the Media Preview loader registration.");
                return false;
            }

            logger.LogInformation(
                "Media Preview successfully {LoaderState} its JavaScript Injector loader.",
                enabled ? "enabled" : "disabled");
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to register Media Preview with the JavaScript Injector plugin.");
            return false;
        }
    }

    private static MethodInfo? FindRegisterMethod()
    {
        Assembly? assembly = AssemblyLoadContext.All
            .SelectMany(context => context.Assemblies)
            .FirstOrDefault(candidate =>
                candidate.FullName?.Contains(JavaScriptInjectorAssemblyName, StringComparison.OrdinalIgnoreCase) ?? false);
        return assembly?.GetType(JavaScriptInjectorInterfaceTypeName)?.GetMethod("RegisterScript");
    }

    internal static string BuildLoaderScript()
    {
        string basePath = string.Empty;
        NetworkConfiguration? networkConfiguration = Plugin.Instance?.ServerConfigurationManager.GetNetworkConfiguration();
        if (!string.IsNullOrWhiteSpace(networkConfiguration?.BaseUrl))
        {
            basePath = "/" + networkConfiguration.BaseUrl.Trim().Trim('/');
        }

        string scriptUrl = JsonConvert.SerializeObject($"{basePath}/media-preview/script");

        return $$"""
            (() => {
                'use strict';

                if (window.JellyfinMediaPreview
                    || document.querySelector('script[plugin="MediaPreview"], script[data-plugin="MediaPreview"]')) {
                    return;
                }

                const script = document.createElement('script');
                script.async = false;
                script.dataset.plugin = 'MediaPreview';
                script.dataset.injectionMethod = 'javascript-injector';
                script.src = {{scriptUrl}};
                (document.head || document.documentElement).appendChild(script);
            })();
            """;
    }
}
