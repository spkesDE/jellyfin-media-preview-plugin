using Jellyfin.Data;
using Jellyfin.Database.Implementations.Entities;
using Jellyfin.Database.Implementations.Enums;
using Jellyfin.Plugin.MediaPreview.Api;
using Xunit;

namespace Jellyfin.Plugin.MediaPreview.Tests;

public sealed class UserPreferencesAccessTests
{
    private static User CreateUser(bool isAdministrator)
    {
        User user = new("media-preview-test", "test-auth", "test-reset");
        user.SetPermission(PermissionKind.IsAdministrator, isAdministrator);
        return user;
    }

    [Fact]
    public void UsersCanManageTheirOwnSettings()
    {
        User user = CreateUser(isAdministrator: false);

        Assert.True(UserPreferencesController.CanManage(user, user.Id));
    }

    [Fact]
    public void UsersCannotManageSomeoneElsesSettings()
    {
        Assert.False(UserPreferencesController.CanManage(CreateUser(isAdministrator: false), Guid.NewGuid()));
    }

    [Fact]
    public void AdministratorsCanManageAnyUsersSettings()
    {
        Assert.True(UserPreferencesController.CanManage(CreateUser(isAdministrator: true), Guid.NewGuid()));
    }
}
