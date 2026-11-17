<template>
	<aside
		id="sidebar"
		ref="sidebarEl"
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
			<div
				v-for="link in links"
				:key="link.name"
				class="nav-group"
				:class="{ 'nav-group--expanded': !isSlim && hasChildren(link) && isExpanded(link) }"
				@mouseenter="onNavItemEnter(link, $event)"
				@mouseleave="onNavItemLeave"
			>
				<div
					class="nav-item-row"
					:class="{
						'active-link': activeTablink === link.name,
						'has-children': hasChildren(link)
					}"
				>
					<router-link v-slot="{ href, navigate }" custom :to="getParentRoute(link)">
						<a
							:href="href"
							:aria-label="link.ariaLabel"
							:title="isSlim ? $t(link.label) : ''"
							class="nav-item group"
							@click="onParentClick(link, navigate, $event)"
						>
							<div class="nav-icon-wrapper">
								<i class="material-icons nav-icon">
									{{ link.icon }}
								</i>
								<!-- Downloading pulse badge on icon if slim -->
								<span v-if="isSlim && link.name === 'downloads' && downloadingCount > 0" class="slim-download-dot"></span>
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
						</a>
					</router-link>

					<!-- Submenu Expand/Collapse Chevron -->
					<button
						v-if="!isSlim && hasChildren(link)"
						type="button"
						class="submenu-toggle-btn"
						:class="{ 'is-expanded': isExpanded(link) }"
						:aria-expanded="isExpanded(link) ? 'true' : 'false'"
						:aria-label="`Toggle ${link.ariaLabel} submenu`"
						@click.stop="toggleSubmenu(link.name)"
					>
						<i class="material-icons submenu-chevron">expand_more</i>
					</button>
				</div>

				<!-- Collapsible Submenu List (Expanded Sidebar) -->
				<transition name="submenu-collapse">
					<div
						v-if="!isSlim && hasChildren(link) && isExpanded(link)"
						class="submenu-list"
						:class="{ 'submenu-list--active-parent': activeTablink === link.name }"
						role="menu"
					>
						<router-link
							v-for="child in link.children"
							:key="`${link.name}-${child.id}`"
							:to="getChildRoute(link, child)"
							class="submenu-item"
							:class="{ 'submenu-item--active': isSubmenuActive(link, child) }"
							role="menuitem"
							@click.native="activeTablink = link.name"
						>
							<i class="material-icons submenu-icon">{{ child.icon }}</i>
							<span class="submenu-label">{{ child.labelKey ? $t(child.labelKey) : child.label }}</span>
							<span v-if="isSubmenuActive(link, child)" class="submenu-active-dot"></span>
						</router-link>
					</div>
				</transition>
			</div>
		</nav>

		<!-- Floating Submenu Popover for Slim Sidebar Mode -->
		<transition name="popover-fade">
			<div
				v-if="isSlim && slimPopover && slimPopover.link"
				class="slim-submenu-popover"
				:style="{ top: `${slimPopover.top}px` }"
				role="menu"
				@mouseenter="cancelCloseSlimPopover"
				@mouseleave="scheduleCloseSlimPopover"
			>
				<div class="slim-popover-header">
					<i class="material-icons slim-popover-header-icon">{{ slimPopover.link.icon }}</i>
					<span class="slim-popover-title">{{ $t(slimPopover.link.label) }}</span>
				</div>
				<div class="slim-popover-items">
					<router-link
						v-for="child in slimPopover.link.children"
						:key="`slim-${slimPopover.link.name}-${child.id}`"
						:to="getChildRoute(slimPopover.link, child)"
						class="slim-popover-item"
						:class="{ 'slim-popover-item--active': isSubmenuActive(slimPopover.link, child) }"
						role="menuitem"
						@click.native="onSlimChildClick(slimPopover.link)"
					>
						<i class="material-icons submenu-icon">{{ child.icon }}</i>
						<span class="submenu-label">{{ child.labelKey ? $t(child.labelKey) : child.label }}</span>
						<span v-if="isSubmenuActive(slimPopover.link, child)" class="submenu-active-dot"></span>
					</router-link>
				</div>
			</div>
		</transition>

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
import { computed, defineComponent, onBeforeUnmount, onMounted, reactive, ref, toRefs, watch } from '@vue/composition-api'
import { links, resolveLinkChildId } from '@/data/sidebar'
import { useTheme } from '@/use/theme'
import { socket } from '@/utils/socket'
import { fetchData } from '@/utils/api'
import deemixIcon from '@/assets/deemix-icon.svg'

