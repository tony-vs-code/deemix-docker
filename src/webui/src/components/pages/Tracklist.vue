<template>
	<div ref="root" class="tracklist-page">
		<!-- Loading Placeholder -->
		<div v-if="type === 'empty'" class="tracklist-loading glass-panel">
			<i class="material-icons spin-active loading-icon">sync</i>
			<p class="loading-text">{{ title || 'Loading tracklist...' }}</p>
		</div>

		<div v-else class="tracklist-content">
			<!-- Hero Banner -->
			<div class="tracklist-hero glass-panel">
				<div class="hero-backdrop" :style="heroBackdropStyle"></div>
				<div class="hero-content">
					<!-- Large Cover Art -->
					<div class="hero-cover-wrapper">
						<img
							v-if="image"
							:src="image"
							:alt="title"
							class="hero-cover-img"
						/>
						<div v-else class="hero-cover-fallback">
							<i class="material-icons fallback-icon">album</i>
						</div>
					</div>

					<!-- Hero Info -->
					<div class="hero-info">
						<div class="hero-badge-row">
							<span class="type-badge">{{ getDisplayType() }}</span>
							<i v-if="explicit" class="material-icons explicit-icon" title="Explicit">explicit</i>
						</div>

						<h1 class="hero-title" :title="title">{{ title }}</h1>

						<p v-if="metadata" class="hero-metadata">{{ metadata }}</p>

						<div class="hero-pills-row">
							<div v-if="release_date" class="meta-pill">
								<i class="material-icons pill-icon">event</i>
								<span>{{ release_date }}</span>
							</div>
							<div class="meta-pill">
								<i class="material-icons pill-icon">audiotrack</i>
								<span>{{ trackCount }} {{ $tc('globals.listTabs.track', trackCount) }}</span>
							</div>
							<div v-if="totalDuration" class="meta-pill">
								<i class="material-icons pill-icon">schedule</i>
								<span>{{ totalDuration }}</span>
							</div>
							<div v-if="label" class="meta-pill label-pill" :title="label">
								<i class="material-icons pill-icon">copyright</i>
								<span>{{ label }}</span>
							</div>
						</div>
					</div>

					<!-- Hero Action Buttons -->
					<div class="hero-actions">
						<button
							type="button"
							class="btn btn-primary hero-action-btn"
							:data-link="link"
							:title="$t('globals.download_hint')"
							@click.stop="addToQueue"
						>
							<i class="material-icons btn-icon">cloud_download</i>
							<span>{{ $t('globals.download', { thing: $tc(`globals.listTabs.${type}`, 1) }) }}</span>
						</button>

						<button
							type="button"
							class="btn btn-secondary hero-action-btn"
							:disabled="selectedCount === 0"
							:data-link="selectedLinks()"
							@click.stop="addToQueue"
						>
							<i class="material-icons btn-icon">done_all</i>
							<span>{{ $t('tracklist.downloadSelection') }} ({{ selectedCount }})</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Tracks Table Card -->
			<div class="tracks-table-card glass-panel">
				<table class="table modern-table">
					<thead>
						<tr>
							<th class="th-play text-center">
								<i class="material-icons header-icon">music_note</i>
							</th>
							<th class="th-pos text-center">#</th>
							<th class="th-title">{{ $tc('globals.listTabs.title', 1) }}</th>
							<th class="th-artist">{{ $tc('globals.listTabs.artist', 1) }}</th>
							<th v-if="type === 'playlist'" class="th-album">{{ $tc('globals.listTabs.album', 1) }}</th>
							<th class="th-duration text-center">
								<i class="material-icons header-icon">schedule</i>
							</th>
							<th class="th-select text-center">
								<input
									type="checkbox"
									class="select-all-checkbox"
									:checked="allSelected"
									:title="$t('globals.selectAll') || 'Select All'"
									@click="toggleAll"
								/>
							</th>
						</tr>
					</thead>

					<!-- Deezer Album & Playlist Body -->
					<tbody v-if="type !== 'spotifyPlaylist'">
						<template v-for="(track, index) in body">
							<!-- Track Row -->
							<tr
								v-if="track.type === 'track'"
								:key="'track-' + (track.id || index)"
								class="track-row"
								:class="{ 'row-selected': track.selected }"
								@click="selectRow(index, track)"
							>
								<!-- Play / Preview -->
								<td class="td-play text-center" @click.stop>
									<button
										v-if="track.preview"
										type="button"
										class="play-preview-btn"
										:data-preview="track.preview"
										:title="$t('globals.play_hint')"
										@click="playPausePreview"
									>
										<i class="material-icons play-icon">play_arrow</i>
									</button>
									<span v-else class="play-preview-disabled">
										<i class="material-icons play-icon">play_arrow</i>
									</span>
								</td>

								<!-- Track Position -->
								<td class="td-pos text-center">
									<span class="pos-num">{{ type === 'album' ? track.track_position : (index + 1) }}</span>
								</td>

								<!-- Track Title -->
								<td class="td-title">
									<div class="title-cell-wrapper">
										<i v-if="track.explicit_lyrics" class="material-icons explicit-icon" title="Explicit">explicit</i>
										<span class="track-title-text" :title="track.title">
											{{ track.title }}
											<span v-if="track.title_version && !track.title.includes(track.title_version)" class="track-version">
												({{ track.title_version }})
											</span>
										</span>
									</div>
								</td>

								<!-- Track Artist -->
								<td class="td-artist">
									<router-link
										v-if="track.artist && track.artist.id"
										:to="{ name: 'Artist', params: { id: track.artist.id } }"
										class="artist-link"
										@click.native.stop
									>
										{{ track.artist.name }}
									</router-link>
									<span v-else class="artist-name">{{ track.artist ? track.artist.name : '' }}</span>
								</td>

								<!-- Album (Playlists only) -->
								<td v-if="type === 'playlist'" class="td-album">
									<router-link
										v-if="track.album && track.album.id"
										:to="{ name: 'Album', params: { id: track.album.id } }"
										class="album-link"
										@click.native.stop
									>
										{{ track.album.title }}
									</router-link>
									<span v-else class="album-name">{{ track.album ? track.album.title : '' }}</span>
								</td>

								<!-- Duration -->
								<td class="td-duration text-center">
									<span class="duration-pill">{{ convertDuration(track.duration) }}</span>
								</td>

								<!-- Select Checkbox -->
								<td class="td-select text-center" @click.stop>
									<input
										v-model="track.selected"
										type="checkbox"
										class="track-select-checkbox"
									/>
								</td>
							</tr>

							<!-- Disc Separator Row -->
							<tr
								v-else-if="track.type === 'disc_separator'"
								:key="'disc-' + track.number + '-' + index"
								class="disc-separator-row"
							>
								<td colspan="7" class="disc-separator-cell">
									<div class="disc-separator-content">
										<i class="material-icons disc-icon">album</i>
										<span class="disc-label">Disc {{ track.number }}</span>
										<div class="disc-divider-line"></div>
									</div>
								</td>
							</tr>
						</template>
					</tbody>

					<!-- Spotify Playlist Body -->
					<tbody v-else>
						<tr
							v-for="(track, i) in body"
							:key="'spotify-track-' + i"
							class="track-row"
							:class="{ 'row-selected': track.selected }"
							@click="selectRow(i, track)"
						>
							<td class="td-play text-center" @click.stop>
								<button
									v-if="track.preview_url"
									type="button"
									class="play-preview-btn"
									:data-preview="track.preview_url"
									:title="$t('globals.play_hint')"
									@click="playPausePreview"
								>
									<i class="material-icons play-icon">play_arrow</i>
								</button>
								<span v-else class="play-preview-disabled">
									<i class="material-icons play-icon">play_arrow</i>
								</span>
							</td>

							<td class="td-pos text-center">
								<span class="pos-num">{{ i + 1 }}</span>
							</td>

							<td class="td-title">
								<div class="title-cell-wrapper">
									<i v-if="track.explicit" class="material-icons explicit-icon" title="Explicit">explicit</i>
									<span class="track-title-text" :title="track.name">{{ track.name }}</span>
								</div>
							</td>

							<td class="td-artist">
								<span class="artist-name">{{ track.artists && track.artists[0] ? track.artists[0].name : '' }}</span>
							</td>

							<td class="td-album">
								<span class="album-name">{{ track.album ? track.album.name : '' }}</span>
							</td>

							<td class="td-duration text-center">
								<span class="duration-pill">{{ convertDuration(Math.floor(track.duration_ms / 1000)) }}</span>
							</td>

							<td class="td-select text-center" @click.stop>
								<input
									v-model="track.selected"
									type="checkbox"
									class="track-select-checkbox"
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Sticky Bottom Action Footer -->
			<div class="tracklist-sticky-footer glass-panel">
				<div class="footer-left">
					<button
						type="button"
						class="btn btn-secondary footer-btn"
						:disabled="selectedCount === 0"
						:data-link="selectedLinks()"
						@click.stop="addToQueue"
					>
						<i class="material-icons btn-icon">done_all</i>
						<span>{{ $t('tracklist.downloadSelection') }} ({{ selectedCount }})</span>
					</button>
				</div>
				<div class="footer-right">
					<button
						type="button"
						class="btn btn-primary footer-btn"
						:data-link="link"
						@click.stop="addToQueue"
					>
						<i class="material-icons btn-icon">cloud_download</i>
						<span>{{ `${$t('globals.download', { thing: $tc(`globals.listTabs.${type}`, 1) })}` }}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { isEmpty } from 'lodash-es'
