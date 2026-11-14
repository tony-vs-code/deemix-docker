import fs from 'fs'
import path from 'path'
import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'

const pathEndpoint: ApiHandler['path'] = '/getLibrary'

export interface TrackMetadata {
	title: string
	trackNumber: number
	artist: string
	album: string
	size: number
	formattedSize: string
	format: string
	path: string
}

export interface AlbumMetadata {
	title: string
	artist: string
	cover: string
	path: string
	tracksCount: number
	totalSize: number
	formattedTotalSize: string
	tracks: TrackMetadata[]
}

export interface ArtistMetadata {
	name: string
	albumsCount: number
	totalTracks: number
	albums: AlbumMetadata[]
}

export interface LibraryResponse {
	downloadLocation: string
	artists: ArtistMetadata[]
	totalTracks: number
	totalAlbums: number
	totalArtists: number
}

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

function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 B'
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function readAudioMetadata(
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

const handler: ApiHandler['handler'] = (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const settings = deemix?.getSettings()?.settings || deemix?.settings || {}
		const downloadLocation = settings.downloadLocation || '/downloads'

		const resolvedBase = path.resolve(downloadLocation)

		if (!fs.existsSync(resolvedBase)) {
			const emptyResponse: LibraryResponse = {
				downloadLocation,
				artists: [],
				totalTracks: 0,
				totalAlbums: 0,
				totalArtists: 0
			}
			return res.send(emptyResponse)
		}

		const dirCoverMap = new Map<string, string>()
		const musicFiles: string[] = []
		const visitedDirs = new Set<string>()

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

			for (const entry of entries) {
				if (entry.name.startsWith('.')) continue

				const fullPath = path.join(currentDir, entry.name)

				if (entry.isDirectory()) {
					if (!['node_modules', '$recycle.bin', 'system volume information'].includes(entry.name.toLowerCase())) {
						subDirs.push(fullPath)
					}
				} else if (entry.isFile()) {
					const ext = path.extname(entry.name).toLowerCase()
					const lowerName = entry.name.toLowerCase()

					if (AUDIO_EXTS.has(ext)) {
						musicFiles.push(fullPath)
					} else if (COVER_FILENAMES.includes(lowerName)) {
						foundCover = fullPath
					} else if (IMAGE_EXTS.has(ext) && !firstImage) {
						firstImage = fullPath
					}
				}
			}

			const coverPath = foundCover || firstImage
			if (coverPath) {
				const relCover = path.relative(resolvedBase, coverPath)
				const relDir = path.relative(resolvedBase, currentDir)
				dirCoverMap.set(relDir, relCover)
			}

			for (const subDir of subDirs) {
				scanDirectory(subDir, depth + 1)
			}
		}

		scanDirectory(resolvedBase)

		// Map to hold Artist -> Album -> Tracks
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

		for (const filePath of musicFiles) {
			const relPath = path.relative(resolvedBase, filePath)
			const ext = path.extname(filePath).toLowerCase()
			const format = ext.replace(/^\./, '').toLowerCase()

			let stat: fs.Stats
			try {
				stat = fs.statSync(filePath)
			} catch {
				continue
			}

			const metadata = readAudioMetadata(filePath, ext)

			// Fallback parsing from path
			const dirParts = path.dirname(relPath).split(path.sep).filter(p => p && p !== '.')
			const filenameWithoutExt = path.basename(relPath, ext)

			let fallbackArtist = 'Unknown Artist'
			let fallbackAlbum = 'Unknown Album'

			if (dirParts.length >= 2) {
				fallbackArtist = dirParts[0]
				fallbackAlbum = dirParts[dirParts.length - 1]
			} else if (dirParts.length === 1) {
				const dirName = dirParts[0]
				if (dirName.includes(' - ')) {
					const split = dirName.split(' - ')
					fallbackArtist = split[0].trim()
					fallbackAlbum = split.slice(1).join(' - ').trim()
				} else {
					fallbackAlbum = dirName
				}
			}

			let fallbackTrackNumber = 1
			let fallbackTitle = filenameWithoutExt

			const trackMatch = filenameWithoutExt.match(/^(\d+)[\s._-]+(.+)$/)
			if (trackMatch) {
				fallbackTrackNumber = parseInt(trackMatch[1], 10)
				fallbackTitle = trackMatch[2].trim()
			}
			if (fallbackTitle.includes(' - ') && fallbackArtist === 'Unknown Artist') {
				const parts = fallbackTitle.split(' - ')
				fallbackArtist = parts[0].trim()
				fallbackTitle = parts.slice(1).join(' - ').trim()
			}

			const artistName = (metadata.artist?.trim() || fallbackArtist).trim() || 'Unknown Artist'
			const albumTitle = (metadata.album?.trim() || fallbackAlbum).trim() || 'Unknown Album'
			const trackTitle = (metadata.title?.trim() || fallbackTitle).trim() || filenameWithoutExt
			const trackNumber = metadata.trackNumber || fallbackTrackNumber

			const trackItem: TrackMetadata = {
				title: trackTitle,
				trackNumber,
				artist: artistName,
				album: albumTitle,
				size: stat.size,
				formattedSize: formatBytes(stat.size),
				format,
				path: relPath
			}

			if (!artistsMap.has(artistName)) {
				artistsMap.set(artistName, {
					name: artistName,
					albumsMap: new Map()
				})
			}

			const artistObj = artistsMap.get(artistName)!
			if (!artistObj.albumsMap.has(albumTitle)) {
				const albumRelDir = path.relative(resolvedBase, path.dirname(filePath))
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

		// Convert to structured response
		let totalAlbums = 0
		const artists: ArtistMetadata[] = []

		for (const [, artistObj] of artistsMap) {
			const albums: AlbumMetadata[] = []

			for (const [, albumObj] of artistObj.albumsMap) {
				albumObj.tracks.sort((a, b) => a.trackNumber - b.trackNumber || a.title.localeCompare(b.title))

				const totalSize = albumObj.tracks.reduce((sum, t) => sum + t.size, 0)

				albums.push({
					title: albumObj.title,
					artist: albumObj.artist,
					cover: albumObj.cover,
					path: albumObj.path,
					tracksCount: albumObj.tracks.length,
					totalSize,
					formattedTotalSize: formatBytes(totalSize),
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

		const response: LibraryResponse = {
			downloadLocation,
			artists,
			totalTracks,
			totalAlbums,
			totalArtists: artists.length
		}

		res.send(response)
	} catch (error) {
		logger.error(error)
		res.status(500).send({ error: 'Failed to scan library' })
	}
}

const apiHandler: ApiHandler = { path: pathEndpoint, handler }

export default apiHandler
