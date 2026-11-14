<template>
	<div class="downloads-page">
		<div class="flex flex-wrap items-center justify-between mb-6">
			<div>
				<h1 class="text-4xl font-bold flex items-center">
					<i class="material-icons mr-3 text-primary text-4xl">cloud_download</i>
					{{ $t('downloadsPage.title') }}
				</h1>
				<p class="text-secondary text-sm mt-1">
					{{ $t('downloadsPage.subtitle') }}
				</p>
			</div>

			<!-- Top Actions -->
			<div class="flex items-center space-x-3 mt-4 sm:mt-0">
				<button
					class="btn btn-secondary flex items-center"
					:disabled="completedCount === 0"
					@click="clearCompleted"
					:title="$t('globals.clean_queue_hint')"
				>
					<i class="material-icons mr-1 text-lg">clear_all</i>
					{{ $t('downloadsPage.clearCompleted') }}
				</button>
				<button
					class="btn btn-danger flex items-center"
					:disabled="totalCount === 0"
					@click="cancelAll"
					:title="$t('globals.cancel_queue_hint')"
				>
					<i class="material-icons mr-1 text-lg">delete_sweep</i>
					{{ $t('downloadsPage.cancelAll') }}
				</button>
			</div>
		</div>

		<!-- Stats Overview Cards -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
			<div class="stat-card">
				<div class="text-secondary text-xs uppercase font-semibold">{{ $t('downloadsPage.tabs.all') }}</div>
				<div class="text-2xl font-bold mt-1">{{ totalCount }}</div>
			</div>
			<div class="stat-card">
				<div class="text-blue-400 text-xs uppercase font-semibold">{{ $t('downloadsPage.tabs.downloading') }}</div>
				<div class="text-2xl font-bold mt-1 text-blue-400">{{ downloadingCount }}</div>
			</div>
			<div class="stat-card">
				<div class="text-green-400 text-xs uppercase font-semibold">{{ $t('downloadsPage.tabs.completed') }}</div>
				<div class="text-2xl font-bold mt-1 text-green-400">{{ completedCount }}</div>
			</div>
			<div class="stat-card">
				<div class="text-red-400 text-xs uppercase font-semibold">{{ $t('downloadsPage.tabs.failed') }}</div>
				<div class="text-2xl font-bold mt-1 text-red-400">{{ failedCount }}</div>
			</div>
		</div>

		<!-- Filter Tabs -->
		<div class="flex border-b border-grayscale-400 mb-6 space-x-2">
			<button
				v-for="tab in filterTabs"
				:key="tab.id"
				class="filter-tab"
				:class="{ 'filter-tab-active': activeFilter === tab.id }"
				@click="activeFilter = tab.id"
			>
				{{ tab.label }}
				<span class="tab-badge" :class="tab.badgeClass">{{ tab.count }}</span>
			</button>
		</div>

		<!-- Downloads List -->
		<div v-if="filteredItems.length > 0" class="space-y-4">
			<div
				v-for="item in filteredItems"
				:key="item.uuid"
				class="download-card"
			>
				<div class="flex items-center flex-1 min-w-0 mr-4">
					<!-- Cover Art -->
					<div class="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-grayscale-400 mr-4 shadow">
						<img
							v-if="item.cover"
							:src="item.cover"
							:alt="item.title"
							class="w-full h-full object-cover"
							loading="lazy"
						/>
						<div v-else class="w-full h-full flex items-center justify-center text-grayscale-300">
							<i class="material-icons text-3xl">music_note</i>
						</div>
						<!-- Bitrate Tag -->
						<span class="bitrate-tag">
							{{ bitrateLabel(item.bitrate) }}
						</span>
					</div>

					<!-- Item Info -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center space-x-2">
							<i v-if="item.explicit" class="material-icons text-xs text-red-400" title="Explicit">explicit</i>
							<a
								v-if="generateLink(item)"
								:href="generateLink(item)"
								target="_blank"
								rel="noopener noreferrer"
								class="text-base font-semibold truncate hover:underline hover:text-primary transition-colors"
								:title="item.title"
							>
								{{ item.title }}
							</a>
							<span v-else class="text-base font-semibold truncate" :title="item.title">
								{{ item.title }}
							</span>
						</div>
						<div class="text-sm text-secondary truncate mt-0.5">
							{{ item.artist }}
						</div>

						<!-- Progress Bar & Details -->
						<div class="mt-2">
							<div class="flex justify-between items-center text-xs text-secondary mb-1">
								<span class="font-medium flex items-center">
									<!-- Status Badge -->
									<span class="status-badge mr-2" :class="statusBadgeClass(item)">
										{{ statusBadgeText(item) }}
									</span>
									<span v-if="item.size > 0">
										{{ item.downloaded + item.failed }} / {{ item.size }} {{ $t('downloadsPage.tracks') }}
									</span>
								</span>
								<span>{{ Math.round(calculateProgress(item)) }}%</span>
							</div>

							<!-- Custom Progress Bar -->
							<div class="w-full bg-grayscale-400 rounded-full h-2 overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-300"
									:class="progressBarClass(item)"
									:style="{ width: `${calculateProgress(item)}%` }"
								></div>
							</div>
						</div>

						<!-- Error message if any -->
						<div v-if="item.errors && item.errors.length > 0" class="mt-2 text-xs text-red-400 flex items-center">
							<i class="material-icons text-sm mr-1">error_outline</i>
							<span class="truncate">
								{{ item.errors[item.errors.length - 1].message || $t('downloadsPage.downloadErrorsOccurred') }}
								({{ item.failed }} {{ $t('downloadsPage.failedTracks') }})
							</span>
						</div>
					</div>
				</div>

				<!-- Actions for individual item -->
				<div class="flex items-center space-x-2 flex-shrink-0">
					<!-- Retry failed item -->
					<button
						v-if="isFailed(item)"
						class="btn btn-primary btn-only-icon p-2"
						:title="$t('downloadsPage.retry')"
						@click="retryDownload(item.uuid)"
					>
						<i class="material-icons text-base">refresh</i>
					</button>

					<!-- Remove from queue -->
					<button
						class="btn btn-secondary btn-only-icon p-2 hover:text-red-400"
						:title="$t('downloadsPage.remove')"
						@click="removeItem(item.uuid)"
					>
						<i class="material-icons text-base">delete</i>
					</button>
				</div>
			</div>
		</div>

		<!-- Empty State -->
		<div v-else class="empty-state">
			<i class="material-icons empty-icon">{{ emptyStateIcon }}</i>
			<h3 class="text-xl font-bold mt-4 text-foreground">{{ emptyStateTitle }}</h3>
			<p class="text-secondary text-sm mt-1 max-w-md text-center">
				{{ emptyStateMessage }}
			</p>
			<router-link
				v-if="activeFilter === 'all' && totalCount === 0"
				to="/search"
				class="btn btn-primary mt-4 flex items-center"
			>
				<i class="material-icons mr-1">search</i>
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
				{ id: 'all', label: this.$t('downloadsPage.tabs.all'), count: this.totalCount, badgeClass: 'bg-grayscale-300 text-foreground' },
				{ id: 'downloading', label: this.$t('downloadsPage.tabs.downloading'), count: this.downloadingCount, badgeClass: 'bg-blue-500 text-white' },
				{ id: 'completed', label: this.$t('downloadsPage.tabs.completed'), count: this.completedCount, badgeClass: 'bg-green-500 text-white' },
				{ id: 'failed', label: this.$t('downloadsPage.tabs.failed'), count: this.failedCount, badgeClass: 'bg-red-500 text-white' }
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
			return item.status === 'downloading' || item.status === 'converting' || (item.progress > 0 && item.progress < 100 && item.status !== 'download finished')
		},
		isCompleted(item) {
			return (item.status === 'download finished' || item.status === 'completed') && (!item.failed || item.failed === 0) && (!item.errors || item.errors.length === 0)
		},
		isFailed(item) {
			return item.status === 'failed' || (item.failed > 0) || (item.errors && item.errors.length > 0) || (item.status === 'download finished' && item.size > 0 && item.failed === item.size)
		},
		calculateProgress(item) {
			if (item.status === 'download finished') return 100
			if (item.status === 'converting') return 100 - (item.conversion || 0)
			if (item.progress !== undefined) return item.progress
			if (item.size > 0) {
				return Math.min(100, Math.round(((item.downloaded + item.failed) / item.size) * 100))
			}
			return 0
		},
		statusBadgeClass(item) {
			if (this.isFailed(item)) return 'badge-failed'
			if (this.isCompleted(item)) return 'badge-completed'
			if (item.status === 'converting') return 'badge-converting'
			if (item.status === 'downloading') return 'badge-downloading'
			return 'badge-queued'
		},
		statusBadgeText(item) {
			if (this.isFailed(item)) return this.$t('downloadsPage.status.failed')
			if (this.isCompleted(item)) return this.$t('downloadsPage.status.completed')
			if (item.status === 'converting') return this.$t('downloadsPage.status.converting')
			if (item.status === 'downloading') return this.$t('downloadsPage.status.downloading')
			return this.$t('downloadsPage.status.queued')
		},
		progressBarClass(item) {
			if (this.isFailed(item)) return 'bg-red-500'
			if (this.isCompleted(item)) return 'bg-green-500'
			if (item.status === 'converting') return 'bg-yellow-500'
			return 'bg-blue-500'
		},
		bitrateLabel(bitrate) {
			switch (parseInt(bitrate, 10)) {
				case 9: return 'FLAC'
				case 3: return '320'
				case 1: return '128'
				case 15: return '360HQ'
				case 14: return '360MQ'
				case 13: return '360LQ'
				default: return 'MISC'
			}
		},
		generateLink(item) {
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
	padding: 1.5rem 0;
}

