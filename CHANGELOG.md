# Changelog

## v0.2.0.1 - 2026-06-15



### Build

- build: automate manifest changelog generation with git-cliff

- build: remove manual manifest changelog override

- build: align manifest changelog with git-cliff output

- build: refresh bundled frontend output

- build: refresh bundled frontend output

- build: refresh bundled frontend output

- build: update Jellyfin packages to 10.11.11


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


### Other

- perf: skip library lookups without overrides


### Refactoring

- refactor: simplify auto scrub and trailer helpers

- refactor: extract metadata overlay styles

- refactor: unify plugin configuration page layout

- refactor: unify remaining configuration tabs

- refactor: enhance build script with modular functions and improved error handling


## v0.1.1.0 - 2026-05-24



### Features

- feat: extend preview backdrop and hover settings

- feat: add hover countdown and preview availability overlays


### Fixes

- fix: restore preview backdrop rendering

- fix: resolve lifecycle type guards

- fix: restore reliable hover preview lifecycle


### Other

- chore: rebuild media preview bundle

- chore: minify css in bundled styles

- chore: move manifest updater into scripts


### Refactoring

- refactor: rename media preview frontend classes to jmp

- refactor: split media preview styles into css modules

- refactor: lazily inject preview dom


## v0.1.0.0 - 2026-05-24



### Other

- Initial Release



