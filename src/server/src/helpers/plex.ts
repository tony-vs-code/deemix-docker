import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
// @ts-expect-error
import deemix from 'deemix'
import {
	PlexSettings,
	PlexSection,
	PlexTestResult,
	PlexScanResult,
	PlexPinResult,
	PlexPinStatus,
	PlexServerConnection,
	PlexServerResource,
	PlexTrack,
	PlexAlbum,
	PlexArtist,
	PlexLibraryResult,
	PlexDeleteResult
} from '../types'
import { logger } from './logger'

export const configFolder: string = deemix.utils.localpaths.getConfigFolder()
export const plexConfigFile = path.join(configFolder, 'plex.json')

const PLEX_TV_API_BASE = 'https://plex.tv/api/v2'
const PLEX_PRODUCT_NAME = 'Deemix'
const PLEX_PRODUCT_VERSION = '1.0'

const DEFAULT_PLEX_SETTINGS: PlexSettings = {
	enabled: false,
	serverUrl: '',
	token: '',
	sectionId: '',
	autoScanOnComplete: true
}

let cachedSettings: PlexSettings | null = null
let cachedPlexLibrary: PlexLibraryResult | null = null
let debounceTimer: NodeJS.Timeout | null = null

/**
 * Generates a stable UUID for X-Plex-Client-Identifier using Node's native crypto.randomUUID().
 */
function generateClientIdentifier(): string {
	const cryptoAny = crypto as any
	if (typeof cryptoAny.randomUUID === 'function') {
		return cryptoAny.randomUUID()
	}
	return uuidv4()
}

/**
 * Builds standard Plex.tv v2 API request headers.
 */
function getPlexTvHeaders(clientIdentifier: string, token?: string): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'X-Plex-Product': PLEX_PRODUCT_NAME,
		'X-Plex-Version': PLEX_PRODUCT_VERSION,
		'X-Plex-Client-Identifier': clientIdentifier
	}
	if (token) {
		headers['X-Plex-Token'] = token
	}
	return headers
}

/**
 * Executes a Plex.tv API request with a 6s AbortController timeout and JSON parsing.
 */
async function fetchPlexTvJson(
	url: string,
	method: 'GET' | 'POST',
	clientIdentifier: string,
	token?: string,
	timeoutMs = 6000
): Promise<{ ok: boolean; status: number; statusText: string; data: any }> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), timeoutMs)
	const fetchFn: typeof fetch = (globalThis as any).fetch || fetch

	try {
		const response = await fetchFn(url, {
			method,
			headers: getPlexTvHeaders(clientIdentifier, token),
			signal: controller.signal
		})

		let data: any = null
		try {
			data = await response.json()
		} catch {
			data = null
		}

		return {
			ok: response.ok,
			status: response.status,
			statusText: response.statusText,
			data
		}
	} finally {
		clearTimeout(timeout)
	}
}

/**
 * Normalizes a URL string by trimming whitespace and trailing slashes.
 */
function normalizeUrl(url?: string): string {
	if (!url || typeof url !== 'string') return ''
	let clean = url.trim().replace(/\/+$/, '')
	if (clean && !/^https?:\/\//i.test(clean)) {
		clean = `http://${clean}`
	}
	return clean
}

/**
 * Atomically writes data to a JSON file using a temp file and rename.
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

/**
 * Loads Plex settings from disk (config/plex.json) or returns defaults.
 * Auto-generates and persists a stable clientIdentifier UUID on first load.
 */
export function getPlexSettings(): PlexSettings {
	if (cachedSettings) {
		return { ...cachedSettings }
	}

	let shouldPersist = false
	try {
		if (fs.existsSync(plexConfigFile)) {
			const raw = fs.readFileSync(plexConfigFile, 'utf-8')
			const parsed = JSON.parse(raw)
			const existingClientId = typeof parsed.clientIdentifier === 'string' ? parsed.clientIdentifier.trim() : ''
			const clientIdentifier = existingClientId || generateClientIdentifier()
			if (!existingClientId) {
				shouldPersist = true
			}
			cachedSettings = {
				enabled: Boolean(parsed.enabled),
				serverUrl: normalizeUrl(parsed.serverUrl),
				token: typeof parsed.token === 'string' ? parsed.token.trim() : '',
				sectionId: parsed.sectionId != null ? String(parsed.sectionId).trim() : '',
				autoScanOnComplete:
					parsed.autoScanOnComplete !== undefined ? Boolean(parsed.autoScanOnComplete) : DEFAULT_PLEX_SETTINGS.autoScanOnComplete,
				clientIdentifier
			}
		} else {
			shouldPersist = true
			cachedSettings = {
				...DEFAULT_PLEX_SETTINGS,
				clientIdentifier: generateClientIdentifier()
			}
		}
	} catch (err: any) {
		logger.warn(`Failed to read plex.json: ${err?.message || err}`)
		cachedSettings = {
			...DEFAULT_PLEX_SETTINGS,
			clientIdentifier: generateClientIdentifier()
		}
	}

	if (shouldPersist && cachedSettings) {
		try {
			atomicWriteJson(plexConfigFile, cachedSettings)
		} catch (writeErr: any) {
			logger.warn(`Failed to persist initial Plex clientIdentifier to plex.json: ${writeErr?.message || writeErr}`)
		}
	}

	return { ...cachedSettings }
}

