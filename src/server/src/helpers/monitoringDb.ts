import fs from 'fs'
import path from 'path'
// @ts-expect-error
import deemixLib from 'deemix'
import { MonitoredConfig, MissingRelease, MonitoredArtist, MonitoredData } from '../types'
import { logger } from './logger'
import { getLibrary } from './libraryDb'
import { getPlexSettings, fetchPlexLibrary } from './plex'

export const configFolder: string = deemixLib.utils.localpaths.getConfigFolder()
export const monitoredFilePath = path.join(configFolder, 'monitored.json')

export const DEFAULT_MONITORED_CONFIG: MonitoredConfig = {
	enabled: true,
	checkIntervalHours: 24,
	autoDownload: false,
	bitrate: 9,
	includeAlbums: true,
	includeEPs: true,
	includeSingles: false
}

const CHECK_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ALBUM_PAGES = 10

export interface OwnedAlbumLookup {
	byArtist: Map<string, Set<string>>
	allTitles: Set<string>
	source: 'plex' | 'local'
	hadError?: boolean
}

export interface MonitoredSummary {
	config: MonitoredConfig
	artists: MonitoredArtist[]
	totalMissing: number
}

let cachedData: MonitoredData | null = null
let schedulerTimer: NodeJS.Timeout | null = null
let isCheckingAll = false

/**
 * Atomically writes JSON to disk via temp file + rename.
 */
function atomicWriteJson(filePath: string, data: any): void {
	const dir = path.dirname(filePath)
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}
	const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`
	fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8')
	try {
		fs.renameSync(tempPath, filePath)
	} catch {
		fs.copyFileSync(tempPath, filePath)
		fs.unlinkSync(tempPath)
	}
}

function sanitizeConfig(raw: any): MonitoredConfig {
	const parsedInterval = Number(raw?.checkIntervalHours)
	const checkIntervalHours =
		Number.isFinite(parsedInterval) && parsedInterval >= 1 ? Math.round(parsedInterval) : DEFAULT_MONITORED_CONFIG.checkIntervalHours

	const parsedBitrate = Number(raw?.bitrate)
	const bitrate = [1, 3, 9, 13, 14, 15].includes(parsedBitrate) ? parsedBitrate : DEFAULT_MONITORED_CONFIG.bitrate

	return {
		enabled: raw?.enabled !== undefined ? Boolean(raw.enabled) : DEFAULT_MONITORED_CONFIG.enabled,
		checkIntervalHours,
		autoDownload: raw?.autoDownload !== undefined ? Boolean(raw.autoDownload) : DEFAULT_MONITORED_CONFIG.autoDownload,
		bitrate,
		includeAlbums: raw?.includeAlbums !== undefined ? Boolean(raw.includeAlbums) : DEFAULT_MONITORED_CONFIG.includeAlbums,
		includeEPs: raw?.includeEPs !== undefined ? Boolean(raw.includeEPs) : DEFAULT_MONITORED_CONFIG.includeEPs,
		includeSingles: raw?.includeSingles !== undefined ? Boolean(raw.includeSingles) : DEFAULT_MONITORED_CONFIG.includeSingles
	}
}

function sanitizeMissingRelease(raw: any): MissingRelease {
	return {
		id: String(raw?.id ?? ''),
		title: String(raw?.title ?? ''),
		link: String(raw?.link ?? (raw?.id ? `https://www.deezer.com/album/${raw.id}` : '')),
		cover: String(raw?.cover ?? ''),
		releaseDate: String(raw?.releaseDate ?? ''),
		recordType: String(raw?.recordType ?? 'album').toLowerCase(),
		nbTracks: Number(raw?.nbTracks) || 0
	}
}

