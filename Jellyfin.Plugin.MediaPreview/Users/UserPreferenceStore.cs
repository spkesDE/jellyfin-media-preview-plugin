using System.Text.Json;
using System.Text.Json.Serialization;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaPreview.Users;

/// <summary>
/// Persists per-user Media Preview settings (preview audio, source, hover delay, on/off) in a small JSON file.
/// Values that are <c>null</c> follow the server-wide defaults from the plugin configuration.
/// </summary>
public sealed class UserPreferenceStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string _filePath;
    private readonly ILogger<UserPreferenceStore> _logger;
    private readonly object _syncRoot = new();
    private Dictionary<string, UserPreferences>? _preferences;

    public UserPreferenceStore(IApplicationPaths applicationPaths, ILogger<UserPreferenceStore> logger)
        : this(
            Path.Combine(applicationPaths.PluginConfigurationsPath, "Jellyfin.Plugin.MediaPreview", "user-preferences.json"),
            logger)
    {
    }

    internal UserPreferenceStore(string filePath, ILogger<UserPreferenceStore> logger)
    {
        _filePath = filePath;
        _logger = logger;
    }

    public UserPreferences Get(Guid userId)
    {
        lock (_syncRoot)
        {
            EnsureLoaded();
            return _preferences!.TryGetValue(ToKey(userId), out UserPreferences? value)
                ? value.Copy()
                : new UserPreferences();
        }
    }

    public void Set(Guid userId, UserPreferences preferences)
        => Update(userId, _ => preferences);

    /// <summary>
    /// Reads, changes and writes one user's entry under a single lock, so two saves that arrive
    /// at the same time cannot overwrite each other. An empty result removes the entry.
    /// </summary>
    public UserPreferences Update(Guid userId, Func<UserPreferences, UserPreferences> change)
    {
        lock (_syncRoot)
        {
            EnsureLoaded();
            string key = ToKey(userId);
            UserPreferences current = _preferences!.TryGetValue(key, out UserPreferences? stored)
                ? stored.Copy()
                : new UserPreferences();
            UserPreferences updated = change(current).Normalize();
            if (updated.IsEmpty())
            {
                if (_preferences.Remove(key))
                {
                    Save();
                }
            }
            else
            {
                _preferences[key] = updated;
                Save();
            }

            return updated.Copy();
        }
    }

    public void Remove(Guid userId)
    {
        lock (_syncRoot)
        {
            EnsureLoaded();
            if (_preferences!.Remove(ToKey(userId)))
            {
                Save();
            }
        }
    }

    private static string ToKey(Guid userId) => userId.ToString("N");

    private void EnsureLoaded()
    {
        if (_preferences is not null)
        {
            return;
        }

        _preferences = new Dictionary<string, UserPreferences>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(_filePath))
        {
            return;
        }

        try
        {
            Dictionary<string, UserPreferences>? loaded = JsonSerializer.Deserialize<Dictionary<string, UserPreferences>>(
                File.ReadAllText(_filePath),
                SerializerOptions);
            if (loaded is null)
            {
                return;
            }

            foreach ((string key, UserPreferences value) in loaded)
            {
                if (Guid.TryParse(key, out Guid userId) && value is not null)
                {
                    _preferences[ToKey(userId)] = value.Normalize();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read Media Preview user preferences; starting with an empty store.");
        }
    }

    private void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
            string temporaryPath = _filePath + ".tmp";
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(_preferences, SerializerOptions));
            File.Move(temporaryPath, _filePath, true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not persist Media Preview user preferences.");
        }
    }
}

/// <remarks>
/// Property names are fixed to camelCase: Jellyfin serializes API responses with PascalCase,
/// and the web client reads camelCase.
/// </remarks>
public sealed class UserPreferences
{
    [JsonPropertyName("trailerAudioEnabled")]
    public bool? TrailerAudioEnabled { get; set; }

    [JsonPropertyName("trailerVolumePercent")]
    public int? TrailerVolumePercent { get; set; }

    /// <summary>
    /// Whether mute and volume changes made on a preview are saved automatically. When off they
    /// last until the page is reloaded and then return to the values above.
    /// </summary>
    [JsonPropertyName("rememberAudioChanges")]
    public bool? RememberAudioChanges { get; set; }

    /// <summary>Whether this user sees previews at all; <c>null</c> means yes.</summary>
    [JsonPropertyName("previewEnabled")]
    public bool? PreviewEnabled { get; set; }

