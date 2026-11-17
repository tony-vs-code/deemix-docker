# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026.11.27] - 2026-11-16

### Changed
- WebUI Build Tooling Modernization: updated `rollup.config.js` to standard `'es'` output format, `fs.readFileSync` package version loading, browser-first resolution, and `node_modules`-scoped `onwarn` filtering; modernized `src/webui/package.json` build scripts with `yarn` chaining, `esbuild --target=es2020`, and `BROWSERSLIST_IGNORE_OLD_DATA=1`.
- Codebase Lint & Vue 3 Prep Cleanup: resolved all ESLint issues across `Library.vue`, `app.js`, `TheContextMenu.vue`, `TheSearchBar.vue`, `Downloads.vue`, `Search.vue`, and `artist.js`.

### Added
- Vue 3 Migration Checklist: added `src/webui/VUE3_MIGRATION.md` documenting Vue 3 readiness and upgrade paths for Router, Vuex, I18n, EventBus, and lifecycle hooks.

## [2026.11.26] - 2026-11-16

### Added
- ARL Health & Session Diagnostics: added `GET /api/arlHealth` endpoint and `arlUpdatedAt` tracking in `loginStorage.ts` to report ARL validity, source, account tier (`HiFi`, `Premium`, `Free`), and estimated remaining session days.
- Session & ARL Health UI: added a real-time ARL Health status panel with account tier badges, session life bar, Verify Session action, and Show/Hide ARL toggle in `Settings.vue`.
- Quick ARL Cookie Helper Modal: added an interactive multi-browser guide modal with one-click copyable cookie/snippet helpers and direct Paste & Connect login.

### Changed
- Modernized `InfoArl.vue` to match the dark slate glassmorphic UI.

### Fixed
- Responsive Settings Tab Bar: updated `.settings-tabs-bar` to wrap cleanly on desktop/tablet and switch to a responsive grid on small windows (`<= 768px` / `<= 420px`) without clipping tabs.
- Application Log Filter Styling: fixed mismatched CSS selectors so `All`, `INFO`, `WARN`, and `ERROR` filter buttons and counts render with proper color-coded styles.

## [2026.11.25] - 2026-11-16

### Added
- Audio Player Persistence: saved `audioVolume`, `isMuted`, `isShuffled`, and `repeatMode` (`off` / `all` / `one`) in `localStorage` across sessions.
- Shuffle & Repeat Controls: added Shuffle toggle and Repeat cycle (`off` -> `all` -> `one`) buttons with track play-history stack for Previous navigation.
- Media Session API Integration: hooked `navigator.mediaSession` metadata, multi-size artwork, playback state, position state, and OS/browser media key handlers (`play`, `pause`, `previoustrack`, `nexttrack`, `seekto`, `stop`).

## [2026.11.24] - 2026-11-16

### Added
- Queue Concurrency Control: multi-slot download worker pool governed by `settings.queueConcurrency` with concurrent active download tracking in the WebUI.
- Batch Queue Operations: `Pause All` / `Resume All` queue controls, `Clear Failed` action, and corresponding `/pauseQueue`, `/resumeQueue`, and `/clearFailedDownloads` HTTP/WebSocket endpoints.
- Download Priority & Reordering: `/reorderQueue` endpoint with Move Up / Move Down buttons and drag-and-drop reordering for queued items in `Downloads.vue`.

## [2026.11.23] - 2026-11-16

### Added
- Structured DB Application Logs — integrated high-performance structured database logging (`logDb.ts`) with automatic Winston transport hooks, log rotation, and real-time frontend querying.
- Application Logs Console — introduced dedicated Settings Tab 7 with an interactive dark slate log terminal featuring instant text search, log level filtering (error, warn, info, debug), copy-to-clipboard, raw JSON export, and toggleable auto-refresh.
- Filesystem Diagnostics API — added `GET /api/checkPermissions` endpoint reporting mount path write accessibility, UID/GID, umask, and volume health diagnostics.

### Fixed
- Non-Root Container Permissions Hardening — resolved permission denied (`EACCES`) errors when downloading to `/downloads` under non-root users (e.g. `media` UID 1000). Pre-created `/downloads` and `/config` directories with permissive mode (`chmod 777`) and explicit `VOLUME` declarations in Dockerfile.
- Native Non-Root Container Execution — updated container entrypoint to detect non-root execution and run `exec node /app/server/dist/app.js` directly, preventing `s6-applyuidgid` initialization failures.
- File Creation Permissions — set default container `UMASK_SET=002` ensuring generated music files remain readable and writable across host users, and added graceful `10-fix_folders` fallback.