/**
 * Saves partial or complete Plex settings to config/plex.json atomically.
 * Preserves the existing clientIdentifier UUID or generates one if missing.
 */
export function savePlexSettings(partial: Partial<PlexSettings>): PlexSettings {
	const current = getPlexSettings()
	const clientIdentifier =
		typeof partial.clientIdentifier === 'string' && partial.clientIdentifier.trim().length > 0
			? partial.clientIdentifier.trim()
			: current.clientIdentifier || generateClientIdentifier()

	const updated: PlexSettings = {
		enabled: partial.enabled !== undefined ? Boolean(partial.enabled) : current.enabled,
		serverUrl: partial.serverUrl !== undefined ? normalizeUrl(partial.serverUrl) : current.serverUrl,
		token: partial.token !== undefined ? String(partial.token).trim() : current.token,
		sectionId: partial.sectionId !== undefined ? String(partial.sectionId).trim() : current.sectionId,
		autoScanOnComplete:
			partial.autoScanOnComplete !== undefined ? Boolean(partial.autoScanOnComplete) : current.autoScanOnComplete,
		clientIdentifier
	}

	try {
		atomicWriteJson(plexConfigFile, updated)
		cachedSettings = { ...updated }
		cachedPlexLibrary = null
		logger.info('Plex settings successfully updated and saved to plex.json')
	} catch (err: any) {
		logger.error(`Failed to save Plex settings to ${plexConfigFile}: ${err?.message || err}`)
		throw err
	}

	return { ...updated }
}

/**
 * Tests connection to a Plex Media Server and retrieves library sections.
 */
export async function testPlexConnection(serverUrl?: string, token?: string): Promise<PlexTestResult> {
	const current = getPlexSettings()
	const url = normalizeUrl(serverUrl !== undefined && serverUrl !== null && String(serverUrl).trim() !== '' ? serverUrl : current.serverUrl)
	const plexToken = token !== undefined && token !== null && String(token).trim() !== '' ? String(token).trim() : current.token

	if (!url) {
		return {
			success: false,
			sections: [],
			error: 'Plex Server URL is required'
		}
	}

	try {
		new URL(url)
	} catch {
		return {
			success: false,
			sections: [],
			error: 'Invalid Plex Server URL format (e.g. http://192.168.1.50:32400)'
		}
	}

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 6000)

	try {
		const targetUrl = `${url}/library/sections`
		const headers: Record<string, string> = {
			Accept: 'application/json'
		}
		if (plexToken) {
			headers['X-Plex-Token'] = plexToken
		}

		logger.info(`Testing Plex connection to: ${targetUrl}`)

		const fetchFn: typeof fetch = (globalThis as any).fetch || fetch
		const response = await fetchFn(targetUrl, {
			method: 'GET',
			headers,
			signal: controller.signal
		})

		clearTimeout(timeout)

		if (!response.ok) {
			const errorMsg =
				response.status === 401
					? 'Unauthorized: Invalid or missing X-Plex-Token'
					: `Plex server returned HTTP ${response.status} (${response.statusText})`
			logger.warn(`Plex connection test failed: ${errorMsg}`)
			return {
				success: false,
				sections: [],
				error: errorMsg
			}
		}

		const data: any = await response.json()
		const mediaContainer = data?.MediaContainer
		const rawDirs = mediaContainer?.Directory

		const directories: any[] = Array.isArray(rawDirs) ? rawDirs : rawDirs ? [rawDirs] : []

		const sections: PlexSection[] = directories.map((dir: any) => ({
			id: String(dir.key || dir.id || ''),
			title: String(dir.title || ''),
			type: String(dir.type || '')
		}))

		const serverName = mediaContainer?.friendlyName || mediaContainer?.title1 || undefined

		logger.info(`Plex connection test successful for "${serverName || url}". Discovered ${sections.length} library section(s).`)

		return {
			success: true,
			serverName,
			sections
		}
	} catch (err: any) {
		clearTimeout(timeout)
		const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR'
		const message = isTimeout
			? 'Connection timed out after 6 seconds. Please check the server address and port.'
			: err?.message || String(err)

		logger.warn(`Plex connection test error: ${message}`)
		return {
			success: false,
			sections: [],
			error: message
		}
	}
}

/**
 * Triggers an immediate refresh of the configured Plex library section or all music sections.
 */