import { sendAddToQueue } from '@/utils/downloads'
import Utils from '@/utils/utils'
import { playPausePreview } from '@components/globals/TheTrackPreview.vue'
import EventBus from '@/utils/EventBus'

export default {
	name: 'Tracklist',
	data() {
		return {
			title: '',
			metadata: '',
			release_date: '',
			label: '',
			explicit: false,
			image: '',
			type: 'empty',
			link: '',
			body: []
		}
	},
	computed: {
		heroBackdropStyle() {
			return {
				backgroundImage: this.image
					? `radial-gradient(circle at top right, rgba(59, 130, 246, 0.25), transparent 70%), url(${this.image})`
					: 'none'
			}
		},
		trackCount() {
			if (!this.body) return 0
			return this.body.filter(t => t.type === 'track' || t.duration_ms).length
		},
		selectedCount() {
			if (!this.body) return 0
			return this.body.filter(t => (t.type === 'track' || t.duration_ms) && t.selected).length
		},
		allSelected() {
			const tracks = (this.body || []).filter(t => t.type === 'track' || t.duration_ms)
			return tracks.length > 0 && tracks.every(t => t.selected)
		},
		totalDuration() {
			if (!this.body || !this.body.length) return ''
			let totalSecs = 0
			this.body.forEach(t => {
				if (t.type === 'track' && t.duration) {
					totalSecs += t.duration
				} else if (t.duration_ms) {
					totalSecs += Math.floor(t.duration_ms / 1000)
				}
			})
			return totalSecs > 0 ? this.convertDuration(totalSecs) : ''
		}
	},
	mounted() {
		EventBus.$on('showAlbum', this.showAlbum)
		EventBus.$on('showPlaylist', this.showPlaylist)
		EventBus.$on('showSpotifyPlaylist', this.showSpotifyPlaylist)
	},
	methods: {
		playPausePreview,
		reset() {
			this.title = 'Loading...'
			this.image = ''
			this.metadata = ''
			this.label = ''
			this.release_date = ''
			this.explicit = false
			this.type = 'empty'
			this.body = []
		},
		getDisplayType() {
			if (this.type === 'album') return 'Album'
			if (this.type === 'playlist') return 'Playlist'
			if (this.type === 'spotifyPlaylist') return 'Spotify Playlist'
			return 'Release'
		},
		addToQueue(e) {
			const link = e.currentTarget.dataset.link
			if (link) {
				sendAddToQueue(link)
			}
		},
		toggleAll(e) {
			const checked = e.target ? e.target.checked : !this.allSelected
			if (this.body) {
				this.body.forEach(item => {
					if (item.type === 'track' || item.duration_ms) {
						this.$set(item, 'selected', checked)
					}
				})
			}
		},
		selectedLinks() {
			const selected = []
			if (this.body) {
				this.body.forEach(item => {
					if ((item.type === 'track' || item.duration_ms) && item.selected) {
						selected.push(this.type === 'spotifyPlaylist' ? item.uri : item.link)
					}
				})
			}
			return selected.join(';')
		},
		convertDuration: Utils.convertDuration,
		showAlbum(data) {
			this.reset()

			const {
				id: albumID,
				title: albumTitle,
				explicit_lyrics,
				label: albumLabel,
				artist: { name: artistName } = {},
				tracks: albumTracks = [],
				nb_tracks: numberOfTracks,
				release_date,
				cover_xl
			} = data

			this.type = 'album'
			this.link = `https://www.deezer.com/album/${albumID}`
			this.title = albumTitle
			this.explicit = explicit_lyrics
			this.label = albumLabel
			this.metadata = `${artistName || ''} • ${this.$tc('globals.listTabs.trackN', numberOfTracks || (albumTracks ? albumTracks.length : 0))}`
			this.release_date = release_date ? release_date.substring(0, 10) : ''
			this.image = cover_xl

			if (isEmpty(albumTracks)) {
				this.body = []
			} else {
				this.body = albumTracks
			}
		},
		showPlaylist(data) {
			this.reset()

			const {
				id: playlistID,
				title: playlistTitle,
				picture_xl: playlistCover,
				creation_date,
				creator: { name: creatorName } = {},
				tracks: playlistTracks = [],
				nb_tracks: numberOfTracks
			} = data

			this.type = 'playlist'
			this.link = `https://www.deezer.com/playlist/${playlistID}`
			this.title = playlistTitle
			this.image = playlistCover
			this.release_date = creation_date ? creation_date.substring(0, 10) : ''
			this.metadata = `${this.$t('globals.by', { artist: creatorName || 'Deezer' })} • ${this.$tc(
				'globals.listTabs.trackN',
				numberOfTracks || (playlistTracks ? playlistTracks.length : 0)
			)}`

			if (isEmpty(playlistTracks)) {
				this.body = []
			} else {
				this.body = playlistTracks
			}
		},
		showSpotifyPlaylist(data) {
			this.reset()

			const {
				uri: playlistURI,
				name: playlistName,
				images = [],
				images: { length: numberOfImages } = {},
				owner: { display_name: ownerName } = {},
				tracks: playlistTracks = []
			} = data

			this.type = 'spotifyPlaylist'
			this.link = playlistURI
			this.title = playlistName
			this.image = numberOfImages
				? images[0].url
				: 'https://e-cdns-images.dzcdn.net/images/cover/d41d8cd98f00b204e9800998ecf8427e/1000x1000-000000-80-0-0.jpg'
			this.release_date = ''
			this.metadata = `${this.$t('globals.by', { artist: ownerName || 'Spotify' })} • ${this.$tc(
				'globals.listTabs.trackN',
				playlistTracks ? playlistTracks.length : 0
			)}`

			if (isEmpty(playlistTracks)) {
				this.body = []
			} else {
				this.body = playlistTracks
			}
		},
		selectRow(_, track) {
			this.$set(track, 'selected', !track.selected)
		}
	}
}
</script>

