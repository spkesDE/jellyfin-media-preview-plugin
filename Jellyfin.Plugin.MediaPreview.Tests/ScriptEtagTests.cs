using System.Text;
using Jellyfin.Plugin.MediaPreview.Api;
using Xunit;

namespace Jellyfin.Plugin.MediaPreview.Tests;

public sealed class ScriptEtagTests
{
    private static readonly byte[] Script = Encoding.UTF8.GetBytes("\"use strict\";(()=>{})();");

    [Fact]
    public void EtagChangesWithConfiguration()
    {
        string first = MediaPreviewController.BuildScriptEtag(Encoding.UTF8.GetBytes("a"), Script);
        string same = MediaPreviewController.BuildScriptEtag(Encoding.UTF8.GetBytes("a"), Script);
        string changed = MediaPreviewController.BuildScriptEtag(Encoding.UTF8.GetBytes("b"), Script);

        Assert.Equal(first, same);
        Assert.NotEqual(first, changed);
        Assert.StartsWith("\"", first, StringComparison.Ordinal);
        Assert.EndsWith("\"", first, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("\"abc\"", true)]
    [InlineData("W/\"abc\"", true)]
    [InlineData("\"xyz\", \"abc\"", true)]
    [InlineData("*", true)]
    [InlineData("\"xyz\"", false)]
    [InlineData("", false)]
    public void IfNoneMatchHonorsListsWeakTagsAndWildcard(string header, bool expected)
    {
        Assert.Equal(expected, MediaPreviewController.IfNoneMatchContains([header], "\"abc\""));
    }
}
