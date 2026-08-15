using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using System.Globalization;

namespace Jellyfin.Plugin.MediaPreview;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private static readonly Guid PluginGuid = Guid.Parse("9f133479-b133-488b-bf88-395524fd955a");
    private const string ConfigurationPageName = "MediaPreviewLegacyConfigPage";

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer, IServerConfigurationManager serverConfigurationManager)
        : base(applicationPaths, xmlSerializer)
    {
        ServerCompatibility.EnsureSupported();
        Instance = this;
        ServerConfigurationManager = serverConfigurationManager;
    }

    public static Plugin? Instance { get; private set; }

    public IServerConfigurationManager ServerConfigurationManager { get; }

    public override string Name => "Media Preview Legacy (10.10.7)";

    public override Guid Id => PluginGuid;

    public override string Description =>
        "Legacy Jellyfin 10.10.7 build of Media Preview.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = ConfigurationPageName,
                EmbeddedResourcePath = string.Format(
                    CultureInfo.InvariantCulture,
                    "{0}.Configuration.configPage.html",
                    GetType().Namespace)
            }
        };
    }
}
