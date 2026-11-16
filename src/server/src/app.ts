import fs from 'fs'
import { sep } from 'path'
import { v4 as uuidv4 } from 'uuid'
// @ts-expect-error
import deemix from 'deemix'
import got from 'got'
import { Settings, Listener } from './types'
import { NotLoggedIn, CantStream } from './helpers/errors'

import { GUI_PACKAGE } from './helpers/paths'
import { logger } from './helpers/logger'
import { scanLibrary } from './helpers/libraryDb'

// Types
const Downloader = deemix.downloader.Downloader
const { Single, Collection, Convertable } = deemix.types.downloadObjects

// Functions
export const getAccessToken = deemix.utils.deezer.getAccessToken
export const getArlFromAccessToken = deemix.utils.deezer.getArlFromAccessToken

// Constants
export const configFolder: string = deemix.utils.localpaths.getConfigFolder()
export const defaultSettings: Settings = deemix.settings.DEFAULTS
export const deemixVersion = require('../node_modules/deemix/package.json').version
const currentVersionTemp = JSON.parse(String(fs.readFileSync(GUI_PACKAGE))).version
export const currentVersion = currentVersionTemp === '0.0.0' ? 'continuous' : currentVersionTemp

export function testPathWritable(p: string): boolean {
	try {
		if (!fs.existsSync(p)) {
			fs.mkdirSync(p, { recursive: true })
		}
		const testFile = `${p}${sep}.write-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
		fs.writeFileSync(testFile, 'ok')
		fs.unlinkSync(testFile)
		return true
	} catch {
		return false
	}
}

export const sessionDZ: any = {}

export class DeemixApp {
	queueOrder: string[]
	queue: Record<string, any>
	activeJobs: Map<string, any>
	queuePaused: boolean
	lastDZ: any

	deezerAvailable: string | null
	latestVersion: string | null

	plugins: any
	settings: any

	listener: Listener

	constructor(listener: Listener) {
		this.settings = deemix.settings.load(configFolder)

		this.queueOrder = []
		this.queue = {}
		this.activeJobs = new Map()
		this.queuePaused = false
		this.lastDZ = null

		this.plugins = {
			// eslint-disable-next-line new-cap
			spotify: new deemix.plugins.spotify()
		}
		this.deezerAvailable = null
		this.latestVersion = null
		this.listener = listener

		this.plugins.spotify.setup()
		this.restoreQueueFromDisk()
		this.checkPermissions()
	}

	get currentJob(): any {
		for (const job of this.activeJobs.values()) {
			return job?.downloader || job || null
		}
		return null
	}

	set currentJob(_: any) {}

	checkPermissions() {
		const dlPath = this.settings.downloadLocation || '/downloads'
		const dlWritable = testPathWritable(dlPath)
		const cfgWritable = testPathWritable(configFolder)
		const uid = typeof process.getuid === 'function' ? process.getuid() : -1
		const gid = typeof process.getgid === 'function' ? process.getgid() : -1

		logger.info(`[Permissions] Process running with UID: ${uid}, GID: ${gid}`)
		logger.info(
			`[Permissions] Config directory (${configFolder}): ${
				cfgWritable ? 'WRITABLE' : 'READ-ONLY (WARNING: cannot save settings/database)'
			}`
		)

		if (!dlWritable) {
			logger.warn(
				`[Permissions] WARNING: Download directory (${dlPath}) is NOT writable by UID ${uid}! Download tasks will fail. Ensure host directory permissions are chmod 777 or set PUID/PGID matching host user.`
			)
		} else {
			logger.info(`[Permissions] Download directory (${dlPath}): WRITABLE`)
		}

		return {
			configWritable: cfgWritable,
			downloadsWritable: dlWritable,
			uid,
			gid,
			downloadLocation: dlPath,
			configFolder
		}
	}

	async isDeezerAvailable(): Promise<string> {
		if (this.deezerAvailable === null) {
			let response
			try {
				response = await got.get('https://www.deezer.com/', {
					headers: { Cookie: 'dz_lang=en; Domain=deezer.com; Path=/; Secure; hostOnly=false;' },
					https: {
						rejectUnauthorized: false
					},
					retry: 5
				})
			} catch (e) {
				logger.error(e)
				this.deezerAvailable = 'no-network'
				return this.deezerAvailable
			}
			const title = (response.body.match(/<title[^>]*>([^<]+)<\/title>/)![1] || '').trim()
			this.deezerAvailable = title !== 'Deezer will soon be available in your country.' ? 'yes' : 'no'
		}
		return this.deezerAvailable
	}

	async getLatestVersion(force = false): Promise<string | null> {
		if ((this.latestVersion === null || force) && !this.settings.disableUpdateCheck) {
			let response
			try {
				response = await got.get('http://127.0.0.1/disabled', {
					https: {
						rejectUnauthorized: false
					}
				})
			} catch (e) {
				logger.error(e)
				this.latestVersion = 'NotFound'
				return this.latestVersion
			}
			this.latestVersion = response.body.trim()
		}
		return this.latestVersion
	}

	parseVersion(version: string | null): any {
		if (version === null || version === 'continuous' || version === 'NotFound') return null
		try {
			const matchResult = version.match(/(\d+)\.(\d+)\.(\d+)-r(\d+)\.(.+)/) || []
			return {
				year: parseInt(matchResult[1]),
				month: parseInt(matchResult[2]),
				day: parseInt(matchResult[3]),
				revision: parseInt(matchResult[4]),
				commit: matchResult[5] || ''
			}
		} catch (e) {
			logger.error(e)
			return null
		}
	}

	isUpdateAvailable(): boolean {
		const currentVersionObj: any = this.parseVersion(currentVersion)
		const latestVersionObj: any = this.parseVersion(this.latestVersion)
		if (currentVersionObj === null || latestVersionObj === null) return false
		if (latestVersionObj.year > currentVersionObj.year) return true
		let sameDate = latestVersionObj.year === currentVersionObj.year
		if (sameDate && latestVersionObj.month > currentVersionObj.month) return true
		sameDate = sameDate && latestVersionObj.month === currentVersionObj.month
		if (sameDate && latestVersionObj.day > currentVersionObj.day) return true
		sameDate = sameDate && latestVersionObj.day === currentVersionObj.day
		if (sameDate && latestVersionObj.revision > currentVersionObj.revision) return true
		if (
			latestVersionObj.revision === currentVersionObj.revision &&
			latestVersionObj.commit !== currentVersionObj.commit
		)
			return true
		return false
	}

	getSettings(): any {
		return { settings: this.settings, defaultSettings, spotifySettings: this.plugins.spotify.getSettings() }
	}

	saveSettings(newSettings: any, newSpotifySettings: any) {
		const oldConcurrency = Math.max(1, Number(this.settings?.queueConcurrency) || 1)
		newSettings.executeCommand = this.settings.executeCommand
		deemix.settings.save(newSettings, configFolder)
		this.settings = newSettings
		this.plugins.spotify.saveSettings(newSpotifySettings)

		const newConcurrency = Math.max(1, Number(this.settings?.queueConcurrency) || 1)
		if (newConcurrency > oldConcurrency && !this.queuePaused && this.lastDZ) {
			this.startQueue(this.lastDZ)
		}
	}

	getQueue() {
		const currentItems: any[] = []
		for (const job of this.activeJobs.values()) {
			const dlObj = job?.downloadObject || job?.downloader?.downloadObject
			if (dlObj && typeof dlObj.getSlimmedDict === 'function') {
				currentItems.push(dlObj.getSlimmedDict())
			}
		}
		const result: any = {
			queue: this.queue,
			queueOrder: this.queueOrder,
			queuePaused: this.queuePaused,
			currentItems
		}
		if (currentItems.length > 0) {
			result.current = currentItems[0]
		}
		return result
	}

	async addToQueue(dz: any, url: string[], bitrate: number, retry: boolean = false) {
		if (!dz.logged_in) throw new NotLoggedIn()
		if (
			!this.settings.feelingLucky &&
			((!dz.current_user.can_stream_lossless && bitrate === 9) || (!dz.current_user.can_stream_hq && bitrate === 3))
		)
			throw new CantStream(bitrate)

		this.lastDZ = dz
		let downloadObjs: any[] = []
		const downloadErrors: any[] = []
		let link: string = ''
		const requestUUID = uuidv4()

		if (url.length > 1) {
			this.listener.send('startGeneratingItems', { uuid: requestUUID, total: url.length })
		}

		for (let i = 0; i < url.length; i++) {
			link = url[i]
			logger.info(`Adding ${link} to queue`)
			let downloadObj
			try {
				downloadObj = await deemix.generateDownloadObject(dz, link, bitrate, this.plugins, this.listener)
			} catch (e) {
				downloadErrors.push(e)
			}
			if (Array.isArray(downloadObj)) {
				downloadObjs = downloadObjs.concat(downloadObj)
			} else if (downloadObj) downloadObjs.push(downloadObj)
		}

		if (downloadErrors.length) {
			downloadErrors.forEach((e: any) => {
				if (!e.errid) logger.error(e)
				this.listener.send('queueError', { link: e.link, error: e.message, errid: e.errid })
			})
		}

		if (url.length > 1) {
			this.listener.send('finishGeneratingItems', { uuid: requestUUID, total: downloadObjs.length })
		}

		const slimmedObjects: any[] = []

		downloadObjs.forEach((downloadObj: any) => {
			// Check if element is already in queue
			if (Object.keys(this.queue).includes(downloadObj.uuid) && !retry) {
				this.listener.send('alreadyInQueue', downloadObj.getEssentialDict())
				return
			}

			// Save queue status when adding something to the queue
			if (!fs.existsSync(configFolder + 'queue')) fs.mkdirSync(configFolder + 'queue')

			this.queueOrder.push(downloadObj.uuid)
			fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
			this.queue[downloadObj.uuid] = downloadObj.getEssentialDict()
			this.queue[downloadObj.uuid].status = 'inQueue'

			const savedObject = downloadObj.toDict()
			savedObject.status = 'inQueue'
			fs.writeFileSync(configFolder + `queue${sep}${downloadObj.uuid}.json`, JSON.stringify(savedObject))

			slimmedObjects.push(downloadObj.getSlimmedDict())
		})
		if (slimmedObjects.length === 1) this.listener.send('addedToQueue', slimmedObjects[0])
		else this.listener.send('addedToQueue', slimmedObjects)

		this.startQueue(dz)
		return slimmedObjects
	}

	async startQueue(dz?: any): Promise<any> {
		if (dz) {
			this.lastDZ = dz
		}
		const activeDz = dz || this.lastDZ
		if (!activeDz || this.queuePaused) {
			return null
		}

		const maxConcurrency = Math.max(1, Number(this.settings?.queueConcurrency) || 1)

		while (!this.queuePaused && this.activeJobs.size < maxConcurrency && this.queueOrder.length > 0) {
			let currentUUID: string | null = null

			while (this.queueOrder.length > 0) {
				const candidate = this.queueOrder.shift()
				if (candidate && this.queue[candidate] !== undefined && !this.activeJobs.has(candidate)) {
					currentUUID = candidate
					break
				}
			}

			if (!currentUUID) {
				try {
					fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
				} catch (err) {
					logger.error(`Error saving queue order: ${err}`)
				}
				break
			}

			try {
				fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
			} catch (err) {
				logger.error(`Error saving queue order: ${err}`)
			}

			if (this.queue[currentUUID]) {
				this.queue[currentUUID].status = 'downloading'
			}

			// Reserve worker slot
			this.activeJobs.set(currentUUID, { downloadObject: null, downloader: null })

			// Process worker asynchronously without blocking the loop
			this.processQueueWorker(activeDz, currentUUID)
		}

		return null
	}

	private async processQueueWorker(dz: any, currentUUID: string): Promise<void> {
		let downloadObject: any = null
		try {
			const itemFilePath = configFolder + `queue${sep}${currentUUID}.json`
			if (!fs.existsSync(itemFilePath)) {
				this.activeJobs.delete(currentUUID)
				if (this.queue[currentUUID]) {
					delete this.queue[currentUUID]
				}
				return
			}

			const currentItem: any = JSON.parse(fs.readFileSync(itemFilePath).toString())
			switch (currentItem.__type__) {
				case 'Single':
					downloadObject = new Single(currentItem)
					break
				case 'Collection':
					downloadObject = new Collection(currentItem)
					break
				case 'Convertable':
					downloadObject = new Convertable(currentItem)
					this.activeJobs.set(currentUUID, { downloadObject, downloader: null })
					this.listener.send('startConversion', currentUUID)
					downloadObject = await this.plugins[downloadObject.plugin].convert(
						dz,
						downloadObject,
						this.settings,
						this.listener
					)
					this.listener.send('finishConversion', downloadObject.getEssentialDict())
					fs.writeFileSync(
						configFolder + `queue${sep}${downloadObject.uuid}.json`,
						JSON.stringify({ ...downloadObject.toDict(), status: 'inQueue' })
					)
					break
			}

			if (!downloadObject || downloadObject.isCanceled) {
				return
			}

			const downloader = new Downloader(dz, downloadObject, this.settings, this.listener)
			this.activeJobs.set(currentUUID, { downloader, downloadObject })
			this.listener.send('startDownload', currentUUID)

			await downloader.start()

			if (!downloadObject.isCanceled && this.queue[currentUUID]) {
				// Set status
				if (downloadObject.failed === downloadObject.size && downloadObject.size !== 0) {
					this.queue[currentUUID].status = 'failed'
				} else if (downloadObject.failed > 0) {
					this.queue[currentUUID].status = 'withErrors'
				} else {
					this.queue[currentUUID].status = 'completed'
				}

				const savedObject = downloadObject.getSlimmedDict()
				savedObject.status = this.queue[currentUUID].status

				// Save queue status
				this.queue[currentUUID] = savedObject
				fs.writeFileSync(configFolder + `queue${sep}${currentUUID}.json`, JSON.stringify(savedObject))

				// Auto-index library database on download completion
				if (this.queue[currentUUID].status === 'completed' || this.queue[currentUUID].status === 'withErrors') {
					const downloadLocation = this.settings?.downloadLocation || '/downloads'
					scanLibrary(downloadLocation)
						.then(updatedLib => {
							this.listener.send('libraryUpdated', updatedLib)
						})
						.catch(scanErr => {
							logger.error(`Failed to auto-index completed download: ${scanErr}`)
						})
				}
			}

			try {
				fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
			} catch (err) {
				logger.error(`Error saving queue order: ${err}`)
			}
		} catch (err) {
			logger.error(`Error in download worker for ${currentUUID}: ${err}`)
			if (this.queue[currentUUID]) {
				this.queue[currentUUID].status = 'failed'
			}
		} finally {
			this.activeJobs.delete(currentUUID)
			if (!this.queuePaused) {
				this.startQueue(dz)
			}
		}
	}

	cancelDownload(uuid: string) {
		if (uuid && Object.prototype.hasOwnProperty.call(this.queue, uuid)) {
			const itemStatus = this.queue[uuid]?.status
			switch (itemStatus) {
				case 'downloading': {
					const activeJob = this.activeJobs.get(uuid)
					if (activeJob) {
						if (activeJob.downloadObject) {
							activeJob.downloadObject.isCanceled = true
						}
						if (activeJob.downloader?.downloadObject) {
							activeJob.downloader.downloadObject.isCanceled = true
						}
					}
					this.listener.send('cancellingCurrentItem', uuid)
					break
				}
				case 'inQueue': {
					const orderIdx = this.queueOrder.indexOf(uuid)
					if (orderIdx > -1) {
						this.queueOrder.splice(orderIdx, 1)
						try {
							fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
						} catch (err) {
							logger.error(`Error saving queue order: ${err}`)
						}
					}
					this.listener.send('removedFromQueue', uuid)
					break
				}
				default:
					this.listener.send('removedFromQueue', uuid)
					break
			}
			try {
				const itemPath = configFolder + `queue${sep}${uuid}.json`
				if (fs.existsSync(itemPath)) {
					fs.unlinkSync(itemPath)
				}
			} catch (err) {
				logger.error(`Error removing queue item file ${uuid}: ${err}`)
			}
			delete this.queue[uuid]
		}
	}

	cancelAllDownloads() {
		this.queueOrder = []
		let firstCancelled: string | null = null

		// Cancel all active jobs
		for (const [uuid, activeJob] of this.activeJobs.entries()) {
			if (activeJob.downloadObject) {
				activeJob.downloadObject.isCanceled = true
			}
			if (activeJob.downloader?.downloadObject) {
				activeJob.downloader.downloadObject.isCanceled = true
			}
			this.listener.send('cancellingCurrentItem', uuid)
			if (!firstCancelled) {
				firstCancelled = uuid
			}
		}

		Object.values(this.queue).forEach((downloadObject: any) => {
			if (downloadObject && downloadObject.uuid) {
				try {
					const itemPath = configFolder + `queue${sep}${downloadObject.uuid}.json`
					if (fs.existsSync(itemPath)) {
						fs.unlinkSync(itemPath)
					}
				} catch (err) {
					logger.error(`Error removing queue item file ${downloadObject.uuid}: ${err}`)
				}
				delete this.queue[downloadObject.uuid]
			}
		})

		try {
			fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
		} catch (err) {
			logger.error(`Error saving queue order: ${err}`)
		}

		this.listener.send('removedAllDownloads', firstCancelled)
	}

	clearCompletedDownloads() {
		Object.values(this.queue).forEach((downloadObject: any) => {
			if (downloadObject && downloadObject.status === 'completed') {
				try {
					const itemPath = configFolder + `queue${sep}${downloadObject.uuid}.json`
					if (fs.existsSync(itemPath)) {
						fs.unlinkSync(itemPath)
					}
				} catch (err) {
					logger.error(`Error deleting completed download file ${downloadObject.uuid}: ${err}`)
				}
				delete this.queue[downloadObject.uuid]
			}
		})
		this.queueOrder = this.queueOrder.filter(uuid => this.queue[uuid] !== undefined)
		try {
			fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
		} catch (err) {
			logger.error(`Error saving queue order: ${err}`)
		}
		this.listener.send('removedFinishedDownloads')
	}

	clearFailedDownloads() {
		Object.values(this.queue).forEach((downloadObject: any) => {
			if (downloadObject && (downloadObject.status === 'failed' || downloadObject.status === 'withErrors')) {
				const uuid = downloadObject.uuid
				try {
					const itemPath = configFolder + `queue${sep}${uuid}.json`
					if (fs.existsSync(itemPath)) {
						fs.unlinkSync(itemPath)
					}
				} catch (err) {
					logger.error(`Error deleting failed download file ${uuid}: ${err}`)
				}
				delete this.queue[uuid]
			}
		})
		this.queueOrder = this.queueOrder.filter(uuid => this.queue[uuid] !== undefined)
		try {
			fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
		} catch (err) {
			logger.error(`Error saving queue order: ${err}`)
		}
		this.listener.send('removedFailedDownloads')
	}

	pauseQueue() {
		this.queuePaused = true
		this.listener.send('queuePaused', true)
	}

	resumeQueue(dz?: any) {
		if (dz) {
			this.lastDZ = dz
		}
		this.queuePaused = false
		this.listener.send('queuePaused', false)
		this.listener.send('queueResumed')
		const activeDz = dz || this.lastDZ
		if (activeDz) {
			this.startQueue(activeDz)
		}
	}

	reorderQueue(newOrder: string[]) {
		if (!Array.isArray(newOrder)) return
		const currentOrderSet = new Set(this.queueOrder)
		const sanitized: string[] = []

		for (const uuid of newOrder) {
			if (typeof uuid === 'string' && currentOrderSet.has(uuid) && !sanitized.includes(uuid)) {
				sanitized.push(uuid)
			}
		}

		for (const uuid of this.queueOrder) {
			if (!sanitized.includes(uuid)) {
				sanitized.push(uuid)
			}
		}

		this.queueOrder = sanitized
		try {
			fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
		} catch (err) {
			logger.error(`Error saving queue order: ${err}`)
		}
		this.listener.send('queueOrderUpdated', this.queueOrder)
	}

	moveQueueItem(uuid: string, direction: 'up' | 'down') {
		const index = this.queueOrder.indexOf(uuid)
		if (index === -1) return

		if (direction === 'up' && index > 0) {
			const temp = this.queueOrder[index - 1]
			this.queueOrder[index - 1] = this.queueOrder[index]
			this.queueOrder[index] = temp
		} else if (direction === 'down' && index < this.queueOrder.length - 1) {
			const temp = this.queueOrder[index + 1]
			this.queueOrder[index + 1] = this.queueOrder[index]
			this.queueOrder[index] = temp
		}

		try {
			fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
		} catch (err) {
			logger.error(`Error saving queue order: ${err}`)
		}
		this.listener.send('queueOrderUpdated', this.queueOrder)
	}

	restoreQueueFromDisk() {
		if (!fs.existsSync(configFolder + 'queue')) fs.mkdirSync(configFolder + 'queue')
		const allItems: string[] = fs.readdirSync(configFolder + 'queue')
		allItems.forEach((filename: string) => {
			if (filename === 'order.json') {
				try {
					this.queueOrder = JSON.parse(fs.readFileSync(configFolder + `queue${sep}order.json`).toString())
				} catch {
					this.queueOrder = []
					fs.writeFileSync(configFolder + `queue${sep}order.json`, JSON.stringify(this.queueOrder))
				}
			} else {
				let currentItem: any
				try {
					currentItem = JSON.parse(fs.readFileSync(configFolder + `queue${sep}${filename}`).toString())
				} catch {
					fs.unlinkSync(configFolder + `queue${sep}${filename}`)
					return
				}
				if (currentItem.status === 'inQueue') {
					let downloadObject: any
					switch (currentItem.__type__) {
						case 'Single':
							downloadObject = new Single(currentItem)
							// Remove old incompatible queue items
							if (downloadObject.single.trackAPI_gw) {
								fs.unlinkSync(configFolder + `queue${sep}${filename}`)
								return
							}
							break
						case 'Collection':
							downloadObject = new Collection(currentItem)
							// Remove old incompatible queue items
							if (downloadObject.collection.tracks_gw) {
								fs.unlinkSync(configFolder + `queue${sep}${filename}`)
								return
							}
							break
						case 'Convertable':
							downloadObject = new Convertable(currentItem)
							break
					}
					if (downloadObject && downloadObject.uuid) {
						this.queue[downloadObject.uuid] = downloadObject.getEssentialDict()
						this.queue[downloadObject.uuid].status = 'inQueue'
					}
				} else if (currentItem && currentItem.uuid) {
					this.queue[currentItem.uuid] = currentItem
				}
			}
		})
	}
}
