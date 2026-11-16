import fs from 'fs'
import path from 'path'
import https from 'https'
// @ts-expect-error
import deemix from 'deemix'
import { logger } from './logger'

export interface TrackMetadata {
	title: string
	trackNumber: number
	artist: string
	album: string
	size: number
	formattedSize: string
	format: string
	path: string // Relative path to downloadLocation
	fullPath?: string
	mtime?: number
}

export interface AlbumMetadata {
	title: string
	artist: string
	cover: string
	path: string // Relative path to album folder
	tracksCount: number
	totalSize: number
	formattedTotalSize: string
	tracks: TrackMetadata[]
	matchedTracks?: string[]
}

export interface ArtistMetadata {
	name: string
	albumsCount: number
	totalTracks: number
	albums: AlbumMetadata[]
}

export interface FileIndexItem {
	size: number
	mtime: number
	title: string
	trackNumber: number
	artist: string
	album: string
	format: string
}

export interface LibraryData {
	version: number
	downloadLocation: string
	lastScanned: string | null
	totalTracks: number
	totalAlbums: number
	totalArtists: number
	totalSize: number
	formattedTotalSize: string
	artists: ArtistMetadata[]
	fileIndex: Record<string, FileIndexItem>
}

export type TrackWithAlbumInfo = TrackMetadata & { albumTitle?: string; albumCover?: string }

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.m4a', '.ogg', '.opus', '.wav'])
const COVER_FILENAMES = [
	'cover.jpg',
	'cover.jpeg',
	'cover.png',
	'folder.jpg',
	'folder.jpeg',
	'folder.png',
	'albumart.jpg',
	'albumart.png',
	'front.jpg',
	'front.png'
]
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const configFolder = deemix.utils.localpaths.getConfigFolder()
const dbFilePath = path.join(configFolder, 'library.json')

let cachedLibrary: LibraryData | null = null
let libraryListener: { send: (key: string, data?: any) => void } | null = null

// --- Debounced Atomic Disk Persistence ---
let saveDebounceTimer: NodeJS.Timeout | null = null
let pendingSaveData: LibraryData | null = null

export function setLibraryListener(listener: { send: (key: string, data?: any) => void }) {
	libraryListener = listener
}

export function notifyLibraryUpdated(data: LibraryData) {
	if (libraryListener) {
		try {
			libraryListener.send('libraryUpdated', data)
		} catch (e) {
			logger.warn(`Failed to send libraryUpdated notification: ${e}`)
		}
	}
}

// --- In-Memory Inverted Search Index ---
interface IndexedAlbum {
	album: AlbumMetadata
	titleLower: string
	artistLower: string
	combinedLower: string
	tokens: Set<string>
	trackMap: Map<string, string> // trackTitleLower -> originalTitle
}

interface IndexedTrack {
	track: TrackWithAlbumInfo
	titleLower: string
	artistLower: string
	albumLower: string
	combinedLower: string
	tokens: Set<string>
}

interface IndexedArtist {
	artist: ArtistMetadata
	nameLower: string
	tokens: Set<string>
	albumTitlesLower: string[]
}

interface LibrarySearchIndex {
	downloadLocation: string
	indexedAlbums: IndexedAlbum[]
	indexedTracks: IndexedTrack[]
	indexedArtists: IndexedArtist[]
	allAlbums: AlbumMetadata[]
	allTracks: TrackWithAlbumInfo[]
	allArtists: ArtistMetadata[]
	tokenToAlbums: Map<string, Set<IndexedAlbum>>
	tokenToTracks: Map<string, Set<IndexedTrack>>
	tokenToArtists: Map<string, Set<IndexedArtist>>
}

let searchIndex: LibrarySearchIndex | null = null

function tokenize(text: string): string[] {
	if (!text) return []
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.split(/[^a-z0-9]+/i)
		.filter(t => t.length > 0)
}

