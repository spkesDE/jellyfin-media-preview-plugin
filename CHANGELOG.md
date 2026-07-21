# Changelog

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



### Build

- build(dist): refresh preview bundles




### Refactoring

- refactor(navigation): improve plugin configuration link handling and update navigation entry logic for Jellyfin 12.0



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



### Build

- build: align frontend package version

- build: refresh bundled frontend output





## v0.2.2.0 - 2026-06-22










### Features

- feat(trickplay): preload preview thumbnails




### Build

- build: add plugin catalog image



### Documentation

- docs: simplify README for users

- docs: clarify contribution welcome note




## v0.2.1.0 - 2026-06-16










### Features

- feat(config): migrate settings UI to Vue




### Build

- build(changelog): order feature entries first





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



### Build

- build: automate manifest changelog generation with git-cliff

- build: remove manual manifest changelog override

- build: align manifest changelog with git-cliff output

- build: refresh bundled frontend output

- build: refresh bundled frontend output

- build: refresh bundled frontend output

- build: update Jellyfin packages to 10.11.11




### Refactoring

- refactor: simplify auto scrub and trailer helpers

- refactor: extract metadata overlay styles

- refactor: unify plugin configuration page layout

- refactor: unify remaining configuration tabs

- refactor: enhance build script with modular functions and improved error handling



### Other

- perf: skip library lookups without overrides


## v0.1.1.0 - 2026-05-24










### Features

- feat: extend preview backdrop and hover settings

- feat: add hover countdown and preview availability overlays



### Fixes

- fix: restore preview backdrop rendering

- fix: resolve lifecycle type guards

- fix: restore reliable hover preview lifecycle





### Refactoring

- refactor: rename media preview frontend classes to jmp

- refactor: split media preview styles into css modules

- refactor: lazily inject preview dom



### Other

- chore: rebuild media preview bundle

- chore: minify css in bundled styles

- chore: move manifest updater into scripts


## v0.1.0.0 - 2026-05-24















### Other

- Initial Release



