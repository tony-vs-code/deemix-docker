import { ApiHandler, PlexServerResource } from '../../../types'
import { checkPlexPin, fetchPlexServers } from '../../../helpers/plex'
import { logger } from '../../../helpers/logger'

const path: ApiHandler['path'] = '/plex/auth/pin/:id'

const handler: ApiHandler['handler'] = async (req, res) => {
	const pinId = req.params?.id
	if (!pinId) {
		return res.status(400).send({ authenticated: false, error: 'PIN ID is required' })
	}

	try {
		const status = await checkPlexPin(pinId)
		if (!status.authenticated) {
			if (status.expired) {
				return res.status(404).send(status)
			}
			return res.send({ authenticated: false })
		}

		let servers: PlexServerResource[] = []
		let serverDiscoveryError: string | undefined
		try {
			servers = await fetchPlexServers(status.token)
		} catch (err: any) {
			serverDiscoveryError = err?.message || 'Failed to discover Plex servers'
			logger.warn(`Plex PIN authenticated, but server discovery failed: ${serverDiscoveryError}`)
		}

		return res.send({
			authenticated: true,
			token: status.token,
			servers,
			...(serverDiscoveryError ? { serverDiscoveryError } : {})
		})
	} catch (err: any) {
		const message = err?.message || 'Failed to check Plex PIN status'
		logger.warn(`GET /api/plex/auth/pin/${pinId} failed: ${message}`)
		return res.status(502).send({ authenticated: false, error: message })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