export async function triggerPlexScan(overrideSettings?: Partial<PlexSettings>): Promise<PlexScanResult> {
	const current = getPlexSettings()
	const settings: PlexSettings = { ...current, ...(overrideSettings || {}) }

	// If no override settings were supplied (e.g. automated call), verify enabled
	if (!overrideSettings && !settings.enabled) {
		logger.info('Plex integration is disabled; skipping library scan.')
		return {
			success: false,
			message: 'Plex integration is disabled',
			error: 'Plex integration is disabled'
		}
	}

	const url = normalizeUrl(settings.serverUrl)
	const sectionId = settings.sectionId ? settings.sectionId.trim() : ''
	const token = settings.token ? settings.token.trim() : ''

	if (!url) {
		const msg = 'Plex server URL is not configured'
		logger.warn(`Plex scan aborted: ${msg}`)
		return { success: false, message: msg, error: msg }
	}

	cachedPlexLibrary = null

	const fetchFn: typeof fetch = (globalThis as any).fetch || fetch
	const headers: Record<string, string> = {
		Accept: 'application/json'
	}
	if (token) {
		headers['X-Plex-Token'] = token
	}

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 10000)

	try {
		// If specific section ID is provided and is not 'all', refresh that section
		if (sectionId && sectionId.toLowerCase() !== 'all') {
			const targetUrl = `${url}/library/sections/${encodeURIComponent(sectionId)}/refresh`
			logger.info(`Triggering Plex library refresh for section "${sectionId}" at ${targetUrl}`)

			const response = await fetchFn(targetUrl, {
				method: 'GET',
				headers,
				signal: controller.signal
			})

			clearTimeout(timeout)

			if (!response.ok) {
				const errorMsg =
					response.status === 401
						? 'Unauthorized: Invalid X-Plex-Token'
						: `Plex server returned HTTP ${response.status} (${response.statusText})`
				logger.error(`Plex library refresh failed: ${errorMsg}`)
				return { success: false, message: errorMsg, error: errorMsg }
			}

			const successMsg = `Plex library scan initiated successfully for section ${sectionId}`
			logger.info(successMsg)
			return { success: true, message: successMsg }
		}

		// sectionId === 'all' or empty: discover and refresh all music sections (type === 'artist')
		logger.info('Querying Plex sections to refresh all music libraries...')
		const sectionsRes = await fetchFn(`${url}/library/sections`, {
			method: 'GET',
			headers,
			signal: controller.signal
		})

		if (sectionsRes.ok) {
			const data: any = await sectionsRes.json()
			const rawDirs = data?.MediaContainer?.Directory
			const dirs: any[] = Array.isArray(rawDirs) ? rawDirs : rawDirs ? [rawDirs] : []
			const musicSections = dirs.filter((d: any) => d.type === 'artist')

			if (musicSections.length > 0) {
				const refreshedList: string[] = []
				for (const sec of musicSections) {
					const id = String(sec.key || sec.id)
					const title = sec.title || id
					try {
						const refRes = await fetchFn(`${url}/library/sections/${encodeURIComponent(id)}/refresh`, {
							method: 'GET',
							headers,
							signal: controller.signal
						})
						if (refRes.ok) {
							refreshedList.push(`"${title}" (${id})`)
							logger.info(`Triggered Plex scan for music section: "${title}" (${id})`)
						} else {
							logger.warn(`Failed Plex scan for music section "${title}" (${id}): HTTP ${refRes.status}`)
						}
					} catch (subErr: any) {
						logger.error(`Error refreshing Plex section "${title}": ${subErr?.message || subErr}`)
					}
				}

				clearTimeout(timeout)

				if (refreshedList.length > 0) {
					const msg = `Successfully triggered Plex refresh for ${refreshedList.length} music section(s): ${refreshedList.join(', ')}`
					logger.info(msg)
					return { success: true, message: msg }
				}
			}
		}

		// Fallback: Global Plex refresh
		logger.info('Triggering global Plex refresh (/library/sections/all/refresh)...')
		const allRefresh = await fetchFn(`${url}/library/sections/all/refresh`, {
			method: 'GET',
			headers,
			signal: controller.signal
		})

		clearTimeout(timeout)

		if (!allRefresh.ok) {
			const errorMsg = `Global Plex refresh failed: HTTP ${allRefresh.status} (${allRefresh.statusText})`
			logger.error(errorMsg)
			return { success: false, message: errorMsg, error: errorMsg }
		}

		const successMsg = 'Global Plex library refresh triggered successfully'
		logger.info(successMsg)
		return { success: true, message: successMsg }
	} catch (err: any) {
		clearTimeout(timeout)
		const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR'
		const message = isTimeout ? 'Plex refresh request timed out after 10 seconds' : err?.message || String(err)
		logger.error(`Plex library refresh error: ${message}`)
		return {
			success: false,
			message,
			error: message
		}
	}
}

/**
 * Schedules a debounced Plex library refresh (~3 seconds debounce window)
 * so rapid/batch download completions coalesce into a single Plex refresh.
 */
export function schedulePlexScan(): void {
	const settings = getPlexSettings()
	if (!settings.enabled || !settings.autoScanOnComplete) {
		return
	}

	if (debounceTimer) {
		clearTimeout(debounceTimer)
	}

	logger.info('Scheduling Plex library refresh in 3 seconds (debounced)...')

	debounceTimer = setTimeout(() => {
		debounceTimer = null
		triggerPlexScan().catch(err => {
			logger.error(`Scheduled Plex scan encountered an error: ${err?.message || err}`)
		})
	}, 3000)
}

/**
 * Formats an upstream Plex.tv fetch error, normalizing AbortController timeouts.
 */
function formatPlexTvError(err: any, fallback: string): string {
	const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR'
	if (isTimeout) {
		return 'Request to Plex.tv timed out after 6 seconds'
	}
	return err?.message || fallback
}

/**
 * Creates a strong Plex.tv OAuth PIN and returns the PIN metadata + auth URL.
 */
