import { ApiHandler } from '../../../types'
import { fetchPlexServers } from '../../../helpers/plex'
import { logger } from '../../../helpers/logger'

const path: ApiHandler['path'] = '/plex/servers'

const handler: ApiHandler['handler'] = async (req, res) => {
	const token = typeof req.query?.token === 'string' ? req.query.token : undefined

	try {
		const servers = await fetchPlexServers(token)
		res.send({ servers })
	} catch (err: any) {
		const message = err?.message || 'Failed to fetch Plex servers'
		logger.warn(`GET /api/plex/servers failed: ${message}`)
		const statusCode = message.includes('required') ? 400 : message.includes('Unauthorized') ? 401 : 502
		res.status(statusCode).send({ servers: [], error: message })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
