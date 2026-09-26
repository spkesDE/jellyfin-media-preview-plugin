using Jellyfin.Plugin.MediaPreview.Trailers;
using Xunit;

namespace Jellyfin.Plugin.MediaPreview.Tests;

public sealed class YouTubeVideoIdTests
{
    private const string VideoId = "dQw4w9WgXcQ";

    [Theory]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://youtu.be/dQw4w9WgXcQ")]
    [InlineData("https://youtube.com/embed/dQw4w9WgXcQ")]
    [InlineData("https://youtube.com/shorts/dQw4w9WgXcQ")]
    [InlineData("https://youtube.com/live/dQw4w9WgXcQ")]
    [InlineData("https://music.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")]
    public void ExtractSupportsClientUrlMatrix(string url)
    {
        Assert.Equal(VideoId, YouTubeVideoId.Extract(url));
    }

    [Theory]
    [InlineData("https://example.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://youtube.com/watch?v=too-short")]
    [InlineData("https://youtube.com/shorts/too-short")]
    public void ExtractRejectsUnsupportedOrMalformedUrls(string url)
    {
        Assert.Null(YouTubeVideoId.Extract(url));
    }
}
