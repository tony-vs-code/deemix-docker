# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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