### Removed
- Legacy Spotify Assets & Routes — removed obsolete `InfoSpotifyFeatures.vue`, static Spotify tutorial assets (`res/InfoSpotifyFeatures/`), removed `/info-spotify` route, and cleanly redirected `/spotify-playlist/:id` to search.

### Changed
- Modernized Download Bars — redesigned `QueueItem.vue` and `TheDownloadBar.vue` with glassmorphic slate cards, smooth progress bars, and status pills.
- In-Memory Inverted Token Index — enhanced `libraryDb.ts` with pre-computed inverted lowercase token index for sub-millisecond full-text library searches.

## [2026.11.22] - 2026-11-15

### Changed
- Complete UI/UX Modernization — overhauled all remaining legacy views (`Home`, `Charts`, `Search`, `Artist`, and `Tracklist`) to match the dark slate glassmorphic design system of Library, Downloads, and Settings.
- Home View — added modern header, glassmorphic card grids for popular playlists and albums with hover zoom and quick download actions, and an unauthenticated glass banner.
- Charts View — added country selection grid with glassmorphic cards, gold/silver/bronze rank badges for top tracks, duration pills, and one-click download buttons.
- Search View — added category navigation pills with icons and item counts, and dark glass results states.
- Artist & Tracklist Views — added immersive hero banners with metadata pills, dark glass table rows with audio preview triggers, and sticky action footers.

## [2026.11.21] - 2026-11-15

### Changed
- Modern Native Node 20 LTS Runtime — upgraded container runtime from deprecated Node 16 to official Node 20 LTS on Alpine 3.20.
- Dropped `pkg` Binary Packaging — eliminated the monolithic `@yao-pkg/pkg` bundling step; the server now executes cleanly and natively as `node /app/server/dist/app.js` under the unprivileged `abc` user.
- Accelerated Build Pipeline — by compiling TypeScript and WebUI bundles once on `$BUILDPLATFORM` and copying production assets to `/app`, multi-arch container build times are reduced dramatically.

## [2026.11.20] - 2026-11-15

### Changed
- Modern Categorized Settings Layout — eliminated all expanding accordion sections in `/settings`. Settings are now organized into 6 clearly defined, immediately visible category tabs: Account, General & Interface, Downloads & Quality, File & Folder Organization, Metadata & Tags, and Artwork & Covers.
- Removed Spotify Settings — completely removed legacy Spotify developer credentials and settings from the user interface.
- Enhanced Controls & Visuals — redesigned all inputs, custom switches, language flag grids, and profile cards with high-contrast dark slate glassmorphism matching Library and Downloads.

## [2026.11.19] - 2026-11-15

### Fixed
- Git-less Version Fallback — fixed `src/scripts/gen-version.js` to discover repository `version` files when `.git` is excluded during container builds, preventing git command errors and eliminating the legacy `2022.12.14` fallback.
- Dockerfile `cp` Error — eliminated failing `cp "${BIN_PATH}" /deemix-server` command by utilizing `pkg --output /deemix-server` directly.
- Startup Redirects — fixed Deezer connectivity check in `root/etc/cont-init.d/15-checks` to follow HTTPS redirects (`curl -sfL`).

### Changed
- Build Pipeline Acceleration — refactored `Dockerfile` into a multi-stage architecture with a platform-independent `bundler` stage on `$BUILDPLATFORM` that compiles Webpack and Rollup bundles once for all target architectures, cutting build times significantly.
- Root Package Manifest — added root `package.json` with standard build, test, lint, and preview scripts to eliminate root directory `ENOENT` command errors.
- GitHub Actions — upgraded to `docker/build-push-action@v6`, passed `BUILDDATE` build argument, and enabled `provenance: false`.

## [2026.11.18] - 2026-11-15

### Fixed
- Library Page Navigation Lockup — resolved VNode duplicate key collisions for download root items and eliminated computed object reference churn, enabling instantaneous stat card switching (Albums, Artists, Tracks) and page navigation during active search queries.

### Added
- Modernized Settings Page — complete visual overhaul of the Settings page matching the glassmorphic dark theme of Library and Downloads, with modern headers, glass cards, refined inputs, custom toggles, an elevated profile card, an interactive language flag grid, and a sticky save bar.

## [2026.11.17] - 2026-11-15

### Added
- High-performance Library Search API (`GET /api/searchLibrary`) supporting search across albums, tracks, and artists with in-memory caching and sub-millisecond response latency.
- Searching for track titles on the Albums view instantly surfaces containing albums, accompanied by "Matches track" badges.