    /// <summary>
    /// The user's preferred source (for example <c>trickplay</c> or <c>prefer-trailer</c>);
    /// <c>null</c> or <c>inherit</c> follows the administrator's rules.
    /// </summary>
    [JsonPropertyName("previewSource")]
    public string? PreviewSource { get; set; }

    [JsonPropertyName("hoverDelayMs")]
    public int? HoverDelayMs { get; set; }

    internal const int MaximumHoverDelayMs = 5000;

    internal static readonly HashSet<string> AllowedPreviewSources = new(StringComparer.Ordinal)
    {
        "trickplay",
        "trailer",
        "direct-play",
        "prefer-trickplay",
        "prefer-trailer",
        "prefer-direct-play"
    };

    internal UserPreferences Copy() => new()
    {
        TrailerAudioEnabled = TrailerAudioEnabled,
        TrailerVolumePercent = TrailerVolumePercent,
        RememberAudioChanges = RememberAudioChanges,
        PreviewEnabled = PreviewEnabled,
        PreviewSource = PreviewSource,
        HoverDelayMs = HoverDelayMs
    };

    internal UserPreferences Normalize() => new()
    {
        TrailerAudioEnabled = TrailerAudioEnabled,
        TrailerVolumePercent = TrailerVolumePercent.HasValue ? Math.Clamp(TrailerVolumePercent.Value, 0, 100) : null,
        RememberAudioChanges = RememberAudioChanges,
        PreviewEnabled = PreviewEnabled,
        PreviewSource = PreviewSource is not null && AllowedPreviewSources.Contains(PreviewSource) ? PreviewSource : null,
        HoverDelayMs = HoverDelayMs.HasValue ? Math.Clamp(HoverDelayMs.Value, 0, MaximumHoverDelayMs) : null
    };

    internal bool IsEmpty()
        => !TrailerAudioEnabled.HasValue
            && !TrailerVolumePercent.HasValue
            && !RememberAudioChanges.HasValue
            && !PreviewEnabled.HasValue
            && PreviewSource is null
            && !HoverDelayMs.HasValue;

    /// <summary>Returns a copy with the given audio values replaced; <c>null</c> keeps the stored value.</summary>
    internal UserPreferences WithAudio(bool? trailerAudioEnabled, int? trailerVolumePercent)
    {
        UserPreferences copy = Copy();
        copy.TrailerAudioEnabled = trailerAudioEnabled ?? TrailerAudioEnabled;
        copy.TrailerVolumePercent = trailerVolumePercent ?? TrailerVolumePercent;
        return copy;
    }
}

public sealed class EffectiveUserPreferences
{
    [JsonPropertyName("trailerAudioEnabled")]
    public bool TrailerAudioEnabled { get; init; }

    [JsonPropertyName("trailerVolumePercent")]
    public int TrailerVolumePercent { get; init; }

    [JsonPropertyName("rememberAudioChanges")]
    public bool RememberAudioChanges { get; init; }

    [JsonPropertyName("previewEnabled")]
    public bool PreviewEnabled { get; init; } = true;

    [JsonPropertyName("previewSource")]
    public string PreviewSource { get; init; } = "inherit";

    [JsonPropertyName("hoverDelayMs")]
    public int HoverDelayMs { get; init; }

    internal static EffectiveUserPreferences FromDefaults(PluginConfiguration config) => new()
    {
        TrailerAudioEnabled = config.TrailerAudioEnabled,
        TrailerVolumePercent = config.TrailerVolumePercent,
        RememberAudioChanges = config.UserAudioPreferencesEnabled,
        PreviewEnabled = true,
        PreviewSource = "inherit",
        HoverDelayMs = config.HoverDelayMs
    };

    /// <summary>
    /// Applies a user's saved values on top of the server defaults. When saving is turned off,
    /// stored values are kept but ignored.
    /// </summary>
    internal static EffectiveUserPreferences Resolve(PluginConfiguration config, UserPreferences preferences)
    {
        if (!config.UserAudioPreferencesEnabled)
        {
            return FromDefaults(config);
        }

        return new EffectiveUserPreferences
        {
            TrailerAudioEnabled = preferences.TrailerAudioEnabled ?? config.TrailerAudioEnabled,
            TrailerVolumePercent = preferences.TrailerVolumePercent ?? config.TrailerVolumePercent,
            RememberAudioChanges = preferences.RememberAudioChanges ?? true,
            PreviewEnabled = preferences.PreviewEnabled ?? true,
            PreviewSource = preferences.PreviewSource ?? "inherit",
            HoverDelayMs = preferences.HoverDelayMs ?? config.HoverDelayMs
        };
    }
}
