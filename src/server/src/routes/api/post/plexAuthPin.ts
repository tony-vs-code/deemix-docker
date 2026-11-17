import { ApiHandler } from '../../../types'
import { createPlexPin } from '../../../helpers/plex'
import { logger } from '../../../helpers/logger'

const path: ApiHandler['path'] = '/plex/auth/pin'

const handler: ApiHandler['handler'] = async (_req, res) => {
	try {
		const pin = await createPlexPin()
		res.send(pin)
	} catch (err: any) {
		const message = err?.message || 'Failed to create Plex OAuth PIN'
		logger.warn(`POST /api/plex/auth/pin failed: ${message}`)
		res.status(502).send({ error: message })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