export async function createPlexPin(): Promise<PlexPinResult> {
	const settings = getPlexSettings()
	const clientIdentifier = settings.clientIdentifier || generateClientIdentifier()

	try {
		const { ok, status, statusText, data } = await fetchPlexTvJson(
			`${PLEX_TV_API_BASE}/pins?strong=true`,
			'POST',
			clientIdentifier
		)

		if (!ok || !data?.id || !data?.code) {
			const apiMsg = data?.errors?.[0]?.message || `HTTP ${status} (${statusText})`
			throw new Error(`Failed to create Plex PIN: ${apiMsg}`)
		}

		const id = Number(data.id)
		const code = String(data.code)
		const authUrl = `https://app.plex.tv/auth#?clientID=${encodeURIComponent(clientIdentifier)}&code=${encodeURIComponent(
			code
		)}&context%5Bdevice%5D%5Bproduct%5D=Deemix`

		logger.info(`Created Plex.tv OAuth PIN (${id})`)
		return {
			id,
			code,
			clientIdentifier,
			authUrl
		}
	} catch (err: any) {
		const message = formatPlexTvError(err, 'Failed to create Plex.tv OAuth PIN')
		logger.warn(`Plex OAuth PIN creation failed: ${message}`)
		throw new Error(message)
	}
}

/**
 * Polls Plex.tv for PIN authorization status and persists authToken when granted.
 */
export async function checkPlexPin(pinId: string | number): Promise<PlexPinStatus> {
	const id = String(pinId ?? '').trim()
	if (!id) {
		return { authenticated: false, error: 'PIN ID is required' }
	}

	const settings = getPlexSettings()
	const clientIdentifier = settings.clientIdentifier || generateClientIdentifier()

	try {
		const { ok, status, statusText, data } = await fetchPlexTvJson(
			`${PLEX_TV_API_BASE}/pins/${encodeURIComponent(id)}`,
			'GET',
			clientIdentifier
		)

		if (status === 404) {
			return {
				authenticated: false,
				expired: true,
				error: 'Plex authorization PIN expired or was not found'
			}
		}

		if (!ok) {
			const apiMsg = data?.errors?.[0]?.message || `HTTP ${status} (${statusText})`
			throw new Error(`Plex.tv PIN status check failed: ${apiMsg}`)
		}

		const authToken = typeof data?.authToken === 'string' ? data.authToken.trim() : ''
		if (authToken) {
			savePlexSettings({ token: authToken })
			logger.info(`Plex.tv OAuth PIN (${id}) authenticated successfully`)
			return {
				authenticated: true,
				token: authToken
			}
		}

		return { authenticated: false }
	} catch (err: any) {
		const message = formatPlexTvError(err, 'Failed to check Plex.tv PIN status')
		logger.warn(`Plex OAuth PIN check failed: ${message}`)
		throw new Error(message)
	}
}

/**
 * Checks whether a Plex resource `provides` field includes 'server'.
 */
function providesServer(provides: unknown): boolean {
	if (typeof provides === 'string') {
		return provides
			.split(',')
			.map(part => part.trim().toLowerCase())
			.includes('server')
	}
	if (Array.isArray(provides)) {
		return provides.some(part => String(part).trim().toLowerCase() === 'server')
	}
	return false
}

/**
 * Fetches discovered Plex Media Servers and their connection URIs from plex.tv.
 */
export async function fetchPlexServers(token?: string): Promise<PlexServerResource[]> {
	const settings = getPlexSettings()
	const plexToken = token !== undefined && token !== null && String(token).trim() !== '' ? String(token).trim() : settings.token

	if (!plexToken) {
		throw new Error('Plex token is required to discover servers')
	}

	const clientIdentifier = settings.clientIdentifier || generateClientIdentifier()

	try {
		const { ok, status, statusText, data } = await fetchPlexTvJson(
			`${PLEX_TV_API_BASE}/resources?includeHttps=1&includeRelay=1`,
			'GET',
			clientIdentifier,
			plexToken
		)

		if (!ok) {
			if (status === 401) {
				throw new Error('Unauthorized: Invalid or expired Plex token')
			}
			const apiMsg = data?.errors?.[0]?.message || `HTTP ${status} (${statusText})`
			throw new Error(`Failed to fetch Plex servers: ${apiMsg}`)
		}

		const resources: any[] = Array.isArray(data) ? data : []
		const servers: PlexServerResource[] = resources
			.filter(res => res && providesServer(res.provides))
			.map(res => {
				const rawConnections: any[] = Array.isArray(res.connections) ? res.connections : []
				const connections: PlexServerConnection[] = rawConnections
					.filter(conn => conn && typeof conn.uri === 'string' && conn.uri.trim().length > 0)
					.map(conn => {
						const uri = normalizeUrl(conn.uri)
						return {
							uri,
							local: Boolean(conn.local),
							relay: Boolean(conn.relay),
							protocol: String(conn.protocol || (uri.toLowerCase().startsWith('https') ? 'https' : 'http'))
						}
					})

				return {
					name: String(res.name || 'Plex Media Server'),
					clientIdentifier: String(res.clientIdentifier || ''),
					owned: Boolean(res.owned),
					connections
				}
			})

		logger.info(`Discovered ${servers.length} Plex Media Server(s) via plex.tv`)
		return servers
	} catch (err: any) {
		const message = formatPlexTvError(err, 'Failed to fetch Plex servers from plex.tv')
		logger.warn(`Plex server discovery failed: ${message}`)
		throw new Error(message)
	}
}

