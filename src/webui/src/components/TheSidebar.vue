<template>
	<aside
		id="sidebar"
		:class="{ 'slim-sidebar': isSlim }"
		aria-label="sidebar"
		class="sidebar-nav"
		role="navigation"
	>
		<!-- Brand Header -->
		<div class="brand-header">
			<div class="deemix-icon-container" v-html="deemixIcon" />
			<div v-if="!isSlim" class="brand-text">
				<span class="brand-name">deemix</span>
				<span class="brand-badge">PRO</span>
			</div>
		</div>

		<!-- Nav Links -->
		<nav class="nav-links-list">
			<router-link
				v-for="link in links"
				:key="link.name"
				:aria-label="link.ariaLabel"
				:class="{ 'active-link': activeTablink === link.name }"
				:to="{ name: link.routerName }"
				class="nav-item group"
				@click.native="activeTablink = link.name"
			>
				<div class="nav-icon-wrapper">
					<i class="material-icons nav-icon group-hover:text-primary">
						{{ link.icon }}
					</i>
					<!-- Downloading pulse badge on icon if slim -->
					<span
						v-if="isSlim && link.name === 'downloads' && downloadingCount > 0"
						class="slim-download-dot"
					></span>
				</div>

				<span v-if="!isSlim" class="nav-label">
					{{ $t(link.label) }}
				</span>

				<!-- Active downloads badge on Downloads tab -->
				<span
					v-if="!isSlim && link.name === 'downloads' && downloadingCount > 0"
					class="download-count-badge"
					:title="`${downloadingCount} active downloads`"
				>
					<span class="badge-pulse"></span>
					{{ downloadingCount }}
				</span>
			</router-link>
		</nav>

		<!-- Bottom Theme Toggler -->
		<div class="sidebar-footer">
			<button
				class="theme-toggle-btn"
				:title="currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
				@click="toggleTheme"
			>
				<i class="material-icons theme-icon">
					{{ currentTheme === 'dark' ? 'light_mode' : 'dark_mode' }}
				</i>
				<span v-if="!isSlim" class="theme-label">
					{{ currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode' }}
				</span>
			</button>
		</div>
	</aside>
</template>

<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, reactive, ref, toRefs } from '@vue/composition-api'
import { links } from '@/data/sidebar'
import { useTheme } from '@/use/theme'
import { socket } from '@/utils/socket'
import { fetchData } from '@/utils/api'
import deemixIcon from '@/assets/deemix-icon.svg'

export default defineComponent({
	name: 'TheSidebar',
	setup(_, ctx) {
		const activeTab = links.find(link => link.routerName === ctx.root.$route.name)

		const state = reactive({
			activeTablink: activeTab ? activeTab.name : 'home',
			links
		})

		const { currentTheme, toggleTheme } = useTheme()

		// Active downloads tracker for the badge
		const queueList = ref({})
		const queueOrder = ref([])
		const activeUuids = ref([])

		const isFinished = item => {
			if (!item) return true
			return (
				['completed', 'withErrors', 'failed', 'download finished'].includes(item.status) ||
				(item.size > 0 && (item.downloaded || 0) + (item.failed || 0) >= item.size)
			)
		}

		const isDownloading = item => {
			if (!item || isFinished(item)) return false
			return item.status === 'downloading' || item.status === 'converting' || activeUuids.value.includes(item.uuid)
		}

		const isQueued = item => {
			if (!item || isFinished(item) || isDownloading(item)) return false
			return item.status === 'inQueue' || queueOrder.value.includes(item.uuid)
		}

		const downloadingCount = computed(() => {
			return Object.values(queueList.value).filter(item => isDownloading(item) || isQueued(item)).length
		})

		const updateItem = (uuid, data) => {
			if (!queueList.value[uuid]) return
			queueList.value = {
				...queueList.value,
				[uuid]: { ...queueList.value[uuid], ...data }
			}
		}

		const handleAddedToQueue = item => {
			if (!item) return
			if (Array.isArray(item)) {
				item.forEach(i => handleAddedToQueue(i))
				return
			}
			queueList.value = {
				...queueList.value,
				[item.uuid]: item
			}
			if (item.uuid && !queueOrder.value.includes(item.uuid)) {
				queueOrder.value.push(item.uuid)
			}
		}

		const handleStartDownload = uuid => {
			if (!activeUuids.value.includes(uuid)) {
				activeUuids.value = [...activeUuids.value, uuid]
			}
			updateItem(uuid, { status: 'downloading' })
			queueOrder.value = queueOrder.value.filter(u => u !== uuid)
		}

		const handleFinishDownload = uuid => {
			activeUuids.value = activeUuids.value.filter(u => u !== uuid)
			updateItem(uuid, { status: 'download finished' })
			queueOrder.value = queueOrder.value.filter(u => u !== uuid)
		}

		const handleRemoveFromQueue = uuid => {
			activeUuids.value = activeUuids.value.filter(u => u !== uuid)
			queueOrder.value = queueOrder.value.filter(u => u !== uuid)
			const updated = { ...queueList.value }
			delete updated[uuid]
			queueList.value = updated
		}

		const handleRemoveAllDownloads = () => {
			activeUuids.value = []
			queueOrder.value = []
			queueList.value = {}
		}

		const handleRemoveFinishedDownloads = () => {
			const updated = { ...queueList.value }
			Object.keys(updated).forEach(uuid => {
				if (isFinished(updated[uuid])) {
					delete updated[uuid]
				}
			})
			queueList.value = updated
		}

		const handleRemoveFailedDownloads = () => {
			const updated = { ...queueList.value }
			Object.keys(updated).forEach(uuid => {
				const item = updated[uuid]
				if (item && (item.status === 'failed' || item.status === 'withErrors' || (item.failed || 0) > 0)) {
					delete updated[uuid]
				}
			})
			queueList.value = updated
		}

		const handleQueueOrderUpdated = newOrder => {
			if (Array.isArray(newOrder)) {
				queueOrder.value = newOrder
			}
		}

		onMounted(async () => {
			socket.on('startDownload', handleStartDownload)
			socket.on('finishDownload', handleFinishDownload)
			socket.on('addedToQueue', handleAddedToQueue)
			socket.on('removedFromQueue', handleRemoveFromQueue)
			socket.on('removedAllDownloads', handleRemoveAllDownloads)
			socket.on('removedFinishedDownloads', handleRemoveFinishedDownloads)
			socket.on('removedFailedDownloads', handleRemoveFailedDownloads)
			socket.on('queueOrderUpdated', handleQueueOrderUpdated)

			try {
				const queueData = await fetchData('getQueue')
				if (queueData) {
					if (queueData.queue) queueList.value = queueData.queue
					if (Array.isArray(queueData.queueOrder)) queueOrder.value = queueData.queueOrder
					const active = []
					if (Array.isArray(queueData.currentItems)) {
						queueData.currentItems.forEach(item => {
							if (item && item.uuid && !active.includes(item.uuid)) {
								active.push(item.uuid)
							}
						})
					} else if (queueData.current && queueData.current.uuid) {
						active.push(queueData.current.uuid)
					}
					activeUuids.value = active
				}
			} catch (e) {
				// socket will handle subsequent updates
			}
		})

		onBeforeUnmount(() => {
			socket.off('startDownload', handleStartDownload)
			socket.off('finishDownload', handleFinishDownload)
			socket.off('addedToQueue', handleAddedToQueue)
			socket.off('removedFromQueue', handleRemoveFromQueue)
			socket.off('removedAllDownloads', handleRemoveAllDownloads)
			socket.off('removedFinishedDownloads', handleRemoveFinishedDownloads)
			socket.off('removedFailedDownloads', handleRemoveFailedDownloads)
			socket.off('queueOrderUpdated', handleQueueOrderUpdated)
		})

		ctx.root.$router.afterEach(to => {
			const linkInSidebar = state.links.find(link => link.routerName === to.name)
			if (!linkInSidebar) return
			state.activeTablink = linkInSidebar.name
		})

		return {
			...toRefs(state),
			currentTheme,
			toggleTheme,
			isSlim: computed(() => ctx.root.$store.getters.getSlimSidebar),
			downloadingCount,
			deemixIcon
		}
	}
})
</script>

<style scoped>
.sidebar-nav {
	width: 16rem;
	min-width: 16rem;
	height: 100vh;
	display: flex;
	flex-direction: column;
	background: var(--surface-glass);
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	border-right: 1px solid var(--border-color);
	user-select: none;
	transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	z-index: 30;
	position: relative;
}

.sidebar-nav.slim-sidebar {
	width: 4rem;
	min-width: 4rem;
}

/* Brand Header */
.brand-header {
	display: flex;
	align-items: center;
	padding: 1.5rem 1.25rem 1.25rem 1.25rem;
	gap: 0.75rem;
}

.slim-sidebar .brand-header {
	padding: 1rem 0;
	justify-content: center;
}

.deemix-icon-container {
	display: flex;
	align-items: center;
	justify-content: center;
	filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3));
}