### Changed
- Decoupled external Deezer cover resolution into a background asynchronous worker so `GET /api/getLibrary` and `scanLibrary` respond in <10ms without blocking.

### Fixed
- UI lockups and frame drops resolved in `Library.vue` using 150ms search input debouncing and pre-indexed lowercase search tokens.

## [2026.11.16] - 2026-11-15

### Added
- **Audio Streaming & In-App Music Player**: Added `/api/streamLibraryTrack` endpoint supporting HTTP 206 Partial Content Range requests with zero-latency seeking. Built a docked floating audio player bar with play/pause, time/duration scrubber, volume slider, mute toggle, format badge, previous/next track queue navigation, row-level play buttons, and animated equalizer bars.
- **Automated Album Art Extraction & Deezer HD Fallback**: Automatic extraction of embedded ID3v2 `APIC` (MP3) and `METADATA_BLOCK_PICTURE` (FLAC) artwork saved directly to `cover.jpg` in each album directory. Albums without embedded art automatically query Deezer Search API with a concurrent pool to download crystal-clear 1000x1000 HD `cover_xl` artwork.
- **Library Virtualization & Track Pagination**: Added fast pagination for tracks (50 per page with selector for 25, 50, 100, 250) and albums (48 per page). Pre-flattened artist/album structures in memory and replaced slow ICU `localeCompare` with `fastCompare` to eliminate DOM overload and render 3,000+ tracks in <3ms without freezing the browser.

### Fixed
- **Sidebar Downloads Badge Phantom Count**: Resolved issue where the downloads badge showed 92 active items despite an empty queue. Replaced legacy regex status matching with strict finished-state verification against `['completed', 'withErrors', 'failed', 'download finished']` and tied active counts directly to `queueOrder` and current downloading job.
- **UI Freeze on Tab Switching**: Fixed main thread lockups when switching between the Tracks tab and Downloads tab by isolating track sorting to active tab views and optimizing Vue reactivity.
- **Filesystem Permission Safety in Cover Extraction**: Wrapped cover stream creation in immediate error listeners and try/catch blocks to ensure read-only or permission-restricted folders (`EACCES`) fail gracefully without crashing the server.

## [2026.11.15] - 2026-11-15

