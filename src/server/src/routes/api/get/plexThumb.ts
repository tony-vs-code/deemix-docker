import { ApiHandler } from '../../../types'
import { pipePlexResponse, validatePlexPath } from '../../../helpers/plex'

const path: ApiHandler['path'] = '/plex/thumb'

const handler: ApiHandler['handler'] = async (req, res) => {
	const check = validatePlexPath(req.query?.path, '/')
	if (!check.valid) {
		return res.status(check.status).send({ error: check.error })
	}

	await pipePlexResponse(check.targetUrl, check.token, req, res, {
		timeoutMs: 10000,
		forwardRange: false,
		cacheControl: 'public, max-age=86400',
		fallbackContentType: 'image/jpeg'
	})
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
