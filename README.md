# Jellyfin Media Preview

![Jellyfin Media Preview hover preview](./hero.png)

`Jellyfin Media Preview` adds hover previews to Jellyfin Web.

This branch provides the legacy build for Jellyfin 10.10.7. It is released separately from the current Jellyfin version and does not receive long-term support.

Legacy builds use the same numeric plugin version as the corresponding current release, but their Git tags are prefixed with `legacy_` (for example, `legacy_v0.3.3.0`). Do not configure this legacy repository together with the main Media Preview repository on the same Jellyfin server.

The legacy build has its own plugin ID, assembly name, API routes, and browser namespace. It also refuses to load unless the detected Jellyfin server assembly version is exactly `10.10.7.0`.

Hover a movie, series, or episode card and the plugin can show a quick preview using Jellyfin Trickplay thumbnails, local trailers, or YouTube trailers already known to Jellyfin.

## Features

- Hover previews on supported Jellyfin Web cards
- Trickplay thumbnail previews
- Local trailer and YouTube trailer previews
- Source priority settings, including Trickplay-first or trailer-first fallback
- Optional trailer audio after browser interaction
- Lightweight visual options for poster backdrops

## Requirements

- Jellyfin 10.10.7 with the web interface
- One frontend injection plugin:
  - [File Transformation](https://www.iamparadox.dev/jellyfin/plugins/manifest.json), or
  - [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)
- Trickplay data, trailer metadata, or both for the items you want to preview

Media Preview does not generate Trickplay data or fetch trailer metadata. It uses preview data that Jellyfin already has.

## Installation

Install Media Preview and one frontend injection plugin:

1. `Media Preview`
2. `File Transformation` or `JavaScript Injector`

### Media Preview

1. Open `Dashboard -> Catalog -> Settings` in Jellyfin.
2. Add this plugin repository:

   ```text
   https://raw.githubusercontent.com/spkesDE/jellyfin-media-preview-plugin/refs/heads/backport/10.10.7/manifest.json
   ```

3. Save, open the plugin catalog, and install `Media Preview`.
4. Restart Jellyfin.

### File Transformation

1. Add the File Transformation repository:

   ```text
   https://www.iamparadox.dev/jellyfin/plugins/manifest.json
   ```

2. Install `File Transformation`.
3. Restart Jellyfin.

### JavaScript Injector (alternative)

1. Add the JavaScript Injector repository:

   ```text
   https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/10.10/manifest.json
   ```

2. Install `JavaScript Injector`.
3. Restart Jellyfin.

Media Preview registers its loader with JavaScript Injector automatically. You do not need to paste a script into the injector settings.

You only need one of the two injection plugins. If both are installed, Media Preview prevents duplicate frontend initialization.

When both are installed, `Automatic` prefers File Transformation. You can choose `File Transformation only` or `JavaScript Injector only` under `Media Preview -> Advanced -> Frontend Injection Method`. Restart Jellyfin after changing the method.

## Setup

1. Open the Jellyfin admin dashboard.
2. Open the `Media Preview` plugin settings.
3. Choose a preview source mode.
4. Save.
5. Refresh Jellyfin Web.

For most libraries, `Prefer Trickplay` is a good starting point. If your library has better trailer metadata than Trickplay coverage, try `Prefer Trailers`.

## Preview Sources

| Source | Best for |
|---|---|
| Trickplay | Lightweight previews from Jellyfin thumbnail sheets |
| Local trailers | Video previews served by your Jellyfin server |
| YouTube trailers | Trailer previews when Jellyfin already has YouTube trailer metadata |

If no supported preview source is available for an item, the card stays unchanged.

## Troubleshooting

If previews do not show up:

1. Make sure `Media Preview` and either `JavaScript Injector` or `File Transformation` are installed and enabled.
2. Restart Jellyfin after installing or updating plugins.
3. Hard-refresh Jellyfin Web in your browser.
4. Check whether the item has Trickplay or trailer data.
5. Try another preview source mode.

Trailer audio may stay muted until you interact with the page. This is normal browser autoplay behavior.

YouTube trailers may also be blocked by privacy tools, ad blockers, browser settings, or non-embeddable trailer videos.

## Documentation

- [Build guide](./BUILD.md)
- [Contributing](./CONTRIBUTING.md)
- [AI assistance disclosure](./AI_USAGE.md)
- [Changelog](./CHANGELOG.md)

## License

This project is licensed under the [MIT License](./LICENSE).