/**
 * Formats byte counts into human-readable file size strings.
 */
function formatBytes(bytes: number, decimals = 2): string {
	if (!bytes || bytes <= 0) return '0 B'
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Clears the in-memory Plex library cache.
 */
export function clearPlexLibraryCache(): void {
	cachedPlexLibrary = null
}

/**
 * Executes a JSON GET request against the configured Plex Media Server with timeout handling.
 */
async function fetchPlexServerJson(url: string, token: string, timeoutMs = 15000): Promise<any> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), timeoutMs)
	const fetchFn: typeof fetch = (globalThis as any).fetch || fetch

	try {
		const response = await fetchFn(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'X-Plex-Token': token
			},
			signal: controller.signal
		})

		if (!response.ok) {
			const errorMsg =
				response.status === 401
					? 'Unauthorized: Invalid or missing X-Plex-Token'
					: `Plex server returned HTTP ${response.status} (${response.statusText})`
			throw new Error(errorMsg)
		}

		return await response.json()
	} catch (err: any) {
		const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR'
		if (isTimeout) {
			throw new Error(`Plex library request timed out after ${Math.round(timeoutMs / 1000)} seconds`)
		}
		throw err
	} finally {
		clearTimeout(timeout)
	}
}

/**
 * Fetches and normalizes all music tracks from Plex into artists -> albums -> tracks.
 * Caches results in memory until invalidated by settings save, scan, delete, or forceRefresh.
 */
