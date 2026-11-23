<template>
	<div class="monitored-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<h1 class="page-title">
					<i class="material-icons title-icon">notifications_active</i>
					{{ $t('monitored.title') }}
				</h1>
				<p class="page-subtitle">
					{{ $t('monitored.subtitle') }}
				</p>
			</div>
		</div>

		<!-- Top Summary Cards -->
		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-header">
					<span class="summary-label">{{ $t('monitored.stats.monitoredArtists') }}</span>
					<i class="material-icons summary-icon text-cyan-val">group</i>
				</div>
				<div class="summary-value text-cyan-val">{{ artists.length }}</div>
			</div>

			<div class="summary-card">
				<div class="summary-header">
					<span class="summary-label">{{ $t('monitored.stats.missingReleases') }}</span>
					<i class="material-icons summary-icon" :class="totalMissing > 0 ? 'text-amber-val' : 'text-emerald-val'">
						{{ totalMissing > 0 ? 'new_releases' : 'check_circle' }}
					</i>
				</div>
				<div class="summary-value" :class="totalMissing > 0 ? 'text-amber-val' : 'text-emerald-val'">
					{{ totalMissing }}
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-header">
					<span class="summary-label">{{ $t('monitored.stats.autoSync') }}</span>
					<i class="material-icons summary-icon" :class="config.enabled ? 'text-emerald-val' : 'text-muted-val'">
						{{ config.enabled ? 'autorenew' : 'pause_circle_outline' }}
					</i>
				</div>
				<div class="summary-status-row">
					<span class="sync-status-pill" :class="config.enabled ? 'sync-active' : 'sync-paused'">
						<span v-if="config.enabled" class="sync-dot"></span>
						{{
							config.enabled
								? $t('monitored.stats.activeEvery', { hours: config.checkIntervalHours })
								: $t('monitored.stats.manualOnly')
						}}
					</span>
					<span class="sync-sub-pill" :class="config.autoDownload ? 'sub-autodl-on' : 'sub-autodl-off'">
						{{ config.autoDownload ? $t('monitored.stats.autoDlOn') : $t('monitored.stats.autoDlOff') }}
					</span>
				</div>
			</div>
		</div>

		<!-- Controls Bar -->
		<div class="controls-bar glass-panel">
			<div class="controls-settings-group">
				<!-- Auto-Check Toggle -->
				<label class="toggle-control">
					<input v-model="config.enabled" type="checkbox" class="toggle-input" @change="saveConfig" />
					<span class="toggle-track">
						<span class="toggle-thumb"></span>
					</span>
					<span class="toggle-label">{{ $t('monitored.controls.autoCheck') }}</span>
				</label>

				<!-- Check Interval -->
				<div class="select-control">
					<span class="control-label">{{ $t('monitored.controls.interval') }}</span>
					<select v-model.number="config.checkIntervalHours" class="compact-select" @change="saveConfig">
						<option :value="6">6h</option>
						<option :value="12">12h</option>
						<option :value="24">24h</option>
						<option :value="48">48h</option>
					</select>
				</div>

				<!-- Auto-Download Toggle -->
				<label class="toggle-control">
					<input v-model="config.autoDownload" type="checkbox" class="toggle-input" @change="saveConfig" />
					<span class="toggle-track">
						<span class="toggle-thumb"></span>
					</span>
					<span class="toggle-label">{{ $t('monitored.controls.autoDownload') }}</span>
				</label>

				<!-- Quality Selector -->
				<div class="select-control">
					<span class="control-label">{{ $t('monitored.controls.quality') }}</span>
					<select v-model.number="config.bitrate" class="compact-select" @change="saveConfig">
						<option :value="9">FLAC</option>
						<option :value="3">320kbps</option>
						<option :value="1">128kbps</option>
					</select>
				</div>

				<!-- Release Type Toggles -->
				<div class="release-type-group">
					<span class="control-label">{{ $t('monitored.controls.releaseTypes') }}</span>
					<div class="type-pills">
						<button
							type="button"
							class="type-pill"
							:class="{ active: config.includeAlbums }"
							@click="toggleReleaseType('includeAlbums')"
						>
							<i class="material-icons type-pill-icon">{{ config.includeAlbums ? 'check' : 'add' }}</i>
							<span>{{ $t('monitored.controls.albums') }}</span>
						</button>
						<button
							type="button"
							class="type-pill"
							:class="{ active: config.includeEPs }"
							@click="toggleReleaseType('includeEPs')"
						>
							<i class="material-icons type-pill-icon">{{ config.includeEPs ? 'check' : 'add' }}</i>
							<span>{{ $t('monitored.controls.eps') }}</span>
						</button>
						<button
							type="button"
							class="type-pill"
							:class="{ active: config.includeSingles }"
							@click="toggleReleaseType('includeSingles')"
						>
							<i class="material-icons type-pill-icon">{{ config.includeSingles ? 'check' : 'add' }}</i>
							<span>{{ $t('monitored.controls.singles') }}</span>
						</button>
					</div>
				</div>
			</div>

			<div class="controls-actions-group">
				<button
					type="button"
					class="btn btn-secondary action-btn"
					:disabled="isCheckingAll || artists.length === 0"
					@click="checkAllArtists"
				>
					<i class="material-icons btn-icon" :class="{ 'spin-active': isCheckingAll }">sync</i>
					<span>{{ isCheckingAll ? $t('monitored.controls.checking') : $t('monitored.controls.checkAllNow') }}</span>
				</button>

				<button
					type="button"
					class="btn btn-primary action-btn"
					:disabled="isDownloadingAll || totalMissing === 0"
					@click="downloadAllMissing"
				>
					<i class="material-icons btn-icon" :class="{ 'spin-active': isDownloadingAll }">
						{{ isDownloadingAll ? 'sync' : 'cloud_download' }}
					</i>
					<span>{{
						isDownloadingAll ? $t('monitored.controls.downloadingAll') : $t('monitored.controls.downloadAllMissing')
					}}</span>
				</button>
			</div>
		</div>

		<!-- Add Artist Search Bar -->
		<div class="add-artist-panel glass-panel">
			<form class="search-form" @submit.prevent="searchArtists">
				<div class="search-input-wrap">
					<i class="material-icons search-icon">person_search</i>
					<input
						v-model="searchQuery"
						type="text"
						class="search-input"
						:placeholder="$t('monitored.search.placeholder')"
					/>
					<button v-if="searchQuery || searchPerformed" type="button" class="search-clear-btn" @click="clearSearch">
						<i class="material-icons">close</i>
					</button>
				</div>
				<button type="submit" class="btn btn-primary search-submit-btn" :disabled="isSearching || !searchQuery.trim()">
					<i class="material-icons btn-icon" :class="{ 'spin-active': isSearching }">
						{{ isSearching ? 'sync' : 'search' }}
					</i>
					<span>{{ isSearching ? $t('monitored.search.searching') : $t('monitored.search.searchBtn') }}</span>
				</button>
			</form>

			<!-- Search Results -->
			<div v-if="searchPerformed && !isSearching" class="search-results-area">
				<div v-if="searchResults.length === 0" class="search-empty">
					{{ $t('monitored.search.noResults', { query: lastSearchTerm }) }}
				</div>

				<div v-else class="search-results-grid">
					<div v-for="result in searchResults" :key="result.id" class="search-result-card">
						<router-link :to="{ name: 'Artist', params: { id: result.id } }" class="search-artist-link">
							<img
								v-if="result.picture_medium || result.picture_small || result.picture"
								:src="result.picture_medium || result.picture_small || result.picture"
								:alt="result.name"
								class="search-artist-avatar"
								loading="lazy"
							/>
							<div v-else class="search-artist-avatar-fallback">
								<i class="material-icons">person</i>
							</div>
							<div class="search-artist-info">
								<div class="search-artist-name" :title="result.name">{{ result.name }}</div>
								<div v-if="result.nb_fan" class="search-artist-fans">
									{{ $t('monitored.search.fans', { count: formatNumber(result.nb_fan) }) }}
								</div>
							</div>
						</router-link>

						<button
							type="button"
							class="btn btn-sm monitor-search-btn"
							:class="isArtistMonitored(result.id) ? 'btn-monitored-pill' : 'btn-primary'"
							:disabled="Boolean(addingArtistIds[String(result.id)])"
							@click="toggleSearchArtist(result)"
						>
							<i class="material-icons btn-icon-sm" :class="{ 'spin-active': Boolean(addingArtistIds[String(result.id)]) }">
								{{
									addingArtistIds[String(result.id)]
										? 'sync'
										: isArtistMonitored(result.id)
										? 'notifications_active'
										: 'add'
								}}
							</i>
							<span>{{
								isArtistMonitored(result.id) ? $t('monitored.search.monitoring') : $t('monitored.search.monitor')
							}}</span>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="isLoading" class="loading-card glass-panel">
			<i class="material-icons spin-active loading-spinner">sync</i>
			<p class="loading-text">{{ $t('globals.loading') }}</p>
		</div>

		<!-- Empty State -->
		<div v-else-if="artists.length === 0" class="empty-state-card glass-panel">
			<div class="empty-icon-box">
				<i class="material-icons empty-icon">notifications_active</i>
			</div>
			<h3 class="empty-title">{{ $t('monitored.empty.title') }}</h3>
			<p class="empty-description">{{ $t('monitored.empty.message') }}</p>
		</div>

		<!-- Monitored Artists & Missing Releases List -->
		<div v-else class="artists-list">
			<div v-for="artist in artists" :key="artist.id" class="artist-card glass-panel">
				<div class="artist-card-header">
					<div class="artist-identity">
						<router-link :to="{ name: 'Artist', params: { id: artist.id } }" class="artist-avatar-link">
							<img
								v-if="artist.picture"
								:src="artist.picture"
								:alt="artist.name"
								class="artist-avatar"
								loading="lazy"
							/>
							<div v-else class="artist-avatar-fallback">
								<i class="material-icons">person</i>
							</div>
						</router-link>

						<div class="artist-meta">
							<div class="artist-title-row">
								<router-link :to="{ name: 'Artist', params: { id: artist.id } }" class="artist-name-link">
									{{ artist.name }}
								</router-link>
								<span class="checked-pill">
									<i class="material-icons checked-icon">schedule</i>
									{{
										artist.lastCheckedAt
											? $t('monitored.artist.lastChecked', { time: formatTimeAgo(artist.lastCheckedAt) })
											: $t('monitored.artist.neverChecked')
									}}
								</span>
							</div>

							<div class="artist-counts-row">
								<span class="count-pill count-owned">
									<i class="material-icons count-icon">library_add_check</i>
									{{ $t('monitored.artist.owned') }}: {{ artist.ownedCount }} / {{ artist.totalReleases }}
								</span>
								<span class="count-pill" :class="artist.missingCount > 0 ? 'count-missing' : 'count-uptodate'">
									<i class="material-icons count-icon">
										{{ artist.missingCount > 0 ? 'new_releases' : 'check_circle' }}
									</i>
									{{
										artist.missingCount > 0
											? `${$t('monitored.artist.missing')}: ${artist.missingCount}`
											: $t('monitored.artist.upToDate')
									}}
								</span>
							</div>

							<div v-if="artist.lastError" class="artist-error-note">
								<i class="material-icons text-xs">warning</i>
								<span>{{ artist.lastError }}</span>
							</div>
						</div>
					</div>

					<div class="artist-actions">
						<button
							type="button"
							class="btn btn-secondary btn-sm action-btn"
							:disabled="Boolean(checkingArtistIds[String(artist.id)]) || isCheckingAll"
							@click="checkSingleArtist(artist)"
						>
							<i
								class="material-icons btn-icon-sm"
								:class="{ 'spin-active': Boolean(checkingArtistIds[String(artist.id)]) }"
							>
								sync
							</i>
							<span>{{
								checkingArtistIds[String(artist.id)]
									? $t('monitored.artist.checking')
									: $t('monitored.artist.check')
							}}</span>
						</button>

						<button
							v-if="artist.missingCount > 0"
							type="button"
							class="btn btn-primary btn-sm action-btn"
							:disabled="Boolean(downloadingArtistIds[String(artist.id)]) || isDownloadingAll"
							@click="downloadArtistMissing(artist)"
						>
							<i
								class="material-icons btn-icon-sm"
								:class="{ 'spin-active': Boolean(downloadingArtistIds[String(artist.id)]) }"
							>
								{{ downloadingArtistIds[String(artist.id)] ? 'sync' : 'cloud_download' }}
							</i>
							<span>{{ $t('monitored.artist.downloadMissing') }}</span>
						</button>

						<button
							type="button"
							class="btn btn-secondary btn-sm action-btn btn-unmonitor"
							:disabled="Boolean(removingArtistIds[String(artist.id)])"
							@click="unmonitorArtist(artist)"
						>
							<i class="material-icons btn-icon-sm">notifications_off</i>
							<span>{{ $t('monitored.artist.unmonitor') }}</span>
						</button>

						<button
							v-if="artist.missingReleases && artist.missingReleases.length > 0"
							type="button"
							class="btn btn-flat btn-only-icon expand-btn"
							:title="isArtistCollapsed(artist.id) ? 'Expand' : 'Collapse'"
							@click="toggleArtistExpand(artist.id)"
						>
							<i class="material-icons">
								{{ isArtistCollapsed(artist.id) ? 'expand_more' : 'expand_less' }}
							</i>
						</button>
					</div>
				</div>

				<!-- Missing Releases Grid -->
				<div
					v-if="artist.missingReleases && artist.missingReleases.length > 0 && !isArtistCollapsed(artist.id)"
					class="missing-releases-grid"
				>
					<div v-for="release in artist.missingReleases" :key="release.id" class="release-card">
						<router-link :to="{ name: 'Album', params: { id: release.id } }" class="release-cover-link">
							<div class="release-cover-box">
								<img
									v-if="release.cover"
									:src="release.cover"
									:alt="release.title"
									class="release-cover-img"
									loading="lazy"
								/>
								<div v-else class="release-cover-fallback">
									<i class="material-icons">album</i>
								</div>
								<span class="record-type-pill" :class="recordTypeClass(release.recordType)">
									{{ formatRecordType(release.recordType) }}
								</span>
							</div>
						</router-link>

						<div class="release-body">
							<router-link :to="{ name: 'Album', params: { id: release.id } }" class="release-title" :title="release.title">
								{{ release.title }}
							</router-link>

							<div class="release-meta">
								<span class="release-date">{{ release.releaseDate || $t('monitored.artist.unknownDate') }}</span>
								<span v-if="release.nbTracks > 0" class="release-tracks">
									· {{ $t('monitored.artist.tracksCount', { n: release.nbTracks }) }}
								</span>
							</div>

							<button
								type="button"
								class="btn btn-sm release-dl-btn"
								:class="queuedReleaseIds[String(release.id)] ? 'btn-queued' : 'btn-primary'"
								:disabled="Boolean(queuingReleaseIds[String(release.id)])"
								@click="downloadSingleRelease(release, artist.id)"
							>
								<i
									class="material-icons btn-icon-sm"
									:class="{ 'spin-active': Boolean(queuingReleaseIds[String(release.id)]) }"
								>
									{{
										queuingReleaseIds[String(release.id)]
											? 'sync'
											: queuedReleaseIds[String(release.id)]
											? 'done'
											: 'cloud_download'
									}}
								</i>
								<span>{{
									queuedReleaseIds[String(release.id)]
										? $t('monitored.artist.queued')
										: $t('monitored.artist.download')
								}}</span>
							</button>
						</div>
					</div>
				</div>

				<!-- No Missing Releases Footer -->
				<div v-else-if="!artist.missingReleases || artist.missingReleases.length === 0" class="artist-empty-missing">
					<i class="material-icons empty-missing-icon" :class="artist.lastCheckedAt ? 'text-emerald-val' : 'text-muted-val'">
						{{ artist.lastCheckedAt ? 'verified' : 'info_outline' }}
					</i>
					<span>
						{{ artist.lastCheckedAt ? $t('monitored.artist.allCaughtUp') : $t('monitored.artist.notCheckedHint') }}
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { fetchData, postToServer } from '@/utils/api'
import { socket } from '@/utils/socket'
import { toast } from '@/utils/toasts'