function sanitizeArtist(raw: any): MonitoredArtist {
	const missingReleases = Array.isArray(raw?.missingReleases) ? raw.missingReleases.map(sanitizeMissingRelease) : []
	const totalReleases = Number(raw?.totalReleases) || 0
	const ownedCount = Number(raw?.ownedCount) || 0
	const missingCount = raw?.missingCount !== undefined ? Number(raw.missingCount) || 0 : missingReleases.length

	return {
		id: String(raw?.id ?? '').trim(),
		name: String(raw?.name ?? '').trim() || 'Unknown Artist',
		picture: String(raw?.picture ?? '').trim(),
		monitored: raw?.monitored !== undefined ? Boolean(raw.monitored) : true,
		addedAt: typeof raw?.addedAt === 'string' && raw.addedAt ? raw.addedAt : new Date().toISOString(),
		lastCheckedAt: typeof raw?.lastCheckedAt === 'string' && raw.lastCheckedAt ? raw.lastCheckedAt : null,
		totalReleases,
		ownedCount,
		missingCount,
		missingReleases,
		...(raw?.lastError !== undefined ? { lastError: raw.lastError ? String(raw.lastError) : null } : {})
	}
}

function cloneMonitoredData(data: MonitoredData): MonitoredData {
	return {
		config: { ...data.config },
		artists: data.artists.map(artist => ({
			...artist,
			missingReleases: artist.missingReleases.map(release => ({ ...release }))
		}))
	}
}

function saveMonitoredData(data: MonitoredData): void {
	const clean: MonitoredData = {
		config: sanitizeConfig(data.config),
		artists: data.artists.map(sanitizeArtist)
	}
	atomicWriteJson(monitoredFilePath, clean)
	cachedData = cloneMonitoredData(clean)
}

export function getMonitoredData(): MonitoredData {
	if (cachedData) {
		return cloneMonitoredData(cachedData)
	}

	let loaded: MonitoredData = {
		config: { ...DEFAULT_MONITORED_CONFIG },
		artists: []
	}

	try {
		if (fs.existsSync(monitoredFilePath)) {
			const raw = fs.readFileSync(monitoredFilePath, 'utf-8')
			const parsed = JSON.parse(raw)
			if (parsed && typeof parsed === 'object') {
				loaded = {
					config: sanitizeConfig(parsed.config),
					artists: Array.isArray(parsed.artists)
						? parsed.artists.map(sanitizeArtist).filter((a: MonitoredArtist) => a.id.length > 0)
						: []
				}
			}
		}
	} catch (err: any) {
		logger.warn(`[Monitoring] Failed to read monitored.json: ${err?.message || err}`)
	}

	cachedData = cloneMonitoredData(loaded)
	return cloneMonitoredData(loaded)
}

export function computeTotalMissing(artists: MonitoredArtist[]): number {
	return artists.reduce((sum, artist) => sum + (Number(artist.missingCount) || 0), 0)
}

export function getMonitoredSummary(): MonitoredSummary {
	const data = getMonitoredData()
	return {
		config: data.config,
		artists: data.artists,
		totalMissing: computeTotalMissing(data.artists)
	}
}

function emitMonitoredUpdated(deemixInstance?: any): void {
	try {
		if (deemixInstance?.listener && typeof deemixInstance.listener.send === 'function') {
			deemixInstance.listener.send('monitoredUpdated', getMonitoredSummary())
		}
	} catch (err: any) {
		logger.warn(`[Monitoring] Failed to emit monitoredUpdated: ${err?.message || err}`)
	}
}

export function updateMonitoredConfig(partial: Partial<MonitoredConfig>, deemixInstance?: any): MonitoredConfig {
	const data = getMonitoredData()
	const merged = sanitizeConfig({
		...data.config,
		...partial
	})
	data.config = merged
	saveMonitoredData(data)
	emitMonitoredUpdated(deemixInstance)
	return { ...merged }
}

