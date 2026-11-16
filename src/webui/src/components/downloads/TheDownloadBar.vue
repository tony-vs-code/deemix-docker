<template>
	<section
		id="download_tab_container"
		ref="container"
		class="download-bar-container"
		:class="{ 'tab-hidden': !isExpanded, 'is-collapsed': !isExpanded }"
		:data-label="$t('downloads')"
		aria-label="downloads"
		@transitionend="$refs.container.style.transition = ''"
	>
		<!-- Drag handler -->
		<div
			v-show="isExpanded"
			class="drag-handle"
			title="Drag to resize"
			@mousedown.prevent="startDrag"
		>
			<div class="drag-handle-bar"></div>
		</div>

		<!-- Bar Header (Visible when Expanded) -->
		<div v-show="isExpanded" class="download-bar-header">
			<div class="header-left">
				<button
					type="button"
					class="bar-icon-btn toggle-btn"
					:title="$t('globals.toggle_download_tab_hint')"
					@click.prevent="toggleDownloadTab"
				>
					<i class="material-icons">chevron_right</i>
				</button>
				<div class="header-title-box">
					<span class="bar-title">{{ $t('downloads') }}</span>
					<span v-if="activeQueueCount > 0" class="bar-active-badge">{{ activeQueueCount }}</span>
				</div>
			</div>

			<div class="header-actions">
				<button
					v-if="clientMode"
					type="button"
					class="bar-icon-btn"
					:title="$t('globals.open_downloads_folder')"
					@click="openDownloadsFolder"
				>
					<i class="material-icons">folder_open</i>
				</button>
				<button
					type="button"
					class="bar-icon-btn"
					:title="$t('globals.clean_queue_hint')"
					@click="cleanQueue"
				>
					<i class="material-icons">clear_all</i>
				</button>
				<button
					type="button"
					class="bar-icon-btn bar-icon-btn-danger"
					:title="$t('globals.cancel_queue_hint')"
					@click="cancelQueue"
				>
					<i class="material-icons">delete_sweep</i>
				</button>
			</div>
		</div>

		<!-- Bar Toggler when Collapsed -->
		<div v-show="!isExpanded" class="collapsed-tab-wrapper" @click.prevent="toggleDownloadTab">
			<button
				type="button"
				class="collapsed-toggle-btn"
				:title="$t('globals.toggle_download_tab_hint')"
			>
				<i class="material-icons">chevron_left</i>
			</button>
			<div class="collapsed-label-box">
				<span class="collapsed-label">{{ $t('downloads') }}</span>
				<span v-if="activeQueueCount > 0" class="collapsed-count-pill">{{ activeQueueCount }}</span>
			</div>
		</div>

		<!-- Download Items List -->
		<div
			v-show="isExpanded"
			id="download_list"
			ref="list"
			class="download-list-scroll pr-2"
			:class="{ slim: isSlim }"
		>
			<QueueItem
				v-for="item in queueList"
				:key="item.uuid"
				:queue-item="item"
				:show-tags="showTags"
				@show-errors="showErrorsTab"
				@remove-item="onRemoveItem"
				@retry-download="onRetryDownload"
			/>
		</div>
	</section>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import QueueItem from '@components/downloads/QueueItem.vue'

import { socket } from '@/utils/socket'
import { toast } from '@/utils/toasts'
import { fetchData, postToServer } from '@/utils/api'

const tabMinWidth = 250
const tabMaxWidth = 550