function buildSearchIndex(data: LibraryData): LibrarySearchIndex {
	const tokenToAlbums = new Map<string, Set<IndexedAlbum>>()
	const tokenToTracks = new Map<string, Set<IndexedTrack>>()
	const tokenToArtists = new Map<string, Set<IndexedArtist>>()

	const indexedAlbums: IndexedAlbum[] = []
	const indexedTracks: IndexedTrack[] = []
	const indexedArtists: IndexedArtist[] = []
	const allAlbums: AlbumMetadata[] = []
	const allTracks: TrackWithAlbumInfo[] = []
	const allArtists: ArtistMetadata[] = data.artists || []

	function addToken<T>(map: Map<string, Set<T>>, token: string, item: T) {
		let set = map.get(token)
		if (!set) {
			set = new Set<T>()
			map.set(token, set)
		}
		set.add(item)
	}

	for (const artist of allArtists) {
		const artistNameLower = (artist.name || '').toLowerCase()
		const artistTokens = new Set(tokenize(artist.name))
		const albumTitlesLower: string[] = []

		const indexedArt: IndexedArtist = {
			artist,
			nameLower: artistNameLower,
			tokens: artistTokens,
			albumTitlesLower
		}
		indexedArtists.push(indexedArt)

		for (const tok of artistTokens) {
			addToken(tokenToArtists, tok, indexedArt)
		}

		for (const album of artist.albums || []) {
			allAlbums.push(album)
			const albumTitleLower = (album.title || '').toLowerCase()
			const albumArtistLower = (album.artist || artist.name || '').toLowerCase()
			albumTitlesLower.push(albumTitleLower)

			const albumTokens = new Set<string>()
			tokenize(album.title).forEach(t => albumTokens.add(t))
			tokenize(albumArtistLower).forEach(t => albumTokens.add(t))

			const trackMap = new Map<string, string>()

			for (const track of album.tracks || []) {
				const trackWithInfo: TrackWithAlbumInfo = {
					...track,
					albumTitle: album.title,
					albumCover: album.cover
				}
				allTracks.push(trackWithInfo)

				const trackTitleLower = (track.title || '').toLowerCase()
				const trackArtistLower = (track.artist || albumArtistLower).toLowerCase()
				const trackAlbumLower = (track.album || album.title || '').toLowerCase()

				trackMap.set(trackTitleLower, track.title)

				const trackTokens = new Set<string>()
				tokenize(track.title).forEach(t => {
					trackTokens.add(t)
					albumTokens.add(t) // Album matches any of its track tokens!
				})
				tokenize(trackArtistLower).forEach(t => trackTokens.add(t))
				tokenize(trackAlbumLower).forEach(t => trackTokens.add(t))

				const indexedTrk: IndexedTrack = {
					track: trackWithInfo,
					titleLower: trackTitleLower,
					artistLower: trackArtistLower,
					albumLower: trackAlbumLower,
					combinedLower: `${trackTitleLower} ${trackArtistLower} ${trackAlbumLower}`,
					tokens: trackTokens
				}
				indexedTracks.push(indexedTrk)

				for (const tok of trackTokens) {
					addToken(tokenToTracks, tok, indexedTrk)
				}
			}

			const indexedAlb: IndexedAlbum = {
				album,
				titleLower: albumTitleLower,
				artistLower: albumArtistLower,
				combinedLower: `${albumTitleLower} ${albumArtistLower}`,
				tokens: albumTokens,
				trackMap
			}
			indexedAlbums.push(indexedAlb)

			for (const tok of albumTokens) {
				addToken(tokenToAlbums, tok, indexedAlb)
			}
		}
	}

	return {
		downloadLocation: data.downloadLocation,
		indexedAlbums,
		indexedTracks,
		indexedArtists,
		allAlbums,
		allTracks,
		allArtists,
		tokenToAlbums,
		tokenToTracks,
		tokenToArtists
	}
}

function getOrBuildSearchIndex(data: LibraryData): LibrarySearchIndex {
	if (searchIndex && searchIndex.downloadLocation === data.downloadLocation) {
		return searchIndex
	}
	searchIndex = buildSearchIndex(data)
	return searchIndex
}

export function flushPendingDiskSave(): void {
	if (saveDebounceTimer) {
		clearTimeout(saveDebounceTimer)
		saveDebounceTimer = null
	}
	if (pendingSaveData) {
		executeAtomicDiskSave(pendingSaveData)
		pendingSaveData = null
	}
}

function executeAtomicDiskSave(data: LibraryData): void {
	try {
		if (!fs.existsSync(configFolder)) {
			fs.mkdirSync(configFolder, { recursive: true })
		}
		const tmpPath = `${dbFilePath}.${Date.now()}-${Math.random().toString(36).substring(2, 7)}.tmp`
		fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8')
		fs.renameSync(tmpPath, dbFilePath)
		cachedLibrary = data
	} catch (err) {
		logger.error(`Failed to save library database to ${dbFilePath}: ${err}`)
	}
}

export function saveLibraryToDisk(data: LibraryData, immediate = false): void {
	cachedLibrary = data
	searchIndex = buildSearchIndex(data)
	pendingSaveData = data

	if (immediate) {
		flushPendingDiskSave()
	} else {
		if (saveDebounceTimer) {
			clearTimeout(saveDebounceTimer)
		}
		saveDebounceTimer = setTimeout(() => {
			saveDebounceTimer = null
			if (pendingSaveData) {
				executeAtomicDiskSave(pendingSaveData)
				pendingSaveData = null
			}
		}, 800)
	}
}

// Hook process exit to flush any pending disk writes
process.once('beforeExit', () => flushPendingDiskSave())

let isFetchingCovers = false