<style scoped>
.tracklist-page {
	padding-bottom: 5rem;
}

/* Loading State */
.tracklist-loading {
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

/* Hero Banner */
.tracklist-hero {
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
	background-position: center;
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

.hero-cover-wrapper {
	width: 9.5rem;
	height: 9.5rem;
	border-radius: 1rem;
	overflow: hidden;
	border: 2px solid rgba(255, 255, 255, 0.18);
	box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
	flex-shrink: 0;
	background: #090d16;
}

.hero-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.hero-cover-fallback {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
	background: var(--card-background);
}

.fallback-icon {
	font-size: 4rem;
}

.hero-info {
	flex: 1;
	min-width: 16rem;
}

.hero-badge-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.35rem;
}

.type-badge {
	font-size: 0.6875rem;
	font-weight: 800;
	text-transform: uppercase;
	letter-spacing: 0.1em;
	color: var(--primary-color);
	background: rgba(59, 130, 246, 0.12);
	border: 1px solid rgba(59, 130, 246, 0.25);
	padding: 0.15rem 0.5rem;
	border-radius: 0.375rem;
}

.explicit-icon {
	font-size: 1.15rem;
	color: #ef4444;
}

.hero-title {
	font-size: 2.25rem;
	font-weight: 800;
	color: var(--foreground);
	margin: 0 0 0.5rem 0;
	letter-spacing: -0.025em;
	line-height: 1.2;
}

.hero-metadata {
	font-size: 1rem;
	color: var(--secondary-text);
	margin: 0 0 0.85rem 0;
	font-weight: 500;
}

.hero-pills-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.meta-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid var(--border-color);
	padding: 0.25rem 0.65rem;
	border-radius: 9999px;
	font-size: 0.75rem;
	color: var(--secondary-text);
	font-weight: 600;
}

