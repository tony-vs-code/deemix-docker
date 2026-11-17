<template>
	<div class="charts-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<h1 class="page-title">
					<i class="material-icons title-icon">leaderboard</i>
					{{ $t('charts.title') }}
				</h1>
				<div class="header-meta-row">
					<p v-if="!country" class="page-subtitle">Select a country or region to view top Deezer charts</p>
					<div v-else class="country-badge">
						<i class="material-icons country-badge-icon">place</i>
						<span class="country-badge-label">{{ country }}</span>
					</div>
				</div>
			</div>

			<!-- Header Actions when Country is Selected -->
			<div v-if="country !== ''" class="header-actions">
				<button class="btn btn-secondary action-btn" @click="onChangeCountry">
					<i class="material-icons btn-icon">public</i>
					<span>{{ $t('charts.changeCountry') }}</span>
				</button>
				<button
					:data-link="'https://www.deezer.com/playlist/' + id"
					class="btn btn-primary action-btn"
					@click.stop="addToQueue"
				>
					<i class="material-icons btn-icon">cloud_download</i>
					<span>{{ $t('charts.download') }}</span>
				</button>
			</div>
		</div>

		<!-- Country Selection Grid -->
		<div v-if="country === ''" class="countries-section">
			<div class="countries-grid">
				<div
					v-for="release in countries"
					:key="release.id"
					:aria-label="release.title"
					:data-id="release.id"
					:data-title="release.title"
					class="country-card"
					role="button"
					tabindex="0"
					@click="selectCountry(release)"
					@keyup.enter="selectCountry(release)"
				>
					<div class="country-img-wrapper">
						<img :src="release.picture_medium" :alt="release.title" class="country-img" loading="lazy" />
						<div class="country-overlay">
							<span class="country-name-badge">{{ release.title }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Country Chart Tracks Table -->
		<div v-else class="chart-content">
			<!-- Loading State -->
			<div v-if="chart.length === 0" class="chart-loading glass-panel">
				<i class="material-icons spin-active loading-icon">sync</i>
				<p class="loading-text">Loading chart tracks...</p>
			</div>

			<!-- Tracks Table -->
			<div v-else class="table-container glass-panel">
				<table class="table modern-table">
					<thead>
						<tr>
							<th class="th-rank">#</th>
							<th class="th-cover"></th>
							<th class="th-title">{{ $tc('globals.listTabs.title', 1) }}</th>
							<th class="th-artist">{{ $tc('globals.listTabs.artist', 1) }}</th>
							<th class="th-album">{{ $tc('globals.listTabs.album', 1) }}</th>
							<th class="th-duration text-center">
								<i class="material-icons schedule-icon" title="Duration">schedule</i>
							</th>
							<th class="th-action text-center"></th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(track, pos) in chart" :key="track.id || pos" class="chart-row">
							<!-- Rank Badge -->
							<td class="td-rank">
								<span v-if="pos === 0" class="rank-badge rank-gold" title="Rank 1">1</span>
								<span v-else-if="pos === 1" class="rank-badge rank-silver" title="Rank 2">2</span>
								<span v-else-if="pos === 2" class="rank-badge rank-bronze" title="Rank 3">3</span>
								<span v-else class="rank-num">{{ pos + 1 }}</span>
							</td>

							<!-- Cover Art + Preview -->
							<td class="td-cover">
								<div :data-preview="track.preview" class="preview-box" @click="playPausePreview">
									<PreviewControls v-if="track.preview" />
									<img :src="track.album ? track.album.cover_small : ''" class="track-cover-img" alt="Cover" />
								</div>
							</td>

							<!-- Track Title -->
							<td class="td-title">
								<span class="track-title-text" :title="track.title">
									{{ track.title }}
									<span v-if="track.title_version && !track.title.includes(track.title_version)" class="track-version">
										({{ track.title_version }})
									</span>
								</span>
							</td>

							<!-- Artist Link -->
							<td class="td-artist">
								<router-link
									v-if="track.artist && track.artist.id"
									:to="{ name: 'Artist', params: { id: track.artist.id } }"
									class="artist-link"
								>
									{{ track.artist.name }}
								</router-link>
								<span v-else class="artist-name">{{ track.artist ? track.artist.name : '' }}</span>
							</td>

							<!-- Album Link -->
							<td class="td-album">
								<router-link
									v-if="track.album && track.album.id"
									:to="{ name: 'Album', params: { id: track.album.id } }"
									class="album-link"
								>
									{{ track.album.title }}
								</router-link>
								<span v-else class="album-title">{{ track.album ? track.album.title : '' }}</span>
							</td>

							<!-- Duration -->
							<td class="td-duration text-center">
								<span class="duration-pill">{{ convertDuration(track.duration) }}</span>
							</td>

							<!-- Download Action -->
							<td class="td-action text-center">
								<button
									type="button"
									class="track-dl-btn"
									:data-link="track.link"
									:title="$t('globals.download_hint')"
									@click.stop="addToQueue"
								>
									<i class="material-icons">cloud_download</i>
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script>
import PreviewControls from '@components/globals/PreviewControls.vue'
import { playPausePreview } from '@components/globals/TheTrackPreview.vue'
import { sendAddToQueue } from '@/utils/downloads'
import { convertDuration } from '@/utils/utils'
import { getChartsData, getChartTracks } from '@/data/charts'

export default {
	name: 'Charts',
	components: {
		PreviewControls
	},
	data() {
		return {
			country: '',
			id: 0,
			countries: [],
			chart: []
		}
	},
	computed: {
		worldwideRelease() {
			const worldwideRelease = this.countries.filter(country => {
				return country.title === 'Worldwide'
			})

			return worldwideRelease[0]
		}
	},
	watch: {
		id(newId) {
			const isActualChart = newId !== 0

			if (isActualChart) {
				this.setTracklist([])
				getChartTracks(newId).then(response => this.setTracklist(response.data))
			}
		}
	},
	async created() {
		try {
			const { data: chartsData } = await getChartsData()
			this.initCharts(chartsData)
		} catch (err) {
			console.error('Failed to load charts data:', err)
		}
	},
	methods: {
		convertDuration,
		playPausePreview,
		addToQueue(e) {
			e.stopPropagation()
			const link = e.currentTarget.dataset.link
			if (link) {
				sendAddToQueue(link)
			}
		},
		selectCountry(release) {
			const content = document.getElementById('content')
			if (content) {
				content.scrollTo(0, 0)
			}
			this.country = release.title
			localStorage.setItem('chart', this.country)
			this.id = release.id
		},
		setTracklist(data) {
			this.chart = data || []
		},
		onChangeCountry() {
			this.country = ''
			this.id = 0
		},
		initCharts(chartsData) {
			this.countries = chartsData || []
			this.country = localStorage.getItem('chart') || ''

			if (!this.country) return

			let i = 0
			for (; i < this.countries.length; i++) {
				if (this.countries[i].title === this.country) break
			}

			if (i !== this.countries.length) {
				this.id = this.countries[i].id
			} else {
				this.country = ''
				localStorage.setItem('chart', this.country)
			}
		}
	}
}
</script>

<style scoped>
.charts-page {
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

.country-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	background: rgba(6, 182, 212, 0.12);
	border: 1px solid rgba(6, 182, 212, 0.3);
	color: #06b6d4;
	padding: 0.2rem 0.65rem;
	border-radius: 9999px;
	font-size: 0.8125rem;
	font-weight: 600;
}

.country-badge-icon {
	font-size: 1rem;
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.action-btn {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0 1rem;
	height: 2.5rem;
	border-radius: 0.75rem;
}

.btn-icon {
	font-size: 1.15rem;
}

/* Countries Grid */
.countries-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
	gap: 1.25rem;
}

.country-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	overflow: hidden;
	cursor: pointer;
	transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
	outline: none;
}

