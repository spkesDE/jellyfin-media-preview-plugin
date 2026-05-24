# Contributing

This document applies to the `jellyfin-media-preview-plugin` repository.

Thanks for contributing to `Jellyfin Media Preview`.

## Where Help Is Welcome

- bug fixes
- hover preview and UX improvements
- Jellyfin compatibility updates
- documentation
- testing on real Jellyfin instances

## Before You Start

Please check:

- is there already an issue or discussion for this?
- is the change compatible with Jellyfin `10.11.9`?
- does normal card behavior still work?

## Local Development

Build the plugin:

```powershell
dotnet build .\Jellyfin.Plugin.MediaPreview\Jellyfin.Plugin.MediaPreview.csproj
```

Build a local release ZIP:

```powershell
.\build-release.ps1
```

That creates:

- `release/MediaPreview/`
- `release/MediaPreview.zip`

## Commit Style

This repository uses `git-cliff` to generate `CHANGELOG.md`, GitHub release notes, and the latest `manifest.json` changelog entry from commit messages between release tags.

Because of that, commit messages should be short, clear, and useful on their own.

Good examples:

```text
fix: restore hover preview on series cards
feat: add trailer fallback for missing trickplay
docs: rewrite README for end users
refactor: simplify preview source selection
build: update Jellyfin packages to 10.11.9
```

Also fine if you do not want strict conventional commits, as long as the message is readable:

```text
Fix hover preview on series cards
Improve trailer fallback handling
Update README for end users
```

Avoid vague commit messages like:

```text
stuff
fixes
update
more changes
```

## Pull Requests

- keep changes focused
- explain the problem and the fix clearly
- mention the Jellyfin version you tested against
- update docs when behavior, install steps, or release flow changes

## Manual Testing

If possible, test at least:

1. hover on movie cards
2. hover on series cards
3. hover on episode cards
4. restore original poster on mouse leave
5. normal click navigation
6. context menu and selection behavior
7. trailer fallback when Trickplay is unavailable

## Coding Notes

- keep C# code readable
- keep frontend selectors defensive
- do not introduce silent breaking changes

## License

By contributing, you agree that your code may be distributed under the `MIT` license used by this project.