export function addOrUpdateMonitoredArtist(
	input: { id: string | number; name?: string; picture?: string; monitored?: boolean },
	deemixInstance?: any
): MonitoredArtist {
	const id = String(input.id ?? '').trim()
	if (!id) {
		throw new Error('Artist ID is required')
	}

	const data = getMonitoredData()
	const existingIndex = data.artists.findIndex(a => String(a.id) === id)
	const cleanName = typeof input.name === 'string' ? input.name.trim() : ''
	const cleanPicture = typeof input.picture === 'string' ? input.picture.trim() : ''

	if (existingIndex >= 0) {
		const existing = data.artists[existingIndex]
		const updated: MonitoredArtist = {
			...existing,
			name: cleanName || existing.name,
			picture: cleanPicture || existing.picture,
			monitored: input.monitored !== undefined ? Boolean(input.monitored) : true
		}
		data.artists[existingIndex] = updated
		saveMonitoredData(data)
		emitMonitoredUpdated(deemixInstance)
		return { ...updated, missingReleases: updated.missingReleases.map(r => ({ ...r })) }
	}

	const newArtist: MonitoredArtist = {
		id,
		name: cleanName || `Artist ${id}`,
		picture: cleanPicture,
		monitored: input.monitored !== undefined ? Boolean(input.monitored) : true,
		addedAt: new Date().toISOString(),
		lastCheckedAt: null,
		totalReleases: 0,
		ownedCount: 0,
		missingCount: 0,
		missingReleases: []
	}

	data.artists.unshift(newArtist)
	saveMonitoredData(data)
	emitMonitoredUpdated(deemixInstance)
	return { ...newArtist, missingReleases: [] }
}

export function removeMonitoredArtist(id: string | number, deemixInstance?: any): MonitoredSummary {
	const cleanId = String(id ?? '').trim()
	const data = getMonitoredData()
	const nextArtists = data.artists.filter(a => String(a.id) !== cleanId)
	if (nextArtists.length !== data.artists.length) {
		data.artists = nextArtists
		saveMonitoredData(data)
		emitMonitoredUpdated(deemixInstance)
	}
	return {
		config: data.config,
		artists: data.artists,
		totalMissing: computeTotalMissing(data.artists)
	}
}

/**
 * Normalizes an album/release title by lowercasing, removing accents/diacritics,
 * stripping parenthetical/bracketed edition tags, removing punctuation, and collapsing spaces.
 */
