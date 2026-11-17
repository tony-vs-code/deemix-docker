# Vue 3 Migration Guide & Inventory: Deemix WebUI

This document provides a comprehensive inventory of the current Vue 2 codebase status and outlines the technical roadmap for the full Vue 3 upgrade of `deemix-webui`.

---

## 1. Current State & Baseline

| Component / Dependency | Current Version | Target (Vue 3 Stack) |
|---|---|---|
| **Core Framework** | `vue@2.6.14` + `@vue/composition-api@1.0.6` | `vue@^3.4.x` |
| **Routing** | `vue-router@3.5.2` | `vue-router@^4.3.x` |
| **State Management** | `vuex@3.6.2` | `vuex@^4.1.x` or `pinia@^2.1.x` |
| **Internationalization** | `vue-i18n@8.25.0` | `vue-i18n@^9.10.x` |
| **SFC Rollup Plugin** | `rollup-plugin-vue@4.2.0` | `@vitejs/plugin-vue` or `rollup-plugin-vue@^6.0.0` |
| **Bundler & Minifier** | `rollup@2.56.1` + `esbuild@0.12.19` (target: `es2020`) | `vite` / `rollup` + `esbuild` |

---

## 2. Already Compatible & Modernized Elements

The codebase has been audited and prepared for Vue 3 compatibility:

1. **Slots Syntax (`v-slot`)**:
   - All router links and scoped slots already use modern `v-slot="{ navigate }"` syntax (e.g. `Artist.vue`, `Home.vue`, `TopResult.vue`, `ResultsAlbums.vue`, `ResultsArtists.vue`, `ResultsPlaylists.vue`, `ResultsTracks.vue`).
   - Deprecated `slot="..."` and `slot-scope="..."` attributes are not present.

2. **Template Directives (`v-for` + `v-if`)**:
   - Zero occurrences of `v-for` and `v-if` co-located on the same element. All list iterations and conditional renderings are cleanly separated using `<template>` wrappers or computed filters.

3. **CSS Selectors**:
   - Obsolete `/deep/` and `>>>` combinators are completely absent.
   - The remaining scoped style deep selectors use `::v-deep` (in `TheSidebar.vue` and `Settings.vue`), ready for straightforward transformation to `:deep(...)`.

4. **Code Quality & Linting**:
   - Full ESLint compliance (`eslint src/**/*.{js,vue,mjs} --fix`) passes with zero errors and zero warnings.
   - Strict equality checks (`===`) and safe prototype method calls (`Object.prototype.hasOwnProperty.call`) are enforced throughout.
   - Invalid HTML template characters (e.g., raw `<` in text interpolation) have been eliminated in favor of clean computed properties (`volumeIcon` in `Library.vue`).

5. **Rollup & Build Tooling Modernization**:
   - Output format updated to `format: 'es'`.
   - Node resolve and CommonJS plugins configured with `{ browser: true, preferBuiltins: false }` and `{ transformMixedEsModules: true }`.
   - Dynamic package metadata reading via `fs.readFileSync` + `JSON.parse`.
   - Clean `onwarn` handler filtering third-party `node_modules` warnings while surfacing application warnings.
   - Build chaining streamlined with direct yarn execution, `BROWSERSLIST_IGNORE_OLD_DATA=1` suppression, and esbuild targeting `es2020`.

---

## 3. Inventory of Remaining Vue 3 Migration Steps

### A. Application Initialization & Global API (`src/app.js`)
In Vue 2, the root instance is created via `new Vue(...)`:
```javascript
// Current (Vue 2):
new Vue({
    store,
    router,
    i18n,
    render: h => h(App)
}).$mount('#app')
```
In Vue 3, this transitions to the `createApp` factory:
```javascript
// Target (Vue 3):
import { createApp } from 'vue'
import App from '@/App.vue'

const app = createApp(App)
app.use(store)
app.use(router)
app.use(i18n)
app.mount('#app')
```

### B. Vue Router 3 -> 4 (`src/router.js`)
- Replace `new VueRouter({ ... })` with `createRouter({ history: createWebHistory(location.base), routes })`.
- Remove `Vue.use(VueRouter)`.
- Update `scrollBehavior(to, from, savedPosition)` return signature: `{ left: 0, top: 0 }` (instead of `{ x: 0, y: 0 }`).

### C. Vuex 3 -> 4 / Pinia (`src/store/index.js`)
- Replace `new Store({ ... })` with `createStore({ ... })`.
- Remove `Vue.use(Vuex)`.
- Module structure, getters, actions, and mutations remain largely backward-compatible in Vuex 4, with optional future migration to Pinia.

