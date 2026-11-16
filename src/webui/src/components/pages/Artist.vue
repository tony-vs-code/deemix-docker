<template>
	<div class="artist-page">
		<!-- Loading State -->
		<div v-if="!hasDataLoaded" class="artist-loading glass-panel">
			<i class="material-icons spin-active loading-icon">sync</i>
			<p class="loading-text">Loading artist profile...</p>
		</div>

		<div v-else class="artist-content">
			<!-- Hero Header -->
			<div class="artist-hero glass-panel">
				<div class="hero-backdrop" :style="heroBackdropStyle"></div>
				<div class="hero-content">
					<div class="artist-avatar-wrapper">
						<img
							v-if="artistPicture"
							:src="artistPicture"
							:alt="artistName"
							class="artist-avatar"
						/>
						<div v-else class="artist-avatar-fallback">
							<i class="material-icons avatar-fallback-icon">person</i>
						</div>
					</div>

					<div class="artist-meta">
						<span class="artist-type-tag">Artist</span>
						<h1 class="artist-title">{{ artistName }}</h1>
						<div class="artist-stats-row">
							<div class="stat-pill">
								<i class="material-icons stat-pill-icon">album</i>
								<span>{{ sortedData.length }} {{ $tc(`globals.listTabs.${currentTab}`, 2) }}</span>
							</div>
						</div>
					</div>

					<div class="hero-actions">
						<button
							type="button"
							class="btn btn-primary hero-btn"
							:title="$t('globals.download_hint')"
							@click.stop="sendAddToQueue(downloadLink + '/discography')"
						>
							<i class="material-icons btn-icon">cloud_download</i>
							<span>{{ $t('globals.download', { thing: $t('globals.listTabs.discography') }) }}</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Tabs Navigation -->
			<div class="artist-tabs-bar">
				<button
					v-for="(item, name) in artistReleases"
					:key="name"
					type="button"
					class="artist-tab-pill"
					:class="{ active: currentTab === name }"
					@click="currentTab = name"
				>
					<i class="material-icons tab-pill-icon">{{ getReleaseTabIcon(name) }}</i>
					<span>{{ $tc(`globals.listTabs.${name}`, 2) }}</span>
					<span v-if="item && item.length" class="tab-count-badge">{{ item.length }}</span>
				</button>
			</div>

			<!-- Releases Table -->
			<div class="releases-table-card glass-panel">
				<table class="table modern-table">
					<thead>
						<tr>
							<th class="th-release">{{ $tc('globals.listTabs.title', 1) }}</th>
							<th
								class="th-date sortable-th text-center"
								:class="{
									'sort-asc': sortKey === 'releaseDate' && sortOrder === 'asc',
									'sort-desc': sortKey === 'releaseDate' && sortOrder === 'desc'
								}"
								@click="sortBy('releaseDate')"
							>
								<span>{{ $t('globals.listTabs.releaseDate') }}</span>
								<i class="material-icons sort-icon">{{ getSortIcon('releaseDate') }}</i>
							</th>
							<th
								class="th-tracks sortable-th text-center"
								:class="{
									'sort-asc': sortKey === 'releaseTracksNumber' && sortOrder === 'asc',
									'sort-desc': sortKey === 'releaseTracksNumber' && sortOrder === 'desc'
								}"
								@click="sortBy('releaseTracksNumber')"
							>
								<span>{{ $tc('globals.listTabs.track', 2) }}</span>
								<i class="material-icons sort-icon">{{ getSortIcon('releaseTracksNumber') }}</i>
							</th>
							<th class="th-action text-center"></th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="release in sortedData" :key="release.releaseID" class="release-row">
							<!-- Cover Art + Title -->
							<td class="td-release">
								<router-link
									custom
									v-slot="{ navigate }"
									:to="{ name: 'Album', params: { id: release.releaseID } }"
								>
									<div class="release-info-wrapper" @click="navigate" @keypress.enter="navigate" role="link">
										<div class="release-cover-wrapper">
											<img
												:src="release.releaseCover"
												:alt="release.releaseTitle"
												class="release-cover-img"
												loading="lazy"
											/>
										</div>
										<div class="release-titles">
											<div class="release-title-row">
												<span class="release-title-text" :title="release.releaseTitle">
													{{ release.releaseTitle }}
												</span>
												<i
													v-if="release.isReleaseExplicit"
													class="material-icons explicit-icon"
													title="Explicit"
												>
													explicit
												</i>
												<span
													v-if="checkNewRelease(release.releaseDate)"
													class="new-release-tag"
												>
													NEW
												</span>
											</div>
											<span v-if="currentTab === 'all' && release.releaseType" class="release-type-badge">
												{{ $tc(`globals.listTabs.${release.releaseType}`, 1) }}
											</span>
										</div>
									</div>
								</router-link>
							</td>

							<!-- Release Date -->
							<td class="td-date text-center">
								<span class="date-pill">{{ release.releaseDate }}</span>
							</td>

							<!-- Track Count -->
							<td class="td-tracks text-center">
								<span class="tracks-pill">{{ release.releaseTracksNumber }} tracks</span>
							</td>

							<!-- Download Action -->
							<td class="td-action text-center">
								<button
									type="button"
									class="release-dl-btn"
									:title="$t('globals.download_hint')"
									@click.stop="sendAddToQueue(release.releaseLink)"
								>
									<i class="material-icons">cloud_download</i>
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Sticky Bottom Action Footer -->
			<div class="artist-sticky-footer glass-panel">
				<div class="footer-left">
					<button
						type="button"
						class="btn btn-secondary footer-btn"
						@click.stop="sendAddToQueue(downloadLink + '/discography')"
					>
						<i class="material-icons btn-icon">library_music</i>
						<span>{{ $t('globals.download', { thing: $t('globals.listTabs.discography') }) }}</span>
					</button>
				</div>
				<div class="footer-right">
					<button
						type="button"
						class="btn btn-primary footer-btn"
						@click.stop="sendAddToQueue(downloadLink + '/' + currentTab)"
					>
						<i class="material-icons btn-icon">cloud_download</i>
						<span>{{ $t('globals.download', { thing: $tc(`globals.listTabs.${currentTab}`, 2) }) }}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { defineComponent, ref, unref, reactive, computed, toRefs } from '@vue/composition-api'
