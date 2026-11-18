# Changelog

## v12.6.0.0 - 2026-11-18

### Features

- feat(api): cache the client script with an ETag
- feat(direct-play): remux through PlaybackInfo and stop preview transcodes
- feat(preview): respect reduced motion and Data Saver
- feat(i18n): translate texts on cards and in the settings dialog
- feat(api): add diagnostics and unavailable trailer admin endpoints
- feat(direct-play): skip intros, recaps and credits with media segments
- feat(users): let users choose source, hover delay and turn previews off
- feat(input): start previews with a touch long-press
- feat(preview): play previews in the detail page backdrop
- feat(config): restyle the settings page after Jellyfin Featured

### Fixes

- fix(preview): stop previews in hidden tabs and recover from undecodable video
- fix(security): send tokens only on media URLs and check item access

### Performance

- perf(preload): batch item requests and cap preloads per page

## v12.5.0.0 - 2026-11-16

### Features

- feat(users): save preview mute and volume per user

## v12.4.0.0 - 2026-10-05

### Features

- feat(preview): add in-progress source override (#35)

## v12.3.0.0 - 2026-09-30

### Features

- feat(injection): add direct injection and robust automatic selection

### Fixes

- fix(config): preserve preferred source order across updates

## v12.2.1.0 - 2026-09-30

### Fixes

- fix(trickplay): resolve series and season cards to an episode (#31)

## v12.2.0.0 - 2026-09-29

### Features

- feat(input): support keyboard previews without hover hardware
- feat(preview): fall back to direct play after trailers
- feat(preview): add configurable Direct Play controls
- feat(config): expose Direct Play in preview rules
- feat(preview): add Direct Play master toggle
- feat(config): explain preview fallback stacks
- feat(preview): add configurable source chains and media controls
- feat(config): make Prefer Trailer chain fully sortable
- feat: enable complete default source chains
- feat: add source-specific preview media controls
- feat: move expand controls to appearance

### Fixes

- fix: Refactor star history section in README (#23)
- fix(preview): ignore overlay images as render hosts, fixes #24
- fix(cache): scope preview data to server sessions
- fix(trailer): stop media when hover ends
- fix(youtube): align client and server URL parsing
- fix(config): align backend and frontend defaults
- fix(config): include component styles in production bundle
- fix(config): polish source chain drag editor
- fix(config): align preference chain drag layout
- fix(config): keep preview setting tabs accessible
- fix(config): keep drag preview synced with cursor
- fix(config): keep trickplay performance settings visible
- fix(config): keep drag fallback inside list
- fix(preview): cache missing trailer lookups
- fix: diagnose direct play chain fallbacks
- fix: prevent unsolicited home card previews
- fix: remove pointer focus ring from preview controls
- fix: keep multi-picker option backgrounds consistent
- fix: add spacing between keyboard settings grids
- fix(preview/hover): prevent stale media after pointer leave
- fix(preview/library): honor library-specific source overrides

## v12.1.1.0 - 2026-09-21

### Fixes

- fix: Refactor star history section in README (#23)
- fix(preview): ignore overlay images as render hosts, fixes #24

## v12.1.0.0 - 2026-09-10

### Fixes

- fix(preview): unify card overlay stacking in Jellyfin 12

## v0.4.0.1 - 2026-09-08

### Fixes

- fix(dependencies): update nanoid to version 3.3.18

## v0.3.1.1 - 2026-08-08

### Fixes

- fix(changelog): filter merge commits from release notes
- fix(navigation): restrict admin link injection to plugin sidebar

## v0.3.1.0 - 2026-07-31

### Features

- feat: support JavaScript Injector

### Fixes

- fix(trailer): render expand icon as svg
- fix(runtime): harden preview cleanup and caches
- fix(layout): Mount list row previews on the thumbnail instead of the row (#18)
- fix(hover): Scope preview teardown to the card rather than the hover host (#19)
- fix(trailer): Loop hover trailers through the player API instead of a playlist (#20)

## v0.3.0.1 - 2026-07-21

### Fixes

- fix(trailer): keep expand button above card overlay

## v0.3.0.0 - 2026-07-21

### Features

- feat(cards): support portrait expansion in wrapped rows
- feat(trailer): persist unavailable YouTube sources
- feat(trailer): sync unavailable sources with server
- feat(config): configure unavailable trailer retry interval
- feat(config): toggle unavailable trailer cache

### Fixes

- fix(cards): enhance card selection logic and exclude non-playable media cards
- fix(apiClient): added Jellyfin 12 support
- fix(trailer): skip unavailable YouTube embeds
- fix(trailer): read persisted unavailable source ids

## v0.2.4.1 - 2026-07-17

### Fixes

- fix(config): live preview grid

## v0.2.4.0 - 2026-07-17

### Features

- feat(trailer): enhance portrait card expansion with source aspect ratio support
- feat(appearance): add 'Source / Video ratio' option for portrait card expansion

## v0.2.3.1 - 2026-07-15

### Fixes

- fix(appearance): shift wide previews into viewport

## v0.2.3.0 - 2026-07-15

### Features

- feat(appearance): add portrait card expansion
- feat(hover): integrate loading state into countdown
- feat(config): preview portrait card expansion

### Fixes

- fix(trickplay): prevent stale auto scrub timers
- fix(runtime): bound preview caches
- fix(appearance): keep wide previews in viewport
- fix(trailer): respect restore on leave setting
- fix(hover): resolve unavailable preview messages
- fix(config): expand preview card on hover

## v0.2.2.0 - 2026-06-22

### Features

- feat(trickplay): preload preview thumbnails

## v0.2.1.0 - 2026-06-16

### Features

- feat(config): migrate settings UI to Vue

## v0.2.0.1 - 2026-06-15

### Features

- feat: add per-content-type preview source overrides
- feat: add configurable smart preview source selection
- feat: add configurable hover intent and cooldown
- feat: add configurable preview metadata overlay
- feat: add configurable preview fade and crossfade transitions
- feat: add configurable keyboard preview support
- feat: add library preview source rules
- feat: refine configuration page and live preview

### Fixes

- fix: guard initial hover preview requests
- fix: clean up preview DOM on destroy
- fix: support previews in season and episode overviews
- fix: tighten card discovery and binding
- fix: harden release and preview behavior
- fix: validate embedded client bundle
- fix: streamline CI workflow and update paths in build script

### Performance

- perf: skip library lookups without overrides

## v0.1.1.0 - 2026-05-24

### Features

- feat: extend preview backdrop and hover settings
- feat: add hover countdown and preview availability overlays

### Fixes

- fix: restore preview backdrop rendering
- fix: resolve lifecycle type guards
- fix: restore reliable hover preview lifecycle


