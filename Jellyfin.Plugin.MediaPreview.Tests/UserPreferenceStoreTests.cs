using Jellyfin.Plugin.MediaPreview.Users;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Jellyfin.Plugin.MediaPreview.Tests;

public sealed class UserPreferenceStoreTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "media-preview-tests", Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, true);
        }
    }

    private UserPreferenceStore CreateStore()
        => new(Path.Combine(_directory, "user-preferences.json"), NullLogger<UserPreferenceStore>.Instance);

    [Fact]
    public void SavedPreferencesSurviveReload()
    {
        Guid userId = Guid.NewGuid();
        CreateStore().Set(userId, new UserPreferences { TrailerAudioEnabled = true, TrailerVolumePercent = 150 });

        UserPreferences loaded = CreateStore().Get(userId);

        Assert.True(loaded.TrailerAudioEnabled);
        Assert.Equal(100, loaded.TrailerVolumePercent);
    }

    [Fact]
    public void PreviewSettingsAreValidatedAndKeptByAudioUpdates()
    {
        Guid userId = Guid.NewGuid();
        UserPreferenceStore store = CreateStore();
        store.Set(userId, new UserPreferences
        {
            PreviewEnabled = false,
            PreviewSource = "prefer-trailer",
            HoverDelayMs = 99999
        });
        store.Update(userId, current => current.WithAudio(true, 40));

        UserPreferences loaded = CreateStore().Get(userId);
        Assert.False(loaded.PreviewEnabled);
        Assert.Equal("prefer-trailer", loaded.PreviewSource);
        Assert.Equal(UserPreferences.MaximumHoverDelayMs, loaded.HoverDelayMs);
        Assert.Equal(40, loaded.TrailerVolumePercent);

        store.Set(userId, new UserPreferences { PreviewSource = "<script>" });
        Assert.Null(store.Get(userId).PreviewSource);
    }

    [Fact]
    public void PreviewSettingsFallBackToServerDefaults()
    {
        PluginConfiguration config = new() { HoverDelayMs = 450 };

        EffectiveUserPreferences unset = EffectiveUserPreferences.Resolve(config, new UserPreferences());
        Assert.True(unset.PreviewEnabled);
        Assert.Equal("inherit", unset.PreviewSource);
        Assert.Equal(450, unset.HoverDelayMs);

        EffectiveUserPreferences set = EffectiveUserPreferences.Resolve(
            config,
            new UserPreferences { PreviewEnabled = false, PreviewSource = "trickplay", HoverDelayMs = 100 });
        Assert.False(set.PreviewEnabled);
        Assert.Equal("trickplay", set.PreviewSource);
        Assert.Equal(100, set.HoverDelayMs);

        config.UserAudioPreferencesEnabled = false;
        Assert.True(EffectiveUserPreferences.Resolve(config, new UserPreferences { PreviewEnabled = false }).PreviewEnabled);
    }

    [Fact]
    public void EmptyPreferencesRemoveTheUser()
    {
        Guid userId = Guid.NewGuid();
        UserPreferenceStore store = CreateStore();
        store.Set(userId, new UserPreferences { TrailerAudioEnabled = false });
        store.Set(userId, new UserPreferences());

        Assert.True(CreateStore().Get(userId).IsEmpty());
    }

    [Fact]
    public void UsersAreStoredIndependently()
    {
        Guid first = Guid.NewGuid();
        Guid second = Guid.NewGuid();
        UserPreferenceStore store = CreateStore();
        store.Set(first, new UserPreferences { TrailerAudioEnabled = true });
        store.Set(second, new UserPreferences { TrailerAudioEnabled = false });
        store.Remove(first);

        UserPreferenceStore reloaded = CreateStore();
        Assert.Null(reloaded.Get(first).TrailerAudioEnabled);
        Assert.False(reloaded.Get(second).TrailerAudioEnabled);
    }

    [Fact]
    public void EffectivePreferencesFallBackToServerDefaults()
    {
        PluginConfiguration config = new() { TrailerAudioEnabled = false, TrailerVolumePercent = 40 };

        EffectiveUserPreferences partial = EffectiveUserPreferences.Resolve(
            config,
            new UserPreferences { TrailerAudioEnabled = true });

        Assert.True(partial.TrailerAudioEnabled);
        Assert.Equal(40, partial.TrailerVolumePercent);
    }

    [Fact]
    public void DisabledUserSettingsIgnoreSavedPreferences()
    {
        PluginConfiguration config = new()
        {
            TrailerAudioEnabled = false,
            TrailerVolumePercent = 40,
            UserAudioPreferencesEnabled = false
        };

        EffectiveUserPreferences effective = EffectiveUserPreferences.Resolve(
            config,
            new UserPreferences { TrailerAudioEnabled = true, TrailerVolumePercent = 90 });

        Assert.False(effective.TrailerAudioEnabled);
        Assert.Equal(40, effective.TrailerVolumePercent);
    }

    [Fact]
    public void AudioUpdatesKeepFieldsThatWereNotSent()
    {
        Guid userId = Guid.NewGuid();
        UserPreferenceStore store = CreateStore();
        store.Set(userId, new UserPreferences { TrailerAudioEnabled = false, TrailerVolumePercent = 60 });

        store.Update(userId, current => current.WithAudio(true, null));

        UserPreferences loaded = CreateStore().Get(userId);
        Assert.True(loaded.TrailerAudioEnabled);
        Assert.Equal(60, loaded.TrailerVolumePercent);
    }

    [Fact]
    public void ConcurrentAudioUpdatesAreNotLost()
    {
        Guid userId = Guid.NewGuid();
        UserPreferenceStore store = CreateStore();

        Parallel.Invoke(
            () => store.Update(userId, current => current.WithAudio(true, null)),
            () => store.Update(userId, current => current.WithAudio(null, 25)));

        UserPreferences loaded = CreateStore().Get(userId);
        Assert.True(loaded.TrailerAudioEnabled);
        Assert.Equal(25, loaded.TrailerVolumePercent);
    }

    [Fact]
    public void AutomaticSavingIsOnUnlessTheUserTurnsItOff()
    {
        PluginConfiguration config = new();

        Assert.True(EffectiveUserPreferences.Resolve(config, new UserPreferences()).RememberAudioChanges);
        Assert.False(EffectiveUserPreferences.Resolve(
            config,
            new UserPreferences { RememberAudioChanges = false }).RememberAudioChanges);
    }

    [Fact]
    public void AudioUpdatesKeepTheAutomaticSavingChoice()
    {
        UserPreferences stored = new() { RememberAudioChanges = false };

        Assert.False(stored.WithAudio(true, 50).RememberAudioChanges);
    }
}