export default {
	name: 'TheDownloadBar',
	components: {
		QueueItem
	},
	data() {
		return {
			cachedTabWidth: parseInt(localStorage.getItem('downloadTabWidth')) || 320,
			queue: [],
			queueList: {},
			queueComplete: [],
			isExpanded: localStorage.getItem('downloadTabOpen') === 'true'
		}
	},
	computed: {
		...mapGetters({
			clientMode: 'getClientMode',
			isSlim: 'getSlimDownloads',
			showTags: 'getShowBitrateTags'
		}),
		activeQueueCount() {
			return this.queue.length
		},
		finishedWithoutErrors() {
			const isCompletedWithoutErrors = el => (el.status || '') === 'download finished' && el.errors.length === 0

			return Object.values(this.queueList).filter(isCompletedWithoutErrors)
		}
	},
	created() {
		const checkIfToggleBar = keyEvent => {
			if (!(keyEvent.ctrlKey && keyEvent.key === 'b')) return

			this.toggleDownloadTab()
		}

		document.addEventListener('keyup', checkIfToggleBar)

		this.$on('hook:destroyed', () => {
			document.removeEventListener('keyup', checkIfToggleBar)
		})
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

		fetchData('getQueue')
			.then(res => {
				this.initQueue(res)
			})
			.catch(console.error)

		// Check if download tab has slim entries
		if (localStorage.getItem('slimDownloads') === 'true' && this.$refs.list) {
			this.$refs.list.classList.add('slim')
		}

		if (this.isExpanded) {
			this.setTabWidth(this.cachedTabWidth)
		}

		document.addEventListener('mouseup', () => {
			document.removeEventListener('mousemove', this.handleDrag)
		})

		window.addEventListener('beforeunload', () => {
			localStorage.setItem('downloadTabWidth', this.cachedTabWidth)
		})
	},
	methods: {
		...mapActions(['setErrors']),
		onRemoveItem(uuid) {
			socket.emit('removeFromQueue', uuid)
		},
		onRetryDownload(uuid) {
			console.log('Retry', uuid)
			postToServer('retryDownload', { uuid })
		},
		setTabWidth(newWidth) {
			if (undefined === newWidth) {
				if (this.$refs.container) this.$refs.container.style.width = ''
				if (this.$refs.list) this.$refs.list.style.width = ''
			} else {
				if (this.$refs.container) this.$refs.container.style.width = newWidth + 'px'
				if (this.$refs.list) this.$refs.list.style.width = newWidth + 'px'
			}
		},
		initQueue(data) {
			if (!data) return
			const {
				queueOrder: initQueue = [],
				current: currentItem,
				queue: initQueueList = {},
				restored
			} = data

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

			if (currentItem) {
				currentItem.silent = true
				this.addToQueue(currentItem, true)
			}

			initQueue.forEach(item => {
				if (!initQueueList[item]) return
				initQueueList[item].silent = true
				this.addToQueue(initQueueList[item])
			})

			if (restored) {
				toast(this.$t('toasts.queueRestored'), 'done', true, 'restoring_queue')
				socket.emit('queueRestored')
			}
		},
		addToQueue(queueItem, current = false) {
			if (Array.isArray(queueItem)) {
				if (queueItem.length > 1) {
					queueItem.forEach(item => {
						item.silent = true
						this.addToQueue(item)
					})
					toast(this.$t('toasts.addedMoreToQueue', { n: queueItem.length }), 'playlist_add_check')
					return
				} else {
					queueItem = queueItem[0]
				}
			}

			if (!queueItem) return

			// Add implicit values back
			queueItem.downloaded = queueItem.downloaded || 0
			queueItem.failed = queueItem.failed || 0
			queueItem.progress = queueItem.progress || 0
			queueItem.conversion = queueItem.conversion || 0
			queueItem.errors = queueItem.errors || []

			this.$set(queueItem, 'current', current)
			this.$set(this.queueList, queueItem.uuid, queueItem)

			const itemIsAlreadyDownloaded = queueItem.downloaded + queueItem.failed === queueItem.size

			if (itemIsAlreadyDownloaded) {
				const itemIsNotInCompletedQueue = !this.queueComplete.includes(queueItem.uuid)

				this.$set(this.queueList[queueItem.uuid], 'status', 'download finished')

				if (itemIsNotInCompletedQueue) {
					this.queueComplete.push(queueItem.uuid)
				}
			} else {
				const itemIsNotInQueue = !this.queue.includes(queueItem.uuid)

				if (itemIsNotInQueue) {
					this.queue.push(queueItem.uuid)
				}
			}

			const needToStartDownload = !itemIsAlreadyDownloaded && ((queueItem.progress > 0 && queueItem.progress < 100) || current)

			if (needToStartDownload) {
				this.startDownload(queueItem.uuid)
			}

			if (!queueItem.silent) {
				toast(this.$t('toasts.addedToQueue', { item: queueItem.title }), 'playlist_add_check')
			}
		},
		updateQueue(update) {
			const { uuid, downloaded, failed, progress, conversion, error, data, errid, stack, postFailed } = update

			if (uuid && this.queue.includes(uuid) && this.queueList[uuid]) {
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
				this.$delete(this.queueList, uuid)
			}
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
				this.queueList[currentItem] = tempQueueItem
			}
		},
		removedFinishedDownloads() {
			this.queueComplete = this.finishedWithoutErrors.map(el => el.uuid)

			this.queueComplete.forEach(uuid => {
				this.$delete(this.queueList, uuid)
			})

			this.queueComplete = []
		},
		toggleDownloadTab() {
			this.setTabWidth()

			if (this.$refs.container) {
				this.$refs.container.style.transition = 'all 250ms ease-in-out'
			}

			this.isExpanded = !this.isExpanded

			if (this.isExpanded) {
				this.setTabWidth(this.cachedTabWidth)
			}

			localStorage.setItem('downloadTabOpen', this.isExpanded)
		},
		cleanQueue() {
			socket.emit('removeFinishedDownloads')
		},
		cancelQueue() {
			socket.emit('cancelAllDownloads')
		},
		openDownloadsFolder() {
			if (window.api && window.api.send) {
				window.api.send('openDownloadsFolder')
			}
		},
		handleDrag(event) {
			let newWidth = window.innerWidth - event.pageX + 2

			if (newWidth < tabMinWidth) {
				newWidth = tabMinWidth
			} else if (newWidth > tabMaxWidth) {
				newWidth = tabMaxWidth
			}

			this.cachedTabWidth = newWidth
			this.setTabWidth(newWidth)
		},
		startDrag() {
			document.addEventListener('mousemove', this.handleDrag)
		},
		startDownload(uuid) {
			if (this.queueList[uuid]) {
				this.$set(this.queueList[uuid], 'status', 'downloading')
			}
		},
		finishDownload(uuid) {
			const isInQueue = this.queue.includes(uuid) || this.queueComplete.includes(uuid)

			if (!isInQueue || !this.queueList[uuid]) return

			this.$set(this.queueList[uuid], 'status', 'download finished')
			toast(this.$t('toasts.finishDownload', { item: this.queueList[uuid].title }), 'done')

			const index = this.queue.indexOf(uuid)

			if (index > -1) {
				this.queue.splice(index, 1)
				this.queueComplete.push(uuid)
			}

			if (this.queue.length <= 0) {
				toast(this.$t('toasts.allDownloaded'), 'done_all')
			}
		},
		startConversion(uuid) {
			if (this.queueList[uuid]) {
				this.$set(this.queueList[uuid], 'status', 'converting')
				this.$set(this.queueList[uuid], 'conversion', 0)
			}
		},
		finishConversion(downloadObject) {
			if (downloadObject && this.queueList[downloadObject.uuid]) {
				this.$set(this.queueList[downloadObject.uuid], 'size', downloadObject.size)
			}
		},
		async showErrorsTab(item) {
			await this.setErrors(item)
			this.$router.push({ name: 'Errors' })
		}
	}
}
</script>

