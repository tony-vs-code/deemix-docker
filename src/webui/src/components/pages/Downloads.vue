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
					class="btn action-btn"
					:class="queuePaused ? 'btn-primary' : 'btn-secondary'"
					:disabled="queueCount === 0"
					:title="queuePaused ? $t('downloadsPage.resumeQueue') : $t('downloadsPage.pauseQueue')"
					@click="togglePauseQueue"
				>
					<i class="material-icons btn-icon">{{ queuePaused ? 'play_arrow' : 'pause' }}</i>
					<span>{{ queuePaused ? $t('downloadsPage.resumeQueue') : $t('downloadsPage.pauseQueue') }}</span>
				</button>
				<button
					class="btn btn-secondary action-btn"
					:disabled="failedCount === 0"
					:title="$t('downloadsPage.clearFailed')"
					@click="clearFailed"
				>
					<i class="material-icons btn-icon">cleaning_services</i>
					<span>{{ $t('downloadsPage.clearFailed') }}</span>
				</button>
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

		<!-- Paused Banner Alert -->
		<div v-if="queuePaused" class="queue-paused-banner">
			<div class="banner-content">
				<i class="material-icons banner-icon">pause_circle_filled</i>
				<div class="banner-text">
					<span class="banner-title">{{ $t('downloadsPage.queuePaused') }}</span>
				</div>
			</div>
			<button class="btn btn-primary banner-resume-btn" @click="resumeQueue">
				<i class="material-icons mr-1 text-base">play_arrow</i>
				{{ $t('downloadsPage.resumeQueue') }}
			</button>
		</div>

		<!-- Interactive Stat Filter Cards with Totals -->
		<div class="stats-grid">
			<button
				class="stat-card"
				:class="{ 'stat-card-active active-queue': activeFilter === 'queue' }"
				@click="activeFilter = 'queue'"
			>
				<div class="stat-header">
					<span class="stat-label">{{ $t('downloadsPage.tabs.queue') }}</span>
					<i class="material-icons stat-icon">queue_music</i>
				</div>
				<div class="stat-value">{{ queueCount }}</div>
			</button>

			<button
				class="stat-card stat-downloading"
				:class="{ 'stat-card-active active-downloading': activeFilter === 'downloading' }"
				@click="activeFilter = 'downloading'"
			>
				<div class="stat-header">
					<span class="stat-label text-cyan">{{ $t('downloadsPage.status.downloading') }}</span>
					<i class="material-icons stat-icon text-cyan" :class="{ 'spin-slow': downloadingCount > 0 }">downloading</i>
				</div>
				<div class="stat-value text-cyan">{{ downloadingCount }}</div>
			</button>

			<button
				class="stat-card stat-queued"
				:class="{ 'stat-card-active active-queued': activeFilter === 'queued' }"
				@click="activeFilter = 'queued'"
			>
				<div class="stat-header">
					<span class="stat-label text-amber">{{ $t('downloadsPage.status.queued') }}</span>
					<i class="material-icons stat-icon text-amber">hourglass_top</i>
				</div>
				<div class="stat-value text-amber">{{ queuedCount }}</div>
			</button>

			<button
				class="stat-card stat-completed"
				:class="{ 'stat-card-active active-completed': activeFilter === 'completed' }"
				@click="activeFilter = 'completed'"
			>
				<div class="stat-header">
					<span class="stat-label text-emerald">{{ $t('downloadsPage.tabs.completed') }}</span>
					<i class="material-icons stat-icon text-emerald">check_circle</i>
				</div>
				<div class="stat-value text-emerald">{{ completedCount }}</div>
			</button>

			<button
				class="stat-card stat-failed"
				:class="{ 'stat-card-active active-failed': activeFilter === 'failed' }"
				@click="activeFilter = 'failed'"
			>
				<div class="stat-header">
					<span class="stat-label text-rose">{{ $t('downloadsPage.tabs.failed') }}</span>
					<i class="material-icons stat-icon text-rose">error_outline</i>
				</div>
				<div class="stat-value text-rose">{{ failedCount }}</div>
			</button>
		</div>

		<!-- Downloads List -->
		<div v-if="filteredItems.length > 0" class="downloads-list">
			<div
				v-for="item in filteredItems"
				:key="item.uuid"
				class="download-card"
				:class="{ 'is-dragged': draggedUuid === item.uuid, 'drag-target-over': dragTargetUuid === item.uuid }"
				:draggable="isQueued(item)"
				@dragstart="onDragStart($event, item.uuid)"
				@dragover.prevent="onDragOver($event, item.uuid)"
				@dragleave="onDragLeave($event, item.uuid)"
				@drop="onDrop($event, item.uuid)"
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
						v-if="isQueued(item)"
						class="btn btn-secondary btn-only-icon action-move"
						:disabled="isFirstInQueue(item.uuid)"
						:title="$t('downloadsPage.moveUp')"
						@click.stop="moveItemUp(item.uuid)"
					>
						<i class="material-icons">arrow_upward</i>
					</button>

					<button
						v-if="isQueued(item)"
						class="btn btn-secondary btn-only-icon action-move"
						:disabled="isLastInQueue(item.uuid)"
						:title="$t('downloadsPage.moveDown')"
						@click.stop="moveItemDown(item.uuid)"
					>
						<i class="material-icons">arrow_downward</i>
					</button>

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
			activeFilter: 'queue',
			queuePaused: false,
			draggedUuid: null,
			dragTargetUuid: null
		}
	},
	computed: {
		itemsArray() {
			const all = Object.values(this.queueList)
			const queueOrderMap = new Map()
			this.queue.forEach((uuid, idx) => queueOrderMap.set(uuid, idx))

			return all.sort((a, b) => {
				const aDownloading = this.isDownloading(a)
				const bDownloading = this.isDownloading(b)
				if (aDownloading && !bDownloading) return -1
				if (!aDownloading && bDownloading) return 1

				const aQueued = this.isQueued(a)
				const bQueued = this.isQueued(b)
				if (aQueued && bQueued) {
					const orderA = queueOrderMap.has(a.uuid) ? queueOrderMap.get(a.uuid) : 999999
					const orderB = queueOrderMap.has(b.uuid) ? queueOrderMap.get(b.uuid) : 999999
					return orderA - orderB
				}
				if (aQueued && !bQueued) return -1
				if (!aQueued && bQueued) return 1

				return 0
			})
		},
		totalCount() {
			return this.itemsArray.length
		},
		queueCount() {
			return this.itemsArray.filter(item => this.isDownloading(item) || this.isQueued(item)).length
		},
		downloadingCount() {
			return this.itemsArray.filter(this.isDownloading).length
		},
		queuedCount() {
			return this.itemsArray.filter(this.isQueued).length
		},
		completedCount() {
			return this.itemsArray.filter(this.isCompleted).length
		},
		failedCount() {
			return this.itemsArray.filter(this.isFailed).length
		},
		filteredItems() {
			switch (this.activeFilter) {
				case 'downloading':
					return this.itemsArray.filter(this.isDownloading)
				case 'queued':
					return this.itemsArray.filter(this.isQueued)
				case 'completed':
					return this.itemsArray.filter(this.isCompleted)
				case 'failed':
					return this.itemsArray.filter(this.isFailed)
				case 'queue':
				default:
					return this.itemsArray.filter(item => this.isDownloading(item) || this.isQueued(item))
			}
		},
		emptyStateIcon() {
			switch (this.activeFilter) {
				case 'completed':
					return 'done_all'
				case 'failed':
					return 'check_circle'
				case 'downloading':
					return 'downloading'
				case 'queued':
					return 'hourglass_empty'
				case 'queue':
				default:
					return 'cloud_off'
			}
		},
		emptyStateTitle() {
			switch (this.activeFilter) {
				case 'completed':
					return this.$t('downloadsPage.empty.completedTitle')
				case 'failed':
					return this.$t('downloadsPage.empty.failedTitle')
				case 'downloading':
					return 'No Active Downloads'
				case 'queued':
					return 'No Queued Downloads'
				case 'queue':
				default:
					return this.$t('downloadsPage.empty.queueTitle')
			}
		},
		emptyStateMessage() {
			switch (this.activeFilter) {
				case 'completed':
					return this.$t('downloadsPage.empty.completedMessage')
				case 'failed':
					return this.$t('downloadsPage.empty.failedMessage')
				case 'downloading':
					return 'There are no tracks currently downloading.'
				case 'queued':
					return 'There are no tracks waiting in the download queue.'
				case 'queue':
				default:
					return this.$t('downloadsPage.empty.queueMessage')
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
		socket.on('removedFailedDownloads', this.removedFailedDownloads)
		socket.on('queuePaused', this.handleQueuePaused)
		socket.on('queueResumed', this.handleQueueResumed)
		socket.on('queueOrderUpdated', this.queueOrderUpdated)

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
		socket.off('removedFailedDownloads', this.removedFailedDownloads)
		socket.off('queuePaused', this.handleQueuePaused)
		socket.off('queueResumed', this.handleQueueResumed)
		socket.off('queueOrderUpdated', this.queueOrderUpdated)
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
			if (!data) return
			const {
				queueOrder: initQueue = [],
				current: currentItem,
				currentItems = [],
				queue: initQueueList = {},
				queuePaused = false
			} = data

			this.queuePaused = !!queuePaused

			const initQueueComplete = Object.values(initQueueList)
				.filter(el => ['completed', 'withErrors', 'failed'].includes(el.status))
				.map(el => el.uuid)

			if (initQueueComplete && initQueueComplete.length) {
				initQueueComplete.forEach(item => {
					if (initQueueList[item]) {
						initQueueList[item].silent = true
						this.addToQueue(initQueueList[item])
					}
				})
			}

			const activeItems = Array.isArray(currentItems) && currentItems.length > 0
				? currentItems
				: (currentItem ? [currentItem] : [])

			activeItems.forEach(item => {
				if (item) {
					item.silent = true
					this.addToQueue(item, true)
				}
			})

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
			} else if (Array.isArray(currentItem)) {
				this.queue = currentItem.filter(id => this.queueList[id])
				const newQueueList = {}
				this.queue.forEach(id => {
					if (this.queueList[id]) newQueueList[id] = this.queueList[id]
				})
				this.queueList = newQueueList
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
		removedFailedDownloads() {
			const failedUuids = Object.values(this.queueList)
				.filter(this.isFailed)
				.map(item => item.uuid)

			failedUuids.forEach(uuid => {
				const index = this.queue.indexOf(uuid)
				if (index > -1) this.queue.splice(index, 1)
				const compIndex = this.queueComplete.indexOf(uuid)
				if (compIndex > -1) this.queueComplete.splice(compIndex, 1)
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
			if (!item) return false
			if (['completed', 'withErrors', 'failed', 'download finished'].includes(item.status)) return false
			return item.status === 'downloading' || item.status === 'converting'
		},
		isCompleted(item) {
			if (!item) return false
			if (item.status === 'download finished' || item.status === 'completed') {
				return (!item.failed || item.failed === 0) && (!item.errors || item.errors.length === 0)
			}
			return item.size > 0 && item.downloaded >= item.size && (!item.failed || item.failed === 0)
		},
		isFailed(item) {
			if (!item) return false
			if (item.status === 'failed' || item.status === 'withErrors') return true
			if (item.failed > 0 || (item.errors && item.errors.length > 0)) return true
			return false
		},
		isQueued(item) {
			if (!item) return false
			if (this.isDownloading(item) || this.isCompleted(item) || this.isFailed(item)) return false
			return item.status === 'inQueue' || this.queue.includes(item.uuid)
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
		async clearFailed() {
			this.removedFailedDownloads()
			await postToServer('clearFailedDownloads')
			socket.emit('clearFailedDownloads')
		},
		cancelAll() {
			socket.emit('cancelAllDownloads')
		},
		removeItem(uuid) {
			socket.emit('removeFromQueue', uuid)
		},
		retryDownload(uuid) {
			postToServer('retryDownload', { uuid })
		},
		handleQueuePaused(isPaused) {
			this.queuePaused = !!isPaused
		},
		handleQueueResumed() {
			this.queuePaused = false
		},
		togglePauseQueue() {
			if (this.queuePaused) {
				this.resumeQueue()
			} else {
				this.pauseQueue()
			}
		},
		async pauseQueue() {
			this.queuePaused = true
			await postToServer('pauseQueue')
			socket.emit('pauseQueue')
		},
		async resumeQueue() {
			this.queuePaused = false
			await postToServer('resumeQueue')
			socket.emit('resumeQueue')
		},
		queueOrderUpdated(newOrder) {
			if (!Array.isArray(newOrder)) return
			const activeUuids = this.queue.filter(uuid => {
				const item = this.queueList[uuid]
				return item && this.isDownloading(item)
			})
			const validNewOrder = newOrder.filter(uuid => this.queueList[uuid] && !activeUuids.includes(uuid))
			const rest = this.queue.filter(uuid => !validNewOrder.includes(uuid) && !activeUuids.includes(uuid))
			this.queue = [...activeUuids, ...validNewOrder, ...rest]
		},
		isFirstInQueue(uuid) {
			const q = this.queue.filter(u => this.queueList[u] && this.isQueued(this.queueList[u]))
			return q.length > 0 && q[0] === uuid
		},
		isLastInQueue(uuid) {
			const q = this.queue.filter(u => this.queueList[u] && this.isQueued(this.queueList[u]))
			return q.length > 0 && q[q.length - 1] === uuid
		},
		async moveItemUp(uuid) {
			const queued = this.queue.filter(u => this.queueList[u] && this.isQueued(this.queueList[u]))
			const idx = queued.indexOf(uuid)
			if (idx <= 0) return
			const prevUuid = queued[idx - 1]
			const qIdx1 = this.queue.indexOf(uuid)
			const qIdx2 = this.queue.indexOf(prevUuid)
			if (qIdx1 > -1 && qIdx2 > -1) {
				const temp = this.queue[qIdx1]
				this.$set(this.queue, qIdx1, this.queue[qIdx2])
				this.$set(this.queue, qIdx2, temp)
			}
			await postToServer('reorderQueue', { uuid, direction: 'up' })
		},
		async moveItemDown(uuid) {
			const queued = this.queue.filter(u => this.queueList[u] && this.isQueued(this.queueList[u]))
			const idx = queued.indexOf(uuid)
			if (idx === -1 || idx >= queued.length - 1) return
			const nextUuid = queued[idx + 1]
			const qIdx1 = this.queue.indexOf(uuid)
			const qIdx2 = this.queue.indexOf(nextUuid)
			if (qIdx1 > -1 && qIdx2 > -1) {
				const temp = this.queue[qIdx1]
				this.$set(this.queue, qIdx1, this.queue[qIdx2])
				this.$set(this.queue, qIdx2, temp)
			}
			await postToServer('reorderQueue', { uuid, direction: 'down' })
		},
		onDragStart(event, uuid) {
			if (!this.isQueued(this.queueList[uuid])) return
			this.draggedUuid = uuid
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move'
				event.dataTransfer.setData('text/plain', uuid)
			}
		},
		onDragOver(event, targetUuid) {
			if (!this.draggedUuid || this.draggedUuid === targetUuid) return
			if (!this.isQueued(this.queueList[targetUuid])) return
			this.dragTargetUuid = targetUuid
		},
		onDragLeave(event, targetUuid) {
			if (this.dragTargetUuid === targetUuid) {
				this.dragTargetUuid = null
			}
		},
		async onDrop(event, targetUuid) {
			const srcUuid = this.draggedUuid
			this.draggedUuid = null
			this.dragTargetUuid = null
			if (!srcUuid || srcUuid === targetUuid) return
			if (!this.isQueued(this.queueList[targetUuid])) return

			const fromIdx = this.queue.indexOf(srcUuid)
			const toIdx = this.queue.indexOf(targetUuid)
			if (fromIdx > -1 && toIdx > -1) {
				const newQueue = [...this.queue]
				newQueue.splice(fromIdx, 1)
				newQueue.splice(toIdx, 0, srcUuid)
				this.queue = newQueue
				const queuedOrder = this.queue.filter(u => this.queueList[u] && this.isQueued(this.queueList[u]))
				await postToServer('reorderQueue', { newOrder: queuedOrder })
			}
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
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	}
}

.stat-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	padding: 1.25rem 1rem;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	position: relative;
	overflow: hidden;
	cursor: pointer;
	text-align: left;
	width: 100%;
	display: flex;
	flex-direction: column;
}

.stat-card:hover {
	border-color: var(--border-color-hover);
	transform: translateY(-2px);
	box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.25);
}

.stat-card-active {
	border-color: var(--primary-color) !important;
	background: rgba(var(--primary-color-rgb, 124, 58, 237), 0.1) !important;
	box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 124, 58, 237), 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-card-active.active-downloading {
	border-color: #06b6d4 !important;
	background: rgba(6, 182, 212, 0.1) !important;
	box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-card-active.active-queued {
	border-color: #f59e0b !important;
	background: rgba(245, 158, 11, 0.1) !important;
	box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-card-active.active-completed {
	border-color: #10b981 !important;
	background: rgba(16, 185, 129, 0.1) !important;
	box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-card-active.active-failed {
	border-color: #f43f5e !important;
	background: rgba(244, 63, 94, 0.1) !important;
	box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
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

.badge-amber {
	background: rgba(245, 158, 11, 0.2);
	color: #f59e0b;
}

.text-amber {
	color: #f59e0b;
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
	background: rgba(245, 158, 11, 0.15);
	color: #f59e0b;
	border: 1px solid rgba(245, 158, 11, 0.3);
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

/* Paused Queue Banner */
.queue-paused-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.875rem 1.25rem;
	background: rgba(245, 158, 11, 0.12);
	border: 1px solid rgba(245, 158, 11, 0.35);
	border-radius: 0.875rem;
	margin-bottom: 1.5rem;
	backdrop-filter: blur(8px);
	-webkit-backdrop-filter: blur(8px);
}

.banner-content {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.banner-icon {
	font-size: 1.5rem;
	color: #f59e0b;
	flex-shrink: 0;
}

.banner-title {
	font-size: 0.925rem;
	font-weight: 600;
	color: #f59e0b;
}

.banner-resume-btn {
	display: flex;
	align-items: center;
	height: 2.25rem;
	padding: 0 0.875rem;
	font-size: 0.85rem;
	border-radius: 0.5rem;
	flex-shrink: 0;
}

/* Move Up / Move Down Actions */
.action-move:disabled {
	opacity: 0.35;
	cursor: not-allowed;
	pointer-events: none;
}

.action-move:hover:not(:disabled) {
	color: var(--primary-color) !important;
	border-color: var(--primary-color) !important;
}

/* Drag and Drop States */
.download-card[draggable="true"] {
	cursor: grab;
}

.download-card[draggable="true"]:active {
	cursor: grabbing;
}

.download-card.is-dragged {
	opacity: 0.45;
	border: 1px dashed var(--primary-color);
}

.download-card.drag-target-over {
	border: 2px solid var(--primary-color) !important;
	transform: scale(1.01);
}
</style>
