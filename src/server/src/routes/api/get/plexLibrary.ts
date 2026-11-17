import { ApiHandler } from '../../../types'
import { fetchPlexLibrary } from '../../../helpers/plex'
import { logger } from '../../../helpers/logger'

const path: ApiHandler['path'] = '/plex/library'

const handler: ApiHandler['handler'] = async (req, res) => {
	try {
		const refresh = req.query?.refresh === 'true' || req.query?.force === 'true'
		const library = await fetchPlexLibrary(refresh)
		res.send(library)
	} catch (err: any) {
		const message = err?.message || 'Failed to fetch Plex library'
		logger.error(`GET /api/plex/library failed: ${message}`)
		res.status(500).send({
			source: 'plex',
			enabled: false,
			configured: false,
			artists: [],
			totalArtists: 0,
			totalAlbums: 0,
			totalTracks: 0,
			totalSize: 0,
			formattedTotalSize: '0 B',
			lastScanned: null,
			error: message
		})
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
