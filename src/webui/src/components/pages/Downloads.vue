<template>
	<div class="downloads-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<h1 class="page-title">
					<i class="material-icons title-icon">cloud_download</i>
					{{ $t('downloadsPage.title') }}
				</h1>
				<p class="page-subtitle">
					{{ $t('downloadsPage.subtitle') }}
				</p>
			</div>

			<!-- Top Actions -->
			<div class="header-actions">
				<button
					class="btn btn-secondary action-btn"
					:disabled="completedCount === 0"
					:title="$t('globals.clean_queue_hint')"
					@click="clearCompleted"
				>
					<i class="material-icons btn-icon">done_all</i>
					<span>{{ $t('downloadsPage.clearCompleted') }}</span>
				</button>
				<button
					class="btn btn-danger action-btn"
					:disabled="totalCount === 0"
					:title="$t('globals.cancel_queue_hint')"
					@click="cancelAll"
				>
					<i class="material-icons btn-icon">delete_sweep</i>
					<span>{{ $t('downloadsPage.cancelAll') }}</span>
				</button>
			</div>
		</div>

		<!-- Stats Overview Cards -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-label">{{ $t('downloadsPage.tabs.all') }}</span>
					<i class="material-icons stat-icon">queue_music</i>
				</div>
				<div class="stat-value">{{ totalCount }}</div>
			</div>

			<div class="stat-card stat-downloading">
				<div class="stat-header">
					<span class="stat-label text-cyan">{{ $t('downloadsPage.tabs.downloading') }}</span>
					<i class="material-icons stat-icon text-cyan" :class="{ 'spin-slow': downloadingCount > 0 }">downloading</i>
				</div>
				<div class="stat-value text-cyan">{{ downloadingCount }}</div>
			</div>

			<div class="stat-card stat-completed">
				<div class="stat-header">
					<span class="stat-label text-emerald">{{ $t('downloadsPage.tabs.completed') }}</span>
					<i class="material-icons stat-icon text-emerald">check_circle</i>
				</div>
				<div class="stat-value text-emerald">{{ completedCount }}</div>
			</div>

			<div class="stat-card stat-failed">
				<div class="stat-header">
					<span class="stat-label text-rose">{{ $t('downloadsPage.tabs.failed') }}</span>
					<i class="material-icons stat-icon text-rose">error_outline</i>
				</div>
				<div class="stat-value text-rose">{{ failedCount }}</div>
			</div>
		</div>

		<!-- Filter Tabs Bar -->
		<div class="filter-tabs-bar">
			<button
				v-for="tab in filterTabs"
				:key="tab.id"
				class="filter-pill"
				:class="{ 'filter-pill-active': activeFilter === tab.id }"
				@click="activeFilter = tab.id"
			>
				<span>{{ tab.label }}</span>
				<span class="filter-badge" :class="tab.badgeClass">{{ tab.count }}</span>
			</button>
		</div>

		<!-- Downloads List -->
		<div v-if="filteredItems.length > 0" class="downloads-list">
			<div
				v-for="item in filteredItems"
				:key="item.uuid"
				class="download-card"
			>
				<div class="card-main">
					<!-- Cover Artwork with Bitrate Tag -->
					<div class="cover-wrapper">
						<img
							v-if="item.cover"
							:src="item.cover"
							:alt="item.title"
							class="cover-image"
							loading="lazy"
						/>
						<div v-else class="cover-placeholder">
							<i class="material-icons text-3xl">music_note</i>
						</div>
						<span class="bitrate-badge">
							{{ bitrateLabel(item.bitrate) }}
						</span>
					</div>

					<!-- Track Info & Progress -->
					<div class="track-details">
						<div class="title-row">
							<a
								v-if="generateLink(item)"
								:href="generateLink(item)"
								target="_blank"
								rel="noopener noreferrer"
								class="track-title track-link"
								:title="item.title"
							>
								{{ item.title }}
								<i class="material-icons external-icon">open_in_new</i>
							</a>
							<span v-else class="track-title" :title="item.title">
								{{ item.title }}
							</span>
						</div>

						<div class="track-artist truncate">
							{{ item.artist }}
						</div>

						<!-- Progress Section -->
						<div class="progress-section">
							<div class="progress-meta">
								<div class="status-indicator-group">
									<span class="status-badge" :class="statusBadgeClass(item)">
										<span v-if="isDownloading(item)" class="status-pulse-dot"></span>
										{{ statusBadgeText(item) }}
									</span>
									<span v-if="item.size > 0" class="tracks-counter">
										{{ item.downloaded + item.failed }} / {{ item.size }} {{ $t('downloadsPage.tracks') }}
									</span>
								</div>
								<span class="progress-percent">
									{{ Math.round(calculateProgress(item)) }}%
								</span>
							</div>

							<!-- Vibrant Gradient Progress Bar -->
							<div class="progress-bar-track">
								<div
									class="progress-bar-fill"
									:class="progressBarClass(item)"
									:style="{ width: `${calculateProgress(item)}%` }"
								></div>
							</div>
						</div>

						<!-- Error Alert Details -->
						<div v-if="item.errors && item.errors.length > 0" class="error-alert">
							<i class="material-icons error-icon">warning</i>
							<span class="error-message truncate">
								{{ item.errors[item.errors.length - 1].message || $t('downloadsPage.downloadErrorsOccurred') }}
								({{ item.failed }} {{ $t('downloadsPage.failedTracks') }})
							</span>
						</div>
					</div>
				</div>

				<!-- Actions Column -->
				<div class="card-actions">
					<button
						v-if="isFailed(item)"
						class="btn btn-primary btn-only-icon"
						:title="$t('downloadsPage.retry')"
						@click="retryDownload(item.uuid)"
					>
						<i class="material-icons">refresh</i>
					</button>

					<button
						class="btn btn-secondary btn-only-icon action-delete"
						:title="$t('downloadsPage.remove')"
						@click="removeItem(item.uuid)"
					>
						<i class="material-icons">delete_outline</i>
					</button>
				</div>
			</div>
		</div>

		<!-- Empty State -->
		<div v-else class="empty-state-card">
			<div class="empty-icon-box">
				<i class="material-icons empty-icon">{{ emptyStateIcon }}</i>
			</div>
			<h3 class="empty-title">{{ emptyStateTitle }}</h3>
			<p class="empty-description">
				{{ emptyStateMessage }}
			</p>
			<router-link
				v-if="activeFilter === 'all' && totalCount === 0"
				to="/search"
				class="btn btn-primary mt-6"
			>
				<i class="material-icons mr-1.5 text-base">search</i>
				{{ $t('sidebar.search') }}
			</router-link>
		</div>
	</div>