<style scoped>
.download-bar-container {
	position: relative;
	height: 100vh;
	background: var(--surface-glass, rgba(15, 23, 42, 0.88));
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	border-left: 1px solid var(--border-color);
	color: var(--foreground);
	display: flex;
	flex-direction: column;
	z-index: 20;
	user-select: none;
}

.download-bar-container.is-collapsed {
	width: 2.5rem !important;
	cursor: pointer;
}

.download-bar-container.is-collapsed:hover {
	background: rgba(255, 255, 255, 0.05);
}

/* Drag Handle */
.drag-handle {
	position: absolute;
	top: 0;
	left: -3px;
	width: 6px;
	height: 100%;
	cursor: ew-resize;
	z-index: 30;
	display: flex;
	align-items: center;
	justify-content: center;
}

.drag-handle-bar {
	width: 2px;
	height: 3rem;
	border-radius: 9999px;
	background: transparent;
	transition: background-color 0.15s ease;
}

.drag-handle:hover .drag-handle-bar {
	background: var(--primary-color);
}

/* Bar Header */
.download-bar-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--border-color);
	height: 3.5rem;
	flex-shrink: 0;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.header-title-box {
	display: flex;
	align-items: center;
	gap: 0.45rem;
}

.bar-title {
	font-size: 0.9375rem;
	font-weight: 700;
	color: var(--foreground);
	letter-spacing: -0.01em;
}

.bar-active-badge {
	font-size: 0.6875rem;
	font-weight: 800;
	color: #fff;
	background: var(--primary-gradient);
	padding: 0.1rem 0.45rem;
	border-radius: 9999px;
	box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

.bar-icon-btn {
	width: 2rem;
	height: 2rem;
	border-radius: 0.5rem;
	background: transparent;
	border: none;
	color: var(--secondary-text);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.15s ease;
}

.bar-icon-btn:hover {
	color: var(--foreground);
	background: rgba(255, 255, 255, 0.08);
}

.bar-icon-btn i {
	font-size: 1.2rem;
}

.bar-icon-btn-danger:hover {
	color: #ef4444;
	background: rgba(239, 68, 68, 0.12);
}

/* Collapsed Tab */
.collapsed-tab-wrapper {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 0.75rem 0;
	gap: 1.5rem;
}

.collapsed-toggle-btn {
	background: transparent;
	border: none;
	color: var(--secondary-text);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.15s ease;
}

.collapsed-toggle-btn:hover {
	color: var(--primary-color);
}

.collapsed-label-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.75rem;
	writing-mode: vertical-rl;
	transform: rotate(180deg);
}

.collapsed-label {
	font-size: 0.8125rem;
	font-weight: 700;
	letter-spacing: 0.05em;
	color: var(--secondary-text);
	text-transform: uppercase;
}

.collapsed-count-pill {
	font-size: 0.6875rem;
	font-weight: 800;
	background: var(--primary-gradient);
	color: #ffffff;
	padding: 0.25rem 0.45rem;
	border-radius: 9999px;
	writing-mode: horizontal-tb;
	transform: rotate(180deg);
}

/* Scroll List */
.download-list-scroll {
	flex: 1;
	overflow-y: auto;
	padding: 0.75rem;
}

.download-list-scroll::-webkit-scrollbar {
	width: 6px;
}

.download-list-scroll::-webkit-scrollbar-track {
	background: transparent;
}

.download-list-scroll::-webkit-scrollbar-thumb {
	background: var(--border-color);
	border-radius: 9999px;
}

.download-list-scroll::-webkit-scrollbar-thumb:hover {
	background: var(--secondary-text);
}
</style>
