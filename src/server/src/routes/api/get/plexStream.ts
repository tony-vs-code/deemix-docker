import path from 'path'
import { ApiHandler } from '../../../types'
import { pipePlexResponse, validatePlexPath } from '../../../helpers/plex'

const routePath: ApiHandler['path'] = '/plex/stream'

const AUDIO_MIME_TYPES: Record<string, string> = {
	'.mp3': 'audio/mpeg',
	'.flac': 'audio/flac',
	'.m4a': 'audio/mp4',
	'.aac': 'audio/aac',
	'.ogg': 'audio/ogg',
	'.opus': 'audio/opus',
	'.wav': 'audio/wav'
}

const handler: ApiHandler['handler'] = async (req, res) => {
	const check = validatePlexPath(req.query?.partKey, '/library/')
	if (!check.valid) {
		return res.status(check.status).send({ error: check.error })
	}

	const cleanNoQuery = check.path.split('?')[0]
	const ext = path.extname(cleanNoQuery).toLowerCase()
	const fallbackContentType = AUDIO_MIME_TYPES[ext] || 'application/octet-stream'

	await pipePlexResponse(check.targetUrl, check.token, req, res, {
		timeoutMs: 15000,
		forwardRange: true,
		fallbackContentType
	})
}

const apiHandler: ApiHandler = { path: routePath, handler }

export default apiHandler