.label-pill {
	max-width: 16rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pill-icon {
	font-size: 0.95rem;
	color: var(--primary-color);
}

.hero-actions {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	align-self: center;
}

.hero-action-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	height: 2.6rem;
	padding: 0 1.25rem;
	border-radius: 0.75rem;
	font-size: 0.8125rem;
	white-space: nowrap;
}

/* Tracks Table Card */
.tracks-table-card {
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

.th-play {
	width: 3.5rem;
}

.th-pos {
	width: 3.5rem;
}

.th-duration {
	width: 6rem;
}

.th-select {
	width: 3.5rem;
}

.header-icon {
	font-size: 1rem;
	vertical-align: middle;
}

.track-row {
	border-bottom: 1px solid var(--border-color);
	transition: background-color 0.15s ease;
	cursor: pointer;
}

.track-row:hover {
	background: var(--table-highlight, rgba(255, 255, 255, 0.04));
}

.track-row.row-selected {
	background: rgba(59, 130, 246, 0.08);
}

.track-row td {
	padding: 0.65rem 1rem;
	vertical-align: middle;
}

/* Play Preview Button */
.play-preview-btn {
	background: transparent;
	border: none;
	color: var(--secondary-text);
	cursor: pointer;
	width: 2rem;
	height: 2rem;
	border-radius: 9999px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
}

.play-preview-btn:hover {
	color: var(--primary-color);
	background: rgba(59, 130, 246, 0.15);
	transform: scale(1.1);
}

.play-preview-disabled {
	opacity: 0.25;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.play-icon {
	font-size: 1.35rem;
}

/* Track Position */
.pos-num {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--muted-text);
	font-family: monospace;
}

/* Title Cell */
.title-cell-wrapper {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

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

/* Artist & Album Links */
.artist-link,
.album-link {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	text-decoration: none;
	transition: color 0.15s ease;
}

.artist-link:hover,
.album-link:hover {
	color: var(--primary-color);
}

.artist-name,
.album-name {
	font-size: 0.8125rem;
	color: var(--secondary-text);
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

/* Checkboxes */
.select-all-checkbox,
.track-select-checkbox {
	cursor: pointer;
}

/* Disc Separator */
.disc-separator-row {
	background: rgba(255, 255, 255, 0.02);
	border-bottom: 1px solid var(--border-color);
}

.disc-separator-cell {
	padding: 0.65rem 1rem !important;
}

.disc-separator-content {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.disc-icon {
	font-size: 1.25rem;
	color: var(--primary-color);
}

.disc-label {
	font-size: 0.8125rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--secondary-text);
	white-space: nowrap;
}

.disc-divider-line {
	flex: 1;
	height: 1px;
	background: var(--border-color);
}

/* Sticky Bottom Footer */
.tracklist-sticky-footer {
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
	.hero-title {
		font-size: 1.75rem;
	}
	.hero-actions {
		width: 100%;
	}
	.hero-action-btn {
		width: 100%;
	}
	.tracklist-sticky-footer {
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
