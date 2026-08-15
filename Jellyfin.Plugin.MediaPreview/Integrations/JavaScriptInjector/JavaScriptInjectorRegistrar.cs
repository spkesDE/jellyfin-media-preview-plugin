using System.Reflection;
using System.Runtime.Loader;
using MediaBrowser.Common.Net;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.MediaPreview;

internal static class JavaScriptInjectorRegistrar
{
    internal const string ScriptId = "9f133479-b133-488b-bf88-395524fd955a-media-preview-legacy";
    private const string JavaScriptInjectorAssemblyName = "Jellyfin.Plugin.JavaScriptInjector";
    private const string JavaScriptInjectorInterfaceTypeName = "Jellyfin.Plugin.JavaScriptInjector.PluginInterface";

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

            Assembly? javaScriptInjectorAssembly = AssemblyLoadContext.All
                .SelectMany(context => context.Assemblies)
                .FirstOrDefault(assembly =>
                    assembly.FullName?.Contains(JavaScriptInjectorAssemblyName, StringComparison.OrdinalIgnoreCase) ?? false);

            if (javaScriptInjectorAssembly is null)
            {
                logger.LogDebug("JavaScript Injector plugin was not found.");
                return false;
            }

            Type? pluginInterfaceType = javaScriptInjectorAssembly.GetType(JavaScriptInjectorInterfaceTypeName);
            if (pluginInterfaceType is null)
            {
                logger.LogWarning("JavaScript Injector plugin interface was not found.");
                return false;
            }

            MethodInfo? registerScriptMethod = pluginInterfaceType.GetMethod("RegisterScript");
            if (registerScriptMethod is null)
            {
                logger.LogWarning("RegisterScript method was not found on the JavaScript Injector plugin interface.");
                return false;
            }

            JObject payload = new JObject
            {
                { "id", ScriptId },
                { "name", "Media Preview Legacy loader" },
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

    internal static string BuildLoaderScript()
    {
        string basePath = string.Empty;
        NetworkConfiguration? networkConfiguration = Plugin.Instance?.ServerConfigurationManager.GetNetworkConfiguration();
        if (!string.IsNullOrWhiteSpace(networkConfiguration?.BaseUrl))
        {
            basePath = "/" + networkConfiguration.BaseUrl.Trim().Trim('/');
        }

        string scriptUrl = JsonConvert.SerializeObject($"{basePath}/media-preview-legacy/script");

        return $$"""
            (() => {
                'use strict';

                if (window.JellyfinMediaPreviewLegacy
                    || document.querySelector('script[plugin="MediaPreviewLegacy"], script[data-plugin="MediaPreviewLegacy"]')) {
                    return;
                }

                const script = document.createElement('script');
                script.async = false;
                script.dataset.plugin = 'MediaPreviewLegacy';
                script.src = {{scriptUrl}};
                (document.head || document.documentElement).appendChild(script);
            })();
            """;
    }
}
