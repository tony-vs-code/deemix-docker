<template>
	<div class="library-page">
		<!-- Header -->
		<div class="flex flex-wrap items-center justify-between mb-6">
			<div>
				<h1 class="text-4xl font-bold flex items-center">
					<i class="material-icons mr-3 text-primary text-4xl">library_music</i>
					{{ $t('libraryPage.title') }}
				</h1>
				<div class="flex items-center text-secondary text-sm mt-1">
					<i class="material-icons text-sm mr-1">folder</i>
					<span class="mr-2">{{ $t('libraryPage.downloadPath') }}:</span>
					<span class="font-mono text-xs bg-grayscale-400 px-2 py-0.5 rounded text-foreground">
						{{ downloadLocation || '/downloads' }}
					</span>
				</div>
			</div>

			<!-- Scan Button -->
			<div class="mt-4 sm:mt-0">
				<button
					class="btn btn-primary flex items-center"
					:disabled="isScanning"
					@click="scanLibrary"
				>
					<i class="material-icons mr-1 text-lg" :class="{ spin: isScanning }">sync</i>
					{{ isScanning ? $t('libraryPage.scanning') : $t('libraryPage.scanLibrary') }}
				</button>
			</div>
		</div>

		<!-- Stats Overview Cards -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
			<div class="stat-card">
				<div class="text-secondary text-xs uppercase font-semibold">{{ $t('libraryPage.stats.artists') }}</div>
				<div class="text-2xl font-bold mt-1 text-primary">{{ totalArtists }}</div>
			</div>
			<div class="stat-card">
				<div class="text-secondary text-xs uppercase font-semibold">{{ $t('libraryPage.stats.albums') }}</div>
				<div class="text-2xl font-bold mt-1 text-primary">{{ totalAlbums }}</div>
			</div>
			<div class="stat-card">
				<div class="text-secondary text-xs uppercase font-semibold">{{ $t('libraryPage.stats.tracks') }}</div>
				<div class="text-2xl font-bold mt-1 text-primary">{{ totalTracks }}</div>
			</div>
			<div class="stat-card">
				<div class="text-secondary text-xs uppercase font-semibold">{{ $t('libraryPage.stats.totalSize') }}</div>
				<div class="text-2xl font-bold mt-1 text-primary">{{ libraryTotalFormattedSize }}</div>
			</div>
		</div>

		<!-- Search Bar -->
		<div class="flex items-center justify-between mb-6">
			<div class="relative flex-1 max-w-md">
				<i class="material-icons absolute left-3 top-2.5 text-secondary">search</i>
				<input
					v-model="searchQuery"
					type="text"
					:placeholder="$t('libraryPage.searchPlaceholder')"
					class="w-full pl-10 pr-4 py-2 rounded bg-panels-bg border border-grayscale-400 text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
				/>
				<button
					v-if="searchQuery"
					class="absolute right-3 top-2 text-secondary hover:text-foreground"
					@click="searchQuery = ''"
				>
					<i class="material-icons text-base">close</i>
				</button>
			</div>

			<div class="text-xs text-secondary ml-4 hidden sm:block">
				{{ $t('libraryPage.showingAlbums', { count: filteredAlbums.length, total: allAlbums.length }) }}
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="isScanning && allAlbums.length === 0" class="flex flex-col items-center justify-center py-20">
			<i class="material-icons text-5xl text-primary spin mb-4">sync</i>
			<p class="text-lg font-medium">{{ $t('libraryPage.scanningLibrary') }}</p>
			<p class="text-sm text-secondary mt-1">{{ $t('libraryPage.scanningDescription') }}</p>
		</div>

		<!-- Albums Card Grid -->
		<div
			v-else-if="filteredAlbums.length > 0"
			class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
		>
			<div
				v-for="album in filteredAlbums"
				:key="album.path || `${album.artist}-${album.title}`"
				class="album-card group cursor-pointer"
				@click="openAlbumModal(album)"
			>
				<!-- Album Cover Art -->
				<div class="album-cover-container">
					<img
						v-if="album.cover"
						:src="getCoverUrl(album.cover)"
						:alt="album.title"
						class="album-cover-img"
						loading="lazy"
					/>
					<div v-else class="album-cover-placeholder">
						<i class="material-icons text-4xl text-grayscale-300">album</i>
					</div>
					<!-- Hover overlay button -->
					<div class="album-cover-overlay">
						<i class="material-icons text-white text-3xl">info_outline</i>
					</div>
				</div>

				<!-- Album Meta -->
				<div class="mt-2.5">
					<h4 class="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors" :title="album.title">
						{{ album.title }}
					</h4>
					<p class="text-xs text-secondary truncate mt-0.5" :title="album.artist">
						{{ album.artist }}
					</p>
					<div class="flex items-center justify-between text-[11px] text-secondary mt-1">
						<span>{{ album.tracksCount }} {{ $t('libraryPage.tracks') }}</span>
						<span v-if="album.formattedTotalSize" class="text-grayscale-200">{{ album.formattedTotalSize }}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Empty States -->
		<div v-else class="empty-state">
			<i class="material-icons empty-icon">{{ searchQuery ? 'search_off' : 'library_music' }}</i>
			<h3 class="text-xl font-bold mt-4 text-foreground">
				{{ searchQuery ? $t('libraryPage.empty.noSearchTitle') : $t('libraryPage.empty.emptyTitle') }}
			</h3>
			<p class="text-secondary text-sm mt-1 max-w-md text-center">
				{{ searchQuery ? $t('libraryPage.empty.noSearchMessage') : $t('libraryPage.empty.emptyMessage') }}
			</p>
			<button
				v-if="!searchQuery"
				class="btn btn-primary mt-4 flex items-center"
				@click="scanLibrary"
			>
				<i class="material-icons mr-1">sync</i>
				{{ $t('libraryPage.scanLibrary') }}
			</button>
		</div>

		<!-- Album Details Modal / Drawer -->
		<div
			v-if="selectedAlbum"
			class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 transition-opacity"
			@click.self="closeAlbumModal"
		>
			<div class="modal-dialog max-w-3xl w-full bg-panels-bg rounded-lg shadow-2xl border border-grayscale-400 overflow-hidden flex flex-col max-h-[90vh]">
				<!-- Modal Header -->
				<div class="flex items-start justify-between p-6 border-b border-grayscale-400">
					<div class="flex items-center space-x-4 min-w-0">
						<div class="w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-grayscale-400 shadow">
							<img
								v-if="selectedAlbum.cover"
								:src="getCoverUrl(selectedAlbum.cover)"
								:alt="selectedAlbum.title"
								class="w-full h-full object-cover"
							/>
							<div v-else class="w-full h-full flex items-center justify-center text-grayscale-300">
								<i class="material-icons text-3xl">album</i>
							</div>
						</div>
						<div class="min-w-0">
							<h3 class="text-xl font-bold text-foreground truncate" :title="selectedAlbum.title">
								{{ selectedAlbum.title }}
							</h3>
							<p class="text-sm text-secondary font-medium mt-0.5 truncate">
								{{ selectedAlbum.artist }}
							</p>
							<div class="flex flex-wrap items-center gap-2 mt-2 text-xs text-secondary">
								<span class="bg-grayscale-400 px-2 py-0.5 rounded text-foreground">
									{{ selectedAlbum.tracksCount }} {{ $t('libraryPage.tracks') }}
								</span>
								<span v-if="selectedAlbum.formattedTotalSize" class="bg-grayscale-400 px-2 py-0.5 rounded text-foreground">
									{{ selectedAlbum.formattedTotalSize }}
								</span>
								<span v-if="selectedAlbum.path" class="font-mono text-[11px] text-secondary truncate max-w-xs" :title="selectedAlbum.path">
									{{ selectedAlbum.path }}
								</span>
							</div>
						</div>
					</div>

					<button
						class="text-secondary hover:text-foreground p-1 rounded-full transition-colors"
						@click="closeAlbumModal"
					>
						<i class="material-icons text-2xl">close</i>
					</button>
				</div>

				<!-- Tracklist Table -->
				<div class="p-6 overflow-y-auto flex-1">
					<h4 class="text-xs uppercase font-semibold text-secondary tracking-wider mb-3">
						{{ $t('libraryPage.tracklist') }}
					</h4>
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="text-xs text-secondary border-b border-grayscale-400">
								<th class="py-2 px-3 w-12 text-center">#</th>
								<th class="py-2 px-3">{{ $t('libraryPage.table.title') }}</th>
								<th class="py-2 px-3 hidden sm:table-cell">{{ $t('libraryPage.table.artist') }}</th>
								<th class="py-2 px-3 w-20 text-center">{{ $t('libraryPage.table.format') }}</th>
								<th class="py-2 px-3 w-24 text-right">{{ $t('libraryPage.table.size') }}</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="track in selectedAlbum.tracks"
								:key="track.path || track.title"
								class="border-b border-grayscale-400 text-sm hover:bg-grayscale-400 hover:bg-opacity-30 transition-colors"
							>
								<td class="py-2.5 px-3 text-center text-secondary text-xs">
									{{ track.trackNumber || '-' }}
								</td>
								<td class="py-2.5 px-3 font-medium text-foreground">
									<div class="truncate max-w-md" :title="track.title">
										{{ track.title }}
									</div>
									<div class="text-xs text-secondary truncate sm:hidden mt-0.5">
										{{ track.artist }}
									</div>
								</td>
								<td class="py-2.5 px-3 text-secondary text-xs truncate max-w-xs hidden sm:table-cell" :title="track.artist">
									{{ track.artist }}
								</td>
								<td class="py-2.5 px-3 text-center">
									<span class="inline-block uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-grayscale-400 text-primary">
										{{ track.format }}
									</span>
								</td>
								<td class="py-2.5 px-3 text-right text-xs text-secondary">
									{{ track.formattedSize }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Modal Footer -->
				<div class="p-4 border-t border-grayscale-400 flex justify-end bg-panels-bg">
					<button class="btn btn-secondary text-sm" @click="closeAlbumModal">
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
		}
	}
}
</script>

<style scoped>
.library-page {
	width: 100%;
	padding: 1.5rem 0;
}

.stat-card {
	background: var(--panels-background);
	border: 1px solid var(--border-color);
	border-radius: 0.5rem;
	padding: 1rem;
}

.album-card {
	background: var(--panels-background);
	border: 1px solid var(--border-color);
	border-radius: 0.5rem;
	padding: 0.75rem;
	transition: all 0.2s ease;
	display: flex;
	flex-direction: column;
}

.album-card:hover {
	border-color: var(--primary-color);
	transform: translateY(-2px);
}

.album-cover-container {
	position: relative;
	width: 100%;
	padding-top: 100%;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--border-color);
}

.album-cover-img {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.album-cover-placeholder {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.album-cover-overlay {
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.album-card:hover .album-cover-overlay {
	opacity: 1;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 5rem 1rem;
	text-align: center;
}

.empty-icon {
	font-size: 4rem;
	color: var(--secondary-text);
	opacity: 0.6;
}

.spin {
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
</style>
