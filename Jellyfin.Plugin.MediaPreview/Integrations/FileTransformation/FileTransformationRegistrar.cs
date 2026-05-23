using System.Reflection;
using System.Runtime.Loader;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.MediaPreview;

internal static class FileTransformationRegistrar
{
    internal const string TransformationId = "0d7f04d6-ef8b-48d1-8fcf-cc1655d89b9d";
    private const string FileTransformationInterfaceTypeName = "Jellyfin.Plugin.FileTransformation.PluginInterface";

    public static bool TryRegister(ILogger logger)
    {
        try
        {
            JObject payload = new JObject
            {
                { "id", TransformationId },
                { "fileNamePattern", "index.html" },
                { "callbackAssembly", typeof(FileTransformationRegistrar).Assembly.FullName },
                { "callbackClass", typeof(Transformations).FullName },
                { "callbackMethod", nameof(Transformations.IndexTransformation) }
            };

            Assembly? fileTransformationAssembly = AssemblyLoadContext.All
                .SelectMany(context => context.Assemblies)
                .FirstOrDefault(assembly => assembly.FullName?.Contains(".FileTransformation", StringComparison.OrdinalIgnoreCase) ?? false);

            if (fileTransformationAssembly is null)
            {
                logger.LogWarning("File Transformation plugin was not found. Media Preview registration will be retried.");
                return false;
            }

            Type? pluginInterfaceType = fileTransformationAssembly.GetType(FileTransformationInterfaceTypeName);
            if (pluginInterfaceType is null)
            {
                logger.LogWarning("File Transformation plugin interface was not found. Media Preview registration will be retried.");
                return false;
            }

            MethodInfo? registerTransformationMethod = pluginInterfaceType.GetMethod("RegisterTransformation");
            if (registerTransformationMethod is null)
            {
                logger.LogWarning("RegisterTransformation method was not found on the File Transformation plugin interface.");
                return false;
            }

            registerTransformationMethod.Invoke(null, new object?[] { payload });
            logger.LogInformation("Media Preview successfully registered its File Transformation patch.");
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to register Media Preview with the File Transformation plugin.");
            return false;
        }
    }
}