export async function fetchPlexLibrary(forceRefresh = false): Promise<PlexLibraryResult> {
	const settings = getPlexSettings()
	const url = normalizeUrl(settings.serverUrl)
	const token = settings.token ? settings.token.trim() : ''

	if (!settings.enabled || !url || !token) {
		cachedPlexLibrary = null
		return {
			source: 'plex',
			enabled: false,
			configured: Boolean(url && token),
			artists: [],
			totalArtists: 0,
			totalAlbums: 0,
			totalTracks: 0,
			totalSize: 0,
			formattedTotalSize: '0 B',
			lastScanned: null
		}
	}

	if (!forceRefresh && cachedPlexLibrary) {
		return cachedPlexLibrary
	}

	try {
		new URL(url)
	} catch {
		return {
			source: 'plex',
			enabled: true,
			configured: true,
			serverUrl: url,
			artists: [],
			totalArtists: 0,
			totalAlbums: 0,
			totalTracks: 0,
			totalSize: 0,
			formattedTotalSize: '0 B',
			lastScanned: null,
			error: 'Invalid Plex Server URL format'
		}
	}

	try {
		const configuredSection = settings.sectionId ? settings.sectionId.trim() : ''
		let targetSectionIds: string[] = []

		if (configuredSection && configuredSection.toLowerCase() !== 'all') {
			targetSectionIds = [configuredSection]
		} else {
			const sectionsData = await fetchPlexServerJson(`${url}/library/sections`, token, 15000)
			const rawDirs = sectionsData?.MediaContainer?.Directory
			const dirs: any[] = Array.isArray(rawDirs) ? rawDirs : rawDirs ? [rawDirs] : []
			targetSectionIds = dirs
				.filter((d: any) => String(d?.type || '').toLowerCase() === 'artist')
				.map((d: any) => String(d.key || d.id || '').trim())
				.filter(Boolean)
		}

		if (targetSectionIds.length === 0) {
			const emptyResult: PlexLibraryResult = {
				source: 'plex',
				enabled: true,
				configured: true,
				serverUrl: url,
				artists: [],
				totalArtists: 0,
				totalAlbums: 0,
				totalTracks: 0,
				totalSize: 0,
				formattedTotalSize: '0 B',
				lastScanned: new Date().toISOString()
			}
			cachedPlexLibrary = emptyResult
			return emptyResult
		}

		const rawTracks: any[] = []
		for (const secId of targetSectionIds) {
			const tracksData = await fetchPlexServerJson(
				`${url}/library/sections/${encodeURIComponent(secId)}/all?type=10`,
				token,
				15000
			)
			const rawMetadata = tracksData?.MediaContainer?.Metadata
			const items: any[] = Array.isArray(rawMetadata) ? rawMetadata : rawMetadata ? [rawMetadata] : []
			for (const item of items) {
				rawTracks.push(item)
			}
		}

		const artistsMap = new Map<
			string,
			{
				name: string
				ratingKey: string
				albumsMap: Map<
					string,
					{
						id: string
						ratingKey: string
						title: string
						artist: string
						cover: string
						plexThumb: string
						year?: number
						tracks: PlexTrack[]
					}
				>
			}
		>()

		const seenTrackKeys = new Set<string>()
		let totalTracks = 0
		let totalSize = 0

		for (const item of rawTracks) {
			if (!item) continue
			const ratingKey = item.ratingKey != null ? String(item.ratingKey).trim() : ''
			if (ratingKey && seenTrackKeys.has(ratingKey)) continue
			if (ratingKey) seenTrackKeys.add(ratingKey)

			const parentRatingKey = item.parentRatingKey != null ? String(item.parentRatingKey).trim() : ''
			const grandparentRatingKey = item.grandparentRatingKey != null ? String(item.grandparentRatingKey).trim() : ''

			const albumArtist = String(item.grandparentTitle || item.originalTitle || 'Unknown Artist').trim() || 'Unknown Artist'
			const trackArtist = String(item.originalTitle || item.grandparentTitle || 'Unknown Artist').trim() || 'Unknown Artist'
			const albumTitle = String(item.parentTitle || 'Unknown Album').trim() || 'Unknown Album'
			const title = String(item.title || 'Unknown Track').trim() || 'Unknown Track'
			const trackNumber = Number(item.index) || 0
			const discNumber = Number(item.parentIndex) || 1
			const rawYear = item.parentYear ?? item.year
			const year = rawYear !== undefined && rawYear !== null && !isNaN(Number(rawYear)) ? Number(rawYear) : undefined

			const rawMedia = Array.isArray(item.Media) ? item.Media[0] : item.Media
			const rawPart = rawMedia ? (Array.isArray(rawMedia.Part) ? rawMedia.Part[0] : rawMedia.Part) : undefined
			const partKey = rawPart?.key ? String(rawPart.key).trim() : ''
			const size = Number(rawPart?.size) || 0
			const durationMs = Number(item.duration ?? rawMedia?.duration ?? rawPart?.duration ?? 0)
			const duration = durationMs > 0 ? Math.round(durationMs / 1000) : 0
			const rawCodec = rawMedia?.audioCodec || rawMedia?.container || rawPart?.container || 'MP3'
			const format = String(rawCodec).trim().toUpperCase() || 'MP3'
			const bitrate =
				rawMedia?.bitrate !== undefined && rawMedia?.bitrate !== null && !isNaN(Number(rawMedia.bitrate))
					? Number(rawMedia.bitrate)
					: undefined

			const thumb = item.thumb ? String(item.thumb).trim() : item.parentThumb ? String(item.parentThumb).trim() : ''
			const albumCover = item.parentThumb ? String(item.parentThumb).trim() : thumb

			const track: PlexTrack = {
				id: ratingKey || partKey || `${albumArtist}-${albumTitle}-${title}-${trackNumber}`,
				ratingKey,
				title,
				artist: trackArtist,
				album: albumTitle,
				albumTitle,
				albumArtist,
				albumRatingKey: parentRatingKey,
				trackNumber,
				discNumber,
				duration,
				size,
				formattedSize: formatBytes(size),
				format,
				...(bitrate !== undefined ? { bitrate } : {}),
				path: partKey,
				partKey,
				thumb,
				plexThumb: thumb,
				source: 'plex'
			}

			const artistKey = grandparentRatingKey || albumArtist.toLowerCase()
			const albumKey = parentRatingKey || albumTitle.toLowerCase()

			let artistGroup = artistsMap.get(artistKey)
			if (!artistGroup) {
				artistGroup = {
					name: albumArtist,
					ratingKey: grandparentRatingKey,
					albumsMap: new Map()
				}
				artistsMap.set(artistKey, artistGroup)
			}

			let albumGroup = artistGroup.albumsMap.get(albumKey)
			if (!albumGroup) {
				albumGroup = {
					id: parentRatingKey || `${artistKey}-${albumKey}`,
					ratingKey: parentRatingKey,
					title: albumTitle,
					artist: albumArtist,
					cover: albumCover,
					plexThumb: albumCover,
					...(year !== undefined ? { year } : {}),
					tracks: []
				}
				artistGroup.albumsMap.set(albumKey, albumGroup)
			} else {
				if (!albumGroup.cover && albumCover) {
					albumGroup.cover = albumCover
					albumGroup.plexThumb = albumCover
				}
				if (albumGroup.year === undefined && year !== undefined) {
					albumGroup.year = year
				}
			}

			albumGroup.tracks.push(track)
			totalTracks++
			totalSize += size
		}

		let totalAlbums = 0
		const artists: PlexArtist[] = []

		for (const artistGroup of artistsMap.values()) {
			const albums: PlexAlbum[] = []

			for (const albumGroup of artistGroup.albumsMap.values()) {
				albumGroup.tracks.sort(
					(a, b) =>
						(a.discNumber || 1) - (b.discNumber || 1) ||
						(a.trackNumber || 0) - (b.trackNumber || 0) ||
						a.title.localeCompare(b.title)
				)
				const albumSize = albumGroup.tracks.reduce((sum, t) => sum + (t.size || 0), 0)
				albums.push({
					id: albumGroup.id,
					ratingKey: albumGroup.ratingKey,
					title: albumGroup.title,
					artist: albumGroup.artist,
					cover: albumGroup.cover,
					plexThumb: albumGroup.plexThumb,
					...(albumGroup.year !== undefined ? { year: albumGroup.year } : {}),
					tracks: albumGroup.tracks,
					totalSize: albumSize,
					formattedTotalSize: formatBytes(albumSize),
					trackCount: albumGroup.tracks.length,
					tracksCount: albumGroup.tracks.length,
					source: 'plex'
				})
				totalAlbums++
			}

			albums.sort((a, b) => a.title.localeCompare(b.title))
			const artistTrackCount = albums.reduce((sum, a) => sum + a.trackCount, 0)
			const artistSize = albums.reduce((sum, a) => sum + a.totalSize, 0)

			artists.push({
				name: artistGroup.name,
				ratingKey: artistGroup.ratingKey,
				albums,
				albumCount: albums.length,
				albumsCount: albums.length,
				trackCount: artistTrackCount,
				totalTracks: artistTrackCount,
				totalSize: artistSize,
				source: 'plex'
			})
		}

		artists.sort((a, b) => a.name.localeCompare(b.name))

		const result: PlexLibraryResult = {
			source: 'plex',
			enabled: true,
			configured: true,
			serverUrl: url,
			artists,
			totalArtists: artists.length,
			totalAlbums,
			totalTracks,
			totalSize,
			formattedTotalSize: formatBytes(totalSize),
			lastScanned: new Date().toISOString()
		}

		cachedPlexLibrary = result
		logger.info(`Loaded Plex library: ${artists.length} artist(s), ${totalAlbums} album(s), ${totalTracks} track(s)`)
		return result
	} catch (err: any) {
		const message = err?.message || 'Failed to fetch Plex library'
		logger.warn(`Failed to fetch Plex library: ${message}`)
		return {
			source: 'plex',
			enabled: true,
			configured: true,
			serverUrl: url,
			artists: [],
			totalArtists: 0,
			totalAlbums: 0,
			totalTracks: 0,
			totalSize: 0,
			formattedTotalSize: '0 B',
			lastScanned: null,
			error: message
		}
	}
}