export default {
	name: 'Monitored',
	data() {
		return {
			isLoading: true,
			config: {
				enabled: true,
				checkIntervalHours: 24,
				autoDownload: false,
				bitrate: 9,
				includeAlbums: true,
				includeEPs: true,
				includeSingles: false
			},
			artists: [],
			totalMissing: 0,
			isCheckingAll: false,
			isDownloadingAll: false,
			checkingArtistIds: {},
			downloadingArtistIds: {},
			removingArtistIds: {},
			addingArtistIds: {},
			queuingReleaseIds: {},
			queuedReleaseIds: {},
			collapsedArtistIds: {},
			searchQuery: '',
			lastSearchTerm: '',
			isSearching: false,
			searchPerformed: false,
			searchResults: []
		}
	},
	mounted() {
		socket.on('monitoredUpdated', this.handleMonitoredUpdated)
		this.loadMonitored()
	},
	beforeDestroy() {
		socket.off('monitoredUpdated', this.handleMonitoredUpdated)
	},
	methods: {
		applySummary(payload) {
			if (!payload || typeof payload !== 'object') return
			if (payload.config) {
				this.config = Object.assign({}, this.config, payload.config)
			}
			if (Array.isArray(payload.artists)) {
				this.artists = payload.artists
			}
			if (typeof payload.totalMissing === 'number') {
				this.totalMissing = payload.totalMissing
			} else {
				this.totalMissing = this.artists.reduce((sum, a) => sum + (Number(a.missingCount) || 0), 0)
			}
		},
		handleMonitoredUpdated(payload) {
			this.applySummary(payload)
		},
		async loadMonitored() {
			this.isLoading = true
			try {
				const data = await fetchData('monitored')
				this.applySummary(data)
			} catch (err) {
				console.error('Failed to load monitored artists:', err)
			} finally {
				this.isLoading = false
			}
		},
		async saveConfig() {
			try {
				const res = await postToServer('monitored/config', this.config)
				if (!res || res.error) {
					throw new Error((res && res.error) || 'Request failed')
				}
				if (res.config) {
					this.config = Object.assign({}, this.config, res.config)
				}
				toast(this.$t('monitored.toasts.configSaved'), 'done')
			} catch (err) {
				console.error('Failed to save monitored config:', err)
				toast(this.$t('monitored.toasts.configFailed'), 'error')
			}
		},
		toggleReleaseType(field) {
			this.config[field] = !this.config[field]
			this.saveConfig()
		},
		async searchArtists() {
			const term = (this.searchQuery || '').trim()
			if (!term || this.isSearching) return

			this.isSearching = true
			this.searchPerformed = true
			this.lastSearchTerm = term

			try {
				const res = await fetchData('search', { term, type: 'artist', start: 0, nb: 8 })
				this.searchResults = res && Array.isArray(res.data) ? res.data : []
			} catch (err) {
				console.error('Failed to search Deezer artists:', err)
				this.searchResults = []
			} finally {
				this.isSearching = false
			}
		},
		clearSearch() {
			this.searchQuery = ''
			this.lastSearchTerm = ''
			this.searchPerformed = false
			this.searchResults = []
		},
		isArtistMonitored(artistId) {
			const targetId = String(artistId)
			return this.artists.some(a => String(a.id) === targetId && a.monitored !== false)
		},
		async toggleSearchArtist(result) {
			const id = String(result.id)
			if (this.addingArtistIds[id]) return
			this.$set(this.addingArtistIds, id, true)

			try {
				if (this.isArtistMonitored(id)) {
					const res = await postToServer('monitored/remove', { id })
					if (!res || res.error) throw new Error((res && res.error) || 'Failed')
					this.applySummary(res)
					toast(this.$t('monitored.toasts.artistRemoved', { name: result.name }), 'notifications_off')
				} else {
					const picture = result.picture_xl || result.picture_big || result.picture_medium || result.picture || ''
					const res = await postToServer('monitored/artist', {
						id,
						name: result.name,
						picture,
						monitored: true
					})
					if (!res || res.error) throw new Error((res && res.error) || 'Failed')
					this.applySummary(res)
					toast(this.$t('monitored.toasts.artistAdded', { name: result.name }), 'notifications_active')
				}
			} catch (err) {
				console.error('Failed to update monitored artist:', err)
				toast(this.$t('monitored.toasts.artistActionFailed'), 'error')
			} finally {
				this.$delete(this.addingArtistIds, id)
			}
		},
		async checkAllArtists() {
			if (this.isCheckingAll || this.artists.length === 0) return
			this.isCheckingAll = true
			try {
				const res = await postToServer('monitored/check', {})
				if (!res || res.error) throw new Error((res && res.error) || 'Failed')
				this.applySummary(res)
				toast(this.$t('monitored.toasts.checkedAll'), 'done')
			} catch (err) {
				console.error('Failed to check all monitored artists:', err)
				toast(this.$t('monitored.toasts.checkFailed'), 'error')
			} finally {
				this.isCheckingAll = false
			}
		},
		async checkSingleArtist(artist) {
			const id = String(artist.id)
			if (this.checkingArtistIds[id]) return
			this.$set(this.checkingArtistIds, id, true)

			try {
				const res = await postToServer('monitored/check', { id })
				if (!res || res.error) throw new Error((res && res.error) || 'Failed')
				this.applySummary(res)
				toast(this.$t('monitored.toasts.checkedArtist', { name: artist.name }), 'done')
			} catch (err) {
				console.error(`Failed to check artist ${artist.name}:`, err)
				toast(this.$t('monitored.toasts.checkFailed'), 'error')
			} finally {
				this.$delete(this.checkingArtistIds, id)
			}
		},
		async unmonitorArtist(artist) {
			const id = String(artist.id)
			if (this.removingArtistIds[id]) return
			this.$set(this.removingArtistIds, id, true)

			try {
				const res = await postToServer('monitored/remove', { id })
				if (!res || res.error) throw new Error((res && res.error) || 'Failed')
				this.applySummary(res)
				toast(this.$t('monitored.toasts.artistRemoved', { name: artist.name }), 'notifications_off')
			} catch (err) {
				console.error(`Failed to remove monitored artist ${artist.name}:`, err)
				toast(this.$t('monitored.toasts.artistActionFailed'), 'error')
			} finally {
				this.$delete(this.removingArtistIds, id)
			}
		},
		async queueMissingReleases(links, releaseIds, artistId = null) {
			const payload = {
				links,
				bitrate: this.config.bitrate
			}
			if (artistId != null) {
				payload.artistId = String(artistId)
			}
			const res = await postToServer('monitored/downloadMissing', payload)
			if (!res || res.result === false) {
				throw new Error((res && (res.error || res.errid)) || 'Failed')
			}
			releaseIds.forEach(rid => this.$set(this.queuedReleaseIds, String(rid), true))
			toast(this.$t('monitored.toasts.queuedMissing', { count: links.length }), 'cloud_download')
		},
		async downloadAllMissing() {
			if (this.isDownloadingAll || this.totalMissing === 0) return

			const links = []
			const releaseIds = []
			for (let i = 0; i < this.artists.length; i++) {
				const artist = this.artists[i]
				const releases = artist.missingReleases || []
				for (let j = 0; j < releases.length; j++) {
					if (releases[j].link) {
						links.push(releases[j].link)
						releaseIds.push(String(releases[j].id))
					}
				}
			}

			if (links.length === 0) return

			this.isDownloadingAll = true
			try {
				await this.queueMissingReleases(links, releaseIds)
			} catch (err) {
				console.error('Failed to queue all missing releases:', err)
				toast(this.$t('monitored.toasts.queueFailed'), 'error')
			} finally {
				this.isDownloadingAll = false
			}
		},
		async downloadArtistMissing(artist) {
			const id = String(artist.id)
			const releases = artist.missingReleases || []
			const links = releases.map(r => r.link).filter(Boolean)
			if (links.length === 0 || this.downloadingArtistIds[id]) return

			this.$set(this.downloadingArtistIds, id, true)
			try {
				await this.queueMissingReleases(
					links,
					releases.map(r => r.id),
					id
				)
			} catch (err) {
				console.error(`Failed to queue missing releases for ${artist.name}:`, err)
				toast(this.$t('monitored.toasts.queueFailed'), 'error')
			} finally {
				this.$delete(this.downloadingArtistIds, id)
			}
		},
		async downloadSingleRelease(release, artistId) {
			const rid = String(release.id)
			if (!release.link || this.queuingReleaseIds[rid]) return
			this.$set(this.queuingReleaseIds, rid, true)

			try {
				await this.queueMissingReleases([release.link], [rid], artistId)
			} catch (err) {
				console.error(`Failed to queue release ${release.title}:`, err)
				toast(this.$t('monitored.toasts.queueFailed'), 'error')
			} finally {
				this.$delete(this.queuingReleaseIds, rid)
			}
		},
		toggleArtistExpand(artistId) {
			const id = String(artistId)
			this.$set(this.collapsedArtistIds, id, !this.collapsedArtistIds[id])
		},
		isArtistCollapsed(artistId) {
			return Boolean(this.collapsedArtistIds[String(artistId)])
		},
		formatRecordType(recordType) {
			const type = (recordType || 'album').toLowerCase()
			if (type === 'ep') return 'EP'
			if (type === 'compile' || type === 'compilation') return 'COMPILATION'
			return type.toUpperCase()
		},
		recordTypeClass(recordType) {
			const type = (recordType || 'album').toLowerCase()
			if (type === 'ep') return 'pill-ep'
			if (type === 'single' || type === 'compile' || type === 'compilation') return 'pill-single'
			return 'pill-album'
		},
		formatNumber(num) {
			const n = Number(num)
			if (!Number.isFinite(n)) return '0'
			if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
			if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
			return String(n)
		},
		formatTimeAgo(isoString) {
			if (!isoString) return ''
			const ms = Date.parse(isoString)
			if (Number.isNaN(ms)) return isoString
			const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000))
			if (diffSec < 60) return 'just now'
			const diffMin = Math.floor(diffSec / 60)
			if (diffMin < 60) return `${diffMin}m ago`
			const diffHours = Math.floor(diffMin / 60)
			if (diffHours < 24) return `${diffHours}h ago`
			const diffDays = Math.floor(diffHours / 24)
			return `${diffDays}d ago`
		}
	}
}
</script>