function fetchMissingCoversInBackground(
	resolvedBase: string,
	missing: { albumTitle: string; artistName: string; fullDir: string; relDir: string }[]
) {
	if (isFetchingCovers || missing.length === 0) return
	isFetchingCovers = true

	setImmediate(async () => {
		try {
			let updatedAny = false
			const CONCURRENCY = 3
			for (let i = 0; i < missing.length; i += CONCURRENCY) {
				const batch = missing.slice(i, i + CONCURRENCY)
				await Promise.all(
					batch.map(async item => {
						try {
							const savedCover = await fetchDeezerAlbumCover(item.artistName, item.albumTitle, item.fullDir)
							if (savedCover && cachedLibrary) {
								const relCover = path.relative(resolvedBase, savedCover)
								const coverUrl = `api/getLibraryCover?path=${encodeURIComponent(relCover)}`
								for (const artist of cachedLibrary.artists) {
									for (const alb of artist.albums) {
										if (alb.path === item.relDir || (alb.title === item.albumTitle && alb.artist === item.artistName)) {
											alb.cover = coverUrl
											updatedAny = true
										}
									}
								}
								logger.info(`Fetched Deezer HD cover for ${item.artistName} - ${item.albumTitle}`)
							}
						} catch {
							// Ignore network errors in background cover fetch
						}
					})
				)
			}

			if (updatedAny && cachedLibrary) {
				// Use debounced save to avoid disk thrashing
				saveLibraryToDisk(cachedLibrary, false)
				notifyLibraryUpdated(cachedLibrary)
			}
		} catch (err) {
			logger.warn(`Error in background Deezer cover fetch: ${err}`)
		} finally {
			isFetchingCovers = false
		}
	})
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 B'
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function readAudioMetadata(
	filePath: string,
	ext: string
): { title?: string; artist?: string; album?: string; trackNumber?: number } {
	try {
		const fd = fs.openSync(filePath, 'r')
		const buf = Buffer.alloc(65536)
		const bytesRead = fs.readSync(fd, buf, 0, 65536, 0)
		fs.closeSync(fd)

		if (bytesRead < 10) return {}

		// MP3 ID3v2 parser
		if (ext === '.mp3' && buf.toString('ascii', 0, 3) === 'ID3') {
			const meta: { title?: string; artist?: string; album?: string; trackNumber?: number } = {}
			const version = buf[3]
			const tagSize =
				((buf[6] & 0x7f) << 21) |
				((buf[7] & 0x7f) << 14) |
				((buf[8] & 0x7f) << 7) |
				(buf[9] & 0x7f)
			const maxOffset = Math.min(bytesRead, tagSize + 10)
			let offset = 10

			while (offset + 10 < maxOffset) {
				const frameId = buf.toString('ascii', offset, offset + 4)
				if (!/^[A-Z0-9]{4}$/.test(frameId)) break

				let frameSize = 0
				if (version >= 4) {
					frameSize =
						((buf[offset + 4] & 0x7f) << 21) |
						((buf[offset + 5] & 0x7f) << 14) |
						((buf[offset + 6] & 0x7f) << 7) |
						(buf[offset + 7] & 0x7f)
				} else {
					frameSize = buf.readUInt32BE(offset + 4)
				}

				offset += 10
				if (frameSize <= 0 || offset + frameSize > maxOffset) break

				const encoding = buf[offset]
				let text = ''
				try {
					if (encoding === 1 || encoding === 2) {
						text = buf
							.toString('utf16le', offset + 1, offset + frameSize)
							.replace(/^\uFEFF/, '')
							.replace(/\0.*$/g, '')
							.trim()
					} else {
						text = buf
							.toString('utf8', offset + 1, offset + frameSize)
							.replace(/\0.*$/g, '')
							.trim()
					}
				} catch {
					text = ''
				}

				if (text) {
					if (frameId === 'TIT2' && !meta.title) meta.title = text
					if (frameId === 'TPE1' && !meta.artist) meta.artist = text
					if (frameId === 'TALB' && !meta.album) meta.album = text
					if (frameId === 'TRCK' && !meta.trackNumber) {
						const num = parseInt(text.split('/')[0], 10)
						if (!isNaN(num)) meta.trackNumber = num
					}
				}

				offset += frameSize
			}
			return meta
		}

		// FLAC Vorbis comment parser
		if (ext === '.flac' && buf.toString('ascii', 0, 4) === 'fLaC') {
			const meta: { title?: string; artist?: string; album?: string; trackNumber?: number } = {}
			let offset = 4
			let isLast = false

			while (offset + 4 < bytesRead && !isLast) {
				const header = buf[offset]
				isLast = (header & 0x80) !== 0
				const blockType = header & 0x7f
				const blockSize = (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]
				offset += 4

				if (blockType === 4 && offset + blockSize <= bytesRead) {
					let pos = offset
					const vendorLen = buf.readUInt32LE(pos)
					pos += 4 + vendorLen
					if (pos + 4 <= offset + blockSize) {
						const userCommentCount = buf.readUInt32LE(pos)
						pos += 4
						for (let i = 0; i < userCommentCount && pos + 4 <= offset + blockSize; i++) {
							const commentLen = buf.readUInt32LE(pos)
							pos += 4
							if (pos + commentLen > offset + blockSize) break
							const comment = buf.toString('utf8', pos, pos + commentLen)
							pos += commentLen
							const eqIdx = comment.indexOf('=')
							if (eqIdx > 0) {
								const key = comment.substring(0, eqIdx).toUpperCase()
								const val = comment.substring(eqIdx + 1).trim()
								if (key === 'TITLE' && !meta.title) meta.title = val
								if (key === 'ARTIST' && !meta.artist) meta.artist = val
								if (key === 'ALBUM' && !meta.album) meta.album = val
								if (key === 'TRACKNUMBER' && !meta.trackNumber) {
									const num = parseInt(val.split('/')[0], 10)
									if (!isNaN(num)) meta.trackNumber = num
								}
							}
						}
					}
					break
				}
				offset += blockSize
			}
			return meta
		}
	} catch {
		// Ignore any read errors, fall back to directory/filename parsing
	}
	return {}
}

export function extractEmbeddedCover(audioFilePath: string, destDir: string): string | null {
	try {
		const ext = path.extname(audioFilePath).toLowerCase()
		if (ext === '.mp3') {
			const fd = fs.openSync(audioFilePath, 'r')
			const headerBuf = Buffer.alloc(10)
			const read = fs.readSync(fd, headerBuf, 0, 10, 0)
			if (read < 10 || headerBuf.toString('ascii', 0, 3) !== 'ID3') {
				fs.closeSync(fd)
				return null
			}
			const version = headerBuf[3]
			const tagSize =
				((headerBuf[6] & 0x7f) << 21) |
				((headerBuf[7] & 0x7f) << 14) |
				((headerBuf[8] & 0x7f) << 7) |
				(headerBuf[9] & 0x7f)

			const toRead = Math.min(tagSize, 12 * 1024 * 1024)
			const tagBuf = Buffer.alloc(toRead)
			fs.readSync(fd, tagBuf, 0, toRead, 10)
			fs.closeSync(fd)

			let offset = 0
			while (offset + 10 < toRead) {
				const frameId = tagBuf.toString('ascii', offset, offset + 4)
				if (!/^[A-Z0-9]{4}$/.test(frameId)) break

				let frameSize = 0
				if (version >= 4) {
					frameSize =
						((tagBuf[offset + 4] & 0x7f) << 21) |
						((tagBuf[offset + 5] & 0x7f) << 14) |
						((tagBuf[offset + 6] & 0x7f) << 7) |
						(tagBuf[offset + 7] & 0x7f)
				} else {
					frameSize = tagBuf.readUInt32BE(offset + 4)
				}

				offset += 10
				if (frameSize <= 0 || offset + frameSize > toRead) break

				if (frameId === 'APIC') {
					const frameBody = tagBuf.subarray(offset, offset + frameSize)
					let imgStart = -1
					let imgExt = '.jpg'

					for (let i = 0; i < frameBody.length - 4; i++) {
						if (frameBody[i] === 0xff && frameBody[i + 1] === 0xd8 && frameBody[i + 2] === 0xff) {
							imgStart = i
							imgExt = '.jpg'
							break
						} else if (
							frameBody[i] === 0x89 &&
							frameBody[i + 1] === 0x50 &&
							frameBody[i + 2] === 0x4e &&
							frameBody[i + 3] === 0x47
						) {
							imgStart = i
							imgExt = '.png'
							break
						}
					}

					if (imgStart >= 0) {
						const imgBuf = frameBody.subarray(imgStart)
						const targetPath = path.join(destDir, `cover${imgExt}`)
						try {
							fs.writeFileSync(targetPath, imgBuf)
							return targetPath
						} catch {
							return null
						}
					}
				}

				offset += frameSize
			}
		} else if (ext === '.flac') {
			const fd = fs.openSync(audioFilePath, 'r')
			const magicBuf = Buffer.alloc(4)
			const read = fs.readSync(fd, magicBuf, 0, 4, 0)
			if (read < 4 || magicBuf.toString('ascii', 0, 4) !== 'fLaC') {
				fs.closeSync(fd)
				return null
			}

			let fileOffset = 4
			let isLast = false
			const headerBuf = Buffer.alloc(4)

			while (!isLast && fileOffset < 20 * 1024 * 1024) {
				const bytesRead = fs.readSync(fd, headerBuf, 0, 4, fileOffset)
				if (bytesRead < 4) break
				fileOffset += 4

				isLast = (headerBuf[0] & 0x80) !== 0
				const blockType = headerBuf[0] & 0x7f
				const blockSize = (headerBuf[1] << 16) | (headerBuf[2] << 8) | headerBuf[3]

				if (blockType === 6 && blockSize > 32) {
					const blockBuf = Buffer.alloc(blockSize)
					fs.readSync(fd, blockBuf, 0, blockSize, fileOffset)
					fs.closeSync(fd)

					let pos = 4
					const mimeLen = blockBuf.readUInt32BE(pos)
					pos += 4
					const mime = blockBuf.toString('ascii', pos, pos + mimeLen).toLowerCase()
					pos += mimeLen
					const descLen = blockBuf.readUInt32BE(pos)
					pos += 4 + descLen + 16
					if (pos + 4 <= blockSize) {
						const picLen = blockBuf.readUInt32BE(pos)
						pos += 4
						if (pos + picLen <= blockSize && picLen > 0) {
							const imgBuf = blockBuf.subarray(pos, pos + picLen)
							const imgExt = mime.includes('png') ? '.png' : '.jpg'
							const targetPath = path.join(destDir, `cover${imgExt}`)
							try {
								fs.writeFileSync(targetPath, imgBuf)
								return targetPath
							} catch {
								return null
							}
						}
					}
					return null
				}

				fileOffset += blockSize
			}
			fs.closeSync(fd)
		}
	} catch {
		// Ignore any extraction failures
	}
	return null
}

export function fetchDeezerAlbumCover(
	artist: string,
	album: string,
	destDir: string
): Promise<string | null> {
	return new Promise((resolve) => {
		try {
			const cleanArtist = artist.replace(/\s*[([].*?[)\]]/g, '').trim()
			const cleanAlbum = album.replace(/\s*[([].*?[)\]]/g, '').trim()
			const query = `${cleanArtist} ${cleanAlbum}`.trim()
			if (!query || cleanArtist.toLowerCase().includes('unknown')) return resolve(null)

			const url = `https://api.deezer.com/search/album?q=${encodeURIComponent(query)}`
			const req = https.get(url, { timeout: 4000 }, (res) => {
				let body = ''
				res.on('data', (chunk) => {
					body += chunk
				})
				res.on('end', () => {
					try {
						const json = JSON.parse(body)
						const first = json?.data && json.data[0]
						const coverUrl = first?.cover_xl || first?.cover_big || first?.cover_medium
						if (!coverUrl) return resolve(null)

						const targetPath = path.join(destDir, 'cover.jpg')
						let fileStream: fs.WriteStream
						try {
							fileStream = fs.createWriteStream(targetPath)
						} catch {
							return resolve(null)
						}

						let resolved = false
						const cleanupAndResolve = (result: string | null) => {
							if (resolved) return
							resolved = true
							if (!result) {
								try { fileStream.close() } catch {}
								try { fs.unlinkSync(targetPath) } catch {}
							}
							resolve(result)
						}

						fileStream.on('error', () => cleanupAndResolve(null))

						const imgReq = https.get(coverUrl, { timeout: 6000 }, (imgRes) => {
							if (imgRes.statusCode !== 200) {
								return cleanupAndResolve(null)
							}
							imgRes.pipe(fileStream)
							fileStream.on('finish', () => {
								try { fileStream.close() } catch {}
								cleanupAndResolve(targetPath)
							})
						})
						imgReq.on('error', () => cleanupAndResolve(null))
						imgReq.on('timeout', () => {
							imgReq.destroy()
							cleanupAndResolve(null)
						})
					} catch {
						resolve(null)
					}
				})
			})
			req.on('error', () => resolve(null))
			req.on('timeout', () => {
				req.destroy()
				resolve(null)
			})
		} catch {
			resolve(null)
		}
	})
}

export function loadLibraryFromDisk(): LibraryData | null {
	try {
		if (fs.existsSync(dbFilePath)) {
			const content = fs.readFileSync(dbFilePath, 'utf8')
			const parsed = JSON.parse(content) as LibraryData
			if (parsed && typeof parsed === 'object') {
				cachedLibrary = parsed
				searchIndex = buildSearchIndex(parsed)
				return cachedLibrary
			}
		}
	} catch (err) {
		logger.error(`Failed to load library database from ${dbFilePath}: ${err}`)
	}
	return null
}

export async function getOrInitLibrary(downloadLocation: string): Promise<LibraryData> {
	if (cachedLibrary && cachedLibrary.downloadLocation === downloadLocation) {
		return cachedLibrary
	}

	const diskData = loadLibraryFromDisk()
	if (diskData && diskData.downloadLocation === downloadLocation) {
		cachedLibrary = diskData
		searchIndex = buildSearchIndex(diskData)
		return cachedLibrary
	}

	// If no database file exists yet, perform initial scan
	return scanLibrary(downloadLocation)
}

export async function scanLibrary(downloadLocation: string, force = false): Promise<LibraryData> {
	const resolvedBase = path.resolve(downloadLocation)

	if (!fs.existsSync(resolvedBase)) {
		const emptyData: LibraryData = {
			version: 1,
			downloadLocation,
			lastScanned: new Date().toISOString(),
			totalTracks: 0,
			totalAlbums: 0,
			totalArtists: 0,
			totalSize: 0,
			formattedTotalSize: '0 B',
			artists: [],
			fileIndex: {}
		}
		saveLibraryToDisk(emptyData, true)
		return emptyData
	}

	const existingData = cachedLibrary || loadLibraryFromDisk()
	const fileIndex: Record<string, FileIndexItem> = force || !existingData ? {} : { ...existingData.fileIndex }

	const dirCoverMap = new Map<string, string>()
	const musicFiles: string[] = []
	const visitedDirs = new Set<string>()
	const dirAudioFiles = new Map<string, string[]>()

	function scanDirectory(currentDir: string, depth = 0) {
		if (depth > 8) return

		let realPath = currentDir
		try {
			realPath = fs.realpathSync(currentDir)
		} catch {
			return
		}
		if (visitedDirs.has(realPath)) return
		visitedDirs.add(realPath)

		let entries: fs.Dirent[] = []
		try {
			entries = fs.readdirSync(currentDir, { withFileTypes: true })
		} catch {
			return
		}

		const subDirs: string[] = []
		let foundCover: string | null = null
		let firstImage: string | null = null
		const localAudio: string[] = []

		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue

			const fullPath = path.join(currentDir, entry.name)

			if (entry.isDirectory()) {
				if (!['node_modules', '$recycle.bin', 'system volume information'].includes(entry.name.toLowerCase())) {
					subDirs.push(fullPath)
				}
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase()

				if (AUDIO_EXTS.has(ext)) {
					musicFiles.push(fullPath)
					localAudio.push(fullPath)
				} else if (IMAGE_EXTS.has(ext)) {
					const lowerName = entry.name.toLowerCase()
					if (COVER_FILENAMES.includes(lowerName) && !foundCover) {
						foundCover = fullPath
					} else if (!firstImage) {
						firstImage = fullPath
					}
				}
			}
		}

		if (localAudio.length > 0) {
			dirAudioFiles.set(currentDir, localAudio)
		}

		let coverPath = foundCover || firstImage

		// If no cover art file found in folder, attempt to extract embedded picture from first audio file
		if (!coverPath && localAudio.length > 0) {
			for (let i = 0; i < Math.min(localAudio.length, 3); i++) {
				const extracted = extractEmbeddedCover(localAudio[i], currentDir)
				if (extracted) {
					coverPath = extracted
					logger.info(`Extracted embedded cover art: ${path.relative(resolvedBase, extracted)}`)
					break
				}
			}
		}

		if (coverPath) {
			const relDir = path.relative(resolvedBase, currentDir) || '.'
			dirCoverMap.set(relDir, path.relative(resolvedBase, coverPath))
		}

		for (const subDir of subDirs) {
			scanDirectory(subDir, depth + 1)
		}
	}

	scanDirectory(resolvedBase)

	// Keep track of found files so we can prune deleted files from fileIndex
	const currentFoundRelativePaths = new Set<string>()

	// Grouping maps
	const artistsMap = new Map<
		string,
		{
			name: string
			albumsMap: Map<
				string,
				{
					title: string
					artist: string
					cover: string
					path: string
					tracks: TrackMetadata[]
				}
			>
		}
	>()

	let totalTracks = 0
	let totalSize = 0

	for (const fullPath of musicFiles) {
		const relPath = path.relative(resolvedBase, fullPath)
		currentFoundRelativePaths.add(relPath)

		let stat: fs.Stats
		try {
			stat = fs.statSync(fullPath)
		} catch {
			continue
		}

		const ext = path.extname(fullPath).toLowerCase()
		let indexItem = fileIndex[relPath]

		// Fast Incremental Check: If mtime and size match, use cached metadata
		if (!indexItem || indexItem.mtime !== stat.mtimeMs || indexItem.size !== stat.size) {
			const parsedMeta = readAudioMetadata(fullPath, ext)
			const filenameNoExt = path.basename(fullPath, ext)
			const relDir = path.dirname(relPath)
			const dirParts = relDir !== '.' ? relDir.split(path.sep) : []

			let artistName = parsedMeta.artist || ''
			let albumTitle = parsedMeta.album || ''
			let trackTitle = parsedMeta.title || ''
			let trackNumber = parsedMeta.trackNumber || 0

			if (dirParts.length >= 2) {
				if (!artistName) artistName = dirParts[0]
				if (!albumTitle) albumTitle = dirParts[1]
			} else if (dirParts.length === 1) {
				if (!artistName) artistName = dirParts[0]
				if (!albumTitle) albumTitle = dirParts[0]
			}

			if (!artistName) artistName = 'Unknown Artist'
			if (!albumTitle) albumTitle = 'Unknown Album'

			if (!trackTitle) {
				const trackMatch = filenameNoExt.match(/^(\d{1,3})[-.\s]+(.+)$/)
				if (trackMatch) {
					if (!trackNumber) trackNumber = parseInt(trackMatch[1], 10)
					trackTitle = trackMatch[2].trim()
				} else {
					trackTitle = filenameNoExt
				}
			}

			const format = ext.replace('.', '').toUpperCase()

			indexItem = {
				size: stat.size,
				mtime: stat.mtimeMs,
				title: trackTitle,
				trackNumber,
				artist: artistName,
				album: albumTitle,
				format
			}
			fileIndex[relPath] = indexItem
		}

		totalSize += indexItem.size

		const trackItem: TrackMetadata = {
			title: indexItem.title,
			trackNumber: indexItem.trackNumber,
			artist: indexItem.artist,
			album: indexItem.album,
			size: indexItem.size,
			formattedSize: formatBytes(indexItem.size),
			format: indexItem.format,
			path: relPath,
			fullPath,
			mtime: indexItem.mtime
		}

		const artistName = indexItem.artist
		const albumTitle = indexItem.album

		if (!artistsMap.has(artistName)) {
			artistsMap.set(artistName, {
				name: artistName,
				albumsMap: new Map()
			})
		}

		const artistObj = artistsMap.get(artistName)!

		if (!artistObj.albumsMap.has(albumTitle)) {
			const albumRelDir = path.dirname(relPath)
			let coverUrl = ''

			if (dirCoverMap.has(albumRelDir)) {
				coverUrl = `api/getLibraryCover?path=${encodeURIComponent(dirCoverMap.get(albumRelDir)!)}`
			} else {
				const parentDir = path.dirname(albumRelDir)
				if (dirCoverMap.has(parentDir)) {
					coverUrl = `api/getLibraryCover?path=${encodeURIComponent(dirCoverMap.get(parentDir)!)}`
				}
			}

			artistObj.albumsMap.set(albumTitle, {
				title: albumTitle,
				artist: artistName,
				cover: coverUrl,
				path: albumRelDir,
				tracks: []
			})
		}

		const albumObj = artistObj.albumsMap.get(albumTitle)!
		albumObj.tracks.push(trackItem)
		totalTracks++
	}

	// Prune missing files from fileIndex
	for (const existingRelPath of Object.keys(fileIndex)) {
		if (!currentFoundRelativePaths.has(existingRelPath)) {
			delete fileIndex[existingRelPath]
		}
	}

	// Collect missing cover albums for asynchronous background fetching
	const missingCoverAlbums: {
		albumTitle: string
		artistName: string
		fullDir: string
		relDir: string
	}[] = []

	for (const [, artistObj] of artistsMap) {
		for (const [, albumObj] of artistObj.albumsMap) {
			if (!albumObj.cover && albumObj.path && albumObj.path !== '.') {
				const fullDir = path.resolve(resolvedBase, albumObj.path)
				missingCoverAlbums.push({
					albumTitle: albumObj.title,
					artistName: albumObj.artist,
					fullDir,
					relDir: albumObj.path
				})
			}
		}
	}

	// Build structured response
	let totalAlbums = 0
	const artists: ArtistMetadata[] = []

	for (const [, artistObj] of artistsMap) {
		const albums: AlbumMetadata[] = []

		for (const [, albumObj] of artistObj.albumsMap) {
			albumObj.tracks.sort((a, b) => a.trackNumber - b.trackNumber || a.title.localeCompare(b.title))

			const albumSize = albumObj.tracks.reduce((sum, t) => sum + t.size, 0)

			albums.push({
				title: albumObj.title,
				artist: albumObj.artist,
				cover: albumObj.cover,
				path: albumObj.path,
				tracksCount: albumObj.tracks.length,
				totalSize: albumSize,
				formattedTotalSize: formatBytes(albumSize),
				tracks: albumObj.tracks
			})
			totalAlbums++
		}

		albums.sort((a, b) => a.title.localeCompare(b.title))

		const artistTracksCount = albums.reduce((sum, alb) => sum + alb.tracksCount, 0)

		artists.push({
			name: artistObj.name,
			albumsCount: albums.length,
			totalTracks: artistTracksCount,
			albums
		})
	}

	artists.sort((a, b) => a.name.localeCompare(b.name))

	const libraryData: LibraryData = {
		version: 1,
		downloadLocation,
		lastScanned: new Date().toISOString(),
		artists,
		totalTracks,
		totalAlbums,
		totalArtists: artists.length,
		totalSize,
		formattedTotalSize: formatBytes(totalSize),
		fileIndex
	}

	saveLibraryToDisk(libraryData, true)

	// Make Deezer cover fetching completely asynchronous in the background (<10ms return)
	if (missingCoverAlbums.length > 0) {
		fetchMissingCoversInBackground(resolvedBase, missingCoverAlbums)
	}

	return libraryData
}