### Added
- **Persistent Library Database**: Integrated a JSON-backed database in `/config/library.json` with memory caching and `mtime` incremental scanning, providing instant library loading (<2ms) and eliminating redundant disk scans.
- **Library Record Management & File Deletion**: Added ability to permanently delete albums and individual tracks directly from the UI with disk cleanup, path traversal security checks, and confirmation dialogs.
- **Auto-Indexing on Download Completion**: Background incremental scanning automatically indexes newly downloaded songs into the database upon completion and broadcasts real-time updates over WebSockets (`libraryUpdated`).
- **Modern App Icon & Favicons**: Created squircle dark-mode app icon (`assets/icon.jpg`) and multi-size browser tab favicons (`favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`).
- **Unified Queue View**: Merged downloading and queued items into a single unified "Queue" tab with overview stat cards for Downloading and Queued counts.
- **Build Caching**: Added [.dockerignore](file:///home/anthony/projects/deemix-docker/.dockerignore) reducing build context transfer from 265MB to ~110KB (99.96% reduction).
- **Dependency Patch Automation**: Automated postinstall patching (`src/scripts/patch-dependencies.js`) for upstream libraries during build.

### Changed
- **Integrated Interactive Stat Filters**: Converted the top overview stat cards on both the Downloads and Library pages into direct interactive filter buttons with live counts, eliminating duplicate tab bars and selectors across the application.
- **Reworked Library Layout**: Introduced a Unified Media Toolbar with real-time search, multi-field sorting (A-Z, Artist, Track Count, Size), Grid/List view switcher, and modern square media cards with floating format and quick delete badges.
- **Base Image Upgrade**: Migrated from deprecated `lsiobase/alpine:3.15` to current `lscr.io/linuxserver/baseimage-alpine:3.20`.
- **Fast Layered Builds**: Separated dependency installation from source code compilation in `Dockerfile` with BuildKit yarn/apt cache mounts, reducing incremental rebuild times to ~2 seconds.
- **Settings Pruning**: Removed obsolete settings including "Slim download tab" and "Automatically Check for Updates".

### Removed
- **Link Analyzer**: Removed redundant Link Analyzer route, sidebar entry, and view to streamline the app focus strictly on music library management and downloads.
- **"All" Downloads Tab**: Removed the redundant "All" tab from the Downloads page in favor of the unified "Queue", "Completed", and "Failed" views.

### Fixed
- **Playlist Download Crash (`HREF`)**: Fixed `Cannot read properties of undefined (reading 'HREF')` in `deezer-js` when handling tracks with regional restrictions or missing 30-second audio previews.
- **Translation Display**: Fixed missing translation keys for Downloading and Queued stat counters on the Downloads page.

## [2026.11.14] - 2026-11-14

### Added
- **Dedicated Downloads & Status Page**: Full-screen view for downloads, active/completed/failed status tracking, responsive progress meters, and Clear Completed button.
- **Local Library Manager**: Automatic scanning of configured download folder, album art grid display, metadata extraction, and album inspection modal.

### Changed
- **Modern UI Overhaul**: Streamlined layout and refreshed component styles for a clean, modern user experience.
- **Simplified Navigation**: Removed unnecessary About and Favorites routes and sidebar links.
- **Theme Modernization**: Simplified theme selection to strictly Dark Mode (default) and Light Mode with a Sun/Moon toggle; purged legacy themes.
- **Decoupled Builds**: Web app and server build directly from local `./src` in Dockerfile with zero external git cloning.

### Fixed
- **Library Album Modal Trapping**: Resolved CSS containing block bug caused by `transform` on `#container`, allowing album tracklists and artwork to open cleanly upon clicking cards.
- **Downloads Navigation**: Removed redundant right-hand download drawer (`TheDownloadBar.vue`) and centralized all downloads monitoring into `/downloads`.

## [2022.12.14-r222] - 2026-11-12

### Added
- GitHub Actions CI/CD workflow (`.github/workflows/docker-build.yml`) for automated multi-architecture Docker image builds (`linux/amd64`, `linux/arm64`, `linux/arm/v7`) publishing to GitHub Packages (`ghcr.io/tony-vs-code/deemix-docker`).

### Changed
- Migrated project repository and pipelines from GitLab to GitHub (`tony-vs-code/deemix-docker`).
- Transitioned Docker build process to a self-contained multi-stage build directly within `Dockerfile`, eliminating external pre-built architecture dependencies and reducing maintenance overhead.
- Recovered and formalized corrupted `version` string (`2022.12.14-r222.5d447b6035`).

### Security
- Neutralized unsafe and vulnerable update checks to prevent upstream telemetry or version querying against external endpoints.
- Removed references and dependencies associated with the hijacked `deemix.app` domain.

### Compatibility
- Reaffirmed 100% preservation of all legacy environment variables, container ports, and volume mount contracts.

## 2022-03-10
- Completely reworked image. The gitlab CI will now build all architectures and store them as packages in the repo. Those will be pulled during build. This lowers the image footprint to 37mb, down from 150.
- Re-added previous "serverwide-arl" functionality as "DEEMIX_SINGLE_USER". The readme shows how to use it.
## 2021-07-09
- Removed Environment Variable "REVERSEPROXY" again since the original issue was fixed in the webui source. Reverse proxying should now just work by default.
## 2021-06-30
- Added Environment Variable "REVERSEPROXY" as a temporary fix until the websocket topic is fixed in the code
## 2021-06-28
- Full rework of the latest by promoting the next gen version to current after the python version is permanently broken now
- Aside from the serverwide-arl, everything should work for now. As soon as that feature is available in the source, I will update the container with that functionality again.
## 2021-05-30
- Added next gen version of deemix as container variant
## 2021-04-12
- Added "packagedate" to see when the source was pulled in the logfiles
## 2021-03-29
- Added internal port functionality, see #69
## 2021-03-03
- Fixed #58
- Upgraded Alpine version from 3.12 to 3.13
- Upgraded QEMU from 4.0.0 to 5.2.0
- Added warning about error message with debian buster based systems to readme
## 2020-11-01
- Hoster changed
- Fixed download folder location (hopefully permanently)

## 2020-09-10
- added support for deezloader ui by environment variable "DEEZUI"

## 2020-09-08
- Switched the installer to the new server-requirements

## 2020-09-05
- Fixed the ARL updater

## 2020-07-24
- Updated code to pull from codeberg instead of notabug

## 2020-06-12
- Added UMASK_SET environment variable (I misunderstood how it worked.. now it should work)

## 2020-06-11
- First entry in the changelog. This is for the container only, not for deemix or any of it's components.
- Switched port to 6595 from 9666 (due to pyweb update). THIS SHOULD BE FIX NOW. I have hard-coded the port into the run parameter, so even if deemix itself will switch the port, you should always just have to map to 6595
- Switched the base from a pre-build alpine-python3 build (that was pretty old) to the current alpine base with my own python installation.