<style scoped>
.monitored-page {
	padding-bottom: 4rem;
}

/* Header */
.page-header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1.5rem;
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
	font-size: 2.15rem;
	color: var(--primary-color);
	margin-right: 0.75rem;
}

.page-subtitle {
	font-size: 0.875rem;
	color: var(--secondary-text);
	margin: 0.35rem 0 0 0;
}

/* Top Summary Cards */
.summary-grid {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1rem;
	margin-bottom: 1.25rem;
}

@media (min-width: 768px) {
	.summary-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

.summary-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	padding: 1.15rem 1.25rem;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.summary-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.summary-label {
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--secondary-text);
}

.summary-icon {
	font-size: 1.3rem;
}

.summary-value {
	font-size: 1.9rem;
	font-weight: 800;
	margin-top: 0.45rem;
	letter-spacing: -0.02em;
}

.summary-status-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-top: 0.75rem;
}

.sync-status-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	font-size: 0.75rem;
	font-weight: 700;
	padding: 0.25rem 0.65rem;
	border-radius: 9999px;
}

.sync-active {
	background: rgba(16, 185, 129, 0.14);
	border: 1px solid rgba(16, 185, 129, 0.35);
	color: #10b981;
}

.sync-paused {
	background: rgba(148, 163, 184, 0.12);
	border: 1px solid var(--border-color);
	color: var(--secondary-text);
}