.stat-card {
	background: var(--panels-background);
	border: 1px solid var(--border-color);
	border-radius: 0.5rem;
	padding: 1rem;
}

.filter-tab {
	display: inline-flex;
	align-items: center;
	padding: 0.6rem 1.2rem;
	font-weight: 500;
	color: var(--secondary-text);
	border-bottom: 2px solid transparent;
	transition: all 0.2s ease;
	cursor: pointer;
}

.filter-tab:hover {
	color: var(--foreground-color);
}

.filter-tab-active {
	color: var(--primary-color);
	border-bottom-color: var(--primary-color);
}

.tab-badge {
	margin-left: 0.5rem;
	padding: 0.15rem 0.5rem;
	font-size: 0.75rem;
	border-radius: 9999px;
	font-weight: 600;
}

.download-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: var(--panels-background);
	border: 1px solid var(--border-color);
	border-radius: 0.5rem;
	padding: 1rem;
	transition: border-color 0.2s ease;
}

.download-card:hover {
	border-color: var(--primary-color);
}

.bitrate-tag {
	position: absolute;
	bottom: 0;
	right: 0;
	background: rgba(0, 0, 0, 0.75);
	color: #fff;
	font-size: 0.65rem;
	font-weight: 700;
	padding: 1px 4px;
	border-top-left-radius: 3px;
	text-transform: uppercase;
}

.status-badge {
	display: inline-block;
	padding: 0.15rem 0.5rem;
	font-size: 0.7rem;
	font-weight: 600;
	border-radius: 0.25rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.badge-downloading {
	background: rgba(59, 130, 246, 0.2);
	color: #60a5fa;
}

.badge-converting {
	background: rgba(234, 179, 8, 0.2);
	color: #facc15;
}

.badge-completed {
	background: rgba(34, 197, 94, 0.2);
	color: #4ade80;
}

.badge-failed {
	background: rgba(239, 68, 68, 0.2);
	color: #f87171;
}

.badge-queued {
	background: rgba(156, 163, 175, 0.2);
	color: #9ca3af;
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
</style>
