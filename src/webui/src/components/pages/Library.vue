<template>
	<div class="library-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<h1 class="page-title">
					<i class="material-icons title-icon">library_music</i>
					{{ $t('libraryPage.title') }}
				</h1>
				<div class="folder-badge">
					<i class="material-icons folder-icon">folder</i>
					<span class="folder-label">{{ $t('libraryPage.downloadPath') }}:</span>
					<span class="folder-path">{{ downloadLocation || '/downloads' }}</span>
				</div>
			</div>

			<!-- Scan Button -->
			<div class="header-actions">
				<button
					class="btn btn-primary action-btn"
					:disabled="isScanning"
					@click="scanLibrary"
				>
					<i class="material-icons btn-icon" :class="{ 'spin-active': isScanning }">sync</i>
					<span>{{ isScanning ? $t('libraryPage.scanning') : $t('libraryPage.scanLibrary') }}</span>
				</button>
			</div>
		</div>

		<!-- Stats Overview Cards -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-label">{{ $t('libraryPage.stats.artists') }}</span>
					<i class="material-icons stat-icon">person</i>
				</div>
				<div class="stat-value text-primary-val">{{ totalArtists }}</div>
			</div>

			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-label">{{ $t('libraryPage.stats.albums') }}</span>
					<i class="material-icons stat-icon">album</i>
				</div>
				<div class="stat-value text-cyan-val">{{ totalAlbums }}</div>
			</div>

			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-label">{{ $t('libraryPage.stats.tracks') }}</span>
					<i class="material-icons stat-icon">audiotrack</i>
				</div>
				<div class="stat-value text-emerald-val">{{ totalTracks }}</div>
			</div>

			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-label">{{ $t('libraryPage.stats.totalSize') }}</span>
					<i class="material-icons stat-icon">storage</i>
				</div>
				<div class="stat-value text-amber-val">{{ libraryTotalFormattedSize }}</div>
			</div>
		</div>

		<!-- Search Bar & Filter Controls -->
		<div class="search-filter-row">
			<div class="search-box">
				<i class="material-icons search-box-icon">search</i>
				<input
					v-model="searchQuery"
					type="text"
					:placeholder="$t('libraryPage.searchPlaceholder')"
					class="search-box-input"
				/>
				<button
					v-if="searchQuery"
					class="search-clear-btn"
					title="Clear"
					@click="searchQuery = ''"
				>
					<i class="material-icons text-base">close</i>
				</button>
			</div>

			<div class="results-summary">
				{{ $t('libraryPage.showingAlbums', { count: filteredAlbums.length, total: allAlbums.length }) }}
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="isScanning && allAlbums.length === 0" class="scanning-state">
			<div class="spin-icon-box">
				<i class="material-icons spin-large spin-active">sync</i>
			</div>
			<p class="scanning-title">{{ $t('libraryPage.scanningLibrary') }}</p>
			<p class="scanning-subtitle">{{ $t('libraryPage.scanningDescription') }}</p>
		</div>

		<!-- Albums Card Grid -->
		<div
			v-else-if="filteredAlbums.length > 0"
			class="albums-grid"
		>
			<div
				v-for="album in filteredAlbums"
				:key="album.path || `${album.artist}-${album.title}`"
				class="album-card group"
				@click="openAlbumModal(album)"
			>
				<!-- Cover Art Container -->
				<div class="album-cover-box">
					<img
						v-if="album.cover"
						:src="getCoverUrl(album.cover)"
						:alt="album.title"
						class="album-img"
						loading="lazy"
					/>
					<div v-else class="album-placeholder">
						<i class="material-icons album-placeholder-icon">album</i>
					</div>

					<!-- Hover Overlay -->
					<div class="album-hover-overlay">
						<div class="view-pill">
							<i class="material-icons view-icon">list</i>
							<span>View</span>
						</div>
					</div>

					<!-- Track count badge overlay -->
					<div class="track-count-overlay">
						{{ album.tracksCount }} {{ $t('libraryPage.tracks') }}
					</div>
				</div>

				<!-- Album Meta -->
				<div class="album-info">
					<h4 class="album-title" :title="album.title">
						{{ album.title }}
					</h4>
					<p class="album-artist" :title="album.artist">
						{{ album.artist }}
					</p>
					<div class="album-submeta">
						<span v-if="album.formattedTotalSize" class="album-size">
							{{ album.formattedTotalSize }}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Empty State -->
		<div v-else class="empty-state-card">
			<div class="empty-icon-box">
				<i class="material-icons empty-icon">{{ searchQuery ? 'search_off' : 'library_music' }}</i>
			</div>
			<h3 class="empty-title">
				{{ searchQuery ? $t('libraryPage.empty.noSearchTitle') : $t('libraryPage.empty.emptyTitle') }}
			</h3>
			<p class="empty-description">
				{{ searchQuery ? $t('libraryPage.empty.noSearchMessage') : $t('libraryPage.empty.emptyMessage') }}
			</p>
			<button
				v-if="!searchQuery"
				class="btn btn-primary mt-6"
				@click="scanLibrary"
			>
				<i class="material-icons mr-1.5 text-base">sync</i>
				{{ $t('libraryPage.scanLibrary') }}
			</button>
		</div>

		<!-- Guaranteed-Visible Album Detail Modal -->
		<div
			v-if="selectedAlbum"
			class="modal-backdrop"
			@click.self="closeAlbumModal"
		>
			<div class="modal-card">
				<!-- Modal Header -->
				<div class="modal-header">
					<div class="modal-header-main">
						<!-- Big Album Cover -->
						<div class="modal-cover-box">
							<img
								v-if="selectedAlbum.cover"
								:src="getCoverUrl(selectedAlbum.cover)"
								:alt="selectedAlbum.title"
								class="modal-cover-img"
							/>
							<div v-else class="modal-cover-placeholder">
								<i class="material-icons text-4xl">album</i>
							</div>
						</div>

						<div class="modal-header-info">
							<span class="modal-type-badge">ALBUM</span>
							<h3 class="modal-album-title" :title="selectedAlbum.title">
								{{ selectedAlbum.title }}
							</h3>
							<p class="modal-album-artist">
								{{ selectedAlbum.artist }}
							</p>
							<div class="modal-pills-row">
								<span class="meta-pill">
									<i class="material-icons pill-icon">audiotrack</i>
									{{ selectedAlbum.tracksCount }} {{ $t('libraryPage.tracks') }}
								</span>
								<span v-if="selectedAlbum.formattedTotalSize" class="meta-pill">
									<i class="material-icons pill-icon">storage</i>
									{{ selectedAlbum.formattedTotalSize }}
								</span>
								<span v-if="selectedAlbum.path" class="meta-pill path-pill" :title="selectedAlbum.path">
									<i class="material-icons pill-icon">folder_open</i>
									{{ selectedAlbum.path }}
								</span>
							</div>
						</div>
					</div>

					<button
						class="modal-close-btn"
						title="Close (Esc)"
						@click="closeAlbumModal"
					>
						<i class="material-icons">close</i>
					</button>
				</div>

				<!-- Tracklist Table -->
				<div class="modal-body">
					<div class="tracklist-header-row">
						<span class="tracklist-heading">{{ $t('libraryPage.tracklist') }}</span>
					</div>

					<div class="table-container">
						<table class="tracks-table">
							<thead>
								<tr>
									<th class="col-num">#</th>
									<th class="col-title">{{ $t('libraryPage.table.title') }}</th>
									<th class="col-artist">{{ $t('libraryPage.table.artist') }}</th>
									<th class="col-format">{{ $t('libraryPage.table.format') }}</th>
									<th class="col-size">{{ $t('libraryPage.table.size') }}</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="(track, index) in selectedAlbum.tracks"
									:key="track.path || `${track.title}-${index}`"
									class="track-row"
								>
									<td class="col-num track-num-cell">
										{{ track.trackNumber || (index + 1) }}
									</td>
									<td class="col-title track-title-cell">
										<div class="track-title-text" :title="track.title">
											{{ track.title }}
										</div>
										<div class="track-artist-mobile">
											{{ track.artist }}
										</div>
									</td>
									<td class="col-artist track-artist-cell" :title="track.artist">
										{{ track.artist }}
									</td>
									<td class="col-format track-format-cell">
										<span class="format-pill" :class="formatPillClass(track.format)">
											{{ (track.format || 'MP3').toUpperCase() }}
										</span>
									</td>
									<td class="col-size track-size-cell">
										{{ track.formattedSize }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="modal-footer">
					<button class="btn btn-secondary" @click="closeAlbumModal">
						{{ $t('libraryPage.close') }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { fetchData } from '@/utils/api'

export default {
	name: 'Library',
	data() {
		return {
			isScanning: false,
			downloadLocation: '',
			artists: [],
			totalTracks: 0,
			totalAlbums: 0,
			totalArtists: 0,
			searchQuery: '',
			selectedAlbum: null
		}
	},
	computed: {
		allAlbums() {
			const albums = []
			this.artists.forEach(artist => {
				if (Array.isArray(artist.albums)) {
					artist.albums.forEach(album => {
						albums.push(album)
					})
				}
			})
			return albums
		},
		filteredAlbums() {
			if (!this.searchQuery.trim()) {
				return this.allAlbums
			}
			const query = this.searchQuery.toLowerCase().trim()
			return this.allAlbums.filter(album => {
				const titleMatch = (album.title || '').toLowerCase().includes(query)
				const artistMatch = (album.artist || '').toLowerCase().includes(query)
				return titleMatch || artistMatch
			})
		},
		libraryTotalFormattedSize() {
			let totalBytes = 0
			this.allAlbums.forEach(album => {
				if (album.totalSize) totalBytes += album.totalSize
			})
			if (totalBytes === 0) return '0 B'
			const k = 1024
			const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
			const i = Math.floor(Math.log(totalBytes) / Math.log(k))
			return `${parseFloat((totalBytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
		}
	},
	mounted() {
		this.scanLibrary()
		document.addEventListener('keydown', this.handleKeyDown)
	},
	destroyed() {
		document.removeEventListener('keydown', this.handleKeyDown)
	},
	methods: {
		async scanLibrary() {
			this.isScanning = true
			try {
				const data = await fetchData('getLibrary')
				if (data) {
					this.downloadLocation = data.downloadLocation || ''
					this.artists = data.artists || []
					this.totalTracks = data.totalTracks || 0
					this.totalAlbums = data.totalAlbums || 0
					this.totalArtists = data.totalArtists || 0
				}
			} catch (error) {
				console.error('Failed to scan library:', error)
			} finally {
				this.isScanning = false
			}
		},
		getCoverUrl(coverPath) {
			if (!coverPath) return ''
			if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
				return coverPath
			}
			const base = location.base.endsWith('/') ? location.base : `${location.base}/`
			const normalizedCover = coverPath.startsWith('/') ? coverPath.slice(1) : coverPath
			return `${base}${normalizedCover}`
		},
		openAlbumModal(album) {
			this.selectedAlbum = album
		},
		closeAlbumModal() {
			this.selectedAlbum = null
		},
		handleKeyDown(event) {
			if (event.key === 'Escape' && this.selectedAlbum) {
				this.closeAlbumModal()
			}
		},
		formatPillClass(format) {
			const f = (format || '').toLowerCase()
			if (f.includes('flac')) return 'pill-flac'
			if (f.includes('wav')) return 'pill-wav'
			return 'pill-mp3'
		}
	}
}
</script>

<style scoped>
.library-page {
	width: 100%;
	padding: 1.5rem 0 3rem 0;
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

.title-icon {
	font-size: 2.25rem;
	color: var(--primary-color);
	margin-right: 0.75rem;
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

.folder-badge {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	color: var(--secondary-text);
	font-size: 0.8125rem;
	margin-top: 0.35rem;
}

.folder-icon {
	font-size: 1rem;
	color: var(--muted-text);
}

.folder-label {
	font-weight: 500;
}

.folder-path {
	font-family: monospace;
	font-size: 0.75rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	padding: 0.15rem 0.5rem;
	border-radius: 0.375rem;
	color: var(--foreground);
}

.header-actions {
	display: flex;
	align-items: center;
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

.spin-active {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Stats Cards */
.stats-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
	margin-bottom: 1.75rem;
}

@media (min-width: 640px) {
	.stats-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
}

.stat-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	padding: 1.25rem 1rem;
	transition: all 0.2s ease;
}

.stat-card:hover {
	border-color: var(--border-color-hover);
	transform: translateY(-2px);
	box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.2);
}

.stat-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.stat-label {
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--secondary-text);
}

.stat-icon {
	font-size: 1.25rem;
	color: var(--secondary-text);
	opacity: 0.7;
}

.stat-value {
	font-size: 1.85rem;
	font-weight: 800;
	margin-top: 0.5rem;
	letter-spacing: -0.02em;
}

.text-primary-val { color: var(--primary-color); }
.text-cyan-val { color: #06b6d4; }
.text-emerald-val { color: #10b981; }
.text-amber-val { color: #f59e0b; }

/* Search & Filter Row */
.search-filter-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1.75rem;
	gap: 1rem;
}

.search-box {
	position: relative;
	flex: 1;
	max-width: 26rem;
	display: flex;
	align-items: center;
}

.search-box-icon {
	position: absolute;
	left: 0.85rem;
	color: var(--secondary-text);
	font-size: 1.25rem;
	pointer-events: none;
}

.search-box-input {
	width: 100%;
	padding: 0.6rem 2.5rem 0.6rem 2.6rem;
	border-radius: 0.75rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	color: var(--foreground);
	font-size: 0.875rem;
	outline: none;
	transition: all 0.2s ease;
}

.search-box-input:focus {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.search-clear-btn {
	position: absolute;
	right: 0.75rem;
	background: transparent;
	border: none;
	color: var(--secondary-text);
	cursor: pointer;
	padding: 0.2rem;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 9999px;
}

.search-clear-btn:hover {
	color: var(--foreground);
}

.results-summary {
	font-size: 0.75rem;
	color: var(--secondary-text);
	white-space: nowrap;
}

/* Scanning State */
.scanning-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 5rem 1rem;
	text-align: center;
}

.spin-icon-box {
	width: 4.5rem;
	height: 4.5rem;
	border-radius: 1.25rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 1.25rem;
}

.spin-large {
	font-size: 2.5rem;
	color: var(--primary-color);
}

.scanning-title {
	font-size: 1.25rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0;
}

.scanning-subtitle {
	font-size: 0.875rem;
	color: var(--secondary-text);
	margin-top: 0.35rem;
}

/* Albums Grid */
.albums-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1.25rem;
}

@media (min-width: 640px) {
	.albums-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

@media (min-width: 768px) {
	.albums-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
}

@media (min-width: 1024px) {
	.albums-grid {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}
}

@media (min-width: 1280px) {
	.albums-grid {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
}

.album-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	padding: 0.85rem;
	cursor: pointer;
	transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	display: flex;
	flex-direction: column;
}

.album-card:hover {
	border-color: var(--border-color-hover);
	transform: translateY(-4px);
	box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.25);
}

.album-cover-box {
	position: relative;
	width: 100%;
	padding-top: 100%;
	border-radius: 0.75rem;
	overflow: hidden;
	background: var(--secondary-background);
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.album-img {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.35s ease;
}

.album-card:hover .album-img {
	transform: scale(1.06);
}

.album-placeholder {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--muted-text);
}

.album-placeholder-icon {
	font-size: 3.5rem;
}

.album-hover-overlay {
	position: absolute;
	inset: 0;
	background: rgba(15, 23, 42, 0.6);
	backdrop-filter: blur(4px);
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.album-card:hover .album-hover-overlay {
	opacity: 1;
}

.view-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.35rem 0.75rem;
	border-radius: 9999px;
	background: var(--primary-gradient);
	color: #ffffff;
	font-size: 0.75rem;
	font-weight: 700;
	box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

.view-icon {
	font-size: 1rem;
}

.track-count-overlay {
	position: absolute;
	bottom: 0.5rem;
	left: 0.5rem;
	background: rgba(15, 23, 42, 0.75);
	backdrop-filter: blur(4px);
	color: #f8fafc;
	font-size: 0.6875rem;
	font-weight: 700;
	padding: 0.15rem 0.45rem;
	border-radius: 0.375rem;
	border: 1px solid rgba(255, 255, 255, 0.1);
}

.album-info {
	margin-top: 0.75rem;
}

.album-title {
	font-size: 0.875rem;
	font-weight: 700;
	color: var(--foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: color 0.15s ease;
}

.album-card:hover .album-title {
	color: var(--primary-color);
}

.album-artist {
	font-size: 0.75rem;
	color: var(--secondary-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-top: 0.15rem;
}

.album-submeta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 0.35rem;
	font-size: 0.6875rem;
	color: var(--muted-text);
}

/* Empty State */
.empty-state-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 5rem 1.5rem;
	text-align: center;
	background: var(--card-background);
	border: 1px dashed var(--border-color-hover);
	border-radius: 1.25rem;
}

.empty-icon-box {
	width: 5rem;
	height: 5rem;
	border-radius: 1.25rem;
	background: var(--secondary-background);
	border: 1px solid var(--border-color);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 1.25rem;
}

.empty-icon {
	font-size: 2.75rem;
	color: var(--primary-color);
	opacity: 0.8;
}

.empty-title {
	font-size: 1.35rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0;
}

.empty-description {
	color: var(--secondary-text);
	font-size: 0.875rem;
	max-width: 24rem;
	margin-top: 0.5rem;
	line-height: 1.5;
}

/* Guaranteed-Visible Modal Backdrop */
.modal-backdrop {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.75);
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1.5rem;
	z-index: 9999;
	box-sizing: border-box;
}

.modal-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1.25rem;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-color);
	width: 100%;
	max-width: 54rem;
	max-height: 88vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	animation: modalFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalFadeIn {
	from {
		opacity: 0;
		transform: scale(0.96) translateY(10px);
	}
	to {
		opacity: 1;
		transform: scale(1) translateY(0);
	}
}

.modal-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: 1.5rem;
	border-bottom: 1px solid var(--border-color);
	gap: 1rem;
}

.modal-header-main {
	display: flex;
	align-items: center;
	gap: 1.25rem;
	min-width: 0;
	flex: 1;
}

.modal-cover-box {
	width: 5.5rem;
	height: 5.5rem;
	border-radius: 0.875rem;
	overflow: hidden;
	flex-shrink: 0;
	background: var(--secondary-background);
	border: 1px solid var(--border-color);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.modal-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.modal-cover-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
}

.modal-header-info {
	min-width: 0;
	flex: 1;
}

.modal-type-badge {
	font-size: 0.625rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	color: var(--primary-color);
}

.modal-album-title {
	font-size: 1.35rem;
	font-weight: 800;
	color: var(--foreground);
	margin: 0.15rem 0 0 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.modal-album-artist {
	font-size: 0.875rem;
	color: var(--secondary-text);
	font-weight: 500;
	margin: 0.15rem 0 0 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.modal-pills-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem;
	margin-top: 0.5rem;
}

.meta-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	background: var(--secondary-background);
	border: 1px solid var(--border-color);
	padding: 0.15rem 0.5rem;
	border-radius: 0.375rem;
	font-size: 0.6875rem;
	color: var(--foreground);
	font-weight: 600;
}

.path-pill {
	max-width: 14rem;
	font-family: monospace;
	font-size: 0.625rem;
	color: var(--secondary-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pill-icon {
	font-size: 0.85rem;
	color: var(--primary-color);
}

.modal-close-btn {
	background: var(--secondary-background);
	border: 1px solid var(--border-color);
	color: var(--secondary-text);
	width: 2.25rem;
	height: 2.25rem;
	border-radius: 9999px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.15s ease;
	flex-shrink: 0;
}

.modal-close-btn:hover {
	color: var(--foreground);
	border-color: var(--border-color-hover);
	background: var(--table-highlight);
}

/* Modal Body / Tracklist */
.modal-body {
	padding: 1.25rem 1.5rem;
	overflow-y: auto;
	flex: 1;
}

.tracklist-header-row {
	margin-bottom: 0.75rem;
}

.tracklist-heading {
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--secondary-text);
}

.table-container {
	width: 100%;
	border: 1px solid var(--border-color);
	border-radius: 0.75rem;
	overflow: hidden;
}

.tracks-table {
	width: 100%;
	border-collapse: collapse;
	text-align: left;
}

.tracks-table thead tr {
	background: var(--secondary-background);
	border-bottom: 1px solid var(--border-color);
}

.tracks-table th {
	padding: 0.65rem 0.85rem;
	font-size: 0.6875rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--secondary-text);
}

.track-row {
	border-bottom: 1px solid var(--border-color);
	transition: background-color 0.15s ease;
}

.track-row:last-child {
	border-bottom: none;
}

.track-row:hover {
	background-color: var(--table-highlight);
}

.tracks-table td {
	padding: 0.65rem 0.85rem;
	vertical-align: middle;
}

.col-num {
	width: 3.5rem;
	text-align: center;
}

.col-title {
	width: auto;
}

.col-artist {
	width: 25%;
}

.col-format {
	width: 5rem;
	text-align: center;
}

.col-size {
	width: 5.5rem;
	text-align: right;
}

.track-num-cell {
	font-size: 0.75rem;
	color: var(--secondary-text);
	font-weight: 600;
}

.track-title-cell {
	color: var(--foreground);
	font-size: 0.875rem;
	font-weight: 600;
}

.track-title-text {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 20rem;
}

.track-artist-mobile {
	display: none;
	font-size: 0.7rem;
	color: var(--secondary-text);
	margin-top: 0.1rem;
}

@media (max-width: 640px) {
	.col-artist { display: none; }
	.track-artist-mobile { display: block; }
}

.track-artist-cell {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 14rem;
}

.track-format-cell {
	text-align: center;
}

.format-pill {
	display: inline-block;
	padding: 0.1rem 0.4rem;
	border-radius: 0.375rem;
	font-size: 0.625rem;
	font-weight: 800;
	letter-spacing: 0.05em;
}

.pill-flac {
	background: rgba(6, 182, 212, 0.15);
	color: #06b6d4;
	border: 1px solid rgba(6, 182, 212, 0.3);
}

.pill-wav {
	background: rgba(16, 185, 129, 0.15);
	color: #10b981;
	border: 1px solid rgba(16, 185, 129, 0.3);
}

.pill-mp3 {
	background: var(--border-color);
	color: var(--secondary-text);
	border: 1px solid var(--border-color-hover);
}

.track-size-cell {
	font-size: 0.75rem;
	color: var(--secondary-text);
	font-variant-numeric: tabular-nums;
}

/* Modal Footer */
.modal-footer {
	padding: 1rem 1.5rem;
	border-top: 1px solid var(--border-color);
	background: var(--secondary-background);
	display: flex;
	justify-content: flex-end;
}
</style>
