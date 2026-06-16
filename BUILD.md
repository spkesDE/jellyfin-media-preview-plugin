# Build Guide

This document covers local build and packaging steps for the `jellyfin-media-preview-plugin` repository.

## Frontend Build

Install frontend dependencies:

1. `npm install`

Build the deployable client bundle:

1. `npm run build`

Run the Vue configuration UI with HMR and local Jellyfin fixtures:

1. `npm run dev`

Watch the production IIFE bundles:

1. `npm run dev:bundle`

Build output:

- `dist/mediapreview.bundle.js`
- `dist/config.bundle.js`

## Adding Configuration Fields

The Vue configuration UI uses a generic store. For a new plugin setting such as
`HiddenFeature`:

1. Add the property to `Jellyfin.Plugin.MediaPreview/Configuration/PluginConfiguration.cs`.
2. Add validation or migration in `PluginConfigurationNormalizer.cs` only if the value needs it.
3. Bind it in the Vue UI, for example:

   ```vue
   <ConfigCheckbox v-model="store.config.HiddenFeature" label="Hidden Feature" />
   ```

`store.loadConfig()` loads the plugin configuration and keeps unknown server fields. `store.saveConfig()` serializes the current store back to Jellyfin automatically. Add the field to `src/config/libs/defaults.ts` only when the UI needs a frontend fallback before the server has returned the plugin config.

The `File Transformation` plugin injects one deferred external script tag into Jellyfin Web:

- `<script FileTransformation="true" plugin="MediaPreview" defer="defer" src="/media-preview/script"></script>`

## Deploying Through File Transformation

For normal plugin development and release packaging:

1. Run `npm run build`
2. Run `dotnet build Jellyfin.Plugin.MediaPreview/Jellyfin.Plugin.MediaPreview.csproj`
3. Install or package the resulting plugin assembly as usual

`File Transformation` continues to inject the external `/media-preview/script` URL. The served script body comes from the embedded `dist/mediapreview.bundle.js` bundle. The plugin configuration page loads its Vue app from the embedded `dist/config.bundle.js` bundle through `/media-preview/config-script`.

## Release Packaging

The release helper script installs frontend dependencies, rebuilds the frontend bundle, and then runs the .NET packaging flow:

```powershell
.\build-release.ps1
```

For tagged releases, GitHub Actions generates both the GitHub release notes and the newest `manifest.json` changelog entry from `git-cliff`.