export default defineComponent({
	name: 'TheSidebar',
	setup(_, ctx) {
		const initialRoute = ctx.root.$route || { name: 'Home', query: {} }
		const activeTab = links.find(link => link.routerName === initialRoute.name)

		const initialExpanded = {}
		links.forEach(link => {
			if (link.children && link.children.length) {
				initialExpanded[link.name] = activeTab ? activeTab.name === link.name : false
			}
		})

		const state = reactive({
			activeTablink: activeTab ? activeTab.name : 'home',
			expandedMenus: initialExpanded,
			links
		})

		const sidebarEl = ref(null)
		const currentRouteName = ref(initialRoute.name || 'Home')
		const currentRouteQuery = ref({ ...(initialRoute.query || {}) })
		const isSlim = computed(() => ctx.root.$store.getters.getSlimSidebar)

		// Floating submenu popover state for slim-sidebar mode
		const slimPopover = ref(null)
		let slimCloseTimer = null

		const cancelCloseSlimPopover = () => {
			if (slimCloseTimer) {
				clearTimeout(slimCloseTimer)
				slimCloseTimer = null
			}
		}

		const closeSlimPopover = () => {
			cancelCloseSlimPopover()
			slimPopover.value = null
		}

		const scheduleCloseSlimPopover = () => {
			cancelCloseSlimPopover()
			slimCloseTimer = setTimeout(() => {
				slimPopover.value = null
				slimCloseTimer = null
			}, 160)
		}

		const openSlimPopoverFromElement = (link, targetEl, openedByHover) => {
			if (!link || !link.children || !link.children.length || !targetEl) return
			cancelCloseSlimPopover()
			const rect = targetEl.getBoundingClientRect()
			const estimatedHeight = 48 + link.children.length * 36 + 16
			const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
			const maxTop = Math.max(12, viewportHeight - estimatedHeight - 16)
			const top = Math.max(12, Math.min(rect.top, maxTop))
			slimPopover.value = { link, top, openedByHover }
		}

		const onNavItemEnter = (link, event) => {
			if (!isSlim.value) return
			if (!link.children || !link.children.length) {
				closeSlimPopover()
				return
			}
			openSlimPopoverFromElement(link, event.currentTarget, true)
		}

		const onNavItemLeave = () => {
			if (!isSlim.value) return
			scheduleCloseSlimPopover()
		}

		const hasChildren = link => Boolean(link && link.children && link.children.length)
		const isExpanded = link => Boolean(state.expandedMenus[link.name])

		const toggleSubmenu = linkName => {
			state.expandedMenus[linkName] = !state.expandedMenus[linkName]
		}

		const getParentRoute = link => {
			if (link.children && link.children.length && link.queryKey && link.defaultChild) {
				return {
					name: link.routerName,
					query: { [link.queryKey]: link.defaultChild }
				}
			}
			return { name: link.routerName }
		}

		const getChildRoute = (link, child) => ({
			name: link.routerName,
			query: { [link.queryKey]: child.id }
		})

		const isSubmenuActive = (link, child) => {
			if (currentRouteName.value !== link.routerName) return false
			return resolveLinkChildId(link, currentRouteQuery.value) === child.id
		}

		const onParentClick = (link, navigate, event) => {
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				navigate(event)
				return
			}
			state.activeTablink = link.name
			if (hasChildren(link)) {
				if (isSlim.value) {
					const isAlreadyOnRoute = currentRouteName.value === link.routerName
					if (isAlreadyOnRoute && (!slimPopover.value || !slimPopover.value.openedByHover)) {
						event.preventDefault()
						if (slimPopover.value && slimPopover.value.link && slimPopover.value.link.name === link.name) {
							closeSlimPopover()
						} else {
							openSlimPopoverFromElement(link, event.currentTarget, false)
						}
						return
					}
					closeSlimPopover()
				} else {
					state.expandedMenus[link.name] = true
				}
			}
			navigate(event)
		}

		const onSlimChildClick = link => {
			state.activeTablink = link.name
			closeSlimPopover()
		}

		const handleDocumentClick = event => {
			if (!slimPopover.value) return
			if (sidebarEl.value && !sidebarEl.value.contains(event.target)) {
				closeSlimPopover()
			}
		}

		const handleDocumentKeydown = event => {
			if (event.key === 'Escape' && slimPopover.value) {
				closeSlimPopover()
			}
		}

		watch(isSlim, slim => {
			if (!slim) {
				closeSlimPopover()
			}
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
			if (typeof document !== 'undefined') {
				document.addEventListener('click', handleDocumentClick)
				document.addEventListener('keydown', handleDocumentKeydown)
			}
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
			cancelCloseSlimPopover()
			if (typeof document !== 'undefined') {
				document.removeEventListener('click', handleDocumentClick)
				document.removeEventListener('keydown', handleDocumentKeydown)
			}
			socket.off('startDownload', handleStartDownload)
			socket.off('finishDownload', handleFinishDownload)
			socket.off('addedToQueue', handleAddedToQueue)
			socket.off('removedFromQueue', handleRemoveFromQueue)
			socket.off('removedAllDownloads', handleRemoveAllDownloads)
			socket.off('removedFinishedDownloads', handleRemoveFinishedDownloads)
			socket.off('removedFailedDownloads', handleRemoveFailedDownloads)
			socket.off('queueOrderUpdated', handleQueueOrderUpdated)
		})

		ctx.root.$router.afterEach((to, from) => {
			currentRouteName.value = to.name
			currentRouteQuery.value = { ...(to.query || {}) }
			closeSlimPopover()

			const linkInSidebar = state.links.find(link => link.routerName === to.name)
			if (!linkInSidebar) return
			state.activeTablink = linkInSidebar.name

			if (!from || to.name !== from.name) {
				state.links.forEach(link => {
					if (hasChildren(link)) {
						state.expandedMenus[link.name] = link.name === linkInSidebar.name
					}
				})
			} else if (hasChildren(linkInSidebar)) {
				state.expandedMenus[linkInSidebar.name] = true
			}
		})

		return {
			...toRefs(state),
			sidebarEl,
			slimPopover,
			currentTheme,
			toggleTheme,
			isSlim,
			downloadingCount,
			deemixIcon,
			hasChildren,
			isExpanded,
			toggleSubmenu,
			getParentRoute,
			getChildRoute,
			isSubmenuActive,
			onParentClick,
			onNavItemEnter,
			onNavItemLeave,
			onSlimChildClick,
			cancelCloseSlimPopover,
			scheduleCloseSlimPopover
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
	overflow-x: hidden;
}

.nav-links-list::-webkit-scrollbar {
	width: 4px;
}

.nav-links-list::-webkit-scrollbar-track {
	background: transparent;
}

.nav-links-list::-webkit-scrollbar-thumb {
	background: var(--main-scroll);
	border-radius: 9999px;
}

.slim-sidebar .nav-links-list {
	padding: 0.75rem 0.35rem;
	align-items: center;
}

.nav-group {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.slim-sidebar .nav-group {
	align-items: center;
}

.nav-item-row {
	display: flex;
	align-items: center;
	height: 2.75rem;
	border-radius: 0.75rem;
	color: var(--secondary-text);
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	position: relative;
}

.slim-sidebar .nav-item-row {
	justify-content: center;
	width: 2.75rem;
}

.nav-item-row:hover {
	color: var(--foreground);
	background-color: var(--border-color);
}

.nav-item-row.active-link {
	color: #ffffff;
	background: var(--primary-gradient);
	box-shadow: 0 4px 15px rgba(59, 130, 246, 0.35);
	font-weight: 600;
}

.nav-item {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0 0.85rem;
	color: inherit;
	text-decoration: none;
	font-weight: 500;
	font-size: 0.875rem;
}

.nav-item-row.has-children .nav-item {
	padding-right: 0.35rem;
}

.nav-item-row.active-link .nav-item {
	font-weight: 600;
}

.slim-sidebar .nav-item {
	justify-content: center;
	padding: 0 !important;
	width: 100%;
}

.nav-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	flex-shrink: 0;
}

.nav-icon {
	font-size: 1.35rem;
	transition: color 0.2s ease, transform 0.2s ease;
}

.nav-item-row:hover .nav-icon {
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

/* Submenu Toggle Chevron */
.submenu-toggle-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.85rem;
	height: 1.85rem;
	margin-right: 0.35rem;
	border-radius: 0.5rem;
	border: none;
	background: transparent;
	color: inherit;
	opacity: 0.75;
	cursor: pointer;
	flex-shrink: 0;
	transition: background-color 0.15s ease, opacity 0.15s ease;
	outline: none;
}

.submenu-toggle-btn:hover {
	opacity: 1;
	background-color: rgba(255, 255, 255, 0.12);
}

:root[data-theme='light'] .nav-item-row:not(.active-link) .submenu-toggle-btn:hover {
	background-color: rgba(15, 23, 42, 0.08);
}

.submenu-chevron {
	font-size: 1.15rem;
	transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.submenu-toggle-btn.is-expanded .submenu-chevron {
	transform: rotate(180deg);
}

/* Collapsible Submenu List */
.submenu-list {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	margin: 0.3rem 0 0.3rem 1.25rem;
	padding-left: 0.65rem;
	border-left: 1.5px solid var(--border-color-hover);
}

.submenu-list--active-parent {
	border-left-color: rgba(6, 182, 212, 0.35);
}

.submenu-item {
	display: flex;
	align-items: center;
	gap: 0.55rem;
	height: 2.1rem;
	padding: 0 0.65rem;
	border-radius: 0.55rem;
	color: var(--secondary-text);
	text-decoration: none;
	font-size: 0.8125rem;
	font-weight: 500;
	border: 1px solid transparent;
	transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
	position: relative;
}

.submenu-item:hover {
	color: var(--foreground);
	background-color: var(--border-color);
}

.submenu-item--active {
	color: var(--accent-cyan) !important;
	background: rgba(6, 182, 212, 0.12) !important;
	border-color: rgba(6, 182, 212, 0.28);
	font-weight: 600;
}

.submenu-icon {
	font-size: 1.05rem;
	opacity: 0.8;
	flex-shrink: 0;
	transition: color 0.18s ease, opacity 0.18s ease;
}

.submenu-item--active .submenu-icon,
.slim-popover-item--active .submenu-icon {
	color: var(--accent-cyan);
	opacity: 1;
}

.submenu-label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
}

.submenu-active-dot {
	width: 6px;
	height: 6px;
	border-radius: 9999px;
	background: var(--accent-cyan);
	box-shadow: 0 0 8px rgba(6, 182, 212, 0.75);
	flex-shrink: 0;
}

/* Submenu Collapse Animation */
.submenu-collapse-enter-active,
.submenu-collapse-leave-active {
	transition: max-height 0.24s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease, transform 0.18s ease;
	overflow: hidden;
}

.submenu-collapse-enter,
.submenu-collapse-leave-to {
	max-height: 0;
	opacity: 0;
	transform: translateY(-4px);
}

.submenu-collapse-enter-to,
.submenu-collapse-leave {
	max-height: 460px;
	opacity: 1;
	transform: translateY(0);
}

/* Slim Mode Floating Submenu Popover */
.slim-submenu-popover {
	position: fixed;
	left: 4.4rem;
	min-width: 14rem;
	max-width: 16.5rem;
	padding: 0.5rem;
	border-radius: 0.875rem;
	background: rgba(15, 23, 42, 0.94);
	backdrop-filter: blur(18px);
	-webkit-backdrop-filter: blur(18px);
	border: 1px solid rgba(255, 255, 255, 0.12);
	box-shadow: 0 18px 36px -8px rgba(0, 0, 0, 0.55), 0 0 20px rgba(6, 182, 212, 0.12);
	z-index: 60;
}

:root[data-theme='light'] .slim-submenu-popover {
	background: rgba(255, 255, 255, 0.96);
	border-color: rgba(15, 23, 42, 0.12);
	box-shadow: 0 18px 36px -8px rgba(15, 23, 42, 0.2);
}

/* Invisible hover bridge across the gap between slim rail and popover */
.slim-submenu-popover::before {
	content: '';
	position: absolute;
	left: -0.75rem;
	top: 0;
	bottom: 0;
	width: 0.75rem;
}

.slim-popover-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.4rem 0.65rem 0.55rem 0.65rem;
	margin-bottom: 0.35rem;
	border-bottom: 1px solid var(--border-color);
}

.slim-popover-header-icon {
	font-size: 1.05rem;
	color: var(--accent-cyan);
}

.slim-popover-title {
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--foreground);
}

.slim-popover-items {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
}

.slim-popover-item {
	display: flex;
	align-items: center;
	gap: 0.55rem;
	height: 2.15rem;
	padding: 0 0.65rem;
	border-radius: 0.55rem;
	color: var(--secondary-text);
	text-decoration: none;
	font-size: 0.8125rem;
	font-weight: 500;
	border: 1px solid transparent;
	transition: all 0.15s ease;
}

.slim-popover-item:hover {
	color: var(--foreground);
	background-color: var(--border-color);
}

.slim-popover-item--active {
	color: var(--accent-cyan) !important;
	background: rgba(6, 182, 212, 0.14) !important;
	border-color: rgba(6, 182, 212, 0.3);
	font-weight: 600;
}

.popover-fade-enter-active,
.popover-fade-leave-active {
	transition: opacity 0.15s ease, transform 0.15s ease;
}

.popover-fade-enter,
.popover-fade-leave-to {
	opacity: 0;
	transform: translateX(-6px);
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
	0%,
	100% {
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