.deemix-icon-container::v-deep svg {
	height: 38px;
	width: 38px;
}

.slim-sidebar .deemix-icon-container::v-deep svg {
	height: 28px;
	width: 28px;
}

.brand-text {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.brand-name {
	font-size: 1.25rem;
	font-weight: 800;
	letter-spacing: -0.025em;
	color: var(--foreground);
	background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

:root[data-theme='light'] .brand-name {
	background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

.brand-badge {
	font-size: 0.625rem;
	font-weight: 700;
	padding: 0.15rem 0.45rem;
	border-radius: 9999px;
	background: var(--primary-gradient);
	color: #ffffff;
	letter-spacing: 0.05em;
}

/* Nav list */
.nav-links-list {
	display: flex;
	flex-direction: column;
	padding: 0.75rem 0.75rem;
	gap: 0.35rem;
	flex: 1;
	overflow-y: auto;
}

.slim-sidebar .nav-links-list {
	padding: 0.75rem 0.35rem;
	align-items: center;
}

.nav-item {
	display: flex;
	align-items: center;
	height: 2.75rem;
	padding: 0 0.85rem;
	border-radius: 0.75rem;
	color: var(--secondary-text);
	text-decoration: none;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	position: relative;
	font-weight: 500;
	font-size: 0.875rem;
}

.slim-sidebar .nav-item {
	justify-content: center;
	padding: 0;
	width: 2.75rem;
}

.nav-item:hover {
	color: var(--foreground);
	background-color: var(--border-color);
}

.nav-item.active-link {
	color: #ffffff;
	background: var(--primary-gradient);
	box-shadow: 0 4px 15px rgba(59, 130, 246, 0.35);
	font-weight: 600;
}

.nav-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.nav-icon {
	font-size: 1.35rem;
	transition: color 0.2s ease, transform 0.2s ease;
}

.nav-item:hover .nav-icon {
	transform: scale(1.08);
}

.nav-label {
	margin-left: 0.75rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-transform: capitalize;
	flex: 1;
}

/* Download Badge */
.download-count-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	padding: 0.15rem 0.5rem;
	font-size: 0.75rem;
	font-weight: 700;
	border-radius: 9999px;
	background: #06b6d4;
	color: #ffffff;
	box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
	margin-left: auto;
}

.active-link .download-count-badge {
	background: #ffffff;
	color: var(--primary-color);
	box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.badge-pulse {
	width: 6px;
	height: 6px;
	border-radius: 9999px;
	background-color: #ffffff;
	animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.active-link .badge-pulse {
	background-color: var(--primary-color);
}

.slim-download-dot {
	position: absolute;
	top: -2px;
	right: -2px;
	width: 8px;
	height: 8px;
	border-radius: 9999px;
	background-color: #06b6d4;
	box-shadow: 0 0 8px #06b6d4;
	animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.4;
		transform: scale(1.2);
	}
}

/* Sidebar Footer / Theme Toggle */
.sidebar-footer {
	padding: 1rem 0.75rem;
	border-top: 1px solid var(--border-color);
}

.slim-sidebar .sidebar-footer {
	padding: 1rem 0.35rem;
	display: flex;
	justify-content: center;
}

.theme-toggle-btn {
	display: flex;
	align-items: center;
	width: 100%;
	height: 2.5rem;
	padding: 0 0.85rem;
	border-radius: 0.75rem;
	background: var(--secondary-background);
	border: 1px solid var(--border-color);
	color: var(--secondary-text);
	font-size: 0.8125rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	outline: none;
}

.slim-sidebar .theme-toggle-btn {
	width: 2.5rem;
	padding: 0;
	justify-content: center;
}

.theme-toggle-btn:hover {
	color: var(--foreground);
	border-color: var(--border-color-hover);
	background-color: var(--table-highlight);
}

.theme-icon {
	font-size: 1.25rem;
	color: var(--primary-color);
}

.theme-label {
	margin-left: 0.75rem;
	white-space: nowrap;
}
</style>