/**
 * Deletes an album or track metadata item from Plex Media Server by ratingKey
 * and invalidates the cached Plex library.
 */
export async function deletePlexItem(ratingKey: string): Promise<PlexDeleteResult> {
	const cleanKey = String(ratingKey ?? '').trim()
	if (!cleanKey) {
		return { success: false, error: 'Missing ratingKey parameter' }
	}

	const settings = getPlexSettings()
	const url = normalizeUrl(settings.serverUrl)
	const token = settings.token ? settings.token.trim() : ''

	if (!settings.enabled || !url || !token) {
		return { success: false, error: 'Plex integration is not enabled or configured' }
	}

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 10000)
	const fetchFn: typeof fetch = (globalThis as any).fetch || fetch

	try {
		const targetUrl = `${url}/library/metadata/${encodeURIComponent(cleanKey)}`
		logger.info(`Deleting Plex library item ${cleanKey} via ${targetUrl}`)
		const response = await fetchFn(targetUrl, {
			method: 'DELETE',
			headers: {
				Accept: 'application/json',
				'X-Plex-Token': token
			},
			signal: controller.signal
		})

		clearTimeout(timeout)

		if (!response.ok) {
			let errorMsg = `Plex server returned HTTP ${response.status} (${response.statusText})`
			if (response.status === 401) {
				errorMsg = 'Unauthorized: Invalid X-Plex-Token'
			} else if (response.status === 403 || response.status === 405) {
				errorMsg = 'Plex rejected deletion. Ensure "Allow media deletion" is enabled in Plex Server settings.'
			} else if (response.status === 404) {
				errorMsg = 'Media item was not found on Plex server'
			}
			logger.warn(`Plex delete failed for ratingKey ${cleanKey}: ${errorMsg}`)
			return { success: false, error: errorMsg }
		}

		cachedPlexLibrary = null
		logger.info(`Deleted Plex library item ${cleanKey}`)
		return { success: true }
	} catch (err: any) {
		clearTimeout(timeout)
		const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR'
		const message = isTimeout ? 'Plex delete request timed out after 10 seconds' : err?.message || String(err)
		logger.error(`Plex delete error for ratingKey ${cleanKey}: ${message}`)
		return { success: false, error: message }
	}
}

/**
 * Validates a relative Plex media/thumb path against SSRF, protocol injection, and path traversal.
 */
export function validatePlexPath(
	rawPath: unknown,
	requiredPrefix = '/'
): { valid: true; path: string; targetUrl: string; token: string } | { valid: false; status: number; error: string } {
	if (typeof rawPath !== 'string' || rawPath.trim().length === 0) {
		return { valid: false, status: 400, error: 'Missing path parameter' }
	}

	const cleanPath = rawPath.trim()
	let decodedPath = cleanPath
	try {
		decodedPath = decodeURIComponent(cleanPath)
	} catch {
		return { valid: false, status: 400, error: 'Invalid path encoding' }
	}

	if (cleanPath.includes('\0') || decodedPath.includes('\0') || cleanPath.includes('\\') || decodedPath.includes('\\')) {
		return { valid: false, status: 400, error: 'Invalid path parameter' }
	}

	if (
		cleanPath.startsWith('//') ||
		decodedPath.startsWith('//') ||
		/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleanPath) ||
		/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decodedPath)
	) {
		return { valid: false, status: 403, error: 'Forbidden: Protocol prefixes or full URLs are not allowed' }
	}

	if (cleanPath.includes('..') || decodedPath.includes('..')) {
		return { valid: false, status: 403, error: 'Forbidden: Path traversal detected' }
	}

	if (!cleanPath.startsWith(requiredPrefix)) {
		return { valid: false, status: 400, error: `Invalid path: must start with ${requiredPrefix}` }
	}

	const settings = getPlexSettings()
	const serverUrl = normalizeUrl(settings.serverUrl)
	const token = settings.token ? settings.token.trim() : ''

	if (!settings.enabled || !serverUrl || !token) {
		return { valid: false, status: 503, error: 'Plex integration is not enabled or configured' }
	}

	try {
		const baseUrl = new URL(serverUrl)
		const resolved = new URL(cleanPath, baseUrl)
		if (resolved.origin !== baseUrl.origin) {
			return { valid: false, status: 403, error: 'Forbidden: Target origin mismatch' }
		}
		return {
			valid: true,
			path: cleanPath,
			targetUrl: `${serverUrl}${cleanPath}`,
			token
		}
	} catch {
		return { valid: false, status: 503, error: 'Invalid Plex server URL configuration' }
	}
}