import { orderBy } from 'lodash-es'
import { sendAddToQueue } from '@/utils/downloads'
import { checkNewRelease } from '@/utils/dates'
import { formatArtistData, getArtistData } from '@/data/artist'
import { standardizeData } from '@/data/standardize'

export default defineComponent({
	name: 'Artist',
	setup(_, ctx) {
		const state = reactive({
			currentTab: '',
			sortKey: 'releaseDate',
			sortOrder: 'desc',
			artistReleases: {},
			artistName: '',
			artistPicture: '',
			currentRelease: computed(() => state.artistReleases[state.currentTab] || [])
		})

		const artistID = computed(() => ctx.root.$router.currentRoute.params.id)
		const hasDataLoaded = ref(false)

		getArtistData(unref(artistID))
			.then(artistData => {
				hasDataLoaded.value = true

				const rawData = {
					data: [artistData],
					hasLoaded: unref(hasDataLoaded)
				}
				const {
					data: [{ artistName, artistPictureXL, artistReleases }]
				} = standardizeData(rawData, formatArtistData)

				Object.assign(state, {
					artistName,
					artistPicture: artistPictureXL,
					artistReleases,
					currentTab: Object.keys(artistReleases)[0] || 'all'
				})
			})
			.catch(err => {
				console.error('Failed to fetch artist data:', err)
				hasDataLoaded.value = true
			})

		const sortedData = computed(() => {
			if (!unref(hasDataLoaded) || !state.currentRelease) {
				return []
			}

			let sortKey = state.sortKey

			if (sortKey === 'releaseTracksNumber') {
				sortKey = o => Number(o.releaseTracksNumber)
			}

			return orderBy(state.currentRelease, sortKey, state.sortOrder)
		})

		return {
			...toRefs(state),
			hasDataLoaded,
			downloadLink: computed(() => `https://www.deezer.com/artist/${unref(artistID)}`),
			heroBackdropStyle: computed(() => ({
				backgroundImage: state.artistPicture
					? `radial-gradient(circle at top right, rgba(59, 130, 246, 0.25), transparent 70%), url(${state.artistPicture})`
					: 'none'
			})),
			sortedData,
			sendAddToQueue,
			checkNewRelease
		}
	},
	methods: {
		sortBy(key) {
			if (key === this.sortKey) {
				this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
			} else {
				this.sortKey = key
				this.sortOrder = 'desc'
			}
		},
		getSortIcon(key) {
			if (this.sortKey !== key) return 'unfold_more'
			return this.sortOrder === 'asc' ? 'expand_less' : 'expand_more'
		},
		getReleaseTabIcon(tabName) {
			const icons = {
				all: 'apps',
				top: 'trending_up',
				album: 'album',
				single: 'music_note',
				compile: 'library_music'
			}
			return icons[tabName] || 'folder'
		}
	}
})
</script>

