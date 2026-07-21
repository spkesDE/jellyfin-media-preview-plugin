namespace Jellyfin.Plugin.MediaPreview.Trailers;

internal static class YouTubeVideoId
{
    private static readonly HashSet<int> UnavailableErrorCodes = [100, 101, 150];

    public static bool IsUnavailableErrorCode(int errorCode) => UnavailableErrorCodes.Contains(errorCode);

    public static bool IsValid(string? videoId)
    {
        return videoId is { Length: 11 }
            && videoId.All(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_');
    }

    public static string? Extract(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)
            || !Uri.TryCreate(url, UriKind.Absolute, out Uri? parsedUrl))
        {
            return null;
        }

        string host = parsedUrl.Host.TrimStart('.').ToLowerInvariant();
        string? candidate = null;

        if (host is "youtu.be" or "www.youtu.be")
        {
            candidate = parsedUrl.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        }
        else if (host is "youtube.com" or "www.youtube.com" or "m.youtube.com" or "youtube-nocookie.com" or "www.youtube-nocookie.com")
        {
            string[] pathSegments = parsedUrl.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (pathSegments.Length >= 2 && pathSegments[0] is "embed" or "shorts" or "live")
            {
                candidate = pathSegments[1];
            }
            else
            {
                candidate = GetQueryParameter(parsedUrl.Query, "v");
            }
        }

        return IsValid(candidate) ? candidate : null;
    }

    private static string? GetQueryParameter(string query, string key)
    {
        foreach (string pair in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            string[] parts = pair.Split('=', 2);
            if (parts.Length == 2 && string.Equals(Uri.UnescapeDataString(parts[0]), key, StringComparison.Ordinal))
            {
                return Uri.UnescapeDataString(parts[1]);
            }
        }

        return null;
    }
}
