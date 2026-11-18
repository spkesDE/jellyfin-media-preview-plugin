using System.Security.Claims;
using MediaBrowser.Controller.Library;
using JellyfinUser = Jellyfin.Database.Implementations.Entities.User;

namespace Jellyfin.Plugin.MediaPreview.Api;

/// <summary>Resolves the Jellyfin user behind an authenticated request.</summary>
internal static class ActiveUser
{
    private const string UserIdClaimType = "Jellyfin-UserId";

    internal static JellyfinUser? Resolve(ClaimsPrincipal principal, IUserManager userManager)
    {
        string? claimedId = principal.FindFirst(UserIdClaimType)?.Value;
        if (Guid.TryParse(claimedId, out Guid activeUserId))
        {
            JellyfinUser? byId = userManager.GetUserById(activeUserId);
            if (byId is not null)
            {
                return byId;
            }
        }

        string? name = principal.Identity?.Name;
        return string.IsNullOrWhiteSpace(name) ? null : userManager.GetUserByName(name);
    }
}
