using System.Text.Json;
using Jellyfin.Plugin.MediaPreview.Api;
using Jellyfin.Plugin.MediaPreview.Users;
using Xunit;

namespace Jellyfin.Plugin.MediaPreview.Tests;

/// <summary>
/// Jellyfin serializes API bodies with PascalCase names, while the web client uses camelCase.
/// These tests use plain options (PascalCase, case-sensitive) so the JSON shape cannot depend
/// on the host's settings.
/// </summary>
public sealed class UserPreferencesJsonTests
{
    private static readonly JsonSerializerOptions PascalCaseOptions = new();

    [Fact]
    public void ResponseUsesCamelCaseNamesAtEveryLevel()
    {
        UserPreferencesResponse response = new()
        {
            Enabled = true,
            Preferences = new UserPreferences { TrailerAudioEnabled = true, TrailerVolumePercent = 26 },
            Effective = new EffectiveUserPreferences
            {
                TrailerAudioEnabled = true,
                TrailerVolumePercent = 26,
                RememberAudioChanges = true
            },
            Defaults = new EffectiveUserPreferences { TrailerAudioEnabled = true, TrailerVolumePercent = 35 }
        };

        using JsonDocument document = JsonDocument.Parse(JsonSerializer.Serialize(response, PascalCaseOptions));
        JsonElement root = document.RootElement;

        Assert.True(root.GetProperty("effective").GetProperty("trailerAudioEnabled").GetBoolean());
        Assert.Equal(26, root.GetProperty("effective").GetProperty("trailerVolumePercent").GetInt32());
        Assert.True(root.GetProperty("effective").GetProperty("rememberAudioChanges").GetBoolean());
        Assert.Equal(26, root.GetProperty("preferences").GetProperty("trailerVolumePercent").GetInt32());
        Assert.Equal(35, root.GetProperty("defaults").GetProperty("trailerVolumePercent").GetInt32());
    }

    [Fact]
    public void DialogRequestBindsFromCamelCase()
    {
        const string body =
            "{\"preferences\":{\"trailerAudioEnabled\":false,\"trailerVolumePercent\":50,\"rememberAudioChanges\":false}}";

        UserPreferencesUpdateRequest? request = JsonSerializer.Deserialize<UserPreferencesUpdateRequest>(body, PascalCaseOptions);

        Assert.NotNull(request?.Preferences);
        Assert.False(request.Preferences.TrailerAudioEnabled);
        Assert.Equal(50, request.Preferences.TrailerVolumePercent);
        Assert.False(request.Preferences.RememberAudioChanges);
    }
}