.country-card:hover {
	transform: translateY(-4px);
	border-color: var(--border-color-hover);
	box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.35);
}

.country-card:focus-visible {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
}

.country-img-wrapper {
	position: relative;
	width: 100%;
	aspect-ratio: 1 / 1;
	background: #090d16;
}

.country-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.35s ease;
}

.country-card:hover .country-img {
	transform: scale(1.05);
}

.country-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 60%);
	display: flex;
	align-items: flex-end;
	padding: 0.75rem;
}

.country-name-badge {
	font-size: 0.875rem;
	font-weight: 700;
	color: #fff;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
}

/* Chart Table */
.chart-loading {
	padding: 4rem 1rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border-radius: 1rem;
	gap: 1rem;
}

.loading-icon {
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

.loading-text {
	font-size: 0.9375rem;
	color: var(--secondary-text);
	margin: 0;
}

.table-container {
	border-radius: 1rem;
	overflow: hidden;
	border: 1px solid var(--border-color);
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
	padding: 0.75rem 1rem;
	font-size: 0.75rem;
	font-weight: 700;
	color: var(--secondary-text);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	text-align: left;
}

.th-rank {
	width: 3.5rem;
	text-align: center;
}

.th-cover {
	width: 3.5rem;
}

.th-duration {
	width: 6rem;
}

.th-action {
	width: 4rem;
}

.schedule-icon {
	font-size: 1rem;
	vertical-align: middle;
}

.chart-row {
	border-bottom: 1px solid var(--border-color);
	transition: background-color 0.15s ease;
}

.chart-row:hover {
	background: var(--table-highlight, rgba(255, 255, 255, 0.04));
}

.chart-row:last-child {
	border-bottom: none;
}

.chart-row td {
	padding: 0.65rem 1rem;
	vertical-align: middle;
}

/* Rank Badges */
.td-rank {
	text-align: center;
}

.rank-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 9999px;
	font-size: 0.8125rem;
	font-weight: 800;
}

