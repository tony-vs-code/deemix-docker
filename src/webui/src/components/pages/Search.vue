<template>
	<div class="search-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<h1 class="page-title">
					<i class="material-icons title-icon">search</i>
					Search
				</h1>
				<div class="header-meta-row">
					<p v-if="isQueryEmpty" class="page-subtitle">Search Deezer artists, albums, tracks, and playlists</p>
					<div v-else class="query-badge">
						<span class="query-label">Results for:</span>
						<span class="query-term">"{{ results.query }}"</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Empty Query State -->
		<div v-show="isQueryEmpty && !isSearching" class="empty-search-container">
			<div class="empty-search-card glass-panel">
				<div class="empty-icon-box">
					<i class="material-icons empty-icon">search</i>
				</div>
				<h2 class="empty-title">{{ $t('search.startSearching') }}</h2>
				<p class="empty-desc">{{ $t('search.description') }}</p>
				<div class="search-tips">
					<div class="tip-pill">
						<i class="material-icons tip-icon">tips_and_updates</i>
						<span>Tip: Type in the top search bar to find artists, tracks, albums, or paste a Deezer URL</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Searching Loading State -->
		<div v-show="isSearching" class="search-loading-container">
			<div class="search-loading-card glass-panel">
				<i class="material-icons spin-active search-spinner">sync</i>
				<p class="search-loading-text">Searching Deezer catalog...</p>
			</div>
		</div>

		<!-- Active Search Results -->
		<div v-show="!isQueryEmpty && !isSearching" class="search-results-section">
			<!-- Modern Pill Navigation Tabs -->
			<div class="search-tabs-bar">
				<button
					v-for="tab in tabs"
					:key="tab.name"
					type="button"
					class="search-tab-pill"
					:class="{ active: currentTab.name === tab.name }"
					@click="changeSearchTab(tab.searchType)"
				>
					<i class="material-icons pill-icon">{{ getTabIcon(tab.searchType) }}</i>
					<span class="pill-label">{{ tab.name }}</span>
					<span v-if="getTabCount(tab)" class="pill-count-badge">{{ getTabCount(tab) }}</span>
				</button>
			</div>

			<!-- Dynamic Tab Content -->
			<keep-alive>
				<component
					:is="currentTab.component"
					:view-info="getViewInfo()"
					want-headers
					:items-to-show="Infinity"
					@add-to-queue="addToQueue"
					@change-search-tab="changeSearchTab"
				></component>
			</keep-alive>
		</div>
	</div>
</template>

<script>
import { computed, onMounted, reactive, ref, toRefs, watch, defineComponent } from '@vue/composition-api'
import { uniqWith } from 'lodash-es'

import ResultsAll from '@components/search/ResultsAll.vue'
import ResultsAlbums from '@components/search/ResultsAlbums.vue'
import ResultsArtists from '@components/search/ResultsArtists.vue'
import ResultsPlaylists from '@components/search/ResultsPlaylists.vue'
import ResultsTracks from '@components/search/ResultsTracks.vue'
import { sendAddToQueue } from '@/utils/downloads'
import { numberWithDots, convertDuration } from '@/utils/utils'

import { formatSingleTrack, formatAlbums, formatArtist, formatPlaylist } from '@/data/search'
import { standardizeData } from '@/data/standardize'
import { useMainSearch } from '@/use/main-search'
import { useSearch } from '@/use/search'

const resetObj = { data: [], next: 0, total: 0, hasLoaded: false }

const lastTab = ref(null)