<style scoped>
.artist-page {
	padding-bottom: 5rem;
}

/* Loading State */
.artist-loading {
	padding: 5rem 1rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border-radius: 1.25rem;
	gap: 1rem;
}

.loading-icon {
	font-size: 2.75rem;
	color: var(--primary-color);
}

.spin-active {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.loading-text {
	font-size: 1rem;
	color: var(--secondary-text);
	margin: 0;
	font-weight: 500;
}

/* Hero Header */
.artist-hero {
	position: relative;
	border-radius: 1.5rem;
	overflow: hidden;
	margin-bottom: 2rem;
	border: 1px solid var(--border-color);
}

.hero-backdrop {
	position: absolute;
	inset: 0;
	background-size: cover;
	background-position: center 25%;
	filter: blur(28px);
	opacity: 0.28;
	transform: scale(1.1);
	pointer-events: none;
}

.hero-content {
	position: relative;
	z-index: 1;
	padding: 2.5rem 2rem;
	display: flex;
	align-items: center;
	gap: 2rem;
	flex-wrap: wrap;
}

.artist-avatar-wrapper {
	width: 7rem;
	height: 7rem;
	border-radius: 9999px;
	overflow: hidden;
	border: 3px solid rgba(255, 255, 255, 0.2);
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
	flex-shrink: 0;
	background: #090d16;
}

.artist-avatar {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.artist-avatar-fallback {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
	background: var(--card-background);
}

.avatar-fallback-icon {
	font-size: 3.5rem;
}

.artist-meta {
	flex: 1;
	min-width: 16rem;
}

.artist-type-tag {
	font-size: 0.75rem;
	font-weight: 800;
	text-transform: uppercase;
	letter-spacing: 0.1em;
	color: var(--primary-color);
	display: block;
	margin-bottom: 0.35rem;
}

.artist-title {
	font-size: 2.5rem;
	font-weight: 800;
	color: var(--foreground);
	margin: 0 0 0.75rem 0;
	letter-spacing: -0.03em;
	line-height: 1.15;
}

.artist-stats-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.stat-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid var(--border-color);
	padding: 0.25rem 0.75rem;
	border-radius: 9999px;
	font-size: 0.8125rem;
	color: var(--secondary-text);
	font-weight: 600;
}

.stat-pill-icon {
	font-size: 1rem;
	color: var(--primary-color);
}

.hero-actions {
	display: flex;
	align-items: center;
	gap: 1rem;
}

.hero-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	height: 2.75rem;
	padding: 0 1.25rem;
	border-radius: 0.75rem;
	font-size: 0.875rem;
}

/* Tabs Navigation Bar */
.artist-tabs-bar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 1.5rem;
	overflow-x: auto;
	padding-bottom: 0.5rem;
}

