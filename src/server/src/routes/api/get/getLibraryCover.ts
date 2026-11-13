import fs from 'fs'
import path from 'path'
import { ApiHandler } from '../../../types'

const pathEndpoint: ApiHandler['path'] = '/getLibraryCover'

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

	// Path traversal protection: must be strictly inside downloadLocation
	if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
		return res.status(403).send({ error: 'Forbidden: Path traversal detected' })
	}

	if (!fs.existsSync(resolvedTarget)) {
		return res.status(404).send({ error: 'Cover art not found' })
	}

	try {
		const stat = fs.statSync(resolvedTarget)
		if (!stat.isFile()) {
			return res.status(400).send({ error: 'Target is not a file' })
		}
	} catch {
		return res.status(500).send({ error: 'Failed to access file' })
	}

	const ext = path.extname(resolvedTarget).toLowerCase()
	const mimeTypes: Record<string, string> = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.webp': 'image/webp',
		'.gif': 'image/gif'
	}

	const mime = mimeTypes[ext]
	if (!mime) {
		return res.status(400).send({ error: 'Unsupported image type' })
	}

	res.setHeader('Content-Type', mime)
	res.setHeader('Cache-Control', 'public, max-age=86400')
	return res.sendFile(resolvedTarget)
}

const apiHandler: ApiHandler = { path: pathEndpoint, handler }

export default apiHandler
