# Build Guide

This document covers local build and packaging steps for the `jellyfin-media-preview-plugin` repository.

## Frontend Build

Install frontend dependencies:

1. `npm install`

Build the deployable client bundle:

1. `npm run build`

Watch during refactor work:

1. `npm run dev`

Build output:

- `dist/mediapreview.bundle.js`

The `File Transformation` plugin injects one deferred external script tag into Jellyfin Web:

- `<script FileTransformation="true" plugin="MediaPreview" defer="defer" src="/media-preview/script"></script>`

## Deploying Through File Transformation

For normal plugin development and release packaging:

1. Run `npm run build`
2. Run `dotnet build Jellyfin.Plugin.MediaPreview/Jellyfin.Plugin.MediaPreview.csproj`
3. Install or package the resulting plugin assembly as usual

`File Transformation` continues to inject the external `/media-preview/script` URL. The served script body now comes from the embedded `dist/mediapreview.bundle.js` bundle.

## Release Packaging

The release helper script installs frontend dependencies, rebuilds the frontend bundle, and then runs the .NET packaging flow:

```powershell
.\build-release.ps1
```