/**
 * Proxies a Plex media or artwork response to an Express response using Node Readable.fromWeb,
 * forwarding Range/status headers and aborting cleanly on client disconnect.
 */
export async function pipePlexResponse(
	targetUrl: string,
	token: string,
	req: Request<any, any, any, any>,
	res: Response<any>,
	options: {
		timeoutMs?: number
		forwardRange?: boolean
		cacheControl?: string
		fallbackContentType?: string
	} = {}
): Promise<void> {
	const timeoutMs = options.timeoutMs ?? 15000
	const controller = new AbortController()
	let connectTimer: NodeJS.Timeout | null = setTimeout(() => controller.abort(), timeoutMs)
	let clientClosed = false
	let nodeStream: Readable | null = null

	const onResClose = () => {
		if (!res.writableFinished) {
			clientClosed = true
			if (nodeStream && !nodeStream.destroyed) {
				nodeStream.destroy()
			}
			controller.abort()
		}
	}

	res.once('close', onResClose)

	const upstreamHeaders: Record<string, string> = {
		'X-Plex-Token': token
	}
	if (options.forwardRange && typeof req.headers.range === 'string' && req.headers.range.trim()) {
		upstreamHeaders.Range = req.headers.range
	}

	const fetchFn: typeof fetch = (globalThis as any).fetch || fetch

	try {
		const response = await fetchFn(targetUrl, {
			method: 'GET',
			headers: upstreamHeaders,
			signal: controller.signal
		})

		if (connectTimer) {
			clearTimeout(connectTimer)
			connectTimer = null
		}

		if (clientClosed) {
			try {
				await response.body?.cancel?.()
			} catch {}
			return
		}

		if (!response.ok) {
			res.removeListener('close', onResClose)
			if (response.status === 416 && options.forwardRange) {
				const contentRange = response.headers.get('content-range')
				if (contentRange) res.setHeader('Content-Range', contentRange)
				res.status(416).send({ error: 'Requested range not satisfiable' })
				return
			}
			res.status(response.status).send({ error: `Plex server returned HTTP ${response.status}` })
			return
		}

		const upstreamType = response.headers.get('content-type')
		const contentType =
			upstreamType && (upstreamType !== 'application/octet-stream' || !options.fallbackContentType)
				? upstreamType
				: options.fallbackContentType || 'application/octet-stream'
		res.setHeader('Content-Type', contentType)

		const contentLength = response.headers.get('content-length')
		if (contentLength) {
			res.setHeader('Content-Length', contentLength)
		}

		if (options.cacheControl) {
			res.setHeader('Cache-Control', options.cacheControl)
		}

		if (options.forwardRange) {
			res.setHeader('Accept-Ranges', response.headers.get('accept-ranges') || 'bytes')
			const contentRange = response.headers.get('content-range')
			if (contentRange) {
				res.setHeader('Content-Range', contentRange)
			}
		}

		res.status(response.status)

		if (response.body && typeof (Readable as any).fromWeb === 'function') {
			nodeStream = (Readable as any).fromWeb(response.body) as Readable
			nodeStream.on('error', (streamErr: any) => {
				res.removeListener('close', onResClose)
				const isAbort =
					clientClosed ||
					streamErr?.name === 'AbortError' ||
					streamErr?.code === 'ABORT_ERR' ||
					streamErr?.code === 'ERR_STREAM_PREMATURE_CLOSE'
				if (!isAbort) {
					logger.warn(`Plex proxy stream error: ${streamErr?.message || streamErr}`)
				}
				if (!res.headersSent) {
					res.status(502).send({ error: 'Error streaming media from Plex' })
				} else if (!res.writableEnded) {
					res.end()
				}
			})
			res.once('finish', () => {
				res.removeListener('close', onResClose)
			})
			nodeStream.pipe(res)
		} else {
			const buf = Buffer.from(await response.arrayBuffer())
			res.removeListener('close', onResClose)
			res.send(buf)
		}
	} catch (err: any) {
		if (connectTimer) {
			clearTimeout(connectTimer)
			connectTimer = null
		}
		res.removeListener('close', onResClose)
		if (clientClosed) {
			return
		}
		const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR'
		const message = isTimeout ? 'Plex upstream request timed out' : err?.message || String(err)
		logger.warn(`Plex proxy request failed: ${message}`)
		if (!res.headersSent) {
			res.status(isTimeout ? 504 : 502).send({ error: message })
		} else if (!res.writableEnded) {
			res.end()
		}
	}
}
