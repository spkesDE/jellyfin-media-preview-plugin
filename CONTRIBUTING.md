# Contributing

This document applies to the `jellyfin-media-preview-plugin` repository.

Thanks for contributing to `Jellyfin Media Preview`.

## Where Help Is Welcome

All kinds of contributions are welcome, whether that is code, documentation, testing, bug reports, ideas, or feedback from real Jellyfin setups.

Examples include:

- preview behavior fixes
- Jellyfin Web compatibility updates
- hover preview and UX improvements
- clearer install, setup, and troubleshooting notes
- manual test reports from different browsers, clients, and device types

## Before You Start

Please check:

- is there already an issue or discussion for this?
- is the change compatible with the latest supported Jellyfin version?
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

## Versioning

Plugin versions use `JellyfinMajor.PluginMajor.PluginMinor.PluginPatch` so the
supported Jellyfin generation is visible immediately. Each new Jellyfin major
version starts a new plugin line at `<JellyfinMajor>.1.0.0`; for example,
Jellyfin 12 starts at `12.1.0.0` and Jellyfin 13 starts at `13.1.0.0`.

## Commit Style

This repository uses `git-cliff` to generate `CHANGELOG.md`, GitHub release notes, and the changelog entry for the latest version in `manifest.json`.

Because of that, commit messages should be short, clear, and useful on their own.

Good examples:

```text
fix(hover): restore hover preview on series cards
feat(trailer): add trailer fallback for missing trickplay
docs: rewrite README for end users
refactor: simplify preview source selection
build: update Jellyfin packages to 12.0.0
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
- target the `dev` branch with pull requests

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
