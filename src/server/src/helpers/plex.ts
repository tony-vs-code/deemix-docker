import fs from 'fs'
import path from 'path'
// @ts-expect-error
import deemix from 'deemix'
import { PlexSettings, PlexSection, PlexTestResult, PlexScanResult } from '../types'
import { logger } from './logger'

export const configFolder: string = deemix.utils.localpaths.getConfigFolder()
export const plexConfigFile = path.join(configFolder, 'plex.json')

const DEFAULT_PLEX_SETTINGS: PlexSettings = {
	enabled: false,
	serverUrl: '',
	token: '',
	sectionId: '',
	autoScanOnComplete: true
}

let cachedSettings: PlexSettings | null = null
let debounceTimer: NodeJS.Timeout | null = null

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
 */
export function getPlexSettings(): PlexSettings {
	if (cachedSettings) {
		return { ...cachedSettings }
	}

	try {
		if (fs.existsSync(plexConfigFile)) {
			const raw = fs.readFileSync(plexConfigFile, 'utf-8')
			const parsed = JSON.parse(raw)
			cachedSettings = {
				enabled: Boolean(parsed.enabled),
				serverUrl: normalizeUrl(parsed.serverUrl),
				token: typeof parsed.token === 'string' ? parsed.token.trim() : '',
				sectionId: parsed.sectionId != null ? String(parsed.sectionId).trim() : '',
				autoScanOnComplete:
					parsed.autoScanOnComplete !== undefined ? Boolean(parsed.autoScanOnComplete) : DEFAULT_PLEX_SETTINGS.autoScanOnComplete
			}
		} else {
			cachedSettings = { ...DEFAULT_PLEX_SETTINGS }
		}
	} catch (err: any) {
		logger.warn(`Failed to read plex.json: ${err?.message || err}`)
		cachedSettings = { ...DEFAULT_PLEX_SETTINGS }
	}

	return { ...cachedSettings }
}

/**
 * Saves partial or complete Plex settings to config/plex.json atomically.
 */
export function savePlexSettings(partial: Partial<PlexSettings>): PlexSettings {
	const current = getPlexSettings()

	const updated: PlexSettings = {
		enabled: partial.enabled !== undefined ? Boolean(partial.enabled) : current.enabled,
		serverUrl: partial.serverUrl !== undefined ? normalizeUrl(partial.serverUrl) : current.serverUrl,
		token: partial.token !== undefined ? String(partial.token).trim() : current.token,
		sectionId: partial.sectionId !== undefined ? String(partial.sectionId).trim() : current.sectionId,
		autoScanOnComplete:
			partial.autoScanOnComplete !== undefined ? Boolean(partial.autoScanOnComplete) : current.autoScanOnComplete
	}

	try {
		atomicWriteJson(plexConfigFile, updated)
		cachedSettings = { ...updated }
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