</template>

<script>
import { socket } from '@/utils/socket'
import { fetchData, postToServer } from '@/utils/api'

export default {
	name: 'Downloads',
	data() {
		return {
			queue: [],
			queueList: {},
			queueComplete: [],
			activeFilter: 'all'
		}
	},
	computed: {
		itemsArray() {
			return Object.values(this.queueList)
		},
		totalCount() {
			return this.itemsArray.length
		},
		downloadingCount() {
			return this.itemsArray.filter(this.isDownloading).length
		},
		completedCount() {
			return this.itemsArray.filter(this.isCompleted).length
		},
		failedCount() {
			return this.itemsArray.filter(this.isFailed).length
		},
		filterTabs() {
			return [
				{ id: 'all', label: this.$t('downloadsPage.tabs.all'), count: this.totalCount, badgeClass: 'badge-muted' },
				{ id: 'downloading', label: this.$t('downloadsPage.tabs.downloading'), count: this.downloadingCount, badgeClass: 'badge-cyan' },
				{ id: 'completed', label: this.$t('downloadsPage.tabs.completed'), count: this.completedCount, badgeClass: 'badge-emerald' },
				{ id: 'failed', label: this.$t('downloadsPage.tabs.failed'), count: this.failedCount, badgeClass: 'badge-rose' }
			]
		},
		filteredItems() {
			switch (this.activeFilter) {
				case 'downloading':
					return this.itemsArray.filter(this.isDownloading)
				case 'completed':
					return this.itemsArray.filter(this.isCompleted)
				case 'failed':
					return this.itemsArray.filter(this.isFailed)
				case 'all':
				default:
					return this.itemsArray
			}
		},
		emptyStateIcon() {
			switch (this.activeFilter) {
				case 'downloading':
					return 'file_download_done'
				case 'completed':
					return 'done_all'
				case 'failed':
					return 'check_circle'
				case 'all':
				default:
					return 'cloud_off'
			}
		},
		emptyStateTitle() {
			switch (this.activeFilter) {
				case 'downloading':
					return this.$t('downloadsPage.empty.downloadingTitle')
				case 'completed':
					return this.$t('downloadsPage.empty.completedTitle')
				case 'failed':
					return this.$t('downloadsPage.empty.failedTitle')
				case 'all':
				default:
					return this.$t('downloadsPage.empty.allTitle')
			}
		},
		emptyStateMessage() {
			switch (this.activeFilter) {
				case 'downloading':
					return this.$t('downloadsPage.empty.downloadingMessage')
				case 'completed':
					return this.$t('downloadsPage.empty.completedMessage')
				case 'failed':
					return this.$t('downloadsPage.empty.failedMessage')
				case 'all':
				default:
					return this.$t('downloadsPage.empty.allMessage')
			}
		}
	},
	mounted() {
		socket.on('startDownload', this.startDownload)
		socket.on('startConversion', this.startConversion)
		socket.on('finishConversion', this.finishConversion)
		socket.on('addedToQueue', this.addToQueue)
		socket.on('updateQueue', this.updateQueue)
		socket.on('removedFromQueue', this.removeFromQueue)
		socket.on('finishDownload', this.finishDownload)
		socket.on('removedAllDownloads', this.removeAllDownloads)
		socket.on('removedFinishedDownloads', this.removedFinishedDownloads)

		this.loadInitialQueue()
	},
	destroyed() {
		socket.off('startDownload', this.startDownload)
		socket.off('startConversion', this.startConversion)
		socket.off('finishConversion', this.finishConversion)
		socket.off('addedToQueue', this.addToQueue)
		socket.off('updateQueue', this.updateQueue)
		socket.off('removedFromQueue', this.removeFromQueue)
		socket.off('finishDownload', this.finishDownload)
		socket.off('removedAllDownloads', this.removeAllDownloads)
		socket.off('removedFinishedDownloads', this.removedFinishedDownloads)
	},
	methods: {
		async loadInitialQueue() {
			try {
				const res = await fetchData('getQueue')
				this.initQueue(res)
			} catch (err) {
				console.error('Failed to get download queue:', err)
			}
		},
		initQueue(data) {
			const {
				queueOrder: initQueue = [],
				current: currentItem,
				queue: initQueueList = {}
			} = data

			const initQueueComplete = Object.values(initQueueList)
				.filter(el => ['completed', 'withErrors', 'failed'].includes(el.status))
				.map(el => el.uuid)

			if (initQueueComplete && initQueueComplete.length) {
				initQueueComplete.forEach(item => {
					initQueueList[item].silent = true
					this.addToQueue(initQueueList[item])
				})
			}

			if (currentItem) {
				currentItem.silent = true
				this.addToQueue(currentItem, true)
			}

			initQueue.forEach(item => {
				if (!initQueueList[item]) return
				initQueueList[item].silent = true
				this.addToQueue(initQueueList[item])
			})
		},
		addToQueue(queueItem, current = false) {
			if (Array.isArray(queueItem)) {
				queueItem.forEach(item => {
					item.silent = true
					this.addToQueue(item)
				})
				return
			}

			queueItem.downloaded = queueItem.downloaded || 0
			queueItem.failed = queueItem.failed || 0
			queueItem.progress = queueItem.progress || 0
			queueItem.conversion = queueItem.conversion || 0
			queueItem.errors = queueItem.errors || []

			this.$set(queueItem, 'current', current)
			this.$set(this.queueList, queueItem.uuid, queueItem)

			const itemIsAlreadyDownloaded = queueItem.downloaded + queueItem.failed === queueItem.size

			if (itemIsAlreadyDownloaded) {
				this.$set(this.queueList[queueItem.uuid], 'status', 'download finished')
				if (!this.queueComplete.includes(queueItem.uuid)) {
					this.queueComplete.push(queueItem.uuid)
				}
			} else {
				if (!this.queue.includes(queueItem.uuid)) {
					this.queue.push(queueItem.uuid)
				}
			}

			const needToStartDownload = !itemIsAlreadyDownloaded && ((queueItem.progress > 0 && queueItem.progress < 100) || current)
			if (needToStartDownload) {
				this.startDownload(queueItem.uuid)
			}
		},
		updateQueue(update) {
			const { uuid, downloaded, failed, progress, conversion, error, data, errid, stack, postFailed } = update

			if (uuid && this.queueList[uuid]) {
				if (downloaded) {
					this.queueList[uuid].downloaded++
				}
				if (failed) {
					this.queueList[uuid].failed++
					this.queueList[uuid].errors.push({ message: error, data, errid, stack })
				}
				if (progress !== undefined) {
					this.queueList[uuid].progress = progress
				}
				if (conversion !== undefined) {
					this.queueList[uuid].conversion = conversion
				}
				if (postFailed) {
					this.queueList[uuid].errors.push({ message: error, data, stack })
				}
			}
		},
		removeFromQueue(uuid) {
			const index = this.queue.indexOf(uuid)
			if (index > -1) {
				this.$delete(this.queue, index)
			}
			const compIndex = this.queueComplete.indexOf(uuid)
			if (compIndex > -1) {
				this.$delete(this.queueComplete, compIndex)
			}
			this.$delete(this.queueList, uuid)
		},
		removeAllDownloads(currentItem) {
			this.queueComplete = []
			if (!currentItem) {
				this.queue = []
				this.queueList = {}
			} else {
				this.queue = [currentItem]
				const tempQueueItem = this.queueList[currentItem]
				this.queueList = {}
				if (tempQueueItem) {
					this.queueList[currentItem] = tempQueueItem
				}
			}
		},
		removedFinishedDownloads() {
			const finishedUuids = Object.values(this.queueList)
				.filter(this.isCompleted)
				.map(item => item.uuid)

			finishedUuids.forEach(uuid => {
				const index = this.queueComplete.indexOf(uuid)
				if (index > -1) this.queueComplete.splice(index, 1)
				this.$delete(this.queueList, uuid)
			})
		},
		startDownload(uuid) {
			if (this.queueList[uuid]) {
				this.$set(this.queueList[uuid], 'status', 'downloading')
			}
		},
		finishDownload(uuid) {
			if (!this.queueList[uuid]) return
			this.$set(this.queueList[uuid], 'status', 'download finished')
			const index = this.queue.indexOf(uuid)
			if (index > -1) {
				this.queue.splice(index, 1)
			}
			if (!this.queueComplete.includes(uuid)) {
				this.queueComplete.push(uuid)
			}
		},
		startConversion(uuid) {
			if (this.queueList[uuid]) {
				this.$set(this.queueList[uuid], 'status', 'converting')
				this.$set(this.queueList[uuid], 'conversion', 0)
			}
		},
		finishConversion(downloadObject) {
			if (this.queueList[downloadObject.uuid]) {
				this.$set(this.queueList[downloadObject.uuid], 'size', downloadObject.size)
			}
		},
		isDownloading(item) {
			return item && (item.status === 'downloading' || item.status === 'converting' || (item.progress > 0 && item.progress < 100 && item.status !== 'download finished'))
		},
		isCompleted(item) {
			return item && (item.status === 'download finished' || item.status === 'completed') && (!item.failed || item.failed === 0) && (!item.errors || item.errors.length === 0)
		},
		isFailed(item) {
			return item && (item.status === 'failed' || (item.failed > 0) || (item.errors && item.errors.length > 0) || (item.status === 'download finished' && item.size > 0 && item.failed === item.size))
		},
		calculateProgress(item) {
			if (!item) return 0
			if (item.status === 'download finished') return 100
			if (item.status === 'converting') return 100 - (item.conversion || 0)
			if (item.progress !== undefined) return item.progress
			if (item.size > 0) {
				return Math.min(100, Math.round(((item.downloaded + item.failed) / item.size) * 100))
			}
			return 0
		},
		statusBadgeClass(item) {
			if (this.isFailed(item)) return 'status-badge-failed'
			if (this.isCompleted(item)) return 'status-badge-completed'
			if (item.status === 'converting') return 'status-badge-converting'
			if (item.status === 'downloading') return 'status-badge-downloading'
			return 'status-badge-queued'
		},
		statusBadgeText(item) {
			if (this.isFailed(item)) return this.$t('downloadsPage.status.failed')
			if (this.isCompleted(item)) return this.$t('downloadsPage.status.completed')
			if (item.status === 'converting') return this.$t('downloadsPage.status.converting')
			if (item.status === 'downloading') return this.$t('downloadsPage.status.downloading')
			return this.$t('downloadsPage.status.queued')
		},
		progressBarClass(item) {
			if (this.isFailed(item)) return 'bar-rose'
			if (this.isCompleted(item)) return 'bar-emerald'
			if (item.status === 'converting') return 'bar-amber'
			return 'bar-cyan-blue'
		},
		bitrateLabel(bitrate) {
			switch (parseInt(bitrate, 10)) {
				case 9: return 'FLAC'
				case 3: return '320'
				case 1: return '128'
				case 15: return '360HQ'
				case 14: return '360MQ'
				case 13: return '360LQ'
				default: return 'MP3'
			}
		},
		generateLink(item) {
			if (!item || !item.id) return null
			switch (item.type) {
				case 'track':
					return `https://deezer.com/track/${item.id}`
				case 'album':
					return `https://deezer.com/album/${item.id}`
				case 'playlist':
					return `https://deezer.com/playlist/${item.id}`
				case 'spotify_playlist':
					return `https://open.spotify.com/playlist/${item.id}`
				default:
					return null
			}
		},
		clearCompleted() {
			socket.emit('removeFinishedDownloads')
		},
		cancelAll() {
			socket.emit('cancelAllDownloads')
		},
		removeItem(uuid) {
			socket.emit('removeFromQueue', uuid)
		},
		retryDownload(uuid) {
			postToServer('retryDownload', { uuid })
		}
	}
}
</script>