.sync-dot {
	width: 7px;
	height: 7px;
	border-radius: 9999px;
	background: #10b981;
	animation: pulse-dot 1.8s ease-in-out infinite;
}

@keyframes pulse-dot {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.35;
	}
}

.sync-sub-pill {
	font-size: 0.7rem;
	font-weight: 700;
	padding: 0.2rem 0.55rem;
	border-radius: 9999px;
}

.sub-autodl-on {
	background: rgba(59, 130, 246, 0.16);
	border: 1px solid rgba(59, 130, 246, 0.35);
	color: #60a5fa;
}

.sub-autodl-off {
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid var(--border-color);
	color: var(--secondary-text);
}

.text-cyan-val {
	color: #06b6d4;
}

.text-emerald-val {
	color: #10b981;
}

.text-amber-val {
	color: #f59e0b;
}

.text-muted-val {
	color: var(--secondary-text);
}

/* Controls Bar */
.controls-bar {
	border-radius: 1rem;
	padding: 1rem 1.25rem;
	margin-bottom: 1.25rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	flex-wrap: wrap;
}

.controls-settings-group {
	display: flex;
	align-items: center;
	gap: 1rem;
	flex-wrap: wrap;
}

.controls-actions-group {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	flex-wrap: wrap;
}

/* Custom Switch Toggle */
.toggle-control {
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	cursor: pointer;
	user-select: none;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	padding: 0.4rem 0.75rem;
	border-radius: 0.75rem;
	height: 2.4rem;
}

