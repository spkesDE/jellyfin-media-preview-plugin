using System.Text.Json;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview.Trailers;

public sealed class UnavailableTrailerStore
{
    private const int CurrentVersion = 1;
    private const int MaximumEntries = 1000;
    private const int MaximumItemIdsPerEntry = 20;
    private static readonly TimeSpan EntryLifetime = TimeSpan.FromDays(30);
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string _filePath;
    private readonly ILogger<UnavailableTrailerStore> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private UnavailableTrailerCache? _cache;

    public UnavailableTrailerStore(
        IApplicationPaths applicationPaths,
        ILogger<UnavailableTrailerStore> logger)
    {
        _filePath = Path.Combine(
            applicationPaths.DataPath,
            "media-preview",
            "unavailable-trailers.json");
        _logger = logger;
    }

    public async Task<IReadOnlyList<string>> GetActiveVideoIdsAsync(CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            UnavailableTrailerCache cache = await GetCacheAsync(cancellationToken).ConfigureAwait(false);
            if (Prune(cache, DateTimeOffset.UtcNow))
            {
                await SaveAsync(cache, cancellationToken).ConfigureAwait(false);
            }

            return cache.Entries
                .Select(entry => entry.VideoId)
                .Order(StringComparer.Ordinal)
                .ToArray();
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task ReportAsync(
        string videoId,
        Guid itemId,
        int errorCode,
        CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            DateTimeOffset now = DateTimeOffset.UtcNow;
            UnavailableTrailerCache cache = await GetCacheAsync(cancellationToken).ConfigureAwait(false);
            Prune(cache, now);

            UnavailableTrailerEntry? entry = cache.Entries.Find(candidate =>
                string.Equals(candidate.VideoId, videoId, StringComparison.Ordinal));
            string normalizedItemId = itemId.ToString("N");

            if (entry is null)
            {
                entry = new UnavailableTrailerEntry
                {
                    VideoId = videoId,
                    ErrorCode = errorCode,
                    FirstSeenUtc = now,
                    LastSeenUtc = now,
                    RetryAfterUtc = now.Add(EntryLifetime),
                    ReportCount = 1,
                    ItemIds = [normalizedItemId]
                };
                cache.Entries.Add(entry);
            }
            else
            {
                entry.ErrorCode = errorCode;
                entry.LastSeenUtc = now;
                entry.RetryAfterUtc = now.Add(EntryLifetime);
                entry.ReportCount = Math.Max(1, entry.ReportCount + 1);
                if (!entry.ItemIds.Contains(normalizedItemId, StringComparer.OrdinalIgnoreCase))
                {
                    entry.ItemIds.Add(normalizedItemId);
                    if (entry.ItemIds.Count > MaximumItemIdsPerEntry)
                    {
                        entry.ItemIds.RemoveAt(0);
                    }
                }
            }

            TrimToMaximumEntries(cache);
            await SaveAsync(cache, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<UnavailableTrailerCache> GetCacheAsync(CancellationToken cancellationToken)
    {
        if (_cache is not null)
        {
            return _cache;
        }

        if (!File.Exists(_filePath))
        {
            _cache = new UnavailableTrailerCache();
            return _cache;
        }

        try
        {
            await using FileStream stream = new FileStream(
                _filePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                4096,
                FileOptions.Asynchronous | FileOptions.SequentialScan);
            UnavailableTrailerCache? loaded = await JsonSerializer.DeserializeAsync<UnavailableTrailerCache>(
                stream,
                SerializerOptions,
                cancellationToken).ConfigureAwait(false);
            _cache = loaded?.Version == CurrentVersion
                ? Normalize(loaded)
                : new UnavailableTrailerCache();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            _logger.LogWarning(ex, "Could not read the unavailable trailer cache at {Path}.", _filePath);
            _cache = new UnavailableTrailerCache();
        }

        return _cache;
    }

    private async Task SaveAsync(UnavailableTrailerCache cache, CancellationToken cancellationToken)
    {
        string directoryPath = Path.GetDirectoryName(_filePath)
            ?? throw new InvalidOperationException("The unavailable trailer cache path has no parent directory.");
        Directory.CreateDirectory(directoryPath);

        string temporaryPath = _filePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (FileStream stream = new FileStream(
                temporaryPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                4096,
                FileOptions.Asynchronous | FileOptions.WriteThrough))
            {
                await JsonSerializer.SerializeAsync(
                    stream,
                    cache,
                    SerializerOptions,
                    cancellationToken).ConfigureAwait(false);
                await stream.FlushAsync(cancellationToken).ConfigureAwait(false);
            }

            File.Move(temporaryPath, _filePath, true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogError(ex, "Could not persist the unavailable trailer cache at {Path}.", _filePath);
            throw;
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }
        }
    }

    private static UnavailableTrailerCache Normalize(UnavailableTrailerCache cache)
    {
        cache.Entries = (cache.Entries ?? [])
            .OfType<UnavailableTrailerEntry>()
            .Where(entry => YouTubeVideoId.IsValid(entry.VideoId))
            .Where(entry => YouTubeVideoId.IsUnavailableErrorCode(entry.ErrorCode))
            .GroupBy(entry => entry.VideoId, StringComparer.Ordinal)
            .Select(group => group.OrderByDescending(entry => entry.LastSeenUtc).First())
            .ToList();

        foreach (UnavailableTrailerEntry entry in cache.Entries)
        {
            entry.ItemIds = (entry.ItemIds ?? [])
                .Where(itemId => Guid.TryParse(itemId, out _))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .TakeLast(MaximumItemIdsPerEntry)
                .ToList();
            entry.ReportCount = Math.Max(1, entry.ReportCount);
        }

        TrimToMaximumEntries(cache);
        return cache;
    }

    private static bool Prune(UnavailableTrailerCache cache, DateTimeOffset now)
    {
        int removed = cache.Entries.RemoveAll(entry => entry.RetryAfterUtc <= now);
        int countBeforeTrim = cache.Entries.Count;
        TrimToMaximumEntries(cache);
        return removed > 0 || cache.Entries.Count != countBeforeTrim;
    }

    private static void TrimToMaximumEntries(UnavailableTrailerCache cache)
    {
        if (cache.Entries.Count <= MaximumEntries)
        {
            return;
        }

        cache.Entries = cache.Entries
            .OrderByDescending(entry => entry.LastSeenUtc)
            .Take(MaximumEntries)
            .ToList();
    }

    private sealed class UnavailableTrailerCache
    {
        public int Version { get; set; } = CurrentVersion;

        public List<UnavailableTrailerEntry> Entries { get; set; } = [];
    }

    private sealed class UnavailableTrailerEntry
    {
        public string VideoId { get; set; } = string.Empty;

        public int ErrorCode { get; set; }

        public DateTimeOffset FirstSeenUtc { get; set; }

        public DateTimeOffset LastSeenUtc { get; set; }

        public DateTimeOffset RetryAfterUtc { get; set; }

        public int ReportCount { get; set; }

        public List<string> ItemIds { get; set; } = [];
    }
}
