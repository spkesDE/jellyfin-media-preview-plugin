# Jellyfin Media Preview

`Jellyfin Media Preview` adds hover previews to the Jellyfin web interface.

Hover a media card and the plugin can show a quick preview using Trickplay thumbnails, local trailers, or YouTube trailers.

It is meant to make browsing quicker without getting in the way of normal Jellyfin navigation.

## Features

- Hover previews for supported media cards
- Trickplay thumbnail previews
- Local trailer video previews
- YouTube trailer previews
- Configurable preview source order
- Optional trailer audio after browser interaction
- Works in Jellyfin Web and clients that use the same web interface

## About

The plugin adds preview behavior to supported Jellyfin Web cards.

Depending on your settings, previews can use:

- Trickplay only
- trailers only
- Trickplay first, then trailers as fallback
- trailers first, then Trickplay as fallback

Poster backdrops can also be styled independently. If blur is too expensive on a device, you can switch to lighter overlay modes such as `Dim`, `Vignette`, or `Dim + Vignette`.

If no supported preview source is available for an item, the card is left unchanged.

## Supported Content

The plugin currently supports:

- movies
- series
- episodes
- video items where Jellyfin provides compatible metadata

Whether a preview is available depends on the metadata, media sources, and trailer information Jellyfin exposes for that item.

Remote trailer support is currently limited to YouTube.

## Requirements

- File Transformation plugin
- Preview content requires Trickplay data, trailer metadata, or both, depending on the preview mode you choose

The plugin is currently built against Jellyfin `10.11.11`.

## Installation

To use this plugin, install both:

1. `Media Preview`
2. `File Transformation`

### Install Media Preview

Recommended installation:

1. In Jellyfin, open `Dashboard -> Catalog -> Settings`
2. Add this plugin repository:

   ```text
   https://raw.githubusercontent.com/spkesDE/jellyfin-media-preview-plugin/main/manifest.json
   ```

3. Save
4. Open the plugin catalog
5. Install `Media Preview`
6. Restart Jellyfin

### Manual Installation

You can also install the plugin manually by downloading the latest release package from GitHub Releases and copying the plugin files into your Jellyfin plugin directory.

Common locations:

- Windows: `%ProgramData%\Jellyfin\Server\plugins\MediaPreview\`
- Linux: `/var/lib/jellyfin/plugins/MediaPreview/`
- Docker: your mapped Jellyfin plugins directory

Restart Jellyfin after copying the files.

### Install File Transformation

This plugin uses `File Transformation` to inject the preview script into Jellyfin Web.

1. Add the File Transformation repository to Jellyfin:

   ```text
   https://www.iamparadox.dev/jellyfin/plugins/manifest.json
   ```

2. Install `File Transformation`
3. Restart Jellyfin

Without `File Transformation`, the preview script will not load.

## Setup

After installation:

1. Open the Jellyfin admin dashboard
2. Open the `Media Preview` plugin settings
3. Choose your preferred preview source mode
4. Adjust hover timing if needed
5. Save
6. Refresh Jellyfin Web

For most setups, choosing a preview source mode is enough.

## Preview Sources

### Trickplay

Uses Jellyfin's native Trickplay thumbnail sheets for hover previews.

Good fit if:

- your library already has Trickplay generated
- you want lightweight previews
- you do not want to start video playback on hover

Trickplay previews only work when Trickplay data exists for the item.

### Local Trailers

Uses trailers that are available inside Jellyfin.

Good fit if:

- your library includes local trailers
- you want real video previews on hover
- you prefer preview content served by your own Jellyfin server

### YouTube Trailers

When Jellyfin already provides a YouTube trailer for an item, Media Preview can use it as a hover preview.

Depending on your settings, YouTube trailers can be used directly or only as a fallback when Trickplay is not available.

Trailer audio may stay muted until the browser has received user interaction. This is normal browser autoplay behavior.

Media Preview does not generate Trickplay data or fetch trailer metadata on its own. It uses the preview data Jellyfin already provides.

## Preview Modes

Media Preview supports these source priorities:

| Mode | Behavior |
|---|---|
| Trickplay only | Uses Trickplay previews only |
| Trailers only | Uses trailer previews only |
| Prefer Trickplay | Uses Trickplay first, trailers as fallback |
| Prefer Trailers | Uses trailers first, Trickplay as fallback |

If the selected source is not available, the plugin either falls back according to the selected mode or leaves the card unchanged.

## Limitations

- No Trickplay preview without generated Trickplay data
- Remote trailer support is currently limited to YouTube
- Browser autoplay rules may block trailer audio
- Future Jellyfin Web changes may require selector updates
- The plugin depends on the external `File Transformation` plugin

## Troubleshooting

### Previews do not show up

Check the following:

1. Make sure `Media Preview` is installed and enabled
2. Make sure `File Transformation` is installed
3. Restart Jellyfin
4. Hard-refresh Jellyfin Web in your browser
5. Check whether the item has Trickplay or trailer data
6. Try another preview source mode

### Trickplay previews do not work

Trickplay previews require Trickplay data generated by Jellyfin.

If an item has no Trickplay data, the plugin cannot show a Trickplay preview for it.

### Trailer previews are muted

This is usually caused by browser autoplay rules.

Most browsers block autoplay with sound until the user has interacted with the page. After interaction, trailer audio may become available depending on your settings and browser behavior.

### YouTube trailers do not play

Possible reasons:

- the item has no YouTube trailer metadata
- the browser blocks the embedded player
- privacy or ad-blocking extensions block YouTube embeds
- the trailer is not embeddable

## Development Docs

Project documentation:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [BUILD.md](./BUILD.md)

## AI Assistance

This project may use AI-assisted development tools for code review, refactoring support, Jellyfin Web HTML/CSS analysis, documentation improvements, and wording/readability support.

The project is still maintainer-led. Debugging, live testing, architecture decisions, and releases are handled by the maintainer.

See [AI_USAGE.md](AI_USAGE.md) for details.

## License

This project is licensed under the [MIT License](./LICENSE).
