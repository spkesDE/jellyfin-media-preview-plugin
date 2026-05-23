# jellyfin-media-preview-plugin

`Jellyfin Media Preview` adds hover previews to the Jellyfin web interface.

Hover a media card and the plugin can show:

- Trickplay previews
- local trailers
- YouTube remote trailers

It is meant to make browsing feel quicker and a bit more alive, without changing the normal Jellyfin flow.

## About

The plugin works in Jellyfin Web and in clients that use the same web UI. It adds preview behavior to supported cards when you hover them.

Depending on your settings, it can use:

- Trickplay only
- trailers only
- Trickplay first, then trailers
- trailers first, then Trickplay

If nothing is available for an item, the card simply stays as it is.

## Supported Content

The plugin currently works with:

- movies
- series
- episodes

At the moment, remote trailer support is limited to YouTube.

## Notes

- This plugin is for the Jellyfin web UI.
- It depends on the `File Transformation` plugin.
- Trickplay previews only work if Trickplay data already exists for the item.
- Trailer audio may still be muted until the browser has received user interaction.
- The plugin is currently built against Jellyfin `10.11.9`.

## Installation

To use the plugin you need:

1. this plugin installed
2. the `File Transformation` plugin installed

### Install This Plugin

Install it the same way you normally install Jellyfin plugins.

If you are installing it manually, copy the plugin files into a Jellyfin plugin directory such as:

- Windows: `%ProgramData%\Jellyfin\Server\plugins\MediaPreview\`
- Linux: `/var/lib/jellyfin/plugins/MediaPreview/`
- Docker: your mapped plugins directory

Then restart Jellyfin.

### Install File Transformation

This plugin uses `File Transformation` to inject the client script into Jellyfin Web.

1. Add this repository to Jellyfin:
   `https://www.iamparadox.dev/jellyfin/plugins/manifest.json`
2. Install `File Transformation`
3. Restart Jellyfin

Without it, the preview script will not load.

## Setup

After installation:

1. Open the Jellyfin admin dashboard
2. Open the `Media Preview` plugin settings
3. Pick the preview source mode you want
4. Adjust hover timing if needed
5. Save and refresh Jellyfin Web

Most users only need to choose the preview source mode and leave the rest alone.

## Preview Sources

### Trickplay

Uses Jellyfin's native Trickplay thumbnail sheets for hover previews.

Best if:

- your library already has Trickplay generated
- you want lightweight previews without starting video playback

### Local Trailers

Uses trailers already available in Jellyfin.

Best if:

- your library includes local trailers
- you want an actual video preview on hover

### Remote YouTube Trailers

If Jellyfin exposes a supported YouTube trailer, the plugin can use it as a main source or fallback depending on your settings.

## Limitations

- No Trickplay preview without generated Trickplay data
- browser autoplay rules may block sound
- future Jellyfin Web changes may require selector updates
- depends on the external `File Transformation` plugin

## Troubleshooting

If previews are not showing up:

1. Make sure the plugin is enabled
2. Make sure `File Transformation` is installed
3. Restart Jellyfin
4. Refresh the browser fully
5. Check whether the item actually has Trickplay or trailer data
6. Try another preview source mode

If trailer previews play muted, that is usually just the browser blocking autoplay with sound.

## For Contributors

This repository also contains the source code and release files for the plugin.

- [CONTRIBUTING.md](/C:/Users/spkes/Documents/Jellyfin%20Web%20hover-scrub/CONTRIBUTING.md)

## License

This project is licensed under the [MIT License](/C:/Users/spkes/Documents/Jellyfin%20Web%20hover-scrub/LICENSE).