.rank-gold {
	background: rgba(234, 179, 8, 0.18);
	border: 1px solid rgba(234, 179, 8, 0.5);
	color: #eab308;
	box-shadow: 0 0 10px rgba(234, 179, 8, 0.2);
}

.rank-silver {
	background: rgba(148, 163, 184, 0.18);
	border: 1px solid rgba(148, 163, 184, 0.5);
	color: #94a3b8;
}

.rank-bronze {
	background: rgba(217, 119, 6, 0.18);
	border: 1px solid rgba(217, 119, 6, 0.5);
	color: #d97706;
}

.rank-num {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--muted-text);
}

/* Preview / Cover */
.preview-box {
	position: relative;
	width: 2.75rem;
	height: 2.75rem;
	border-radius: 0.5rem;
	overflow: hidden;
	cursor: pointer;
	flex-shrink: 0;
	background: #090d16;
}

.track-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

/* Track Title */
.track-title-text {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--foreground);
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.track-version {
	font-size: 0.75rem;
	color: var(--secondary-text);
	font-weight: 400;
	margin-left: 0.25rem;
}

/* Artist Link */
.artist-link {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	text-decoration: none;
	transition: color 0.15s ease;
}

.artist-link:hover {
	color: var(--primary-color);
}

.artist-name {
	font-size: 0.8125rem;
	color: var(--secondary-text);
}

/* Album Link */
.album-link {
	font-size: 0.8125rem;
	color: var(--muted-text);
	text-decoration: none;
	transition: color 0.15s ease;
}

.album-link:hover {
	color: var(--foreground);
}

.album-title {
	font-size: 0.8125rem;
	color: var(--muted-text);
}

/* Duration Pill */
.duration-pill {
	font-size: 0.75rem;
	font-family: monospace;
	font-weight: 600;
	color: var(--secondary-text);
	background: rgba(255, 255, 255, 0.04);
	padding: 0.15rem 0.5rem;
	border-radius: 0.375rem;
	border: 1px solid var(--border-color);
}

/* Download Action */
.track-dl-btn {
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

.track-dl-btn:hover {
	color: var(--primary-color);
	background: rgba(59, 130, 246, 0.12);
}

.track-dl-btn i {
	font-size: 1.25rem;
}
</style>