.toggle-input {
	position: absolute;
	opacity: 0;
	width: 0;
	height: 0;
	pointer-events: none;
}

.toggle-track {
	width: 2.15rem;
	height: 1.2rem;
	background: rgba(148, 163, 184, 0.28);
	border-radius: 9999px;
	position: relative;
	transition: background-color 0.2s ease;
	flex-shrink: 0;
}

.toggle-thumb {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 0.95rem;
	height: 0.95rem;
	background: #ffffff;
	border-radius: 9999px;
	transition: transform 0.2s ease;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-input:checked + .toggle-track {
	background: var(--primary-color);
}

.toggle-input:checked + .toggle-track .toggle-thumb {
	transform: translateX(0.95rem);
}

.toggle-label {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--foreground);
	white-space: nowrap;
}

/* Select Controls */
.select-control {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	padding: 0 0.75rem;
	border-radius: 0.75rem;
	height: 2.4rem;
}

.control-label {
	font-size: 0.75rem;
	font-weight: 700;
	color: var(--secondary-text);
	white-space: nowrap;
}

.compact-select {
	width: auto !important;
	min-height: 2rem !important;
	line-height: 2rem !important;
	padding: 0 1.75rem 0 0.35rem !important;
	background-color: transparent !important;
	border: none !important;
	font-size: 0.8125rem;
	font-weight: 700;
	color: var(--foreground);
	cursor: pointer;
}

