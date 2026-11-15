import fs from 'fs'
import path from 'path'
import { ApiHandler } from '../../../types'

const pathEndpoint: ApiHandler['path'] = '/streamLibraryTrack'

const MIME_TYPES: Record<string, string> = {
	'.mp3': 'audio/mpeg',
	'.flac': 'audio/flac',
	'.m4a': 'audio/mp4',
	'.ogg': 'audio/ogg',
	'.opus': 'audio/opus',
	'.wav': 'audio/wav'
}

const handler: ApiHandler['handler'] = (req, res) => {
	const deemix = req.app.get('deemix')
	const settings = deemix?.getSettings()?.settings || deemix?.settings || {}
	const downloadLocation = settings.downloadLocation || '/downloads'

	const relPath = (req.query.path || req.query.file) as string
	if (!relPath || typeof relPath !== 'string') {
		return res.status(400).send({ error: 'Missing path parameter' })
	}

	if (relPath.includes('\0')) {
		return res.status(400).send({ error: 'Invalid path parameter' })
	}

	const resolvedBase = path.resolve(downloadLocation)
	const resolvedTarget = path.resolve(resolvedBase, relPath)

	// Path traversal protection
	if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
		return res.status(403).send({ error: 'Forbidden: Path traversal detected' })
	}

	if (!fs.existsSync(resolvedTarget)) {
		return res.status(404).send({ error: 'Audio file not found' })
	}

	let stat: fs.Stats
	try {
		stat = fs.statSync(resolvedTarget)
		if (!stat.isFile()) {
			return res.status(400).send({ error: 'Target is not a file' })
		}
	} catch {
		return res.status(500).send({ error: 'Failed to access file' })
	}

	const ext = path.extname(resolvedTarget).toLowerCase()
	const contentType = MIME_TYPES[ext] || 'application/octet-stream'

	const range = req.headers.range

	if (range) {
		const parts = range.replace(/bytes=/, '').split('-')
		const start = parseInt(parts[0], 10)
		const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1

		if (start >= stat.size || end >= stat.size || start > end) {
			res.setHeader('Content-Range', `bytes */${stat.size}`)
			return res.status(416).send({ error: 'Requested range not satisfiable' })
		}

		const chunkSize = end - start + 1
		const stream = fs.createReadStream(resolvedTarget, { start, end })

		res.writeHead(206, {
			'Content-Range': `bytes ${start}-${end}/${stat.size}`,
			'Accept-Ranges': 'bytes',
			'Content-Length': chunkSize,
			'Content-Type': contentType
		})

		stream.pipe(res)
	} else {
		res.writeHead(200, {
			'Content-Length': stat.size,
			'Content-Type': contentType,
			'Accept-Ranges': 'bytes'
		})

		fs.createReadStream(resolvedTarget).pipe(res)
	}
}

const apiHandler: ApiHandler = { path: pathEndpoint, handler }

export default apiHandler