### D. Vue I18n 8 -> 9 (`src/plugins/i18n.js`)
- Replace `new VueI18n({ ... })` with `createI18n({ legacy: false, ... })` or `createI18n({ legacy: true, ... })` during initial transition.
- Remove `Vue.use(VueI18n)`.
- Update pluralization rules signature if using Composition API mode (`legacy: false`).

### E. Native Composition API & Removal of Polyfill
- Remove `@vue/composition-api` from `package.json` and delete `src/plugins/composition-api.js`.
- Replace all imports of `defineComponent`, `ref`, `computed`, etc. from `@vue/composition-api` with direct imports from `'vue'`.

### F. EventBus Modernization (`$on`, `$off`, `$emit`)
In Vue 3, instance event methods (`$on`, `$off`, `$once`) were removed from Vue instances.
- **Current usages**:
  - `src/utils/EventBus.js` (`new Vue()`)
  - `TheTrackPreview.vue` (`trackPreview:playPausePreview`, etc.)
  - `TheContextMenu.vue` (`this.$root.$on('ContextMenu:searchbar', ...)`)
  - `TheQualityModal.vue` (`this.$root.$on('QualityModal:open', ...)`)
  - `TheSearchBar.vue`, `Downloads.vue`, `Settings.vue` (`this.$on('hook:destroyed', ...)`)
  - `router.js` (`EventBus.$emit('showAlbum', ...)`, `EventBus.$emit('showPlaylist', ...)`)
- **Migration Plan**:
  - Install `mitt` (or `tiny-emitter`).
  - Implement `src/utils/EventBus.js`:
    ```javascript
    import mitt from 'mitt'
    const emitter = mitt()
    export default emitter
    ```
  - Migrate all `EventBus.$on` -> `EventBus.on`, `EventBus.$emit` -> `EventBus.emit`, `EventBus.$off` -> `EventBus.off`.
  - Replace `$root.$on` with event bus subscriptions or state actions.
  - Replace `this.$on('hook:destroyed', ...)` with standard `unmounted()` hook or `onUnmounted` from Vue Composition API.

### G. Component Lifecycle Hooks
- `destroyed()` -> `unmounted()`:
  - `src/components/pages/Library.vue`
  - `src/components/pages/Downloads.vue`
- `beforeDestroy()` -> `beforeUnmount()`:
  - `src/components/downloads/TheDownloadBar.vue`

### H. Reactivity & Property Assignment (`$set` / `$delete`)
Vue 3 uses JavaScript `Proxy` for reactivity, rendering `Vue.set`, `Vue.delete`, `this.$set`, and `this.$delete` obsolete.
- Occurrences to refactor to standard assignments / `delete`:
  - `TheDownloadBar.vue` (queue item updates & status transitions)
  - `Downloads.vue` (queue updates, removal, and reordering)
  - `Settings.vue` (`downloadLocation` updates)
  - `Tracklist.vue` (track selection toggles)

### I. Scoped CSS `:deep()` Pseudo-Class
Update scoped CSS pseudo-elements:
- `TheSidebar.vue`:
  - `.deemix-icon-container::v-deep svg` -> `.deemix-icon-container :deep(svg)`
  - `.slim-sidebar .deemix-icon-container::v-deep svg` -> `.slim-sidebar .deemix-icon-container :deep(svg)`
- `Settings.vue`:
  - `.locale-flag-box ::v-deep svg` -> `.locale-flag-box :deep(svg)`
  - `.locale-card--active .locale-flag-box ::v-deep svg` -> `.locale-card--active .locale-flag-box :deep(svg)`
  - `.locale-card:not(.locale-card--active) .locale-flag-box ::v-deep svg` -> `.locale-card:not(.locale-card--active) .locale-flag-box :deep(svg)`

---

## 4. Rollout Strategy & Testing Verification

1. **Phase 1 (Done)**: Modernize Rollup build tooling, fix lint issues, verify syntax compatibility, eliminate caniuse-lite spam, document migration inventory.
2. **Phase 2**: Upgrade core framework dependencies (`vue@3`, `vue-router@4`, `vuex@4` or `pinia`, `vue-i18n@9`, `@vitejs/plugin-vue` / `rollup-plugin-vue@6`, and `mitt`).
3. **Phase 3**: Migrate `EventBus`, lifecycle hooks (`unmounted`/`beforeUnmount`), and remove `$set`/`$delete`.
4. **Phase 4**: Verify complete end-to-end functionality via Docker build and preview server testing (`preview-release` skill on port 6595).