export default defineComponent({
	name: 'Search',
	props: {
		performScrolledSearch: {
			type: Boolean,
			required: false
		}
	},
	setup(_, ctx) {
		const state = reactive({
			currentTab: {
				name: '',
				searchType: '',
				component: {},
				viewInfo: '',
				formatFunc: () => {}
			},
			results: {
				query: '',
				allTab: {
					ORDER: [],
					TOP_RESULT: [],
					ALBUM: {
						hasLoaded: false
					},
					ARTIST: {
						hasLoaded: false
					},
					TRACK: {
						hasLoaded: false
					},
					PLAYLIST: {
						hasLoaded: false
					}
				},
				trackTab: { ...resetObj },
				albumTab: { ...resetObj },
				artistTab: { ...resetObj },
				playlistTab: { ...resetObj }
			},
			tabs: [
				{
					name: ctx.root.$i18n.t('globals.listTabs.all'),
					searchType: 'all',
					component: ResultsAll,
					viewInfo: 'allTab'
				},
				{
					name: ctx.root.$i18n.tc('globals.listTabs.track', 2),
					searchType: 'track',
					component: ResultsTracks,
					viewInfo: 'trackTab',
					formatFunc: formatSingleTrack
				},
				{
					name: ctx.root.$i18n.tc('globals.listTabs.album', 2),
					searchType: 'album',
					component: ResultsAlbums,
					viewInfo: 'albumTab',
					formatFunc: formatAlbums
				},
				{
					name: ctx.root.$i18n.tc('globals.listTabs.artist', 2),
					searchType: 'artist',
					component: ResultsArtists,
					viewInfo: 'artistTab',
					formatFunc: formatArtist
				},
				{
					name: ctx.root.$i18n.tc('globals.listTabs.playlist', 2),
					searchType: 'playlist',
					component: ResultsPlaylists,
					viewInfo: 'playlistTab',
					formatFunc: formatPlaylist
				}
			]
		})
		const { searchResult, performMainSearch } = useMainSearch()
		const { result, performSearch } = useSearch()
		const cachedSearchedTerm = computed(() => searchResult.value.QUERY)
		const searchedTerm = computed(() => ctx.root.$route.query.term || cachedSearchedTerm.value)
		const isQueryEmpty = computed(() => state.results.query === '')
		const isSearching = ref(false)
		const isMainSearchCached = computed(() => Object.keys(searchResult.value).length !== 0)
		const isNewSearch = computed(() => cachedSearchedTerm.value !== searchedTerm.value)

		if (isMainSearchCached.value && !isNewSearch.value) {
			onMounted(() => {
				handleMainSearch(searchResult.value)
			})
		}

		if (searchedTerm.value && (!isMainSearchCached.value || isNewSearch.value)) {
			performMainSearch(searchedTerm.value)
			isSearching.value = true
		}

		function handleMainSearch(newValue) {
			// Hide loading placeholder
			isSearching.value = false

			state.results.query = newValue.QUERY

			state.results.allTab = newValue
			state.results.allTab.TRACK.hasLoaded = true
			state.results.allTab.ALBUM.hasLoaded = true
			state.results.allTab.ARTIST.hasLoaded = true
			state.results.allTab.PLAYLIST.hasLoaded = true

			if (lastTab.value && lastTab.value.searchType !== 'all') {
				state.currentTab = lastTab.value

				performSearch({
					term: newValue.QUERY,
					type: state.currentTab.searchType
				})
			} else {
				state.currentTab = state.tabs.find(tab => tab.searchType === 'all')
			}
		}

		// Main search watcher
		watch(searchResult, handleMainSearch)

		// Search watcher
		watch(result, newValue => {
			const { next: nextResult, total, type, data: newData, error } = newValue

			const currentTabKey = `${type}Tab`
			let next = total
			state.results[currentTabKey].error = error

			if (nextResult) {
				next = parseInt(nextResult.match(/index=(\d*)/)[1])
			}

			if (state.results[currentTabKey].total !== total) {
				state.results[currentTabKey].total = total
			}

			if (state.results[currentTabKey].next !== next) {
				state.results[currentTabKey].next = next

				// Preventing duplicate entries by filtering them by ID
				const rawData = state.results[currentTabKey].data.concat(newData)
				const filteredData = uniqWith(rawData, (obj1, obj2) => {
					return obj1.id === obj2.id
				})

				state.results[currentTabKey].data = filteredData
			}

			state.results[currentTabKey].hasLoaded = true
		})

		state.currentTab = state.tabs.find(tab => tab.searchType === 'all')

		return {
			...toRefs(state),
			isSearching,
			isQueryEmpty,
			searchResult,
			performMainSearch,
			performSearch
		}
	},
	computed: {
		loadedTabs() {
			const tabsLoaded = []

			for (const resultKey in this.results) {
				if (Object.prototype.hasOwnProperty.call(this.results, resultKey) && resultKey !== 'query') {
					const currentResult = this.results[resultKey]

					if (currentResult.hasLoaded) {
						tabsLoaded.push(resultKey.replace(/Tab/g, ''))
					}
				}
			}

			return tabsLoaded
		}
	},
	watch: {
		performScrolledSearch(needToSearch) {
			if (!needToSearch) return

			this.scrolledSearch(needToSearch)
		},
		currentTab(newTab) {
			if (this.isTabLoaded(newTab)) return

			this.performSearch({
				term: this.results.query,
				type: newTab.searchType,
				start: this.results[`${newTab.searchType}Tab`].next
			})
		}
	},
	methods: {
		numberWithDots,
		convertDuration,
		getTabIcon(searchType) {
			const icons = {
				all: 'apps',
				track: 'audiotrack',
				album: 'album',
				artist: 'person',
				playlist: 'queue_music'
			}
			return icons[searchType] || 'search'
		},
		getTabCount(tab) {
			if (tab.searchType === 'all') return null
			const tabData = this.results[tab.viewInfo]
			return tabData && tabData.total ? this.numberWithDots(tabData.total) : null
		},
		addToQueue(e) {
			const link = e.currentTarget.dataset.link
			if (link) {
				sendAddToQueue(link)
			}
		},
		getViewInfo() {
			if (this.currentTab.searchType === 'all') {
				return this.results.allTab
			}

			return standardizeData(this.results[this.currentTab.viewInfo], this.currentTab.formatFunc)
		},
		changeSearchTab(tabName) {
			tabName = tabName.toLowerCase()

			const newTab = this.tabs.find(tab => {
				return tab.searchType === tabName
			})

			if (!newTab) {
				console.error(`No tab ${tabName} found`)
				return
			}

			window.scrollTo(0, 0)
			this.currentTab = newTab
			lastTab.value = newTab
		},
		scrolledSearch() {
			if (this.currentTab.searchType === 'all') return

			const currentTabKey = `${this.currentTab.searchType}Tab`
			const needToPerformScrolledSearch = this.results[currentTabKey].next < this.results[currentTabKey].total

			if (needToPerformScrolledSearch) {
				this.performSearch({
					term: this.results.query,
					type: this.currentTab.searchType,
					start: this.results[`${this.currentTab.searchType}Tab`].next
				})
			}
		},
		isTabLoaded(tab) {
			return this.loadedTabs.includes(tab.searchType) || tab.searchType === 'all'
		}
	}
})
</script>

