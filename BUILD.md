# Build Guide

This guide explains how to build and test Jellyfin Media Preview locally.

## Requirements

Install:

- Node.js and npm
- .NET 10 SDK
- PowerShell

## Install Dependencies

Run this once after cloning the repository:

```powershell
npm install
```

Run it again when `package.json` or `package-lock.json` changes.

## Recommended Workflow

For normal development and testing, use:

```powershell
.\build-release.ps1
```

The script builds the frontend and plugin and creates:

```text
release\MediaPreview\
release\MediaPreview.zip
```

To test a change:

1. Make your changes.
2. Run `.\build-release.ps1`.
3. Copy the generated plugin files to your Jellyfin plugin directory.
4. Restart Jellyfin.
5. Test the changes in Jellyfin Web.
6. Repeat as needed.

You do not need to run `npm run build` separately before using the release script.

## Configuration UI Development

Use the Vite development server when working only on the Vue configuration page:

```powershell
npm run dev
```

This provides hot reloading and local Jellyfin fixtures.

It does not create an installable plugin. Use `.\build-release.ps1` afterward to test the configuration page inside Jellyfin.

## Optional Frontend Watcher

To rebuild the frontend bundles automatically when source files change:

```powershell
npm run dev:bundle
```

This updates:

```text
dist\mediapreview.bundle.js
dist\config.bundle.js
```

## Manual Build

Build the frontend:

```powershell
npm run build
```

Build the plugin:

```powershell
dotnet build .\Jellyfin.Plugin.MediaPreview\Jellyfin.Plugin.MediaPreview.csproj
```

## Adding Configuration Fields

To add a new setting:

1. Add the property to:

   ```text
   Jellyfin.Plugin.MediaPreview\Configuration\PluginConfiguration.cs
   ```

2. Add validation or migration to `PluginConfigurationNormalizer.cs` when required.

3. Add the field to the Vue configuration page.

4. Add a fallback to `src/config/libs/defaults.ts` when the UI needs a value before the server configuration loads.

Unknown server fields are preserved automatically.
