using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using System.Globalization;

namespace Jellyfin.Plugin.MediaPreview;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private static readonly Guid PluginGuid = Guid.Parse("2c2ee6c1-bcd7-48e4-a7e8-e6b4d77d3df2");
    private const string ConfigurationPageName = "MediaPreviewConfigPage";

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer, IServerConfigurationManager serverConfigurationManager)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
        ServerConfigurationManager = serverConfigurationManager;
    }

    public static Plugin? Instance { get; private set; }

    public IServerConfigurationManager ServerConfigurationManager { get; }

    public override string Name => "Media Preview";

    public override Guid Id => PluginGuid;

    public override string Description =>
        "Injects a Jellyfin Web media preview for movie and episode cards using native Trickplay thumbnails.";

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