export function normalizeReleaseTitle(title: string): string {
	if (!title || typeof title !== 'string') return ''

	let normalized = title
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()

	if (!normalized) return ''

	// Strip parenthetical and bracketed edition/version tags
	const withoutTags = normalized
		.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
		.replace(
			/\s*[-–—:]\s*(deluxe(\s+edition)?|super\s+deluxe|remaster(ed)?(\s+\d{4})?|explicit|clean|bonus\s+track(\s+version)?|special\s+edition|expanded(\s+edition)?|anniversary(\s+edition)?|collector'?s?\s+edition)\s*$/gi,
			''
		)
		.trim()

	// Fallback if the entire title was enclosed in brackets/parens (e.g., "(Untitled)")
	normalized = withoutTags || normalized.replace(/[()[\]]/g, ' ')

	return normalized
		.replace(/['’`]/g, '')
		.replace(/[\u2000-\u206f\u3000-\u303f!"#$%&()*+,\-./:;<=>?@[\\\]^_{|}~¡¿«»]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function normalizeArtistKey(name: string): string {
	if (!name || typeof name !== 'string') return ''
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/['’`]/g, '')
		.replace(/[\u2000-\u206f\u3000-\u303f!"#$%&()*+,\-./:;<=>?@[\\\]^_{|}~¡¿«»]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * Builds a normalized lookup of owned album titles from Plex (if enabled and configured)
 * or the local library database.
 */
export async function getOwnedAlbumKeys(): Promise<OwnedAlbumLookup> {
	const byArtist = new Map<string, Set<string>>()
	const allTitles = new Set<string>()

	const addAlbumTitle = (artistName: string, albumTitle: string) => {
		const normTitle = normalizeReleaseTitle(albumTitle)
		if (!normTitle) return
		allTitles.add(normTitle)

		const artistLower = String(artistName || '').trim().toLowerCase()
		const artistNorm = normalizeArtistKey(artistName)

		for (const key of [artistLower, artistNorm]) {
			if (!key) continue
			let set = byArtist.get(key)
			if (!set) {
				set = new Set<string>()
				byArtist.set(key, set)
			}
			set.add(normTitle)
		}
	}

	const plexSettings = getPlexSettings()
	if (plexSettings.enabled && plexSettings.serverUrl && plexSettings.token) {
		const plexLib = await fetchPlexLibrary()
		const hadError = Boolean(plexLib.error)
		if (hadError) {
			logger.warn(`[Monitoring] Plex library check returned error: ${plexLib.error}`)
		}
		for (const artist of plexLib.artists || []) {
			for (const album of artist.albums || []) {
				addAlbumTitle(album.artist || artist.name, album.title)
				if (artist.name && album.artist && artist.name !== album.artist) {
					addAlbumTitle(artist.name, album.title)
				}
			}
		}
		return { byArtist, allTitles, source: 'plex', hadError }
	}

	const localLib = await getLibrary()
	for (const artist of localLib.artists || []) {
		for (const album of artist.albums || []) {
			addAlbumTitle(album.artist || artist.name, album.title)
			if (artist.name && album.artist && artist.name !== album.artist) {
				addAlbumTitle(artist.name, album.title)
			}
		}
	}

	return { byArtist, allTitles, source: 'local', hadError: false }
}

function isReleaseTypeIncluded(recordType: string, config: MonitoredConfig): boolean {
	const type = (recordType || 'album').toLowerCase()
	if (type === 'album') return Boolean(config.includeAlbums)
	if (type === 'ep') return Boolean(config.includeEPs)
	if (type === 'single' || type === 'compile' || type === 'compilation') return Boolean(config.includeSingles)
	return Boolean(config.includeAlbums)
}

function isReleaseOwned(artistName: string, releaseTitle: string, owned: OwnedAlbumLookup): boolean {
	const normTitle = normalizeReleaseTitle(releaseTitle)
	if (!normTitle) return false

	const artistLower = artistName.trim().toLowerCase()
	const artistNorm = normalizeArtistKey(artistName)

	if (artistLower && owned.byArtist.get(artistLower)?.has(normTitle)) {
		return true
	}
	if (artistNorm && owned.byArtist.get(artistNorm)?.has(normTitle)) {
		return true
	}
	return owned.allTitles.has(normTitle)
}

function isReleaseInQueue(release: MissingRelease, bitrate: number, deemixInstance: any): boolean {
	const queue = deemixInstance?.queue
	if (!queue || typeof queue !== 'object') return false

	const releaseId = String(release.id)
	const expectedUuid = `album_${releaseId}_${bitrate}`
	const altUuid = `${releaseId}_${bitrate}`

	if (Object.prototype.hasOwnProperty.call(queue, expectedUuid) || Object.prototype.hasOwnProperty.call(queue, altUuid)) {
		return true
	}

	for (const item of Object.values(queue) as any[]) {
		if (!item) continue
		if (item.id != null && String(item.id) === releaseId && (!item.type || item.type === 'album')) {
			return true
		}
		if (typeof item.link === 'string' && release.link && item.link === release.link) {
			return true
		}
		if (typeof item.uuid === 'string' && (item.uuid === expectedUuid || item.uuid === altUuid)) {
			return true
		}
	}

	return false
}

async function fetchArtistDiscography(artistId: string, dz: any): Promise<any[]> {
	const releasesById = new Map<string, any>()
	const limit = 100
	let index = 0

	for (let page = 0; page < MAX_ALBUM_PAGES; page++) {
		const resp = await dz.api.get_artist_albums(artistId, page === 0 ? { limit } : { limit, index })
		const batch: any[] = Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : []

		if (batch.length === 0) break

		for (const item of batch) {
			if (!item || item.id == null) continue
			const key = String(item.id)
			if (!releasesById.has(key)) {
				releasesById.set(key, item)
			}
		}

		if (Array.isArray(resp) || !resp?.next || batch.length < limit) {
			break
		}
		index += batch.length
	}

	return Array.from(releasesById.values())
}

/**
 * Checks a monitored artist's Deezer discography against owned albums, updates missingReleases,
 * persists atomically, optionally auto-queues missing items, and emits monitoredUpdated.
 */
export async function checkMonitoredArtist(
	artistId: string,
	dz: any,
	deemixInstance?: any,
	options: { preloadedOwned?: OwnedAlbumLookup; emitUpdate?: boolean; upsertIfMissing?: boolean } = {}
): Promise<MonitoredArtist | null> {
	const cleanId = String(artistId ?? '').trim()
	if (!cleanId) return null

	let data = getMonitoredData()
	let artistIdx = data.artists.findIndex(a => String(a.id) === cleanId)
	if (artistIdx < 0 && !options.upsertIfMissing) {
		return null
	}

	if (!dz || !dz.api) {
		throw new Error('Deezer API client is unavailable')
	}

	let artistRecord: MonitoredArtist =
		artistIdx >= 0
			? data.artists[artistIdx]
			: {
					id: cleanId,
					name: '',
					picture: '',
					monitored: true,
					addedAt: new Date().toISOString(),
					lastCheckedAt: null,
					totalReleases: 0,
					ownedCount: 0,
					missingCount: 0,
					missingReleases: []
			  }

	// Fetch artist metadata if name or picture is missing or placeholder
	if (!artistRecord.name || artistRecord.name === `Artist ${cleanId}` || artistRecord.name === 'Unknown Artist' || !artistRecord.picture) {
		try {
			const artistInfo = await dz.api.get_artist(cleanId)
			if (artistInfo && !artistInfo.error) {
				artistRecord.name = String(artistInfo.name || artistRecord.name || `Artist ${cleanId}`).trim()
				artistRecord.picture = String(
					artistInfo.picture_xl ||
						artistInfo.picture_big ||
						artistInfo.picture_medium ||
						artistInfo.picture ||
						artistRecord.picture ||
						''
				).trim()
			}
		} catch (err: any) {
			logger.warn(`[Monitoring] Failed to fetch artist profile for ${cleanId}: ${err?.message || err}`)
		}
	}

	const rawReleases = await fetchArtistDiscography(cleanId, dz)
	const filteredReleases = rawReleases.filter(
		rel => isReleaseTypeIncluded(rel.record_type, data.config) && String(rel?.title || '').trim().length > 0
	)
	const owned = options.preloadedOwned || (await getOwnedAlbumKeys())

	const missingReleases: MissingRelease[] = []
	let ownedCount = 0

	for (const rel of filteredReleases) {
		const releaseTitle = String(rel.title || '').trim()

		if (isReleaseOwned(artistRecord.name, releaseTitle, owned)) {
			ownedCount++
		} else {
			const relId = String(rel.id)
			missingReleases.push({
				id: relId,
				title: releaseTitle,
				link: String(rel.link || `https://www.deezer.com/album/${relId}`),
				cover: String(rel.cover_medium || rel.cover_big || rel.cover || rel.cover_small || rel.cover_xl || ''),
				releaseDate: String(rel.release_date || ''),
				recordType: String(rel.record_type || 'album').toLowerCase(),
				nbTracks: Number(rel.nb_tracks ?? rel.NUMBER_TRACK ?? 0) || 0
			})
		}
	}

	missingReleases.sort((a, b) => {
		const dateA = a.releaseDate || ''
		const dateB = b.releaseDate || ''
		if (dateA !== dateB) return dateB.localeCompare(dateA)
		return String(b.id).localeCompare(String(a.id))
	})

	const updatedArtist: MonitoredArtist = {
		...artistRecord,
		totalReleases: filteredReleases.length,
		ownedCount,
		missingCount: missingReleases.length,
		missingReleases,
		lastCheckedAt: new Date().toISOString(),
		lastError: null
	}

	// Re-read data right before saving to avoid overwriting concurrent edits to other artists/config
	data = getMonitoredData()
	artistIdx = data.artists.findIndex(a => String(a.id) === cleanId)
	if (artistIdx >= 0) {
		data.artists[artistIdx] = updatedArtist
	} else if (options.upsertIfMissing) {
		data.artists.unshift(updatedArtist)
	} else {
		return null
	}
	saveMonitoredData(data)

	// Auto-download missing releases if configured, authenticated, and library lookup didn't error
	if (
		data.config.autoDownload &&
		deemixInstance &&
		typeof deemixInstance.addToQueue === 'function' &&
		dz?.logged_in &&
		missingReleases.length > 0 &&
		!owned.hadError
	) {
		const bitrate = Number(data.config.bitrate) || 9
		const linksToQueue = missingReleases
			.filter(release => !isReleaseInQueue(release, bitrate, deemixInstance))
			.map(release => release.link)
			.filter(Boolean)

		if (linksToQueue.length > 0) {
			try {
				logger.info(`[Monitoring] Auto-queuing ${linksToQueue.length} missing release(s) for ${updatedArtist.name}`)
				await deemixInstance.addToQueue(dz, linksToQueue, bitrate)
			} catch (err: any) {
				logger.warn(`[Monitoring] Auto-download failed for ${updatedArtist.name}: ${err?.message || err}`)
			}
		}
	}

	if (options.emitUpdate !== false) {
		emitMonitoredUpdated(deemixInstance)
	}

	return updatedArtist
}

/**
 * Checks all active monitored artists (or only those due by checkIntervalHours).
 */
export async function checkAllMonitoredArtists(
	dz: any,
	deemixInstance?: any,
	onlyDue = false
): Promise<MonitoredSummary> {
	if (isCheckingAll) {
		return getMonitoredSummary()
	}

	isCheckingAll = true
	let checkedAny = false

	try {
		const snapshot = getMonitoredData()
		const intervalMs = Math.max(1, snapshot.config.checkIntervalHours || 24) * 60 * 60 * 1000
		const now = Date.now()

		const targetArtists = snapshot.artists.filter(artist => {
			if (artist.monitored === false) return false
			if (!onlyDue) return true
			if (!artist.lastCheckedAt) return true
			const lastMs = Date.parse(artist.lastCheckedAt)
			return Number.isNaN(lastMs) || now - lastMs >= intervalMs
		})

		if (targetArtists.length === 0) {
			return {
				config: snapshot.config,
				artists: snapshot.artists,
				totalMissing: computeTotalMissing(snapshot.artists)
			}
		}

		const ownedLookup = await getOwnedAlbumKeys()

		for (const artist of targetArtists) {
			try {
				await checkMonitoredArtist(artist.id, dz, deemixInstance, {
					preloadedOwned: ownedLookup,
					emitUpdate: false
				})
				checkedAny = true
			} catch (err: any) {
				logger.warn(`[Monitoring] Failed to check artist ${artist.name} (${artist.id}): ${err?.message || err}`)
				const current = getMonitoredData()
				const idx = current.artists.findIndex(a => String(a.id) === String(artist.id))
				if (idx >= 0) {
					current.artists[idx].lastError = err?.message || 'Check failed'
					saveMonitoredData(current)
					checkedAny = true
				}
			}
		}

		if (checkedAny) {
			emitMonitoredUpdated(deemixInstance)
		}

		return getMonitoredSummary()
	} finally {
		isCheckingAll = false
	}
}

/**
 * Starts the 15-minute background scheduler checking due monitored artists
 * whenever monitoring is enabled and a logged-in Deezer session is available.
 */
export function startMonitoringScheduler(deemixInstance: any): NodeJS.Timeout {
	stopMonitoringScheduler()

	schedulerTimer = setInterval(() => {
		const { config, artists } = getMonitoredData()
		if (!config.enabled) return
		if (!deemixInstance?.lastDZ?.logged_in) return
		if (!artists.some(a => a.monitored !== false)) return

		checkAllMonitoredArtists(deemixInstance.lastDZ, deemixInstance, true).catch((err: any) => {
			logger.warn(`[Monitoring] Scheduled check failed: ${err?.message || err}`)
		})
	}, CHECK_INTERVAL_MS)

	if (typeof schedulerTimer.unref === 'function') {
		schedulerTimer.unref()
	}

	logger.info('[Monitoring] Background artist monitoring scheduler started (15m tick)')
	return schedulerTimer
}

export function stopMonitoringScheduler(): void {
	if (schedulerTimer) {
		clearInterval(schedulerTimer)
		schedulerTimer = null
	}
}