<style scoped>
.downloads-page {
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

.page-subtitle {
	color: var(--secondary-text);
	font-size: 0.875rem;
	margin-top: 0.25rem;
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
	position: relative;
	overflow: hidden;
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
	color: var(--foreground);
}

.text-cyan {
	color: #06b6d4 !important;
}

.text-emerald {
	color: #10b981 !important;
}

.text-rose {
	color: #f43f5e !important;
}

.spin-slow {
	animation: spin 3s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Filter Tabs */
.filter-tabs-bar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.35rem;
	background: var(--surface-glass);
	backdrop-filter: blur(12px);
	border: 1px solid var(--border-color);
	border-radius: 0.875rem;
	margin-bottom: 1.75rem;
	overflow-x: auto;
}

.filter-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 1rem;
	border-radius: 0.625rem;
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--secondary-text);
	background: transparent;
	border: none;
	cursor: pointer;
	transition: all 0.2s ease;
	white-space: nowrap;
}

.filter-pill:hover {
	color: var(--foreground);
	background-color: var(--border-color);
}

.filter-pill-active {
	background: var(--card-background) !important;
	color: var(--foreground) !important;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	border: 1px solid var(--border-color-hover);
}

.filter-badge {
	padding: 0.1rem 0.45rem;
	font-size: 0.7rem;
	font-weight: 700;
	border-radius: 9999px;
}