.artist-tab-pill {
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

.artist-tab-pill:hover {
	color: var(--foreground);
	border-color: var(--border-color-hover);
	background: var(--surface-glass);
}

.artist-tab-pill.active {
	background: var(--primary-gradient);
	border-color: transparent;
	color: #ffffff;
	box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
}

.tab-pill-icon {
	font-size: 1.1rem;
}

.tab-count-badge {
	font-size: 0.6875rem;
	font-weight: 700;
	padding: 0.1rem 0.45rem;
	border-radius: 9999px;
	background: rgba(255, 255, 255, 0.15);
	color: inherit;
}

/* Releases Table Card */
.releases-table-card {
	border-radius: 1.25rem;
	overflow: hidden;
	border: 1px solid var(--border-color);
	margin-bottom: 2rem;
}

.modern-table {
	width: 100%;
	border-collapse: collapse;
}

.modern-table thead {
	background: rgba(255, 255, 255, 0.02);
	border-bottom: 1px solid var(--border-color);
}

.modern-table th {
	padding: 0.85rem 1rem;
	font-size: 0.75rem;
	font-weight: 700;
	color: var(--secondary-text);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	text-align: left;
}

.sortable-th {
	cursor: pointer;
	user-select: none;
	transition: color 0.15s ease;
}

.sortable-th:hover {
	color: var(--foreground);
}

.sort-icon {
	font-size: 1rem;
	vertical-align: middle;
	margin-left: 0.25rem;
	opacity: 0.7;
}

.th-date {
	width: 10rem;
}

.th-tracks {
	width: 8rem;
}

.th-action {
	width: 4rem;
}

.release-row {
	border-bottom: 1px solid var(--border-color);
	transition: background-color 0.15s ease;
}

.release-row:hover {
	background: var(--table-highlight, rgba(255, 255, 255, 0.04));
}

.release-row:last-child {
	border-bottom: none;
}

.release-row td {
	padding: 0.75rem 1rem;
	vertical-align: middle;
}

/* Release Info & Cover */
.release-info-wrapper {
	display: flex;
	align-items: center;
	gap: 1rem;
	cursor: pointer;
	text-decoration: none;
}

.release-cover-wrapper {
	width: 3.25rem;
	height: 3.25rem;
	border-radius: 0.625rem;
	overflow: hidden;
	flex-shrink: 0;
	background: #090d16;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.release-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.25s ease;
}

.release-row:hover .release-cover-img {
	transform: scale(1.05);
}

.release-titles {
	display: flex;
	flex-direction: column;
	gap: 0.2rem;
	min-width: 0;
}

.release-title-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.release-title-text {
	font-size: 0.9375rem;
	font-weight: 700;
	color: var(--foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: color 0.15s ease;
}

.release-row:hover .release-title-text {
	color: var(--primary-color);
}

.explicit-icon {
	font-size: 1.1rem;
	color: #ef4444;
	flex-shrink: 0;
}

.new-release-tag {
	font-size: 0.625rem;
	font-weight: 800;
	background: rgba(16, 185, 129, 0.2);
	border: 1px solid rgba(16, 185, 129, 0.4);
	color: #10b981;
	padding: 0.1rem 0.35rem;
	border-radius: 0.25rem;
	letter-spacing: 0.05em;
	flex-shrink: 0;
}

.release-type-badge {
	font-size: 0.6875rem;
	font-weight: 600;
	color: var(--secondary-text);
	text-transform: capitalize;
}

/* Pills */
.date-pill,
.tracks-pill {
	font-size: 0.75rem;
	font-weight: 600;
	color: var(--secondary-text);
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid var(--border-color);
	padding: 0.2rem 0.55rem;
	border-radius: 0.375rem;
	white-space: nowrap;
}

/* Action button */
.release-dl-btn {
	background: transparent;
	border: none;
	color: var(--secondary-text);
	cursor: pointer;
	width: 2rem;
	height: 2rem;
	border-radius: 0.5rem;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
}

.release-dl-btn:hover {
	color: var(--primary-color);
	background: rgba(59, 130, 246, 0.12);
}

.release-dl-btn i {
	font-size: 1.25rem;
}

/* Sticky Bottom Footer */
.artist-sticky-footer {
	position: sticky;
	bottom: 1rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem 1.5rem;
	border-radius: 1rem;
	border: 1px solid var(--border-color);
	backdrop-filter: blur(16px);
	z-index: 10;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.footer-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0 1.25rem;
	height: 2.5rem;
	border-radius: 0.625rem;
	font-size: 0.8125rem;
}

@media (max-width: 640px) {
	.hero-content {
		flex-direction: column;
		align-items: flex-start;
		gap: 1.25rem;
	}
	.artist-title {
		font-size: 1.85rem;
	}
	.artist-sticky-footer {
		flex-direction: column;
		gap: 0.75rem;
	}
	.footer-left,
	.footer-right {
		width: 100%;
	}
	.footer-btn {
		width: 100%;
	}
}
</style>
