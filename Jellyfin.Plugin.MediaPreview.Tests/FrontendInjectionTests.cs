using System.Reflection;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Jellyfin.Plugin.MediaPreview.Tests;

public sealed class FrontendInjectionTests : IDisposable
{
    private readonly string _temporaryPath = Path.Combine(
        Path.GetTempPath(),
        "media-preview-injection-tests",
        Guid.NewGuid().ToString("N"));

    public FrontendInjectionTests()
    {
        Directory.CreateDirectory(_temporaryPath);
    }

    [Fact]
    public void AutomaticUsesOnlyAvailableMethodsInPriorityOrder()
    {
        FrontendInjectionAvailability availability = new(true, true, true, true);

        IReadOnlyList<string> candidates = FrontendRegistration.GetAutomaticCandidates(availability);

        Assert.Equal(
            [
                FrontendInjectionMethods.FileTransformation,
                FrontendInjectionMethods.JavaScriptInjector,
                FrontendInjectionMethods.Direct
            ],
            candidates);
    }

    [Fact]
    public void AutomaticSkipsInactiveFileTransformation()
    {
        FrontendInjectionAvailability availability = new(true, false, true, true);

        Assert.Equal(
            [FrontendInjectionMethods.JavaScriptInjector, FrontendInjectionMethods.Direct],
            FrontendRegistration.GetAutomaticCandidates(availability));
    }

    [Fact]
    public void AutomaticFallsBackToDirectInjectionWithoutHelperPlugins()
    {
        FrontendInjectionAvailability availability = new(true, false, false, true);

        Assert.Equal(
            [FrontendInjectionMethods.Direct],
            FrontendRegistration.GetAutomaticCandidates(availability));
    }

    [Fact]
    public void ConfigurationNormalizationRetainsDirectInjection()
    {
        PluginConfiguration configuration = PluginConfigurationNormalizer.Normalize(new PluginConfiguration
        {
            FrontendInjectionMethod = FrontendInjectionMethods.Direct
        });

        Assert.Equal(FrontendInjectionMethods.Direct, configuration.FrontendInjectionMethod);
    }

    [Fact]
    public void DirectInjectionIsIdempotentAndReplacesAnExistingMediaPreviewTag()
    {
        string indexFile = Path.Combine(_temporaryPath, "index.html");
        File.WriteAllText(
            indexFile,
            "<html><head></head><body><main></main><script plugin='MediaPreview' src='/old'></script></body></html>");
        IApplicationPaths paths = CreateApplicationPaths();

        Assert.True(DirectScriptInjector.TryInject(paths, NullLogger.Instance));
        string first = File.ReadAllText(indexFile);
        Assert.True(DirectScriptInjector.TryInject(paths, NullLogger.Instance));
        string second = File.ReadAllText(indexFile);

        Assert.Equal(first, second);
        Assert.DoesNotContain("src='/old'", second, StringComparison.Ordinal);
        Assert.Contains("DirectInjection=\"true\"", second, StringComparison.Ordinal);
        Assert.Contains("data-injection-method=\"direct\"", second, StringComparison.Ordinal);
        Assert.Contains("src=\"/media-preview/script\"", second, StringComparison.Ordinal);
        Assert.Equal(1, CountOccurrences(second, "plugin=\"MediaPreview\""));
    }

    [Fact]
    public void DirectInjectionDoesNotModifyAnInvalidIndex()
    {
        string indexFile = Path.Combine(_temporaryPath, "index.html");
        const string contents = "<html><head></head><main>missing body</main></html>";
        File.WriteAllText(indexFile, contents);
        IApplicationPaths paths = CreateApplicationPaths();

        Assert.False(DirectScriptInjector.TryInject(paths, NullLogger.Instance));
        Assert.Equal(contents, File.ReadAllText(indexFile));
    }

    public void Dispose()
    {
        if (Directory.Exists(_temporaryPath))
        {
            Directory.Delete(_temporaryPath, true);
        }

        GC.SuppressFinalize(this);
    }

    private IApplicationPaths CreateApplicationPaths()
    {
        IApplicationPaths paths = DispatchProxy.Create<IApplicationPaths, ApplicationPathsStub>();
        ((ApplicationPathsStub)paths).WebPath = _temporaryPath;
        return paths;
    }

    private static int CountOccurrences(string value, string search)
        => (value.Length - value.Replace(search, string.Empty, StringComparison.Ordinal).Length) / search.Length;

    public class ApplicationPathsStub : DispatchProxy
    {
        public string WebPath { get; set; } = string.Empty;

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
            => targetMethod?.Name == "get_WebPath"
                ? WebPath
                : targetMethod?.ReturnType is { IsValueType: true } returnType
                    ? Activator.CreateInstance(returnType)
                    : null;
    }
}
