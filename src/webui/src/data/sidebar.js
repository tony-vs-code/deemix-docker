export const sidebarSections = [
	{
		id: 'discover',
		label: 'Discover',
		links: [
			{
				name: 'home',
				section: 'discover',
				ariaLabel: 'home',
				routerName: 'Home',
				icon: 'home',
				label: 'sidebar.home'
			},
			{
				name: 'search',
				section: 'discover',
				ariaLabel: 'search',
				routerName: 'Search',
				icon: 'search',
				label: 'sidebar.search'
			},
			{
				name: 'charts',
				section: 'discover',
				ariaLabel: 'charts',
				routerName: 'Charts',
				icon: 'show_chart',
				label: 'sidebar.charts'
			}
		]
	},
	{
		id: 'media-queue',
		label: 'Media & Queue',
		links: [
			{
				name: 'library',
				section: 'media-queue',
				ariaLabel: 'library',
				routerName: 'Library',
				icon: 'library_music',
				label: 'sidebar.library',
				queryKey: 'tab',
				defaultChild: 'albums',
				children: [
					{ id: 'albums', label: 'Albums', labelKey: 'libraryPage.stats.albums', icon: 'album' },
					{ id: 'tracks', label: 'Tracks', labelKey: 'libraryPage.stats.tracks', icon: 'audiotrack' },
					{ id: 'artists', label: 'Artists', labelKey: 'libraryPage.stats.artists', icon: 'person' }
				]
			},
			{
				name: 'downloads',
				section: 'media-queue',
				ariaLabel: 'downloads',
				routerName: 'Downloads',
				icon: 'cloud_download',
				label: 'sidebar.downloads',
				queryKey: 'filter',
				defaultChild: 'queue',
				children: [
					{ id: 'queue', label: 'Queue', labelKey: 'downloadsPage.tabs.queue', icon: 'queue_music' },
					{ id: 'downloading', label: 'Downloading', labelKey: 'downloadsPage.tabs.downloading', icon: 'downloading' },
					{ id: 'queued', label: 'Queued', labelKey: 'downloadsPage.tabs.queued', icon: 'hourglass_top' },
					{ id: 'completed', label: 'Completed', labelKey: 'downloadsPage.tabs.completed', icon: 'check_circle' },
					{ id: 'failed', label: 'Failed', labelKey: 'downloadsPage.tabs.failed', icon: 'error_outline' }
				]
			}
		]
	},
	{
		id: 'system',
		label: 'System',
		links: [
			{
				name: 'settings',
				section: 'system',
				ariaLabel: 'settings',
				routerName: 'Settings',
				icon: 'settings',
				label: 'sidebar.settings',
				queryKey: 'tab',
				defaultChild: 'account',
				aliases: {
					files: 'folders',
					tags: 'metadata'
				},
				children: [
					{
						id: 'account',
						label: 'Account',
						icon: 'person',
						subtitle: 'Manage your Deezer session, ARL token, and Spotify credentials'
					},
					{
						id: 'plex',
						label: 'Plex',
						icon: 'cast_connected',
						subtitle: 'Connect Plex Media Server for automatic library refreshes'
					},
					{
						id: 'downloads',
						label: 'Downloads & Quality',
						icon: 'cloud_download',
						subtitle: 'Set preferred bitrate, concurrency, file overwrite, and download behavior'
					},
					{
						id: 'folders',
						label: 'Folders & Naming',
						icon: 'create_new_folder',
						subtitle: 'Customize track filename templates and folder hierarchy'
					},
					{
						id: 'metadata',
						label: 'Metadata & Tags',
						icon: 'bookmarks',
						subtitle: 'Choose embedded audio tags, artist formatting, and casing rules'
					},
					{
						id: 'artwork',
						label: 'Artwork & Covers',
						icon: 'image',
						subtitle: 'Configure cover art sizing, formats, and local image saving'
					},
					{
						id: 'general',
						label: 'General & Interface',
						icon: 'tune',
						subtitle: 'Configure UI language, appearance, and interface preferences'
					},
					{
						id: 'logs',
						label: 'Logs & Diagnostics',
						icon: 'receipt_long',
						subtitle: 'Inspect real-time application logs and filesystem permissions'
					}
				]
			}
		]
	}
]

export const links = sidebarSections.reduce((acc, section) => acc.concat(section.links), [])

export function getSidebarLink(name) {
	return links.find(link => link.name === name) || null
}

export function resolveLinkChildId(link, query = {}) {
	if (!link || !link.children || !link.children.length) return null
	let raw = query && link.queryKey ? query[link.queryKey] : undefined
	if (Array.isArray(raw)) raw = raw[0]
	if (typeof raw === 'string' && link.aliases && link.aliases[raw]) {
		raw = link.aliases[raw]
	}
	if (typeof raw === 'string' && link.children.some(child => child.id === raw)) {
		return raw
	}
	return link.defaultChild || link.children[0].id
}

export function getChildSection(linkName, childId) {
	const link = getSidebarLink(linkName)
	if (!link || !link.children) return null
	return link.children.find(child => child.id === childId) || link.children[0]
}

export function syncRouteQuery(vm, link, value) {
	if (!vm || !vm.$route || !vm.$router || !link || !link.queryKey) return value
	const resolved = resolveLinkChildId(link, { [link.queryKey]: value })
	if (vm.$route.name === link.routerName) {
		const rawQueryValue = vm.$route.query ? vm.$route.query[link.queryKey] : undefined
		const isImplicitDefault = rawQueryValue === undefined && resolved === link.defaultChild
		if (rawQueryValue !== resolved && !isImplicitDefault) {
			vm.$router.replace({ query: { ...vm.$route.query, [link.queryKey]: resolved } }).catch(() => {})
		}
	}
	return resolved
}

export function navigateToChildQuery(vm, link, value) {
	if (!vm || !vm.$route || !vm.$router || !link || !link.queryKey) return value
	const resolved = resolveLinkChildId(link, { [link.queryKey]: value })
	if (vm.$route.name === link.routerName && (!vm.$route.query || vm.$route.query[link.queryKey] !== resolved)) {
		vm.$router.replace({ query: { ...vm.$route.query, [link.queryKey]: resolved } }).catch(() => {})
	}
	return resolved
}