export interface SearchLibraryOptions {
	query?: string
	type?: string // 'albums' | 'tracks' | 'artists' | 'all'
	sortBy?: string
	page?: number
	limit?: number
}

export interface SearchLibraryResult {
	query: string
	type: string
	page: number
	limit: number
	total: number
	totalPages?: number
	albums?: AlbumMetadata[]
	tracks?: TrackWithAlbumInfo[]
	artists?: ArtistMetadata[]
	totalAlbums?: number
	totalTracks?: number
	totalArtists?: number
}

function fastCompare(a: string | undefined, b: string | undefined): number {
	const sa = a || ''
	const sb = b || ''
	return sa < sb ? -1 : sa > sb ? 1 : 0
}

function paginate<T>(items: T[], page: number, limit: number): T[] {
	if (limit <= 0) return items
	const start = (page - 1) * limit
	return items.slice(start, start + limit)
}

export async function searchLibrary(
	downloadLocation: string,
	options: SearchLibraryOptions = {}
): Promise<SearchLibraryResult> {
	const rawQuery = (options.query || '').trim()
	const query = rawQuery.toLowerCase()
	const type = options.type || 'all'
	const sortBy = options.sortBy || 'title_asc'
	const page = Math.max(1, Number(options.page) || 1)
	const limit = Math.max(0, Number(options.limit) || 0)

	let library = cachedLibrary
	if (!library || library.downloadLocation !== downloadLocation) {
		library = loadLibraryFromDisk()
		if (!library || library.downloadLocation !== downloadLocation) {
			library = await getOrInitLibrary(downloadLocation)
		}
	}

	const idx = getOrBuildSearchIndex(library)

	let matchedAlbums: AlbumMetadata[] = []
	let matchedTracks: TrackWithAlbumInfo[] = []
	let matchedArtists: ArtistMetadata[] = []

	if (!query) {
		// Empty query: instant return from pre-cached lists
		matchedAlbums = idx.allAlbums.slice()
		matchedTracks = idx.allTracks.slice()
		matchedArtists = idx.allArtists.slice()
	} else {
		const queryTokens = tokenize(query)

		// 1. High-speed Indexed Album Search (<1ms)
		// Match if query is contained in album title, artist, or any track title in album
		const albumResults: AlbumMetadata[] = []
		for (let i = 0; i < idx.indexedAlbums.length; i++) {
			const item = idx.indexedAlbums[i]
			const directMatch = item.titleLower.includes(query) || item.artistLower.includes(query)

			const matchingTracks: string[] = []
			for (const [trackLower, trackTitle] of item.trackMap) {
				if (trackLower.includes(query)) {
					matchingTracks.push(trackTitle)
				}
			}

			if (directMatch || matchingTracks.length > 0) {
				albumResults.push({
					...item.album,
					matchedTracks: matchingTracks
				})
			}
		}
		matchedAlbums = albumResults

		// 2. High-speed Indexed Track Search (<1ms)
		const trackResults: TrackWithAlbumInfo[] = []
		for (let i = 0; i < idx.indexedTracks.length; i++) {
			const item = idx.indexedTracks[i]
			if (
				item.titleLower.includes(query) ||
				item.artistLower.includes(query) ||
				item.albumLower.includes(query)
			) {
				trackResults.push(item.track)
			}
		}
		matchedTracks = trackResults

		// 3. High-speed Indexed Artist Search (<1ms)
		const artistResults: ArtistMetadata[] = []
		for (let i = 0; i < idx.indexedArtists.length; i++) {
			const item = idx.indexedArtists[i]
			if (item.nameLower.includes(query) || item.albumTitlesLower.some(alb => alb.includes(query))) {
				artistResults.push(item.artist)
			}
		}
		matchedArtists = artistResults
	}

	// Sorting
	switch (sortBy) {
		case 'title_desc':
			matchedAlbums.sort((a, b) => fastCompare(b.title, a.title))
			matchedTracks.sort((a, b) => fastCompare(b.title, a.title))
			matchedArtists.sort((a, b) => fastCompare(b.name, a.name))
			break
		case 'artist_asc':
			matchedAlbums.sort((a, b) => fastCompare(a.artist, b.artist) || fastCompare(a.title, b.title))
			matchedTracks.sort((a, b) => fastCompare(a.artist, b.artist) || fastCompare(a.title, b.title))
			matchedArtists.sort((a, b) => fastCompare(a.name, b.name))
			break
		case 'tracks_desc':
			matchedAlbums.sort((a, b) => (b.tracksCount || 0) - (a.tracksCount || 0))
			matchedTracks.sort((a, b) => fastCompare(a.title, b.title))
			matchedArtists.sort((a, b) => (b.totalTracks || 0) - (a.totalTracks || 0))
			break
		case 'size_desc':
			matchedAlbums.sort((a, b) => (b.totalSize || 0) - (a.totalSize || 0))
			matchedTracks.sort((a, b) => (b.size || 0) - (a.size || 0))
			matchedArtists.sort((a, b) => fastCompare(a.name, b.name))
			break
		case 'title_asc':
		default:
			matchedAlbums.sort((a, b) => fastCompare(a.title, b.title))
			matchedTracks.sort((a, b) => fastCompare(a.title, b.title))
			matchedArtists.sort((a, b) => fastCompare(a.name, b.name))
			break
	}

	if (type === 'albums') {
		const paged = paginate(matchedAlbums, page, limit)
		return {
			query,
			type: 'albums',
			page,
			limit: limit || matchedAlbums.length,
			total: matchedAlbums.length,
			totalPages: limit > 0 ? Math.ceil(matchedAlbums.length / limit) : 1,
			albums: paged
		}
	}

	if (type === 'tracks') {
		const paged = paginate(matchedTracks, page, limit)
		return {
			query,
			type: 'tracks',
			page,
			limit: limit || matchedTracks.length,
			total: matchedTracks.length,
			totalPages: limit > 0 ? Math.ceil(matchedTracks.length / limit) : 1,
			tracks: paged
		}
	}

	if (type === 'artists') {
		const paged = paginate(matchedArtists, page, limit)
		return {
			query,
			type: 'artists',
			page,
			limit: limit || matchedArtists.length,
			total: matchedArtists.length,
			totalPages: limit > 0 ? Math.ceil(matchedArtists.length / limit) : 1,
			artists: paged
		}
	}

	return {
		query,
		type: 'all',
		page,
		limit: limit || Math.max(matchedAlbums.length, matchedTracks.length, matchedArtists.length),
		total: matchedAlbums.length + matchedTracks.length + matchedArtists.length,
		totalAlbums: matchedAlbums.length,
		totalTracks: matchedTracks.length,
		totalArtists: matchedArtists.length,
		albums: paginate(matchedAlbums, page, limit),
		tracks: paginate(matchedTracks, page, limit),
		artists: paginate(matchedArtists, page, limit)
	}
}