.compact-select:focus {
	box-shadow: none !important;
}

.compact-select option {
	background: var(--card-background);
	color: var(--foreground);
}

/* Release Type Pills */
.release-type-group {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.type-pills {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
}

.type-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	height: 2.2rem;
	padding: 0 0.7rem;
	border-radius: 9999px;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	color: var(--secondary-text);
	font-size: 0.75rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s ease;
}

.type-pill:hover {
	border-color: var(--border-color-hover);
	color: var(--foreground);
}

.type-pill.active {
	background: rgba(59, 130, 246, 0.16);
	border-color: rgba(59, 130, 246, 0.45);
	color: #60a5fa;
}

.type-pill-icon {
	font-size: 0.95rem;
}

.action-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
}

.btn-icon {
	font-size: 1.1rem;
}

.btn-icon-sm {
	font-size: 1rem;
}

.btn-sm {
	height: 2rem;
	padding: 0 0.75rem;
	font-size: 0.75rem;
	border-radius: 0.625rem;
}

/* Add Artist Search */
.add-artist-panel {
	border-radius: 1rem;
	padding: 1rem 1.25rem;
	margin-bottom: 1.5rem;
}

.search-form {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	flex-wrap: wrap;
}

.search-input-wrap {
	position: relative;
	flex: 1;
	min-width: 15rem;
	display: flex;
	align-items: center;
}