.badge-muted {
	background: var(--border-color-hover);
	color: var(--foreground);
}

.badge-cyan {
	background: rgba(6, 182, 212, 0.2);
	color: #06b6d4;
}

.badge-emerald {
	background: rgba(16, 185, 129, 0.2);
	color: #10b981;
}

.badge-rose {
	background: rgba(244, 63, 94, 0.2);
	color: #f43f5e;
}

/* Download Cards List */
.downloads-list {
	display: flex;
	flex-direction: column;
	gap: 0.85rem;
}

.download-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	padding: 1rem 1.25rem;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.download-card:hover {
	border-color: var(--border-color-hover);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
	transform: translateY(-1px);
}

.card-main {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	margin-right: 1.25rem;
	gap: 1.15rem;
}

.cover-wrapper {
	position: relative;
	width: 4.5rem;
	height: 4.5rem;
	border-radius: 0.75rem;
	overflow: hidden;
	flex-shrink: 0;
	background: var(--secondary-background);
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
	border: 1px solid var(--border-color);
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cover-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
}

.bitrate-badge {
	position: absolute;
	bottom: 0;
	right: 0;
	background: rgba(15, 23, 42, 0.88);
	backdrop-filter: blur(4px);
	color: #06b6d4;
	font-size: 0.625rem;
	font-weight: 800;
	padding: 0.1rem 0.35rem;
	border-top-left-radius: 0.375rem;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
	border-left: 1px solid rgba(255, 255, 255, 0.1);
	letter-spacing: 0.05em;
}