<style scoped>
.search-page {
	padding-bottom: 3rem;
}

/* Page Header */
.page-header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 2rem;
	gap: 1rem;
}

.page-title {
	font-size: 2rem;
	font-weight: 800;
	letter-spacing: -0.025em;
	display: flex;
	align-items: center;
	color: var(--foreground);
	margin: 0;
}

.title-icon {
	font-size: 2.25rem;
	color: var(--primary-color);
	margin-right: 0.75rem;
}

.header-meta-row {
	display: flex;
	align-items: center;
	margin-top: 0.35rem;
}

.page-subtitle {
	font-size: 0.875rem;
	color: var(--secondary-text);
	margin: 0;
}

.query-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	padding: 0.25rem 0.75rem;
	border-radius: 0.5rem;
	font-size: 0.8125rem;
}

.query-label {
	color: var(--secondary-text);
}

.query-term {
	color: var(--primary-color);
	font-weight: 700;
}

/* Empty Search State */
.empty-search-container {
	padding: 3rem 1rem;
	display: flex;
	justify-content: center;
}

.empty-search-card {
	max-width: 36rem;
	width: 100%;
	padding: 3rem 2rem;
	border-radius: 1.25rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	border: 1px solid var(--border-color);
}

.empty-icon-box {
	width: 4.5rem;
	height: 4.5rem;
	border-radius: 1.25rem;
	background: rgba(59, 130, 246, 0.12);
	border: 1px solid rgba(59, 130, 246, 0.25);
	color: var(--primary-color);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 1.5rem;
}

.empty-icon {
	font-size: 2.5rem;
}

.empty-title {
	font-size: 1.5rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0 0 0.5rem 0;
	letter-spacing: -0.015em;
}

.empty-desc {
	font-size: 0.9375rem;
	color: var(--secondary-text);
	margin: 0 0 1.5rem 0;
	line-height: 1.5;
}

.search-tips {
	width: 100%;
}

.tip-pill {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid var(--border-color);
	padding: 0.75rem 1.25rem;
	border-radius: 0.75rem;
	color: var(--secondary-text);
	font-size: 0.8125rem;
	line-height: 1.4;
}

.tip-icon {
	font-size: 1.15rem;
	color: #f59e0b;
	flex-shrink: 0;
}

/* Loading State */
.search-loading-container {
	padding: 4rem 1rem;
	display: flex;
	justify-content: center;
}

.search-loading-card {
	padding: 3rem;
	border-radius: 1.25rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	border: 1px solid var(--border-color);
}

.search-spinner {
	font-size: 2.5rem;
	color: var(--primary-color);
}

.spin-active {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.search-loading-text {
	font-size: 0.9375rem;
	color: var(--secondary-text);
	margin: 0;
	font-weight: 500;
}

/* Search Tabs Bar */
.search-tabs-bar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 2rem;
	overflow-x: auto;
	padding-bottom: 0.5rem;
}

.search-tab-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.55rem 1.15rem;
	border-radius: 9999px;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	color: var(--secondary-text);
	font-size: 0.8125rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	white-space: nowrap;
	outline: none;
}

.search-tab-pill:hover {
	color: var(--foreground);
	border-color: var(--border-color-hover);
	background: var(--surface-glass);
}

.search-tab-pill.active {
	background: var(--primary-gradient);
	border-color: transparent;
	color: #ffffff;
	box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
}

.pill-icon {
	font-size: 1.1rem;
}

.pill-count-badge {
	font-size: 0.6875rem;
	font-weight: 700;
	padding: 0.1rem 0.45rem;
	border-radius: 9999px;
	background: rgba(255, 255, 255, 0.15);
	color: inherit;
}
</style>