.search-icon {
	position: absolute;
	left: 0.85rem;
	font-size: 1.2rem;
	color: var(--secondary-text);
	pointer-events: none;
}

.search-input {
	padding-left: 2.55rem !important;
	padding-right: 2.25rem !important;
	background: var(--card-background) !important;
	min-height: 2.5rem !important;
	line-height: 2.5rem !important;
}

.search-clear-btn {
	position: absolute;
	right: 0.6rem;
	background: transparent;
	border: none;
	color: var(--secondary-text);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0.2rem;
}

.search-clear-btn:hover {
	color: var(--foreground);
}

.search-submit-btn {
	height: 2.5rem;
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
}

.search-results-area {
	margin-top: 1rem;
	padding-top: 1rem;
	border-top: 1px solid var(--border-color);
}

.search-empty {
	text-align: center;
	font-size: 0.875rem;
	color: var(--secondary-text);
	padding: 0.75rem 0;
}

.search-results-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
	gap: 0.75rem;
}

.search-result-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	padding: 0.65rem 0.75rem;
	border-radius: 0.85rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
}

.search-artist-link {
	display: flex;
	align-items: center;
	gap: 0.7rem;
	min-width: 0;
	flex: 1;
	text-decoration: none;
}

.search-artist-avatar,
.search-artist-avatar-fallback {
	width: 2.65rem;
	height: 2.65rem;
	border-radius: 9999px;
	object-fit: cover;
	flex-shrink: 0;
	background: #090d16;
	border: 1px solid var(--border-color);
}

.search-artist-avatar-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
}

.search-artist-info {
	min-width: 0;
}