export async function deleteLibraryTrack(
	relTrackPath: string,
	downloadLocation: string
): Promise<{ success: boolean; error?: string; library?: LibraryData }> {
	const resolvedBase = path.resolve(downloadLocation)
	const fullPath = path.resolve(resolvedBase, relTrackPath)

	// Path traversal protection
	if (!fullPath.startsWith(resolvedBase + path.sep)) {
		return { success: false, error: 'Forbidden: Path traversal detected' }
	}

	// Delete from disk
	if (fs.existsSync(fullPath)) {
		try {
			fs.unlinkSync(fullPath)
		} catch (err) {
			return { success: false, error: `Failed to delete file from disk: ${err}` }
		}
	}

	// Rescan incrementally to rebuild clean state and remove empty folders/albums
	const updatedLibrary = await scanLibrary(downloadLocation)
	return { success: true, library: updatedLibrary }
}

export async function deleteLibraryAlbum(
	relAlbumPath: string,
	downloadLocation: string
): Promise<{ success: boolean; error?: string; library?: LibraryData }> {
	const resolvedBase = path.resolve(downloadLocation)
	const fullAlbumPath = path.resolve(resolvedBase, relAlbumPath)

	// Path traversal protection: must not delete base download directory or escape it
	if (!fullAlbumPath.startsWith(resolvedBase + path.sep) || fullAlbumPath === resolvedBase) {
		return { success: false, error: 'Forbidden: Cannot delete download root folder or outside paths' }
	}

	// Delete directory from disk
	if (fs.existsSync(fullAlbumPath)) {
		try {
			fs.rmSync(fullAlbumPath, { recursive: true, force: true })
		} catch (err) {
			return { success: false, error: `Failed to delete album directory from disk: ${err}` }
		}
	}

	// Rescan incrementally to rebuild clean state
	const updatedLibrary = await scanLibrary(downloadLocation)
	return { success: true, library: updatedLibrary }
}
