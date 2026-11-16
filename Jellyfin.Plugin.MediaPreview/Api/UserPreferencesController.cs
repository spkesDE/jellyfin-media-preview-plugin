using System.Text.Json.Serialization;
using Jellyfin.Data;
using Jellyfin.Database.Implementations.Enums;
using Jellyfin.Plugin.MediaPreview.Users;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using JellyfinUser = Jellyfin.Database.Implementations.Entities.User;

namespace Jellyfin.Plugin.MediaPreview.Api;

/// <summary>
/// Reads and writes per-user Media Preview settings. Users manage their own entry;
/// administrators may manage any user's entry by passing <c>userId</c>.
/// </summary>
[ApiController]
[Authorize]
[Route("media-preview/preferences")]
public sealed class UserPreferencesController : ControllerBase
{
    private const string UserIdClaimType = "Jellyfin-UserId";
    private readonly IUserManager _userManager;
    private readonly UserPreferenceStore _store;

    public UserPreferencesController(IUserManager userManager, UserPreferenceStore store)
    {
        _userManager = userManager;
        _store = store;
    }

    [HttpGet]
    [ProducesResponseType<UserPreferencesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<UserPreferencesResponse> GetPreferences([FromQuery] Guid? userId = null)
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        JellyfinUser? user = GetPreferencesUser(userId, out ActionResult? error);
        return user is null ? error! : Ok(CreateResponse(user.Id));
    }

    [HttpPut]
    [ProducesResponseType<UserPreferencesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<UserPreferencesResponse> PutPreferences(
        [FromBody] UserPreferencesUpdateRequest? request,
        [FromQuery] Guid? userId = null)
    {
        JellyfinUser? user = GetPreferencesUser(userId, out ActionResult? error);
        if (user is null)
        {
            return error!;
        }

        if (!GetConfiguration().UserAudioPreferencesEnabled)
        {
            return Forbid();
        }

        if (request?.Reset == true)
        {
            _store.Remove(user.Id);
        }
        else if (request?.Preferences is not null)
        {
            _store.Set(user.Id, request.Preferences);
        }
        else
        {
            return BadRequest("The preference update is empty.");
        }

        return Ok(CreateResponse(user.Id));
    }

    /// <summary>
    /// Saves mute or volume straight from a preview's controls. Only the fields that are sent
    /// change; the rest of the stored entry is kept.
    /// </summary>
    [HttpPut("trailer-audio")]
    [ProducesResponseType<UserPreferencesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<UserPreferencesResponse> PutTrailerAudio([FromBody] TrailerAudioUpdateRequest? request)
    {
        JellyfinUser? user = GetActiveUser();
        if (user is null)
        {
            return NotFound();
        }

        if (!GetConfiguration().UserAudioPreferencesEnabled)
        {
            return Forbid();
        }

        if (request is null || (!request.TrailerAudioEnabled.HasValue && !request.TrailerVolumePercent.HasValue))
        {
            return BadRequest("The audio update is empty.");
        }

        if (!EffectiveUserPreferences.Resolve(GetConfiguration(), _store.Get(user.Id)).RememberAudioChanges)
        {
            return Conflict("Automatic saving of mute and volume is turned off for this user.");
        }

        _store.Update(user.Id, current => current.WithAudio(request.TrailerAudioEnabled, request.TrailerVolumePercent));
        return Ok(CreateResponse(user.Id));
    }

    /// <summary>A user may manage their own settings; administrators may manage anyone's.</summary>
    internal static bool CanManage(JellyfinUser activeUser, Guid targetUserId)
        => activeUser.Id == targetUserId || activeUser.HasPermission(PermissionKind.IsAdministrator);

    private JellyfinUser? GetPreferencesUser(Guid? userId, out ActionResult? error)
    {
        error = null;
        JellyfinUser? activeUser = GetActiveUser();
        if (activeUser is null)
        {
            error = NotFound();
            return null;
        }

        if (!userId.HasValue || userId.Value == Guid.Empty || userId.Value == activeUser.Id)
        {
            return activeUser;
        }

        if (!CanManage(activeUser, userId.Value))
        {
            error = Forbid();
            return null;
        }

        JellyfinUser? targetUser = _userManager.GetUserById(userId.Value);
        if (targetUser is null)
        {
            error = NotFound();
        }

        return targetUser;
    }

    private static PluginConfiguration GetConfiguration()
        => PluginConfigurationNormalizer.Normalize(Plugin.Instance?.Configuration);

    private UserPreferencesResponse CreateResponse(Guid userId)
    {
        PluginConfiguration config = GetConfiguration();
        UserPreferences preferences = _store.Get(userId);
        return new UserPreferencesResponse
        {
            Enabled = config.UserAudioPreferencesEnabled,
            Preferences = preferences,
            Effective = EffectiveUserPreferences.Resolve(config, preferences),
            Defaults = EffectiveUserPreferences.FromDefaults(config)
        };
    }

    private JellyfinUser? GetActiveUser()
    {
        string? claimedId = User.FindFirst(UserIdClaimType)?.Value;
        if (Guid.TryParse(claimedId, out Guid activeUserId))
        {
            JellyfinUser? byId = _userManager.GetUserById(activeUserId);
            if (byId is not null)
            {
                return byId;
            }
        }

        string? name = User.Identity?.Name;
        return string.IsNullOrWhiteSpace(name) ? null : _userManager.GetUserByName(name);
    }
}

public sealed class UserPreferencesUpdateRequest
{
    [JsonPropertyName("preferences")]
    public UserPreferences? Preferences { get; set; }

    [JsonPropertyName("reset")]
    public bool Reset { get; set; }
}

public sealed class TrailerAudioUpdateRequest
{
    [JsonPropertyName("trailerAudioEnabled")]
    public bool? TrailerAudioEnabled { get; set; }

    [JsonPropertyName("trailerVolumePercent")]
    public int? TrailerVolumePercent { get; set; }
}

public sealed class UserPreferencesResponse
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; }

    [JsonPropertyName("preferences")]
    public UserPreferences Preferences { get; init; } = new();

    [JsonPropertyName("effective")]
    public EffectiveUserPreferences Effective { get; init; } = new();

    [JsonPropertyName("defaults")]
    public EffectiveUserPreferences Defaults { get; init; } = new();
}