.search-artist-name {
	font-size: 0.875rem;
	font-weight: 700;
	color: var(--foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.search-artist-fans {
	font-size: 0.725rem;
	color: var(--secondary-text);
}

.monitor-search-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	flex-shrink: 0;
}

.btn-monitored-pill {
	background: rgba(16, 185, 129, 0.16);
	border: 1px solid rgba(16, 185, 129, 0.4);
	color: #10b981;
}

.btn-monitored-pill:hover {
	background: rgba(239, 68, 68, 0.14);
	border-color: rgba(239, 68, 68, 0.4);
	color: #f87171;
}

/* Loading & Empty States */
.loading-card,
.empty-state-card {
	border-radius: 1.25rem;
	padding: 4rem 1.5rem;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.loading-spinner {
	font-size: 2.5rem;
	color: var(--primary-color);
}

.loading-text {
	margin: 0.75rem 0 0 0;
	color: var(--secondary-text);
	font-size: 0.9375rem;
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
	margin-bottom: 1.25rem;
}

.empty-icon {
	font-size: 2.25rem;
}

.empty-title {
	font-size: 1.35rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0 0 0.5rem 0;
}

.empty-description {
	max-width: 32rem;
	font-size: 0.9rem;
	color: var(--secondary-text);
	margin: 0;
	line-height: 1.5;
}

/* Monitored Artist Cards */
.artists-list {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.artist-card {
	border-radius: 1.15rem;
	padding: 1.25rem;
}

.artist-card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	flex-wrap: wrap;
}

.artist-identity {
	display: flex;
	align-items: center;
	gap: 1rem;
	min-width: 0;
	flex: 1;
}

.artist-avatar-link {
	flex-shrink: 0;
}

.artist-avatar,
.artist-avatar-fallback {
	width: 4rem;
	height: 4rem;
	border-radius: 9999px;
	object-fit: cover;
	background: #090d16;
	border: 2px solid rgba(255, 255, 255, 0.14);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.artist-avatar-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
}

.artist-meta {
	min-width: 0;
	flex: 1;
}

.artist-title-row {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	flex-wrap: wrap;
}

.artist-name-link {
	font-size: 1.15rem;
	font-weight: 800;
	color: var(--foreground);
	text-decoration: none;
}

.artist-name-link:hover {
	color: var(--primary-color);
}

.checked-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.725rem;
	color: var(--secondary-text);
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid var(--border-color);
	padding: 0.15rem 0.5rem;
	border-radius: 9999px;
}

.checked-icon {
	font-size: 0.85rem;
}

.artist-counts-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-wrap: wrap;
	margin-top: 0.45rem;
}

.count-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	font-size: 0.75rem;
	font-weight: 700;
	padding: 0.2rem 0.6rem;
	border-radius: 9999px;
}

.count-icon {
	font-size: 0.9rem;
}

.count-owned {
	background: rgba(6, 182, 212, 0.12);
	border: 1px solid rgba(6, 182, 212, 0.3);
	color: #22d3ee;
}

.count-missing {
	background: rgba(245, 158, 11, 0.15);
	border: 1px solid rgba(245, 158, 11, 0.35);
	color: #fbbf24;
}

.count-uptodate {
	background: rgba(16, 185, 129, 0.14);
	border: 1px solid rgba(16, 185, 129, 0.35);
	color: #10b981;
}

.artist-error-note {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	margin-top: 0.4rem;
	font-size: 0.75rem;
	color: #f87171;
}

.artist-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.btn-unmonitor:hover {
	border-color: rgba(239, 68, 68, 0.45);
	color: #f87171;
	background: rgba(239, 68, 68, 0.12);
}

.expand-btn {
	width: 2rem;
	height: 2rem;
	color: var(--secondary-text);
}

/* Missing Releases Grid */
.missing-releases-grid {
	margin-top: 1.15rem;
	padding-top: 1.15rem;
	border-top: 1px solid var(--border-color);
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
	gap: 0.9rem;
}

.release-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 0.85rem;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	transition: transform 0.2s ease, border-color 0.2s ease;
}

.release-card:hover {
	border-color: var(--border-color-hover);
	transform: translateY(-2px);
}

.release-cover-link {
	display: block;
}

.release-cover-box {
	position: relative;
	width: 100%;
	padding-top: 100%;
	background: #090d16;
	overflow: hidden;
}

.release-cover-img {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.release-cover-fallback {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
}

.record-type-pill {
	position: absolute;
	top: 0.5rem;
	left: 0.5rem;
	font-size: 0.625rem;
	font-weight: 800;
	letter-spacing: 0.05em;
	padding: 0.15rem 0.45rem;
	border-radius: 0.375rem;
	backdrop-filter: blur(8px);
}

.pill-album {
	background: rgba(37, 99, 235, 0.85);
	color: #ffffff;
}

.pill-ep {
	background: rgba(6, 182, 212, 0.85);
	color: #ffffff;
}

.pill-single {
	background: rgba(245, 158, 11, 0.88);
	color: #090d16;
}

.release-body {
	padding: 0.75rem;
	display: flex;
	flex-direction: column;
	gap: 0.45rem;
	flex: 1;
}

.release-title {
	font-size: 0.84375rem;
	font-weight: 700;
	color: var(--foreground);
	text-decoration: none;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: 1.3;
}

.release-title:hover {
	color: var(--primary-color);
}

.release-meta {
	font-size: 0.725rem;
	color: var(--secondary-text);
	margin-top: auto;
}

.release-dl-btn {
	width: 100%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
	margin-top: 0.25rem;
}

.btn-queued {
	background: rgba(16, 185, 129, 0.16);
	border: 1px solid rgba(16, 185, 129, 0.4);
	color: #10b981;
}

.artist-empty-missing {
	margin-top: 0.9rem;
	padding-top: 0.75rem;
	border-top: 1px solid var(--border-color);
	display: flex;
	align-items: center;
	gap: 0.45rem;
	font-size: 0.8125rem;
	color: var(--secondary-text);
}

.empty-missing-icon {
	font-size: 1.05rem;
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
</style>