.track-details {
	flex: 1;
	min-width: 0;
}

.title-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.track-title {
	font-size: 0.95rem;
	font-weight: 700;
	color: var(--foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.track-link {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	transition: color 0.15s ease;
}

.track-link:hover {
	color: var(--primary-color);
}

.external-icon {
	font-size: 0.875rem;
	opacity: 0.6;
}

.track-artist {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	margin-top: 0.15rem;
}

/* Progress & Meta */
.progress-section {
	margin-top: 0.6rem;
}

.progress-meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 0.75rem;
	margin-bottom: 0.35rem;
}

.status-indicator-group {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.tracks-counter {
	color: var(--secondary-text);
	font-weight: 500;
	font-size: 0.7rem;
}

.progress-percent {
	font-weight: 700;
	font-size: 0.75rem;
	color: var(--foreground);
}

/* Progress Bar */
.progress-bar-track {
	width: 100%;
	height: 0.45rem;
	background: var(--secondary-background);
	border-radius: 9999px;
	overflow: hidden;
	border: 1px solid var(--border-color);
}

.progress-bar-fill {
	height: 100%;
	border-radius: 9999px;
	transition: width 0.3s ease;
}

.bar-cyan-blue {
	background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%);
	box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
}

.bar-emerald {
	background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.bar-amber {
	background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

.bar-rose {
	background: linear-gradient(90deg, #f43f5e 0%, #e11d48 100%);
}

/* Status Badges */
.status-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.15rem 0.5rem;
	font-size: 0.6875rem;
	font-weight: 700;
	border-radius: 0.375rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.status-badge-downloading {
	background: rgba(6, 182, 212, 0.15);
	color: #06b6d4;
	border: 1px solid rgba(6, 182, 212, 0.3);
}

.status-pulse-dot {
	width: 6px;
	height: 6px;
	border-radius: 9999px;
	background-color: #06b6d4;
	animation: pulse 1.2s infinite;
}

.status-badge-converting {
	background: rgba(245, 158, 11, 0.15);
	color: #f59e0b;
	border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-badge-completed {
	background: rgba(16, 185, 129, 0.15);
	color: #10b981;
	border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-badge-failed {
	background: rgba(244, 63, 94, 0.15);
	color: #f43f5e;
	border: 1px solid rgba(244, 63, 94, 0.3);
}

.status-badge-queued {
	background: var(--border-color);
	color: var(--secondary-text);
}

/* Error Alert */
.error-alert {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	margin-top: 0.4rem;
	font-size: 0.75rem;
	color: #f43f5e;
}

.error-icon {
	font-size: 0.95rem;
	flex-shrink: 0;
}

.error-message {
	font-weight: 500;
}

/* Card Actions */
.card-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-shrink: 0;
}

.action-delete:hover {
	color: #f43f5e !important;
	border-color: rgba(244, 63, 94, 0.4) !important;
}

/* Empty State Card */
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
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
</style>
